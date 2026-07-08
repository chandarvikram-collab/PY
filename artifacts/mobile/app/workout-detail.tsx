import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { useApp } from "@/context/AppContext";
import { socialFetch } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { ExerciseLog, SetLog, WorkoutSession } from "@/context/AppContext";

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function epley1RM(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

export default function WorkoutDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateWorkoutSession } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editRestOpen, setEditRestOpen] = useState(false);
  const [editExIndex, setEditExIndex] = useState(0);
  const [editSetIndex, setEditSetIndex] = useState(0);
  const [restDraft, setRestDraft] = useState("90");
  const [patchError, setPatchError] = useState<string | null>(null);

  // ── PR state ──────────────────────────────────────────────────────────────
  // Maps exercise name → the estimated 1RM that was a PR in THIS session.
  // Sourced from session_prs (append-only historical table) so older sessions
  // keep their badges even after later workouts set higher records.
  const [sessionPrMap, setSessionPrMap] = useState<Record<string, number>>({});
  const [prsLoaded, setPrsLoaded] = useState(false);

  const session: WorkoutSession | undefined = useMemo(() => {
    return state.workoutHistory.find((w) => w.id === id);
  }, [state.workoutHistory, id]);

  useEffect(() => {
    if (session || !id) return;
    setLoading(true);
    socialFetch(`/sessions/workout/id/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((row: any) => {
        const ws: WorkoutSession = {
          id: row.id,
          type: "lift",
          name: row.name,
          date: row.date,
          duration: row.durationSeconds ?? 0,
          volume: Math.round((row.volumeKg ?? 0) / 0.453592),
          exercises: row.exerciseCount ?? 0,
          exerciseLog: (row.exerciseLogJson as ExerciseLog[]) ?? [],
        };
        updateWorkoutSession(ws.id, ws);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id, session, updateWorkoutSession]);

  // ── Fetch session PRs after session is available ──────────────────────────
  // Uses /prs/session/:id (append-only historical log) so badges are permanent
  // even when future workouts set higher records for the same exercise.
  useEffect(() => {
    if (!session || prsLoaded) return;
    socialFetch(`/prs/session/${session.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { prs: Array<{ exerciseName: string; estimatedOneRm: number }> }) => {
        const map: Record<string, number> = {};
        for (const p of data.prs ?? []) {
          map[p.exerciseName] = p.estimatedOneRm;
        }
        setSessionPrMap(map);
        setPrsLoaded(true);
      })
      .catch(() => {
        // Silent fail — badges simply won't appear; no error shown to user
        setPrsLoaded(true);
      });
  }, [session, prsLoaded]);

  const isPrSet = useCallback(
    (exerciseName: string, weight: number, reps: number): boolean => {
      if (!prsLoaded || weight <= 0 || reps <= 0) return false;
      const sessionPrOneRm = sessionPrMap[exerciseName];
      if (sessionPrOneRm == null) return false;
      // Show badge on the set(s) whose Epley 1RM matches this session's recorded PR
      return Math.abs(epley1RM(weight, reps) - sessionPrOneRm) < 0.1;
    },
    [sessionPrMap, prsLoaded],
  );

  const openRestEdit = useCallback(
    (exIdx: number, setIdx: number, currentRest: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEditExIndex(exIdx);
      setEditSetIndex(setIdx);
      setRestDraft(String(currentRest));
      setEditRestOpen(true);
      setPatchError(null);
    },
    [],
  );

  const saveRest = useCallback(() => {
    if (!session) return;
    const newRest = Math.max(0, parseInt(restDraft) || 90);
    const updatedLog = session.exerciseLog.map((ex, ei) =>
      ei === editExIndex
        ? {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === editSetIndex ? { ...s, restSeconds: newRest } : s,
            ),
          }
        : ex,
    );

    updateWorkoutSession(session.id, { exerciseLog: updatedLog });

    socialFetch(`/sessions/workout/id/${session.id}`, {
      method: "PATCH",
      body: JSON.stringify({ exerciseLogJson: updatedLog }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Save failed");
        setEditRestOpen(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch((e) => {
        setPatchError(e.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      });
  }, [session, editExIndex, editSetIndex, restDraft, updateWorkoutSession]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 40, alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 40, alignItems: "center" }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12, fontFamily: "Inter_500Medium" }}>
          {error ?? "Workout not found"}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{session.name}</Text>
            <Text style={[styles.headerMeta, { color: colors.mutedForeground }]}>
              {session.date} · {fmtDuration(session.duration)} · {Math.round(session.volume / 1000).toFixed(1)}k lbs
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18 }}>
          {session.exerciseLog.map((ex, exIdx) => (
            <View
              key={exIdx}
              style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.exHeader}>
                <View style={[styles.exIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name="layers" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exName, { color: colors.foreground }]}>{ex.name}</Text>
                  <Text style={[styles.exCategory, { color: colors.mutedForeground }]}>{ex.category}</Text>
                </View>
              </View>

              {ex.sets.map((s, si) => {
                const isPr = isPrSet(ex.name, s.weight, s.reps);
                return (
                  <Pressable
                    key={si}
                    onPress={() => openRestEdit(exIdx, si, s.restSeconds ?? 90)}
                    style={({ pressed }) => [
                      styles.setRow,
                      {
                        borderBottomColor: colors.border,
                        borderBottomWidth: si < ex.sets.length - 1 ? 0.5 : 0,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.setNum, { color: colors.mutedForeground }]}>Set {si + 1}</Text>
                    <Text style={[styles.setVal, { color: colors.foreground }]}>
                      {s.weight} lbs × {s.reps}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {isPr && (
                        <View style={[styles.prBadge, { backgroundColor: "#f59e0b22", borderColor: "#f59e0b" }]}>
                          <Text style={styles.prBadgeText}>🏆 PR</Text>
                        </View>
                      )}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="clock" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.restText, { color: colors.mutedForeground }]}>
                          {s.restSeconds ?? 90}s
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={editRestOpen} transparent animationType="fade" onRequestClose={() => setEditRestOpen(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Set Rest Timer</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Rest after Set {editSetIndex + 1}
            </Text>

            {patchError && (
              <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 10 }}>
                {patchError}
              </Text>
            )}

            <View style={styles.restInputRow}>
              <TextInput
                style={[styles.restInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={restDraft}
                onChangeText={setRestDraft}
                keyboardType="number-pad"
                maxLength={4}
                selectTextOnFocus
              />
              <Text style={[styles.restUnit, { color: colors.mutedForeground }]}>seconds</Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditRestOpen(false)}
                style={[styles.modalBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveRest}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  exCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  exHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  exIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginLeft: 10 },
  exCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 10 },
  setRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  setNum: { width: 50, fontSize: 12, fontFamily: "Inter_500Medium" },
  setVal: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  restText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  prBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  prBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#f59e0b" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  modalCard: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 340 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 18 },
  restInputRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 },
  restInput: { width: 100, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  restUnit: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
