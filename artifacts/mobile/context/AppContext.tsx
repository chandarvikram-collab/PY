import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@clerk/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState as RNAppState } from "react-native";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type UserProfile = {
  id: string;
  name: string;
  username: string;
  level: ExperienceLevel;
  streak: number;
  totalWorkouts: number;
  totalPoints: number;
  joinDate: string;
  bio: string;
  goals: string[];
  equipment: string[];
  hasCompletedOnboarding: boolean;
  aiPlan: AIPlan | null;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal?: number;
  fatGoal?: number;
};

export type AIPlan = {
  goal: string;
  level: ExperienceLevel;
  equipment: string[];
  daysPerWeek: number;
  summary: string;
  weeks: AIPlanWeek[];
};

export type AIPlanWeek = {
  weekNumber: number;
  focus: string;
  workouts: AIPlanWorkout[];
};

export type AIPlanWorkout = {
  day: string;
  name: string;
  exercises: AIPlanExercise[];
};

export type AIPlanExercise = {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  note?: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: string;
  equipment: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
};

export type Routine = {
  id: string;
  name: string;
  exercises: Exercise[];
};

export type SetLog = {
  weight: number;
  reps: number;
};

export type ExerciseLog = {
  name: string;
  category: string;
  sets: SetLog[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  date: string;
  duration: number;
  volume: number;
  exercises: number;
  exerciseLog: ExerciseLog[];
};

export type RunSplit = {
  km: number;
  pace: string;
  elapsed: number;
};

export type RunSession = {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: string;
  bestPace: string;
  calories: number;
  splits: RunSplit[];
  routeCoords?: Array<{ lat: number; lng: number }>;
};

export type FoodEntry = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: number;
  servingUnit?: string;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  time: string;
};

export type MealTemplateEntry = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  meal: "breakfast" | "lunch" | "dinner" | "snack";
};

export type MealTemplate = {
  id: string;
  name: string;
  createdAt: string;
  entries: MealTemplateEntry[];
};

export type DayCalories = {
  date: string;
  goal: number;
  entries: FoodEntry[];
  water: number;
};

export type WeeklyNutrition = {
  date: string;
  consumed: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  goal: number;
};

export type Friend = {
  id: string;
  name: string;
  username: string;
  initials: string;
  color: string;
  streak: number;
  weeklyWorkouts: number;
  rank: number;
  totalPoints: number;
  isOnline: boolean;
};

export type ChallengeParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  progress: number;
  target: number;
};

export type Challenge = {
  id: string;
  type: "steps" | "distance" | "lifting" | "streak";
  title: string;
  description: string;
  fromId: string | null;
  fromName: string | null;
  participants: ChallengeParticipant[];
  myProgress: number;
  target: number;
  unit: string;
  deadline: string;
  status: "active" | "completed" | "pending";
  createdAt: string;
};

export type Post = {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  type: "workout" | "achievement" | "milestone" | "challenge";
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
  time: string;
  stats?: Record<string, string>;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  time: string;
};

export type ChatThread = {
  id: string;
  friendId: string;
  friendName: string;
  friendInitials: string;
  friendColor: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
  isOnline: boolean;
};

type AppState = {
  userProfile: UserProfile;
  routines: Routine[];
  workoutHistory: WorkoutSession[];
  calorieLog: DayCalories[];
  friends: Friend[];
  challenges: Challenge[];
  posts: Post[];
  chatThreads: ChatThread[];
  runHistory: RunSession[];
  mealTemplates: MealTemplate[];
};

type AppContextType = {
  state: AppState;
  resetForAuthUser: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  saveAIPlan: (plan: AIPlan) => void;
  addWorkoutSession: (session: WorkoutSession) => void;
  addFoodEntry: (date: string, entry: FoodEntry) => void;
  removeFoodEntry: (date: string, entryId: string) => void;
  updateFoodEntry: (date: string, entryId: string, updates: Pick<FoodEntry, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium">) => void;
  updateWater: (date: string, cups: number) => void;
  likePost: (postId: string) => void;
  addPost: (post: Post) => void;
  sendChallenge: (challenge: Challenge) => void;
  acceptChallenge: (challengeId: string) => void;
  updateChallengeProgress: (challengeId: string, progress: number) => void;
  sendMessage: (threadId: string, text: string) => void;
  markThreadRead: (threadId: string) => void;
  getTodayCalories: () => DayCalories;
  getWeeklyNutrition: () => WeeklyNutrition[];
  addRoutine: (routine: Routine) => void;
  addRunSession: (session: RunSession) => void;
  saveMealTemplate: (name: string, entries: FoodEntry[]) => void;
  deleteMealTemplate: (templateId: string) => void;
  loadMealTemplate: (date: string, templateId: string, targetMeal: FoodEntry["meal"]) => void;
};

const ME_ID = "me";
const STORAGE_KEY = "ironpace_v1";
const API_USER_ID_KEY = "ironpace_api_user_id";
const PENDING_KEY = "ironpace_pending_sync";
const SEED_FOOD_IDS = new Set(["fe1", "fe2", "fe3"]);

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const AVATAR_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6"];

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type PendingItem = {
  uid: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: string;
  retryCount: number;
  lastAttemptAt: number;
};

type ServerUserPartial = { totalPoints: number; totalWorkouts: number; streak: number };

type ServerUser = {
  id: string;
  name: string;
  username: string;
  bio: string;
  level: string;
  joinDate: string;
  calorieGoal: number;
  proteinGoal: number;
  totalPoints: number;
  totalWorkouts: number;
  streak: number;
};

let _queueChain: Promise<void> = Promise.resolve();
let _isDraining = false;
let _drainTimer: ReturnType<typeof setTimeout> | null = null;
const DRAIN_DEBOUNCE_MS = 500;
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

function backoffMs(retryCount: number): number {
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, retryCount), MAX_BACKOFF_MS);
}

function _mutateQueue(fn: (q: PendingItem[]) => PendingItem[]): void {
  _queueChain = _queueChain.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_KEY);
      const queue: PendingItem[] = raw ? (JSON.parse(raw) as PendingItem[]) : [];
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(fn(queue)));
    } catch {}
  });
}

function addToQueue(item: PendingItem): void {
  _mutateQueue((q) => [...q, item]);
}

function removeFromQueue(uid: string): void {
  _mutateQueue((q) => q.filter((x) => x.uid !== uid));
}

function queueAndFire(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): void {
  const item: PendingItem = {
    uid: generateUUID(),
    method,
    path,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    retryCount: 0,
    lastAttemptAt: Date.now(),
  };
  addToQueue(item);

  const headers: Record<string, string> = item.body ? { "Content-Type": "application/json" } : {};
  fetch(`${API_BASE}/api${path}`, { method, headers, body: item.body })
    .then((r) => {
      if (r.ok || (r.status >= 400 && r.status < 500)) {
        removeFromQueue(item.uid);
      }
    })
    .catch(() => {});
}

function fireSession(
  path: "/sessions/workout" | "/sessions/run",
  body: unknown,
  onUser: (user: ServerUserPartial) => void,
): void {
  const uid = generateUUID();
  const bodyStr = JSON.stringify(body);
  addToQueue({ uid, method: "POST", path, body: bodyStr, retryCount: 0, lastAttemptAt: Date.now() });

  fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: bodyStr,
  })
    .then(async (r) => {
      if (r.status >= 400 && r.status < 500) {
        removeFromQueue(uid);
        return;
      }
      if (!r.ok) return;
      removeFromQueue(uid);
      const json = (await r.json()) as { session?: unknown; user?: ServerUserPartial; duplicate?: boolean };
      if (json.user) onUser(json.user);
    })
    .catch(() => {});
}

async function drainPendingQueue(): Promise<void> {
  if (_isDraining) return;
  _isDraining = true;
  try {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let queue: PendingItem[] = [];
    try {
      queue = JSON.parse(raw) as PendingItem[];
    } catch {
      return;
    }
    if (!queue.length) return;

    const seen = new Map<string, PendingItem>();
    for (const item of queue) {
      seen.set(item.uid, item);
    }
    queue = Array.from(seen.values());

    const now = Date.now();
    const updatedItems = new Map<string, PendingItem>();
    const removedUids = new Set<string>();

    await Promise.allSettled(
      queue.map(async (item) => {
        const elapsed = now - (item.lastAttemptAt ?? 0);
        const due = elapsed >= backoffMs(item.retryCount ?? 0);
        if (!due) return;

        try {
          const headers: Record<string, string> = item.body ? { "Content-Type": "application/json" } : {};
          const r = await fetch(`${API_BASE}/api${item.path}`, {
            method: item.method,
            headers,
            body: item.body,
          });

          if (r.ok) {
            removedUids.add(item.uid);
          } else if (r.status >= 400 && r.status < 500) {
            removedUids.add(item.uid);
          } else {
            const nextRetryCount = (item.retryCount ?? 0) + 1;
            if (nextRetryCount >= MAX_RETRIES) {
              removedUids.add(item.uid);
            } else {
              updatedItems.set(item.uid, {
                ...item,
                retryCount: nextRetryCount,
                lastAttemptAt: Date.now(),
              });
            }
          }
        } catch {
          const nextRetryCount = (item.retryCount ?? 0) + 1;
          if (nextRetryCount >= MAX_RETRIES) {
            removedUids.add(item.uid);
          } else {
            updatedItems.set(item.uid, {
              ...item,
              retryCount: nextRetryCount,
              lastAttemptAt: Date.now(),
            });
          }
        }
      }),
    );

    if (removedUids.size > 0 || updatedItems.size > 0) {
      const next = queue
        .filter((q) => !removedUids.has(q.uid))
        .map((q) => updatedItems.get(q.uid) ?? q);
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next)).catch(() => {});
    }
  } finally {
    _isDraining = false;
  }
}

function scheduleDrain(): void {
  if (_drainTimer !== null) {
    clearTimeout(_drainTimer);
  }
  _drainTimer = setTimeout(() => {
    _drainTimer = null;
    drainPendingQueue().catch(() => {});
  }, DRAIN_DEBOUNCE_MS);
}

const SEED_FRIENDS: Friend[] = [
  { id: "f1", name: "Marcus Chen", username: "mchen_lifts", initials: "MC", color: "#3b82f6", streak: 14, weeklyWorkouts: 5, rank: 1, totalPoints: 4820, isOnline: true },
  { id: "f2", name: "Sofia Reyes", username: "sofia_runs", initials: "SR", color: "#8b5cf6", streak: 9, weeklyWorkouts: 4, rank: 2, totalPoints: 3940, isOnline: false },
  { id: "f3", name: "Jake Williams", username: "jwilliams_fit", initials: "JW", color: "#f59e0b", streak: 21, weeklyWorkouts: 6, rank: 3, totalPoints: 3210, isOnline: true },
  { id: "f4", name: "Priya Patel", username: "priya_active", initials: "PP", color: "#22c55e", streak: 5, weeklyWorkouts: 3, rank: 5, totalPoints: 2150, isOnline: false },
];

const SEED_CHALLENGES: Challenge[] = [
  {
    id: "c1", type: "steps", title: "10K Steps Daily", description: "Hit 10,000 steps every day for a week",
    fromId: "f1", fromName: "Marcus Chen",
    participants: [
      { id: ME_ID, name: "You", initials: "ME", color: "#E8151B", progress: 8420, target: 10000 },
      { id: "f1", name: "Marcus", initials: "MC", color: "#3b82f6", progress: 9800, target: 10000 },
    ],
    myProgress: 8420, target: 10000, unit: "steps", deadline: "2026-06-28", status: "active", createdAt: "2026-06-21",
  },
  {
    id: "c2", type: "lifting", title: "Bench Press PR", description: "Hit a new bench press max this week",
    fromId: "f3", fromName: "Jake Williams",
    participants: [
      { id: ME_ID, name: "You", initials: "ME", color: "#E8151B", progress: 185, target: 225 },
      { id: "f3", name: "Jake", initials: "JW", color: "#f59e0b", progress: 210, target: 225 },
    ],
    myProgress: 185, target: 225, unit: "lbs", deadline: "2026-06-30", status: "active", createdAt: "2026-06-20",
  },
  {
    id: "c3", type: "distance", title: "30km Run Week", description: "Run 30km total this week",
    fromId: "f2", fromName: "Sofia Reyes",
    participants: [
      { id: ME_ID, name: "You", initials: "ME", color: "#E8151B", progress: 19.2, target: 30 },
      { id: "f2", name: "Sofia", initials: "SR", color: "#8b5cf6", progress: 24.5, target: 30 },
    ],
    myProgress: 19.2, target: 30, unit: "km", deadline: "2026-06-27", status: "active", createdAt: "2026-06-22",
  },
  {
    id: "c4", type: "streak", title: "7-Day Streak", description: "Train every day for 7 days straight",
    fromId: null, fromName: null,
    participants: [{ id: ME_ID, name: "You", initials: "ME", color: "#E8151B", progress: 5, target: 7 }],
    myProgress: 5, target: 7, unit: "days", deadline: "2026-06-26", status: "active", createdAt: "2026-06-19",
  },
];

const SEED_POSTS: Post[] = [
  { id: "p1", userId: "f1", userName: "Marcus Chen", userInitials: "MC", userColor: "#3b82f6", type: "workout", content: "Push day DONE. Hit a new bench PR at 245lbs. The grind never stops.", likes: 24, comments: 5, liked: false, time: "2h ago", stats: { Volume: "18,400 lbs", Sets: "12", Duration: "58 min" } },
  { id: "p2", userId: "f2", userName: "Sofia Reyes", userInitials: "SR", userColor: "#8b5cf6", type: "milestone", content: "Just crossed 500km run total for the year. Consistency is everything.", likes: 41, comments: 8, liked: true, time: "4h ago", stats: { Distance: "10.2 km", Pace: "5:18 /km", Calories: "612" } },
  { id: "p3", userId: "f3", userName: "Jake Williams", userInitials: "JW", userColor: "#f59e0b", type: "achievement", content: "21 day workout streak achieved. Body is adapting, mind is locked in.", likes: 33, comments: 12, liked: false, time: "6h ago", stats: { Streak: "21 days", Workouts: "21", "Best Lift": "Squat 315 lbs" } },
  { id: "p4", userId: "f4", userName: "Priya Patel", userInitials: "PP", userColor: "#22c55e", type: "workout", content: "Leg day is a sacred ritual. Squats, RDLs, lunges. Full send every time.", likes: 18, comments: 3, liked: false, time: "1d ago", stats: { Volume: "12,800 lbs", Sets: "10", Duration: "52 min" } },
  { id: "p5", userId: "f1", userName: "Marcus Chen", userInitials: "MC", userColor: "#3b82f6", type: "challenge", content: "Just sent a 10K steps challenge to the crew. Who is stepping up?", likes: 9, comments: 6, liked: false, time: "1d ago", stats: {} },
];

const SEED_CHAT_THREADS: ChatThread[] = [
  { id: "t1", friendId: "f1", friendName: "Marcus Chen", friendInitials: "MC", friendColor: "#3b82f6", lastMessage: "You in for legs tomorrow?", lastTime: "2h ago", unread: 1, isOnline: true, messages: [{ id: "m1", senderId: "f1", text: "Bro that PR was insane", time: "Yesterday 8:22 PM" }, { id: "m2", senderId: ME_ID, text: "Thanks man, been grinding for it", time: "Yesterday 8:25 PM" }, { id: "m3", senderId: "f1", text: "You in for legs tomorrow?", time: "2h ago" }] },
  { id: "t2", friendId: "f2", friendName: "Sofia Reyes", friendInitials: "SR", friendColor: "#8b5cf6", lastMessage: "The 6am club is calling", lastTime: "5h ago", unread: 0, isOnline: false, messages: [{ id: "m4", senderId: "f2", text: "Morning run at 6?", time: "Yesterday 9:10 PM" }, { id: "m5", senderId: ME_ID, text: "I will try my best", time: "Yesterday 9:12 PM" }, { id: "m6", senderId: "f2", text: "The 6am club is calling", time: "5h ago" }] },
  { id: "t3", friendId: "f3", friendName: "Jake Williams", friendInitials: "JW", friendColor: "#f59e0b", lastMessage: "GG on the challenge!", lastTime: "1d ago", unread: 0, isOnline: true, messages: [{ id: "m7", senderId: ME_ID, text: "Challenge accepted Jake", time: "1d ago" }, { id: "m8", senderId: "f3", text: "GG on the challenge!", time: "1d ago" }] },
];

const SEED_RUN_HISTORY: RunSession[] = [
  { id: "rh1", date: "2026-06-23", distance: 8.2, duration: 2640, avgPace: "5:22", bestPace: "4:58", calories: 533, splits: [{ km: 1, pace: "5:41", elapsed: 341 }, { km: 2, pace: "5:28", elapsed: 669 }, { km: 3, pace: "5:15", elapsed: 984 }, { km: 4, pace: "5:10", elapsed: 1294 }, { km: 5, pace: "5:18", elapsed: 1612 }, { km: 6, pace: "5:22", elapsed: 1934 }, { km: 7, pace: "5:30", elapsed: 2264 }, { km: 8, pace: "4:58", elapsed: 2562 }] },
  { id: "rh2", date: "2026-06-20", distance: 5.1, duration: 1710, avgPace: "5:35", bestPace: "5:12", calories: 332, splits: [{ km: 1, pace: "5:48", elapsed: 348 }, { km: 2, pace: "5:35", elapsed: 683 }, { km: 3, pace: "5:28", elapsed: 1011 }, { km: 4, pace: "5:22", elapsed: 1333 }, { km: 5, pace: "5:12", elapsed: 1645 }] },
  { id: "rh3", date: "2026-06-17", distance: 10.0, duration: 3300, avgPace: "5:30", bestPace: "5:05", calories: 650, splits: [{ km: 1, pace: "5:52", elapsed: 352 }, { km: 2, pace: "5:40", elapsed: 692 }, { km: 3, pace: "5:32", elapsed: 1024 }, { km: 4, pace: "5:25", elapsed: 1349 }, { km: 5, pace: "5:20", elapsed: 1669 }, { km: 6, pace: "5:25", elapsed: 1994 }, { km: 7, pace: "5:28", elapsed: 2322 }, { km: 8, pace: "5:15", elapsed: 2637 }, { km: 9, pace: "5:18", elapsed: 2955 }, { km: 10, pace: "5:05", elapsed: 3260 }] },
];

const SEED_ROUTINES: Routine[] = [
  { id: "r1", name: "Push Day", exercises: [{ id: "ch-01", name: "Barbell Bench Press", category: "Chest", equipment: "Barbell", sets: 4, reps: 8, weight: 135, rest: 120 }, { id: "sh-04", name: "Dumbbell Lateral Raise", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 15, weight: 15, rest: 60 }, { id: "am-13", name: "Cable Triceps Pushdown", category: "Arms", equipment: "Cable", sets: 3, reps: 12, weight: 50, rest: 60 }, { id: "sh-01", name: "Overhead Press", category: "Shoulders", equipment: "Barbell", sets: 3, reps: 8, weight: 95, rest: 120 }] },
  { id: "r2", name: "Pull Day", exercises: [{ id: "bk-01", name: "Barbell Deadlift", category: "Back", equipment: "Barbell", sets: 3, reps: 5, weight: 225, rest: 180 }, { id: "bk-08", name: "Lat Pulldown", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 100, rest: 90 }, { id: "am-01", name: "Barbell Biceps Curl", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 50, rest: 60 }, { id: "bk-10", name: "Seated Cable Row", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 90, rest: 90 }] },
  { id: "r3", name: "Leg Day", exercises: [{ id: "lg-01", name: "Barbell Back Squat", category: "Legs", equipment: "Barbell", sets: 4, reps: 6, weight: 180, rest: 180 }, { id: "lg-03", name: "Romanian Deadlift", category: "Legs", equipment: "Barbell", sets: 3, reps: 8, weight: 155, rest: 120 }, { id: "lg-11", name: "Leg Press", category: "Legs", equipment: "Machine", sets: 3, reps: 10, weight: 220, rest: 90 }, { id: "lg-13", name: "Leg Extension", category: "Legs", equipment: "Machine", sets: 3, reps: 12, weight: 80, rest: 60 }] },
];

const SEED_HISTORY: WorkoutSession[] = [
  { id: "h1", name: "Push Day", date: "2026-06-22", duration: 3240, volume: 12400, exercises: 3, exerciseLog: [{ name: "Barbell Bench Press", category: "Chest", sets: [{ weight: 135, reps: 8 }, { weight: 140, reps: 7 }, { weight: 140, reps: 6 }, { weight: 135, reps: 8 }] }] },
  { id: "h2", name: "Pull Day", date: "2026-06-20", duration: 2880, volume: 10800, exercises: 3, exerciseLog: [{ name: "Barbell Deadlift", category: "Back", sets: [{ weight: 225, reps: 5 }, { weight: 235, reps: 4 }] }] },
  { id: "h3", name: "Leg Day", date: "2026-06-18", duration: 3600, volume: 18600, exercises: 4, exerciseLog: [{ name: "Barbell Back Squat", category: "Legs", sets: [{ weight: 180, reps: 6 }, { weight: 185, reps: 5 }, { weight: 185, reps: 5 }] }] },
];

const DEFAULT_PROFILE: UserProfile = {
  id: ME_ID,
  name: "Alex Jordan",
  username: "alexjordan",
  level: "intermediate",
  streak: 5,
  totalWorkouts: 48,
  totalPoints: 3580,
  joinDate: "2026-01-15",
  bio: "Building strength one rep at a time.",
  goals: ["Build Muscle", "Improve Endurance"],
  equipment: ["Barbell", "Dumbbell", "Cable", "Machine"],
  hasCompletedOnboarding: false,
  aiPlan: null,
  calorieGoal: 2400,
  proteinGoal: 180,
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DEFAULT_STATE: AppState = {
  userProfile: DEFAULT_PROFILE,
  routines: SEED_ROUTINES,
  workoutHistory: SEED_HISTORY,
  mealTemplates: [],
  calorieLog: [
    {
      date: todayStr(),
      goal: 2400,
      water: 4,
      entries: [
        { id: "fe1", name: "Greek Yogurt + Granola", calories: 380, protein: 22, carbs: 48, fat: 8, fiber: 3, sugar: 14, sodium: 95, meal: "breakfast", time: "7:30 AM" },
        { id: "fe2", name: "Chicken Rice Bowl", calories: 620, protein: 45, carbs: 68, fat: 12, fiber: 2, sugar: 2, sodium: 480, meal: "lunch", time: "12:15 PM" },
        { id: "fe3", name: "Protein Shake", calories: 220, protein: 40, carbs: 8, fat: 3, fiber: 1, sugar: 2, sodium: 130, meal: "snack", time: "3:00 PM" },
      ],
    },
  ],
  friends: SEED_FRIENDS,
  challenges: SEED_CHALLENGES,
  posts: SEED_POSTS,
  chatThreads: SEED_CHAT_THREADS,
  runHistory: SEED_RUN_HISTORY,
};

const AppContext = createContext<AppContextType | null>(null);

const CLERK_LINKED_KEY = "ironpace_clerk_linked";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const apiUserIdRef = useRef<string | null>(null);
  const { userId: clerkUserId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !clerkUserId || !loaded) return;

    (async () => {
      try {
        const alreadyLinked = await AsyncStorage.getItem(CLERK_LINKED_KEY);
        if (alreadyLinked === clerkUserId) return;

        const localUuid = apiUserIdRef.current;
        const r = await fetch(`${API_BASE}/api/users/clerk-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: clerkUserId, localUuid }),
        });
        if (!r.ok) return;

        const { user } = (await r.json()) as { user: { id: string } };
        await AsyncStorage.setItem(CLERK_LINKED_KEY, clerkUserId);

        if (user.id !== localUuid) {
          apiUserIdRef.current = user.id;
          await AsyncStorage.setItem(API_USER_ID_KEY, user.id);
          hydrateFromApi(user.id, setState);
        }
      } catch {}
    })();
  }, [isSignedIn, clerkUserId, loaded]);

  useEffect(() => {
    const run = async () => {
      const pairs = await AsyncStorage.multiGet([STORAGE_KEY, API_USER_ID_KEY]);
      const raw = pairs[0][1];
      const storedApiUserId = pairs[1][1];

      let loadedState: AppState = DEFAULT_STATE;
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<AppState>;
          loadedState = {
            ...DEFAULT_STATE,
            ...saved,
            userProfile: { ...DEFAULT_PROFILE, ...(saved.userProfile ?? {}) },
          };
        } catch {}
      }

      const userId = storedApiUserId ?? generateUUID();
      apiUserIdRef.current = userId;
      if (!storedApiUserId) {
        AsyncStorage.setItem(API_USER_ID_KEY, userId).catch(() => {});
      }

      setState(loadedState);
      setLoaded(true);

      const profile = loadedState.userProfile;
      try {
        const r = await fetch(`${API_BASE}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            name: profile.name,
            username: profile.username,
            level: profile.level,
            streak: 0,
            totalWorkouts: 0,
            totalPoints: 0,
            calorieGoal: profile.calorieGoal,
            proteinGoal: profile.proteinGoal,
            joinDate: profile.joinDate,
            bio: profile.bio,
          }),
        });
        if (r.ok) {
          const user = (await r.json()) as ServerUser;
          setState((prev) => ({
            ...prev,
            userProfile: {
              ...prev.userProfile,
              name: user.name,
              username: user.username,
              bio: user.bio,
              level: user.level as ExperienceLevel,
              joinDate: user.joinDate,
              calorieGoal: user.calorieGoal,
              proteinGoal: user.proteinGoal,
              totalPoints: user.totalPoints,
              totalWorkouts: user.totalWorkouts,
              streak: user.streak,
            },
          }));
        }
      } catch {}

      await drainPendingQueue();

      // Re-fetch user profile after drain so any just-synced session
      // totals and streak are reflected before hydrateFromApi runs.
      try {
        const r = await fetch(`${API_BASE}/api/users/${userId}`);
        if (r.ok) {
          const user = (await r.json()) as ServerUser;
          setState((prev) => ({
            ...prev,
            userProfile: {
              ...prev.userProfile,
              name: user.name,
              username: user.username,
              bio: user.bio,
              level: user.level as ExperienceLevel,
              joinDate: user.joinDate,
              calorieGoal: user.calorieGoal,
              proteinGoal: user.proteinGoal,
              totalPoints: user.totalPoints,
              totalWorkouts: user.totalWorkouts,
              streak: user.streak,
            },
          }));
        }
      } catch {}

      hydrateFromApi(userId, setState);
    };

    run().catch(() => {});
  }, []);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    let wasConnected: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((netState) => {
      const isNowConnected = netState.isConnected === true;
      if (wasConnected === false && isNowConnected) {
        const userId = apiUserIdRef.current;
        const profile = stateRef.current.userProfile;
        if (userId) {
          fetch(`${API_BASE}/api/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: userId,
              name: profile.name,
              username: profile.username,
              level: profile.level,
              streak: 0,
              totalWorkouts: 0,
              totalPoints: 0,
              calorieGoal: profile.calorieGoal,
              proteinGoal: profile.proteinGoal,
              joinDate: profile.joinDate,
              bio: profile.bio,
            }),
          })
            .catch(() => {})
            .finally(() => { scheduleDrain(); });
        } else {
          scheduleDrain();
        }
      }
      wasConnected = isNowConnected;
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let lastAppState = RNAppState.currentState;
    const subscription = RNAppState.addEventListener("change", (nextAppState) => {
      if (lastAppState !== "active" && nextAppState === "active") {
        scheduleDrain();
      }
      lastAppState = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  const persist = useCallback((next: AppState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const resetForAuthUser = useCallback(async (): Promise<void> => {
    const today = todayStr();
    const clean: AppState = {
      userProfile: {
        ...DEFAULT_PROFILE,
        id: state.userProfile.id,
        goals: state.userProfile.goals,
        equipment: state.userProfile.equipment,
        calorieGoal: state.userProfile.calorieGoal,
        proteinGoal: state.userProfile.proteinGoal,
        hasCompletedOnboarding: state.userProfile.hasCompletedOnboarding,
        aiPlan: state.userProfile.aiPlan,
        streak: 0,
        totalWorkouts: 0,
        totalPoints: 0,
        joinDate: today,
      },
      routines: [],
      workoutHistory: [],
      mealTemplates: [],
      calorieLog: [{ date: today, goal: state.userProfile.calorieGoal ?? 2000, water: 0, entries: [] }],
      friends: [],
      challenges: [],
      posts: [],
      chatThreads: [],
      runHistory: [],
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    setState(clean);
  }, [state.userProfile]);

  const update = useCallback(
    (fn: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      update((prev) => ({
        ...prev,
        userProfile: { ...prev.userProfile, ...updates },
      }));
      if (apiUserIdRef.current) {
        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.username !== undefined) patch.username = updates.username;
        if (updates.level !== undefined) patch.level = updates.level;
        if (updates.calorieGoal !== undefined) patch.calorieGoal = updates.calorieGoal;
        if (updates.proteinGoal !== undefined) patch.proteinGoal = updates.proteinGoal;
        if (updates.bio !== undefined) patch.bio = updates.bio;
        if (Object.keys(patch).length > 0) {
          queueAndFire("PATCH", `/users/${apiUserIdRef.current}`, patch);
        }
      }
    },
    [update],
  );

  const saveAIPlan = useCallback(
    (plan: AIPlan) => {
      update((prev) => ({
        ...prev,
        userProfile: { ...prev.userProfile, aiPlan: plan, hasCompletedOnboarding: true },
      }));
    },
    [update],
  );

  const addWorkoutSession = useCallback(
    (session: WorkoutSession) => {
      const points = Math.floor(session.volume / 100) + 50;
      update((prev) => ({
        ...prev,
        workoutHistory: [session, ...prev.workoutHistory],
        userProfile: {
          ...prev.userProfile,
          totalWorkouts: prev.userProfile.totalWorkouts + 1,
          streak: prev.userProfile.streak + 1,
          totalPoints: prev.userProfile.totalPoints + points,
        },
      }));
      const userId = apiUserIdRef.current;
      if (userId) {
        fireSession(
          "/sessions/workout",
          {
            id: session.id,
            userId,
            name: session.name,
            date: session.date,
            durationSeconds: session.duration,
            volumeKg: Math.round(session.volume * 0.453592),
            exerciseCount: session.exercises,
            exerciseLogJson: session.exerciseLog,
            pointsEarned: points,
          },
          (user) => {
            update((prev) => ({
              ...prev,
              userProfile: {
                ...prev.userProfile,
                totalPoints: user.totalPoints,
                totalWorkouts: user.totalWorkouts,
                streak: user.streak,
              },
            }));
          },
        );
      }
    },
    [update],
  );

  const addFoodEntry = useCallback(
    (date: string, entry: FoodEntry) => {
      update((prev) => {
        const existing = prev.calorieLog.find((d) => d.date === date);
        if (existing) {
          return {
            ...prev,
            calorieLog: prev.calorieLog.map((d) =>
              d.date === date ? { ...d, entries: [...d.entries, entry] } : d,
            ),
          };
        }
        return {
          ...prev,
          calorieLog: [
            ...prev.calorieLog,
            { date, goal: prev.userProfile.calorieGoal, water: 0, entries: [entry] },
          ],
        };
      });
      const userId = apiUserIdRef.current;
      if (userId) {
        queueAndFire("POST", `/food-log/${userId}`, {
          id: entry.id,
          date,
          meal: entry.meal,
          name: entry.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          fiber: entry.fiber ?? null,
          sugar: entry.sugar ?? null,
          sodium: entry.sodium ?? null,
        });
      }
    },
    [update],
  );

  const removeFoodEntry = useCallback(
    (date: string, entryId: string) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date
            ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) }
            : d,
        ),
      }));
      const userId = apiUserIdRef.current;
      if (userId) {
        queueAndFire("DELETE", `/food-log/${userId}/${entryId}`);
      }
    },
    [update],
  );

  const updateFoodEntry = useCallback(
    (date: string, entryId: string, updates: Pick<FoodEntry, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium">) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date
            ? { ...d, entries: d.entries.map((e) => (e.id === entryId ? { ...e, ...updates } : e)) }
            : d,
        ),
      }));
    },
    [update],
  );

  const updateWater = useCallback(
    (date: string, cups: number) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date ? { ...d, water: Math.max(0, cups) } : d,
        ),
      }));
    },
    [update],
  );

  const likePost = useCallback(
    (postId: string) => {
      update((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p,
        ),
      }));
    },
    [update],
  );

  const addPost = useCallback(
    (post: Post) => {
      update((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
    },
    [update],
  );

  const sendChallenge = useCallback(
    (challenge: Challenge) => {
      update((prev) => ({ ...prev, challenges: [challenge, ...prev.challenges] }));
    },
    [update],
  );

  const acceptChallenge = useCallback(
    (challengeId: string) => {
      update((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === challengeId ? { ...c, status: "active" as const } : c,
        ),
      }));
    },
    [update],
  );

  const updateChallengeProgress = useCallback(
    (challengeId: string, progress: number) => {
      update((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === challengeId
            ? {
                ...c,
                myProgress: progress,
                participants: c.participants.map((p) =>
                  p.id === ME_ID ? { ...p, progress } : p,
                ),
              }
            : c,
        ),
      }));
    },
    [update],
  );

  const sendMessage = useCallback(
    (threadId: string, text: string) => {
      const msg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        senderId: ME_ID,
        text,
        time: "Just now",
      };
      update((prev) => ({
        ...prev,
        chatThreads: prev.chatThreads.map((t) =>
          t.id === threadId
            ? { ...t, messages: [...t.messages, msg], lastMessage: text, lastTime: "Just now" }
            : t,
        ),
      }));
    },
    [update],
  );

  const markThreadRead = useCallback(
    (threadId: string) => {
      update((prev) => ({
        ...prev,
        chatThreads: prev.chatThreads.map((t) =>
          t.id === threadId ? { ...t, unread: 0 } : t,
        ),
      }));
    },
    [update],
  );

  const getTodayCalories = useCallback((): DayCalories => {
    const today = todayStr();
    const log = state.calorieLog.find((d) => d.date === today);
    return log
      ? { ...log, goal: state.userProfile.calorieGoal }
      : { date: today, goal: state.userProfile.calorieGoal, water: 0, entries: [] };
  }, [state.calorieLog, state.userProfile.calorieGoal]);

  const getWeeklyNutrition = useCallback((): WeeklyNutrition[] => {
    const base = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - (6 - i));
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayLog = state.calorieLog.find((c) => c.date === dateStr);
      return {
        date: dateStr,
        consumed: dayLog?.entries.reduce((s, e) => s + e.calories, 0) ?? 0,
        protein: dayLog?.entries.reduce((s, e) => s + e.protein, 0) ?? 0,
        carbs: dayLog?.entries.reduce((s, e) => s + e.carbs, 0) ?? 0,
        fat: dayLog?.entries.reduce((s, e) => s + e.fat, 0) ?? 0,
        fiber: dayLog?.entries.reduce((s, e) => s + (e.fiber ?? 0), 0) ?? 0,
        goal: dayLog?.goal ?? state.userProfile.calorieGoal,
      };
    });
  }, [state.calorieLog, state.userProfile.calorieGoal]);

  const addRoutine = useCallback(
    (routine: Routine) => {
      update((prev) => ({ ...prev, routines: [...prev.routines, routine] }));
    },
    [update],
  );

  const addRunSession = useCallback(
    (session: RunSession) => {
      const points = Math.floor(session.distance * 10) + 20;
      update((prev) => ({
        ...prev,
        runHistory: [session, ...prev.runHistory],
        userProfile: {
          ...prev.userProfile,
          totalPoints: prev.userProfile.totalPoints + points,
        },
      }));
      const userId = apiUserIdRef.current;
      if (userId) {
        fireSession(
          "/sessions/run",
          {
            id: session.id,
            userId,
            date: session.date,
            durationSeconds: session.duration,
            distanceKm: session.distance,
            avgPace: session.avgPace,
            bestPace: session.bestPace,
            calories: session.calories,
            splitsJson: session.splits,
            pointsEarned: points,
          },
          (user) => {
            update((prev) => ({
              ...prev,
              userProfile: {
                ...prev.userProfile,
                totalPoints: user.totalPoints,
                totalWorkouts: user.totalWorkouts,
                streak: user.streak,
              },
            }));
          },
        );
      }
    },
    [update],
  );

  const saveMealTemplate = useCallback(
    (name: string, entries: FoodEntry[]) => {
      const template: MealTemplate = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        name: name.trim(),
        createdAt: todayStr(),
        entries: entries.map((e) => ({
          name: e.name,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          fiber: e.fiber,
          sugar: e.sugar,
          sodium: e.sodium,
          meal: e.meal,
        })),
      };
      update((prev) => ({ ...prev, mealTemplates: [template, ...prev.mealTemplates] }));
    },
    [update],
  );

  const deleteMealTemplate = useCallback(
    (templateId: string) => {
      update((prev) => ({
        ...prev,
        mealTemplates: prev.mealTemplates.filter((t) => t.id !== templateId),
      }));
    },
    [update],
  );

  const loadMealTemplate = useCallback(
    (date: string, templateId: string, targetMeal: FoodEntry["meal"]) => {
      update((prev) => {
        const template = prev.mealTemplates.find((t) => t.id === templateId);
        if (!template) return prev;
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        const newEntries: FoodEntry[] = template.entries.map((e) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
          name: e.name,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fat: e.fat,
          fiber: e.fiber,
          sugar: e.sugar,
          sodium: e.sodium,
          meal: targetMeal,
          time: timeStr,
        }));
        const existing = prev.calorieLog.find((d) => d.date === date);
        if (existing) {
          return {
            ...prev,
            calorieLog: prev.calorieLog.map((d) =>
              d.date === date ? { ...d, entries: [...d.entries, ...newEntries] } : d,
            ),
          };
        }
        return {
          ...prev,
          calorieLog: [
            ...prev.calorieLog,
            { date, goal: prev.userProfile.calorieGoal, water: 0, entries: newEntries },
          ],
        };
      });
    },
    [update],
  );

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        state,
        resetForAuthUser,
        updateProfile,
        saveAIPlan,
        addWorkoutSession,
        addFoodEntry,
        removeFoodEntry,
        updateFoodEntry,
        updateWater,
        likePost,
        addPost,
        sendChallenge,
        acceptChallenge,
        updateChallengeProgress,
        sendMessage,
        markThreadRead,
        getTodayCalories,
        getWeeklyNutrition,
        addRoutine,
        addRunSession,
        saveMealTemplate,
        deleteMealTemplate,
        loadMealTemplate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export const ME_USER_ID = ME_ID;

function hydrateFromApi(
  userId: string,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
): void {
  fetch(`${API_BASE}/api/sessions/${userId}`)
    .then((r) => {
      if (!r.ok) throw new Error("sessions fetch failed");
      return r.json() as Promise<any[]>;
    })
    .then((rows) => {
      const workoutRows = rows.filter((r) => r.type === "workout");
      const runRows = rows.filter((r) => r.type === "run");

      const apiSessions: WorkoutSession[] = workoutRows.map((r) => ({
        id: r.id,
        name: r.name,
        date: r.date,
        duration: r.durationSeconds,
        volume: Math.round((r.volumeKg ?? 0) / 0.453592),
        exercises: r.exerciseCount ?? 0,
        exerciseLog: (r.exerciseLogJson as ExerciseLog[]) ?? [],
      }));

      const apiRuns: RunSession[] = runRows.map((r) => ({
        id: r.id,
        date: r.date,
        distance: r.distanceKm ?? 0,
        duration: r.durationSeconds,
        avgPace: r.avgPace ?? "",
        bestPace: r.bestPace ?? "",
        calories: r.calories ?? 0,
        splits: (r.splitsJson as RunSplit[]) ?? [],
      }));

      setState((prev) => {
        const sessionApiIds = new Set(apiSessions.map((s) => s.id));
        const runApiIds = new Set(apiRuns.map((r) => r.id));
        const pendingSessionsLocal = prev.workoutHistory.filter((s) => !sessionApiIds.has(s.id));
        const pendingRunsLocal = prev.runHistory.filter((r) => !runApiIds.has(r.id));
        const mergedSessions = [...apiSessions, ...pendingSessionsLocal].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const mergedRuns = [...apiRuns, ...pendingRunsLocal].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        return { ...prev, workoutHistory: mergedSessions, runHistory: mergedRuns };
      });
    })
    .catch(() => {});

  const today = todayStr();
  fetch(`${API_BASE}/api/food-log/${userId}/${today}`)
    .then((r) => {
      if (!r.ok) throw new Error("food-log fetch failed");
      return r.json() as Promise<any[]>;
    })
    .then((rows) => {
      const apiEntries: FoodEntry[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        fiber: r.fiber ?? undefined,
        sugar: r.sugar ?? undefined,
        sodium: r.sodium ?? undefined,
        meal: r.meal as FoodEntry["meal"],
        time: new Date(r.loggedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      }));
      setState((prev) => {
        const existing = prev.calorieLog.find((d) => d.date === today);
        const apiIds = new Set(apiEntries.map((e) => e.id));
        const pendingLocal = (existing?.entries ?? []).filter(
          (e) => !apiIds.has(e.id) && !SEED_FOOD_IDS.has(e.id),
        );
        const merged = [...apiEntries, ...pendingLocal];
        if (existing) {
          return {
            ...prev,
            calorieLog: prev.calorieLog.map((d) =>
              d.date === today ? { ...d, entries: merged } : d,
            ),
          };
        }
        return {
          ...prev,
          calorieLog: [
            ...prev.calorieLog,
            { date: today, goal: prev.userProfile.calorieGoal, water: 0, entries: merged },
          ],
        };
      });
    })
    .catch(() => {});

  fetch(`${API_BASE}/api/leaderboard`)
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: any[]) => {
      const others = rows.filter((r: any) => r.id !== userId);
      const friends: Friend[] = others.map((r: any, i: number) => ({
        id: r.id,
        name: r.name,
        username: r.username,
        initials: r.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        streak: r.streak,
        weeklyWorkouts: r.weeklyWorkouts ?? 0,
        rank: i + 1,
        totalPoints: r.totalPoints,
        isOnline: false,
      }));
      setState((prev) => ({ ...prev, friends }));
    })
    .catch(() => {});
}
