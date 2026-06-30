import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foodRouter from "./food";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import nutritionRouter from "./nutrition";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foodRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(nutritionRouter);

export default router;
