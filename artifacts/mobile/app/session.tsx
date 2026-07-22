import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, ME_USER_ID } from "@/context/AppContext";
import { AVAILABLE_EXERCISES, EXERCISE_CATEGORIES } from "@/constants/exercises";
import type { ExerciseCategory } from "@/constants/exercises";
import { useColors } from "@/hooks/useColors";
import type { Exercise, ExerciseLog, SetLog, WorkoutSession } from "@/context/AppContext";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type SetEntry = { weight: string; reps: string; done: boolean };
type ExEntry = { exercise: Exercise; sets: SetEntry[] };

export default function SessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const { state, addWorkoutSession, addPost } = useApp();

  const routine = state.routines.find((r) => r.id === routineId);

  const [elapsed, setElapsed] = useState(0);
  const [entries, setEntries] = useState<ExEntry[]>(
    routine
      ? routine.exercises.map((ex) => ({
          exercise: ex,
          sets: Array.from({ length: ex.sets }, () => ({
            weight: String(ex.weight),
            reps: String(ex.reps),
            done: false,
          })),
        }))
      : []
  );
  const [showAdd, setShowAdd] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);

  // Exercise picker search/filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<ExerciseCategory>("All");

  // 3-dot exercise menu
  const [exMenuIdx, setExMenuIdx] = useState<number | null>(null);
  const [editRestIdx, setEditRestIdx] = useState<number | null>(null);
  const [editRestValue, setEditRestValue] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // Workout timer
  useEffect(() => {
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Rest timer
  useEffect(() => {
    if (restTimer === null) {
      if (restRef.current) clearInterval(restRef.current);
      return;
    }
    restRef.current = setInterval(() => {
      setRestTimer((r) => {
        if (r === null || r <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return null;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (restRef.current) clearInterval(restRef.current); };
  }, [restTimer !== null]);

  const totalVolume = entries.reduce((total, entry) =>
    total + entry.sets.filter((s) => s.done).reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0)
  , 0);

  const completedSets = entries.reduce((s, e) => s + e.sets.filter((s) => s.done).length, 0);
  const totalSets = entries.reduce((s, e) => s + e.sets.length, 0);

  function updateSet(exIdx: number, setIdx: number, field: keyof SetEntry, val: string | boolean) {
    setEntries((prev) =>
      prev.map((e, ei) =>
        ei === exIdx
          ? {
              ...e,
              sets: e.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: val } : s
              ),
            }
          : e
      )
    );
  }

  function completeSet(exIdx: number, setIdx: number, restSecs: number) {
    updateSet(exIdx, setIdx, "done", true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRestTimer(restSecs);
  }

  function addExercise(ex: Exercise) {
    setEntries((prev) => [
      ...prev,
      {
        exercise: ex,
        sets: Array.from({ length: ex.sets }, () => ({ weight: String(ex.weight), reps: String(ex.reps), done: false })),
      },
    ]);
    setShowAdd(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function addSet(exIdx: number) {
    setEntries((prev) =>
      prev.map((e, ei) =>
        ei === exIdx ? { ...e, sets: [...e.sets, { weight: e.sets[e.sets.length - 1]?.weight ?? "0", reps: e.sets[e.sets.length - 1]?.reps ?? "10", done: false }] } : e
      )
    );
  }

  function deleteSet(exIdx: number, setIdx: number) {
    setEntries((prev) =>
      prev.map((e, ei) =>
        ei === exIdx ? { ...e, sets: e.sets.filter((_, si) => si !== setIdx) } : e
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function deleteExercise(exIdx: number) {
    setEntries((prev) => prev.filter((_, ei) => ei !== exIdx));
    setExMenuIdx(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function confirmDeleteSet(exIdx: number, setIdx: number) {
    Alert.alert("Remove Set", "Delete this set?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSet(exIdx, setIdx) },
    ]);
  }

  function openRestEdit(exIdx: number) {
    setEditRestIdx(exIdx);
    setEditRestValue(String(entries[exIdx]?.exercise.rest ?? 90));
    setExMenuIdx(null);
  }

  function saveRestEdit() {
    if (editRestIdx === null) return;
    const val = parseInt(editRestValue) || 90;
    setEntries((prev) =>
      prev.map((e, ei) =>
        ei === editRestIdx ? { ...e, exercise: { ...e.exercise, rest: val } } : e
      )
    );
    setEditRestIdx(null);
  }

  const filteredExercises = AVAILABLE_EXERCISES.filter((ex) => {
    const matchesCat = filterCategory === "All" || ex.category === filterCategory;
    const matchesSearch = searchQuery === "" || ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function finishWorkout() {
    const exerciseLog: ExerciseLog[] = entries
      .filter((e) => e.sets.some((s) => s.done))
      .map((e) => ({
        name: e.exercise.name,
        category: e.exercise.category,
        sets: e.sets
          .filter((s) => s.done)
          .map((s): SetLog => ({ weight: parseFloat(s.weight) || 0, reps: parseInt(s.reps) || 0, restSeconds: 90 })),
      }));

    const session: WorkoutSession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      type: "lift",
      name: routine?.name ?? "Quick Workout",
      date: new Date().toISOString().split("T")[0],
      duration: elapsed,
      volume: Math.round(totalVolume),
      exercises: exerciseLog.length,
      exerciseLog,
    };

    addWorkoutSession(session);

    if (intervalRef.current) clearInterval(intervalRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const shareToFeed = () => {
      addPost({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        userId: ME_USER_ID,
        userName: state.userProfile.name,
        userInitials: state.userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
        userColor: "#E8151B",
        type: "workout",
        content: `Just finished ${session.name}! ${fmtTime(elapsed)} of hard work.`,
        likes: 0,
        comments: 0,
        liked: false,
        time: "Just now",
        stats: {
          Volume: `${Math.round(totalVolume).toLocaleString()} lbs`,
          Sets: String(completedSets),
          Duration: fmtTime(elapsed),
        },
      });
      router.back();
    };

    Alert.alert(
      "Share your workout?",
      `You finished ${session.name} in ${fmtTime(elapsed)}. Post it to your social feed?`,
      [
        { text: "Skip", style: "cancel", onPress: () => router.back() },
        { text: "Share to Feed", onPress: shareToFeed },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            router.back();
          }}
          style={[styles.iconBtn, { borderColor: colors.border }]}
        >
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.timerText, { color: colors.foreground }]}>{fmtTime(elapsed)}</Text>
          <Text style={[styles.routineName, { color: colors.mutedForeground }]}>
            {routine?.name ?? "Quick Workout"}
          </Text>
        </View>
        <Pressable
          onPress={finishWorkout}
          style={[styles.finishBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.finishText}>Finish</Text>
        </Pressable>
      </View>

      {/* Rest Timer Banner */}
      {restTimer !== null && (
        <View style={[styles.restBanner, { backgroundColor: colors.primary + "22", borderBottomColor: colors.primary + "44" }]}>
          <Feather name="clock" size={16} color={colors.primary} />
          <Text style={[styles.restText, { color: colors.primary }]}>Rest: {restTimer}s</Text>
          <Pressable onPress={() => setRestTimer(null)}>
            <Text style={[styles.restSkip, { color: colors.primary }]}>Skip</Text>
          </Pressable>
        </View>
      )}

      {/* Volume Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.foreground }]}>{Math.round(totalVolume).toLocaleString()}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>lbs volume</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.foreground }]}>{completedSets}/{totalSets}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>sets done</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.foreground }]}>{entries.length}</Text>
          <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>exercises</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="plus-circle" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add exercises to start</Text>
          </View>
        )}

        {entries.map((entry, exIdx) => (
          <View key={`${entry.exercise.id}-${exIdx}`} style={[styles.exerciseBlock, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Exercise header with 3-dot menu */}
            <View style={styles.exHeader}>
              <View style={[styles.catChip, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.catChipText, { color: colors.primary }]}>{entry.exercise.category}</Text>
              </View>
              <Text style={[styles.exName, { color: colors.foreground, flex: 1, marginHorizontal: 8 }]}>{entry.exercise.name}</Text>
              <Pressable
                onPress={() => setExMenuIdx(exMenuIdx === exIdx ? null : exIdx)}
                style={{ padding: 6 }}
                hitSlop={8}
              >
                <Feather name="more-vertical" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* 3-dot dropdown menu */}
            {exMenuIdx === exIdx && (
              <View style={[styles.exMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                  onPress={() => openRestEdit(exIdx)}
                  style={[styles.exMenuItem, { borderBottomColor: colors.border }]}
                >
                  <Feather name="clock" size={15} color={colors.foreground} />
                  <Text style={[styles.exMenuText, { color: colors.foreground }]}>
                    Edit Rest ({entry.exercise.rest}s)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Alert.alert("Remove Exercise", `Remove "${entry.exercise.name}" from this workout?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => deleteExercise(exIdx) },
                    ]);
                  }}
                  style={styles.exMenuItem}
                >
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                  <Text style={[styles.exMenuText, { color: colors.destructive }]}>Remove Exercise</Text>
                </Pressable>
              </View>
            )}

            {/* Set Headers */}
            <View style={[styles.setHeaderRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.setHeaderCell, { color: colors.mutedForeground, width: 32 }]}>#</Text>
              <Text style={[styles.setHeaderCell, { color: colors.mutedForeground, flex: 1 }]}>Weight (lbs)</Text>
              <Text style={[styles.setHeaderCell, { color: colors.mutedForeground, flex: 1 }]}>Reps</Text>
              <Text style={[styles.setHeaderCell, { color: colors.mutedForeground, width: 64, textAlign: "center" }]}>Done</Text>
            </View>

            {entry.sets.map((set, setIdx) => (
              <Pressable
                key={setIdx}
                onLongPress={() => !set.done && confirmDeleteSet(exIdx, setIdx)}
                delayLongPress={500}
                style={[styles.setRow, { borderBottomColor: colors.border, backgroundColor: set.done ? colors.primary + "0d" : "transparent" }]}
              >
                <Text style={[styles.setNum, { color: colors.mutedForeground }]}>{setIdx + 1}</Text>
                <TextInput
                  style={[styles.setInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: set.done ? colors.primary + "44" : colors.border }]}
                  value={set.weight}
                  onChangeText={(v) => updateSet(exIdx, setIdx, "weight", v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  editable={!set.done}
                />
                <TextInput
                  style={[styles.setInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: set.done ? colors.primary + "44" : colors.border }]}
                  value={set.reps}
                  onChangeText={(v) => updateSet(exIdx, setIdx, "reps", v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                  editable={!set.done}
                />
                <Pressable
                  onPress={() => {
                    if (!set.done) {
                      completeSet(exIdx, setIdx, entry.exercise.rest);
                    } else {
                      updateSet(exIdx, setIdx, "done", false);
                    }
                  }}
                  style={[
                    styles.doneBtn,
                    { backgroundColor: set.done ? colors.primary : colors.muted, borderColor: set.done ? colors.primary : colors.border },
                  ]}
                >
                  <Feather name={set.done ? "check" : "circle"} size={16} color={set.done ? "#fff" : colors.mutedForeground} />
                </Pressable>
              </Pressable>
            ))}

            <Pressable onPress={() => addSet(exIdx)} style={styles.addSetBtn}>
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addSetText, { color: colors.primary }]}>Add Set</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => setShowAdd(true)}
          style={[styles.addExBtn, { backgroundColor: colors.card, borderColor: colors.primary + "55", borderStyle: "dashed" }]}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={[styles.addExText, { color: colors.primary }]}>Add Exercise</Text>
        </Pressable>
      </ScrollView>

      {/* Add Exercise Sheet */}
      {showAdd && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Exercise</Text>
              <Pressable onPress={() => { setShowAdd(false); setSearchQuery(""); setFilterCategory("All"); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                placeholderTextColor={colors.mutedForeground}
                autoCorrect={false}
              />
              {searchQuery !== "" && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>

            {/* Category filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {EXERCISE_CATEGORIES.map((cat) => {
                const active = filterCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setFilterCategory(cat)}
                    style={[
                      styles.catFilterChip,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? "#fff" : colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {filteredExercises.length === 0 ? (
                <View style={{ paddingVertical: 28, alignItems: "center" }}>
                  <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }]}>No exercises found</Text>
                </View>
              ) : (
                filteredExercises.map((ex) => (
                  <Pressable
                    key={ex.id}
                    onPress={() => addExercise(ex)}
                    style={[styles.exPickRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exPickName, { color: colors.foreground }]}>{ex.name}</Text>
                      <Text style={[styles.exPickMeta, { color: colors.mutedForeground }]}>
                        {ex.category} · {ex.equipment} · {ex.sets}×{ex.reps}
                      </Text>
                    </View>
                    <Feather name="plus" size={18} color={colors.primary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Edit Rest Timer Modal */}
      {editRestIdx !== null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 32 }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: 20, borderRadius: 20 }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground, marginBottom: 12 }]}>Edit Rest Timer</Text>
            <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 16 }]}>
              Seconds between sets for {entries[editRestIdx]?.exercise.name ?? "this exercise"}.
            </Text>
            <TextInput
              style={[styles.setInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted, fontSize: 22, padding: 14, textAlign: "center" }]}
              value={editRestValue}
              onChangeText={setEditRestValue}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable
                onPress={() => setEditRestIdx(null)}
                style={[{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", borderColor: colors.border }]}
              >
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveRestEdit}
                style={[{ flex: 1, padding: 14, borderRadius: 12, alignItems: "center", backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#fff", fontFamily: "Inter_700Bold" }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timerText: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  routineName: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  finishBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  finishText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  restBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1 },
  restText: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  restSkip: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsBar: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 10, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 28 },
  exerciseBlock: { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  exHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, paddingBottom: 10 },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  setHeaderRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8, borderBottomWidth: 1, gap: 8 },
  setHeaderCell: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  setRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  setNum: { width: 24, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  setInput: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 8, textAlign: "center", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  doneBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addSetBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, paddingHorizontal: 14 },
  addSetText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  addExBtn: { borderRadius: 16, borderWidth: 2, padding: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 4 },
  addExText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 14 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  exPickRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  exPickName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  exPickMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  catFilterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  exMenu: { borderWidth: 1, borderRadius: 12, marginHorizontal: 14, marginBottom: 8, overflow: "hidden" },
  exMenuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5 },
  exMenuText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
