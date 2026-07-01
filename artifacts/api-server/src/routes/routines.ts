import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, routines, aiRoutinePayloadSchema } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";

const router = Router();

router.post(
  "/routines",
  requireAuth,
  async (req, res) => {
    const parsed = aiRoutinePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const userId = req.localUserId!;
    const { name, exercises } = parsed.data;

    const [row] = await db
      .insert(routines)
      .values({ userId, name, exercises })
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
