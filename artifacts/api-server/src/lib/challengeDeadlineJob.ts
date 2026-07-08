import { and, eq, inArray, sql } from "drizzle-orm";
import { db, challenges, challengeParticipants, users } from "@workspace/db";
import { sendPushNotification } from "./push";
import { logger } from "./logger";

export async function runChallengeDeadlineCheck(): Promise<void> {
  try {
    // Find challenges whose deadline is between 24 and 25 hours from now
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const windowStart = in24h.toISOString().slice(0, 10);
    const windowEnd = in25h.toISOString().slice(0, 10);

    // Only alert for challenges expiring exactly "tomorrow" (date match)
    const upcomingChallenges = await db
      .select({ id: challenges.id, title: challenges.title, deadline: challenges.deadline })
      .from(challenges)
      .where(
        and(
          eq(challenges.status, "active"),
          sql`${challenges.deadline} >= ${windowStart}`,
          sql`${challenges.deadline} <= ${windowEnd}`,
        ),
      );

    if (upcomingChallenges.length === 0) return;

    const challengeIds = upcomingChallenges.map((c) => c.id);

    // Get all accepted participants with push tokens
    const participants = await db
      .select({
        challengeId: challengeParticipants.challengeId,
        expoPushToken: users.expoPushToken,
        userName: users.name,
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
