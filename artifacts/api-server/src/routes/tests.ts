import { Router } from "express";
import { db } from "@workspace/db";
import { testRunsTable, testStepsTable, screenshotsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { z } from "zod";
import { addClient, makeEmitter } from "../lib/sseManager.js";
import { runTest, generateTestSteps, regenerateSingleStep, runTestFromSavedSteps, type TestStepSpec } from "../lib/testExecutor.js";

const router = Router();

// GET /api/tests/stats  (must come before /:id)
router.get("/stats", async (req, res) => {
  try {
    const [totalRow] = await db.select({ count: count() }).from(testRunsTable);
    const [passedRow] = await db.select({ count: count() }).from(testRunsTable).where(eq(testRunsTable.status, "passed"));
    const [failedRow] = await db.select({ count: count() }).from(testRunsTable).where(eq(testRunsTable.status, "failed"));
    const [runningRow] = await db.select({ count: count() }).from(testRunsTable).where(eq(testRunsTable.status, "running"));

    const total   = Number(totalRow?.count   ?? 0);
    const passed  = Number(passedRow?.count  ?? 0);
    const failed  = Number(failedRow?.count  ?? 0);
    const running = Number(runningRow?.count ?? 0);
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const recentRuns = await db
      .select()
      .from(testRunsTable)
      .orderBy(desc(testRunsTable.createdAt))
      .limit(10);

    res.json({
      total, passed, failed, running, successRate,
      recentRuns: recentRuns.map((r) => ({
        ...r,
        createdAt:   r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// GET /api/tests
router.get("/", async (req, res) => {
  try {
    const runs = await db.select().from(testRunsTable).orderBy(desc(testRunsTable.createdAt));
    res.json(runs.map((r) => ({
      ...r,
      createdAt:   r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list tests");
    res.status(500).json({ error: "Failed to list tests" });
  }
});

// POST /api/tests/preview — generate steps for user review (draft, no Playwright)
router.post("/preview", async (req, res) => {
  const schema = z.object({ url: z.string().min(1), instructions: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "url and instructions are required" });
    return;
  }
  const { url, instructions } = parsed.data;

  try {
    const [run] = await db
      .insert(testRunsTable)
      .values({ url, instructions, status: "draft", totalSteps: 0, passedSteps: 0, failedSteps: 0 })
      .returning();

    const stepSpecs = await generateTestSteps(url, instructions);

    const insertedSteps = await Promise.all(
      stepSpecs.map((spec, i) =>
        db
          .insert(testStepsTable)
          .values({
            runId:       run.id,
            stepIndex:   i,
            action:      spec.action,
            description: spec.description,
            status:      "draft",
            spec:        JSON.stringify(spec),
          })
          .returning()
          .then(([s]) => s)
      )
    );

    await db
      .update(testRunsTable)
      .set({ totalSteps: stepSpecs.length })
      .where(eq(testRunsTable.id, run.id));

    res.status(201).json({
      ...run,
      totalSteps:  stepSpecs.length,
      createdAt:   run.createdAt.toISOString(),
      completedAt: null,
      steps: insertedSteps.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      screenshots: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to preview test");
    res.status(500).json({ error: "Failed to generate test steps" });
  }
});

// POST /api/tests  (immediate run, legacy)
router.post("/", async (req, res) => {
  const schema = z.object({ url: z.string().min(1), instructions: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "url and instructions are required" });
    return;
  }
  const { url, instructions } = parsed.data;

  try {
    const [run] = await db
      .insert(testRunsTable)
      .values({ url, instructions, status: "pending", totalSteps: 0, passedSteps: 0, failedSteps: 0 })
      .returning();

    res.status(201).json({
      ...run,
      createdAt:   run.createdAt.toISOString(),
      completedAt: null,
    });

    const emitter = makeEmitter(run.id);
    runTest(run.id, emitter).catch((err) => {
      req.log.error({ err, runId: run.id }, "Test execution error");
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create test");
    res.status(500).json({ error: "Failed to create test" });
  }
});

// GET /api/tests/:id/stream  (SSE)
router.get("/:id/stream", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
  if (!run) { res.status(404).json({ error: "Test run not found" }); return; }

  addClient(id, res);

  if (["passed", "failed", "error"].includes(run.status)) {
    const steps = await db
      .select()
      .from(testStepsTable)
      .where(eq(testStepsTable.runId, id))
      .orderBy(testStepsTable.stepIndex);

    for (const step of steps) {
      res.write(`event: step\ndata: ${JSON.stringify({ ...step, createdAt: step.createdAt.toISOString() })}\n\n`);
    }
    res.write(`event: done\ndata: ${JSON.stringify({
      ...run,
      createdAt:   run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    })}\n\n`);
  }
});

// GET /api/tests/:id/pdf
router.get("/:id/pdf", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
    if (!run) { res.status(404).json({ error: "Test run not found" }); return; }

    const steps = await db
      .select()
      .from(testStepsTable)
      .where(eq(testStepsTable.runId, id))
      .orderBy(testStepsTable.stepIndex);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="spirale-report-${id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(24).font("Helvetica-Bold").text("Spirale QA Report", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica").text(`Test Run #${run.id}`, { align: "center" });
    doc.moveDown(0.3);
    doc.text(`URL: ${run.url}`, { align: "center" });
    doc.text(`Status: ${run.status.toUpperCase()}`, { align: "center" });
    doc.text(`Date: ${run.createdAt.toISOString()}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(11).font("Helvetica");
    doc.text(`Total Steps: ${run.totalSteps}`);
    doc.text(`Passed: ${run.passedSteps}`);
    doc.text(`Failed: ${run.failedSteps}`);
    const rate = run.totalSteps > 0 ? Math.round((run.passedSteps / run.totalSteps) * 100) : 0;
    doc.text(`Success Rate: ${rate}%`);
    doc.moveDown(0.5);

    doc.fontSize(14).font("Helvetica-Bold").text("Instructions");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").text(run.instructions);
    doc.moveDown(1);

    doc.fontSize(14).font("Helvetica-Bold").text("Test Steps");
    doc.moveDown(0.3);

    for (const step of steps) {
      const icon = step.status === "passed" ? "✓" : step.status === "failed" ? "✗" : "○";
      const dur  = step.durationMs ? ` (${step.durationMs}ms)` : "";
      doc.fontSize(9).font("Helvetica-Bold")
        .fillColor(step.status === "passed" ? "#16a34a" : step.status === "failed" ? "#dc2626" : "#6b7280")
        .text(`${icon} Step ${step.stepIndex + 1}: ${step.action}${dur}`);
      doc.fontSize(8).font("Helvetica").fillColor("#374151").text(`   ${step.description}`);
      if (step.errorMessage) {
        doc.fontSize(8).fillColor("#dc2626").text(`   Error: ${step.errorMessage}`);
      }
      doc.fillColor("#000000").moveDown(0.15);
    }

    doc.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate PDF");
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// POST /api/tests/:id/run  — launch a draft test
router.post("/:id/run", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
    if (!run) { res.status(404).json({ error: "Test run not found" }); return; }
    if (run.status !== "draft") {
      res.status(409).json({ error: `Cannot run a test in '${run.status}' status` });
      return;
    }

    const [updated] = await db
      .update(testRunsTable)
      .set({ status: "pending" })
      .where(eq(testRunsTable.id, id))
      .returning();

    res.json({
      ...updated,
      createdAt:   updated.createdAt.toISOString(),
      completedAt: updated.completedAt?.toISOString() ?? null,
    });

    const emitter = makeEmitter(id);
    runTestFromSavedSteps(id, emitter).catch((err) => {
      req.log.error({ err, runId: id }, "runTestFromSavedSteps error");
    });
  } catch (err) {
    req.log.error({ err }, "Failed to run test");
    res.status(500).json({ error: "Failed to run test" });
  }
});

// POST /api/tests/:id/steps/:stepIndex/regenerate
router.post("/:id/steps/:stepIndex/regenerate", async (req, res) => {
  const id        = parseInt(req.params.id);
  const stepIndex = parseInt(req.params.stepIndex);
  if (isNaN(id) || isNaN(stepIndex)) { res.status(400).json({ error: "Invalid id or stepIndex" }); return; }

  const schema = z.object({ modificationRequest: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "modificationRequest is required" }); return; }

  try {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
    if (!run) { res.status(404).json({ error: "Test run not found" }); return; }

    const allSteps = await db
      .select()
      .from(testStepsTable)
      .where(eq(testStepsTable.runId, id))
      .orderBy(testStepsTable.stepIndex);

    const targetRow = allSteps.find((s) => s.stepIndex === stepIndex);
    if (!targetRow) { res.status(404).json({ error: "Step not found" }); return; }

    const allSpecs: TestStepSpec[] = allSteps.map((s) => {
      try { return JSON.parse(s.spec ?? "{}") as TestStepSpec; }
      catch { return { action: s.action, description: s.description } as TestStepSpec; }
    });

    const newSpec = await regenerateSingleStep(
      run.url,
      run.instructions,
      allSpecs,
      stepIndex,
      parsed.data.modificationRequest
    );

    const [updated] = await db
      .update(testStepsTable)
      .set({
        action:      newSpec.action,
        description: newSpec.description,
        spec:        JSON.stringify(newSpec),
      })
      .where(eq(testStepsTable.id, targetRow.id))
      .returning();

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate step");
    res.status(500).json({ error: "Failed to regenerate step" });
  }
});

// GET /api/tests/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
    if (!run) { res.status(404).json({ error: "Test run not found" }); return; }

    const steps = await db
      .select()
      .from(testStepsTable)
      .where(eq(testStepsTable.runId, id))
      .orderBy(testStepsTable.stepIndex);

    const screenshots = await db
      .select()
      .from(screenshotsTable)
      .where(eq(screenshotsTable.runId, id))
      .orderBy(screenshotsTable.capturedAt);

    res.json({
      ...run,
      createdAt:   run.createdAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      steps: steps.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
      screenshots: screenshots.map((ss) => ({ ...ss, capturedAt: ss.capturedAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get test");
    res.status(500).json({ error: "Failed to get test" });
  }
});

// DELETE /api/tests/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [run] = await db.select().from(testRunsTable).where(eq(testRunsTable.id, id));
    if (!run) { res.status(404).json({ error: "Test run not found" }); return; }

    await db.delete(testStepsTable).where(eq(testStepsTable.runId, id));
    await db.delete(screenshotsTable).where(eq(screenshotsTable.runId, id));
    await db.delete(testRunsTable).where(eq(testRunsTable.id, id));

    res.json({ error: "deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete test");
    res.status(500).json({ error: "Failed to delete test" });
  }
});

export default router;
