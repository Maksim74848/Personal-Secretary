import { Router, type IRouter } from "express";
import { db, telegramSettingsTable, telegramMessagesTable, activityLogsTable, userStatusTable, contactsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { pollingActive, setPollingActive } from "./telegramState";
import {
  GetTelegramSettingsResponse,
  UpdateTelegramSettingsBody,
  UpdateTelegramSettingsResponse,
  TestTelegramConnectionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeSettings(s: typeof telegramSettingsTable.$inferSelect) {
  return {
    ...s,
    botToken: s.botToken ?? null,
    botUsername: s.botUsername ?? null,
    defaultReplyTemplate: s.defaultReplyTemplate ?? null,
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function getOrCreateSettings() {
  const rows = await db.select().from(telegramSettingsTable).limit(1);
  if (!rows.length) {
    const [c] = await db.insert(telegramSettingsTable).values({}).returning();
    return c!;
  }
  return rows[0]!;
}

async function sendTelegramMessage(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return r.ok;
  } catch { return false; }
}

let pollingOffset = 0;

async function processUpdate(settings: typeof telegramSettingsTable.$inferSelect, update: {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string; last_name?: string };
    chat: { id: number };
    text?: string;
    date: number;
  };
}) {
  pollingOffset = update.update_id + 1;
  const msg = update.message;
  if (!msg?.text) return;

  const chatId = String(msg.chat.id);
  const fromUsername = msg.from?.username ?? null;
  const fromFirst = msg.from?.first_name ?? null;
  const fromLast = msg.from?.last_name ?? null;
  const text = msg.text;

  const contacts = await db.select().from(contactsTable);
  const contact = contacts.find(c =>
    (c.telegramUsername && fromUsername && c.telegramUsername.toLowerCase() === fromUsername.toLowerCase()) ||
    (c.identifier && (c.identifier === chatId || c.identifier === `@${fromUsername}`))
  );

  let priority = "normal";
  if (contact?.priority === "urgent") priority = "urgent";
  else if (contact?.priority === "high") priority = "high";
  else if (contact?.listType === "blacklist") priority = "low";

  const statusRows = await db.select().from(userStatusTable).limit(1);
  const status = statusRows[0]?.status ?? "free";
  const context = statusRows[0]?.context ?? "";
  const customMsg = statusRows[0]?.customMessage ?? "";

  let draftReply: string | null = null;
  if (status === "busy" || status === "unavailable") {
    draftReply = customMsg || settings.defaultReplyTemplate ||
      `Привет! Я сейчас ${status === "busy" ? `занят${context ? ` (${context})` : ""}` : "недоступен"}. Отвечу позже.`;
  }

  await db.insert(telegramMessagesTable).values({
    telegramMessageId: msg.message_id,
    chatId,
    fromUsername,
    fromFirstName: fromFirst,
    fromLastName: fromLast,
    text,
    direction: "incoming",
    status: "pending",
    draftReply,
    requiresAttention: true,
    priority,
  });

  if (settings.autoReplyEnabled && !settings.requireConfirmation && draftReply && contact?.autoResponseEnabled) {
    const sent = await sendTelegramMessage(settings.botToken!, chatId, draftReply);
    if (sent) {
      await db.update(telegramMessagesTable)
        .set({ status: "replied", sentReply: draftReply, respondedAt: new Date(), requiresAttention: false })
        .where(eq(telegramMessagesTable.chatId, chatId));
    }
  }

  await db.insert(activityLogsTable).values({
    type: "telegram",
    message: `Входящее сообщение от ${fromUsername ? `@${fromUsername}` : chatId}: "${text.slice(0, 80)}"`,
    source: "telegram",
  });
}

export async function startPolling() {
  const settings = await getOrCreateSettings();
  if (!settings.enabled || !settings.botToken || pollingActive) return;
  setPollingActive(true);

  const poll = async () => {
    if (!pollingActive) return;
    try {
      const s = await getOrCreateSettings();
      if (!s.enabled || !s.botToken) { setPollingActive(false); return; }

      const r = await fetch(
        `https://api.telegram.org/bot${s.botToken}/getUpdates?offset=${pollingOffset}&timeout=25&allowed_updates=["message"]`,
        { signal: AbortSignal.timeout(30000) }
      );
      if (!r.ok) { setTimeout(poll, 5000); return; }
      const data = await r.json() as { ok: boolean; result?: unknown[] };
      if (!data.ok || !data.result?.length) { setImmediate(poll); return; }

      for (const u of data.result as Parameters<typeof processUpdate>[1][]) {
        await processUpdate(s, u);
      }
      setImmediate(poll);
    } catch {
      setTimeout(poll, 10000);
    }
  };
  poll();
}

export function stopPolling() { setPollingActive(false); }

router.get("/telegram/settings", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json(GetTelegramSettingsResponse.parse(serializeSettings(settings)));
});

router.put("/telegram/settings", async (req, res): Promise<void> => {
  const parsed = UpdateTelegramSettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await getOrCreateSettings();
  const [updated] = await db
    .update(telegramSettingsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(telegramSettingsTable.id, existing.id))
    .returning();
  const result = updated ?? existing;

  if (result.enabled && result.botToken) {
    stopPolling();
    startPolling();
  } else {
    stopPolling();
  }

  res.json(UpdateTelegramSettingsResponse.parse(serializeSettings(result)));
});

router.post("/telegram/test", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  if (!settings.botToken) {
    res.json(TestTelegramConnectionResponse.parse({ success: false, message: "Токен не задан", botUsername: null }));
    return;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`);
    const data = await r.json() as { ok: boolean; result?: { username?: string }; description?: string };
    if (data.ok) {
      const username = data.result?.username ?? null;
      await db.update(telegramSettingsTable)
        .set({ botConnected: true, botUsername: username ?? undefined })
        .where(eq(telegramSettingsTable.id, settings.id));
      res.json(TestTelegramConnectionResponse.parse({ success: true, message: `Подключено как @${username}`, botUsername: username }));
    } else {
      res.json(TestTelegramConnectionResponse.parse({ success: false, message: data.description ?? "Неверный токен", botUsername: null }));
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.json(TestTelegramConnectionResponse.parse({ success: false, message: `Ошибка подключения: ${msg.slice(0, 100)}`, botUsername: null }));
  }
});

router.get("/telegram/messages", async (req, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;
  let rows = await db.select().from(telegramMessagesTable).orderBy(desc(telegramMessagesTable.receivedAt)).limit(50);
  if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
  res.json(rows.map(r => ({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
    respondedAt: r.respondedAt?.toISOString() ?? null,
  })));
});

router.post("/telegram/messages/:id/reply", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const body = req.body as { text?: string };
  if (!body.text) { res.status(400).json({ error: "Текст обязателен" }); return; }

  const msgs = await db.select().from(telegramMessagesTable).where(eq(telegramMessagesTable.id, id)).limit(1);
  const msg = msgs[0];
  if (!msg) { res.status(404).json({ error: "Сообщение не найдено" }); return; }

  const settings = await getOrCreateSettings();
  if (!settings.botToken) { res.status(400).json({ error: "Бот не подключён" }); return; }

  const sent = await sendTelegramMessage(settings.botToken, msg.chatId, body.text);
  if (!sent) { res.status(500).json({ error: "Ошибка отправки через Telegram" }); return; }

  await db.update(telegramMessagesTable)
    .set({ status: "replied", sentReply: body.text, respondedAt: new Date(), requiresAttention: false })
    .where(eq(telegramMessagesTable.id, id));

  await db.insert(activityLogsTable).values({
    type: "telegram",
    message: `Отправлен ответ для ${msg.fromUsername ? `@${msg.fromUsername}` : msg.chatId}`,
    source: "web",
  });
  res.json({ success: true });
});

router.post("/telegram/messages/:id/dismiss", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  await db.update(telegramMessagesTable)
    .set({ requiresAttention: false, status: "dismissed" })
    .where(eq(telegramMessagesTable.id, id));
  res.json({ success: true });
});

router.get("/telegram/status", async (_req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  const pendingRows = await db.select().from(telegramMessagesTable).where(eq(telegramMessagesTable.status, "pending"));
  res.json({
    connected: settings.botConnected,
    enabled: settings.enabled,
    polling: pollingActive,
    botUsername: settings.botUsername,
    pendingMessages: pendingRows.length,
  });
});

export default router;
