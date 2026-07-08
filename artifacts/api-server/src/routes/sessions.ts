import { Router } from "express";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import {
  db,
  workoutSessions,
  runSessions,
  users,
  personalRecords,
  sessionPrs,
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

  // ── PR Detection ────────────────────────────────────────────────────────────
  // Process sets in log order with a rolling best per exercise so that every set
  // that was a new record *at the time it was logged* gets a session_prs entry.
  // E.g. if stored best is 80 lbs and the user does 85→90→95, all three sets
  // are PRs and each gets its own row with (exerciseIndex, setIndex) coordinates.
  const newPrs: string[] = [];
  try {
    // drizzle-zod widens some fields to string|string[]; narrow to string for eq() calls.
    const prUserId: string = Array.isArray(data.userId) ? data.userId[0]! : (data.userId as string);
    type SetEntry = { weight: number; reps: number; restSeconds?: number };
    type ExEntry = { name: string; category: string; sets: SetEntry[] };
    const exerciseLog = (data.exerciseLogJson ?? []) as ExEntry[];

    if (Array.isArray(exerciseLog) && exerciseLog.length > 0) {
      const exerciseNames = [...new Set(exerciseLog.filter((e) => e.name).map((e) => e.name))];

      if (exerciseNames.length > 0) {
        // Load existing all-time bests as the baseline for rolling comparison.
        const existing = await db
          .select({
            exerciseName: personalRecords.exerciseName,
            estimatedOneRm: personalRecords.estimatedOneRm,
          })
          .from(personalRecords)
          .where(and(eq(personalRecords.userId, prUserId), inArray(personalRecords.exerciseName, exerciseNames)));

        // rollingBest: tracks the current best within this session (seeded from DB).
        // storedBest: the pre-session values; used to decide INSERT vs UPDATE later.
        const rollingBest: Record<string, number> = {};
        const storedBest: Record<string, number> = {};
        for (const r of existing) {
          rollingBest[r.exerciseName] = r.estimatedOneRm;
          storedBest[r.exerciseName] = r.estimatedOneRm;
        }

        // finalBest: best achieved in this session (may span multiple progressive PRs).
        const finalBest: Record<string, { weight: number; reps: number; oneRm: number }> = {};
        const prExerciseNames = new Set<string>();

        for (let exIdx = 0; exIdx < exerciseLog.length; exIdx++) {
          const ex = exerciseLog[exIdx];
          if (!ex.name) continue;

          for (let setIdx = 0; setIdx < ex.sets.length; setIdx++) {
            const s = ex.sets[setIdx];
            if (s.weight > 0 && s.reps > 0) {
              const oneRm = s.weight * (1 + s.reps / 30);
              if (oneRm > (rollingBest[ex.name] ?? -1)) {
                // This set beat every previous set (both stored and earlier in session).
                rollingBest[ex.name] = oneRm;
                finalBest[ex.name] = { weight: s.weight, reps: s.reps, oneRm };
                prExerciseNames.add(ex.name);

                // Append one row per PR-achieving set with exact set coordinates.
                await db.insert(sessionPrs).values({
                  sessionId: rows[0].id,
                  userId: prUserId,
                  exerciseName: ex.name,
                  exerciseIndex: exIdx,
                  setIndex: setIdx,
                  weightLbs: s.weight,
                  reps: s.reps,
                  estimatedOneRm: oneRm,
                  date: data.date,
                });
              }
            }
          }
        }

        // Update personal_records with the final (highest) best per exercise.
        for (const [name, best] of Object.entries(finalBest)) {
          if (storedBest[name] !== undefined) {
            await db
              .update(personalRecords)
              .set({ weightLbs: best.weight, reps: best.reps, estimatedOneRm: best.oneRm, date: data.date, sessionId: rows[0].id })
              .where(and(eq(personalRecords.userId, prUserId), eq(personalRecords.exerciseName, name)));
          } else {
            await db.insert(personalRecords).values({
              userId: prUserId,
              exerciseName: name,
              weightLbs: best.weight,
              reps: best.reps,
              estimatedOneRm: best.oneRm,
              date: data.date,
              sessionId: rows[0].id,
            });
          }
        }

        newPrs.push(...prExerciseNames);
      }
    }
  } catch (prErr) {
    req.log.warn({ prErr }, "PR detection failed — non-fatal");
  }

  req.log.info({ sessionId: rows[0].id, newPrs }, "workout session saved");
  res.status(201).json({ session: rows[0], user: updatedUser, newPrs });
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

// Detail routes under /sessions/workout/id/:id and /sessions/run/id/:id
// to avoid collision with /:userId list routes above.

router.get("/sessions/workout/id/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Workout session not found" });
    return;
  }
  if (row.userId !== req.localUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(row);
});

router.get("/sessions/run/id/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const [row] = await db.select().from(runSessions).where(eq(runSessions.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Run session not found" });
    return;
  }
  if (row.userId !== req.localUserId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(row);
});

router.patch("/sessions/workout/id/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const { exerciseLogJson } = req.body as { exerciseLogJson?: unknown };
  if (!exerciseLogJson) {
    res.status(400).json({ error: "exerciseLogJson is required" });
    return;
  }

  // Verify ownership before updating
  const [existing] = await db.select({ userId: workoutSessions.userId }).from(workoutSessions).where(eq(workoutSessions.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Workout session not found" });
    return;
  }
  if (existing.userId !== req.localUserId) {
    res.status(403).json({ error: "Forbidden" });
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
