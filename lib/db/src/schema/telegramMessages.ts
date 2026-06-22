import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const telegramMessagesTable = pgTable("telegram_messages", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  telegramMessageId: integer("telegram_message_id"),
  chatId: text("chat_id").notNull(),
  fromUsername: text("from_username"),
  fromFirstName: text("from_first_name"),
  fromLastName: text("from_last_name"),
  text: text("text").notNull(),
  direction: text("direction").notNull().default("incoming"),
  status: text("status").notNull().default("pending"),
  draftReply: text("draft_reply"),
  sentReply: text("sent_reply"),
  requiresAttention: boolean("requires_attention").notNull().default(true),
  priority: text("priority").notNull().default("normal"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export type TelegramMessage = typeof telegramMessagesTable.$inferSelect;
