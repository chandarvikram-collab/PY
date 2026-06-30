import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, workoutSessions, runSessions, users, insertWorkoutSessionSchema, insertRunSessionSchema } from "@workspace/db";

const router = Router();

router.post("/sessions/workout", async (req, res) => {
  const parsed = insertWorkoutSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const [row] = await db.insert(workoutSessions).values(data).returning();

  await db
    .update(users)
    .set({
      totalPoints: sql`${users.totalPoints} + ${data.pointsEarned}`,
      totalWorkouts: sql`${users.totalWorkouts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId));

  req.log.info({ sessionId: row.id }, "workout session saved");
  res.status(201).json(row);
});

router.get("/sessions/workout/:userId", async (req, res) => {
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, req.params.userId))
    .orderBy(desc(workoutSessions.createdAt))
    .limit(100);
  res.json(rows);
});

router.post("/sessions/run", async (req, res) => {
  const parsed = insertRunSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const [row] = await db.insert(runSessions).values(data).returning();

  await db
    .update(users)
    .set({
      totalPoints: sql`${users.totalPoints} + ${data.pointsEarned}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId));

  req.log.info({ sessionId: row.id }, "run session saved");
  res.status(201).json(row);
});

router.get("/sessions/run/:userId", async (req, res) => {
  const rows = await db
    .select()
    .from(runSessions)
    .where(eq(runSessions.userId, req.params.userId))
    .orderBy(desc(runSessions.createdAt))
    .limit(100);
  res.json(rows);
});

export default router;
