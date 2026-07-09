import type { Exercise } from "@/context/AppContext";

export const AVAILABLE_EXERCISES: Exercise[] = [
  { id: "ch-01", name: "Barbell Bench Press", category: "Chest", equipment: "Barbell", sets: 3, reps: 8, weight: 135, rest: 120 },
  { id: "ch-02", name: "Dumbbell Incline Press", category: "Chest", equipment: "Dumbbell", sets: 3, reps: 10, weight: 50, rest: 90 },
  { id: "bk-01", name: "Barbell Deadlift", category: "Back", equipment: "Barbell", sets: 3, reps: 5, weight: 225, rest: 180 },
  { id: "bk-08", name: "Lat Pulldown", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 100, rest: 90 },
  { id: "bk-10", name: "Seated Cable Row", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 90, rest: 90 },
  { id: "lg-01", name: "Barbell Back Squat", category: "Legs", equipment: "Barbell", sets: 4, reps: 6, weight: 185, rest: 180 },
  { id: "lg-03", name: "Romanian Deadlift", category: "Legs", equipment: "Barbell", sets: 3, reps: 8, weight: 155, rest: 120 },
  { id: "lg-11", name: "Leg Press", category: "Legs", equipment: "Machine", sets: 3, reps: 10, weight: 220, rest: 90 },
  { id: "sh-01", name: "Overhead Press", category: "Shoulders", equipment: "Barbell", sets: 3, reps: 8, weight: 95, rest: 120 },
  { id: "sh-04", name: "Dumbbell Lateral Raise", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 15, weight: 15, rest: 60 },
  { id: "am-01", name: "Barbell Biceps Curl", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 50, rest: 60 },
  { id: "am-13", name: "Cable Triceps Pushdown", category: "Arms", equipment: "Cable", sets: 3, reps: 12, weight: 50, rest: 60 },
  { id: "cr-01", name: "Plank", category: "Core", equipment: "Bodyweight", sets: 3, reps: 1, weight: 0, rest: 60 },
  { id: "cr-02", name: "Ab Crunch", category: "Core", equipment: "Bodyweight", sets: 3, reps: 20, weight: 0, rest: 45 },
];
