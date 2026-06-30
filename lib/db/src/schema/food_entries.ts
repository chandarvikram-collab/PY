import { integer, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const foodEntries = pgTable("food_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  meal: text("meal").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber"),
  sugar: real("sugar"),
  sodium: real("sodium"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({
  loggedAt: true,
});

export type FoodEntryRow = typeof foodEntries.$inferSelect;
export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
