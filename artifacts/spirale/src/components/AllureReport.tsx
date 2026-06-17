import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { format, differenceInSeconds } from "date-fns";

// ─── colour tokens ────────────────────────────────────────────────
const C = {
  passed:  "#4caf50",
  failed:  "#f44336",
  broken:  "#ff9800",
  skipped: "#9e9e9e",
  bg:      "#0f1117",
  surface: "#181c27",
  surface2:"#1e2330",
  border:  "#2a2f3d",
  accent:  "#7c3aed",
  text:    "#e2e8f0",
  muted:   "#64748b",
};

// ─── helpers ──────────────────────────────────────────────────────
const ACTION_SUITES: Record<string, string> = {
  navigate:"Navigation", go_back:"Navigation", go_forward:"Navigation",
  refresh:"Navigation", reload_forced:"Navigation", wait_for_navigation:"Navigation",
  open_new_tab:"Navigation", switch_to_tab:"Navigation", close_current_tab:"Navigation",
  set_viewport_size:"Navigation", switch_to_iframe:"Navigation", switch_to_main_frame:"Navigation",
  fill:"Forms", clear:"Forms", append:"Forms", press_sequentially:"Forms",
  select_option:"Forms", check:"Forms", uncheck:"Forms", select_multiple_options:"Forms",
  fill_date:"Forms", fill_time:"Forms", upload_file:"Forms", upload_multiple_files:"Forms",
  remove_file:"Forms", interact_slider:"Forms", toggle_switch:"Forms",
  click:"Mouse", double_click:"Mouse", right_click:"Mouse", drag_and_drop:"Mouse",
  scroll_to_element:"Mouse", hover:"Mouse", mouse_down:"Mouse", mouse_up:"Mouse",
  click_coordinates:"Mouse", scroll_down:"Mouse", scroll_up:"Mouse",
  scroll_to_bottom:"Mouse", scroll_to_top:"Mouse", touch_tap:"Mouse", touch_long_press:"Mouse",
  press_key:"Keyboard", focus:"Keyboard", blur:"Keyboard", keyboard_down:"Keyboard",
  keyboard_up:"Keyboard", press_combination:"Keyboard", press_backspace:"Keyboard",
  press_tab:"Keyboard", press_arrow_down:"Keyboard", press_arrow_up:"Keyboard",
  assert_visible:"Assertions", assert_not_visible:"Assertions", assert_value:"Assertions",
  assert_attribute:"Assertions", assert_count:"Assertions", assert_text_contains:"Assertions",
  assert_text_equals:"Assertions", assert_enabled:"Assertions", assert_disabled:"Assertions",
  assert_checked:"Assertions", assert_not_checked:"Assertions", assert_url:"Assertions",
  assert_url_contains:"Assertions", assert_title:"Assertions", assert_focused:"Assertions",
  assert_empty:"Assertions", assert_css_property:"Assertions", assert_image_loaded:"Assertions",
  assert_cookie_exists:"Assertions", assert_local_storage_key:"Assertions",
  wait_for_selector:"Waits", wait_for_selector_hidden:"Waits", wait_for_timeout:"Waits",
  wait_for_load_state_dom:"Waits", wait_for_load_state_network:"Waits",
  wait_for_function:"Waits", wait_for_url:"Waits", wait_for_attached:"Waits",
  wait_for_detached:"Waits", wait_for_text:"Waits",
  accept_dialog:"System", dismiss_dialog:"System", fill_dialog_prompt:"System",
  take_screenshot_page:"System", take_screenshot_element:"System",
  take_screenshot_full_page:"System", get_text_content:"System",
  get_attribute_value:"System", clear_cookies:"System", clear_local_storage:"System",
  clear_session_storage:"System", execute_javascript:"System", mock_api_response:"System",
  emulate_geolocation:"System", generate_pdf_report:"System",
  intercept_request_block:"System", emulate_dark_mode:"System", close_browser:"System",
};

const SUITE_ORDER = ["Navigation","Forms","Mouse","Keyboard","Assertions","Waits","System"];

interface Step {
  id: number;
  stepIndex: number;
  action: string;
  description: string;
  status: string;
  durationMs?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

interface Props {
  test: {
    id: number;
    url: string;
    status: string;
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    createdAt: string;
    completedAt: string | null;
    steps: Step[];
    errorMessage?: string | null;
  };
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────

function SuiteBar({ passed, failed, skipped, total }: { passed: number; failed: number; skipped: number; total: number }) {
  if (total === 0) return null;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  return (
    <div className="flex h-5 rounded overflow-hidden w-full">
      {failed > 0 && (
        <div style={{ width: pct(failed), background: C.failed }} className="flex items-center justify-center text-[10px] font-bold text-white">{failed}</div>
      )}
      {passed > 0 && (
        <div style={{ width: pct(passed), background: C.passed }} className="flex items-center justify-center text-[10px] font-bold text-white">{passed}</div>
      )}
      {skipped > 0 && (
        <div style={{ width: pct(skipped), background: C.skipped }} className="flex items-center justify-center text-[10px] font-bold text-white">{skipped}</div>
      )}
    </div>
  );
}

const NAV_ITEMS = [
  { id: "overview",   label: "Overview",   icon: "⊞" },
  { id: "categories", label: "Categories", icon: "⚑" },
  { id: "suites",     label: "Suites",     icon: "☰" },
  { id: "graphs",     label: "Graphs",     icon: "⬛" },
  { id: "timeline",   label: "Timeline",   icon: "⊙" },
];

const DONUT_COLOURS = [C.passed, C.failed, C.broken, C.skipped];

function DonutLabel({ cx, cy, value, label }: { cx: number; cy: number; value: number; label: string }) {
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" fill={C.text} fontSize={28} fontWeight={700}>{label}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill={C.muted} fontSize={13}>{value} test steps</text>
    </g>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────

export function AllureReport({ test }: Props) {
  const [activeNav, setActiveNav] = useState("overview");
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  // ── derive suite data ──────────────────────────────────────────
  const suiteData = useMemo(() => {
    const map: Record<string, { passed: number; failed: number; skipped: number }> = {};
    for (const suite of SUITE_ORDER) map[suite] = { passed: 0, failed: 0, skipped: 0 };

    for (const step of test.steps) {
      const suite = ACTION_SUITES[step.action] ?? "System";
      if (step.status === "passed") map[suite].passed++;
      else if (step.status === "failed") map[suite].failed++;
      else map[suite].skipped++;
    }

    return SUITE_ORDER
      .map((name) => ({ name, ...map[name], total: map[name].passed + map[name].failed + map[name].skipped }))
      .filter((s) => s.total > 0);
  }, [test.steps]);

  // ── donut data ─────────────────────────────────────────────────
  const donutData = useMemo(() => {
    const skipped = test.totalSteps - test.passedSteps - test.failedSteps;
    return [
      { name: "Passed",  value: test.passedSteps },
      { name: "Failed",  value: test.failedSteps },
      { name: "Broken",  value: 0 },
      { name: "Skipped", value: skipped > 0 ? skipped : 0 },
    ].filter((d) => d.value > 0);
  }, [test]);

  const passRate = test.totalSteps > 0
    ? ((test.passedSteps / test.totalSteps) * 100).toFixed(1) + "%"
    : "0%";

  // ── duration ──────────────────────────────────────────────────
  const durationSec = test.completedAt
    ? differenceInSeconds(new Date(test.completedAt), new Date(test.createdAt))
    : 0;
  const durStr = durationSec > 60
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : `${durationSec}s`;

  // ── trend data (simulate from step timing) ────────────────────
  const trendData = useMemo(() => {
    const buckets = 8;
    const total = test.steps.length;
    if (total === 0) return Array.from({ length: buckets }, (_, i) => ({ t: i, passed: 0, failed: 0 }));
    const size = Math.ceil(total / buckets);
    return Array.from({ length: buckets }, (_, b) => {
      const chunk = test.steps.slice(b * size, (b + 1) * size);
      return {
        t: b,
        passed: chunk.filter((s) => s.status === "passed").length,
        failed: chunk.filter((s) => s.status === "failed").length,
      };
    });
  }, [test.steps]);

  // ── categories (error groups) ─────────────────────────────────
  const categories = useMemo(() => {
    const failedSteps = test.steps.filter((s) => s.status === "failed");
    const grouped: Record<string, number> = {};
    for (const step of failedSteps) {
      const cat = step.action.startsWith("assert")
        ? "Test defects"
        : step.action.startsWith("wait")
        ? "Timeout failures"
        : step.action.startsWith("navigate") || step.action === "click"
        ? "Navigation failures"
        : "Product defects";
      grouped[cat] = (grouped[cat] || 0) + 1;
    }
    if (test.status === "passed") grouped["No defects"] = 0;
    return Object.entries(grouped).map(([name, count]) => ({ name, count }));
  }, [test.steps, test.status]);

  // ── graphs bar data ───────────────────────────────────────────
  const graphData = suiteData.map((s) => ({
    name: s.name.slice(0, 4),
    Passed: s.passed,
    Failed: s.failed,
  }));

  // ── timeline ─────────────────────────────────────────────────
  const timelineSteps = useMemo(() => {
    const withDur = test.steps.filter((s) => s.durationMs != null && s.durationMs! > 0);
    if (withDur.length === 0) return test.steps.map((s, i) => ({ ...s, durationMs: 100 }));
    return withDur;
  }, [test.steps]);

  const maxDur = useMemo(() => Math.max(...timelineSteps.map((s) => s.durationMs ?? 100), 1), [timelineSteps]);

  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full rounded-xl overflow-hidden border"
      style={{ background: C.bg, borderColor: C.border, minHeight: 600 }}
    >
      {/* ─── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 w-48 border-r"
        style={{ background: C.surface, borderColor: C.border }}
      >
        {/* Allure brand */}
        <div className="flex items-center gap-2 px-4 py-5 border-b" style={{ borderColor: C.border }}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: C.accent }}
          >
            A
          </div>
          <span className="font-bold text-base tracking-wide" style={{ color: C.text }}>
            Allure
          </span>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all text-left"
              style={{
                color: activeNav === item.id ? C.text : C.muted,
                background: activeNav === item.id ? `${C.accent}22` : "transparent",
                borderLeft: activeNav === item.id ? `3px solid ${C.accent}` : "3px solid transparent",
              }}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-4 py-4 border-t text-xs" style={{ borderColor: C.border, color: C.muted }}>
          Run #{test.id}
        </div>
      </aside>

      {/* ─── Main content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto" style={{ background: C.bg }}>
        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeNav === "overview" && (
          <div className="p-6 space-y-6">
            {/* Header bar */}
            <div
              className="rounded-lg p-5 flex flex-wrap items-start gap-6 justify-between"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: C.muted }}>
                  ALLURE REPORT
                </div>
                <div className="font-bold text-xl mb-0.5" style={{ color: C.text }}>
                  {format(new Date(test.createdAt), "MM/dd/yyyy")}
                </div>
                <div className="text-xs" style={{ color: C.muted }}>
                  {format(new Date(test.createdAt), "HH:mm:ss")}
                  {test.completedAt && ` – ${format(new Date(test.completedAt), "HH:mm:ss")} (${durStr})`}
                </div>
                <div className="mt-3 text-4xl font-bold" style={{ color: C.text }}>{test.totalSteps}</div>
                <div className="text-xs" style={{ color: C.muted }}>test steps</div>
              </div>

              {/* Donut chart */}
              <div className="flex flex-col items-center">
                <div style={{ width: 140, height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLOURS[i % DONUT_COLOURS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                        formatter={(val, name) => [`${val} steps`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-2xl font-bold -mt-2" style={{ color: C.text }}>{passRate}</div>
                <div className="text-xs" style={{ color: C.muted }}>pass rate</div>
              </div>

              {/* Trend mini chart */}
              <div className="flex flex-col">
                <div className="text-xs font-semibold mb-2" style={{ color: C.muted }}>TREND</div>
                <div style={{ width: 160, height: 100 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="gPassed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.passed} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.passed} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.failed} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={C.failed} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="passed" stroke={C.passed} fill="url(#gPassed)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="failed" stroke={C.failed} fill="url(#gFailed)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Suites list */}
            <div>
              <div className="text-xs font-bold mb-3" style={{ color: C.muted }}>
                SUITES &nbsp;<span style={{ color: C.text }}>{suiteData.length} items total</span>
              </div>
              <div className="space-y-2">
                {suiteData.map((suite) => (
                  <div
                    key={suite.name}
                    className="flex items-center gap-4 px-4 py-2.5 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: C.surface, border: `1px solid ${C.border}` }}
                    onClick={() => setActiveNav("suites")}
                  >
                    <span className="w-32 text-sm shrink-0" style={{ color: C.text }}>{suite.name}</span>
                    <div className="flex-1">
                      <SuiteBar passed={suite.passed} failed={suite.failed} skipped={suite.skipped} total={suite.total} />
                    </div>
                    <span className="text-xs w-6 text-right shrink-0" style={{ color: C.muted }}>{suite.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories mini panel */}
            <div>
              <div className="text-xs font-bold mb-3" style={{ color: C.muted }}>
                CATEGORIES &nbsp;<span style={{ color: C.text }}>{categories.length} items</span>
              </div>
              <div
                className="rounded-lg divide-y"
                style={{ background: C.surface, borderColor: C.border, border: `1px solid ${C.border}` }}
              >
                {test.status === "passed" ? (
                  <div className="px-4 py-3 text-sm" style={{ color: C.passed }}>✓ No defects found</div>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm" style={{ color: cat.count > 0 ? C.failed : C.muted }}>{cat.name}</span>
                      {cat.count > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: `${C.failed}22`, color: C.failed }}
                        >
                          {cat.count}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CATEGORIES ─────────────────────────────────────────── */}
        {activeNav === "categories" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>Categories</h2>
            {test.status === "passed" ? (
              <div
                className="rounded-lg p-8 text-center"
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
              >
                <div className="text-5xl mb-3">✓</div>
                <div className="font-semibold" style={{ color: C.passed }}>No defects found</div>
                <div className="text-sm mt-1" style={{ color: C.muted }}>All {test.totalSteps} steps passed successfully</div>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => {
                  const stepsInCat = test.steps.filter((s) => {
                    if (s.status !== "failed") return false;
                    const mapped = s.action.startsWith("assert") ? "Test defects"
                      : s.action.startsWith("wait") ? "Timeout failures"
                      : (s.action.startsWith("navigate") || s.action === "click") ? "Navigation failures"
                      : "Product defects";
                    return mapped === cat.name;
                  });
                  return (
                    <div
                      key={cat.name}
                      className="rounded-lg overflow-hidden"
                      style={{ background: C.surface, border: `1px solid ${C.border}` }}
                    >
                      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <span className="font-semibold" style={{ color: C.text }}>{cat.name}</span>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold"
                          style={{ background: `${C.failed}22`, color: C.failed }}
                        >
                          {cat.count}
                        </span>
                      </div>
                      {stepsInCat.length > 0 && (
                        <div className="divide-y" style={{ borderColor: C.border }}>
                          {stepsInCat.map((step) => (
                            <div key={step.id} className="px-5 py-3">
                              <div className="text-sm font-medium" style={{ color: C.text }}>
                                Step {step.stepIndex + 1}: {step.action}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: C.muted }}>{step.description}</div>
                              {step.errorMessage && (
                                <div
                                  className="mt-2 px-3 py-2 rounded text-xs font-mono"
                                  style={{ background: `${C.failed}15`, color: C.failed, border: `1px solid ${C.failed}33` }}
                                >
                                  {step.errorMessage}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SUITES ─────────────────────────────────────────────── */}
        {activeNav === "suites" && (
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>Suites</h2>
            {suiteData.map((suite) => {
              const steps = test.steps.filter((s) => (ACTION_SUITES[s.action] ?? "System") === suite.name);
              const open = expandedSuites.has(suite.name);
              const toggle = () => setExpandedSuites((prev) => {
                const next = new Set(prev);
                next.has(suite.name) ? next.delete(suite.name) : next.add(suite.name);
                return next;
              });
              return (
                <div
                  key={suite.name}
                  className="rounded-lg overflow-hidden"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                >
                  <button
                    onClick={toggle}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:opacity-80 transition-opacity text-left"
                    style={{ borderBottom: open ? `1px solid ${C.border}` : "none" }}
                  >
                    <span className="text-sm font-semibold w-28 shrink-0" style={{ color: C.text }}>{suite.name}</span>
                    <div className="flex-1">
                      <SuiteBar passed={suite.passed} failed={suite.failed} skipped={suite.skipped} total={suite.total} />
                    </div>
                    <div className="flex gap-3 text-xs shrink-0">
                      {suite.passed > 0 && <span style={{ color: C.passed }}>✓ {suite.passed}</span>}
                      {suite.failed > 0 && <span style={{ color: C.failed }}>✗ {suite.failed}</span>}
                    </div>
                    <span style={{ color: C.muted }}>{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <div className="divide-y" style={{ borderColor: C.border }}>
                      {steps.map((step) => (
                        <div key={step.id} className="flex items-start gap-3 px-5 py-3">
                          <span className="mt-0.5 shrink-0">
                            {step.status === "passed" ? (
                              <span style={{ color: C.passed }}>✓</span>
                            ) : step.status === "failed" ? (
                              <span style={{ color: C.failed }}>✗</span>
                            ) : (
                              <span style={{ color: C.skipped }}>○</span>
                            )}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: C.text }}>
                              {step.description}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                              {step.action}
                              {step.durationMs != null && <> &middot; {step.durationMs}ms</>}
                            </div>
                            {step.errorMessage && (
                              <div
                                className="mt-1.5 px-2 py-1.5 rounded text-xs font-mono"
                                style={{ background: `${C.failed}15`, color: C.failed }}
                              >
                                {step.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── GRAPHS ─────────────────────────────────────────────── */}
        {activeNav === "graphs" && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-bold" style={{ color: C.text }}>Graphs</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Steps by Suite */}
              <div className="rounded-lg p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="text-sm font-semibold mb-4" style={{ color: C.text }}>Steps by Suite</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={graphData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                    />
                    <Bar dataKey="Passed" stackId="a" fill={C.passed} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Failed" stackId="a" fill={C.failed} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Execution Trend */}
              <div className="rounded-lg p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="text-sm font-semibold mb-4" style={{ color: C.text }}>Execution Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gP2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.passed} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.passed} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gF2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.failed} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.failed} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                    />
                    <Area type="monotone" dataKey="passed" stroke={C.passed} fill="url(#gP2)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="failed" stroke={C.failed} fill="url(#gF2)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: C.passed }} /> Passed
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: C.failed }} /> Failed
                  </div>
                </div>
              </div>

              {/* Pass rate donut */}
              <div className="rounded-lg p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="text-sm font-semibold mb-4" style={{ color: C.text }}>Pass Rate Distribution</div>
                <div className="flex items-center gap-6">
                  <div style={{ width: 160, height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={72}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                          strokeWidth={0}
                        >
                          {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLOURS[i]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 text-sm">
                    {donutData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: DONUT_COLOURS[i] }} />
                        <span style={{ color: C.muted }}>{d.name}</span>
                        <span className="font-bold ml-auto" style={{ color: C.text }}>{d.value}</span>
                      </div>
                    ))}
                    <div className="pt-2 font-bold text-lg" style={{ color: C.text }}>{passRate}</div>
                  </div>
                </div>
              </div>

              {/* Duration breakdown */}
              <div className="rounded-lg p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="text-sm font-semibold mb-4" style={{ color: C.text }}>Duration by Suite (ms)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={suiteData.map((s) => ({
                      name: s.name.slice(0, 4),
                      duration: test.steps
                        .filter((st) => (ACTION_SUITES[st.action] ?? "System") === s.name)
                        .reduce((acc, st) => acc + (st.durationMs ?? 0), 0),
                    }))}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text }}
                      formatter={(val) => [`${val}ms`, "Duration"]}
                    />
                    <Bar dataKey="duration" fill={C.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── TIMELINE ─────────────────────────────────────────────── */}
        {activeNav === "timeline" && (
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: C.text }}>Timeline</h2>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 text-xs font-semibold border-b" style={{ borderColor: C.border, color: C.muted }}>
                <span className="w-8 shrink-0">#</span>
                <span className="w-24 shrink-0">Action</span>
                <span className="flex-1">Duration</span>
                <span className="w-20 text-right shrink-0">Time (ms)</span>
              </div>
              <div className="divide-y max-h-[520px] overflow-y-auto" style={{ borderColor: C.border }}>
                {timelineSteps.map((step) => {
                  const dur = step.durationMs ?? 0;
                  const pct = Math.min((dur / maxDur) * 100, 100);
                  const color = step.status === "passed" ? C.passed : step.status === "failed" ? C.failed : C.skipped;
                  return (
                    <div key={step.id} className="flex items-center gap-3 px-5 py-2.5 hover:opacity-80" style={{ borderColor: C.border }}>
                      <span className="w-8 text-xs shrink-0" style={{ color: C.muted }}>{step.stepIndex + 1}</span>
                      <span className="w-24 text-xs font-mono truncate shrink-0" style={{ color: C.text }}>{step.action}</span>
                      <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: `${color}18` }}>
                        <div
                          className="h-full rounded-sm transition-all"
                          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
                        />
                      </div>
                      <span className="w-20 text-xs text-right shrink-0 font-mono" style={{ color: C.muted }}>
                        {dur}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
