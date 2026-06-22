import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { GetLogsResponse, GetLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeLog(l: typeof activityLogsTable.$inferSelect) {
  return {
    ...l,
    metadata: l.metadata ?? null,
    source: l.source ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/logs", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const query = GetLogsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions = [eq(activityLogsTable.userId, req.user.id)];
  if (query.data.type) conditions.push(eq(activityLogsTable.type, query.data.type));

  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(and(...conditions))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(query.data.limit ?? 100);

  res.json(GetLogsResponse.parse(logs.map(serializeLog)));
});

router.delete("/logs", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  await db.delete(activityLogsTable).where(eq(activityLogsTable.userId, req.user.id));
  res.sendStatus(204);
});

export default router;
