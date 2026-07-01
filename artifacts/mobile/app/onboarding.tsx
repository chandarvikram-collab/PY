import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@clerk/expo";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type OnboardingStep =
  | "sex"
  | "age"
  | "height"
  | "weight"
  | "activity"
  | "goal"
  | "pace"
  | "equipment"
  | "review";

const STEPS: OnboardingStep[] = [
  "sex",
  "age",
  "height",
  "weight",
  "activity",
  "goal",
  "pace",
  "equipment",
  "review",
];

const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary", sub: "Desk job, little exercise" },
  { key: "light", label: "Lightly Active", sub: "1–2 days/week light exercise" },
  { key: "moderate", label: "Moderately Active", sub: "3–4 days/week moderate exercise" },
  { key: "active", label: "Very Active", sub: "5–6 days/week hard exercise" },
  { key: "very_active", label: "Extremely Active", sub: "Physical job + daily training" },
] as const;

const GOALS = [
  { key: "lose_fat", label: "Lose Fat", sub: "Caloric deficit, preserve muscle" },
  { key: "maintain", label: "Maintain", sub: "Keep current weight and composition" },
  { key: "build_muscle", label: "Build Muscle", sub: "Caloric surplus, progressive overload" },
  { key: "improve_endurance", label: "Improve Endurance", sub: "Fuel performance, recover better" },
] as const;

const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Cable Machine",
  "Smith Machine",
  "Resistance Bands",
  "Pull-Up Bar",
  "Bench",
  "Squat Rack",
  "Treadmill",
  "Rowing Machine",
  "Exercise Bike",
  "None / Bodyweight",
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateProfile } = useApp();
  const { userProfile } = state;
  const { getToken } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const [sex, setSex] = useState<"male" | "female" | undefined>(
    userProfile.biologicalSex === "male" || userProfile.biologicalSex === "female"
      ? userProfile.biologicalSex
      : undefined
  );
  const [age, setAge] = useState(userProfile.biologicalSex ? "" : "25");
  const [heightCm, setHeightCm] = useState(userProfile.heightCm ? String(userProfile.heightCm) : "");
  const [weightKg, setWeightKg] = useState(userProfile.weightKg ? String(userProfile.weightKg) : "");
  const [activity, setActivity] = useState<string | undefined>(userProfile.activityLevel ?? undefined);
  const [goal, setGoal] = useState<string | undefined>(userProfile.primaryGoal ?? undefined);
  const [pace, setPace] = useState(userProfile.weeklyPaceLbs ? String(userProfile.weeklyPaceLbs) : "1");
  const [equipment, setEquipment] = useState<Set<string>>(
    () => new Set(userProfile.equipment.length > 0 ? userProfile.equipment : ["Barbell", "Dumbbell"])
  );

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case "sex": return !!sex;
      case "age": return !!age && parseInt(age) >= 10 && parseInt(age) <= 120;
      case "height": return !!heightCm && parseInt(heightCm) >= 50 && parseInt(heightCm) <= 300;
      case "weight": return !!weightKg && parseInt(weightKg) >= 20 && parseInt(weightKg) <= 300;
      case "activity": return !!activity;
      case "goal": return !!goal;
      case "pace": return !!pace && parseInt(pace) >= 0 && parseInt(pace) <= 5;
      case "equipment": return equipment.size > 0;
      case "review": return true;
    }
  }, [currentStep, sex, age, heightCm, weightKg, activity, goal, pace, equipment]);

  const advance = useCallback(() => {
    if (!canAdvance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      submit();
    } else {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }
  }, [canAdvance, isLast]);

  const back = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        biologicalSex: sex!,
        heightCm: parseInt(heightCm),
        weightKg: parseInt(weightKg),
        age: parseInt(age),
        activityLevel: activity!,
        primaryGoal: goal!,
        weeklyPaceLbs: parseInt(pace),
        equipment: Array.from(equipment),
      };

      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/users/${userProfile.id}/nutrition-goals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        updateProfile({
          calorieGoal: data.dailyCalories,
          proteinGoal: data.proteinG,
          carbGoal: data.carbsG,
          fatGoal: data.fatG,
          biologicalSex: payload.biologicalSex,
          heightCm: payload.heightCm,
          weightKg: payload.weightKg,
          activityLevel: payload.activityLevel,
          primaryGoal: payload.primaryGoal,
          weeklyPaceLbs: payload.weeklyPaceLbs,
          equipment: payload.equipment,
          hasCompletedOnboarding: true,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [sex, heightCm, weightKg, age, activity, goal, pace, equipment, userProfile.id, updateProfile, router, getToken]);

  function toggleEquipment(item: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((stepIndex + 1) / STEPS.length) * 100}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.stepCounter, { color: colors.mutedForeground }]}>
          Step {stepIndex + 1} of {STEPS.length}
        </Text>

        {/* ── Sex ── */}
        {currentStep === "sex" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your biological sex?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              This is used to calculate your BMR with the Mifflin-St Jeor equation.
            </Text>
            <View style={styles.optionsColumn}>
              {(["male", "female"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { setSex(s); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: sex === s ? colors.primary + "22" : colors.card,
                      borderColor: sex === s ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Feather
                    name={s === "male" ? "user" : "user"}
                    size={22}
                    color={sex === s ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: sex === s ? colors.primary : colors.foreground },
                    ]}
                  >
                    {s === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Age ── */}
        {currentStep === "age" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>How old are you?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Age affects your basal metabolic rate.
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="25"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                autoFocus
              />
              <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>years</Text>
            </View>
          </>
        )}

        {/* ── Height ── */}
        {currentStep === "height" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your height?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Used to calculate your BMR accurately.
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="175"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                autoFocus
              />
              <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>cm</Text>
            </View>
          </>
        )}

        {/* ── Weight ── */}
        {currentStep === "weight" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your current weight?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Weight is a key input for BMR and macro calculations.
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="75"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                autoFocus
              />
              <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>kg</Text>
            </View>
          </>
        )}

        {/* ── Activity ── */}
        {currentStep === "activity" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>How active are you?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Activity level determines your TDEE multiplier.
            </Text>
            <View style={styles.optionsColumn}>
              {ACTIVITY_LEVELS.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={() => { setActivity(a.key); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: activity === a.key ? colors.primary + "22" : colors.card,
                      borderColor: activity === a.key ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: activity === a.key ? colors.primary : colors.foreground }]}>
                      {a.label}
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{a.sub}</Text>
                  </View>
                  {activity === a.key && <Feather name="check-circle" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Goal ── */}
        {currentStep === "goal" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your primary goal?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              This adjusts your calorie target for surplus or deficit.
            </Text>
            <View style={styles.optionsColumn}>
              {GOALS.map((g) => (
                <Pressable
                  key={g.key}
                  onPress={() => { setGoal(g.key); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: goal === g.key ? colors.primary + "22" : colors.card,
                      borderColor: goal === g.key ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: goal === g.key ? colors.primary : colors.foreground }]}>
                      {g.label}
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{g.sub}</Text>
                  </View>
                  {goal === g.key && <Feather name="check-circle" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Pace ── */}
        {currentStep === "pace" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Weekly pace</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              How fast do you want to {goal === "lose_fat" ? "lose" : goal === "build_muscle" ? "gain" : "adjust"}? 1 lb/week is a safe, sustainable target.
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={pace}
                onChangeText={setPace}
                keyboardType="number-pad"
                maxLength={1}
                placeholder="1"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                autoFocus
              />
              <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>lb/week</Text>
            </View>
          </>
        )}

        {/* ── Equipment ── */}
        {currentStep === "equipment" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What equipment do you have?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              AI plans will only include exercises using equipment you select.
            </Text>
            <View style={styles.chipWrap}>
              {EQUIPMENT_OPTIONS.map((e) => {
                const active = equipment.has(e);
                return (
                  <Pressable
                    key={e}
                    onPress={() => { toggleEquipment(e); Haptics.selectionAsync(); }}
                    style={[
                      styles.equipChip,
                      {
                        backgroundColor: active ? colors.primary + "22" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.equipChipText, { color: active ? colors.primary : colors.foreground }]}>
                      {e}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Review ── */}
        {currentStep === "review" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Review your profile</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We'll calculate your personalized calorie and macro targets based on these inputs.
            </Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ReviewRow label="Sex" value={sex === "male" ? "Male" : "Female"} />
              <ReviewRow label="Age" value={`${age} years`} />
              <ReviewRow label="Height" value={`${heightCm} cm`} />
              <ReviewRow label="Weight" value={`${weightKg} kg`} />
              <ReviewRow label="Activity" value={ACTIVITY_LEVELS.find((a) => a.key === activity)?.label ?? ""} />
              <ReviewRow label="Goal" value={GOALS.find((g) => g.key === goal)?.label ?? ""} />
              <ReviewRow label="Pace" value={`${pace} lb/week`} />
              <ReviewRow label="Equipment" value={`${equipment.size} selected`} last />
            </View>
          </>
        )}

        {/* Bottom nav */}
        <View style={styles.bottomBar}>
          {!isFirst && (
            <Pressable
              onPress={back}
              style={({ pressed }) => [styles.backBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="arrow-left" size={18} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            onPress={advance}
            disabled={!canAdvance || saving}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || !canAdvance || saving ? 0.7 : 1,
                marginLeft: isFirst ? 0 : 12,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isLast ? "Calculate Targets" : "Continue"}
                </Text>
                {!isLast && <Feather name="arrow-right" size={18} color="#fff" />}
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.reviewRow, { borderBottomColor: colors.border, borderBottomWidth: last ? 0 : 0.5 }]}>
      <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: { height: 4, backgroundColor: "#2A2A28", borderRadius: 2, marginBottom: 10 },
  progressFill: { height: "100%", borderRadius: 2 },
  stepCounter: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 24 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 32, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 24 },
  optionsColumn: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  optionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigInput: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: 140,
    textAlign: "center",
  },
  bigInputUnit: { fontSize: 18, fontFamily: "Inter_500Medium" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  equipChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  equipChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  reviewLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 12,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
