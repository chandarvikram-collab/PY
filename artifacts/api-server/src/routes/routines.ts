import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, routines, aiRoutinePayloadSchema } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router = Router();

const createRoutineBodySchema = z.object({
  userId: z.string().uuid(),
  routine: aiRoutinePayloadSchema,
});

router.post(
  "/routines",
  requireAuth,
  requireOwner((req) => req.body?.userId),
  async (req, res) => {
    const parsed = createRoutineBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }
    const { userId, routine } = parsed.data;

    const [row] = await db
      .insert(routines)
      .values({ userId, name: routine.name, exercises: routine.exercises })
      .returning();

    req.log.info({ routineId: row.id, userId }, "routine saved");
    res.status(201).json(row);
  },
);

router.get(
  "/routines/:userId",
  requireAuth,
  requireOwner((req) => req.params.userId),
  async (req, res) => {
    const userId = req.params.userId as string;
    const rows = await db
      .select()
      .from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(desc(routines.createdAt));
    res.json(rows);
  },
);

export default router;
