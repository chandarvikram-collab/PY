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
import type { Routine, RunSession } from "@/context/AppContext";

const CATEGORY_COLORS: Record<string, string> = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Legs: "#8b5cf6",
  Shoulders: "#f59e0b",
  Arms: "#22c55e",
  Core: "#06b6d4",
};

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function fmtRunTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RunHistoryCard({ run, isPR }: { run: RunSession; isPR: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.runCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.runCardRow}>
        <View style={[styles.runCardIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name="navigation" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.runCardDist, { color: colors.foreground }]}>
              {run.distance.toFixed(2)} km
            </Text>
            {isPR && (
              <View style={[styles.prBadge, { backgroundColor: "#f59e0b22" }]}>
                <Text style={[styles.prText, { color: "#f59e0b" }]}>PR</Text>
              </View>
            )}
          </View>
          <Text style={[styles.runCardMeta, { color: colors.mutedForeground }]}>
            {run.date} · {fmtRunTime(run.duration)} · {run.avgPace}/km
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[styles.runCardCals, { color: colors.foreground }]}>{run.calories} kcal</Text>
          <Text style={[styles.runCardSplits, { color: colors.mutedForeground }]}>
            {run.splits.length} splits
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function TrainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addRoutine } = useApp();
  const { routines, workoutHistory, runHistory } = state;
  const [activeTab, setActiveTab] = useState<"lift" | "run">("lift");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const weekVol = workoutHistory
    .filter((w) => (new Date().getTime() - new Date(w.date).getTime()) / 86400000 <= 7)
    .reduce((s, w) => s + w.volume, 0);
  const weekSessions = workoutHistory.filter(
    (w) => (new Date().getTime() - new Date(w.date).getTime()) / 86400000 <= 7
  ).length;

  const weekRuns = runHistory.filter(
    (r) => (new Date().getTime() - new Date(r.date).getTime()) / 86400000 <= 7
  );
  const weekRunKm = weekRuns.reduce((s, r) => s + r.distance, 0);

  const prRun = runHistory.length > 0
    ? runHistory.reduce((best, r) => (r.distance > best.distance ? r : best), runHistory[0])
    : null;

  function createRoutine() {
    if (!newName.trim()) return;
    const r: Routine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: newName.trim(),
      exercises: [],
    };
    addRoutine(r);
    setNewName("");
    setShowNew(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90, paddingHorizontal: 18 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR TRAINING</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {activeTab === "lift" ? "Routines" : "Running"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/calendar")}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="calendar" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/calories")}
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="zap" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={[styles.tabToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab("lift")}
          style={[styles.tabBtn, activeTab === "lift" && { backgroundColor: colors.primary }]}
        >
          <Feather name="activity" size={14} color={activeTab === "lift" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.tabBtnText, { color: activeTab === "lift" ? "#fff" : colors.mutedForeground }]}>Lift</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("run")}
          style={[styles.tabBtn, activeTab === "run" && { backgroundColor: colors.primary }]}
        >
          <Feather name="navigation" size={14} color={activeTab === "run" ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.tabBtnText, { color: activeTab === "run" ? "#fff" : colors.mutedForeground }]}>Run</Text>
        </Pressable>
      </View>

      {activeTab === "lift" ? (
        <>
          {/* Week Stats */}
          <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.foreground }]}>{weekSessions}</Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>Sessions</Text>
            </View>
            <View style={[styles.weekDivider, { backgroundColor: colors.border }]} />
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.foreground }]}>
                {Math.round(weekVol / 1000).toFixed(1)}k
              </Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>lbs lifted</Text>
            </View>
            <View style={[styles.weekDivider, { backgroundColor: colors.border }]} />
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.primary }]}>
                {workoutHistory.length > 0 ? workoutHistory[0].date : "--"}
              </Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>Last session</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
            <View style={styles.quickRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push("/session");
                }}
                style={({ pressed }) => [styles.quickBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, flex: 1 }]}
              >
                <Feather name="play" size={18} color="#fff" />
                <Text style={styles.quickBtnText}>Empty Session</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/ai-plan")}
                style={({ pressed }) => [
                  styles.quickBtn,
                  { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1, flex: 1 },
                ]}
              >
                <Feather name="cpu" size={18} color={colors.primary} />
                <Text style={[styles.quickBtnText, { color: colors.foreground }]}>AI Plan</Text>
              </Pressable>
            </View>
          </View>

          {/* Routines */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Routines</Text>
              <Pressable
                onPress={() => setShowNew(true)}
                style={[styles.addBtn, { backgroundColor: colors.primary + "22" }]}
              >
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>New</Text>
              </Pressable>
            </View>

            {showNew && (
              <View style={[styles.newRoutineCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Routine name..."
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={createRoutine}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Pressable onPress={() => { setShowNew(false); setNewName(""); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={createRoutine} style={[styles.confirmBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.confirmBtnText}>Create</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {routines.map((routine) => (
              <Pressable
                key={routine.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/session", params: { routineId: routine.id } });
                }}
                style={({ pressed }) => [styles.routineCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.routineRow}>
                  <View style={[styles.routineIcon, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name="list" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.routineName, { color: colors.foreground }]}>{routine.name}</Text>
                    <Text style={[styles.routineSub, { color: colors.mutedForeground }]}>{routine.exercises.length} exercises</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>
                {routine.exercises.length > 0 && (
                  <View style={styles.muscleRow}>
                    {[...new Set(routine.exercises.map((e) => e.category))].map((cat) => (
                      <View key={cat} style={[styles.muscleChip, { backgroundColor: (CATEGORY_COLORS[cat] ?? colors.primary) + "22" }]}>
                        <Text style={[styles.muscleChipText, { color: CATEGORY_COLORS[cat] ?? colors.primary }]}>{cat}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Workout History */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout History</Text>
            {workoutHistory.map((session) => (
              <Pressable
                key={session.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/workout-detail", params: { id: session.id } });
                }}
                style={({ pressed }) => [styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={[styles.historyIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="activity" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.historyName, { color: colors.foreground }]}>{session.name}</Text>
                  <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                    {session.date} · {fmtDuration(session.duration)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.historyVol, { color: colors.foreground }]}>
                    {Math.round(session.volume / 1000).toFixed(1)}k lbs
                  </Text>
                  <Text style={[styles.historyExCount, { color: colors.mutedForeground }]}>{session.exercises} exercises</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          {/* Running Week Stats */}
          <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.foreground }]}>{weekRuns.length}</Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>Runs</Text>
            </View>
            <View style={[styles.weekDivider, { backgroundColor: colors.border }]} />
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.foreground }]}>{weekRunKm.toFixed(1)}</Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>km this week</Text>
            </View>
            <View style={[styles.weekDivider, { backgroundColor: colors.border }]} />
            <View style={styles.weekStat}>
              <Text style={[styles.weekVal, { color: colors.primary }]}>
                {runHistory.length > 0 ? runHistory[0].avgPace : "--:--"}
              </Text>
              <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>Last pace</Text>
            </View>
          </View>

          {/* Last Run */}
          {runHistory.length > 0 && (
            <View style={[styles.lastRunCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.lastRunLabel, { color: colors.mutedForeground }]}>Last Run · {runHistory[0].date}</Text>
              <Text style={[styles.lastRunDist, { color: colors.foreground }]}>
                {runHistory[0].distance.toFixed(2)} km
              </Text>
              <View style={styles.lastRunMeta}>
                <View style={styles.lastRunStat}>
                  <Feather name="clock" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.lastRunStatText, { color: colors.mutedForeground }]}>
                    {fmtRunTime(runHistory[0].duration)}
                  </Text>
                </View>
                <View style={styles.lastRunStat}>
                  <Feather name="zap" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.lastRunStatText, { color: colors.mutedForeground }]}>
                    {runHistory[0].avgPace}/km avg
                  </Text>
                </View>
                <View style={styles.lastRunStat}>
                  <Feather name="trending-up" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.lastRunStatText, { color: colors.mutedForeground }]}>
                    {runHistory[0].bestPace}/km best
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Start Run CTA */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push("/run-session");
            }}
            style={({ pressed }) => [styles.startRunBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="play" size={22} color="#fff" />
            <Text style={styles.startRunBtnText}>Start Run</Text>
          </Pressable>

          {/* Run History */}
          {runHistory.length > 0 && (
            <View style={[styles.section, { marginTop: 4 }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Run History</Text>
              {runHistory.map((run) => (
                <Pressable
                  key={run.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/run-detail", params: { id: run.id } });
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <RunHistoryCard run={run} isPR={prRun?.id === run.id} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tabToggle: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 18, gap: 4 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  weekCard: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: "center" },
  weekStat: { flex: 1, alignItems: "center", gap: 3 },
  weekDivider: { width: 1, height: 36 },
  weekVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  weekLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14 },
  quickBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  newRoutineCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  routineCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  routineRow: { flexDirection: "row", alignItems: "center" },
  routineIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  routineName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  routineSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  muscleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  muscleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  muscleChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  historyRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  historyIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyVol: { fontSize: 14, fontFamily: "Inter_700Bold" },
  historyExCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  lastRunCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14 },
  lastRunLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 6 },
  lastRunDist: { fontSize: 38, fontFamily: "Inter_700Bold", letterSpacing: -1, marginBottom: 12 },
  lastRunMeta: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  lastRunStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  lastRunStatText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  startRunBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, padding: 18, borderRadius: 16, marginBottom: 24 },
  startRunBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  runCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  runCardRow: { flexDirection: "row", alignItems: "center" },
  runCardIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  runCardDist: { fontSize: 16, fontFamily: "Inter_700Bold" },
  runCardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  runCardCals: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  runCardSplits: { fontSize: 11, fontFamily: "Inter_400Regular" },
  prBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  prText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
