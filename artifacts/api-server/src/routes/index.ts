import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import assistantRouter from "./assistant";
import contactsRouter from "./contacts";
import eventsRouter from "./events";
import tasksRouter from "./tasks";
import statusRouter from "./status";
import telegramRouter, { startPolling } from "./telegram";
import rulesRouter from "./rules";
import memoryRouter from "./memory";
import logsRouter from "./logs";
import systemRouter from "./system";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(dashboardRouter);
router.use(assistantRouter);
router.use(contactsRouter);
router.use(eventsRouter);
router.use(tasksRouter);
router.use(statusRouter);
router.use(telegramRouter);
router.use(rulesRouter);
router.use(memoryRouter);
router.use(logsRouter);
router.use(systemRouter);

// Start Telegram polling if configured
startPolling().catch(() => { /* bot not configured yet */ });

export default router;
