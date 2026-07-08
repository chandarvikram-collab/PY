import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import foodRouter from "./food";
import usersRouter from "./users";
import sessionsRouter from "./sessions";
import nutritionRouter from "./nutrition";
import socialRouter from "./social";
import storageRouter from "./storage";
import routinesRouter from "./routines";
import plansRouter from "./plans";
import internalRouter from "./internal";
import progressRouter from "./progress";
import prsRouter from "./prs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(foodRouter);
router.use(usersRouter);
router.use(sessionsRouter);
router.use(nutritionRouter);
router.use(socialRouter);
router.use(storageRouter);
router.use(routinesRouter);
router.use(plansRouter);
router.use(internalRouter);
router.use(progressRouter);
router.use(prsRouter);

export default router;
