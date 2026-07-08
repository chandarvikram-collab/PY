import { integer, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";
import { workoutSessions } from "./workout_sessions";

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

export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({
  id: true,
  createdAt: true,
});

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
