import { chromium, Browser, BrowserContext, Page, ElementHandle } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@workspace/db";
import { testRunsTable, testStepsTable, screenshotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type SseEmitter = (event: string, data: unknown) => void;

interface TestStepSpec {
  action: string;
  description: string;
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
  x?: number;
  y?: number;
  attribute?: string;
  expected?: string;
  ms?: number;
  js?: string;
  frameSelector?: string;
  width?: number;
  height?: number;
  method?: string;
  responseBody?: string;
  lat?: number;
  lng?: number;
  files?: string[];
  index?: number;
  text?: string;
  property?: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateTestSteps(url: string, instructions: string): Promise<TestStepSpec[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 32768,
      temperature: 0.1,
    },
  });

  const prompt = `You are a Playwright test automation expert. Generate a detailed JSON array of test steps for the following:

URL: ${url}
Instructions: ${instructions}

Return ONLY a valid JSON array of step objects. Each step must have:
- "action": one of the 100 supported actions listed below
- "description": human-readable description of what this step does
- Additional fields depending on action (selector, value, url, key, x, y, attribute, expected, ms, js, etc.)

SUPPORTED ACTIONS:
Form Input: fill, clear, append, press_sequentially, select_option, check, uncheck, select_multiple_options, fill_date, fill_time, upload_file, upload_multiple_files, remove_file, interact_slider, toggle_switch
Mouse: click, double_click, right_click, drag_and_drop, scroll_to_element, hover, mouse_down, mouse_up, click_coordinates, scroll_down, scroll_up, scroll_to_bottom, scroll_to_top, touch_tap, touch_long_press
Keyboard: press_key, focus, blur, keyboard_down, keyboard_up, press_combination, press_backspace, press_tab, press_arrow_down, press_arrow_up
Assertions: assert_visible, assert_not_visible, assert_value, assert_attribute, assert_count, assert_text_contains, assert_text_equals, assert_enabled, assert_disabled, assert_checked, assert_not_checked, assert_url, assert_url_contains, assert_title, assert_focused, assert_empty, assert_css_property, assert_image_loaded, assert_cookie_exists, assert_local_storage_key
Navigation: navigate, go_back, go_forward, refresh, wait_for_navigation, open_new_tab, switch_to_tab, close_current_tab, switch_to_iframe, switch_to_main_frame, set_viewport_size, reload_forced, intercept_request_block, emulate_dark_mode, close_browser
Waits: wait_for_selector, wait_for_selector_hidden, wait_for_timeout, wait_for_load_state_dom, wait_for_load_state_network, wait_for_function, wait_for_url, wait_for_attached, wait_for_detached, wait_for_text
System: accept_dialog, dismiss_dialog, fill_dialog_prompt, take_screenshot_page, take_screenshot_element, take_screenshot_full_page, get_text_content, get_attribute_value, clear_cookies, clear_local_storage, clear_session_storage, execute_javascript, mock_api_response, emulate_geolocation, generate_pdf_report

IMPORTANT:
- Generate comprehensive steps covering all the instructions
- Always start with a navigate action to the target URL
- After each click that causes navigation, add a wait_for_load_state_network step
- For form inputs, use fill or press_sequentially actions
- For assertions, verify important UI elements are present
- Use wait_for_selector before interacting with dynamic elements
- Be specific with CSS selectors or text-based selectors
- Generate up to 3000 steps if needed for complex tests
- RETURN ONLY THE JSON ARRAY, NO EXPLANATION

Example:
[
  {"action":"navigate","description":"Open the target URL","url":"${url}"},
  {"action":"wait_for_load_state_network","description":"Wait for page to fully load"},
  {"action":"assert_title","description":"Verify page title is present","expected":""},
  {"action":"click","description":"Click on the first button","selector":"button:first-of-type"},
  {"action":"assert_visible","description":"Verify element is visible","selector":"body"}
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Gemini did not return valid JSON array");
  }

  const steps = JSON.parse(jsonMatch[0]) as TestStepSpec[];
  return steps;
}

async function executeAction(
  page: Page,
  context: BrowserContext,
  step: TestStepSpec,
  timeout = 20000
): Promise<void> {
  const sel = step.selector;
  const val = step.value || "";
  const ms = step.ms || 1000;

  const getEl = async (selector: string): Promise<ElementHandle<Element>> => {
    await page.waitForSelector(selector, { state: "visible", timeout });
    const el = await page.$(selector);
    if (!el) throw new Error(`Element not found: ${selector}`);
    return el as ElementHandle<Element>;
  };

  switch (step.action) {
    // ── NAVIGATION ──────────────────────────────────────────
    case "navigate":
      await page.goto(step.url || val, { waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    case "go_back":
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    case "go_forward":
      await page.goForward({ waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    case "refresh":
      await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    case "reload_forced":
      await page.evaluate(() => location.reload());
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
      break;
    case "wait_for_navigation":
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
      break;
    case "open_new_tab":
      await context.newPage();
      break;
    case "switch_to_tab":
      {
        const pages = context.pages();
        const idx = step.index ?? 0;
        if (pages[idx]) {
          await pages[idx].bringToFront();
          Object.assign(page, pages[idx]);
        }
      }
      break;
    case "close_current_tab":
      await page.close();
      break;
    case "set_viewport_size":
      await page.setViewportSize({ width: step.width || 1280, height: step.height || 720 });
      break;
    case "intercept_request_block":
      await page.route(val || "**/*.{png,jpg,gif}", (route) => route.abort());
      break;
    case "emulate_dark_mode":
      await page.emulateMedia({ colorScheme: "dark" });
      break;
    case "close_browser":
      // handled at executor level
      break;
    case "switch_to_iframe":
      {
        const frame = page.frameLocator(sel || "iframe");
        // We can't swap page but we note the frame for next actions — best effort
        await frame.locator("body").waitFor({ timeout });
      }
      break;
    case "switch_to_main_frame":
      await page.bringToFront();
      break;

    // ── FORM INPUT ─────────────────────────────────────────
    case "fill":
      await page.fill(sel!, val, { timeout });
      break;
    case "clear":
      await page.fill(sel!, "", { timeout });
      break;
    case "append":
      await page.focus(sel!, { timeout });
      await page.keyboard.press("End");
      await page.type(sel!, val);
      break;
    case "press_sequentially":
      await page.click(sel!, { timeout });
      await page.keyboard.type(val, { delay: 50 });
      break;
    case "select_option":
      await page.selectOption(sel!, val, { timeout });
      break;
    case "check":
      await page.check(sel!, { timeout });
      break;
    case "uncheck":
      await page.uncheck(sel!, { timeout });
      break;
    case "select_multiple_options":
      await page.selectOption(sel!, val.split(",").map((v) => v.trim()), { timeout });
      break;
    case "fill_date":
      await page.fill(sel!, val, { timeout });
      break;
    case "fill_time":
      await page.fill(sel!, val, { timeout });
      break;
    case "upload_file":
      await page.setInputFiles(sel!, val, { timeout });
      break;
    case "upload_multiple_files":
      await page.setInputFiles(sel!, val.split(",").map((v) => v.trim()), { timeout });
      break;
    case "remove_file":
      await page.setInputFiles(sel!, [], { timeout });
      break;
    case "interact_slider":
      await page.fill(sel!, val, { timeout });
      break;
    case "toggle_switch":
      await page.click(sel!, { timeout });
      break;

    // ── MOUSE ──────────────────────────────────────────────
    case "click":
      await page.waitForSelector(sel!, { state: "visible", timeout });
      await page.click(sel!, { timeout });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {});
      break;
    case "double_click":
      await page.dblclick(sel!, { timeout });
      break;
    case "right_click":
      await page.click(sel!, { button: "right", timeout });
      break;
    case "drag_and_drop":
      await page.dragAndDrop(sel!, step.value || sel!, { timeout });
      break;
    case "scroll_to_element":
      await page.locator(sel!).scrollIntoViewIfNeeded({ timeout });
      break;
    case "hover":
      await page.hover(sel!, { timeout });
      break;
    case "mouse_down":
      await page.hover(sel!, { timeout });
      await page.mouse.down();
      break;
    case "mouse_up":
      await page.mouse.up();
      break;
    case "click_coordinates":
      await page.mouse.click(step.x || 0, step.y || 0);
      break;
    case "scroll_down":
      await page.mouse.wheel(0, ms);
      break;
    case "scroll_up":
      await page.mouse.wheel(0, -ms);
      break;
    case "scroll_to_bottom":
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      break;
    case "scroll_to_top":
      await page.evaluate(() => window.scrollTo(0, 0));
      break;
    case "touch_tap":
      await page.tap(sel!, { timeout });
      break;
    case "touch_long_press":
      {
        const box = await page.locator(sel!).boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        }
      }
      break;

    // ── KEYBOARD ───────────────────────────────────────────
    case "press_key":
      await page.keyboard.press(val || step.key || "Enter");
      break;
    case "focus":
      await page.focus(sel!, { timeout });
      break;
    case "blur":
      await page.evaluate((s) => (document.querySelector(s) as HTMLElement)?.blur(), sel);
      break;
    case "keyboard_down":
      await page.keyboard.down(val || "Shift");
      break;
    case "keyboard_up":
      await page.keyboard.up(val || "Shift");
      break;
    case "press_combination":
      await page.keyboard.press(val || "Control+a");
      break;
    case "press_backspace":
      await page.keyboard.press("Backspace");
      break;
    case "press_tab":
      await page.keyboard.press("Tab");
      break;
    case "press_arrow_down":
      await page.keyboard.press("ArrowDown");
      break;
    case "press_arrow_up":
      await page.keyboard.press("ArrowUp");
      break;

    // ── ASSERTIONS ─────────────────────────────────────────
    case "assert_visible":
      await page.waitForSelector(sel!, { state: "visible", timeout });
      break;
    case "assert_not_visible":
      await page.waitForSelector(sel!, { state: "hidden", timeout }).catch(() => {});
      break;
    case "assert_value":
      {
        const v = await page.inputValue(sel!, { timeout });
        if (step.expected !== undefined && v !== step.expected) {
          throw new Error(`Expected value "${step.expected}" but got "${v}"`);
        }
      }
      break;
    case "assert_attribute":
      {
        const attr = await page.getAttribute(sel!, step.attribute || "value", { timeout });
        if (step.expected !== undefined && attr !== step.expected) {
          throw new Error(`Expected attribute "${step.attribute}"="${step.expected}" but got "${attr}"`);
        }
      }
      break;
    case "assert_count":
      {
        const count = await page.locator(sel!).count();
        const expected = parseInt(step.expected || "0");
        if (count !== expected) throw new Error(`Expected ${expected} elements but found ${count}`);
      }
      break;
    case "assert_text_contains":
      {
        const txt = await page.locator(sel!).innerText({ timeout });
        if (step.expected && !txt.includes(step.expected)) {
          throw new Error(`Expected text to contain "${step.expected}" but got "${txt}"`);
        }
      }
      break;
    case "assert_text_equals":
      {
        const txt = await page.locator(sel!).innerText({ timeout });
        if (step.expected !== undefined && txt.trim() !== step.expected.trim()) {
          throw new Error(`Expected text "${step.expected}" but got "${txt}"`);
        }
      }
      break;
    case "assert_enabled":
      {
        const enabled = await page.isEnabled(sel!, { timeout });
        if (!enabled) throw new Error(`Element "${sel}" is disabled`);
      }
      break;
    case "assert_disabled":
      {
        const disabled = await page.isDisabled(sel!, { timeout });
        if (!disabled) throw new Error(`Element "${sel}" is not disabled`);
      }
      break;
    case "assert_checked":
      {
        const checked = await page.isChecked(sel!, { timeout });
        if (!checked) throw new Error(`Element "${sel}" is not checked`);
      }
      break;
    case "assert_not_checked":
      {
        const checked = await page.isChecked(sel!, { timeout });
        if (checked) throw new Error(`Element "${sel}" is checked but should not be`);
      }
      break;
    case "assert_url":
      {
        const url = page.url();
        if (step.expected && url !== step.expected) {
          throw new Error(`Expected URL "${step.expected}" but got "${url}"`);
        }
      }
      break;
    case "assert_url_contains":
      {
        const url = page.url();
        if (step.expected && !url.includes(step.expected)) {
          throw new Error(`Expected URL to contain "${step.expected}" but got "${url}"`);
        }
      }
      break;
    case "assert_title":
      {
        const title = await page.title();
        if (step.expected && !title.includes(step.expected)) {
          throw new Error(`Expected title to contain "${step.expected}" but got "${title}"`);
        }
      }
      break;
    case "assert_focused":
      {
        const focused = await page.evaluate((s) => document.querySelector(s) === document.activeElement, sel);
        if (!focused) throw new Error(`Element "${sel}" does not have focus`);
      }
      break;
    case "assert_empty":
      {
        const v = await page.inputValue(sel!, { timeout });
        if (v !== "") throw new Error(`Expected empty field but got "${v}"`);
      }
      break;
    case "assert_css_property":
      {
        const prop = await page.evaluate(
          ([s, p]) => getComputedStyle(document.querySelector(s)!)[p as any],
          [sel, step.property || "color"] as [string, string]
        );
        if (step.expected && prop !== step.expected) {
          throw new Error(`Expected CSS property "${step.property}"="${step.expected}" but got "${prop}"`);
        }
      }
      break;
    case "assert_image_loaded":
      {
        const loaded = await page.evaluate((s) => {
          const img = document.querySelector(s) as HTMLImageElement;
          return img && img.complete && img.naturalWidth > 0;
        }, sel);
        if (!loaded) throw new Error(`Image "${sel}" did not load`);
      }
      break;
    case "assert_cookie_exists":
      {
        const cookies = await context.cookies();
        const found = cookies.some((c) => c.name === val);
        if (!found) throw new Error(`Cookie "${val}" not found`);
      }
      break;
    case "assert_local_storage_key":
      {
        const lsVal = await page.evaluate((k) => localStorage.getItem(k), val);
        if (lsVal === null) throw new Error(`LocalStorage key "${val}" not found`);
      }
      break;

    // ── WAITS ──────────────────────────────────────────────
    case "wait_for_selector":
      await page.waitForSelector(sel!, { state: "visible", timeout: Math.max(timeout, 20000) });
      break;
    case "wait_for_selector_hidden":
      await page.waitForSelector(sel!, { state: "hidden", timeout: Math.max(timeout, 20000) });
      break;
    case "wait_for_timeout":
      await page.waitForTimeout(ms);
      break;
    case "wait_for_load_state_dom":
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
      break;
    case "wait_for_load_state_network":
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() =>
        page.waitForLoadState("domcontentloaded", { timeout: 10000 }).catch(() => {})
      );
      break;
    case "wait_for_function":
      await page.waitForFunction(step.js || "true", { timeout });
      break;
    case "wait_for_url":
      await page.waitForURL(step.expected || val, { timeout: 30000 });
      break;
    case "wait_for_attached":
      await page.waitForSelector(sel!, { state: "attached", timeout });
      break;
    case "wait_for_detached":
      await page.waitForSelector(sel!, { state: "detached", timeout });
      break;
    case "wait_for_text":
      await page.waitForSelector(`text=${val}`, { timeout });
      break;

    // ── SYSTEM & DIALOGS ───────────────────────────────────
    case "accept_dialog":
      page.once("dialog", (d) => d.accept(val || undefined));
      break;
    case "dismiss_dialog":
      page.once("dialog", (d) => d.dismiss());
      break;
    case "fill_dialog_prompt":
      page.once("dialog", (d) => d.accept(val));
      break;
    case "take_screenshot_page":
    case "take_screenshot_element":
    case "take_screenshot_full_page":
      // Screenshots are handled separately by the interval capture
      break;
    case "get_text_content":
      await page.locator(sel!).innerText({ timeout });
      break;
    case "get_attribute_value":
      await page.getAttribute(sel!, step.attribute || "href", { timeout });
      break;
    case "clear_cookies":
      await context.clearCookies();
      break;
    case "clear_local_storage":
      await page.evaluate(() => localStorage.clear());
      break;
    case "clear_session_storage":
      await page.evaluate(() => sessionStorage.clear());
      break;
    case "execute_javascript":
      await page.evaluate(step.js || "void 0");
      break;
    case "mock_api_response":
      await page.route(sel || val, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: step.responseBody || "{}",
        })
      );
      break;
    case "emulate_geolocation":
      await context.setGeolocation({ latitude: step.lat || 0, longitude: step.lng || 0 });
      await context.grantPermissions(["geolocation"]);
      break;
    case "generate_pdf_report":
      await page.pdf({ path: `/tmp/report-${Date.now()}.pdf` });
      break;

    default:
      logger.warn({ action: step.action }, "Unknown action, skipping");
  }
}

export async function runTest(runId: number, emit: SseEmitter): Promise<void> {
  let browser: Browser | null = null;

  try {
    // Load the run
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, runId));
    if (!run) throw new Error(`Test run ${runId} not found`);

    // Mark as running
    await db.update(testRunsTable).set({ status: "running" }).where(eq(testRunsTable.id, runId));

    // Generate steps with Gemini
    emit("step", {
      id: 0,
      runId,
      stepIndex: -1,
      action: "gemini_generate",
      description: "Génération des étapes de test avec Gemini 2.5 Flash...",
      status: "running",
      createdAt: new Date().toISOString(),
    });

    const stepSpecs = await generateTestSteps(run.url, run.instructions);
    const totalSteps = stepSpecs.length;

    await db.update(testRunsTable).set({ totalSteps }).where(eq(testRunsTable.id, runId));

    // Launch browser — prefer system Chromium (Nix-linked) to avoid missing .so issues
    const systemChromium =
      process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium";

    browser = await chromium.launch({
      headless: true,
      executablePath: systemChromium,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-features=VizDisplayCompositor",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ignoreHTTPSErrors: true,
    });

    // Handle dialogs globally
    context.on("dialog", async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    const page = await context.newPage();

    // Screenshot interval — every second
    let screenshotInterval: ReturnType<typeof setInterval> | null = null;
    const startScreenshotCapture = () => {
      screenshotInterval = setInterval(async () => {
        try {
          const buf = await page.screenshot({ type: "png" });
          const imageData = buf.toString("base64");
          const [ss] = await db
            .insert(screenshotsTable)
            .values({ runId, imageData })
            .returning();
          emit("screenshot", {
            id: ss.id,
            runId,
            capturedAt: ss.capturedAt.toISOString(),
            imageData,
          });
        } catch (_) {
          // page may have closed
        }
      }, 1000);
    };

    startScreenshotCapture();

    let passedSteps = 0;
    let failedSteps = 0;
    let currentPage = page;

    // Execute steps sequentially
    for (let i = 0; i < stepSpecs.length; i++) {
      const spec = stepSpecs[i];

      // Insert step as running
      const [step] = await db
        .insert(testStepsTable)
        .values({
          runId,
          stepIndex: i,
          action: spec.action,
          description: spec.description,
          status: "running",
        })
        .returning();

      emit("step", {
        ...step,
        createdAt: step.createdAt.toISOString(),
        status: "running",
      });

      const startTime = Date.now();
      let status: "passed" | "failed" = "passed";
      let errorMessage: string | undefined;

      try {
        await executeAction(currentPage, context, spec);
        passedSteps++;
      } catch (err) {
        status = "failed";
        errorMessage = err instanceof Error ? err.message : String(err);
        failedSteps++;
        logger.warn({ action: spec.action, error: errorMessage }, "Step failed");

        // Take error screenshot
        try {
          const buf = await currentPage.screenshot({ type: "png" });
          const imageData = buf.toString("base64");
          await db.insert(screenshotsTable).values({ runId, imageData });
        } catch (_) {}
      }

      const durationMs = Date.now() - startTime;

      // Update step in DB
      await db
        .update(testStepsTable)
        .set({ status, durationMs, errorMessage: errorMessage || null })
        .where(eq(testStepsTable.id, step.id));

      // Update run progress
      await db
        .update(testRunsTable)
        .set({ passedSteps, failedSteps })
        .where(eq(testRunsTable.id, runId));

      emit("step", {
        ...step,
        status,
        durationMs,
        errorMessage: errorMessage || null,
        createdAt: step.createdAt.toISOString(),
      });
    }

    // Stop screenshot capture
    if (screenshotInterval) clearInterval(screenshotInterval);

    // Take final screenshot
    try {
      const buf = await currentPage.screenshot({ type: "png" });
      const imageData = buf.toString("base64");
      const [ss] = await db.insert(screenshotsTable).values({ runId, imageData }).returning();
      emit("screenshot", {
        id: ss.id,
        runId,
        capturedAt: ss.capturedAt.toISOString(),
        imageData,
      });
    } catch (_) {}

    // Finalize
    const finalStatus = failedSteps === 0 ? "passed" : "failed";
    const [finalRun] = await db
      .update(testRunsTable)
      .set({
        status: finalStatus,
        passedSteps,
        failedSteps,
        completedAt: new Date(),
      })
      .where(eq(testRunsTable.id, runId))
      .returning();

    emit("done", {
      ...finalRun,
      createdAt: finalRun.createdAt.toISOString(),
      completedAt: finalRun.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ runId, error: errorMessage }, "Test run failed");

    await db
      .update(testRunsTable)
      .set({ status: "error", errorMessage, completedAt: new Date() })
      .where(eq(testRunsTable.id, runId));

    const [finalRun] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, runId));
    if (finalRun) {
      emit("error_event", {
        ...finalRun,
        createdAt: finalRun.createdAt.toISOString(),
        completedAt: finalRun.completedAt?.toISOString() ?? null,
      });
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
