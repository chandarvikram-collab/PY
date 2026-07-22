import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { socialFetch, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

type ScheduledWorkoutLite = { date: string; completed: boolean };

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getWeekDates(): Date[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function Avatar({ initials, color, size = 40 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatarBase, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + "33", borderColor: color + "66" }]}>
      <Text style={[styles.avatarText, { color, fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, getTodayCalories, apiUserId } = useApp();
  const { userProfile, friends, workoutHistory, challenges } = state;
  const todayCals = getTodayCalories();

  const [scheduledWeek, setScheduledWeek] = useState<ScheduledWorkoutLite[]>([]);

  useEffect(() => {
    if (!apiUserId) return;
    let cancelled = false;
    socialFetch(`/schedule/${apiUserId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { scheduledWorkouts: ScheduledWorkoutLite[] } | null) => {
        if (!cancelled && data) setScheduledWeek(data.scheduledWorkouts);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiUserId]);

  const weekDays = useMemo(() => {
    const dates = getWeekDates();
    const todayKey = toDateKey(new Date());
    return dates.map((d) => {
      const key = toDateKey(d);
      const dayEntries = scheduledWeek.filter((s) => s.date === key);
      const hasScheduled = dayEntries.length > 0;
      const completed = dayEntries.some((s) => s.completed);
      return { key, isToday: key === todayKey, completed, hasScheduled };
    });
  }, [scheduledWeek]);

  const consumed = useMemo(
    () => todayCals.entries.reduce((s, e) => s + e.calories, 0),
    [todayCals.entries]
  );

  const proteinConsumed = useMemo(
    () => todayCals.entries.reduce((s, e) => s + (e.protein ?? 0), 0),
    [todayCals.entries]
  );
  const carbConsumed = useMemo(
    () => todayCals.entries.reduce((s, e) => s + (e.carbs ?? 0), 0),
    [todayCals.entries]
  );
  const fatConsumed = useMemo(
    () => todayCals.entries.reduce((s, e) => s + (e.fat ?? 0), 0),
    [todayCals.entries]
  );

  const leaderboard = useMemo(() => {
    const me = {
      id: "me",
      name: "You",
      initials: userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
      color: "#E8151B",
      totalPoints: userProfile.totalPoints,
      streak: userProfile.streak,
      weeklyWorkouts: workoutHistory.filter((w) => {
        const d = new Date(w.date);
        const now = new Date();
        return (now.getTime() - d.getTime()) / 86400000 <= 7;
      }).length,
      rank: 0,
    };
    const all = [...friends, me].sort((a, b) => b.totalPoints - a.totalPoints).map((f, i) => ({ ...f, rank: i + 1 }));
    return all;
  }, [friends, userProfile, workoutHistory]);

  const myRank = leaderboard.find((l) => l.id === "me")?.rank ?? 0;

  const activeChallenge = challenges.find((c) => c.status === "active");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const needsOnboarding = !userProfile.id?.startsWith("anon-") && !userProfile.biologicalSex;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90, paddingHorizontal: 18 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good morning,</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>{userProfile.name.split(" ")[0]}</Text>
        </View>
        <Pressable
          onPress={() => router.push("/chat")}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="message-circle" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Rank + Points Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
        <View style={styles.bannerItem}>
          <Feather name="award" size={18} color={colors.primary} />
          <Text style={[styles.bannerVal, { color: colors.foreground }]}>#{myRank}</Text>
          <Text style={[styles.bannerLbl, { color: colors.mutedForeground }]}>Your Rank</Text>
        </View>
        <View style={[styles.bannerDivider, { backgroundColor: colors.border }]} />
        <View style={styles.bannerItem}>
          <Feather name="trending-up" size={18} color={colors.primary} />
          <Text style={[styles.bannerVal, { color: colors.foreground }]}>{userProfile.totalPoints.toLocaleString()}</Text>
          <Text style={[styles.bannerLbl, { color: colors.mutedForeground }]}>Points</Text>
        </View>
      </View>

      {/* Weekly Schedule Tracker */}
      <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={() => router.push("/calendar")}
          style={styles.weekCardHeader}
        >
          <Text style={[styles.weekCardTitle, { color: colors.foreground }]}>This Week</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.weekBarRow}>
          {weekDays.map((day, i) => (
            <Pressable
              key={day.key}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/calendar", params: { date: day.key } });
              }}
              style={styles.weekBarCol}
            >
              <Text
                style={[
                  styles.weekBarLabel,
                  { color: day.isToday ? colors.foreground : colors.mutedForeground },
                  day.isToday && styles.weekBarLabelToday,
                ]}
              >
                {WEEKDAY_SHORT[i]}
              </Text>
              <View
                style={[
                  styles.weekBarCircle,
                  // Circle fill/border communicates schedule state only
                  // (matches the calendar screen's convention where primary
                  // = scheduled): completed days are solid primary,
                  // scheduled-but-incomplete days are a primary-tinted
                  // outline, and days with nothing scheduled are an empty
                  // dashed circle. "Today" is called out separately below
                  // so it never gets confused with the scheduled state.
                  day.completed
                    ? { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }
                    : day.hasScheduled
                    ? { backgroundColor: colors.primary + "18", borderColor: colors.primary + "77", borderWidth: 1 }
                    : { backgroundColor: "transparent", borderStyle: "dashed", borderColor: colors.border, borderWidth: 1 },
                ]}
              >
                {day.completed ? (
                  <Feather name="check" size={13} color="#fff" />
                ) : day.hasScheduled ? (
                  <View style={[styles.weekBarDot, { backgroundColor: colors.primary }]} />
                ) : null}
              </View>
              <View
                style={[
                  styles.weekBarTodayDot,
                  { backgroundColor: day.isToday ? colors.foreground : "transparent" },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Onboarding prompt */}
      {needsOnboarding && (
        <Pressable
          onPress={() => router.push("/onboarding")}
          style={({ pressed }) => [
            styles.onboardingBanner,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "44",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="sliders" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.onboardingTitle, { color: colors.foreground }]}>
              Set Up Your Nutrition Targets
            </Text>
            <Text style={[styles.onboardingSub, { color: colors.mutedForeground }]}>
              Answer 8 quick questions for a personalized calorie & macro plan.
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      )}

      {/* Today Stats Row */}
      <View style={styles.statsRow}>
        <Pressable
          onPress={() => router.push("/calories")}
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
        >
          <Feather name="zap" size={16} color={colors.primary} />
          <Text style={[styles.statBig, { color: colors.foreground }]}>{consumed}</Text>
          <Text style={[styles.statSub, { color: colors.mutedForeground }]}>of {todayCals.goal} kcal</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, (consumed / todayCals.goal) * 100)}%` as any }]} />
          </View>
        </Pressable>

        <View style={{ width: 10 }} />

        {/* Macro mini-card */}
        <Pressable
          onPress={() => router.push("/calories")}
          style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, gap: 6 }]}
        >
          <Feather name="pie-chart" size={16} color={colors.primary} />
          {(
            [
              { label: "P", val: proteinConsumed, goal: userProfile.proteinGoal ?? 180, color: "#3b82f6" },
              { label: "C", val: carbConsumed, goal: userProfile.carbGoal ?? 250, color: "#f59e0b" },
              { label: "F", val: fatConsumed, goal: userProfile.fatGoal ?? 70, color: "#ef4444" },
            ] as const
          ).map(({ label, val, goal, color }) => (
            <View key={label}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.macroVal, { color: colors.foreground }]}>{Math.round(val)}g</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.min(100, (val / Math.max(1, goal)) * 100)}%` as any }]} />
              </View>
            </View>
          ))}
        </Pressable>
      </View>

      {/* Active Challenge */}
      {activeChallenge && (
        <View style={[styles.section]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Challenge</Text>
            <Pressable onPress={() => router.push("/(tabs)/challenges")}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/challenges")}
            style={[styles.challengeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.challengeHeader}>
              <View style={[styles.challengeIconWrap, { backgroundColor: colors.primary + "22" }]}>
                <Feather
                  name={
                    activeChallenge.type === "steps"
                      ? "navigation"
                      : activeChallenge.type === "lifting"
                      ? "trending-up"
                      : activeChallenge.type === "distance"
                      ? "map-pin"
                      : "zap"
                  }
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.challengeTitle, { color: colors.foreground }]}>{activeChallenge.title}</Text>
                {activeChallenge.fromName && (
                  <Text style={[styles.challengeSub, { color: colors.mutedForeground }]}>
                    From {activeChallenge.fromName}
                  </Text>
                )}
              </View>
              <Text style={[styles.challengeProgress, { color: colors.primary }]}>
                {activeChallenge.myProgress.toLocaleString()}/{activeChallenge.target.toLocaleString()} {activeChallenge.unit}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border, marginTop: 10, height: 6, borderRadius: 3 }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: 3,
                    height: 6,
                    width: `${Math.min(100, (activeChallenge.myProgress / activeChallenge.target) * 100)}%` as any,
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>
      )}

      {/* Leaderboard */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Leaderboard</Text>
          <Text style={[styles.badge, { backgroundColor: colors.primary + "22", color: colors.primary }]}>
            #{myRank}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {leaderboard.slice(0, 5).map((entry, idx) => {
            const isMe = entry.id === "me";
            return (
              <View
                key={entry.id}
                style={[
                  styles.leaderRow,
                  idx < leaderboard.slice(0, 5).length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  isMe && { backgroundColor: colors.primary + "0d" },
                ]}
              >
                <Text
                  style={[
                    styles.rank,
                    { color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : colors.mutedForeground },
                  ]}
                >
                  {idx + 1}
                </Text>
                <Avatar initials={isMe ? userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : (entry as any).initials} color={entry.color} size={36} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.leaderName, { color: isMe ? colors.primary : colors.foreground }]}>
                    {isMe ? "You" : entry.name}
                  </Text>
                  <Text style={[styles.leaderSub, { color: colors.mutedForeground }]}>
                    {(entry as any).weeklyWorkouts} workouts this week
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.points, { color: colors.foreground }]}>{entry.totalPoints.toLocaleString()}</Text>
                  <Text style={[styles.pointsLabel, { color: colors.mutedForeground }]}>pts</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  greeting: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
  userName: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: "center" },
  bannerItem: { flex: 1, alignItems: "center", gap: 3 },
  bannerDivider: { width: 1, height: 36 },
  bannerVal: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 3 },
  bannerLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", marginBottom: 14 },
  statCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  statBig: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 },
  statSub: { fontSize: 11, fontFamily: "Inter_500Medium", marginBottom: 6 },
  progressBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  badge: { fontSize: 12, fontFamily: "Inter_700Bold", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  challengeCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  challengeHeader: { flexDirection: "row", alignItems: "center" },
  challengeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  challengeTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  challengeSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  challengeProgress: { fontSize: 13, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  leaderRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 4 },
  rank: { fontSize: 14, fontFamily: "Inter_700Bold", width: 22 },
  leaderName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  leaderSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  points: { fontSize: 15, fontFamily: "Inter_700Bold" },
  pointsLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  avatarBase: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  avatarText: { fontFamily: "Inter_700Bold" },
  onboardingBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  onboardingTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  onboardingSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  weekCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  weekCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  weekCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  weekBarRow: { flexDirection: "row", justifyContent: "space-between" },
  weekBarCol: { alignItems: "center", gap: 6 },
  weekBarLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  weekBarCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  weekBarDot: { width: 6, height: 6, borderRadius: 3 },
  weekBarLabelToday: { fontFamily: "Inter_700Bold" },
  weekBarTodayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  macroLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  macroVal: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
