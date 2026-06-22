import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryTable = pgTable("memory_entries", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  content: text("content").notNull(),
  category: text("category").notNull().default("fact"),
  source: text("source"),
  confidence: integer("confidence").default(80),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoryTable).omit({ id: true, createdAt: true, updatedAt: true, userId: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoryTable.$inferSelect;
