import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import assistantRouter from "./assistant";
import contactsRouter from "./contacts";
import eventsRouter from "./events";
import tasksRouter from "./tasks";
import statusRouter from "./status";
import telegramRouter from "./telegram";
import rulesRouter from "./rules";
import memoryRouter from "./memory";
import logsRouter from "./logs";

const router: IRouter = Router();

router.use(healthRouter);
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

export default router;
