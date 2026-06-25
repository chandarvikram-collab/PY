import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import type { FoodEntry } from "@/context/AppContext";
import type { FoodItem } from "@/constants/foods";
import { useColors } from "@/hooks/useColors";

const MULTIPLIERS: { label: string; value: number }[] = [
  { label: "½×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

const NUTRIENTS: { key: keyof typeof EMPTY; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", color: "#E8151B" },
  { key: "protein", label: "Protein", unit: "g", color: "#3b82f6" },
  { key: "carbs", label: "Carbs", unit: "g", color: "#f59e0b" },
  { key: "fat", label: "Fat", unit: "g", color: "#8b5cf6" },
  { key: "fiber", label: "Fiber", unit: "g", color: "#22c55e" },
  { key: "sugar", label: "Sugar", unit: "g", color: "#ec4899" },
  { key: "sodium", label: "Sodium", unit: "mg", color: "#6b7280" },
];

const EMPTY = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function FoodDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addFoodEntry, updateFoodEntry } = useApp();

  const params = useLocalSearchParams<{ food: string; meal?: string; entryId?: string; date?: string }>();
  const food: FoodItem = useMemo(() => JSON.parse(params.food ?? "{}"), [params.food]);
  const meal = (params.meal ?? "") as FoodEntry["meal"] | "";
  const entryId = params.entryId ?? "";
  const entryDate = params.date ?? todayStr();
  const isEditMode = !!entryId;

  const [multiplier, setMultiplier] = useState(1);
  const [customGrams, setCustomGrams] = useState("");
  const [customActive, setCustomActive] = useState(false);

  const scale = useMemo(() => {
    if (customActive && customGrams && !isNaN(Number(customGrams)) && Number(customGrams) > 0) {
      return Number(customGrams) / food.servingSize;
    }
    return multiplier;
  }, [customActive, customGrams, multiplier, food.servingSize]);

  const scaled = useMemo(() => ({
    calories: Math.round((food.calories ?? 0) * scale),
    protein: Math.round((food.protein ?? 0) * scale * 10) / 10,
    carbs: Math.round((food.carbs ?? 0) * scale * 10) / 10,
    fat: Math.round((food.fat ?? 0) * scale * 10) / 10,
    fiber: Math.round((food.fiber ?? 0) * scale * 10) / 10,
    sugar: Math.round((food.sugar ?? 0) * scale * 10) / 10,
    sodium: Math.round((food.sodium ?? 0) * scale),
  }), [food, scale]);

  const servingGrams = useMemo(() => {
    if (customActive && customGrams && Number(customGrams) > 0) return `${customGrams}g`;
    return `${Math.round(food.servingSize * multiplier)}g`;
  }, [customActive, customGrams, food.servingSize, multiplier]);

  function handleAdd() {
    if (!meal) return;
    const entry: FoodEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: food.name,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      fiber: scaled.fiber,
      sugar: scaled.sugar,
      sodium: scaled.sodium,
      meal: meal as FoodEntry["meal"],
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayStr(), entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function handleSave() {
    if (!entryId) return;
    updateFoodEntry(entryDate, entryId, {
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      fiber: scaled.fiber,
      sugar: scaled.sugar,
      sodium: scaled.sodium,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.backBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            {isEditMode && (
              <View style={[s.editBadge, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="edit-2" size={10} color={colors.primary} />
                <Text style={[s.editBadgeText, { color: colors.primary }]}>Editing entry</Text>
              </View>
            )}
            <Text style={[s.title, { color: colors.foreground }]} numberOfLines={2}>{food.name}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Serving info */}
        <View style={[s.servingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="package" size={14} color={colors.mutedForeground} />
          <Text style={[s.servingText, { color: colors.mutedForeground }]}>
            {isEditMode
              ? `Logged: ${food.servingSize}${food.servingUnit.includes("g") ? "" : " "}${food.servingUnit}`
              : `1 serving = ${food.servingSize}${food.servingUnit.includes("g") ? "" : " "}${food.servingUnit}`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={[s.scaledServing, { color: colors.foreground }]}>{servingGrams}</Text>
        </View>

        {/* Nutrient Grid */}
        <View style={[s.nutrientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>NUTRITION FACTS</Text>
          <View style={s.nutrientGrid}>
            {NUTRIENTS.map((n) => (
              <View key={n.key} style={[s.nutrientCell, { borderColor: colors.border }]}>
                <View style={[s.nutrientDot, { backgroundColor: n.color }]} />
                <Text style={[s.nutrientVal, { color: colors.foreground }]}>
                  {String(scaled[n.key])}
                  <Text style={[s.nutrientUnit, { color: colors.mutedForeground }]}>{n.unit}</Text>
                </Text>
                <Text style={[s.nutrientLabel, { color: colors.mutedForeground }]}>{n.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Serving Adjuster */}
        <View style={[s.adjCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
            {isEditMode ? "ADJUST SERVING SIZE" : "SERVING SIZE"}
          </Text>
          <View style={s.multRow}>
            {MULTIPLIERS.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => { setMultiplier(m.value); setCustomActive(false); setCustomGrams(""); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  s.multBtn,
                  {
                    backgroundColor: !customActive && multiplier === m.value ? colors.primary : colors.muted,
                    borderColor: !customActive && multiplier === m.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[s.multBtnText, { color: !customActive && multiplier === m.value ? "#fff" : colors.foreground }]}>
                  {m.label}
                </Text>
                <Text style={[s.multBtnSub, { color: !customActive && multiplier === m.value ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                  {Math.round(food.servingSize * m.value)}g
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.customRow}>
            <TextInput
              style={[s.customInput, { backgroundColor: colors.muted, borderColor: customActive ? colors.primary : colors.border, color: colors.foreground }]}
              value={customGrams}
              onChangeText={(v) => { setCustomGrams(v); setCustomActive(true); }}
              onFocus={() => setCustomActive(true)}
              placeholder="Custom grams"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />
            <Text style={[s.customUnit, { color: colors.mutedForeground }]}>g</Text>
          </View>
        </View>

        {/* Action button */}
        {isEditMode ? (
          <Pressable
            onPress={handleSave}
            style={[s.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="check" size={18} color="#fff" />
            <Text style={s.addBtnText}>Save changes</Text>
          </Pressable>
        ) : (
          !!meal && (
            <Pressable
              onPress={handleAdd}
              style={[s.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={s.addBtnText}>Add to {meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
            </Pressable>
          )
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  editBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  editBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  servingRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  servingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scaledServing: { fontSize: 13, fontFamily: "Inter_700Bold" },
  nutrientCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 14 },
  nutrientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 1 },
  nutrientCell: { width: "33.33%", paddingVertical: 14, paddingHorizontal: 12, alignItems: "center", borderWidth: 0.5 },
  nutrientDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  nutrientVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  nutrientUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  nutrientLabel: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 2 },
  adjCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  multRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  multBtn: { flex: 1, borderRadius: 10, borderWidth: 1, alignItems: "center", paddingVertical: 10 },
  multBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  multBtnSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  customRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  customInput: { flex: 1, borderRadius: 10, borderWidth: 1.5, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  customUnit: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  addBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
