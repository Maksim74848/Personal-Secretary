import { Router, type IRouter } from "express";
import { db, telegramSettingsTable } from "@workspace/db";
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
  if (rows.length === 0) {
    const [created] = await db.insert(telegramSettingsTable).values({}).returning();
    return created;
  }
  return rows[0];
}

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
    .returning();
  res.json(UpdateTelegramSettingsResponse.parse(serializeSettings(updated ?? existing)));
});

router.post("/telegram/test", async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  if (!settings.botToken) {
    res.json(TestTelegramConnectionResponse.parse({ success: false, message: "No bot token configured", botUsername: null }));
    return;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getMe`);
    const data = await response.json() as { ok: boolean; result?: { username?: string } };
    if (data.ok) {
      const username = data.result?.username ?? null;
      await db.update(telegramSettingsTable).set({ botConnected: true, botUsername: username ?? undefined }).returning();
      res.json(TestTelegramConnectionResponse.parse({ success: true, message: "Connected successfully", botUsername: username }));
    } else {
      res.json(TestTelegramConnectionResponse.parse({ success: false, message: "Invalid bot token", botUsername: null }));
    }
  } catch {
    res.json(TestTelegramConnectionResponse.parse({ success: false, message: "Connection failed", botUsername: null }));
  }
});

export default router;
