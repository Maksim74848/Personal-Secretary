import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  identifier: text("identifier"),
  telegramUsername: text("telegram_username"),
  priority: text("priority").notNull().default("normal"),
  permissionLevel: text("permission_level").notNull().default("limited"),
  tone: text("tone").notNull().default("casual"),
  listType: text("list_type").notNull().default("whitelist"),
  autoResponseEnabled: boolean("auto_response_enabled").notNull().default(false),
  autoResponseTemplate: text("auto_response_template"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, createdAt: true });
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
