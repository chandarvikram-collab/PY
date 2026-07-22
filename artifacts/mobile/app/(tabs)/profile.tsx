import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth as useClerkAuth } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-chart-kit";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const CHART_WIDTH = Dimensions.get("window").width - 36;

const AVATAR_COLORS = ["#8b5cf6","#3b82f6","#22c55e","#f59e0b","#ef4444","#06b6d4","#ec4899","#f97316"];

const GOAL_LABELS: Record<string, string> = {
  lose_fat: "Lose Fat",
  maintain: "Maintain",
  build_muscle: "Build Muscle",
  improve_endurance: "Improve Endurance",
};
function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ initials, color, size = 72, imageUrl }: { initials: string; color: string; size?: number; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color, overflow: "hidden" }}>
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "33", borderWidth: 2.5, borderColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color, fontSize: size * 0.35, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger, value }: { icon: string; label: string; onPress?: () => void; danger?: boolean; value?: string }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={({ pressed }) => [styles.menuRow, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: danger ? "#ef444422" : colors.muted }]}>
        <Feather name={icon as any} size={18} color={danger ? "#ef4444" : colors.mutedForeground} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? "#ef4444" : colors.foreground }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function AnalyticsCard({ workoutHistory, colors }: { workoutHistory: { date: string; volume: number; duration: number }[]; colors: ReturnType<typeof useColors> }) {
  if (workoutHistory.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border, alignItems: "center", paddingVertical: 20 }]}>
        <Feather name="bar-chart-2" size={22} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}>
          Log a workout to see your analytics
        </Text>
      </View>
    );
  }

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks: { label: string; volume: number; sessions: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = now - (i + 1) * weekMs;
    const weekEnd = now - i * weekMs;
    const inWeek = workoutHistory.filter((w) => {
      const t = new Date(w.date).getTime();
      return t >= weekStart && t < weekEnd;
    });
    weeks.push({
      label: i === 0 ? "This wk" : `${i}wk ago`,
      volume: inWeek.reduce((sum, w) => sum + w.volume, 0),
      sessions: inWeek.length,
    });
  }

  const avgDuration = Math.round(
    workoutHistory.reduce((sum, w) => sum + w.duration, 0) / workoutHistory.length / 60,
  );
  const totalVolume = workoutHistory.reduce((sum, w) => sum + w.volume, 0);
  const maxWeekVolume = Math.max(1, ...weeks.map((w) => w.volume));

  return (
    <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <View style={{ flexDirection: "row", marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: "Inter_700Bold" }}>
            {totalVolume.toLocaleString()} lbs
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Total volume lifted</Text>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: "Inter_700Bold" }}>
            {avgDuration} min
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Avg session length</Text>
        </View>
      </View>

      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 8 }}>
        Weekly volume trend
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 10 }}>
        {weeks.map((w) => (
          <View key={w.label} style={{ flex: 1, alignItems: "center" }}>
            <View
              style={{
                width: "100%",
                height: Math.max(4, (w.volume / maxWeekVolume) * 64),
                backgroundColor: colors.primary,
                borderRadius: 4,
              }}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 6 }}>{w.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type GoalField = { label: string; value: string; setValue: (v: string) => void; unit: string; color: string };

type ProgressPhotoEntry = { id: string; date: string; imageUrl: string | null; weightKg: number; notes: string };
type WeightEntry = { id: string; date: string; weightKg: number };

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateProfile, fetchFollowing, isPremium, premiumStatusLoading } = useApp();
  const { userProfile, workoutHistory, challenges } = state;
  const [showFriends, setShowFriends] = useState(false);
  const [followingList, setFollowingList] = useState<Array<{ id: string; name: string; username: string; level: string; streak: number; totalWorkouts: number; totalPoints: number; weeklyWorkouts: number; rank: number }>>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { getToken } = useClerkAuth();

  // ── Progress tracking state ────────────────────────────────────────────────
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressPhotosData, setProgressPhotosData] = useState<ProgressPhotoEntry[]>([]);
  const [weightHistoryData, setWeightHistoryData] = useState<WeightEntry[]>([]);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [draftWeight, setDraftWeight] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftPhoto, setDraftPhoto] = useState<{ uri: string; contentType: string; name: string } | null>(null);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [progressSubmitError, setProgressSubmitError] = useState<string | null>(null);

  // ── Progress fetch & submit ────────────────────────────────────────────────
  async function fetchProgressEntries() {
    setProgressLoading(true);
    setProgressError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/progress/entries`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProgressPhotosData(data.progressPhotos ?? []);
      setWeightHistoryData(data.weightHistory ?? []);
    } catch {
      setProgressError("Could not load progress data");
    } finally {
      setProgressLoading(false);
    }
  }

  async function submitProgressEntry() {
    const lbs = parseFloat(draftWeight);
    if (!draftWeight || isNaN(lbs) || lbs <= 0) {
      setProgressSubmitError("Please enter a valid weight");
      return;
    }
    setProgressSubmitting(true);
    setProgressSubmitError(null);
    try {
      const token = await getToken();
      const today = new Date().toISOString().slice(0, 10);
      const weightKg = lbs / 2.20462;
      const formData = new FormData();
      formData.append("date", today);
      formData.append("weightKg", String(weightKg));
      formData.append("notes", draftNotes);
      if (draftPhoto) {
        formData.append("file", { uri: draftPhoto.uri, type: draftPhoto.contentType, name: draftPhoto.name } as any);
      }
      const res = await fetch(`${API_BASE}/api/progress/entries`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to save");
      setShowAddProgress(false);
      setDraftWeight("");
      setDraftNotes("");
      setDraftPhoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchProgressEntries();
    } catch {
      setProgressSubmitError("Could not save entry. Please try again.");
    } finally {
      setProgressSubmitting(false);
    }
  }

  async function pickProgressPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setProgressSubmitError("Permission to access photos is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDraftPhoto({ uri: asset.uri, contentType: asset.mimeType ?? "image/jpeg", name: asset.fileName ?? "progress.jpg" });
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchProgressEntries();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!showFriends) return;
    setFollowingLoading(true);
    fetchFollowing()
      .then(setFollowingList)
      .finally(() => setFollowingLoading(false));
  }, [showFriends]);

  // ── Weight chart data ──────────────────────────────────────────────────────
  const chartData = [...weightHistoryData]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  const hasEnoughChartData = chartData.length >= 2;

  const labelStep = chartData.length > 6 ? Math.ceil(chartData.length / 6) : 1;
  const lineChartData = {
    labels: chartData.map((w, i) =>
      i % labelStep === 0 || i === chartData.length - 1 ? w.date.slice(5) : ""
    ),
    datasets: [
      {
        data: chartData.length > 0
          ? chartData.map((w) => parseFloat((w.weightKg * 2.20462).toFixed(1)))
          : [0],
        color: (opacity = 1) => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const userInitials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const primaryGoalLabel = userProfile.primaryGoal ? GOAL_LABELS[userProfile.primaryGoal] : undefined;

  const completedChallenges = challenges.filter((c) => c.status === "completed").length;
  const weekSessions = workoutHistory.filter((w) => {
    const d = new Date(w.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 <= 7;
  }).length;

  // ── Nutrition goal defaults (formula fallback if not yet explicitly set) ───
  const defaultCarbs = Math.round((userProfile.calorieGoal * 0.45) / 4);
  const defaultFat = Math.round((userProfile.calorieGoal * 0.3) / 9);
  const displayCarbs = userProfile.carbGoal ?? defaultCarbs;
  const displayFat = userProfile.fatGoal ?? defaultFat;

  // ── Inline editing state ───────────────────────────────────────────────────
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftCals, setDraftCals] = useState("");
  const [draftProtein, setDraftProtein] = useState("");
  const [draftCarbs, setDraftCarbs] = useState("");
  const [draftFat, setDraftFat] = useState("");

  function openEditGoals() {
    setDraftCals(String(userProfile.calorieGoal));
    setDraftProtein(String(userProfile.proteinGoal));
    setDraftCarbs(String(displayCarbs));
    setDraftFat(String(displayFat));
    setEditingGoals(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function cancelEditGoals() {
    setEditingGoals(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function saveGoals() {
    const cals = Math.max(500, parseInt(draftCals) || userProfile.calorieGoal);
    const protein = Math.max(10, parseInt(draftProtein) || userProfile.proteinGoal);
    const carbs = Math.max(0, parseInt(draftCarbs) || defaultCarbs);
    const fat = Math.max(0, parseInt(draftFat) || defaultFat);
    updateProfile({ calorieGoal: cals, proteinGoal: protein, carbGoal: carbs, fatGoal: fat });
    setEditingGoals(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const goalFields: GoalField[] = [
    { label: "Daily Calories", value: draftCals, setValue: setDraftCals, unit: "kcal", color: colors.primary },
    { label: "Protein",         value: draftProtein, setValue: setDraftProtein, unit: "g", color: "#3b82f6" },
    { label: "Carbohydrates",   value: draftCarbs, setValue: setDraftCarbs, unit: "g", color: "#f59e0b" },
    { label: "Fat",             value: draftFat, setValue: setDraftFat, unit: "g", color: "#8b5cf6" },
  ];

  const displayGoals = [
    { label: "Calories", value: userProfile.calorieGoal, unit: "kcal", color: colors.primary },
    { label: "Protein",  value: userProfile.proteinGoal, unit: "g/day", color: "#3b82f6" },
    { label: "Carbs",    value: displayCarbs,             unit: "g/day", color: "#f59e0b" },
    { label: "Fat",      value: displayFat,               unit: "g/day", color: "#8b5cf6" },
  ];

  return (
    <>
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { borderBottomColor: colors.border }]}>
        <View style={styles.heroTop}>
          <Avatar initials={userInitials} color={colors.primary} size={72} imageUrl={userProfile.imageUrl} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.heroName, { color: colors.foreground }]}>
              {userProfile.name}
            </Text>
            <Text style={[styles.heroUsername, { color: colors.mutedForeground }]}>
              @{userProfile.username}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.levelText, { color: colors.primary }]}>
                {userProfile.level.charAt(0).toUpperCase() + userProfile.level.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {userProfile.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{userProfile.bio}</Text>
        ) : null}

        <View style={styles.statsRow}>
          {[
            { val: userProfile.totalWorkouts, label: "Workouts" },
            { val: userProfile.streak, label: "Streak" },
            { val: userProfile.totalPoints.toLocaleString(), label: "Points" },
            { val: weekSessions, label: "This week" },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: colors.foreground }]}>{s.val}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── Detailed Analytics ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Detailed Analytics</Text>
        <AnalyticsCard workoutHistory={workoutHistory} colors={colors} />
      </View>

      {/* ── Goals chips ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Goals</Text>
        <View style={styles.chipRow}>
          {primaryGoalLabel ? (
            <View style={[styles.chip, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{primaryGoalLabel}</Text>
            </View>
          ) : (
            userProfile.goals.map((g) => (
              <View key={g} style={[styles.chip, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
                <Text style={[styles.chipText, { color: colors.primary }]}>{g}</Text>
              </View>
            ))
          )}
        </View>
        <Text style={[styles.goalsHint, { textAlign: "left", marginTop: 8 }, { color: colors.mutedForeground }]}>
          {primaryGoalLabel
            ? "From your onboarding answer to \u201cWhat is your primary goal?\u201d \u2014 tap Recalculate Targets to change it."
            : "Complete onboarding to set your primary goal."}
        </Text>
      </View>

      {/* ── Equipment chips ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Equipment</Text>
        <View style={styles.chipRow}>
          {userProfile.equipment.map((e) => (
            <View key={e} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{e}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Body Profile ── */}
      {(userProfile.age || userProfile.weightLbs || userProfile.heightFt) && (
        <View style={[styles.section, { paddingHorizontal: 18 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Body Profile</Text>
          <View style={styles.chipRow}>
            {userProfile.biologicalSex && (
              <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  {userProfile.biologicalSex === "male" ? "Male" : "Female"}
                </Text>
              </View>
            )}
            {userProfile.age && (
              <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{userProfile.age} yrs</Text>
              </View>
            )}
            {userProfile.heightFt !== undefined && (
              <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>
                  {userProfile.heightFt}' {userProfile.heightIn ?? 0}"
                </Text>
              </View>
            )}
            {userProfile.weightLbs && (
              <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{userProfile.weightLbs} lbs</Text>
              </View>
            )}
            {userProfile.weeklyPaceLbs !== undefined && (
              <View style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{userProfile.weeklyPaceLbs} lb/wk</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Activities & Availability (Discover matching) ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Activities & Availability</Text>
          <Pressable onPress={() => router.push("/onboarding")} style={[styles.pillBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="edit-2" size={13} color={colors.mutedForeground} />
            <Text style={[styles.pillBtnText, { color: colors.mutedForeground }]}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.chipRow}>
          {(userProfile.activities ?? []).length > 0 ? (
            (userProfile.activities ?? []).map((a) => (
              <View key={a} style={[styles.chip, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
                <Text style={[styles.chipText, { color: colors.primary }]}>🏃 {a}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.goalsHint, { color: colors.mutedForeground, marginTop: 0 }]}>No activities set — used to match you in Discover</Text>
          )}
        </View>
        <View style={[styles.chipRow, { marginTop: 6 }]}>
          {(userProfile.availability ?? []).map((a) => (
            <View key={a} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.mutedForeground }]}>🕐 {a}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Nutrition Goals ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Nutrition Goals</Text>
          {!editingGoals ? (
            <Pressable onPress={openEditGoals} style={[styles.pillBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="edit-2" size={13} color={colors.mutedForeground} />
              <Text style={[styles.pillBtnText, { color: colors.mutedForeground }]}>Edit</Text>
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={cancelEditGoals} style={[styles.pillBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.pillBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveGoals} style={[styles.pillBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Feather name="check" size={13} color="#fff" />
                <Text style={[styles.pillBtnText, { color: "#fff" }]}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[styles.goalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {editingGoals ? (
            /* ── Edit mode: TextInput rows ── */
            goalFields.map((field, i) => (
              <View
                key={field.label}
                style={[
                  styles.goalInputRow,
                  { borderBottomColor: colors.border, borderBottomWidth: i < goalFields.length - 1 ? 1 : 0 },
                ]}
              >
                <View style={[styles.goalDot, { backgroundColor: field.color }]} />
                <Text style={[styles.goalInputLabel, { color: colors.foreground }]}>{field.label}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TextInput
                    style={[styles.goalInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                    value={field.value}
                    onChangeText={field.setValue}
                    keyboardType="number-pad"
                    maxLength={5}
                    selectTextOnFocus
                  />
                  <Text style={[styles.goalInputUnit, { color: colors.mutedForeground }]}>{field.unit}</Text>
                </View>
              </View>
            ))
          ) : (
            /* ── Display mode: 2×2 stat grid ── */
            <View style={styles.goalStatsGrid}>
              {displayGoals.map((g) => (
                <View key={g.label} style={[styles.goalStatItem, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 22, fontFamily: "Inter_700Bold", color: g.color }}>{g.value}</Text>
                  <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{g.unit}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginTop: 3 }}>{g.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {!editingGoals && (
          <Text style={[styles.goalsHint, { color: colors.mutedForeground }]}>
            These targets update the donut ring and macro bars in your calorie tracker.
          </Text>
        )}
      </View>

      {/* ── Progress ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Progress</Text>
          <Pressable
            onPress={() => { setShowAddProgress(true); setProgressSubmitError(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.pillBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Feather name="plus" size={13} color="#fff" />
            <Text style={[styles.pillBtnText, { color: "#fff" }]}>Add Entry</Text>
          </Pressable>
        </View>

        {progressLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : progressError ? (
          <View style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>{progressError}</Text>
            <Pressable onPress={fetchProgressEntries} style={[styles.pillBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.pillBtnText, { color: colors.mutedForeground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : weightHistoryData.length === 0 ? (
          <View style={[styles.goalsCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", paddingVertical: 32, gap: 10 }]}>
            <Feather name="trending-up" size={32} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>No entries yet</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", paddingHorizontal: 20 }}>
              Add your first weight entry to start tracking your progress
            </Text>
          </View>
        ) : (
          <>
            {hasEnoughChartData && (
              <View style={[styles.goalsCard, { backgroundColor: colors.card, borderColor: colors.border, overflow: "hidden", marginBottom: 12 }]}>
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, paddingTop: 12, paddingLeft: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Weight (lbs)
                </Text>
                <LineChart
                  data={lineChartData}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={{
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: () => colors.primary,
                    labelColor: () => colors.mutedForeground,
                    propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary },
                    propsForBackgroundLines: { stroke: colors.border, strokeWidth: 1 },
                  }}
                  bezier
                  style={{ marginLeft: -8 }}
                  withInnerLines
                  withOuterLines={false}
                />
              </View>
            )}

            <View style={[styles.goalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {progressPhotosData.slice(0, 6).map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.progressEntryRow,
                    { borderBottomWidth: i < Math.min(progressPhotosData.length, 6) - 1 ? 1 : 0, borderBottomColor: colors.border },
                  ]}
                >
                  {entry.imageUrl ? (
                    <Image source={{ uri: entry.imageUrl }} style={styles.progressThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.progressThumb, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="image" size={16} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: colors.foreground }}>
                      {(entry.weightKg * 2.20462).toFixed(1)} lbs
                    </Text>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
                      {entry.date}
                    </Text>
                    {entry.notes ? (
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                        {entry.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* ── AI Plan ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/ai-plan"); }}
          style={({ pressed }) => [styles.aiPlanCard, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
        >
          <View style={styles.aiPlanLeft}>
            <Feather name="cpu" size={22} color="#fff" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.aiPlanTitle}>
                {userProfile.aiPlan ? "View AI Plan" : "Get AI Plan"}
              </Text>
              <Text style={styles.aiPlanSub}>
                {userProfile.aiPlan
                  ? `${userProfile.aiPlan.goal} · ${userProfile.aiPlan.daysPerWeek}x/week`
                  : "Personalized for your goals and equipment"}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      {/* ── Menu cards ── */}
      <View style={[styles.menuSection, { marginHorizontal: 18 }]}>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="message-circle" label="Messages" onPress={() => router.push("/chat")} value={`${state.chatThreads.reduce((s, t) => s + t.unread, 0) || ""}`} />
          <MenuRow icon="zap" label="Calorie Tracker" onPress={() => router.push("/calories")} />
          <MenuRow icon="bar-chart-2" label="Progress & Analytics" onPress={() => router.push("/analytics" as any)} />
          <MenuRow icon="users" label="Following" onPress={() => { setShowFriends(true); }} value={followingList.length > 0 ? `${followingList.length}` : ""} />
          <MenuRow icon="award" label="Achievements" onPress={() => router.push("/achievements" as any)} value={`${completedChallenges} completed`} />
        </View>
      </View>

      <View style={[styles.menuSection, { marginHorizontal: 18 }]}>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="settings" label="Settings" onPress={() => router.push("/settings")} />
          {!isAuthenticated && (
            <MenuRow icon="log-in" label="Sign In / Create Account" onPress={() => router.push("/(auth)/sign-in")} />
          )}
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>IronPace v1.0</Text>
    </ScrollView>

    {/* Friends / Following Sheet */}
    <Modal visible={showFriends} animationType="slide" transparent onRequestClose={() => setShowFriends(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={[styles.friendsSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Following</Text>
            <Pressable onPress={() => setShowFriends(false)} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {followingLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 50 }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : followingList.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 12 }}>
              <Feather name="users" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                You're not following anyone yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={followingList}
              keyExtractor={(f) => f.id}
              contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}
              ItemSeparatorComponent={() => <View style={[styles.friendDivider, { backgroundColor: colors.border }]} />}
              renderItem={({ item }) => {
                const initials = item.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                const avatarColor = colorFromId(item.id);
                return (
                  <View style={styles.friendRow}>
                    <View style={{ alignItems: "center", justifyContent: "center", width: 24 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: colors.mutedForeground }}>#{item.rank}</Text>
                    </View>
                    <View style={[styles.friendAvatar, { backgroundColor: avatarColor + "33", borderColor: avatarColor }]}>
                      <Text style={{ color: avatarColor, fontSize: 14, fontFamily: "Inter_700Bold" }}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>{item.name}</Text>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground }}>@{item.username} · {item.level}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={{ fontFamily: "Inter_700Bold", fontSize: 12, color: colors.foreground }}>🔥 {item.streak}d</Text>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground }}>{item.weeklyWorkouts} this week</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>

    {/* ── Add Progress Entry Modal ── */}
    <Modal
      visible={showAddProgress}
      transparent
      animationType="slide"
      onRequestClose={() => { if (!progressSubmitting) setShowAddProgress(false); }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.sheetOverlay} onPress={() => { if (!progressSubmitting) setShowAddProgress(false); }} />
        <View style={[styles.addProgressSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Log Progress</Text>
            <Pressable onPress={() => { if (!progressSubmitting) setShowAddProgress(false); }} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
            {/* Weight input */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Weight (lbs) *
              </Text>
              <TextInput
                style={[styles.progressInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={draftWeight}
                onChangeText={setDraftWeight}
                keyboardType="decimal-pad"
                placeholder="e.g. 175.5"
                placeholderTextColor={colors.mutedForeground}
                selectTextOnFocus
              />
            </View>

            {/* Notes input */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Notes (optional)
              </Text>
              <TextInput
                style={[styles.progressInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, height: 80, textAlignVertical: "top" }]}
                value={draftNotes}
                onChangeText={setDraftNotes}
                placeholder="How are you feeling?"
                placeholderTextColor={colors.mutedForeground}
                multiline
              />
            </View>

            {/* Photo picker */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Progress Photo (optional)
              </Text>
              <Pressable
                onPress={pickProgressPhoto}
                style={[styles.photoPickerBox, { borderColor: colors.border, backgroundColor: colors.muted }]}
              >
                {draftPhoto ? (
                  <Image source={{ uri: draftPhoto.uri }} style={{ width: "100%", height: "100%", borderRadius: 12 }} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center", gap: 8 }}>
                    <Feather name="camera" size={28} color={colors.mutedForeground} />
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground }}>Tap to add a photo</Text>
                  </View>
                )}
              </Pressable>
              {draftPhoto && (
                <Pressable onPress={() => setDraftPhoto(null)}>
                  <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "#ef4444" }}>Remove photo</Text>
                </Pressable>
              )}
            </View>

            {progressSubmitError ? (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#ef4444", textAlign: "center" }}>
                {progressSubmitError}
              </Text>
            ) : null}

            <Pressable
              onPress={submitProgressEntry}
              disabled={progressSubmitting}
              style={({ pressed }) => [
                styles.aiPlanCard,
                { backgroundColor: colors.primary, opacity: pressed || progressSubmitting ? 0.7 : 1, justifyContent: "center" },
              ]}
            >
              {progressSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.aiPlanTitle}>Save Entry</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 18, paddingBottom: 18, borderBottomWidth: 1, marginBottom: 20 },
  heroTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  heroUsername: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  levelBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 6 },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 14 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  statDivider: { width: 1, height: 28 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, opacity: 0.7 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  pillBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  pillBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  goalsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  goalStatsGrid: { flexDirection: "row", flexWrap: "wrap" },
  goalStatItem: { width: "50%", alignItems: "center", paddingVertical: 18, borderRightWidth: 0.5, borderBottomWidth: 0.5 },
  goalInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  goalDot: { width: 10, height: 10, borderRadius: 5 },
  goalInputLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  goalInput: { width: 80, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "right" },
  goalInputUnit: { fontSize: 12, fontFamily: "Inter_400Regular", width: 30 },
  goalsHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "center", opacity: 0.8 },
  aiPlanCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center" },
  aiPlanLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  aiPlanTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  aiPlanSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },
  menuSection: { marginBottom: 14 },
  menuCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, gap: 12 },
  menuIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  menuValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginRight: 4 },
  progressEntryRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 14 },
  progressThumb: { width: 52, height: 52, borderRadius: 10 },
  addProgressSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingTop: 10 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  progressInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  photoPickerBox: { width: "100%", height: 160, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 20 },
  friendsSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: "80%" },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  friendAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  friendDivider: { height: 1 },
});
