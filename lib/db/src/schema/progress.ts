import { pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const weightHistory = pgTable("weight_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  weightKg: real("weight_kg").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const progressPhotos = pgTable("progress_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  imageUrl: text("image_url"),
  weightKg: real("weight_kg").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertWeightHistorySchema = createInsertSchema(weightHistory).omit({ id: true, createdAt: true });
export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).omit({ id: true, createdAt: true });

export type WeightHistory = typeof weightHistory.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertWeightHistory = z.infer<typeof insertWeightHistorySchema>;
export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;
