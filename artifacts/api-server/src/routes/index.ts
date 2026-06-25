import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foodRouter from "./food";

const router: IRouter = Router();

router.use(healthRouter);
router.use(foodRouter);

export default router;
