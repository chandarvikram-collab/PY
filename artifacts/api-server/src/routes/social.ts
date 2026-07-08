import { Router } from "express";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  users,
  posts,
  follows,
  likes,
  comments,
  notifications,
  challenges,
  challengeParticipants,
  workoutSessions,
  workoutInvites,
  directMessages,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { setObjectAclPolicy } from "../lib/objectAcl";
import { sendPushNotification } from "../lib/push";

const objectStorageService = new ObjectStorageService();

function extractObjectPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/api\/storage(\/objects\/.+)/);
    return match ? match[1] : null;
  } catch {
    return url.startsWith("/objects/") ? url : null;
  }
}

async function setPublicAcl(url: string, ownerId: string, log: { error: (obj: object, msg: string) => void }): Promise<void> {
  const objectPath = extractObjectPath(url);
  if (!objectPath) {
    log.error({ url }, "setPublicAcl: could not extract objectPath from URL");
    throw new Error(`Cannot derive object path from media URL: ${url}`);
  }
  const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
  await setObjectAclPolicy(objectFile, { owner: ownerId, visibility: "public" });
}

const router = Router();

/** Look up actor name + recipient push token then fire a push — fire-and-forget, never throws. */
async function fireNotificationPush(
  recipientId: string,
  actorId: string,
  notifType: string,
  extra: Record<string, string> = {},
): Promise<void> {
  try {
    const [[actor], [recipient]] = await Promise.all([
      db.select({ name: users.name }).from(users).where(eq(users.id, actorId)).limit(1),
      db.select({ expoPushToken: users.expoPushToken }).from(users).where(eq(users.id, recipientId)).limit(1),
    ]);
    if (!recipient?.expoPushToken) return;

    const actorName = actor?.name ?? "Someone";
    let title: string;
    let body: string;

    switch (notifType) {
      case "like":
        title = "❤️ New like";
        body = `${actorName} liked your post`;
        break;
      case "comment":
        title = "💬 New comment";
        body = extra.commentText ? `${actorName}: "${extra.commentText}"` : `${actorName} commented on your post`;
        break;
      case "follow":
        title = "🏃 New follower";
        body = `${actorName} started following you`;
        break;
      case "invite":
        title = "🏋️ Workout invite";
        body = `${actorName} invited you to a workout`;
        break;
      case "invite_response":
        title = "📅 Invite response";
        body = `${actorName} responded to your workout invite`;
        break;
      default:
        return;
    }

    void sendPushNotification({
      token: recipient.expoPushToken,
      title,
      body,
      data: { type: notifType, ...extra },
    });
  } catch {
    // Never let push failures affect the HTTP response
  }
}

async function isConnected(userId: string, otherId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: follows.followerId })
    .from(follows)
    .where(
      or(
        and(eq(follows.followerId, userId), eq(follows.followingId, otherId)),
        and(eq(follows.followerId, otherId), eq(follows.followingId, userId)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

// ─── Feed ───────────────────────────────────────────────────────────────────

router.get("/feed", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const followingSubquery = db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const whereClause = and(
    or(
      eq(posts.userId, userId),
      inArray(posts.userId, followingSubquery),
    ),
    cursor ? sql`${posts.createdAt} < ${new Date(cursor)}` : undefined,
  );

  const rows = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      userName: users.name,
      userImageUrl: users.imageUrl,
      type: posts.type,
      content: posts.content,
      statsJson: posts.statsJson,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      thumbnailUrl: posts.thumbnailUrl,
      workoutSnapshot: posts.workoutSnapshot,
      createdAt: posts.createdAt,
      likeCount: sql<number>`cast(count(distinct ${likes.userId}) as int)`.as("like_count"),
      isLiked: sql<boolean>`bool_or(${likes.userId} = ${userId}::uuid)`.as("is_liked"),
      commentCount: sql<number>`cast(count(distinct ${comments.id}) as int)`.as("comment_count"),
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .leftJoin(likes, eq(likes.postId, posts.id))
    .leftJoin(comments, eq(comments.postId, posts.id))
    .where(whereClause)
    .groupBy(posts.id, users.id, users.name, users.imageUrl, posts.mediaUrl, posts.mediaType, posts.thumbnailUrl, posts.workoutSnapshot)
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  res.json(rows);
});

// ─── Posts ──────────────────────────────────────────────────────────────────

const createPostSchema = z.object({
  type: z.enum(["workout", "achievement", "milestone", "challenge"]).default("workout"),
  content: z.string().min(1).max(500),
  stats: z.record(z.string(), z.string()).optional(),
  mediaUrl: z.string().min(1).optional(),
  mediaType: z.enum(["photo", "video", "text"]).optional(),
  thumbnailUrl: z.string().min(1).optional(),
  workoutSnapshot: z.record(z.string(), z.string()).optional(),
});

router.post("/posts", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { type, content, stats, mediaUrl, mediaType, thumbnailUrl, workoutSnapshot } = parsed.data;

  const [row] = await db
    .insert(posts)
    .values({
      userId,
      type,
      content,
      statsJson: stats ?? null,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      workoutSnapshot: workoutSnapshot ?? null,
    })
    .returning();

  const [withUser] = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      userName: users.name,
      userImageUrl: users.imageUrl,
      type: posts.type,
      content: posts.content,
      statsJson: posts.statsJson,
      mediaUrl: posts.mediaUrl,
      mediaType: posts.mediaType,
      thumbnailUrl: posts.thumbnailUrl,
      workoutSnapshot: posts.workoutSnapshot,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.id, row.id))
    .limit(1);

  if (mediaUrl) {
    try {
      await setPublicAcl(mediaUrl, userId, req.log);
    } catch (err) {
      req.log.error({ err, mediaUrl }, "Failed to set public ACL on media; rolling back post");
      await db.delete(posts).where(eq(posts.id, row.id));
      res.status(500).json({ error: "Failed to make media accessible. Please retry." });
      return;
    }
  }
  if (thumbnailUrl) {
    try {
      await setPublicAcl(thumbnailUrl, userId, req.log);
    } catch (err) {
      req.log.error({ err, thumbnailUrl }, "Failed to set public ACL on thumbnail; continuing without thumbnail");
    }
  }

  req.log.info({ postId: row.id, userId }, "post created");
  res.status(201).json({ ...withUser, likeCount: 0, isLiked: false, commentCount: 0 });
});

// ─── Likes ──────────────────────────────────────────────────────────────────

router.post("/posts/:id/like", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const postId = req.params.id as string;

  const [post] = await db.select({ id: posts.id, userId: posts.userId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const inserted = await db
    .insert(likes)
    .values({ userId, postId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0 && post.userId !== userId) {
    await db
      .insert(notifications)
      .values({ recipientId: post.userId, actorId: userId, type: "like", postId });
    void fireNotificationPush(post.userId, userId, "like", { postId });
  }

  res.status(204).send();
});

router.delete("/posts/:id/like", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const postId = req.params.id as string;

  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
  res.status(204).send();
});

// ─── Comments ───────────────────────────────────────────────────────────────

router.get("/posts/:id/comments", requireAuth, async (req, res) => {
  const postId = req.params.id as string;

  const rows = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      userName: users.name,
      userImageUrl: users.imageUrl,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(comments.createdAt);

  res.json(rows);
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
});

router.post("/posts/:id/comments", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const postId = req.params.id as string;

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const [post] = await db.select({ id: posts.id, userId: posts.userId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const [comment] = await db
    .insert(comments)
    .values({ postId, userId, content: parsed.data.content })
    .returning();

  const [withUser] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      userName: users.name,
      userImageUrl: users.imageUrl,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.id, comment.id))
    .limit(1);

  if (post.userId !== userId) {
    const snippet = parsed.data.content.slice(0, 100);
    await db
      .insert(notifications)
      .values({
        recipientId: post.userId,
        actorId: userId,
        type: "comment",
        postId,
        commentText: snippet,
      });
    void fireNotificationPush(post.userId, userId, "comment", { postId, commentText: snippet });
  }

  req.log.info({ commentId: comment.id, postId, userId }, "comment created");
  res.status(201).json(withUser);
});

router.delete("/posts/:postId/comments/:commentId", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const { postId, commentId } = req.params as { postId: string; commentId: string };

  const [comment] = await db
    .select({ id: comments.id, userId: comments.userId, postId: comments.postId })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
    .limit(1);

  if (!comment) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }

  const [post] = await db
    .select({ id: posts.id, userId: posts.userId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const isCommentAuthor = comment.userId === userId;
  const isPostOwner = post.userId === userId;

  if (!isCommentAuthor && !isPostOwner) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(comments).where(eq(comments.id, commentId));
  req.log.info({ commentId, postId, userId }, "comment deleted");
  res.status(204).send();
});

// ─── Follows ────────────────────────────────────────────────────────────────

router.post("/follows", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const { targetId } = req.body as { targetId?: string };

  if (!targetId || targetId === userId) {
    res.status(400).json({ error: "Invalid targetId" });
    return;
  }

  const followInserted = await db
    .insert(follows)
    .values({ followerId: userId, followingId: targetId })
    .onConflictDoNothing()
    .returning();

  if (followInserted.length > 0) {
    await db
      .insert(notifications)
      .values({ recipientId: targetId, actorId: userId, type: "follow" });
    void fireNotificationPush(targetId, userId, "follow");
  }

  res.status(204).send();
});

router.delete("/follows/:targetId", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const targetId = req.params.targetId as string;

  await db
    .delete(follows)
    .where(and(eq(follows.followerId, userId), eq(follows.followingId, targetId)));

  res.status(204).send();
});

router.get("/follows", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const following = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
      totalPoints: users.totalPoints,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId));

  res.json(following);
});

router.get("/follows/following", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const weeklySubquery = db
    .select({
      userId: workoutSessions.userId,
      weeklyWorkouts: sql<number>`cast(count(*) as int)`.as("weekly_workouts"),
    })
    .from(workoutSessions)
    .where(sql`${workoutSessions.date} >= ${cutoff}`)
    .groupBy(workoutSessions.userId)
    .as("weekly");

  const following = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
      level: users.level,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
      totalPoints: users.totalPoints,
      weeklyWorkouts: sql<number>`coalesce(${weeklySubquery.weeklyWorkouts}, 0)`,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .leftJoin(weeklySubquery, eq(users.id, weeklySubquery.userId))
    .where(eq(follows.followerId, userId));

  res.json(following);
});

router.get("/follows/followers", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const followers = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
      level: users.level,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
      totalPoints: users.totalPoints,
    })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(eq(follows.followingId, userId));

  res.json(followers);
});

router.get("/discover", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const userLevel = (req.query.level as string) || "";
  const userGoals: string[] = req.query.goals
    ? String(req.query.goals).split(",").filter(Boolean)
    : [];
  const userEquipment: string[] = req.query.equipment
    ? String(req.query.equipment).split(",").filter(Boolean)
    : [];
  const filterActivities: string[] = req.query.activities
    ? String(req.query.activities).split(",").filter(Boolean)
    : [];
  const filterAvailability: string[] = req.query.availability
    ? String(req.query.availability).split(",").filter(Boolean)
    : [];

  const followingRows = await db
    .select({ id: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const excludeIds = [userId, ...followingRows.map((f) => f.id)];

  const discovered = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
      level: users.level,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
      totalPoints: users.totalPoints,
      goals: users.goals,
      equipment: users.equipment,
      activities: users.activities,
      availability: users.availability,
    })
    .from(users)
    .where(notInArray(users.id, excludeIds))
    .orderBy(desc(users.totalPoints))
    .limit(50);

  const goalSet = new Set(userGoals);
  const equipSet = new Set(userEquipment);
  const activitySet = new Set(filterActivities);
  const availabilitySet = new Set(filterAvailability);

  const scored = discovered
    .map((u) => {
      const sharedGoals = (u.goals ?? []).filter((g) => goalSet.has(g));
      const sharedEquipment = (u.equipment ?? []).filter((e) => equipSet.has(e));
      const sharedActivities = (u.activities ?? []).filter((a) => activitySet.has(a));
      const sharedAvailability = (u.availability ?? []).filter((a) => availabilitySet.has(a));
      const sharedLevel = userLevel ? u.level === userLevel : false;
      const score =
        sharedGoals.length * 3 +
        sharedEquipment.length * 2 +
        sharedActivities.length * 3 +
        sharedAvailability.length * 2 +
        (sharedLevel ? 2 : 0) +
        Math.log1p(u.totalPoints) * 0.1;
      return { u, sharedGoals, sharedEquipment, sharedActivities, sharedAvailability, sharedLevel, score };
    })
    // When the caller selects explicit activity/availability filters, only
    // return athletes who actually match at least one of each selected
    // dimension — this is a real filter, not just a scoring nudge.
    .filter((row) => {
      if (activitySet.size > 0 && row.sharedActivities.length === 0) return false;
      if (availabilitySet.size > 0 && row.sharedAvailability.length === 0) return false;
      return true;
    });

  scored.sort((a, b) => b.score - a.score);

  res.json(
    scored.map(({ u, sharedGoals, sharedEquipment, sharedActivities, sharedAvailability, sharedLevel }) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      imageUrl: u.imageUrl,
      level: u.level,
      streak: u.streak,
      totalWorkouts: u.totalWorkouts,
      totalPoints: u.totalPoints,
      activities: u.activities ?? [],
      availability: u.availability ?? [],
      sharedLevel,
      sharedGoals,
      sharedEquipment,
      sharedActivities,
      sharedAvailability,
    })),
  );
});

// ─── Notifications ──────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      read: notifications.read,
      postId: notifications.postId,
      commentText: notifications.commentText,
      createdAt: notifications.createdAt,
      actorId: notifications.actorId,
      actorName: users.name,
      actorImageUrl: users.imageUrl,
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  res.json(rows);
});

router.patch("/notifications/read", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.recipientId, userId), eq(notifications.read, false)));

  res.status(204).send();
});

// ─── Challenges ─────────────────────────────────────────────────────────────

router.get("/challenges", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const myParticipations = await db
    .select({
      challengeId: challengeParticipants.challengeId,
      myProgress: challengeParticipants.progress,
      myTarget: challengeParticipants.target,
      inviteAccepted: challengeParticipants.inviteAccepted,
    })
    .from(challengeParticipants)
    .where(eq(challengeParticipants.userId, userId));

  if (!myParticipations.length) {
    res.json([]);
    return;
  }

  const challengeIds = myParticipations.map((p) => p.challengeId);

  const [challengeRows, participantRows] = await Promise.all([
    db
      .select({
        id: challenges.id,
        type: challenges.type,
        title: challenges.title,
        description: challenges.description,
        fromId: challenges.fromId,
        fromName: users.name,
        target: challenges.target,
        unit: challenges.unit,
        deadline: challenges.deadline,
        status: challenges.status,
        createdAt: challenges.createdAt,
      })
      .from(challenges)
      .leftJoin(users, eq(challenges.fromId, users.id))
      .where(inArray(challenges.id, challengeIds)),
    db
      .select({
        challengeId: challengeParticipants.challengeId,
        userId: challengeParticipants.userId,
        userName: users.name,
        progress: challengeParticipants.progress,
        target: challengeParticipants.target,
        inviteAccepted: challengeParticipants.inviteAccepted,
      })
      .from(challengeParticipants)
      .innerJoin(users, eq(challengeParticipants.userId, users.id))
      .where(inArray(challengeParticipants.challengeId, challengeIds)),
  ]);

  const myMap = new Map(myParticipations.map((p) => [p.challengeId, p]));
  const participantsByChallenge = new Map<string, typeof participantRows>();

  for (const p of participantRows) {
    if (!participantsByChallenge.has(p.challengeId)) {
      participantsByChallenge.set(p.challengeId, []);
    }
    participantsByChallenge.get(p.challengeId)!.push(p);
  }

  const result = challengeRows.map((c) => {
    const my = myMap.get(c.id)!;
    const parts = participantsByChallenge.get(c.id) ?? [];
    return {
      ...c,
      myProgress: my.myProgress,
      inviteAccepted: my.inviteAccepted,
      status: my.inviteAccepted ? c.status : "pending",
      participants: parts.map((p) => ({
        id: p.userId,
        name: p.userName,
        progress: p.progress,
        target: p.target,
      })),
    };
  });

  res.json(result);
});

const createChallengeSchema = z.object({
  type: z.enum(["steps", "distance", "lifting", "streak"]),
  title: z.string().min(1).max(100),
  description: z.string().max(300).default(""),
  targetUserId: z.string().uuid().optional(),
  target: z.number().positive(),
  unit: z.string().min(1),
  deadline: z.string(),
});

router.post("/challenges", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const parsed = createChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { type, title, description, targetUserId, target, unit, deadline } = parsed.data;

  const [challenge] = await db
    .insert(challenges)
    .values({
      type,
      title,
      description,
      creatorId: userId,
      fromId: userId,
      target,
      unit,
      deadline,
      status: "active",
    })
    .returning();

  const participants = [
    { challengeId: challenge.id, userId, progress: 0, target, inviteAccepted: true },
  ];

  if (targetUserId && targetUserId !== userId) {
    participants.push({
      challengeId: challenge.id,
      userId: targetUserId,
      progress: 0,
      target,
      inviteAccepted: false,
    });
  }

  await db.insert(challengeParticipants).values(participants);

  req.log.info({ challengeId: challenge.id, userId }, "challenge created");
  res.status(201).json(challenge);
});

router.patch("/challenges/:id/progress", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const challengeId = req.params.id as string;
  const { progress } = req.body as { progress?: number };

  if (typeof progress !== "number") {
    res.status(400).json({ error: "progress must be a number" });
    return;
  }

  const [row] = await db
    .update(challengeParticipants)
    .set({ progress })
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, userId),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Participation not found" });
    return;
  }

  res.json(row);
});

router.patch("/challenges/:id/accept", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const challengeId = req.params.id as string;

  const [row] = await db
    .update(challengeParticipants)
    .set({ inviteAccepted: true })
    .where(
      and(
        eq(challengeParticipants.challengeId, challengeId),
        eq(challengeParticipants.userId, userId),
      ),
    )
    .returning();

  if (!row) {
    res.status(404).json({ error: "Participation not found" });
    return;
  }

  res.json(row);
});

// ─── Workout Invites ────────────────────────────────────────────────────────

const createInviteSchema = z.object({
  receiverId: z.string().uuid(),
  activity: z.string().min(1).max(100),
  location: z.string().max(200).default(""),
  date: z.string().min(1),
  time: z.string().max(50).default(""),
});

router.post("/invites", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const parsed = createInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const { receiverId, activity, location, date, time } = parsed.data;
  if (receiverId === userId) {
    res.status(400).json({ error: "Cannot invite yourself" });
    return;
  }

  const [receiver] = await db.select({ id: users.id }).from(users).where(eq(users.id, receiverId)).limit(1);
  if (!receiver) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!(await isConnected(userId, receiverId))) {
    res.status(403).json({ error: "You must follow (or be followed by) this user to send an invite" });
    return;
  }

  const [invite] = await db
    .insert(workoutInvites)
    .values({ senderId: userId, receiverId, activity, location, date, time, status: "pending" })
    .returning();

  await db.insert(notifications).values({ recipientId: receiverId, actorId: userId, type: "invite" });
  void fireNotificationPush(receiverId, userId, "invite", { inviteId: invite.id });

  req.log.info({ inviteId: invite.id, senderId: userId, receiverId }, "workout invite created");
  res.status(201).json(invite);
});

router.get("/invites", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const sender = alias(users, "sender");
  const receiver = alias(users, "receiver");

  const rows = await db
    .select({
      id: workoutInvites.id,
      senderId: workoutInvites.senderId,
      senderName: sender.name,
      receiverId: workoutInvites.receiverId,
      receiverName: receiver.name,
      activity: workoutInvites.activity,
      location: workoutInvites.location,
      date: workoutInvites.date,
      time: workoutInvites.time,
      status: workoutInvites.status,
      createdAt: workoutInvites.createdAt,
    })
    .from(workoutInvites)
    .innerJoin(sender, eq(sender.id, workoutInvites.senderId))
    .innerJoin(receiver, eq(receiver.id, workoutInvites.receiverId))
    .where(or(eq(workoutInvites.senderId, userId), eq(workoutInvites.receiverId, userId)))
    .orderBy(desc(workoutInvites.createdAt));

  res.json(rows);
});

const updateInviteSchema = z.object({
  status: z.enum(["accepted", "declined", "maybe"]),
});

router.patch("/invites/:id", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const inviteId = req.params.id as string;
  const parsed = updateInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const [invite] = await db.select().from(workoutInvites).where(eq(workoutInvites.id, inviteId)).limit(1);
  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  if (invite.receiverId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [updated] = await db
    .update(workoutInvites)
    .set({ status: parsed.data.status })
    .where(eq(workoutInvites.id, inviteId))
    .returning();

  await db.insert(notifications).values({ recipientId: invite.senderId, actorId: userId, type: "invite_response" });
  void fireNotificationPush(invite.senderId, userId, "invite_response", { inviteId });

  req.log.info({ inviteId, status: parsed.data.status, userId }, "workout invite responded");
  res.json(updated);
});

// ─── Direct Messages ────────────────────────────────────────────────────────

router.get("/messages/threads", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const [followingRows, partnerRows] = await Promise.all([
    db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, userId)),
    db
      .select({
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
      })
      .from(directMessages)
      .where(or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId))),
  ]);

  const partnerIds = new Set<string>(followingRows.map((r) => r.id));
  for (const row of partnerRows) {
    partnerIds.add(row.senderId === userId ? row.receiverId : row.senderId);
  }
  partnerIds.delete(userId);

  if (partnerIds.size === 0) {
    res.json([]);
    return;
  }

  const partnerIdList = Array.from(partnerIds);

  const [partnerUsers, lastMessages, unreadCounts] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, username: users.username, imageUrl: users.imageUrl })
      .from(users)
      .where(inArray(users.id, partnerIdList)),
    db
      .select({
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
        content: directMessages.content,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId)))
      .orderBy(desc(directMessages.createdAt)),
    db
      .select({
        senderId: directMessages.senderId,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(directMessages)
      .where(and(eq(directMessages.receiverId, userId), eq(directMessages.read, false)))
      .groupBy(directMessages.senderId),
  ]);

  const lastMessageByPartner = new Map<string, { content: string; createdAt: Date }>();
  for (const m of lastMessages) {
    const partnerId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!lastMessageByPartner.has(partnerId)) {
      lastMessageByPartner.set(partnerId, { content: m.content, createdAt: m.createdAt });
    }
  }
  const unreadByPartner = new Map<string, number>(unreadCounts.map((r) => [r.senderId, r.count]));

  const threads = partnerUsers.map((u) => {
    const last = lastMessageByPartner.get(u.id);
    return {
      friendId: u.id,
      friendName: u.name,
      friendUsername: u.username,
      friendImageUrl: u.imageUrl,
      lastMessage: last?.content ?? "",
      lastMessageAt: last?.createdAt ?? null,
      unreadCount: unreadByPartner.get(u.id) ?? 0,
    };
  });

  threads.sort((a, b) => {
    const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bt - at;
  });

  res.json(threads);
});

router.get("/messages/:friendId", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const friendId = req.params.friendId as string;

  const rows = await db
    .select()
    .from(directMessages)
    .where(
      or(
        and(eq(directMessages.senderId, userId), eq(directMessages.receiverId, friendId)),
        and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId)),
      ),
    )
    .orderBy(directMessages.createdAt);

  await db
    .update(directMessages)
    .set({ read: true })
    .where(and(eq(directMessages.senderId, friendId), eq(directMessages.receiverId, userId), eq(directMessages.read, false)));

  res.json(rows);
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(1000),
});

router.post("/messages/:friendId", requireAuth, async (req, res) => {
  const userId = req.localUserId!;
  const friendId = req.params.friendId as string;
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  const [friend] = await db.select({ id: users.id }).from(users).where(eq(users.id, friendId)).limit(1);
  if (!friend) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (!(await isConnected(userId, friendId))) {
    res.status(403).json({ error: "You must follow (or be followed by) this user to message them" });
    return;
  }

  const [message] = await db
    .insert(directMessages)
    .values({ senderId: userId, receiverId: friendId, content: parsed.data.content })
    .returning();

  req.log.info({ messageId: message.id, senderId: userId, receiverId: friendId }, "direct message sent");
  res.status(201).json(message);
});

export default router;
