import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, scheduledWorkouts, createScheduledWorkoutSchema } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";

const router: IRouter = Router();

// ─── GET /api/schedule/:userId ────────────────────────────────────────────────
// Returns all scheduled workouts for a user (mobile filters/groups by date locally).

router.get(
  "/schedule/:userId",
  requireAuth,
  requireOwner((req) => req.params.userId),
  async (req: Request, res: Response) => {
    const userId: string = req.params.userId as string;
    try {
      const rows = await db
        .select()
        .from(scheduledWorkouts)
        .where(eq(scheduledWorkouts.userId, userId));
      res.json({ scheduledWorkouts: rows });
    } catch (err) {
      req.log.error({ err }, "Error fetching scheduled workouts");
      res.status(500).json({ error: "Failed to fetch scheduled workouts" });
    }
  },
);

// ─── POST /api/schedule ───────────────────────────────────────────────────────
// Creates a scheduled workout entry. If routineId is provided, snapshots its
// exercises so the schedule entry survives later routine edits/deletes.

router.post("/schedule", requireAuth, async (req: Request, res: Response) => {
  const parsed = createScheduledWorkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const userId: string = req.localUserId!;
  const { date, title, source, routineId, exercises } = parsed.data;

  try {
    // Clients snapshot exercises themselves (routine data can be local-only on
    // mobile), so we never re-derive the snapshot from routineId server-side.
    const [row] = await db
      .insert(scheduledWorkouts)
      .values({ userId, date, title, source, routineId: routineId ?? null, exercises: exercises ?? [] })
      .returning();

    req.log.info({ scheduledWorkoutId: row.id, userId }, "scheduled workout created");
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Error creating scheduled workout");
    res.status(500).json({ error: "Failed to create scheduled workout" });
  }
});

// ─── PATCH /api/schedule/:id/complete ────────────────────────────────────────
// Toggles the completed flag for a scheduled workout.

router.patch("/schedule/:id/complete", requireAuth, async (req: Request, res: Response) => {
  const userId: string = req.localUserId!;
  const id: string = req.params.id as string;
  const completed = Boolean(req.body?.completed);

  try {
    const [row] = await db
      .update(scheduledWorkouts)
      .set({ completed })
      .where(and(eq(scheduledWorkouts.id, id), eq(scheduledWorkouts.userId, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Scheduled workout not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error updating scheduled workout");
    res.status(500).json({ error: "Failed to update scheduled workout" });
  }
});

// ─── DELETE /api/schedule/:id ─────────────────────────────────────────────────

router.delete("/schedule/:id", requireAuth, async (req: Request, res: Response) => {
  const userId: string = req.localUserId!;
  const id: string = req.params.id as string;

  try {
    const [row] = await db
      .delete(scheduledWorkouts)
      .where(and(eq(scheduledWorkouts.id, id), eq(scheduledWorkouts.userId, userId)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Scheduled workout not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting scheduled workout");
    res.status(500).json({ error: "Failed to delete scheduled workout" });
  }
});

export default router;
