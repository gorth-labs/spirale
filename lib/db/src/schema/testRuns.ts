import { pgTable, serial, text, integer, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const testRunsTable = pgTable("test_runs", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  instructions: text("instructions").notNull(),
  status: text("status").notNull().default("pending"), // pending|running|passed|failed|error
  totalSteps: integer("total_steps").notNull().default(0),
  passedSteps: integer("passed_steps").notNull().default(0),
  failedSteps: integer("failed_steps").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertTestRunSchema = createInsertSchema(testRunsTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertTestRun = z.infer<typeof insertTestRunSchema>;
export type TestRun = typeof testRunsTable.$inferSelect;
