import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import { useColors } from "@/hooks/useColors";
import type { FoodEntry } from "@/context/AppContext";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_COLORS = { breakfast: "#f59e0b", lunch: "#22c55e", dinner: "#3b82f6", snack: "#8b5cf6" };
const MEAL_ICONS = { breakfast: "sun", lunch: "package", dinner: "moon", snack: "coffee" };

const QUICK_FOODS: { name: string; calories: number; protein: number; carbs: number; fat: number }[] = [
  { name: "Chicken Breast (200g)", calories: 330, protein: 62, carbs: 0, fat: 7 },
  { name: "White Rice (1 cup)", calories: 206, protein: 4, carbs: 45, fat: 0 },
  { name: "Eggs x2 scrambled", calories: 180, protein: 14, carbs: 2, fat: 12 },
  { name: "Protein Shake", calories: 220, protein: 40, carbs: 8, fat: 3 },
  { name: "Oatmeal (1 cup)", calories: 300, protein: 10, carbs: 54, fat: 6 },
  { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Peanut Butter Toast", calories: 280, protein: 9, carbs: 30, fat: 14 },
  { name: "Greek Yogurt (150g)", calories: 130, protein: 18, carbs: 9, fat: 1 },
];

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const colors = useColors();
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.macroVal, { color: colors.foreground }]}>{value}g</Text>
      </View>
      <View style={[styles.macroBar, { backgroundColor: colors.border }]}>
        <View style={[styles.macroFill, { backgroundColor: color, width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

export default function CaloriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addFoodEntry, removeFoodEntry, updateWater, getTodayCalories } = useApp();
  const { userProfile } = state;

  const today = getTodayCalories();
  const [addingMeal, setAddingMeal] = useState<typeof MEAL_TYPES[number] | null>(null);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [showQuick, setShowQuick] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const totals = useMemo(() => {
    return today.entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [today.entries]);

  const calPct = Math.min(100, (totals.calories / today.goal) * 100);
  const remaining = today.goal - totals.calories;

  function openAdd(meal: typeof MEAL_TYPES[number]) {
    setAddingMeal(meal);
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setShowQuick(false);
  }

  function handleQuickAdd(food: typeof QUICK_FOODS[number]) {
    if (!addingMeal) return;
    const entry: FoodEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(today.date, entry);
    setAddingMeal(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleManualAdd() {
    if (!addingMeal || !foodName.trim() || !calories) return;
    const entry: FoodEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: foodName.trim(),
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(today.date, entry);
    setAddingMeal(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Nutrition</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Calorie Ring */}
        <View style={[styles.ringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ringCenter}>
            <View style={[styles.ringOuter, { borderColor: colors.border }]}>
              <View
                style={[
                  styles.ringFill,
                  {
                    borderColor: totals.calories > today.goal ? "#ef4444" : colors.primary,
                    borderTopColor: "transparent",
                    borderRightColor: "transparent",
                    transform: [{ rotate: `${(calPct / 100) * 360}deg` }],
                  },
                ]}
              />
              <View style={styles.ringInner}>
                <Text style={[styles.ringCals, { color: colors.foreground }]}>{totals.calories}</Text>
                <Text style={[styles.ringCalLabel, { color: colors.mutedForeground }]}>kcal</Text>
                <Text style={[styles.ringRemain, { color: remaining >= 0 ? colors.mutedForeground : "#ef4444" }]}>
                  {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
                </Text>
              </View>
            </View>
          </View>

          {/* Macro Bars */}
          <View style={styles.macroRow}>
            <MacroBar label="Protein" value={totals.protein} max={userProfile.proteinGoal} color="#E8151B" />
            <View style={{ width: 12 }} />
            <MacroBar label="Carbs" value={totals.carbs} max={250} color="#3b82f6" />
            <View style={{ width: 12 }} />
            <MacroBar label="Fat" value={totals.fat} max={80} color="#f59e0b" />
          </View>
        </View>

        {/* Water Tracker */}
        <View style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.waterHeader}>
            <Feather name="droplet" size={18} color="#3b82f6" />
            <Text style={[styles.waterTitle, { color: colors.foreground }]}>Water</Text>
            <Text style={[styles.waterCount, { color: colors.foreground }]}>{today.water}/8 cups</Text>
          </View>
          <View style={styles.cupRow}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  updateWater(today.date, i < today.water ? i : i + 1);
                }}
                style={[
                  styles.cup,
                  { backgroundColor: i < today.water ? "#3b82f6" : colors.muted, borderColor: i < today.water ? "#3b82f6" : colors.border },
                ]}
              >
                <Feather name="droplet" size={14} color={i < today.water ? "#fff" : colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Meals */}
        {MEAL_TYPES.map((meal) => {
          const mealEntries = today.entries.filter((e) => e.meal === meal);
          const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
          const color = MEAL_COLORS[meal];
          const icon = MEAL_ICONS[meal];

          return (
            <View key={meal} style={[styles.mealSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => openAdd(meal)} style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: color + "22" }]}>
                  <Feather name={icon as any} size={16} color={color} />
                </View>
                <Text style={[styles.mealName, { color: colors.foreground }]}>
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </Text>
                {mealCals > 0 && (
                  <Text style={[styles.mealCals, { color: colors.mutedForeground }]}>{mealCals} kcal</Text>
                )}
                <Feather name="plus" size={18} color={colors.primary} />
              </Pressable>

              {mealEntries.map((entry) => (
                <View key={entry.id} style={[styles.entryRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryName, { color: colors.foreground }]}>{entry.name}</Text>
                    <Text style={[styles.entryMacros, { color: colors.mutedForeground }]}>
                      P: {entry.protein}g · C: {entry.carbs}g · F: {entry.fat}g · {entry.time}
                    </Text>
                  </View>
                  <Text style={[styles.entryCals, { color: colors.foreground }]}>{entry.calories}</Text>
                  <Pressable onPress={() => removeFoodEntry(today.date, entry.id)} style={styles.removeBtn}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Food Sheet */}
      {addingMeal && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                Add {addingMeal.charAt(0).toUpperCase() + addingMeal.slice(1)}
              </Text>
              <Pressable onPress={() => setAddingMeal(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.sheetTabs}>
              <Pressable
                onPress={() => setShowQuick(false)}
                style={[styles.sheetTab, { borderBottomColor: !showQuick ? colors.primary : "transparent" }]}
              >
                <Text style={[styles.sheetTabText, { color: !showQuick ? colors.primary : colors.mutedForeground }]}>Custom</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowQuick(true)}
                style={[styles.sheetTab, { borderBottomColor: showQuick ? colors.primary : "transparent" }]}
              >
                <Text style={[styles.sheetTabText, { color: showQuick ? colors.primary : colors.mutedForeground }]}>Quick Add</Text>
              </Pressable>
            </View>

            {showQuick ? (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {QUICK_FOODS.map((food, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleQuickAdd(food)}
                    style={[styles.quickRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quickName, { color: colors.foreground }]}>{food.name}</Text>
                      <Text style={[styles.quickMacros, { color: colors.mutedForeground }]}>
                        P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                      </Text>
                    </View>
                    <Text style={[styles.quickCals, { color: colors.primary }]}>{food.calories} kcal</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={foodName}
                  onChangeText={setFoodName}
                  placeholder="Food name"
                  placeholderTextColor={colors.mutedForeground}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="Calories (kcal)"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="Protein (g)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="Carbs (g)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="Fat (g)"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>
                <Pressable
                  onPress={handleManualAdd}
                  style={[styles.addBtn, { backgroundColor: colors.primary, opacity: foodName.trim() && calories ? 1 : 0.5 }]}
                >
                  <Text style={styles.addBtnText}>Add Food</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  ringCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 14 },
  ringCenter: { alignItems: "center", marginBottom: 20 },
  ringOuter: { width: 140, height: 140, borderRadius: 70, borderWidth: 10, alignItems: "center", justifyContent: "center", position: "relative" },
  ringFill: { position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 10 },
  ringInner: { alignItems: "center" },
  ringCals: { fontSize: 32, fontFamily: "Inter_700Bold" },
  ringCalLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  ringRemain: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  macroRow: { flexDirection: "row" },
  macroLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  macroVal: { fontSize: 11, fontFamily: "Inter_700Bold" },
  macroBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  macroFill: { height: "100%", borderRadius: 3 },
  waterCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  waterHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  waterTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waterCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cupRow: { flexDirection: "row", gap: 8 },
  cup: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mealSection: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  mealHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  mealIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mealCals: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  entryName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryMacros: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryCals: { fontSize: 14, fontFamily: "Inter_700Bold", marginRight: 8 },
  removeBtn: { padding: 4 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetTabs: { flexDirection: "row", gap: 20, marginBottom: 16 },
  sheetTab: { paddingBottom: 8, borderBottomWidth: 2 },
  sheetTabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  quickRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  quickName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  quickMacros: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  quickCals: { fontSize: 14, fontFamily: "Inter_700Bold" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  addBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
