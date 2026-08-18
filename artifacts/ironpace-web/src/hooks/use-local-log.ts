import { useMemo, useState } from "react";

export interface LocalFoodEntry {
  id: string;
  date: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface LocalWorkoutSession {
  id: string;
  name: string;
  date: string;
  durationSeconds: number;
  volumeKg: number;
  exerciseCount: number;
  pointsEarned: number;
}

export interface LocalRunSession {
  id: string;
  date: string;
  distanceKm: number;
  durationSeconds: number;
  avgPace: string;
  calories: number;
  pointsEarned: number;
}

const FOOD_KEY = "ironpace_food_log";
const WORKOUT_KEY = "ironpace_workout_log";
const RUN_KEY = "ironpace_run_log";

function readStorage<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

export function addLocalFoodEntry(entry: LocalFoodEntry): void {
  const existing = readStorage<LocalFoodEntry>(FOOD_KEY);
  localStorage.setItem(FOOD_KEY, JSON.stringify([entry, ...existing].slice(0, 200)));
}

export function addLocalWorkoutSession(session: LocalWorkoutSession): void {
  const existing = readStorage<LocalWorkoutSession>(WORKOUT_KEY);
  localStorage.setItem(WORKOUT_KEY, JSON.stringify([session, ...existing].slice(0, 50)));
}

export function addLocalRunSession(session: LocalRunSession): void {
  const existing = readStorage<LocalRunSession>(RUN_KEY);
  localStorage.setItem(RUN_KEY, JSON.stringify([session, ...existing].slice(0, 50)));
}

export function useLocalLog() {
  const [version, setVersion] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  const todayFoodLog = useMemo(
    () => readStorage<LocalFoodEntry>(FOOD_KEY).filter((e) => e.date === today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, today],
  );

  const recentWorkouts = useMemo(
    () => readStorage<LocalWorkoutSession>(WORKOUT_KEY).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const recentRuns = useMemo(
    () => readStorage<LocalRunSession>(RUN_KEY).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const refresh = () => setVersion((v) => v + 1);

  return { todayFoodLog, recentWorkouts, recentRuns, refresh };
}
