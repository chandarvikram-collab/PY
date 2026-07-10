import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

import { useApp } from "@/context/AppContext";
import { AVAILABLE_EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/useColors";
import type { Exercise, Routine } from "@/context/AppContext";

const CATEGORY_COLORS: Record<string, string> = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Legs: "#8b5cf6",
  Shoulders: "#f59e0b",
  Arms: "#22c55e",
  Core: "#06b6d4",
};

export default function TemplateBuilderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addRoutine, updateRoutine, deleteRoutine } = useApp();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();

  const editingRoutine = useMemo(
    () => (routineId ? state.routines.find((r) => r.id === routineId) ?? null : null),
    [routineId, state.routines],
  );
  const isEditing = !!editingRoutine;

  const [name, setName] = useState(editingRoutine?.name ?? "");
  const [selected, setSelected] = useState<Exercise[]>(editingRoutine?.exercises ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editSets, setEditSets] = useState("");
  const [editReps, setEditReps] = useState("");
  const [editRest, setEditRest] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  React.useEffect(() => {
    if (routineId && !editingRoutine) {
      Alert.alert("Template Not Found", "This template no longer exists.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineId]);

  function addExercise(ex: Exercise) {
    setSelected((prev) => [...prev, ex]);
    setShowAdd(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function removeExercise(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function moveExercise(idx: number, dir: -1 | 1) {
    setSelected((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function openEdit(idx: number) {
    const ex = selected[idx];
    setEditIndex(idx);
    setEditSets(String(ex.sets));
    setEditReps(String(ex.reps));
    setEditRest(String(ex.rest));
  }

  function closeEdit() {
    setEditIndex(null);
  }

  function saveEdit() {
    if (editIndex === null) return;
    const sets = Math.max(1, parseInt(editSets, 10) || 1);
    const reps = Math.max(1, parseInt(editReps, 10) || 1);
    const rest = Math.max(0, parseInt(editRest, 10) || 0);
    setSelected((prev) =>
      prev.map((ex, i) => (i === editIndex ? { ...ex, sets, reps, rest } : ex)),
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditIndex(null);
  }

  function saveTemplate() {
    if (!name.trim() || selected.length === 0) return;
    if (isEditing && editingRoutine) {
      updateRoutine(editingRoutine.id, { name: name.trim(), exercises: selected });
    } else {
      const routine: Routine = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        name: name.trim(),
        exercises: selected,
      };
      addRoutine(routine);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function confirmDelete() {
    if (!editingRoutine) return;
    Alert.alert(
      "Delete Template",
      `Delete "${editingRoutine.name}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRoutine(editingRoutine.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ],
    );
  }

  const canCreate = name.trim().length > 0 && selected.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEditing ? "Edit Template" : "New Template"}
        </Text>
        {isEditing ? (
          <Pressable onPress={confirmDelete} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="trash-2" size={18} color="#ef4444" />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Template Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
        />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercises</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{selected.length} added</Text>
        </View>

        {selected.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="list" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No exercises yet</Text>
          </View>
        )}

        {selected.map((ex, idx) => (
          <View key={`${ex.id}-${idx}`} style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reorderCol}>
              <Pressable
                onPress={() => moveExercise(idx, -1)}
                disabled={idx === 0}
                hitSlop={6}
                style={styles.reorderBtn}
              >
                <Feather name="chevron-up" size={16} color={idx === 0 ? colors.border : colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => moveExercise(idx, 1)}
                disabled={idx === selected.length - 1}
                hitSlop={6}
                style={styles.reorderBtn}
              >
                <Feather
                  name="chevron-down"
                  size={16}
                  color={idx === selected.length - 1 ? colors.border : colors.mutedForeground}
                />
              </Pressable>
            </View>
            <Pressable onPress={() => openEdit(idx)} style={{ flex: 1 }}>
              <Text style={[styles.exName, { color: colors.foreground }]}>{ex.name}</Text>
              <View style={styles.exMetaRow}>
                <View style={[styles.catChip, { backgroundColor: (CATEGORY_COLORS[ex.category] ?? colors.primary) + "22" }]}>
                  <Text style={[styles.catChipText, { color: CATEGORY_COLORS[ex.category] ?? colors.primary }]}>{ex.category}</Text>
                </View>
                <Text style={[styles.exMeta, { color: colors.mutedForeground }]}>
                  {ex.sets} sets · {ex.reps} reps · {ex.rest}s rest
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => openEdit(idx)} style={styles.removeBtn}>
              <Feather name="edit-2" size={16} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => removeExercise(idx)} style={styles.removeBtn}>
              <Feather name="trash-2" size={16} color="#ef4444" />
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

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <Pressable
          onPress={saveTemplate}
          disabled={!canCreate}
          style={[styles.createBtn, { backgroundColor: canCreate ? colors.primary : colors.border }]}
        >
          <Text style={[styles.createBtnText, { color: canCreate ? "#fff" : colors.mutedForeground }]}>
            {isEditing ? "Save Changes" : "Create Template"}
          </Text>
        </Pressable>
      </View>

      {showAdd && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add Exercise</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {AVAILABLE_EXERCISES.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => addExercise(ex)}
                  style={[styles.exPickRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exPickName, { color: colors.foreground }]}>{ex.name}</Text>
                    <Text style={[styles.exPickMeta, { color: colors.mutedForeground }]}>
                      {ex.category} · {ex.equipment} · {ex.sets}x{ex.reps}
                    </Text>
                  </View>
                  <Feather name="plus" size={18} color={colors.primary} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {editIndex !== null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selected[editIndex]?.name}</Text>
              <Pressable onPress={closeEdit}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.editRow}>
              <View style={styles.editField}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Sets</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, marginBottom: 0 }]}
                  value={editSets}
                  onChangeText={setEditSets}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Reps</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, marginBottom: 0 }]}
                  value={editReps}
                  onChangeText={setEditReps}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
              <View style={styles.editField}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Rest (s)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, marginBottom: 0 }]}
                  value={editRest}
                  onChangeText={setEditRest}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </View>
            </View>

            <Pressable onPress={saveEdit} style={[styles.createBtn, { backgroundColor: colors.primary, marginTop: 20 }]}>
              <Text style={[styles.createBtnText, { color: "#fff" }]}>Save</Text>
            </Pressable>
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, fontFamily: "Inter_500Medium", marginBottom: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  exCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  exName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  exMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  catChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  exMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  removeBtn: { padding: 8 },
  reorderCol: { marginRight: 10, gap: 2 },
  reorderBtn: { padding: 4 },
  editRow: { flexDirection: "row", gap: 10 },
  editField: { flex: 1, gap: 8 },
  addExBtn: { borderRadius: 16, borderWidth: 2, padding: 18, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 4 },
  addExText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { padding: 18, borderTopWidth: 1 },
  createBtn: { padding: 16, borderRadius: 14, alignItems: "center" },
  createBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  exPickRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  exPickName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  exPickMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
