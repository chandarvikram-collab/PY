import { Router } from "express";
import { eq, desc, sql } from "drizzle-orm";
import {
  db,
  workoutSessions,
  runSessions,
  users,
  insertWorkoutSessionSchema,
  insertRunSessionSchema,
} from "@workspace/db";
import { requireAuth, requireOwner, optionalAuth, requireOwnerIfAuthenticated } from "../middlewares/requireAuth";

const router = Router();

async function calculateStreak(userId: string): Promise<number> {
  const [workouts, runs] = await Promise.all([
    db.select({ date: workoutSessions.date }).from(workoutSessions).where(eq(workoutSessions.userId, userId)),
    db.select({ date: runSessions.date }).from(runSessions).where(eq(runSessions.userId, userId)),
  ]);

  const allDates = [...workouts.map((r) => r.date), ...runs.map((r) => r.date)];
  const unique = Array.from(new Set(allDates)).sort().reverse();

  if (!unique.length) return 0;

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now);
  yesterday.setUTCDate(now.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (unique[0] !== todayStr && unique[0] !== yesterdayStr) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + "T00:00:00Z");
    const curr = new Date(unique[i] + "T00:00:00Z");
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

router.post("/sessions/workout", optionalAuth, requireOwnerIfAuthenticated((req) => req.body?.userId), async (req, res) => {
  const parsed = insertWorkoutSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const rows = await db
    .insert(workoutSessions)
    .values(data)
    .onConflictDoNothing({ target: workoutSessions.id })
    .returning();

  if (!rows.length) {
    res.status(200).json({ duplicate: true });
    return;
  }

  const streak = await calculateStreak(data.userId);

  const [updatedUser] = await db
    .update(users)
    .set({
      totalPoints: sql`${users.totalPoints} + ${data.pointsEarned}`,
      totalWorkouts: sql`${users.totalWorkouts} + 1`,
      streak,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId))
    .returning();

  req.log.info({ sessionId: rows[0].id }, "workout session saved");
  res.status(201).json({ session: rows[0], user: updatedUser });
});

router.get("/sessions/workout/:userId", requireAuth, requireOwner((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.createdAt))
    .limit(100);
  res.json(rows);
});

router.post("/sessions/run", optionalAuth, requireOwnerIfAuthenticated((req) => req.body?.userId), async (req, res) => {
  const parsed = insertRunSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const data = parsed.data;

  const rows = await db
    .insert(runSessions)
    .values(data)
    .onConflictDoNothing({ target: runSessions.id })
    .returning();

  if (!rows.length) {
    res.status(200).json({ duplicate: true });
    return;
  }

  const streak = await calculateStreak(data.userId);

  const [updatedUser] = await db
    .update(users)
    .set({
      totalPoints: sql`${users.totalPoints} + ${data.pointsEarned}`,
      streak,
      updatedAt: new Date(),
    })
    .where(eq(users.id, data.userId))
    .returning();

  req.log.info({ sessionId: rows[0].id }, "run session saved");
  res.status(201).json({ session: rows[0], user: updatedUser });
});

router.get("/sessions/run/:userId", requireAuth, requireOwner((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const rows = await db
    .select()
    .from(runSessions)
    .where(eq(runSessions.userId, userId))
    .orderBy(desc(runSessions.createdAt))
    .limit(100);
  res.json(rows);
});

router.get("/sessions/workout/:id", async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Workout session not found" });
    return;
  }
  res.json(row);
});

router.get("/sessions/run/:id", async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db.select().from(runSessions).where(eq(runSessions.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Run session not found" });
    return;
  }
  res.json(row);
});

router.patch("/sessions/workout/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { exerciseLogJson } = req.body as { exerciseLogJson?: unknown };
  if (!exerciseLogJson) {
    res.status(400).json({ error: "exerciseLogJson is required" });
    return;
  }
  const [row] = await db
    .update(workoutSessions)
    .set({ exerciseLogJson })
    .where(eq(workoutSessions.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Workout session not found" });
    return;
  }
  res.json(row);
});

router.get("/sessions/:userId", requireAuth, requireOwner((req) => req.params.userId), async (req, res) => {
  const userId = req.params.userId as string;
  const [workouts, runs] = await Promise.all([
    db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, userId))
      .orderBy(desc(workoutSessions.createdAt))
      .limit(100),
    db
      .select()
      .from(runSessions)
      .where(eq(runSessions.userId, userId))
      .orderBy(desc(runSessions.createdAt))
      .limit(100),
  ]);

  const combined = [
    ...workouts.map((w) => ({ ...w })),
    ...runs.map((r) => ({ ...r })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);

  res.json(combined);
});

export default router;
