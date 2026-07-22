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
  | "activities"
  | "lift_days"
  | "run_days"
  | "review";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ACTIVITY_OPTIONS = ["Strength Training", "Running", "Cycling", "Yoga", "HIIT", "Swimming", "Climbing"];
const AVAILABILITY_OPTIONS = ["Weekday Mornings", "Weekday Evenings", "Weekends", "Lunch Breaks"];

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
] as const;

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
  const [age, setAge] = useState(userProfile.age ? String(userProfile.age) : "25");
  const [heightFt, setHeightFt] = useState(
    userProfile.heightFt ? String(userProfile.heightFt) : "5"
  );
  const [heightIn, setHeightIn] = useState(
    userProfile.heightIn ? String(userProfile.heightIn) : "9"
  );
  const [weightLbs, setWeightLbs] = useState(
    userProfile.weightLbs ? String(userProfile.weightLbs) : "170"
  );
  const [activity, setActivity] = useState<string | undefined>(userProfile.activityLevel ?? undefined);
  const [goal, setGoal] = useState<string | undefined>(userProfile.primaryGoal ?? undefined);
  const [pace, setPace] = useState<number>(userProfile.weeklyPaceLbs ?? 0.5);
  const [activities, setActivities] = useState<Set<string>>(
    () => new Set(userProfile.activities ?? [])
  );
  const [availability, setAvailability] = useState<Set<string>>(
    () => new Set(userProfile.availability ?? [])
  );
  const [liftDays, setLiftDays] = useState<Set<string>>(
    () => new Set(userProfile.liftDays ?? [])
  );
  const [runDays, setRunDays] = useState<Set<string>>(
    () => new Set(userProfile.runDays ?? [])
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Steps are dynamic: run_days only appears if Running is selected
  const STEPS = useMemo<OnboardingStep[]>(() => {
    const base: OnboardingStep[] = [
      "sex", "age", "height", "weight", "activity", "goal", "pace",
      "activities", "lift_days",
    ];
    if (activities.has("Running")) base.push("run_days");
    base.push("review");
    return base;
  }, [activities]);

  const currentStep = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const canAdvance = useMemo(() => {
    switch (currentStep) {
      case "sex": return !!sex;
      case "age": return !!age && parseInt(age) >= 10 && parseInt(age) <= 120;
      case "height": {
        const ft = parseInt(heightFt);
        const inc = parseInt(heightIn);
        return ft >= 2 && ft <= 8 && inc >= 0 && inc <= 11;
      }
      case "weight": {
        const w = parseInt(weightLbs);
        return w >= 50 && w <= 700;
      }
      case "activity": return !!activity;
      case "goal": return !!goal;
      case "pace": return pace >= 0 && pace <= 5;
      case "activities": return true;
      case "lift_days": return liftDays.size > 0;
      case "run_days": return true;
      case "review": return true;
    }
  }, [currentStep, sex, age, heightFt, heightIn, weightLbs, activity, goal, pace, liftDays]);

  const advance = useCallback(() => {
    if (!canAdvance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      submit();
    } else {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }
  }, [canAdvance, isLast, STEPS.length]);

  const back = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const submit = useCallback(async () => {
    setSaving(true);
    setSubmitError(null);
    try {
      const payload = {
        biologicalSex: sex!,
        heightFt: parseInt(heightFt),
        heightIn: parseInt(heightIn),
        weightLbs: parseInt(weightLbs),
        age: parseInt(age),
        activityLevel: activity!,
        primaryGoal: goal!,
        weeklyPaceLbs: pace,
        activities: Array.from(activities),
        availability: Array.from(availability),
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
          heightFt: payload.heightFt,
          heightIn: payload.heightIn,
          weightLbs: payload.weightLbs,
          age: payload.age,
          activityLevel: payload.activityLevel,
          primaryGoal: payload.primaryGoal,
          weeklyPaceLbs: payload.weeklyPaceLbs,
          activities: payload.activities,
          availability: payload.availability,
          // Workout day preferences — stored in local profile (not DB)
          liftDays: Array.from(liftDays),
          runDays: Array.from(runDays),
          hasCompletedOnboarding: true,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)");
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setSubmitError("Couldn't save your info. Please check your connection and try again.");
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError("Couldn't save your info. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }, [sex, heightFt, heightIn, weightLbs, age, activity, goal, pace, activities, availability, liftDays, runDays, userProfile.id, updateProfile, router, getToken]);

  function toggleActivity(item: string) {
    setActivities((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function toggleAvailability(item: string) {
    setAvailability((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function toggleLiftDay(day: string) {
    setLiftDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function toggleRunDay(day: string) {
    setRunDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
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
                    name="user"
                    size={22}
                    color={sex === s ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[styles.optionLabel, { color: sex === s ? colors.primary : colors.foreground }]}>
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

        {/* ── Height (imperial) ── */}
        {currentStep === "height" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your height?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Used to calculate your BMR accurately.
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.inputWrap, { flexDirection: "column", alignItems: "center" }]}>
                <TextInput
                  style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, width: 100 }]}
                  value={heightFt}
                  onChangeText={(t) => { setHeightFt(t.replace(/[^0-9]/g, "").slice(0, 1)); }}
                  keyboardType="number-pad"
                  maxLength={1}
                  placeholder="5"
                  placeholderTextColor={colors.mutedForeground}
                  selectTextOnFocus
                  autoFocus
                />
                <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>ft</Text>
              </View>
              <Text style={{ fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground }}>'</Text>
              <View style={[styles.inputWrap, { flexDirection: "column", alignItems: "center" }]}>
                <TextInput
                  style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card, width: 100 }]}
                  value={heightIn}
                  onChangeText={(t) => { setHeightIn(t.replace(/[^0-9]/g, "").slice(0, 2)); }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="9"
                  placeholderTextColor={colors.mutedForeground}
                  selectTextOnFocus
                />
                <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>in</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Weight (imperial) ── */}
        {currentStep === "weight" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What is your current weight?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Weight is a key input for BMR and macro calculations.
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.bigInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={weightLbs}
                onChangeText={(t) => { setWeightLbs(t.replace(/[^0-9]/g, "").slice(0, 3)); }}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="170"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
                autoFocus
              />
              <Text style={[styles.bigInputUnit, { color: colors.mutedForeground }]}>lbs</Text>
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
              How fast do you want to {goal === "lose_fat" ? "lose" : goal === "build_muscle" ? "gain" : "adjust"}?
            </Text>
            <View style={styles.optionsColumn}>
              {[
                { val: 0.25, label: "0.25 lb/week", sub: "Conservative — slow and steady" },
                { val: 0.5, label: "0.5 lb/week", sub: "Moderate — most people start here" },
                { val: 1, label: "1 lb/week", sub: "Aggressive — requires strict consistency" },
              ].map((p) => (
                <Pressable
                  key={p.val}
                  onPress={() => { setPace(p.val); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: pace === p.val ? colors.primary + "22" : colors.card,
                      borderColor: pace === p.val ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: pace === p.val ? colors.primary : colors.foreground }]}>
                      {p.label}
                    </Text>
                    <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>{p.sub}</Text>
                  </View>
                  {pace === p.val && <Feather name="check-circle" size={20} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* ── Activities ── */}
        {currentStep === "activities" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>What activities do you enjoy?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Select everything that applies. This shapes your schedule and helps find others like you.
            </Text>
            <View style={styles.chipWrap}>
              {ACTIVITY_OPTIONS.map((a) => {
                const active = activities.has(a);
                return (
                  <Pressable
                    key={a}
                    onPress={() => { toggleActivity(a); Haptics.selectionAsync(); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary + "22" : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {active && <Feather name="check" size={13} color={colors.primary} />}
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.foreground }]}>
                      {a}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Lift Days ── */}
        {currentStep === "lift_days" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Which days do you want to lift?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Pick at least one. Your weekly schedule will repeat these by default.
            </Text>
            <View style={styles.optionsColumn}>
              {WEEKDAYS.map((day) => {
                const selected = liftDays.has(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => { toggleLiftDay(day); Haptics.selectionAsync(); }}
                    style={[
                      styles.dayRow,
                      {
                        backgroundColor: selected ? colors.primary + "22" : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.optionLabel, { color: selected ? colors.primary : colors.foreground }]}>
                      {day}
                    </Text>
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={20}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Run Days (only if Running selected) ── */}
        {currentStep === "run_days" && (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Which days do you want to run?</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Optional — tap any day. We'll block these off from strength workouts.
            </Text>
            <View style={styles.optionsColumn}>
              {WEEKDAYS.map((day) => {
                const selected = runDays.has(day);
                const isLift = liftDays.has(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => { toggleRunDay(day); Haptics.selectionAsync(); }}
                    style={[
                      styles.dayRow,
                      {
                        backgroundColor: selected ? colors.primary + "22" : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: isLift ? 0.45 : 1,
                      },
                    ]}
                    disabled={isLift}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: selected ? colors.primary : colors.foreground }]}>
                        {day}
                      </Text>
                      {isLift && (
                        <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>Already a lift day</Text>
                      )}
                    </View>
                    <Feather
                      name={selected ? "check-circle" : "circle"}
                      size={20}
                      color={selected ? colors.primary : colors.mutedForeground}
                    />
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
              <ReviewRow label="Height" value={`${heightFt}' ${heightIn}"`} />
              <ReviewRow label="Weight" value={`${weightLbs} lbs`} />
              <ReviewRow label="Activity" value={ACTIVITY_LEVELS.find((a) => a.key === activity)?.label ?? ""} />
              <ReviewRow label="Goal" value={GOALS.find((g) => g.key === goal)?.label ?? ""} />
              <ReviewRow label="Pace" value={`${pace} lb/week`} />
              <ReviewRow label="Lift days" value={liftDays.size > 0 ? Array.from(liftDays).join(", ") : "None"} />
              {activities.has("Running") && (
                <ReviewRow label="Run days" value={runDays.size > 0 ? Array.from(runDays).join(", ") : "None"} last />
              )}
              {!activities.has("Running") && (
                <ReviewRow label="Activities" value={activities.size > 0 ? `${activities.size} selected` : "None"} last />
              )}
            </View>
            {submitError ? (
              <Text style={{ color: "#ef4444", fontFamily: "Inter_500Medium", fontSize: 13, marginTop: 12, textAlign: "center" }}>
                {submitError}
              </Text>
            ) : null}
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
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  reviewLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1, textAlign: "right", marginLeft: 12 },
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
