import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const screenshotsTable = pgTable("screenshots", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  imageData: text("image_data").notNull(), // base64 PNG
});

export const insertScreenshotSchema = createInsertSchema(screenshotsTable).omit({ id: true, capturedAt: true });
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;
export type Screenshot = typeof screenshotsTable.$inferSelect;
