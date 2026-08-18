import { z } from "zod";

export const foodSchema = z.object({
  date: z.string().min(1, "Required"),
  meal: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  calories: z.coerce.number().min(0, "Must be >= 0"),
  protein: z.coerce.number().min(0, "Must be >= 0"),
  carbs: z.coerce.number().min(0, "Must be >= 0"),
  fat: z.coerce.number().min(0, "Must be >= 0"),
  fiber: z.coerce.number().optional().nullable(),
  sugar: z.coerce.number().optional().nullable(),
  sodium: z.coerce.number().optional().nullable(),
});

export const workoutSchema = z.object({
  date: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  durationMinutes: z.coerce.number().min(1, "Required"),
  // Note: API expects durationSeconds, we'll convert before submitting
  exercises: z.array(
    z.object({
      name: z.string().min(1, "Exercise name required"),
      category: z.string().optional(),
      sets: z.array(
        z.object({
          weight: z.coerce.number().min(0),
          reps: z.coerce.number().min(1),
          restSeconds: z.coerce.number().optional(),
        })
      ),
    })
  ).default([]),
});

export const runSchema = z.object({
  date: z.string().min(1, "Required"),
  distanceKm: z.coerce.number().min(0.1, "Required"),
  durationMinutes: z.coerce.number().min(1, "Required"),
  avgPace: z.string().optional(), // Can be auto-calculated
  calories: z.coerce.number().optional().nullable(),
});
