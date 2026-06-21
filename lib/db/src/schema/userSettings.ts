import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  tone: text("tone").notNull().default("neutral"),
  verbosity: text("verbosity").notNull().default("normal"),
  emojiEnabled: boolean("emoji_enabled").notNull().default(false),
  language: text("language").notNull().default("ru"),
  confirmBeforeAction: boolean("confirm_before_action").notNull().default(true),
  autoConfirmLowRisk: boolean("auto_confirm_low_risk").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
