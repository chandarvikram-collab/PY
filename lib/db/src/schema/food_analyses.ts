import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const foodAnalyses = pgTable("food_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  imageHash: text("image_hash").notNull(),
  status: text("status").notNull().default("processing"),
  result: jsonb("result").$type<{
    items?: Array<{
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    }>;
  } | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertFoodAnalysisSchema = createInsertSchema(foodAnalyses).omit({
  createdAt: true,
  completedAt: true,
});

export type FoodAnalysisRow = typeof foodAnalyses.$inferSelect;
export type InsertFoodAnalysis = z.infer<typeof insertFoodAnalysisSchema>;
