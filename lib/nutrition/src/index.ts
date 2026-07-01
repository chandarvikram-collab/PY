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
