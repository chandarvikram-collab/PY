import { integer, jsonb, pgTable, real, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: text("date").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  volumeKg: real("volume_kg").notNull().default(0),
  exerciseCount: integer("exercise_count").notNull().default(0),
  exerciseLogJson: jsonb("exercise_log_json").notNull().default([]),
  pointsEarned: integer("points_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  createdAt: true,
});

export type WorkoutSessionRow = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
