import { Router, type IRouter } from "express";
import { db, userStatusTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/status", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const rows = await db.select().from(userStatusTable).where(eq(userStatusTable.userId, req.user.id)).limit(1);
  if (rows.length === 0) {
    const [created] = await db.insert(userStatusTable).values({ userId: req.user.id, status: "free", context: "" }).returning();
    res.json(GetUserStatusResponse.parse(serializeStatus(created)));
    return;
  }
  res.json(GetUserStatusResponse.parse(serializeStatus(rows[0])));
});

router.put("/status", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = SetUserStatusBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const rows = await db.select().from(userStatusTable).where(eq(userStatusTable.userId, req.user.id)).limit(1);
  let updated;
  if (rows.length === 0) {
    [updated] = await db.insert(userStatusTable).values({ userId: req.user.id, ...parsed.data, updatedAt: new Date() }).returning();
  } else {
    [updated] = await db.update(userStatusTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(userStatusTable.id, rows[0]!.id)).returning();
  }
  res.json(SetUserStatusResponse.parse(serializeStatus(updated)));
});

export default router;
