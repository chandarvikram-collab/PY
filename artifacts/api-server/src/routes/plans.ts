import { Router } from "express";
import { aiRoutinePayloadSchema, type AIRoutinePayload } from "@workspace/db";
import { z } from "zod/v4";

const router = Router();

const generatePlanBodySchema = z.object({
  goal: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.array(z.string()).min(1),
  daysPerWeek: z.number().int().min(3).max(6),
});

type ExperienceLevel = z.infer<typeof generatePlanBodySchema>["level"];

type PlanExercise = {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  note?: string;
};

type PlanWorkout = {
  day: string;
  name: string;
  exercises: PlanExercise[];
};

type PlanWeek = {
  weekNumber: number;
  focus: string;
  workouts: PlanWorkout[];
};

type NutritionTargets = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

type GeneratedPlan = {
  goal: string;
  level: ExperienceLevel;
  equipment: string[];
  daysPerWeek: number;
  explanation: string;
  nutrition: NutritionTargets;
  equipment_strategy: string;
  weeks: PlanWeek[];
  ai_routine_payload: AIRoutinePayload;
};

const EXERCISE_EQUIPMENT: Record<string, string[]> = {
  "Barbell Bench Press": ["Barbell", "Bench"],
  "Dumbbell Incline Press": ["Dumbbell", "Bench"],
  "Overhead Press": ["Barbell", "Dumbbell"],
  "Lateral Raises": ["Dumbbell"],
  "Triceps Pushdown": ["Cable Machine"],
  "Push-Up": [],
  "Pike Push-Up": [],
  "Diamond Push-Up": [],
  "Archer Push-Up": [],

  "Barbell Deadlift": ["Barbell"],
  "Barbell Row": ["Barbell"],
  "Lat Pulldown": ["Cable Machine"],
  "Face Pull": ["Cable Machine", "Resistance Bands"],
  "Dumbbell Biceps Curl": ["Dumbbell"],
  "Pull-Up": ["Pull-Up Bar"],
  "Inverted Row": ["Pull-Up Bar"],
  "Chin-Up": ["Pull-Up Bar"],

  "Barbell Back Squat": ["Barbell", "Squat Rack"],
  "Romanian Deadlift": ["Barbell", "Dumbbell"],
  "Leg Press": ["Smith Machine"],
  "Leg Curl": ["Cable Machine"],
  "Calf Raises": [],
  "Squat": [],
  "Split Squat": [],
  "Bulgarian Split Squat": ["Bench"],
  "Glute Bridge": [],
  "Lunges": [],

  "Dumbbell Bench Press": ["Dumbbell", "Bench"],
  "Dumbbell Row": ["Dumbbell"],
  "Shoulder Press": ["Barbell", "Dumbbell"],
  "Biceps Curl": ["Dumbbell", "Resistance Bands"],
  "Triceps Extension": ["Cable Machine", "Dumbbell"],

  "Plank": [],
  "Dead Bug": [],
  "Hanging Leg Raise": ["Pull-Up Bar"],
  "Leg Raise": [],
};

function userCanDoExercise(name: string, equipment: string[]): boolean {
  const needs = EXERCISE_EQUIPMENT[name] ?? [];
  if (needs.length === 0) return true;
  const bodyweightOnly = equipment.length === 1 && equipment[0] === "None / Bodyweight";
  if (bodyweightOnly) return false;
  return needs.some((n) => equipment.includes(n));
}

function filterExercises(exercises: PlanExercise[], equipment: string[]): PlanExercise[] {
  const result: PlanExercise[] = [];
  for (const e of exercises) {
    if (userCanDoExercise(e.name, equipment)) {
      result.push(e);
    } else {
      // Try to find a bodyweight substitute
      const sub = findBodyweightSubstitute(e.name);
      if (sub) result.push({ ...e, name: sub, note: (e.note ? e.note + " — " : "") + "Bodyweight variation" });
    }
  }
  return result;
}

function findBodyweightSubstitute(name: string): string | null {
  const map: Record<string, string> = {
    "Barbell Bench Press": "Push-Up",
    "Dumbbell Incline Press": "Push-Up",
    "Dumbbell Bench Press": "Push-Up",
    "Overhead Press": "Pike Push-Up",
    "Shoulder Press": "Pike Push-Up",
    "Lateral Raises": "Pike Push-Up",
    "Triceps Pushdown": "Diamond Push-Up",
    "Triceps Extension": "Diamond Push-Up",
    "Barbell Deadlift": "Glute Bridge",
    "Barbell Row": "Inverted Row",
    "Dumbbell Row": "Inverted Row",
    "Lat Pulldown": "Pull-Up",
    "Face Pull": "Inverted Row",
    "Dumbbell Biceps Curl": "Chin-Up",
    "Biceps Curl": "Chin-Up",
    "Barbell Back Squat": "Squat",
    "Romanian Deadlift": "Glute Bridge",
    "Leg Press": "Lunges",
    "Leg Curl": "Glute Bridge",
    "Bulgarian Split Squat": "Split Squat",
    "Hanging Leg Raise": "Leg Raise",
  };
  return map[name] ?? null;
}

function buildSchedule(
  goal: string,
  level: ExperienceLevel,
  equipment: string[],
  daysPerWeek: number
): PlanWorkout[] {
  const pushPool: PlanExercise[] = [
    { name: "Barbell Bench Press", sets: 4, reps: goal === "Improve Strength" ? "4-6" : "8-10", rest: 120 },
    { name: "Dumbbell Bench Press", sets: 3, reps: "10-12", rest: 90 },
    { name: "Dumbbell Incline Press", sets: 3, reps: "10-12", rest: 90 },
    { name: "Overhead Press", sets: 3, reps: "8-10", rest: 90, note: "Focus on controlled eccentric" },
    { name: "Shoulder Press", sets: 3, reps: "10-12", rest: 90 },
    { name: "Lateral Raises", sets: 3, reps: "12-15", rest: 60 },
    { name: "Triceps Pushdown", sets: 3, reps: "12-15", rest: 60 },
    { name: "Triceps Extension", sets: 2, reps: "12-15", rest: 60 },
    { name: "Push-Up", sets: 4, reps: "Max", rest: 90 },
    { name: "Pike Push-Up", sets: 3, reps: "12-15", rest: 60 },
    { name: "Diamond Push-Up", sets: 3, reps: "10-12", rest: 60 },
    { name: "Archer Push-Up", sets: 3, reps: "8-10", rest: 60 },
  ];

  const pullPool: PlanExercise[] = [
    { name: "Barbell Deadlift", sets: 3, reps: goal === "Improve Strength" ? "3-5" : "6-8", rest: 180, note: "Warm up thoroughly" },
    { name: "Barbell Row", sets: 4, reps: "8-10", rest: 90 },
    { name: "Dumbbell Row", sets: 3, reps: "10-12", rest: 90 },
    { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: 90 },
    { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
    { name: "Dumbbell Biceps Curl", sets: 3, reps: "10-12", rest: 60 },
    { name: "Biceps Curl", sets: 2, reps: "12-15", rest: 60 },
    { name: "Pull-Up", sets: 4, reps: "Max", rest: 120 },
    { name: "Inverted Row", sets: 3, reps: "12-15", rest: 90 },
    { name: "Chin-Up", sets: 3, reps: "8-10", rest: 90 },
  ];

  const legPool: PlanExercise[] = [
    { name: "Barbell Back Squat", sets: 4, reps: goal === "Improve Strength" ? "3-5" : "6-8", rest: 180, note: "Prioritize depth and bracing" },
    { name: "Romanian Deadlift", sets: 3, reps: "10-12", rest: 90 },
    { name: "Leg Press", sets: 3, reps: "10-15", rest: 90 },
    { name: "Leg Curl", sets: 3, reps: "12-15", rest: 60 },
    { name: "Calf Raises", sets: 4, reps: "15-20", rest: 45 },
    { name: "Squat", sets: 4, reps: "15-20", rest: 90 },
    { name: "Bulgarian Split Squat", sets: 3, reps: "12 each", rest: 90 },
    { name: "Split Squat", sets: 3, reps: "12 each", rest: 90 },
    { name: "Glute Bridge", sets: 3, reps: "20", rest: 60 },
    { name: "Lunges", sets: 3, reps: "12 each", rest: 60 },
  ];

  const corePool: PlanExercise[] = [
    { name: "Plank", sets: 3, reps: "45-60s", rest: 60 },
    { name: "Dead Bug", sets: 3, reps: "10 each side", rest: 60 },
    { name: "Hanging Leg Raise", sets: 3, reps: "12-15", rest: 60 },
    { name: "Leg Raise", sets: 3, reps: "12-15", rest: 60 },
  ];

  const push = filterExercises(pushPool, equipment);
  const pull = filterExercises(pullPool, equipment);
  const legs = filterExercises(legPool, equipment);
  const core = filterExercises(corePool, equipment);

  // Fallback: if any group is empty, add at least one bodyweight exercise
  if (push.length === 0) push.push({ name: "Push-Up", sets: 4, reps: "Max", rest: 90 });
  if (pull.length === 0) pull.push({ name: "Inverted Row", sets: 3, reps: "12-15", rest: 90 });
  if (legs.length === 0) legs.push({ name: "Squat", sets: 4, reps: "15-20", rest: 90 });
  if (core.length === 0) core.push({ name: "Plank", sets: 3, reps: "45-60s", rest: 60 });

  if (daysPerWeek === 3) {
    return [
      { day: "Day 1", name: "Full Body A", exercises: [...push.slice(0, 2), ...pull.slice(0, 2), ...legs.slice(0, 2)] },
      { day: "Day 2", name: "Full Body B", exercises: [...push.slice(2, 4), ...pull.slice(2, 4), ...legs.slice(2, 4)] },
      { day: "Day 3", name: "Full Body C + Core", exercises: [...push.slice(0, 2), ...legs.slice(0, 2), ...core.slice(0, 2)] },
    ];
  } else if (daysPerWeek === 4) {
    const upper = [...push.slice(0, 3), ...pull.slice(0, 3)];
    return [
      { day: "Day 1", name: "Upper A", exercises: upper },
      { day: "Day 2", name: "Lower A", exercises: legs },
      { day: "Day 3", name: "Upper B", exercises: [...push.slice(0, 3), ...pull.slice(2, 5)] },
      { day: "Day 4", name: "Lower B + Core", exercises: [...legs.slice(2), ...core.slice(0, 2)] },
    ];
  } else if (daysPerWeek === 5) {
    return [
      { day: "Day 1", name: "Push", exercises: push },
      { day: "Day 2", name: "Pull", exercises: pull },
      { day: "Day 3", name: "Legs", exercises: legs },
      { day: "Day 4", name: "Upper + Arms", exercises: [...push.slice(0, 3), ...pull.slice(0, 3)] },
      { day: "Day 5", name: "Core + Conditioning", exercises: [...core, ...legs.slice(0, 2)] },
    ];
  }
  return [
    { day: "Day 1", name: "Push A", exercises: push },
    { day: "Day 2", name: "Pull A", exercises: pull },
    { day: "Day 3", name: "Legs A", exercises: legs },
    { day: "Day 4", name: "Push B", exercises: [...push.slice(1), ...push.slice(0, 1)] },
    { day: "Day 5", name: "Pull B + Core", exercises: [...pull.slice(1), ...core.slice(0, 2)] },
    { day: "Day 6", name: "Legs B", exercises: [...legs.slice(2), ...legs.slice(0, 2)] },
  ];
}

function generatePlan(
  goal: string,
  level: ExperienceLevel,
  equipment: string[],
  daysPerWeek: number
): GeneratedPlan {
  const explanations: Record<string, string> = {
    "Build Muscle": `Hypertrophy-focused ${daysPerWeek}x/week split targeting progressive overload with moderate rep ranges (8-12). Each muscle group is trained twice per week to maximize growth stimulus.`,
    "Lose Fat": `High-frequency ${daysPerWeek}x/week program combining strength training with minimal rest to maximize caloric burn and preserve muscle mass during a deficit.`,
    "Improve Strength": `Powerlifting-inspired ${daysPerWeek}x/week program centered on compound movements with heavy loads (3-6 reps) and sufficient recovery between sessions.`,
    "Improve Endurance": `Circuit-style ${daysPerWeek}x/week program with supersets, higher rep ranges (15-20), and shorter rest periods to build cardiovascular fitness alongside strength.`,
    "General Fitness": `Well-rounded ${daysPerWeek}x/week full-body program covering strength, mobility, and conditioning for overall health and longevity.`,
  };

  const baseNutrition: Record<string, NutritionTargets> = {
    "Build Muscle":      { dailyCalories: 2800, proteinG: 175, carbsG: 350, fatG: 80 },
    "Lose Fat":          { dailyCalories: 2000, proteinG: 160, carbsG: 200, fatG: 65 },
    "Improve Strength":  { dailyCalories: 2700, proteinG: 170, carbsG: 315, fatG: 78 },
    "Improve Endurance": { dailyCalories: 2500, proteinG: 140, carbsG: 325, fatG: 70 },
    "General Fitness":   { dailyCalories: 2300, proteinG: 150, carbsG: 270, fatG: 73 },
  };

  const levelCalorieAdj: Record<ExperienceLevel, number> = {
    beginner: -100,
    intermediate: 0,
    advanced: 200,
  };

  const baseNut = baseNutrition[goal] ?? baseNutrition["General Fitness"]!;
  const adj = levelCalorieAdj[level];
  const nutrition: NutritionTargets = {
    dailyCalories: baseNut.dailyCalories + adj,
    proteinG: baseNut.proteinG,
    carbsG: baseNut.carbsG,
    fatG: baseNut.fatG,
  };

  const equipmentStrategies: Record<string, Record<string, string>> = {
    barbell: {
      "Build Muscle": "Use barbell compounds (bench, squat, row) as primary movements. Progress weight weekly using linear periodization.",
      "Lose Fat": "Barbell complexes and circuit work keep heart rate elevated while maintaining strength.",
      "Improve Strength": "Barbell is your primary tool. Focus on squat, bench, and deadlift with systematic loading.",
      "Improve Endurance": "Use lighter barbell loads with higher reps and shorter rest to build muscular endurance.",
      "General Fitness": "Barbell compounds build a strong base; alternate with bodyweight work for balance.",
    },
    bodyweight: {
      "Build Muscle": "Progress through harder progressions (e.g., push-up → archer push-up → one-arm push-up) to create sufficient overload.",
      "Lose Fat": "High-rep bodyweight circuits with minimal rest maximize caloric burn without equipment.",
      "Improve Strength": "Master bodyweight fundamentals — planche progressions, pull-up progressions — to build relative strength.",
      "Improve Endurance": "Bodyweight circuits are ideal — combine push, pull, and lower body movements with little rest.",
      "General Fitness": "Bodyweight training is accessible and effective for all-around fitness. Focus on movement quality.",
    },
  };

  const hasBarbell = equipment.includes("Barbell");
  const equipKey = hasBarbell ? "barbell" : "bodyweight";
  const equipmentStrategy =
    (equipmentStrategies[equipKey]?.[goal] ?? equipmentStrategies["bodyweight"]!["General Fitness"]!) +
    (equipment.length > 1 ? ` Supplement with ${equipment.filter((e) => e !== (hasBarbell ? "Barbell" : "Bodyweight")).join(", ").toLowerCase()} for isolation work.` : "");

  const schedule = buildSchedule(goal, level, equipment, daysPerWeek);

  const weeks: PlanWeek[] = [
    { weekNumber: 1, focus: "Foundation — Learn the movements, focus on form", workouts: schedule.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets: Math.max(2, e.sets - 1) })) })) },
    { weekNumber: 2, focus: "Build — Add volume, track every set", workouts: schedule },
    { weekNumber: 3, focus: "Overload — Push slightly heavier each exercise", workouts: schedule.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, note: e.note ?? "Add 5-10 lbs from last week" })) })) },
    { weekNumber: 4, focus: "Deload — 60% intensity, active recovery", workouts: schedule.slice(0, Math.floor(schedule.length / 2)).map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets: 2, reps: "10 (light)", rest: e.rest })) })) },
  ];

  const primaryWorkout = schedule[0];
  const rawPayload = {
    name: primaryWorkout.name,
    exercises: primaryWorkout.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.rest,
    })),
  };

  const payloadResult = aiRoutinePayloadSchema.safeParse(rawPayload);
  if (!payloadResult.success) {
    throw new Error(`ai_routine_payload failed validation: ${JSON.stringify(payloadResult.error.issues)}`);
  }

  return {
    goal,
    level,
    equipment,
    daysPerWeek,
    explanation: explanations[goal] ?? explanations["General Fitness"]!,
    nutrition,
    equipment_strategy: equipmentStrategy,
    weeks,
    ai_routine_payload: payloadResult.data,
  };
}

router.post("/plans", async (req, res) => {
  const parsed = generatePlanBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }

  try {
    const { goal, level, equipment, daysPerWeek } = parsed.data;
    const plan = generatePlan(goal, level, equipment, daysPerWeek);
    req.log.info({ goal, level, daysPerWeek }, "AI plan generated");
    res.json(plan);
  } catch (err) {
    req.log.error({ err }, "plan generation failed");
    res.status(500).json({ error: "Plan generation failed" });
  }
});

export default router;
