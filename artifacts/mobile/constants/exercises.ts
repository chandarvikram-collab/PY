import type { Exercise } from "@/context/AppContext";

export const AVAILABLE_EXERCISES: Exercise[] = [
  // ── Chest ──────────────────────────────────────────────────
  { id: "ch-01", name: "Barbell Bench Press", category: "Chest", equipment: "Barbell", sets: 3, reps: 8, weight: 135, rest: 120 },
  { id: "ch-02", name: "Dumbbell Incline Press", category: "Chest", equipment: "Dumbbell", sets: 3, reps: 10, weight: 50, rest: 90 },
  { id: "ch-03", name: "Dumbbell Flat Press", category: "Chest", equipment: "Dumbbell", sets: 3, reps: 10, weight: 55, rest: 90 },
  { id: "ch-04", name: "Incline Barbell Press", category: "Chest", equipment: "Barbell", sets: 3, reps: 8, weight: 115, rest: 120 },
  { id: "ch-05", name: "Cable Chest Fly", category: "Chest", equipment: "Cable", sets: 3, reps: 12, weight: 30, rest: 60 },
  { id: "ch-06", name: "Dumbbell Chest Fly", category: "Chest", equipment: "Dumbbell", sets: 3, reps: 12, weight: 35, rest: 60 },
  { id: "ch-07", name: "Push-Up", category: "Chest", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 60 },
  { id: "ch-08", name: "Decline Barbell Press", category: "Chest", equipment: "Barbell", sets: 3, reps: 8, weight: 145, rest: 120 },
  { id: "ch-09", name: "Machine Chest Press", category: "Chest", equipment: "Machine", sets: 3, reps: 10, weight: 110, rest: 90 },
  { id: "ch-10", name: "Dip (Chest)", category: "Chest", equipment: "Bodyweight", sets: 3, reps: 12, weight: 0, rest: 90 },
  { id: "ch-11", name: "Pec Deck Fly", category: "Chest", equipment: "Machine", sets: 3, reps: 12, weight: 80, rest: 60 },
  { id: "ch-12", name: "Cable Crossover", category: "Chest", equipment: "Cable", sets: 3, reps: 12, weight: 25, rest: 60 },

  // ── Back ───────────────────────────────────────────────────
  { id: "bk-01", name: "Barbell Deadlift", category: "Back", equipment: "Barbell", sets: 3, reps: 5, weight: 225, rest: 180 },
  { id: "bk-02", name: "Barbell Row", category: "Back", equipment: "Barbell", sets: 3, reps: 8, weight: 135, rest: 120 },
  { id: "bk-03", name: "Dumbbell Row", category: "Back", equipment: "Dumbbell", sets: 3, reps: 10, weight: 65, rest: 90 },
  { id: "bk-04", name: "Pull-Up", category: "Back", equipment: "Bodyweight", sets: 3, reps: 8, weight: 0, rest: 120 },
  { id: "bk-05", name: "Chin-Up", category: "Back", equipment: "Bodyweight", sets: 3, reps: 8, weight: 0, rest: 120 },
  { id: "bk-06", name: "T-Bar Row", category: "Back", equipment: "Barbell", sets: 3, reps: 8, weight: 90, rest: 120 },
  { id: "bk-07", name: "Cable Row (Close Grip)", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 110, rest: 90 },
  { id: "bk-08", name: "Lat Pulldown", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 100, rest: 90 },
  { id: "bk-09", name: "Straight-Arm Pulldown", category: "Back", equipment: "Cable", sets: 3, reps: 12, weight: 50, rest: 60 },
  { id: "bk-10", name: "Seated Cable Row", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 90, rest: 90 },
  { id: "bk-11", name: "Face Pull", category: "Back", equipment: "Cable", sets: 3, reps: 15, weight: 40, rest: 60 },
  { id: "bk-12", name: "Hyperextension", category: "Back", equipment: "Machine", sets: 3, reps: 12, weight: 0, rest: 60 },
  { id: "bk-13", name: "Machine Row", category: "Back", equipment: "Machine", sets: 3, reps: 10, weight: 120, rest: 90 },
  { id: "bk-14", name: "Rack Pull", category: "Back", equipment: "Barbell", sets: 3, reps: 6, weight: 275, rest: 180 },

  // ── Legs ───────────────────────────────────────────────────
  { id: "lg-01", name: "Barbell Back Squat", category: "Legs", equipment: "Barbell", sets: 4, reps: 6, weight: 185, rest: 180 },
  { id: "lg-02", name: "Barbell Front Squat", category: "Legs", equipment: "Barbell", sets: 3, reps: 6, weight: 155, rest: 180 },
  { id: "lg-03", name: "Romanian Deadlift", category: "Legs", equipment: "Barbell", sets: 3, reps: 8, weight: 155, rest: 120 },
  { id: "lg-04", name: "Bulgarian Split Squat", category: "Legs", equipment: "Dumbbell", sets: 3, reps: 10, weight: 40, rest: 90 },
  { id: "lg-05", name: "Dumbbell Lunge", category: "Legs", equipment: "Dumbbell", sets: 3, reps: 12, weight: 35, rest: 90 },
  { id: "lg-06", name: "Goblet Squat", category: "Legs", equipment: "Dumbbell", sets: 3, reps: 12, weight: 50, rest: 90 },
  { id: "lg-07", name: "Hip Thrust", category: "Legs", equipment: "Barbell", sets: 3, reps: 10, weight: 135, rest: 90 },
  { id: "lg-08", name: "Leg Curl (Lying)", category: "Legs", equipment: "Machine", sets: 3, reps: 10, weight: 80, rest: 60 },
  { id: "lg-09", name: "Leg Extension", category: "Legs", equipment: "Machine", sets: 3, reps: 12, weight: 90, rest: 60 },
  { id: "lg-10", name: "Hack Squat", category: "Legs", equipment: "Machine", sets: 3, reps: 8, weight: 180, rest: 120 },
  { id: "lg-11", name: "Leg Press", category: "Legs", equipment: "Machine", sets: 3, reps: 10, weight: 220, rest: 90 },
  { id: "lg-12", name: "Calf Raise (Standing)", category: "Legs", equipment: "Machine", sets: 3, reps: 15, weight: 100, rest: 45 },
  { id: "lg-13", name: "Calf Raise (Seated)", category: "Legs", equipment: "Machine", sets: 3, reps: 15, weight: 60, rest: 45 },
  { id: "lg-14", name: "Step-Up", category: "Legs", equipment: "Dumbbell", sets: 3, reps: 10, weight: 30, rest: 60 },
  { id: "lg-15", name: "Sumo Squat", category: "Legs", equipment: "Dumbbell", sets: 3, reps: 12, weight: 55, rest: 90 },

  // ── Shoulders ──────────────────────────────────────────────
  { id: "sh-01", name: "Overhead Press", category: "Shoulders", equipment: "Barbell", sets: 3, reps: 8, weight: 95, rest: 120 },
  { id: "sh-02", name: "Dumbbell Shoulder Press", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 10, weight: 40, rest: 90 },
  { id: "sh-03", name: "Arnold Press", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 10, weight: 35, rest: 90 },
  { id: "sh-04", name: "Dumbbell Lateral Raise", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 15, weight: 15, rest: 60 },
  { id: "sh-05", name: "Cable Lateral Raise", category: "Shoulders", equipment: "Cable", sets: 3, reps: 15, weight: 12, rest: 60 },
  { id: "sh-06", name: "Dumbbell Front Raise", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 12, weight: 20, rest: 60 },
  { id: "sh-07", name: "Reverse Pec Deck Fly", category: "Shoulders", equipment: "Machine", sets: 3, reps: 15, weight: 60, rest: 60 },
  { id: "sh-08", name: "Dumbbell Rear Delt Fly", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 15, weight: 15, rest: 60 },
  { id: "sh-09", name: "Machine Shoulder Press", category: "Shoulders", equipment: "Machine", sets: 3, reps: 10, weight: 90, rest: 90 },
  { id: "sh-10", name: "Upright Row", category: "Shoulders", equipment: "Barbell", sets: 3, reps: 10, weight: 65, rest: 60 },

  // ── Arms ───────────────────────────────────────────────────
  { id: "am-01", name: "Barbell Biceps Curl", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 50, rest: 60 },
  { id: "am-02", name: "Dumbbell Biceps Curl", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 10, weight: 25, rest: 60 },
  { id: "am-03", name: "Hammer Curl", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 10, weight: 25, rest: 60 },
  { id: "am-04", name: "Incline Dumbbell Curl", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 12, weight: 20, rest: 60 },
  { id: "am-05", name: "EZ-Bar Curl", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 55, rest: 60 },
  { id: "am-06", name: "Preacher Curl", category: "Arms", equipment: "Machine", sets: 3, reps: 12, weight: 60, rest: 60 },
  { id: "am-07", name: "Cable Biceps Curl", category: "Arms", equipment: "Cable", sets: 3, reps: 12, weight: 40, rest: 60 },
  { id: "am-08", name: "Concentration Curl", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 12, weight: 20, rest: 60 },
  { id: "am-09", name: "Skull Crusher", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 65, rest: 60 },
  { id: "am-10", name: "Dumbbell Triceps Kickback", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 12, weight: 20, rest: 60 },
  { id: "am-11", name: "Triceps Overhead Extension", category: "Arms", equipment: "Dumbbell", sets: 3, reps: 12, weight: 30, rest: 60 },
  { id: "am-12", name: "Dip (Triceps)", category: "Arms", equipment: "Bodyweight", sets: 3, reps: 12, weight: 0, rest: 60 },
  { id: "am-13", name: "Cable Triceps Pushdown", category: "Arms", equipment: "Cable", sets: 3, reps: 12, weight: 50, rest: 60 },
  { id: "am-14", name: "Rope Pushdown", category: "Arms", equipment: "Cable", sets: 3, reps: 15, weight: 40, rest: 60 },
  { id: "am-15", name: "Close-Grip Bench Press", category: "Arms", equipment: "Barbell", sets: 3, reps: 8, weight: 95, rest: 90 },

  // ── Core ───────────────────────────────────────────────────
  { id: "cr-01", name: "Plank", category: "Core", equipment: "Bodyweight", sets: 3, reps: 1, weight: 0, rest: 60 },
  { id: "cr-02", name: "Ab Crunch", category: "Core", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 45 },
  { id: "cr-03", name: "Cable Crunch", category: "Core", equipment: "Cable", sets: 3, reps: 15, weight: 60, rest: 60 },
  { id: "cr-04", name: "Hanging Leg Raise", category: "Core", equipment: "Bodyweight", sets: 3, reps: 12, weight: 0, rest: 60 },
  { id: "cr-05", name: "Russian Twist", category: "Core", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 45 },
  { id: "cr-06", name: "Bicycle Crunch", category: "Core", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 45 },
  { id: "cr-07", name: "Dead Bug", category: "Core", equipment: "Bodyweight", sets: 3, reps: 10, weight: 0, rest: 60 },
  { id: "cr-08", name: "Decline Sit-Up", category: "Core", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 45 },
  { id: "cr-09", name: "Ab Wheel Rollout", category: "Core", equipment: "Bodyweight", sets: 3, reps: 10, weight: 0, rest: 60 },
  { id: "cr-10", name: "Side Plank", category: "Core", equipment: "Bodyweight", sets: 3, reps: 1, weight: 0, rest: 45 },
];

export const EXERCISE_CATEGORIES = [
  "All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core",
] as const;

export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number];
