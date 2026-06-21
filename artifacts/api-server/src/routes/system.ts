import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { pollingActive } from "./telegramState";
export { pollingActive };

const router: IRouter = Router();

router.get("/system/status", async (_req, res): Promise<void> => {
  const components: Record<string, { ok: boolean; label: string; detail?: string }> = {};

  // DB check
  try {
    await db.execute(sql`SELECT 1`);
    components["db"] = { ok: true, label: "База данных" };
  } catch (e: unknown) {
    components["db"] = { ok: false, label: "База данных", detail: e instanceof Error ? e.message.slice(0, 80) : "Ошибка" };
  }

  // AI check
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    components["ai"] = { ok: false, label: "ИИ (Groq)", detail: "Ключ API не задан" };
  } else if (!key.startsWith("gsk_") && !key.startsWith("sk-")) {
    components["ai"] = { ok: false, label: "ИИ (Groq)", detail: "Неизвестный формат ключа" };
  } else {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) components["ai"] = { ok: true, label: "ИИ (Groq)", detail: "llama-3.3-70b-versatile" };
      else if (r.status === 401) components["ai"] = { ok: false, label: "ИИ (Groq)", detail: "Неверный ключ API" };
      else components["ai"] = { ok: false, label: "ИИ (Groq)", detail: `HTTP ${r.status}` };
    } catch {
      components["ai"] = { ok: false, label: "ИИ (Groq)", detail: "Нет соединения с сервером" };
    }
  }

  // Telegram check
  try {
    const { telegramSettingsTable } = await import("@workspace/db");
    const rows = await db.select().from(telegramSettingsTable).limit(1);
    const s = rows[0];
    if (!s?.botToken) {
      components["telegram"] = { ok: false, label: "Telegram", detail: "Токен не задан" };
    } else if (!s.botConnected) {
      components["telegram"] = { ok: false, label: "Telegram", detail: "Не подключён" };
    } else {
      components["telegram"] = {
        ok: true, label: "Telegram",
        detail: `@${s.botUsername ?? "unknown"}${pollingActive ? " · опрос активен" : " · опрос неактивен"}`,
      };
    }
  } catch {
    components["telegram"] = { ok: false, label: "Telegram", detail: "Ошибка проверки" };
  }

  const allOk = Object.values(components).every(c => c.ok);
  res.json({ ok: allOk, components, checkedAt: new Date().toISOString() });
});

export default router;
