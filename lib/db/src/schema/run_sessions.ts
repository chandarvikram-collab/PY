import { integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const runSessions = pgTable("run_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("run"),
  date: text("date").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  distanceKm: real("distance_km").notNull().default(0),
  avgPace: text("avg_pace").notNull().default(""),
  bestPace: text("best_pace").notNull().default(""),
  calories: integer("calories").notNull().default(0),
  splitsJson: jsonb("splits_json").notNull().default([]),
  routeCoordsJson: jsonb("route_coords_json").notNull().default([]),
  pointsEarned: integer("points_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRunSessionSchema = createInsertSchema(runSessions).omit({
  createdAt: true,
});

export type RunSessionRow = typeof runSessions.$inferSelect;
export type InsertRunSession = z.infer<typeof insertRunSessionSchema>;
