import { Router, type IRouter } from "express";
import { db, memoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetMemoryEntriesResponse,
  CreateMemoryEntryBody,
  UpdateMemoryEntryParams,
  UpdateMemoryEntryBody,
  UpdateMemoryEntryResponse,
  DeleteMemoryEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeMemory(m: typeof memoryTable.$inferSelect) {
  return {
    ...m,
    source: m.source ?? null,
    confidence: m.confidence ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

router.get("/memory", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const entries = await db.select().from(memoryTable).where(eq(memoryTable.userId, req.user.id)).orderBy(memoryTable.createdAt);
  res.json(GetMemoryEntriesResponse.parse(entries.map(serializeMemory)));
});

router.post("/memory", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = CreateMemoryEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db.insert(memoryTable).values({ ...parsed.data, userId: req.user.id }).returning();
  res.status(201).json(serializeMemory(entry));
});

router.patch("/memory/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = UpdateMemoryEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMemoryEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db
    .update(memoryTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(memoryTable.id, params.data.id), eq(memoryTable.userId, req.user.id)))
    .returning();
  if (!entry) { res.status(404).json({ error: "Запись не найдена" }); return; }
  res.json(UpdateMemoryEntryResponse.parse(serializeMemory(entry)));
});

router.delete("/memory/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = DeleteMemoryEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [entry] = await db.delete(memoryTable).where(and(eq(memoryTable.id, params.data.id), eq(memoryTable.userId, req.user.id))).returning();
  if (!entry) { res.status(404).json({ error: "Запись не найдена" }); return; }
  res.sendStatus(204);
});

export default router;
