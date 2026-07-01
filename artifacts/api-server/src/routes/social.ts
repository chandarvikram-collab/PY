import { Router } from "express";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
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
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { setObjectAclPolicy } from "../lib/objectAcl";

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
    await db
      .insert(notifications)
      .values({
        recipientId: post.userId,
        actorId: userId,
        type: "comment",
        postId,
        commentText: parsed.data.content.slice(0, 100),
      });
  }

  req.log.info({ commentId: comment.id, postId, userId }, "comment created");
  res.status(201).json(withUser);
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

router.get("/users/discover", requireAuth, async (req, res) => {
  const userId = req.localUserId!;

  const discovered = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      imageUrl: users.imageUrl,
      streak: users.streak,
      totalWorkouts: users.totalWorkouts,
      totalPoints: users.totalPoints,
    })
    .from(users)
    .where(sql`${users.id} != ${userId}::uuid`)
    .orderBy(desc(users.totalPoints))
    .limit(50);

  res.json(discovered);
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

export default router;
