import { boolean, date, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";
import { routines } from "./routines";
import { routineExerciseSchema } from "./routines";

export const scheduleSourceValues = ["routine", "ai_plan", "custom"] as const;
export const scheduleSourceSchema = z.enum(scheduleSourceValues);
export type ScheduleSource = z.infer<typeof scheduleSourceSchema>;

export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  title: text("title").notNull(),
  source: text("source", { enum: scheduleSourceValues }).notNull().default("custom"),
  routineId: uuid("routine_id").references(() => routines.id, { onDelete: "set null" }),
  exercises: jsonb("exercises").$type<z.infer<typeof routineExerciseSchema>[]>().notNull().default([]),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts, {
  source: scheduleSourceSchema,
  exercises: z.array(routineExerciseSchema).default([]),
}).omit({
  id: true,
  createdAt: true,
  completed: true,
});

export const createScheduledWorkoutSchema = insertScheduledWorkoutSchema.omit({ userId: true });

export type ScheduledWorkoutRow = typeof scheduledWorkouts.$inferSelect;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;
export type CreateScheduledWorkoutPayload = z.infer<typeof createScheduledWorkoutSchema>;
