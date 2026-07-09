import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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

import { socialFetch, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { AIPlanWorkout, Routine } from "@/context/AppContext";

type ScheduledWorkout = {
  id: string;
  userId: string;
  date: string;
  title: string;
  source: "routine" | "ai_plan" | "custom";
  routineId: string | null;
  exercises: { name: string; sets: number; reps: string; restSeconds: number }[];
  completed: boolean;
  createdAt: string;
};

type CalendarItem =
  | { kind: "scheduled"; id: string; title: string; completed: boolean; workout: ScheduledWorkout }
  | { kind: "ai_plan"; id: string; title: string; workout: AIPlanWorkout };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// The AI plan stores workouts as "Day 1", "Day 2", ... per week rather than
// calendar weekdays. We overlay them onto the calendar by distributing each
// week's workouts across Mon-Sat (skipping Sunday as a rest day), starting
// from the current week and repeating/looping the plan's weeks going forward.
// This is a display-only overlay -- it is never persisted.
function buildAiPlanOverlay(
  weeks: { weekNumber: number; workouts: AIPlanWorkout[] }[],
): Map<string, AIPlanWorkout[]> {
  const overlay = new Map<string, AIPlanWorkout[]>();
  if (weeks.length === 0) return overlay;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekday = today.getDay();
  const daysSinceMonday = currentWeekday === 0 ? 6 : currentWeekday - 1;
  const mondayOfThisWeek = new Date(today);
  mondayOfThisWeek.setDate(today.getDate() - daysSinceMonday);

  const weeksToRender = 8;
  for (let w = 0; w < weeksToRender; w++) {
    const plan = weeks[w % weeks.length];
    const weekStart = new Date(mondayOfThisWeek);
    weekStart.setDate(mondayOfThisWeek.getDate() + w * 7);

    plan.workouts.forEach((workout, idx) => {
      if (idx > 5) return;
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + idx);
      const key = toDateKey(date);
      const existing = overlay.get(key) ?? [];
      overlay.set(key, [...existing, workout]);
    });
  }

  return overlay;
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, apiUserId } = useApp();
  const { routines, userProfile } = state;
  const aiPlan = userProfile.aiPlan;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today));

  const [scheduled, setScheduled] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addRoutine, setAddRoutine] = useState<Routine | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSchedule = useCallback(async () => {
    if (!apiUserId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await socialFetch(`/schedule/${apiUserId}`);
      if (!r.ok) throw new Error("Failed to load schedule");
      const data = (await r.json()) as { scheduledWorkouts: ScheduledWorkout[] };
      setScheduled(data.scheduledWorkouts);
    } catch {
      setError("Couldn't load your calendar. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [apiUserId]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const aiOverlay = useMemo(
    () => (aiPlan ? buildAiPlanOverlay(aiPlan.weeks) : new Map<string, AIPlanWorkout[]>()),
    [aiPlan],
  );

  const scheduledByDate = useMemo(() => {
    const map = new Map<string, ScheduledWorkout[]>();
    for (const s of scheduled) {
      const list = map.get(s.date) ?? [];
      map.set(s.date, [...list, s]);
    }
    return map;
  }, [scheduled]);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  function goPrevMonth() {
    Haptics.selectionAsync();
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  }
  function goNextMonth() {
    Haptics.selectionAsync();
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  }

  const selectedItems: CalendarItem[] = useMemo(() => {
    const items: CalendarItem[] = [];
    for (const s of scheduledByDate.get(selectedDate) ?? []) {
      items.push({ kind: "scheduled", id: s.id, title: s.title, completed: s.completed, workout: s });
    }
    for (const w of aiOverlay.get(selectedDate) ?? []) {
      items.push({ kind: "ai_plan", id: `${selectedDate}-${w.day}-${w.name}`, title: w.name, workout: w });
    }
    return items;
  }, [scheduledByDate, aiOverlay, selectedDate]);

  async function handleAdd() {
    if (!apiUserId) return;
    const title = addRoutine ? addRoutine.name : addTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const exercises = addRoutine
        ? addRoutine.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: String(e.reps),
            restSeconds: e.rest,
          }))
        : [];
      const r = await socialFetch("/schedule", {
        method: "POST",
        body: JSON.stringify({
          date: selectedDate,
          title,
          source: addRoutine ? "routine" : "custom",
          exercises,
        }),
      });
      if (!r.ok) throw new Error("Failed to schedule workout");
      const created = (await r.json()) as ScheduledWorkout;
      setScheduled((prev) => [...prev, created]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      setAddTitle("");
      setAddRoutine(null);
    } catch {
      setError("Couldn't schedule that workout. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(item: ScheduledWorkout) {
    const nextCompleted = !item.completed;
    setScheduled((prev) => prev.map((s) => (s.id === item.id ? { ...s, completed: nextCompleted } : s)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const r = await socialFetch(`/schedule/${item.id}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (!r.ok) throw new Error("failed");
    } catch {
      setScheduled((prev) => prev.map((s) => (s.id === item.id ? { ...s, completed: item.completed } : s)));
    }
  }

  async function deleteScheduled(item: ScheduledWorkout) {
    const prevList = scheduled;
    setScheduled((prev) => prev.filter((s) => s.id !== item.id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const r = await socialFetch(`/schedule/${item.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("failed");
    } catch {
      setScheduled(prevList);
      setError("Couldn't delete that workout. Please try again.");
    }
  }

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const isToday = (d: Date) => toDateKey(d) === toDateKey(today);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Calendar</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.monthNav}>
          <Pressable onPress={goPrevMonth} style={styles.monthArrow}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={goNextMonth} style={styles.monthArrow}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <Text key={i} style={[styles.weekdayLabel, { color: colors.mutedForeground }]}>{w}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const key = toDateKey(d);
            const hasScheduled = (scheduledByDate.get(key)?.length ?? 0) > 0;
            const hasAiPlan = (aiOverlay.get(key)?.length ?? 0) > 0;
            const selected = key === selectedDate;
            return (
              <Pressable
                key={i}
                onPress={() => { setSelectedDate(key); Haptics.selectionAsync(); }}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.dayCircle,
                    selected && { backgroundColor: colors.primary },
                    !selected && isToday(d) && { borderWidth: 1, borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      { color: selected ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.dotRow}>
                  {hasScheduled && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                  {hasAiPlan && <View style={[styles.dot, { backgroundColor: "#8b5cf6" }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#8b5cf6" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>AI plan</Text>
          </View>
        </View>

        <View style={styles.dayHeaderRow}>
          <Text style={[styles.dayHeaderTitle, { color: colors.foreground }]}>
            {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long", month: "long", day: "numeric",
            })}
          </Text>
          <Pressable
            onPress={() => setShowAdd(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
            <Pressable onPress={loadSchedule} style={[styles.retryBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </Pressable>
          </View>
        ) : selectedItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Nothing scheduled for this day yet
            </Text>
          </View>
        ) : (
          selectedItems.map((item) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={[
                      styles.sourceBadge,
                      { backgroundColor: item.kind === "ai_plan" ? "#8b5cf622" : colors.primary + "22" },
                    ]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "600", color: item.kind === "ai_plan" ? "#8b5cf6" : colors.primary }}>
                      {item.kind === "ai_plan" ? "AI PLAN" : item.workout.source === "routine" ? "ROUTINE" : "CUSTOM"}
                    </Text>
                  </View>
                  {item.kind === "scheduled" && item.completed && (
                    <Feather name="check-circle" size={14} color={colors.success} />
                  )}
                </View>
                <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {item.kind === "ai_plan"
                    ? `${item.workout.exercises.length} exercises`
                    : `${item.workout.exercises.length} exercises`}
                </Text>
              </View>
              {item.kind === "scheduled" && (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable onPress={() => toggleComplete(item.workout)} style={styles.rowIconBtn}>
                    <Feather
                      name={item.completed ? "rotate-ccw" : "check"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                  <Pressable onPress={() => deleteScheduled(item.workout)} style={styles.rowIconBtn}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Schedule a workout</Text>

            {routines.length > 0 && (
              <>
                <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>From a routine</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {routines.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => { setAddRoutine(r); setAddTitle(""); }}
                      style={[
                        styles.routineChip,
                        { borderColor: colors.border },
                        addRoutine?.id === r.id && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={{ color: addRoutine?.id === r.id ? colors.primaryForeground : colors.foreground, fontSize: 13 }}>
                        {r.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Or custom title</Text>
            <TextInput
              value={addTitle}
              onChangeText={(t) => { setAddTitle(t); setAddRoutine(null); }}
              placeholder="e.g. Leg day"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <Pressable
                onPress={() => { setShowAdd(false); setAddTitle(""); setAddRoutine(null); }}
                style={[styles.modalBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                disabled={saving || (!addTitle.trim() && !addRoutine)}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.primary, borderColor: colors.primary },
                  (saving || (!addTitle.trim() && !addRoutine)) && { opacity: 0.5 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Schedule</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 17, fontWeight: "600" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 12 },
  monthArrow: { padding: 6 },
  monthLabel: { fontSize: 20, fontWeight: "700" },
  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 6 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayNum: { fontSize: 14, fontWeight: "500" },
  dotRow: { flexDirection: "row", gap: 3, marginTop: 4, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 8, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 12 },
  dayHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  dayHeaderTitle: { fontSize: 16, fontWeight: "600" },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorCard: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: "center", gap: 12 },
  errorText: { fontSize: 14, textAlign: "center" },
  retryBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { fontWeight: "600" },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 28, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, textAlign: "center" },
  itemCard: { flexDirection: "row", borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, alignItems: "center" },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  itemTitle: { fontSize: 15, fontWeight: "600", marginTop: 6 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  rowIconBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderWidth: 1, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  modalLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  routineChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
