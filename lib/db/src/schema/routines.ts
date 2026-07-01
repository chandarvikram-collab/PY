import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const routineExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
  restSeconds: z.number().int().nonnegative().default(90),
});

export const aiRoutinePayloadSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(routineExerciseSchema).min(1),
});

export type RoutineExercise = z.infer<typeof routineExerciseSchema>;
export type AIRoutinePayload = z.infer<typeof aiRoutinePayloadSchema>;

export const routines = pgTable("routines", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  exercises: jsonb("exercises").$type<RoutineExercise[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRoutineSchema = createInsertSchema(routines).omit({
  createdAt: true,
});

export type RoutineRow = typeof routines.$inferSelect;
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
