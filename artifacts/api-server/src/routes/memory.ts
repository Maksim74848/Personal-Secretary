import { Router, type IRouter } from "express";
import { db, memoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/memory", async (_req, res): Promise<void> => {
  const entries = await db.select().from(memoryTable).orderBy(memoryTable.createdAt);
  res.json(GetMemoryEntriesResponse.parse(entries.map(serializeMemory)));
});

router.post("/memory", async (req, res): Promise<void> => {
  const parsed = CreateMemoryEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db.insert(memoryTable).values(parsed.data).returning();
  res.status(201).json(serializeMemory(entry));
});

router.patch("/memory/:id", async (req, res): Promise<void> => {
  const params = UpdateMemoryEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateMemoryEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db
    .update(memoryTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(memoryTable.id, params.data.id))
    .returning();
  if (!entry) { res.status(404).json({ error: "Memory entry not found" }); return; }
  res.json(UpdateMemoryEntryResponse.parse(serializeMemory(entry)));
});

router.delete("/memory/:id", async (req, res): Promise<void> => {
  const params = DeleteMemoryEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [entry] = await db.delete(memoryTable).where(eq(memoryTable.id, params.data.id)).returning();
  if (!entry) { res.status(404).json({ error: "Memory entry not found" }); return; }
  res.sendStatus(204);
});

export default router;
