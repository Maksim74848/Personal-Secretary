import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusTable = pgTable("user_status", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  status: text("status").notNull().default("free"),
  context: text("context").notNull().default(""),
  customMessage: text("custom_message"),
  availableUntil: text("available_until"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserStatusSchema = createInsertSchema(userStatusTable).omit({ id: true, updatedAt: true, userId: true });
export type InsertUserStatus = z.infer<typeof insertUserStatusSchema>;
export type UserStatus = typeof userStatusTable.$inferSelect;
