import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  GetContactsResponse,
  GetContactResponse,
  GetContactParams,
  CreateContactBody,
  UpdateContactParams,
  UpdateContactBody,
  UpdateContactResponse,
  DeleteContactParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeContact(c: typeof contactsTable.$inferSelect) {
  return {
    ...c,
    identifier: c.identifier ?? null,
    telegramUsername: c.telegramUsername ?? null,
    autoResponseTemplate: c.autoResponseTemplate ?? null,
    notes: c.notes ?? null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/contacts", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const contacts = await db.select().from(contactsTable).where(eq(contactsTable.userId, req.user.id)).orderBy(contactsTable.createdAt);
  res.json(GetContactsResponse.parse(contacts.map(serializeContact)));
});

router.post("/contacts", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.insert(contactsTable).values({ ...parsed.data, userId: req.user.id }).returning();
  res.status(201).json(GetContactResponse.parse(serializeContact(contact)));
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = GetContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [contact] = await db.select().from(contactsTable).where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.userId, req.user.id)));
  if (!contact) { res.status(404).json({ error: "Контакт не найден" }); return; }
  res.json(GetContactResponse.parse(serializeContact(contact)));
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = UpdateContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [contact] = await db.update(contactsTable).set(parsed.data).where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.userId, req.user.id))).returning();
  if (!contact) { res.status(404).json({ error: "Контакт не найден" }); return; }
  res.json(UpdateContactResponse.parse(serializeContact(contact)));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Требуется авторизация" }); return; }
  const params = DeleteContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [contact] = await db.delete(contactsTable).where(and(eq(contactsTable.id, params.data.id), eq(contactsTable.userId, req.user.id))).returning();
  if (!contact) { res.status(404).json({ error: "Контакт не найден" }); return; }
  res.sendStatus(204);
});

export default router;
