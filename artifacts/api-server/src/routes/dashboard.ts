import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import {
  db,
  users,
  foodEntries,
  scheduledWorkouts,
  challenges,
  challengeParticipants,
  workoutSessions,
  runSessions,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

/** Returns the ISO date string (YYYY-MM-DD) for the Sunday that starts the current week (UTC). */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const sunday = new Date(now);
  sunday.setUTCDate(now.getUTCDate() - day);
  sunday.setUTCHours(0, 0, 0, 0);
  return sunday.toISOString().slice(0, 10);
}

/** Returns the ISO date string for the Saturday that ends the current week (UTC). */
function getWeekEnd(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const saturday = new Date(now);
  saturday.setUTCDate(now.getUTCDate() + (6 - day));
  saturday.setUTCHours(0, 0, 0, 0);
  return saturday.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── GET /api/dashboard/summary ───────────────────────────────────────────────
router.get("/dashboard/summary", requireAuth, async (req: Request, res: Response) => {
  const userId = req.localUserId!;
  const today = todayStr();
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  try {
    const [user, foodRows, scheduleRows, workoutRows, runRows] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)).limit(1),
      db.select().from(foodEntries).where(
        and(eq(foodEntries.userId, userId), eq(foodEntries.date, today))
      ),
      db
        .select({ date: scheduledWorkouts.date, completed: scheduledWorkouts.completed })
        .from(scheduledWorkouts)
        .where(
          and(
            eq(scheduledWorkouts.userId, userId),
            gte(scheduledWorkouts.date, weekStart),
            lte(scheduledWorkouts.date, weekEnd),
            eq(scheduledWorkouts.completed, true),
          )
        ),
      db
        .select({ date: workoutSessions.date })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, userId),
            gte(workoutSessions.date, weekStart),
            lte(workoutSessions.date, weekEnd),
          )
        ),
      db
        .select({ date: runSessions.date })
        .from(runSessions)
        .where(
          and(
            eq(runSessions.userId, userId),
            gte(runSessions.date, weekStart),
            lte(runSessions.date, weekEnd),
          )
        ),
    ]);

    const u = user[0];
    if (!u) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const caloriesToday = foodRows.reduce((s, r) => s + r.calories, 0);
    const proteinToday = foodRows.reduce((s, r) => s + r.protein, 0);
    const carbsToday = foodRows.reduce((s, r) => s + r.carbs, 0);
    const fatToday = foodRows.reduce((s, r) => s + r.fat, 0);

    // Count unique workout days this week (schedule completions + actual sessions)
    const workoutDays = new Set<string>();
    scheduleRows.forEach((r) => workoutDays.add(r.date));
    workoutRows.forEach((r) => workoutDays.add(r.date));
    runRows.forEach((r) => workoutDays.add(r.date));
    const workoutsThisWeek = workoutDays.size;

    res.json({
      name: u.name,
      imageUrl: u.imageUrl ?? null,
      workoutsThisWeek,
      streakDays: u.streak,
      caloriesToday,
      calorieGoal: u.calorieGoal,
      proteinToday,
      carbsToday,
      fatToday,
      proteinGoal: u.proteinGoal,
      carbGoal: u.carbGoal ?? 250,
      fatGoal: u.fatGoal ?? 70,
      totalPoints: u.totalPoints,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

// ─── GET /api/dashboard/current-week ──────────────────────────────────────────
router.get("/dashboard/current-week", requireAuth, async (req: Request, res: Response) => {
  const userId = req.localUserId!;
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  try {
    const rows = await db
      .select({
        id: scheduledWorkouts.id,
        date: scheduledWorkouts.date,
        title: scheduledWorkouts.title,
        completed: scheduledWorkouts.completed,
        source: scheduledWorkouts.source,
      })
      .from(scheduledWorkouts)
      .where(
        and(
          eq(scheduledWorkouts.userId, userId),
          gte(scheduledWorkouts.date, weekStart),
          lte(scheduledWorkouts.date, weekEnd),
        )
      )
      .orderBy(scheduledWorkouts.date);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching current week schedule");
    res.status(500).json({ error: "Failed to fetch current week schedule" });
  }
});

// ─── GET /api/dashboard/active-challenge ──────────────────────────────────────
router.get("/dashboard/active-challenge", requireAuth, async (req: Request, res: Response) => {
  const userId = req.localUserId!;
  const today = todayStr();

  try {
    // Find the most recent active challenge the user participates in
    const rows = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        type: challenges.type,
        target: challenges.target,
        unit: challenges.unit,
        deadline: challenges.deadline,
        progress: challengeParticipants.progress,
        participantTarget: challengeParticipants.target,
      })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(
        and(
          eq(challengeParticipants.userId, userId),
          eq(challenges.status, "active"),
          gte(challenges.deadline, today),
        )
      )
      .orderBy(desc(challenges.createdAt))
      .limit(1);

    if (!rows.length) {
      res.json({ challenge: null });
      return;
    }

    const row = rows[0]!;
    const target = row.participantTarget > 0 ? row.participantTarget : row.target;
    const progressPercent = Math.min(100, Math.round((row.progress / target) * 100));

    // Calculate days left
    const deadlineDate = new Date(`${row.deadline}T00:00:00Z`);
    const todayDate = new Date(`${today}T00:00:00Z`);
    const daysLeft = Math.max(
      0,
      Math.ceil((deadlineDate.getTime() - todayDate.getTime()) / 86400000)
    );

    res.json({
      challenge: {
        id: row.id,
        title: row.title,
        type: row.type,
        target,
        unit: row.unit,
        deadline: row.deadline,
        progress: row.progress,
        progressPercent,
        daysLeft,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching active challenge");
    res.status(500).json({ error: "Failed to fetch active challenge" });
  }
});

// ─── GET /api/dashboard/leaderboard ───────────────────────────────────────────
router.get("/dashboard/leaderboard", requireAuth, async (req: Request, res: Response) => {
  const currentUserId = req.localUserId!;
  const limitParam = req.query.limit;
  const limit = Math.min(50, Math.max(1, Number(limitParam ?? 10) || 10));

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        imageUrl: users.imageUrl,
        totalPoints: users.totalPoints,
      })
      .from(users)
      .orderBy(desc(users.totalPoints))
      .limit(limit);

    const entries = rows.map((u, i) => ({
      userId: u.id,
      name: u.name,
      username: u.username,
      imageUrl: u.imageUrl ?? null,
      totalPoints: u.totalPoints,
      rank: i + 1,
      isCurrentUser: u.id === currentUserId,
    }));

    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "Error fetching leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
