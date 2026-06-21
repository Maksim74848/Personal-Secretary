import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetTasksResponse,
  GetTasksQueryParams,
  GetTaskResponse,
  GetTaskParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  UpdateTaskResponse,
  DeleteTaskParams,
  CompleteTaskParams,
  CompleteTaskResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeTask(t: typeof tasksTable.$inferSelect) {
  return {
    ...t,
    description: t.description ?? null,
    dueDate: t.dueDate ?? null,
    reminder: t.reminder ?? null,
    tags: t.tags ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const query = GetTasksQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  let tasks;
  if (query.data.status) {
    tasks = await db.select().from(tasksTable).where(eq(tasksTable.status, query.data.status)).orderBy(tasksTable.createdAt);
  } else {
    tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);
  }
  res.json(GetTasksResponse.parse(tasks.map(serializeTask)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.insert(tasksTable).values(parsed.data).returning();
  res.status(201).json(GetTaskResponse.parse(serializeTask(task)));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(GetTaskResponse.parse(serializeTask(task)));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(UpdateTaskResponse.parse(serializeTask(task)));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.sendStatus(204);
});

router.patch("/tasks/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteTaskParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [task] = await db
    .update(tasksTable)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tasksTable.id, params.data.id))
    .returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  res.json(CompleteTaskResponse.parse(serializeTask(task)));
});

export default router;
