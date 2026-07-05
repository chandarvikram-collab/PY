import { boolean, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("workout"),
  content: text("content").notNull(),
  statsJson: jsonb("stats_json").$type<Record<string, string>>(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  thumbnailUrl: text("thumbnail_url"),
  workoutSnapshot: jsonb("workout_snapshot").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
);

export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  creatorId: uuid("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromId: uuid("from_id").references(() => users.id, { onDelete: "set null" }),
  target: real("target").notNull(),
  unit: text("unit").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const challengeParticipants = pgTable(
  "challenge_participants",
  {
    challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    progress: real("progress").notNull().default(0),
    target: real("target").notNull(),
    inviteAccepted: boolean("invite_accepted").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.challengeId, t.userId] })],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "like" | "comment" | "follow"
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  commentText: text("comment_text"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workoutInvites = pgTable("workout_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activity: text("activity").notNull(),
  location: text("location").notNull().default(""),
  date: text("date").notNull(),
  time: text("time").notNull().default(""),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined" | "maybe"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: uuid("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({ createdAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertWorkoutInviteSchema = createInsertSchema(workoutInvites).omit({ id: true, createdAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true });

export type Post = typeof posts.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type WorkoutInvite = typeof workoutInvites.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type InsertWorkoutInvite = z.infer<typeof insertWorkoutInviteSchema>;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
