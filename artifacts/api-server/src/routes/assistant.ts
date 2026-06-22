import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, conversationsTable, messagesTable, rulesTable, memoryTable, userStatusTable, activityLogsTable, userSettingsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  SendMessageBody,
  SendMessageResponse,
  GetConversationsResponse,
  GetConversationMessagesResponse,
  GetConversationMessagesParams,
  DraftAutoResponseBody,
  DraftAutoResponseResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MAIN_MODEL = "llama-3.3-70b-versatile";
const FAST_MODEL = "llama-3.1-8b-instant";

function getAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("AI_NOT_CONFIGURED");
  return new OpenAI({ apiKey: key, baseURL: GROQ_BASE_URL });
}

async function getSettings(userId: string) {
  const rows = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
  if (!rows.length) {
    const [s] = await db.insert(userSettingsTable).values({ userId }).returning();
    return s!;
  }
  return rows[0]!;
}

async function buildSystemPrompt(userId: string): Promise<string> {
  const rules = await db.select().from(rulesTable).where(and(eq(rulesTable.enabled, true), eq(rulesTable.userId, userId))).orderBy(rulesTable.priority);
  const memories = await db.select().from(memoryTable).where(eq(memoryTable.userId, userId)).orderBy(memoryTable.createdAt);
  const statusRows = await db.select().from(userStatusTable).where(eq(userStatusTable.userId, userId)).limit(1);
  const settings = await getSettings(userId);

  const status = statusRows[0]?.status ?? "free";
  const context = statusRows[0]?.context ?? "";
  const customMsg = statusRows[0]?.customMessage ?? "";

  const STATUS_LABELS: Record<string, string> = { free: "свободен", busy: "занят", unavailable: "недоступен", custom: "особый режим" };

  const toneMap: Record<string, string> = {
    formal: "Общайся строго официально, на «Вы».",
    friendly: "Общайся тепло и дружески, как хороший друг.",
    neutral: "Общайся нейтрально, профессионально, на «ты».",
  };
  const verbMap: Record<string, string> = {
    short: "Давай краткие ответы — максимум 2-3 предложения.",
    normal: "Давай развёрнутые, но лаконичные ответы.",
    detailed: "Давай подробные, детальные ответы с объяснениями.",
  };
  const emojiRule = settings.emojiEnabled ? "Используй эмодзи умеренно для живости." : "Не используй эмодзи вообще.";

  const rulesText = rules.length > 0
    ? rules.map(r => `• [${r.category}] ${r.title}: ${r.description}`).join("\n")
    : "Правила не заданы.";

  const memoryText = memories.length > 0
    ? memories.map(m => `• [${m.category}] ${m.content}`).join("\n")
    : "Воспоминания отсутствуют.";

  return `Ты — JARVIS, персональный ИИ-ассистент. Ты помогаешь пользователю управлять жизнью: расписанием, задачами, контактами, сообщениями. Ты также можешь отвечать на любые вопросы — общие знания, наука, история, технологии и всё остальное.

ПРАВИЛА ПОВЕДЕНИЯ:
1. Никогда не придумывай факты. Если не уверен — скажи «не знаю» и предложи проверить.
2. Никогда не действуй от имени пользователя без его подтверждения.
3. Ты — ассистент, не пользователь. Не имитируй пользователя.
4. Предлагай действия, объясняй их, жди подтверждения.
5. Если что-то неясно — уточни, не предполагай.
6. На общие вопросы (факты, объяснения, советы) отвечай уверенно и развёрнуто.

СТИЛЬ ОБЩЕНИЯ:
${toneMap[settings.tone] ?? toneMap["neutral"]}
${verbMap[settings.verbosity] ?? verbMap["normal"]}
${emojiRule}
Всегда отвечай на русском языке.

ТЕКУЩИЙ СТАТУС ПОЛЬЗОВАТЕЛЯ:
• Статус: ${STATUS_LABELS[status] ?? status}
• Контекст: ${context || "не указан"}
${customMsg ? `• Сообщение: ${customMsg}` : ""}

АКТИВНЫЕ ПРАВИЛА:
${rulesText}

ЧТО Я ЗНАЮ О ПОЛЬЗОВАТЕЛЕ:
${memoryText}

ВОЗМОЖНОСТИ:
— Помогаю с календарём, задачами, напоминаниями
— Составляю черновики ответов на сообщения (с подтверждением)
— Анализирую контакты и ситуации
— Отвечаю на вопросы по любым темам (наука, история, технологии, советы и т.д.)
— Объясняю, планирую, организую

Будь честным, точным и полезным. Если не знаешь — скажи об этом.`;
}

router.get("/assistant/conversations", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const userId = req.user.id;
  const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.userId, userId)).orderBy(desc(conversationsTable.createdAt));
  const result = await Promise.all(
    conversations.map(async (conv) => {
      const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conv.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
      const count = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conv.id));
      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        messageCount: count.length,
        lastMessage: msgs[0]?.content ?? null,
      };
    })
  );
  res.json(GetConversationsResponse.parse(result));
});

router.get("/assistant/conversations/:id/messages", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  // Verify conversation belongs to user
  const [conv] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, params.data.id), eq(conversationsTable.userId, req.user.id)));
  if (!conv) { res.status(404).json({ error: "Диалог не найден" }); return; }
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, params.data.id)).orderBy(messagesTable.createdAt);
  res.json(GetConversationMessagesResponse.parse(
    messages.map(m => ({ id: m.id, role: m.role, content: m.content, conversationId: m.conversationId, createdAt: m.createdAt.toISOString() }))
  ));
});

router.post("/assistant/chat", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { content, conversationId } = parsed.data;
  const userId = req.user.id;

  let convId = conversationId ?? null;
  if (!convId) {
    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
    const [conv] = await db.insert(conversationsTable).values({ title, userId }).returning();
    convId = conv!.id;
  } else {
    // Verify ownership
    const [conv] = await db.select().from(conversationsTable).where(and(eq(conversationsTable.id, convId), eq(conversationsTable.userId, userId)));
    if (!conv) { res.status(403).json({ error: "Нет доступа к диалогу" }); return; }
  }

  await db.insert(messagesTable).values({ conversationId: convId, role: "user", content });

  const history = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, convId)).orderBy(messagesTable.createdAt).limit(20);

  let assistantContent: string;
  try {
    const ai = getAI();
    const systemPrompt = await buildSystemPrompt(userId);
    const completion = await ai.chat.completions.create({
      model: MAIN_MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(0, -1).map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content },
      ],
    });
    assistantContent = completion.choices[0]?.message?.content ?? "Не могу ответить прямо сейчас.";
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("AI_NOT_CONFIGURED")) {
      assistantContent = "⚠️ ИИ не настроен. Добавьте ключ API в настройки.";
    } else if (errMsg.includes("401") || errMsg.includes("Incorrect API key")) {
      assistantContent = "⚠️ Неверный ключ API. Проверьте настройки в разделе «Система».";
    } else if (errMsg.includes("rate_limit") || errMsg.includes("429")) {
      assistantContent = "⚠️ Превышен лимит запросов. Попробуйте через минуту.";
    } else if (errMsg.includes("Connection") || errMsg.includes("ENOTFOUND")) {
      assistantContent = "⚠️ Нет соединения с ИИ-сервером. Проверьте интернет.";
    } else {
      assistantContent = `⚠️ Ошибка ИИ: ${errMsg.slice(0, 120)}`;
    }
    await db.insert(activityLogsTable).values({ userId, type: "system", message: `Ошибка ИИ: ${errMsg.slice(0, 200)}`, source: "assistant" });
  }

  const [saved] = await db.insert(messagesTable).values({ conversationId: convId, role: "assistant", content: assistantContent }).returning();
  await db.insert(activityLogsTable).values({ userId, type: "chat", message: `Сообщение обработано в диалоге #${convId}`, source: "web" });

  res.json(SendMessageResponse.parse({
    id: saved!.id,
    role: "assistant",
    content: assistantContent,
    conversationId: convId,
    createdAt: saved!.createdAt.toISOString(),
  }));
});

router.post("/assistant/draft-response", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = DraftAutoResponseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { senderName, messageContent } = parsed.data;
  const userId = req.user.id;
  const statusRows = await db.select().from(userStatusTable).where(eq(userStatusTable.userId, userId)).limit(1);
  const status = statusRows[0]?.status ?? "free";
  const context = statusRows[0]?.context ?? "";
  const customMsg = statusRows[0]?.customMessage ?? "";

  let draft = customMsg || `Привет, я сейчас занят${context ? ` (${context})` : ""}. Отвечу позже.`;
  let requiresConfirmation = true;
  let reason = "Автоматический черновик";
  let alternatives: string[] = [];

  try {
    const ai = getAI();
    const completion = await ai.chat.completions.create({
      model: FAST_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: `Ты — JARVIS, персональный ИИ-ассистент. Составь вежливый ответ на сообщение.
Статус пользователя: ${status}. Контекст: ${context || "не задан"}.
${customMsg ? `Пользователь указал: "${customMsg}"` : ""}
Верни JSON: { "draft": "...", "requiresConfirmation": true/false, "reason": "...", "alternatives": ["...", "..."] }
Всё на русском языке. Будь кратким и вежливым.`,
        },
        { role: "user", content: `${senderName} написал: "${messageContent}"` },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed2 = JSON.parse(raw) as { draft?: string; requiresConfirmation?: boolean; reason?: string; alternatives?: string[] };
    draft = parsed2.draft ?? draft;
    requiresConfirmation = parsed2.requiresConfirmation ?? true;
    reason = parsed2.reason ?? reason;
    alternatives = parsed2.alternatives ?? [];
  } catch {
    // fallback to manual draft — already set above
  }

  await db.insert(activityLogsTable).values({ userId, type: "auto-reply", message: `Черновик ответа для ${senderName}`, source: "web" });
  res.json(DraftAutoResponseResponse.parse({ draft, requiresConfirmation, reason, alternatives }));
});

router.get("/assistant/ai-status", async (_req, res): Promise<void> => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    res.json({ ok: false, reason: "Ключ API не задан" }); return;
  }
  if (!key.startsWith("gsk_") && !key.startsWith("sk-")) {
    res.json({ ok: false, reason: "Формат ключа не распознан" }); return;
  }
  try {
    const ai = getAI();
    await ai.models.list();
    res.json({ ok: true, provider: "Groq", model: MAIN_MODEL });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("401")) res.json({ ok: false, reason: "Неверный ключ API" });
    else if (msg.includes("429")) res.json({ ok: true, reason: "Лимит запросов", warning: true });
    else res.json({ ok: false, reason: `Ошибка соединения: ${msg.slice(0, 80)}` });
  }
});

router.get("/assistant/settings", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const s = await getSettings(req.user.id);
  res.json(s);
});

router.put("/assistant/settings", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const s = await getSettings(req.user.id);
  const allowed = ["tone", "verbosity", "emojiEnabled", "confirmBeforeAction", "autoConfirmLowRisk"] as const;
  const update: Partial<typeof userSettingsTable.$inferInsert> = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) (update as Record<string, unknown>)[k] = req.body[k];
  }
  const [updated] = await db.update(userSettingsTable).set({ ...update, updatedAt: new Date() }).where(eq(userSettingsTable.id, s.id)).returning();
  res.json(updated ?? s);
});

export default router;
