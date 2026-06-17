import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testStepsTable = pgTable("test_steps", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  stepIndex: integer("step_index").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending|running|passed|failed|skipped
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  screenshotUrl: text("screenshot_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTestStepSchema = createInsertSchema(testStepsTable).omit({ id: true, createdAt: true });
export type InsertTestStep = z.infer<typeof insertTestStepSchema>;
export type TestStep = typeof testStepsTable.$inferSelect;
