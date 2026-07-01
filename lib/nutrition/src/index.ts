/**
 * Mifflin-St Jeor TDEE and macro calculator.
 *
 * Pure function — no side effects, deterministic output for a given input.
 * Can be called from both server and client.
 */

export type BiologicalSex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type NutritionGoal = "lose_fat" | "maintain" | "build_muscle" | "improve_endurance";

export type NutritionProfile = {
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: ActivityLevel;
  primaryGoal: NutritionGoal;
  weeklyPaceLbs?: number; // lbs per week (loss/gain pace)
};

export type NutritionResult = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/**
 * Calculate BMR using Mifflin-St Jeor equation.
 */
function calculateBMR(sex: BiologicalSex, weightKg: number, heightCm: number, age: number): number {
  if (sex === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * Calculate TDEE from BMR and activity level.
 */
function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Apply goal adjustment to TDEE.
 */
function applyGoalAdjustment(tdee: number, goal: NutritionGoal, weeklyPaceLbs?: number): number {
  // 1 lb fat ≈ 3500 kcal deficit/surplus per week
  const weeklyKcal = (weeklyPaceLbs ?? 1) * 3500;
  const dailyAdjustment = Math.round(weeklyKcal / 7);

  switch (goal) {
    case "lose_fat":
      return Math.max(1200, tdee - dailyAdjustment);
    case "build_muscle":
      return tdee + dailyAdjustment;
    case "improve_endurance":
      // Slight surplus for fuel, less aggressive than muscle gain
      return tdee + Math.round(dailyAdjustment * 0.5);
    case "maintain":
    default:
      return tdee;
  }
}

/**
 * Calculate macros from daily calories.
 * - Protein: 2.0 g per kg bodyweight
 * - Fat: 25% of total calories
 * - Carbs: remainder of calories
 */
function calculateMacros(dailyCalories: number, weightKg: number): { proteinG: number; carbsG: number; fatG: number } {
  const proteinG = Math.round(weightKg * 2.0);
  const proteinKcal = proteinG * 4;

  const fatKcal = Math.round(dailyCalories * 0.25);
  const fatG = Math.round(fatKcal / 9);

  const carbKcal = dailyCalories - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(carbKcal / 4));

  return { proteinG, carbsG, fatG };
}

/**
 * Main entry point. Given a nutrition profile, returns calorie and macro targets.
 */
export function calculateNutrition(profile: NutritionProfile): NutritionResult {
  const bmr = calculateBMR(profile.biologicalSex, profile.weightKg, profile.heightCm, profile.age);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const dailyCalories = applyGoalAdjustment(tdee, profile.primaryGoal, profile.weeklyPaceLbs);
  const { proteinG, carbsG, fatG } = calculateMacros(dailyCalories, profile.weightKg);

  return {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
  };
}

/* ── MET-based run calorie calculator ───────────────────────────────────── */

const MET_TABLE = [
  { paceMinPerKm: 10.0, met: 4.0 },   // 10:00/km walking
  { paceMinPerKm: 7.5, met: 6.0 },   // 7:30/km slow jog
  { paceMinPerKm: 6.0, met: 8.0 },   // 6:00/km easy run
  { paceMinPerKm: 5.0, met: 10.0 },  // 5:00/km moderate run
  { paceMinPerKm: 4.0, met: 12.0 },  // 4:00/km fast run
  { paceMinPerKm: 3.0, met: 14.0 },  // 3:00/km sprint
];

function parsePace(avgPace: string): number {
  const [minStr, secStr] = avgPace.split(":");
  const mins = parseInt(minStr || "0", 10);
  const secs = parseInt(secStr || "0", 10);
  return mins + secs / 60;
}

function lookupMET(paceMinPerKm: number): number {
  const table = MET_TABLE;
  if (paceMinPerKm >= table[0].paceMinPerKm) return table[0].met;
  if (paceMinPerKm <= table[table.length - 1].paceMinPerKm) return table[table.length - 1].met;
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (paceMinPerKm <= a.paceMinPerKm && paceMinPerKm >= b.paceMinPerKm) {
      const t = (a.paceMinPerKm - paceMinPerKm) / (a.paceMinPerKm - b.paceMinPerKm);
      return a.met + t * (b.met - a.met);
    }
  }
  return table[0].met;
}

/**
 * Calculate calories burned during a run using the MET formula.
 *
 * calories = (MET x 3.5 x weight_kg / 200) x duration_minutes
 *
 * MET is derived from average pace, which is computed internally from
 * distance and duration. Falls back to a moderate MET of 8.0 when
 * pace cannot be determined (zero distance or duration).
 */
export function calcRunCalories(
  distanceKm: number,
  durationSeconds: number,
  weightKg: number,
): number {
  const durationMinutes = durationSeconds / 60;
  if (distanceKm <= 0 || durationMinutes <= 0) return 0;

  const paceMinPerKm = durationMinutes / distanceKm;
  const met = lookupMET(paceMinPerKm);
  const calories = (met * 3.5 * weightKg / 200) * durationMinutes;
  return Math.round(calories);
}
