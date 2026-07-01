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
import type { AIPlan, AIRoutinePayload, ExperienceLevel, Exercise, Routine } from "@/context/AppContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const clientRoutineExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
  restSeconds: z.number().int().nonnegative(),
});

const clientAiRoutinePayloadSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(clientRoutineExerciseSchema).min(1),
});

function validateAiRoutinePayload(payload: unknown): AIRoutinePayload | null {
  const result = clientAiRoutinePayloadSchema.safeParse(payload);
  if (!result.success) {
    console.warn("[ai-plan] ai_routine_payload failed client validation:", result.error.issues);
    return null;
  }
  return result.data as AIRoutinePayload;
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

  async function handleGenerate() {
    setGenerating(true);
    setSaveState("idle");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const equipment = selectedEquipment.length > 0 ? selectedEquipment : ["Bodyweight"];
      const resp = await fetch(`${API_BASE}/api/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: selectedGoal, level: selectedLevel, equipment, daysPerWeek: selectedDays }),
      });
      if (!resp.ok) {
        console.warn("[ai-plan] plan generation failed:", resp.status);
        setGenerating(false);
        return;
      }
      const data = (await resp.json()) as AIPlan;
      setPlan(data);
      saveAIPlan(data);
      setStep(4);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn("[ai-plan] plan generation error:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveToRoutines() {
    if (!plan || saveState === "saving" || saveState === "saved") return;

    const validPayload = validateAiRoutinePayload(plan.ai_routine_payload);
    if (!validPayload) {
      console.warn("[ai-plan] ai_routine_payload absent or invalid — cannot save");
      setSaveState("error");
      return;
    }

    setSaveState("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getToken();
      const resp = await fetch(`${API_BASE}/api/routines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(validPayload),
      });

      if (!resp.ok) {
        console.warn("[ai-plan] routine save failed:", resp.status);
        setSaveState("error");
        return;
      }

      addRoutine(payloadToLocalRoutine(validPayload, plan.equipment));
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
          {validateAiRoutinePayload(plan.ai_routine_payload) !== null && (
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
          )}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.summaryCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>{plan.explanation}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10, flexDirection: "column", gap: 8 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="zap" size={16} color={colors.primary} />
              <Text style={[styles.summaryText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Daily Nutrition Targets</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={[styles.macroChip, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.macroValue, { color: colors.primary }]}>{plan.nutrition.dailyCalories}</Text>
                <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>kcal</Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: "#ef444418" }]}>
                <Text style={[styles.macroValue, { color: "#ef4444" }]}>{plan.nutrition.proteinG}g</Text>
                <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>protein</Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: "#f59e0b18" }]}>
                <Text style={[styles.macroValue, { color: "#f59e0b" }]}>{plan.nutrition.carbsG}g</Text>
                <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>carbs</Text>
              </View>
              <View style={[styles.macroChip, { backgroundColor: "#22c55e18" }]}>
                <Text style={[styles.macroValue, { color: "#22c55e" }]}>{plan.nutrition.fatG}g</Text>
                <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>fat</Text>
              </View>
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Feather name="tool" size={16} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>{plan.equipment_strategy}</Text>
          </View>

          {saveState === "saved" && (
            <View style={[styles.saveBanner, { backgroundColor: "#22c55e18", borderColor: "#22c55e44" }]}>
              <Feather name="check-circle" size={15} color="#22c55e" />
              <Text style={[styles.saveBannerText, { color: "#22c55e" }]}>
                Routine saved to your Training tab
              </Text>
            </View>
          )}
          {saveState === "error" && (
            <View style={[styles.saveBanner, { backgroundColor: "#ef444418", borderColor: "#ef444444" }]}>
              <Feather name="alert-circle" size={15} color="#ef4444" />
              <Text style={[styles.saveBannerText, { color: "#ef4444" }]}>
                Could not save routine — please try again
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
  macroChip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", minWidth: 64 },
  macroValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  macroLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
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
