import { sql } from "drizzle-orm";
import { integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  name: text("name").notNull().default("Athlete"),
  username: text("username").notNull().default("athlete"),
  imageUrl: text("image_url"),
  level: text("level").notNull().default("beginner"),
  streak: integer("streak").notNull().default(0),
  totalWorkouts: integer("total_workouts").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  calorieGoal: integer("calorie_goal").notNull().default(2000),
  proteinGoal: integer("protein_goal").notNull().default(150),
  carbGoal: integer("carb_goal"),
  fatGoal: integer("fat_goal"),
  biologicalSex: text("biological_sex"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  activityLevel: text("activity_level"),
  weeklyPaceLbs: integer("weekly_pace_lbs"),
  primaryGoal: text("primary_goal"),
  joinDate: text("join_date").notNull().default(""),
  bio: text("bio").notNull().default(""),
  goals: text("goals").array().notNull().default(sql`ARRAY[]::text[]`),
  equipment: text("equipment").array().notNull().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const profilePatchSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  streak: true,
  totalWorkouts: true,
  totalPoints: true,
}).partial();

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
