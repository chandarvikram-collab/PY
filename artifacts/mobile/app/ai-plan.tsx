import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod/v4";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { AIPlan, AIPlanExercise, AIPlanWeek, ExperienceLevel, Exercise, Routine } from "@/context/AppContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const routineExercisePayloadSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
  restSeconds: z.number().int().nonnegative(),
});

const aiRoutinePayloadSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(routineExercisePayloadSchema).min(1),
});

type AIRoutinePayload = z.infer<typeof aiRoutinePayloadSchema>;

function workoutToPayload(workoutName: string, exercises: AIPlanExercise[]): AIRoutinePayload | null {
  const result = aiRoutinePayloadSchema.safeParse({
    name: workoutName,
    exercises: exercises.map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.rest,
    })),
  });
  if (!result.success) {
    console.warn("[ai-plan] payload validation failed:", result.error.issues);
    return null;
  }
  return result.data;
}

function parseReps(reps: string): number {
  const cleaned = reps.trim().toLowerCase();
  if (cleaned === "max") return 12;
  const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);
  const singleMatch = cleaned.match(/^(\d+)/);
  if (singleMatch) return parseInt(singleMatch[1], 10);
  return 10;
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/bench|chest|fly|pec|dip|push.?up|incline press/.test(n)) return "Chest";
  if (/deadlift|row|lat|pull.?down|pull.?up|chin|back|rhomboid|face pull/.test(n)) return "Back";
  if (/squat|leg|lunge|hamstring|glute|calf|hip thrust|rdl|romanian/.test(n)) return "Legs";
  if (/overhead|shoulder|military|lateral raise|front raise|delt/.test(n)) return "Shoulders";
  if (/curl|tricep|bicep|extension|pushdown|skull|hammer/.test(n)) return "Arms";
  if (/plank|crunch|ab|core|dead bug|hanging|oblique/.test(n)) return "Core";
  return "General";
}

function payloadToLocalRoutine(payload: AIRoutinePayload, planEquipment: string[]): Routine {
  const primaryEquipment = planEquipment[0] ?? "Bodyweight";
  const converted: Exercise[] = payload.exercises.map((ex, i) => ({
    id: `ai-${Date.now()}-${i}`,
    name: ex.name,
    category: inferCategory(ex.name),
    equipment: primaryEquipment,
    sets: ex.sets,
    reps: parseReps(ex.reps),
    weight: 0,
    rest: ex.restSeconds,
  }));
  return {
    id: `ai-routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: payload.name,
    exercises: converted,
  };
}

const GOALS = ["Build Muscle", "Lose Fat", "Improve Strength", "Improve Endurance", "General Fitness"];
const LEVELS: { id: ExperienceLevel; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "Less than 1 year training" },
  { id: "intermediate", label: "Intermediate", desc: "1-3 years of consistent training" },
  { id: "advanced", label: "Advanced", desc: "3+ years, trained seriously" },
];
const EQUIPMENT_OPTIONS = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Resistance Bands", "Kettlebell"];
const DAYS_OPTIONS = [3, 4, 5, 6];

function generatePlan(
  goal: string,
  level: ExperienceLevel,
  equipment: string[],
  daysPerWeek: number
): AIPlan {
  const hasFreeWeights = equipment.includes("Barbell") || equipment.includes("Dumbbell");
  const hasMachines = equipment.includes("Machine") || equipment.includes("Cable");
  const isBodyweight = !hasFreeWeights && !hasMachines;

  const summaries: Record<string, string> = {
    "Build Muscle": `Hypertrophy-focused ${daysPerWeek}x/week split targeting progressive overload with moderate rep ranges (8-12). Each muscle group trained 2x per week.`,
    "Lose Fat": `High-frequency ${daysPerWeek}x/week program combining strength training with minimal rest to maximize caloric burn and preserve muscle mass.`,
    "Improve Strength": `Powerlifting-inspired ${daysPerWeek}x/week program centered on compound movements with heavy loads (3-6 reps) and sufficient recovery.`,
    "Improve Endurance": `Circuit-style ${daysPerWeek}x/week program with supersets, higher rep ranges (15-20), and shorter rest periods to build cardiovascular fitness.`,
    "General Fitness": `Well-rounded ${daysPerWeek}x/week full-body program covering strength, mobility, and conditioning for overall health.`,
  };

  const pushExercises = hasFreeWeights
    ? [
        { name: "Barbell Bench Press", sets: 4, reps: goal === "Improve Strength" ? "4-6" : "8-10", rest: 120 },
        { name: "Dumbbell Incline Press", sets: 3, reps: "10-12", rest: 90 },
        { name: "Overhead Press", sets: 3, reps: "8-10", rest: 90, note: "Focus on controlled eccentric" },
        { name: "Lateral Raises", sets: 3, reps: "12-15", rest: 60 },
        { name: "Triceps Pushdown", sets: 3, reps: "12-15", rest: 60 },
      ]
    : [
        { name: "Push-Up", sets: 4, reps: "Max", rest: 90 },
        { name: "Pike Push-Up", sets: 3, reps: "12-15", rest: 60 },
        { name: "Diamond Push-Up", sets: 3, reps: "10-12", rest: 60 },
      ];

  const pullExercises = hasFreeWeights
    ? [
        { name: "Barbell Deadlift", sets: 3, reps: goal === "Improve Strength" ? "3-5" : "6-8", rest: 180, note: "Warm up thoroughly" },
        { name: "Barbell Row", sets: 4, reps: "8-10", rest: 90 },
        { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: 90 },
        { name: "Face Pull", sets: 3, reps: "15-20", rest: 60 },
        { name: "Dumbbell Biceps Curl", sets: 3, reps: "10-12", rest: 60 },
      ]
    : [
        { name: "Pull-Up", sets: 4, reps: "Max", rest: 120 },
        { name: "Inverted Row", sets: 3, reps: "12-15", rest: 90 },
        { name: "Chin-Up", sets: 3, reps: "8-10", rest: 90 },
      ];

  const legExercises = hasFreeWeights
    ? [
        { name: "Barbell Back Squat", sets: 4, reps: goal === "Improve Strength" ? "3-5" : "6-8", rest: 180, note: "Prioritize depth and bracing" },
        { name: "Romanian Deadlift", sets: 3, reps: "10-12", rest: 90 },
        { name: "Leg Press", sets: 3, reps: "10-15", rest: 90 },
        { name: "Leg Curl", sets: 3, reps: "12-15", rest: 60 },
        { name: "Calf Raises", sets: 4, reps: "15-20", rest: 45 },
      ]
    : [
        { name: "Squat", sets: 4, reps: "15-20", rest: 90 },
        { name: "Bulgarian Split Squat", sets: 3, reps: "12 each", rest: 90 },
        { name: "Glute Bridge", sets: 3, reps: "20", rest: 60 },
        { name: "Calf Raises", sets: 3, reps: "20-25", rest: 45 },
      ];

  const upperExercises = hasFreeWeights
    ? [
        { name: "Dumbbell Bench Press", sets: 3, reps: "10-12", rest: 90 },
        { name: "Dumbbell Row", sets: 3, reps: "10-12", rest: 90 },
        { name: "Shoulder Press", sets: 3, reps: "10-12", rest: 90 },
        { name: "Lat Pulldown", sets: 3, reps: "10-12", rest: 90 },
        { name: "Biceps Curl", sets: 2, reps: "12-15", rest: 60 },
        { name: "Triceps Extension", sets: 2, reps: "12-15", rest: 60 },
      ]
    : pushExercises.slice(0, 3);

  const coreExercises = [
    { name: "Plank", sets: 3, reps: "45-60s", rest: 60 },
    { name: "Dead Bug", sets: 3, reps: "10 each side", rest: 60 },
    { name: "Hanging Leg Raise", sets: 3, reps: "12-15", rest: 60 },
  ];

  let schedule: { day: string; name: string; exercises: typeof pushExercises }[] = [];

  if (daysPerWeek === 3) {
    schedule = [
      { day: "Day 1", name: "Full Body A", exercises: [...pushExercises.slice(0, 2), ...pullExercises.slice(0, 2), ...legExercises.slice(0, 2)] },
      { day: "Day 2", name: "Full Body B", exercises: [...pushExercises.slice(2), ...pullExercises.slice(2, 4), ...legExercises.slice(2, 4)] },
      { day: "Day 3", name: "Full Body C + Core", exercises: [...upperExercises.slice(0, 3), ...legExercises.slice(0, 2), ...coreExercises] },
    ];
  } else if (daysPerWeek === 4) {
    schedule = [
      { day: "Day 1", name: "Upper A", exercises: upperExercises },
      { day: "Day 2", name: "Lower A", exercises: legExercises },
      { day: "Day 3", name: "Upper B", exercises: [...pushExercises.slice(0, 3), ...pullExercises.slice(2, 5)] },
      { day: "Day 4", name: "Lower B + Core", exercises: [...legExercises.slice(2), ...coreExercises] },
    ];
  } else if (daysPerWeek === 5) {
    schedule = [
      { day: "Day 1", name: "Push", exercises: pushExercises },
      { day: "Day 2", name: "Pull", exercises: pullExercises },
      { day: "Day 3", name: "Legs", exercises: legExercises },
      { day: "Day 4", name: "Upper + Arms", exercises: [...upperExercises.slice(0, 4), ...pullExercises.slice(4)] },
      { day: "Day 5", name: "Core + Conditioning", exercises: [...coreExercises, ...legExercises.slice(2, 4)] },
    ];
  } else {
    schedule = [
      { day: "Day 1", name: "Push A", exercises: pushExercises },
      { day: "Day 2", name: "Pull A", exercises: pullExercises },
      { day: "Day 3", name: "Legs A", exercises: legExercises },
      { day: "Day 4", name: "Push B", exercises: [...pushExercises.slice(1), ...pushExercises.slice(0, 1)] },
      { day: "Day 5", name: "Pull B + Core", exercises: [...pullExercises.slice(1), ...coreExercises.slice(0, 2)] },
      { day: "Day 6", name: "Legs B", exercises: [...legExercises.slice(2), ...legExercises.slice(0, 2)] },
    ];
  }

  const weeks: AIPlanWeek[] = [
    { weekNumber: 1, focus: "Foundation — Learn the movements, focus on form", workouts: schedule.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets: Math.max(2, e.sets - 1) })) })) },
    { weekNumber: 2, focus: "Build — Add volume, track every set", workouts: schedule },
    { weekNumber: 3, focus: "Overload — Push slightly heavier each exercise", workouts: schedule.map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, note: e.note ?? "Add 5-10 lbs from last week" })) })) },
    { weekNumber: 4, focus: "Deload — 60% intensity, active recovery", workouts: schedule.slice(0, Math.floor(schedule.length / 2)).map((s) => ({ ...s, exercises: s.exercises.map((e) => ({ ...e, sets: 2, reps: "10 (light)", rest: e.rest })) })) },
  ];

  return {
    goal,
    level,
    equipment,
    daysPerWeek,
    summary: summaries[goal] ?? summaries["General Fitness"],
    weeks,
  };
}

export default function AIPlanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, saveAIPlan, addRoutine } = useApp();
  const { getToken } = useAuth();
  const { userProfile } = state;

  const [step, setStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState(userProfile.goals[0] ?? "Build Muscle");
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel>(userProfile.level);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(userProfile.equipment);
  const [selectedDays, setSelectedDays] = useState(4);
  const [plan, setPlan] = useState<AIPlan | null>(userProfile.aiPlan);
  const [generating, setGenerating] = useState(false);
  const [viewingWeek, setViewingWeek] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const totalSteps = 4;

  function toggleEquipment(e: string) {
    setSelectedEquipment((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  function handleGenerate() {
    setGenerating(true);
    setSaveState("idle");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      const p = generatePlan(selectedGoal, selectedLevel, selectedEquipment.length > 0 ? selectedEquipment : ["Bodyweight"], selectedDays);
      setPlan(p);
      saveAIPlan(p);
      setGenerating(false);
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1800);
  }

  async function handleSaveToRoutines() {
    if (!plan || saveState === "saving" || saveState === "saved") return;
    const week = plan.weeks[viewingWeek];
    if (!week || week.workouts.length === 0) {
      setSaveState("error");
      return;
    }

    const payloads = week.workouts
      .filter((w) => w.exercises && w.exercises.length > 0)
      .map((w) => workoutToPayload(w.name, w.exercises));

    if (payloads.some((p) => p === null)) {
      console.warn("[ai-plan] one or more workout payloads failed Zod validation — aborting save");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const results = await Promise.all(
        (payloads as AIRoutinePayload[]).map((payload) =>
          fetch(`${API_BASE}/api/routines`, {
            method: "POST",
            headers,
            body: JSON.stringify({ userId: userProfile.id, routine: payload }),
          })
        )
      );

      const allOk = results.every((r) => r.ok || r.status === 201);
      if (!allOk) {
        const statuses = results.map((r) => r.status).join(", ");
        console.warn(`[ai-plan] some routine saves failed (statuses: ${statuses})`);
        setSaveState("error");
        return;
      }

      for (const payload of payloads as AIRoutinePayload[]) {
        addRoutine(payloadToLocalRoutine(payload, plan.equipment));
      }

      setSaveState("saved");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn("[ai-plan] routine save error:", err);
      setSaveState("error");
    }
  }

  const STEPS = [
    {
      title: "What is your primary goal?",
      subtitle: "We will build your entire plan around this",
      content: (
        <View style={{ gap: 10 }}>
          {GOALS.map((g) => (
            <Pressable
              key={g}
              onPress={() => setSelectedGoal(g)}
              style={[
                styles.optionCard,
                { backgroundColor: selectedGoal === g ? colors.primary + "22" : colors.card, borderColor: selectedGoal === g ? colors.primary : colors.border },
              ]}
            >
              <Feather name={selectedGoal === g ? "check-circle" : "circle"} size={20} color={selectedGoal === g ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.optionText, { color: selectedGoal === g ? colors.primary : colors.foreground }]}>{g}</Text>
            </Pressable>
          ))}
        </View>
      ),
    },
    {
      title: "What is your experience level?",
      subtitle: "Be honest — this determines exercise selection and volume",
      content: (
        <View style={{ gap: 10 }}>
          {LEVELS.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => setSelectedLevel(l.id)}
              style={[
                styles.optionCard,
                { backgroundColor: selectedLevel === l.id ? colors.primary + "22" : colors.card, borderColor: selectedLevel === l.id ? colors.primary : colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: selectedLevel === l.id ? colors.primary : colors.foreground }]}>{l.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{l.desc}</Text>
              </View>
              <Feather name={selectedLevel === l.id ? "check-circle" : "circle"} size={20} color={selectedLevel === l.id ? colors.primary : colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      ),
    },
    {
      title: "What equipment do you have?",
      subtitle: "Select everything available to you",
      content: (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {EQUIPMENT_OPTIONS.map((e) => {
            const selected = selectedEquipment.includes(e);
            return (
              <Pressable
                key={e}
                onPress={() => toggleEquipment(e)}
                style={[
                  styles.equipChip,
                  { backgroundColor: selected ? colors.primary + "22" : colors.card, borderColor: selected ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.equipChipText, { color: selected ? colors.primary : colors.mutedForeground }]}>{e}</Text>
                {selected && <Feather name="check" size={14} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      ),
    },
    {
      title: "How many days per week?",
      subtitle: "Choose a schedule you can commit to consistently",
      content: (
        <View style={{ gap: 10 }}>
          {DAYS_OPTIONS.map((d) => (
            <Pressable
              key={d}
              onPress={() => setSelectedDays(d)}
              style={[
                styles.optionCard,
                { backgroundColor: selectedDays === d ? colors.primary + "22" : colors.card, borderColor: selectedDays === d ? colors.primary : colors.border },
              ]}
            >
              <Text style={[styles.optionText, { color: selectedDays === d ? colors.primary : colors.foreground }]}>{d} days / week</Text>
              <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                {d === 3 ? "Full body approach, ideal for beginners" : d === 4 ? "Upper/Lower split, great for intermediate" : d === 5 ? "Push/Pull/Legs, classic split" : "PPL + extra volume days"}
              </Text>
              <Feather name={selectedDays === d ? "check-circle" : "circle"} size={20} color={selectedDays === d ? colors.primary : colors.mutedForeground} />
            </Pressable>
          ))}
        </View>
      ),
    },
  ];

  if (generating) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <View style={[styles.generatingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="cpu" size={40} color={colors.primary} />
          <Text style={[styles.generatingTitle, { color: colors.foreground }]}>Generating Your Plan</Text>
          <Text style={[styles.generatingDesc, { color: colors.mutedForeground }]}>
            Analyzing your {selectedGoal.toLowerCase()} goal, {selectedLevel} level, and {selectedEquipment.length} equipment types...
          </Text>
          <View style={[styles.loadingBar, { backgroundColor: colors.border }]}>
            <View style={[styles.loadingFill, { backgroundColor: colors.primary }]} />
          </View>
        </View>
      </View>
    );
  }

  if (step === 4 && plan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.planHeader, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 14 }}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planTitle, { color: colors.foreground }]}>{plan.goal} Plan</Text>
            <Text style={[styles.planMeta, { color: colors.mutedForeground }]}>
              {plan.level} · {plan.daysPerWeek}x/week · {plan.weeks.length} weeks
            </Text>
          </View>
          <Pressable onPress={() => setStep(0)} style={[styles.regenBtn, { borderColor: colors.border, marginRight: 8 }]}>
            <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            <Text style={[styles.regenText, { color: colors.mutedForeground }]}>Redo</Text>
          </Pressable>
          <Pressable
            onPress={handleSaveToRoutines}
            disabled={saveState === "saved" || saveState === "saving"}
            style={[
              styles.regenBtn,
              {
                borderColor: saveState === "saved" ? "#22c55e" : saveState === "error" ? "#ef4444" : colors.primary,
                backgroundColor: saveState === "saved" ? "#22c55e22" : saveState === "error" ? "#ef444422" : colors.primary + "18",
              },
            ]}
          >
            <Feather
              name={saveState === "saved" ? "check" : saveState === "error" ? "alert-circle" : "bookmark"}
              size={14}
              color={saveState === "saved" ? "#22c55e" : saveState === "error" ? "#ef4444" : colors.primary}
            />
            <Text style={[styles.regenText, { color: saveState === "saved" ? "#22c55e" : saveState === "error" ? "#ef4444" : colors.primary }]}>
              {saveState === "saved" ? "Saved!" : saveState === "error" ? "Error" : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>{plan.summary}</Text>
          </View>

          {saveState === "saved" && (
            <View style={[styles.saveBanner, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
              <Feather name="check-circle" size={15} color="#22c55e" />
              <Text style={[styles.saveBannerText, { color: "#22c55e" }]}>
                {plan.weeks[viewingWeek].workouts.length} routines saved to your Training tab
              </Text>
            </View>
          )}
          {saveState === "error" && (
            <View style={[styles.saveBanner, { backgroundColor: "#ef444418", borderColor: "#ef444444" }]}>
              <Feather name="alert-circle" size={15} color="#ef4444" />
              <Text style={[styles.saveBannerText, { color: "#ef4444" }]}>
                Could not save routines — plan may be incomplete
              </Text>
            </View>
          )}

          {/* Week tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }} contentContainerStyle={{ gap: 8 }}>
            {plan.weeks.map((w, i) => (
              <Pressable
                key={w.weekNumber}
                onPress={() => { setViewingWeek(i); setSaveState("idle"); }}
                style={[
                  styles.weekTab,
                  { backgroundColor: viewingWeek === i ? colors.primary : colors.card, borderColor: viewingWeek === i ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.weekTabText, { color: viewingWeek === i ? "#fff" : colors.mutedForeground }]}>Week {w.weekNumber}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.weekFocusBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="target" size={14} color={colors.primary} />
            <Text style={[styles.weekFocusText, { color: colors.foreground }]}>{plan.weeks[viewingWeek].focus}</Text>
          </View>

          {plan.weeks[viewingWeek].workouts.map((workout, wi) => (
            <View key={wi} style={[styles.workoutBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.workoutBlockHeader}>
                <View style={[styles.dayBadge, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.dayText, { color: colors.primary }]}>{workout.day}</Text>
                </View>
                <Text style={[styles.workoutName, { color: colors.foreground }]}>{workout.name}</Text>
              </View>
              {workout.exercises.map((ex, ei) => (
                <View key={ei} style={[styles.exRow, ei < workout.exercises.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exName, { color: colors.foreground }]}>{ex.name}</Text>
                    {ex.note && <Text style={[styles.exNote, { color: colors.primary }]}>{ex.note}</Text>}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.exSets, { color: colors.foreground }]}>{ex.sets}x{ex.reps}</Text>
                    <Text style={[styles.exRest, { color: colors.mutedForeground }]}>{ex.rest}s rest</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  const currentStep = STEPS[step];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.stepHeader, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)}>
          <Feather name={step === 0 ? "x" : "arrow-left"} size={22} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.progressDots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i <= step ? colors.primary : colors.border, width: i === step ? 20 : 8 },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.stepCount, { color: colors.mutedForeground }]}>{step + 1}/{totalSteps}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 28, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.stepQuestion, { color: colors.foreground }]}>{currentStep.title}</Text>
        <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{currentStep.subtitle}</Text>
        <View style={{ marginTop: 24 }}>{currentStep.content}</View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => step < totalSteps - 1 ? setStep(step + 1) : handleGenerate()}
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.nextBtnText}>{step < totalSteps - 1 ? "Continue" : "Generate My Plan"}</Text>
          <Feather name={step < totalSteps - 1 ? "arrow-right" : "cpu"} size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stepHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 8 },
  progressDots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  stepCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stepQuestion: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, lineHeight: 32 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 8, lineHeight: 22 },
  optionCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  optionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  equipChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  equipChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
  nextBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  generatingCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 16, marginHorizontal: 32 },
  generatingTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  generatingDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  loadingBar: { width: "100%", height: 4, borderRadius: 2, overflow: "hidden" },
  loadingFill: { height: "100%", width: "70%", borderRadius: 2 },
  planHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  planTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  planMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  regenBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  regenText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  summaryText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  weekTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  weekTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  weekFocusBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  weekFocusText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20 },
  workoutBlock: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  workoutBlockHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  dayBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dayText: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  workoutName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  exRow: { paddingVertical: 10, flexDirection: "row", alignItems: "flex-start" },
  exName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  exNote: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  exSets: { fontSize: 13, fontFamily: "Inter_700Bold" },
  exRest: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  saveBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 10 },
  saveBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
});
