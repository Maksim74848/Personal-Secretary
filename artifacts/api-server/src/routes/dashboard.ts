import { Router, type IRouter } from "express";
import { db, tasksTable, eventsTable, contactsTable, messagesTable, userStatusTable } from "@workspace/db";
import { count, eq, gte, lte, and } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [pendingTasksResult] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(eq(tasksTable.status, "pending"));

  const [todayEventsResult] = await db
    .select({ count: count() })
    .from(eventsTable)
    .where(
      and(
        gte(eventsTable.startTime, todayStart),
        lte(eventsTable.startTime, todayEnd)
      )
    );

  const [totalContactsResult] = await db
    .select({ count: count() })
    .from(contactsTable);

  const [recentMessagesResult] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  const statusRows = await db
    .select()
    .from(userStatusTable)
    .orderBy(userStatusTable.updatedAt)
    .limit(1);

  const upcomingDeadlines = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.status, "pending"))
    .limit(3);

  const currentStatus = statusRows[0]?.status ?? "free";

  res.json(GetDashboardSummaryResponse.parse({
    pendingTasks: pendingTasksResult.count,
    todayEvents: todayEventsResult.count,
    totalContacts: totalContactsResult.count,
    recentMessages: recentMessagesResult.count,
    currentStatus,
    upcomingDeadlines: upcomingDeadlines.map(t => ({
      ...t,
      dueDate: t.dueDate ?? null,
      reminder: t.reminder ?? null,
      tags: t.tags ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  }));
});

export default router;
