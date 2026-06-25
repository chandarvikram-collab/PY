import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

const SEED_FRIENDS: Friend[] = [
  {
    id: "f1",
    name: "Marcus Chen",
    username: "mchen_lifts",
    initials: "MC",
    color: "#3b82f6",
    streak: 14,
    weeklyWorkouts: 5,
    rank: 1,
    totalPoints: 4820,
    isOnline: true,
  },
  {
    id: "f2",
    name: "Sofia Reyes",
    username: "sofia_runs",
    initials: "SR",
    color: "#8b5cf6",
    streak: 9,
    weeklyWorkouts: 4,
    rank: 2,
    totalPoints: 3940,
    isOnline: false,
  },
  {
    id: "f3",
    name: "Jake Williams",
    username: "jwilliams_fit",
    initials: "JW",
    color: "#f59e0b",
    streak: 21,
    weeklyWorkouts: 6,
    rank: 3,
    totalPoints: 3210,
    isOnline: true,
  },
  {
    id: "f4",
    name: "Priya Patel",
    username: "priya_active",
    initials: "PP",
    color: "#22c55e",
    streak: 5,
    weeklyWorkouts: 3,
    rank: 5,
    totalPoints: 2150,
    isOnline: false,
  },
];

const SEED_CHALLENGES: Challenge[] = [
  {
    id: "c1",
    type: "steps",
    title: "10K Steps Daily",
    description: "Hit 10,000 steps every day for a week",
    fromId: "f1",
    fromName: "Marcus Chen",
    participants: [
      {
        id: ME_ID,
        name: "You",
        initials: "ME",
        color: "#E8151B",
        progress: 8420,
        target: 10000,
      },
      {
        id: "f1",
        name: "Marcus",
        initials: "MC",
        color: "#3b82f6",
        progress: 9800,
        target: 10000,
      },
    ],
    myProgress: 8420,
    target: 10000,
    unit: "steps",
    deadline: "2026-06-28",
    status: "active",
    createdAt: "2026-06-21",
  },
  {
    id: "c2",
    type: "lifting",
    title: "Bench Press PR",
    description: "Hit a new bench press max this week",
    fromId: "f3",
    fromName: "Jake Williams",
    participants: [
      {
        id: ME_ID,
        name: "You",
        initials: "ME",
        color: "#E8151B",
        progress: 185,
        target: 225,
      },
      {
        id: "f3",
        name: "Jake",
        initials: "JW",
        color: "#f59e0b",
        progress: 210,
        target: 225,
      },
    ],
    myProgress: 185,
    target: 225,
    unit: "lbs",
    deadline: "2026-06-30",
    status: "active",
    createdAt: "2026-06-20",
  },
  {
    id: "c3",
    type: "distance",
    title: "30km Run Week",
    description: "Run 30km total this week",
    fromId: "f2",
    fromName: "Sofia Reyes",
    participants: [
      {
        id: ME_ID,
        name: "You",
        initials: "ME",
        color: "#E8151B",
        progress: 19.2,
        target: 30,
      },
      {
        id: "f2",
        name: "Sofia",
        initials: "SR",
        color: "#8b5cf6",
        progress: 24.5,
        target: 30,
      },
    ],
    myProgress: 19.2,
    target: 30,
    unit: "km",
    deadline: "2026-06-27",
    status: "active",
    createdAt: "2026-06-22",
  },
  {
    id: "c4",
    type: "streak",
    title: "7-Day Streak",
    description: "Train every day for 7 days straight",
    fromId: null,
    fromName: null,
    participants: [
      {
        id: ME_ID,
        name: "You",
        initials: "ME",
        color: "#E8151B",
        progress: 5,
        target: 7,
      },
    ],
    myProgress: 5,
    target: 7,
    unit: "days",
    deadline: "2026-06-26",
    status: "active",
    createdAt: "2026-06-19",
  },
];

const SEED_POSTS: Post[] = [
  {
    id: "p1",
    userId: "f1",
    userName: "Marcus Chen",
    userInitials: "MC",
    userColor: "#3b82f6",
    type: "workout",
    content: "Push day DONE. Hit a new bench PR at 245lbs. The grind never stops.",
    likes: 24,
    comments: 5,
    liked: false,
    time: "2h ago",
    stats: { Volume: "18,400 lbs", Sets: "12", Duration: "58 min" },
  },
  {
    id: "p2",
    userId: "f2",
    userName: "Sofia Reyes",
    userInitials: "SR",
    userColor: "#8b5cf6",
    type: "milestone",
    content: "Just crossed 500km run total for the year. Consistency is everything.",
    likes: 41,
    comments: 8,
    liked: true,
    time: "4h ago",
    stats: { Distance: "10.2 km", Pace: "5:18 /km", Calories: "612" },
  },
  {
    id: "p3",
    userId: "f3",
    userName: "Jake Williams",
    userInitials: "JW",
    userColor: "#f59e0b",
    type: "achievement",
    content: "21 day workout streak achieved. Body is adapting, mind is locked in.",
    likes: 33,
    comments: 12,
    liked: false,
    time: "6h ago",
    stats: { Streak: "21 days", Workouts: "21", "Best Lift": "Squat 315 lbs" },
  },
  {
    id: "p4",
    userId: "f4",
    userName: "Priya Patel",
    userInitials: "PP",
    userColor: "#22c55e",
    type: "workout",
    content: "Leg day is a sacred ritual. Squats, RDLs, lunges. Full send every time.",
    likes: 18,
    comments: 3,
    liked: false,
    time: "1d ago",
    stats: { Volume: "12,800 lbs", Sets: "10", Duration: "52 min" },
  },
  {
    id: "p5",
    userId: "f1",
    userName: "Marcus Chen",
    userInitials: "MC",
    userColor: "#3b82f6",
    type: "challenge",
    content: "Just sent a 10K steps challenge to the crew. Who is stepping up?",
    likes: 9,
    comments: 6,
    liked: false,
    time: "1d ago",
    stats: {},
  },
];

const SEED_CHAT_THREADS: ChatThread[] = [
  {
    id: "t1",
    friendId: "f1",
    friendName: "Marcus Chen",
    friendInitials: "MC",
    friendColor: "#3b82f6",
    lastMessage: "You in for legs tomorrow?",
    lastTime: "2h ago",
    unread: 1,
    isOnline: true,
    messages: [
      {
        id: "m1",
        senderId: "f1",
        text: "Bro that PR was insane",
        time: "Yesterday 8:22 PM",
      },
      { id: "m2", senderId: ME_ID, text: "Thanks man, been grinding for it", time: "Yesterday 8:25 PM" },
      { id: "m3", senderId: "f1", text: "You in for legs tomorrow?", time: "2h ago" },
    ],
  },
  {
    id: "t2",
    friendId: "f2",
    friendName: "Sofia Reyes",
    friendInitials: "SR",
    friendColor: "#8b5cf6",
    lastMessage: "The 6am club is calling",
    lastTime: "5h ago",
    unread: 0,
    isOnline: false,
    messages: [
      {
        id: "m4",
        senderId: "f2",
        text: "Morning run at 6?",
        time: "Yesterday 9:10 PM",
      },
      { id: "m5", senderId: ME_ID, text: "I will try my best", time: "Yesterday 9:12 PM" },
      { id: "m6", senderId: "f2", text: "The 6am club is calling", time: "5h ago" },
    ],
  },
  {
    id: "t3",
    friendId: "f3",
    friendName: "Jake Williams",
    friendInitials: "JW",
    friendColor: "#f59e0b",
    lastMessage: "GG on the challenge!",
    lastTime: "1d ago",
    unread: 0,
    isOnline: true,
    messages: [
      {
        id: "m7",
        senderId: ME_ID,
        text: "Challenge accepted Jake",
        time: "1d ago",
      },
      { id: "m8", senderId: "f3", text: "GG on the challenge!", time: "1d ago" },
    ],
  },
];

const SEED_RUN_HISTORY: RunSession[] = [
  {
    id: "rh1",
    date: "2026-06-23",
    distance: 8.2,
    duration: 2640,
    avgPace: "5:22",
    bestPace: "4:58",
    calories: 533,
    splits: [
      { km: 1, pace: "5:41", elapsed: 341 },
      { km: 2, pace: "5:28", elapsed: 669 },
      { km: 3, pace: "5:15", elapsed: 984 },
      { km: 4, pace: "5:10", elapsed: 1294 },
      { km: 5, pace: "5:18", elapsed: 1612 },
      { km: 6, pace: "5:22", elapsed: 1934 },
      { km: 7, pace: "5:30", elapsed: 2264 },
      { km: 8, pace: "4:58", elapsed: 2562 },
    ],
  },
  {
    id: "rh2",
    date: "2026-06-20",
    distance: 5.1,
    duration: 1710,
    avgPace: "5:35",
    bestPace: "5:12",
    calories: 332,
    splits: [
      { km: 1, pace: "5:48", elapsed: 348 },
      { km: 2, pace: "5:35", elapsed: 683 },
      { km: 3, pace: "5:28", elapsed: 1011 },
      { km: 4, pace: "5:22", elapsed: 1333 },
      { km: 5, pace: "5:12", elapsed: 1645 },
    ],
  },
  {
    id: "rh3",
    date: "2026-06-17",
    distance: 10.0,
    duration: 3300,
    avgPace: "5:30",
    bestPace: "5:05",
    calories: 650,
    splits: [
      { km: 1, pace: "5:52", elapsed: 352 },
      { km: 2, pace: "5:40", elapsed: 692 },
      { km: 3, pace: "5:32", elapsed: 1024 },
      { km: 4, pace: "5:25", elapsed: 1349 },
      { km: 5, pace: "5:20", elapsed: 1669 },
      { km: 6, pace: "5:25", elapsed: 1994 },
      { km: 7, pace: "5:28", elapsed: 2322 },
      { km: 8, pace: "5:15", elapsed: 2637 },
      { km: 9, pace: "5:18", elapsed: 2955 },
      { km: 10, pace: "5:05", elapsed: 3260 },
    ],
  },
];

const SEED_ROUTINES: Routine[] = [
  {
    id: "r1",
    name: "Push Day",
    exercises: [
      { id: "ch-01", name: "Barbell Bench Press", category: "Chest", equipment: "Barbell", sets: 4, reps: 8, weight: 135, rest: 120 },
      { id: "sh-04", name: "Dumbbell Lateral Raise", category: "Shoulders", equipment: "Dumbbell", sets: 3, reps: 15, weight: 15, rest: 60 },
      { id: "am-13", name: "Cable Triceps Pushdown", category: "Arms", equipment: "Cable", sets: 3, reps: 12, weight: 50, rest: 60 },
      { id: "sh-01", name: "Overhead Press", category: "Shoulders", equipment: "Barbell", sets: 3, reps: 8, weight: 95, rest: 120 },
    ],
  },
  {
    id: "r2",
    name: "Pull Day",
    exercises: [
      { id: "bk-01", name: "Barbell Deadlift", category: "Back", equipment: "Barbell", sets: 3, reps: 5, weight: 225, rest: 180 },
      { id: "bk-08", name: "Lat Pulldown", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 100, rest: 90 },
      { id: "am-01", name: "Barbell Biceps Curl", category: "Arms", equipment: "Barbell", sets: 3, reps: 10, weight: 50, rest: 60 },
      { id: "bk-10", name: "Seated Cable Row", category: "Back", equipment: "Cable", sets: 3, reps: 10, weight: 90, rest: 90 },
    ],
  },
  {
    id: "r3",
    name: "Leg Day",
    exercises: [
      { id: "lg-01", name: "Barbell Back Squat", category: "Legs", equipment: "Barbell", sets: 4, reps: 6, weight: 180, rest: 180 },
      { id: "lg-03", name: "Romanian Deadlift", category: "Legs", equipment: "Barbell", sets: 3, reps: 8, weight: 155, rest: 120 },
      { id: "lg-11", name: "Leg Press", category: "Legs", equipment: "Machine", sets: 3, reps: 10, weight: 220, rest: 90 },
      { id: "lg-13", name: "Leg Extension", category: "Legs", equipment: "Machine", sets: 3, reps: 12, weight: 80, rest: 60 },
    ],
  },
];

const SEED_HISTORY: WorkoutSession[] = [
  {
    id: "h1",
    name: "Push Day",
    date: "2026-06-22",
    duration: 3240,
    volume: 12400,
    exercises: 3,
    exerciseLog: [
      { name: "Barbell Bench Press", category: "Chest", sets: [{ weight: 135, reps: 8 }, { weight: 140, reps: 7 }, { weight: 140, reps: 6 }, { weight: 135, reps: 8 }] },
    ],
  },
  {
    id: "h2",
    name: "Pull Day",
    date: "2026-06-20",
    duration: 2880,
    volume: 10800,
    exercises: 3,
    exerciseLog: [
      { name: "Barbell Deadlift", category: "Back", sets: [{ weight: 225, reps: 5 }, { weight: 235, reps: 4 }] },
    ],
  },
  {
    id: "h3",
    name: "Leg Day",
    date: "2026-06-18",
    duration: 3600,
    volume: 18600,
    exercises: 4,
    exerciseLog: [
      { name: "Barbell Back Squat", category: "Legs", sets: [{ weight: 180, reps: 6 }, { weight: 185, reps: 5 }, { weight: 185, reps: 5 }] },
    ],
  },
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

const STORAGE_KEY = "ironpace_v1";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const saved = JSON.parse(raw) as Partial<AppState>;
            setState((prev) => ({
              ...prev,
              ...saved,
              userProfile: { ...prev.userProfile, ...(saved.userProfile ?? {}) },
            }));
          } catch {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: AppState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const update = useCallback(
    (fn: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      update((prev) => ({
        ...prev,
        userProfile: { ...prev.userProfile, ...updates },
      }));
    },
    [update]
  );

  const saveAIPlan = useCallback(
    (plan: AIPlan) => {
      update((prev) => ({
        ...prev,
        userProfile: { ...prev.userProfile, aiPlan: plan, hasCompletedOnboarding: true },
      }));
    },
    [update]
  );

  const addWorkoutSession = useCallback(
    (session: WorkoutSession) => {
      update((prev) => ({
        ...prev,
        workoutHistory: [session, ...prev.workoutHistory],
        userProfile: {
          ...prev.userProfile,
          totalWorkouts: prev.userProfile.totalWorkouts + 1,
          streak: prev.userProfile.streak + 1,
          totalPoints: prev.userProfile.totalPoints + Math.floor(session.volume / 100) + 50,
        },
      }));
    },
    [update]
  );

  const addFoodEntry = useCallback(
    (date: string, entry: FoodEntry) => {
      update((prev) => {
        const existing = prev.calorieLog.find((d) => d.date === date);
        if (existing) {
          return {
            ...prev,
            calorieLog: prev.calorieLog.map((d) =>
              d.date === date ? { ...d, entries: [...d.entries, entry] } : d
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
    },
    [update]
  );

  const removeFoodEntry = useCallback(
    (date: string, entryId: string) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date
            ? { ...d, entries: d.entries.filter((e) => e.id !== entryId) }
            : d
        ),
      }));
    },
    [update]
  );

  const updateFoodEntry = useCallback(
    (date: string, entryId: string, updates: Pick<FoodEntry, "calories" | "protein" | "carbs" | "fat" | "fiber" | "sugar" | "sodium">) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date
            ? {
                ...d,
                entries: d.entries.map((e) =>
                  e.id === entryId ? { ...e, ...updates } : e
                ),
              }
            : d
        ),
      }));
    },
    [update]
  );

  const updateWater = useCallback(
    (date: string, cups: number) => {
      update((prev) => ({
        ...prev,
        calorieLog: prev.calorieLog.map((d) =>
          d.date === date ? { ...d, water: Math.max(0, cups) } : d
        ),
      }));
    },
    [update]
  );

  const likePost = useCallback(
    (postId: string) => {
      update((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        ),
      }));
    },
    [update]
  );

  const addPost = useCallback(
    (post: Post) => {
      update((prev) => ({ ...prev, posts: [post, ...prev.posts] }));
    },
    [update]
  );

  const sendChallenge = useCallback(
    (challenge: Challenge) => {
      update((prev) => ({ ...prev, challenges: [challenge, ...prev.challenges] }));
    },
    [update]
  );

  const acceptChallenge = useCallback(
    (challengeId: string) => {
      update((prev) => ({
        ...prev,
        challenges: prev.challenges.map((c) =>
          c.id === challengeId ? { ...c, status: "active" as const } : c
        ),
      }));
    },
    [update]
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
                  p.id === ME_ID ? { ...p, progress } : p
                ),
              }
            : c
        ),
      }));
    },
    [update]
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
            : t
        ),
      }));
    },
    [update]
  );

  const markThreadRead = useCallback(
    (threadId: string) => {
      update((prev) => ({
        ...prev,
        chatThreads: prev.chatThreads.map((t) =>
          t.id === threadId ? { ...t, unread: 0 } : t
        ),
      }));
    },
    [update]
  );

  const getTodayCalories = useCallback((): DayCalories => {
    const today = todayStr();
    const log = state.calorieLog.find((d) => d.date === today);
    // Always override stored goal with the live profile value so that
    // changes made in the Profile Nutrition Goals editor take effect immediately.
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
    [update]
  );

  const addRunSession = useCallback(
    (session: RunSession) => {
      update((prev) => ({
        ...prev,
        runHistory: [session, ...prev.runHistory],
        userProfile: {
          ...prev.userProfile,
          totalPoints: prev.userProfile.totalPoints + Math.floor(session.distance * 10) + 20,
        },
      }));
    },
    [update]
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
    [update]
  );

  const deleteMealTemplate = useCallback(
    (templateId: string) => {
      update((prev) => ({
        ...prev,
        mealTemplates: prev.mealTemplates.filter((t) => t.id !== templateId),
      }));
    },
    [update]
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
              d.date === date ? { ...d, entries: [...d.entries, ...newEntries] } : d
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
    [update]
  );

  if (!loaded) return null;

  return (
    <AppContext.Provider
      value={{
        state,
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
