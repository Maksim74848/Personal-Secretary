import { Router, type IRouter } from "express";
import { db, rulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetRulesResponse,
  CreateRuleBody,
  UpdateRuleParams,
  UpdateRuleBody,
  UpdateRuleResponse,
  DeleteRuleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeRule(r: typeof rulesTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

router.get("/rules", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const rules = await db.select().from(rulesTable).where(eq(rulesTable.userId, req.user.id)).orderBy(rulesTable.priority);
  res.json(GetRulesResponse.parse(rules.map(serializeRule)));
});

router.post("/rules", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rule] = await db.insert(rulesTable).values({ ...parsed.data, userId: req.user.id }).returning();
  res.status(201).json(serializeRule(rule));
});

router.patch("/rules/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = UpdateRuleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateRuleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rule] = await db.update(rulesTable).set(parsed.data).where(and(eq(rulesTable.id, params.data.id), eq(rulesTable.userId, req.user.id))).returning();
  if (!rule) { res.status(404).json({ error: "Правило не найдено" }); return; }
  res.json(UpdateRuleResponse.parse(serializeRule(rule)));
});

router.delete("/rules/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = DeleteRuleParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [rule] = await db.delete(rulesTable).where(and(eq(rulesTable.id, params.data.id), eq(rulesTable.userId, req.user.id))).returning();
  if (!rule) { res.status(404).json({ error: "Правило не найдено" }); return; }
  res.sendStatus(204);
});

export default router;
