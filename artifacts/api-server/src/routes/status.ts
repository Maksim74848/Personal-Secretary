import { Router, type IRouter } from "express";
import { db, userStatusTable } from "@workspace/db";
import { GetUserStatusResponse, SetUserStatusBody, SetUserStatusResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeStatus(s: typeof userStatusTable.$inferSelect) {
  return {
    ...s,
    customMessage: s.customMessage ?? null,
    availableUntil: s.availableUntil ?? null,
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/status", async (_req, res): Promise<void> => {
  const rows = await db.select().from(userStatusTable).orderBy(userStatusTable.updatedAt).limit(1);
  if (rows.length === 0) {
    const [created] = await db.insert(userStatusTable).values({ status: "free", context: "" }).returning();
    res.json(GetUserStatusResponse.parse(serializeStatus(created)));
    return;
  }
  res.json(GetUserStatusResponse.parse(serializeStatus(rows[0])));
});

router.put("/status", async (req, res): Promise<void> => {
  const parsed = SetUserStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const rows = await db.select().from(userStatusTable).limit(1);
  let updated;
  if (rows.length === 0) {
    [updated] = await db.insert(userStatusTable).values({ ...parsed.data, updatedAt: new Date() }).returning();
  } else {
    [updated] = await db.update(userStatusTable).set({ ...parsed.data, updatedAt: new Date() }).returning();
  }
  res.json(SetUserStatusResponse.parse(serializeStatus(updated)));
});

export default router;
