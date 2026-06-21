import { Router, type IRouter } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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
  const query = GetLogsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  let logs;
  if (query.data.type) {
    logs = await db.select().from(activityLogsTable).where(eq(activityLogsTable.type, query.data.type)).orderBy(desc(activityLogsTable.createdAt)).limit(query.data.limit ?? 100);
  } else {
    logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(query.data.limit ?? 100);
  }
  res.json(GetLogsResponse.parse(logs.map(serializeLog)));
});

router.delete("/logs", async (_req, res): Promise<void> => {
  await db.delete(activityLogsTable);
  res.sendStatus(204);
});

export default router;
