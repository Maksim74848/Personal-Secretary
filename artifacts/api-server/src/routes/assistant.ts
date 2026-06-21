import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, conversationsTable, messagesTable, rulesTable, memoryTable, userStatusTable, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function buildSystemPrompt(): Promise<string> {
  const rules = await db.select().from(rulesTable).where(eq(rulesTable.enabled, true)).orderBy(rulesTable.priority);
  const memories = await db.select().from(memoryTable).orderBy(memoryTable.createdAt);
  const statusRows = await db.select().from(userStatusTable).limit(1);

  const currentStatus = statusRows[0]?.status ?? "free";
  const currentContext = statusRows[0]?.context ?? "";

  const rulesText = rules.length > 0
    ? rules.map(r => `- [${r.category.toUpperCase()}] ${r.title}: ${r.description}`).join("\n")
    : "No custom rules set.";

  const memoryText = memories.length > 0
    ? memories.map(m => `- [${m.category}] ${m.content}`).join("\n")
    : "No stored memories yet.";

  return `You are ARIA (Adaptive Responsive Intelligence Assistant) — a personal AI assistant acting as a universal helper: secretary, friend, teacher, and executor.

CORE PRINCIPLES:
1. NEVER invent facts. If uncertain, ALWAYS ask the user for clarification.
2. Adapt tone, behavior, and responses depending on context.
3. You act as yourself, never impersonating the user.
4. Be proactive but controlled — suggest actions, don't take them without confirmation.
5. If you cannot answer with certainty, say so and ask.

CURRENT USER STATUS:
- Status: ${currentStatus}
- Context: ${currentContext || "Not specified"}

ACTIVE RULES:
${rulesText}

WHAT YOU KNOW ABOUT THE USER:
${memoryText}

CAPABILITIES:
- Help manage calendar events, tasks, and reminders
- Draft responses to messages on behalf of the user
- Analyze contacts and communication patterns
- Provide information and explanations
- Assist with planning and organization

Always be helpful, precise, and honest. Never hallucinate facts. When in doubt, ask.`;
}

router.get("/assistant/conversations", async (_req, res): Promise<void> => {
  const conversations = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.createdAt));

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const msgs = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const countResult = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id));

      return {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt.toISOString(),
        messageCount: countResult.length,
        lastMessage: msgs[0]?.content ?? null,
      };
    })
  );

  res.json(GetConversationsResponse.parse(result));
});

router.get("/assistant/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(GetConversationMessagesResponse.parse(
    messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      conversationId: m.conversationId,
      createdAt: m.createdAt.toISOString(),
    }))
  ));
});

router.post("/assistant/chat", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { content, conversationId } = parsed.data;

  // Get or create conversation
  let convId = conversationId ?? null;
  if (!convId) {
    const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
    const [conv] = await db.insert(conversationsTable).values({ title }).returning();
    convId = conv.id;
  }

  // Save user message
  await db.insert(messagesTable).values({ conversationId: convId, role: "user", content });

  // Fetch conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, convId))
    .orderBy(messagesTable.createdAt)
    .limit(20);

  const systemPrompt = await buildSystemPrompt();

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 2048,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(0, -1).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content },
    ],
  });

  const assistantContent = completion.choices[0]?.message?.content ?? "I'm unable to respond right now.";

  // Save assistant message
  const [saved] = await db
    .insert(messagesTable)
    .values({ conversationId: convId, role: "assistant", content: assistantContent })
    .returning();

  // Log
  await db.insert(activityLogsTable).values({
    type: "chat",
    message: `Chat message processed in conversation ${convId}`,
    source: "web",
  });

  res.json(SendMessageResponse.parse({
    id: saved.id,
    role: "assistant",
    content: assistantContent,
    conversationId: convId,
    createdAt: saved.createdAt.toISOString(),
  }));
});

router.post("/assistant/draft-response", async (req, res): Promise<void> => {
  const parsed = DraftAutoResponseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { senderName, messageContent } = parsed.data;

  const statusRows = await db.select().from(userStatusTable).limit(1);
  const status = statusRows[0]?.status ?? "free";
  const context = statusRows[0]?.context ?? "";

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content: `You are ARIA, a personal AI assistant drafting a polite response on behalf of the user.
Current user status: ${status}. Context: ${context || "not specified"}.
Draft a brief, natural response to the incoming message. Be polite and appropriate.
Return JSON: { "draft": "...", "requiresConfirmation": true/false, "reason": "...", "alternatives": ["...", "..."] }`,
      },
      {
        role: "user",
        content: `${senderName} wrote: "${messageContent}"`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed2: { draft?: string; requiresConfirmation?: boolean; reason?: string; alternatives?: string[] } = {};
  try { parsed2 = JSON.parse(raw); } catch { /* ignore */ }

  await db.insert(activityLogsTable).values({
    type: "auto-reply",
    message: `Draft response generated for message from ${senderName}`,
    source: "web",
  });

  res.json(DraftAutoResponseResponse.parse({
    draft: parsed2.draft ?? "I'm currently unavailable. I'll get back to you soon.",
    requiresConfirmation: parsed2.requiresConfirmation ?? true,
    reason: parsed2.reason ?? "Auto-generated response",
    alternatives: parsed2.alternatives ?? [],
  }));
});

export default router;
