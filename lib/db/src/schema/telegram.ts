import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const telegramSettingsTable = pgTable("telegram_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  botToken: text("bot_token"),
  botConnected: boolean("bot_connected").notNull().default(false),
  botUsername: text("bot_username"),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
  forwardAllMessages: boolean("forward_all_messages").notNull().default(false),
  requireConfirmation: boolean("require_confirmation").notNull().default(true),
  defaultReplyTemplate: text("default_reply_template"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTelegramSettingsSchema = createInsertSchema(telegramSettingsTable).omit({ id: true, updatedAt: true });
export type InsertTelegramSettings = z.infer<typeof insertTelegramSettingsSchema>;
export type TelegramSettings = typeof telegramSettingsTable.$inferSelect;
