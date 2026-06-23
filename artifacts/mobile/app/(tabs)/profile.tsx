import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
      {value && <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>{value}</Text>}
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useApp();
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
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

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{userProfile.totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Workouts</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{userProfile.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{userProfile.totalPoints.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Points</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{weekSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This week</Text>
          </View>
        </View>
      </View>

      {/* Goals + Equipment */}
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

      {/* AI Plan */}
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

      {/* Menu */}
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
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
