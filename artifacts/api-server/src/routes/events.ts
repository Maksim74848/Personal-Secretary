import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, gte, lte, and } from "drizzle-orm";
import {
  GetEventsResponse,
  GetEventsQueryParams,
  GetEventResponse,
  GetEventParams,
  CreateEventBody,
  UpdateEventParams,
  UpdateEventBody,
  UpdateEventResponse,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    ...e,
    description: e.description ?? null,
    recurringPattern: e.recurringPattern ?? null,
    location: e.location ?? null,
    reminder: e.reminder ?? null,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/events", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const query = GetEventsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions = [eq(eventsTable.userId, req.user.id)];
  if (query.data.from) conditions.push(gte(eventsTable.startTime, new Date(query.data.from)));
  if (query.data.to) conditions.push(lte(eventsTable.startTime, new Date(query.data.to)));

  const events = await db.select().from(eventsTable).where(and(...conditions)).orderBy(eventsTable.startTime);
  res.json(GetEventsResponse.parse(events.map(serializeEvent)));
});

router.post("/events", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [event] = await db.insert(eventsTable).values({
    ...parsed.data,
    userId: req.user.id,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
  }).returning();
  res.status(201).json(GetEventResponse.parse(serializeEvent(event)));
});

router.get("/events/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [event] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.userId, req.user.id)));
  if (!event) { res.status(404).json({ error: "Событие не найдено" }); return; }
  res.json(GetEventResponse.parse(serializeEvent(event)));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startTime) updateData.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime) updateData.endTime = new Date(parsed.data.endTime);

  const [event] = await db.update(eventsTable).set(updateData).where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.userId, req.user.id))).returning();
  if (!event) { res.status(404).json({ error: "Событие не найдено" }); return; }
  res.json(UpdateEventResponse.parse(serializeEvent(event)));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [event] = await db.delete(eventsTable).where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.userId, req.user.id))).returning();
  if (!event) { res.status(404).json({ error: "Событие не найдено" }); return; }
  res.sendStatus(204);
});

export default router;
