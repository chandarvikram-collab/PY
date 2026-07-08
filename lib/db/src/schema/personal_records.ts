import { integer, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";
import { workoutSessions } from "./workout_sessions";

// ── personal_records ─────────────────────────────────────────────────────────
// One row per user+exercise: always the current all-time best (upsert on new PR).
// Used for the "current records" display / GET /api/prs.
export const personalRecords = pgTable(
  "personal_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseName: text("exercise_name").notNull(),
    weightLbs: real("weight_lbs").notNull(),
    reps: integer("reps").notNull(),
    estimatedOneRm: real("estimated_1rm").notNull(),
    date: text("date").notNull(),
    sessionId: uuid("session_id").references(() => workoutSessions.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique("pr_user_exercise_unique").on(table.userId, table.exerciseName)],
);

// ── session_prs ───────────────────────────────────────────────────────────────
// Append-only event log: one row per (session, exercise) that set a new PR.
// Never overwritten — allows historical workout detail badges to be permanent.
// Used for GET /api/prs/session/:sessionId.
export const sessionPrs = pgTable("session_prs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  exerciseIndex: integer("exercise_index").notNull().default(0),
  setIndex: integer("set_index").notNull().default(0),
  weightLbs: real("weight_lbs").notNull(),
  reps: integer("reps").notNull(),
  estimatedOneRm: real("estimated_1rm").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({ id: true, createdAt: true });
export const insertSessionPrSchema = createInsertSchema(sessionPrs).omit({ id: true, createdAt: true });

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type SessionPr = typeof sessionPrs.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
export type InsertSessionPr = z.infer<typeof insertSessionPrSchema>;
