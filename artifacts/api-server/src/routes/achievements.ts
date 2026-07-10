import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, scheduledWorkouts, workoutSessions, challenges, personalRecords } from "@workspace/db";
import { requireAuth, requireOwner } from "../middlewares/requireAuth";

const router: IRouter = Router();

const SOCIAL_BUTTERFLY_TARGET = 5;

function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

function weeksStreakFromCompletedDates(dates: string[]): number {
  const weekSet = new Set(dates.map(mondayOf));
  const currentMonday = mondayOf(new Date().toISOString().slice(0, 10));

  // If the current week has no completed workout yet, look back from last week
  // so an in-progress week doesn't zero out an otherwise active streak.
  let cursor = weekSet.has(currentMonday)
    ? new Date(`${currentMonday}T00:00:00Z`)
    : (() => {
        const d = new Date(`${currentMonday}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 7);
        return d;
      })();

  if (!weekSet.has(cursor.toISOString().slice(0, 10))) return 0;

  let streak = 0;
  while (weekSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}

// ─── GET /api/achievements/:userId ────────────────────────────────────────────
// Computes badge progress on the fly from existing workout/social/PR data —
// there is no dedicated achievements table, so this is always source-of-truth.

router.get(
  "/achievements/:userId",
  requireAuth,
  requireOwner((req) => req.params.userId),
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    try {
      const [completedSchedules, sessions, createdChallenges, prs] = await Promise.all([
        db
          .select({ date: scheduledWorkouts.date })
          .from(scheduledWorkouts)
          .where(and(eq(scheduledWorkouts.userId, userId), eq(scheduledWorkouts.completed, true))),
        db
          .select({ createdAt: workoutSessions.createdAt })
          .from(workoutSessions)
          .where(eq(workoutSessions.userId, userId)),
        db
          .select({ id: challenges.id })
          .from(challenges)
          .where(eq(challenges.creatorId, userId)),
        db
          .select({ id: personalRecords.id })
          .from(personalRecords)
          .where(eq(personalRecords.userId, userId)),
      ]);

      const streakWeeks = weeksStreakFromCompletedDates(completedSchedules.map((r) => r.date));

      const earlyBird = sessions.some((s) => new Date(s.createdAt).getUTCHours() < 7);
      const nightOwl = sessions.some((s) => new Date(s.createdAt).getUTCHours() >= 21);

      const socialButterflyCount = createdChallenges.length;
      const prCount = prs.length;

      res.json({
        streak: {
          weeks: streakWeeks,
          milestones: [
            { weeks: 1, key: "streak_1", label: "1 Week Warrior", earned: streakWeeks >= 1 },
            { weeks: 4, key: "streak_4", label: "1 Month Momentum", earned: streakWeeks >= 4 },
            { weeks: 12, key: "streak_12", label: "12 Week Titan", earned: streakWeeks >= 12 },
          ],
        },
        earlyBird: { earned: earlyBird, key: "early_bird", label: "Early Bird", description: "Logged a workout before 7am" },
        nightOwl: { earned: nightOwl, key: "night_owl", label: "Night Owl", description: "Logged a workout after 9pm" },
        socialButterfly: {
          count: socialButterflyCount,
          target: SOCIAL_BUTTERFLY_TARGET,
          earned: socialButterflyCount >= SOCIAL_BUTTERFLY_TARGET,
          key: "social_butterfly",
          label: "Social Butterfly",
          description: `Send ${SOCIAL_BUTTERFLY_TARGET} challenges to friends`,
        },
        prCrusher: {
          count: prCount,
          earned: prCount >= 1,
          key: "pr_crusher",
          label: "PR Crusher",
          description: "Set a new personal record",
        },
      });
    } catch (err) {
      req.log.error({ err }, "Error computing achievements");
      res.status(500).json({ error: "Failed to compute achievements" });
    }
  },
);

export default router;
