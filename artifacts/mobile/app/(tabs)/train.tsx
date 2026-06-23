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
import type { Routine } from "@/context/AppContext";

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

export default function TrainScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addRoutine } = useApp();
  const { routines, workoutHistory } = state;
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const weekVol = workoutHistory
    .filter((w) => {
      const d = new Date(w.date);
      const now = new Date();
      return (now.getTime() - d.getTime()) / 86400000 <= 7;
    })
    .reduce((s, w) => s + w.volume, 0);

  const weekSessions = workoutHistory.filter((w) => {
    const d = new Date(w.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) / 86400000 <= 7;
  }).length;

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
          <Text style={[styles.title, { color: colors.foreground }]}>Routines</Text>
        </View>
        <Pressable
          onPress={() => router.push("/calories")}
          style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="zap" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Week Stats */}
      <View style={[styles.weekCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.weekStat}>
          <Text style={[styles.weekVal, { color: colors.foreground }]}>{weekSessions}</Text>
          <Text style={[styles.weekLbl, { color: colors.mutedForeground }]}>Sessions</Text>
        </View>
        <View style={[styles.weekDivider, { backgroundColor: colors.border }]} />
        <View style={styles.weekStat}>
          <Text style={[styles.weekVal, { color: colors.foreground }]}>{Math.round(weekVol / 1000).toFixed(1)}k</Text>
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

      {/* Quick Start Buttons */}
      <View style={[styles.section]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/session");
            }}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, flex: 1 },
            ]}
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
              <Pressable
                onPress={() => { setShowNew(false); setNewName(""); }}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={createRoutine}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              >
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
            style={({ pressed }) => [
              styles.routineCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={styles.routineRow}>
              <View style={[styles.routineIcon, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="list" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.routineName, { color: colors.foreground }]}>{routine.name}</Text>
                <Text style={[styles.routineSub, { color: colors.mutedForeground }]}>
                  {routine.exercises.length} exercises
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>

            {routine.exercises.length > 0 && (
              <View style={styles.muscleRow}>
                {[...new Set(routine.exercises.map((e) => e.category))].map((cat) => (
                  <View
                    key={cat}
                    style={[
                      styles.muscleChip,
                      { backgroundColor: (CATEGORY_COLORS[cat] ?? colors.primary) + "22" },
                    ]}
                  >
                    <Text style={[styles.muscleChipText, { color: CATEGORY_COLORS[cat] ?? colors.primary }]}>
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Workout History</Text>
        {workoutHistory.map((session) => (
          <View
            key={session.id}
            style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}
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
              <Text style={[styles.historyExCount, { color: colors.mutedForeground }]}>
                {session.exercises} exercises
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
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
});
