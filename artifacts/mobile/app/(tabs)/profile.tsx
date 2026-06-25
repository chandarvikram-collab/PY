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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function Avatar({ initials, color, size = 72 }: { initials: string; color: string; size?: number }) {
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

type GoalField = { label: string; value: string; setValue: (v: string) => void; unit: string; color: string };

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, updateProfile } = useApp();
  const { userProfile, workoutHistory, challenges } = state;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const userInitials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Hero ── */}
      <View style={[styles.hero, { borderBottomColor: colors.border }]}>
        <View style={styles.heroTop}>
          <Avatar initials={userInitials} color={colors.primary} size={72} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.heroName, { color: colors.foreground }]}>{userProfile.name}</Text>
            <Text style={[styles.heroUsername, { color: colors.mutedForeground }]}>@{userProfile.username}</Text>
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

      {/* ── Goals chips ── */}
      <View style={[styles.section, { paddingHorizontal: 18 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Goals</Text>
        <View style={styles.chipRow}>
          {userProfile.goals.map((g) => (
            <View key={g} style={[styles.chip, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "44" }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{g}</Text>
            </View>
          ))}
        </View>
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
          <MenuRow icon="bar-chart-2" label="Progress & Analytics" onPress={() => {}} />
          <MenuRow icon="users" label="Friends" onPress={() => {}} value={`${state.friends.length}`} />
          <MenuRow icon="trophy" label="Achievements" onPress={() => {}} value={`${completedChallenges} completed`} />
        </View>
      </View>

      <View style={[styles.menuSection, { marginHorizontal: 18 }]}>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuRow icon="settings" label="Settings" onPress={() => {}} />
          <MenuRow icon="help-circle" label="Help & Support" onPress={() => {}} />
          <MenuRow icon="log-out" label="Sign Out" onPress={() => {}} danger />
        </View>
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>IronPace v1.0</Text>
    </ScrollView>
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
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 20 },
});
