import { Router, type IRouter } from "express";
import { db, contactsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/contacts", async (_req, res): Promise<void> => {
  const contacts = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
  res.json(GetContactsResponse.parse(contacts.map(serializeContact)));
});

router.post("/contacts", async (req, res): Promise<void> => {
  const parsed = CreateContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [contact] = await db.insert(contactsTable).values(parsed.data).returning();
  res.status(201).json(GetContactResponse.parse(serializeContact(contact)));
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const params = GetContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, params.data.id));
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(GetContactResponse.parse(serializeContact(contact)));
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const params = UpdateContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateContactBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [contact] = await db.update(contactsTable).set(parsed.data).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.json(UpdateContactResponse.parse(serializeContact(contact)));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const params = DeleteContactParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [contact] = await db.delete(contactsTable).where(eq(contactsTable.id, params.data.id)).returning();
  if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
  res.sendStatus(204);
});

export default router;
