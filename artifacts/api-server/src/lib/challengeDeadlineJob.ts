import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, challenges, challengeParticipants, users } from "@workspace/db";
import { sendPushNotification } from "./push";
import { logger } from "./logger";

export async function runChallengeDeadlineCheck(): Promise<void> {
  try {
    // True 24–25h timestamp window so each challenge is only caught in one hourly run
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // deadline is stored as text "YYYY-MM-DD"; cast to date for comparison.
    // Also filter to challenges that have never been notified (deadline_notified_at IS NULL)
    // so the hourly job never fires twice for the same challenge.
    const upcomingChallenges = await db
      .select({ id: challenges.id, title: challenges.title, deadline: challenges.deadline })
      .from(challenges)
      .where(
        and(
          eq(challenges.status, "active"),
          isNull(challenges.deadlineNotifiedAt),
          sql`${challenges.deadline}::date BETWEEN ${in24h.toISOString()}::timestamptz::date AND ${in25h.toISOString()}::timestamptz::date`,
        ),
      );

    if (upcomingChallenges.length === 0) return;

    const challengeIds = upcomingChallenges.map((c) => c.id);

    // Mark all matched challenges as notified immediately (before sending)
    // to prevent a second concurrent job run from double-sending.
    await db
      .update(challenges)
      .set({ deadlineNotifiedAt: new Date() })
      .where(inArray(challenges.id, challengeIds));

    // Get all accepted participants with push tokens
    const participants = await db
      .select({
        challengeId: challengeParticipants.challengeId,
        expoPushToken: users.expoPushToken,
      })
      .from(challengeParticipants)
      .innerJoin(users, eq(challengeParticipants.userId, users.id))
      .where(
        and(
          inArray(challengeParticipants.challengeId, challengeIds),
          eq(challengeParticipants.inviteAccepted, true),
        ),
      );

    const challengeMap = new Map(upcomingChallenges.map((c) => [c.id, c]));

    const sends = participants
      .filter((p) => p.expoPushToken)
      .map((p) => {
        const challenge = challengeMap.get(p.challengeId)!;
        return sendPushNotification({
          token: p.expoPushToken!,
          title: "⏰ Challenge ending soon",
          body: `"${challenge.title}" ends tomorrow — make your final push!`,
          data: { type: "challenge_deadline", challengeId: p.challengeId },
        });
      });

    await Promise.allSettled(sends);

    logger.info({ count: sends.length }, "Challenge deadline push notifications sent");
  } catch (err) {
    logger.error({ err }, "Challenge deadline check failed");
  }
}
