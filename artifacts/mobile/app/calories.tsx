import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Circle, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import type { FoodEntry } from "@/context/AppContext";
import FOODS, { searchFoods } from "@/constants/foods";
import type { FoodItem } from "@/constants/foods";
import { useColors } from "@/hooks/useColors";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];
type SheetTab = "search" | "photo" | "barcode" | "custom" | "quick";
type PhotoPhase = "idle" | "viewfinder" | "analyzing" | "results";
type BarcodePhase = "idle" | "scanning" | "found";

const MEAL_META: Record<MealType, { label: string; color: string; icon: string }> = {
  breakfast: { label: "Breakfast", color: "#f59e0b", icon: "sun" },
  lunch:     { label: "Lunch",     color: "#22c55e", icon: "package" },
  dinner:    { label: "Dinner",    color: "#3b82f6", icon: "moon" },
  snack:     { label: "Snacks",    color: "#8b5cf6", icon: "coffee" },
};

const DONUT_R = 56;
const DONUT_SIZE = 140;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

const QUICK_FOODS: FoodItem[] = [
  FOODS.find((f) => f.id === "pr10")!, // Whey Protein Powder
  FOODS.find((f) => f.id === "gr03")!, // Oatmeal
  FOODS.find((f) => f.id === "pr01")!, // Chicken Breast
  FOODS.find((f) => f.id === "gr01")!, // White Rice
  FOODS.find((f) => f.id === "fr01")!, // Banana
  FOODS.find((f) => f.id === "da03")!, // Greek Yogurt
  FOODS.find((f) => f.id === "sn03")!, // Peanut Butter
  FOODS.find((f) => f.id === "pr04")!, // Egg
];

const PHOTO_COMBOS: FoodItem[][] = [
  [FOODS.find((f) => f.id === "pr01")!, FOODS.find((f) => f.id === "gr01")!, FOODS.find((f) => f.id === "vg01")!],
  [FOODS.find((f) => f.id === "pr04")!, FOODS.find((f) => f.id === "gr04")!],
  [FOODS.find((f) => f.id === "pr02")!, FOODS.find((f) => f.id === "vg10")!, FOODS.find((f) => f.id === "gr09")!],
  [FOODS.find((f) => f.id === "da03")!, FOODS.find((f) => f.id === "gr14")!, FOODS.find((f) => f.id === "fr04")!],
  [FOODS.find((f) => f.id === "gr03")!, FOODS.find((f) => f.id === "fr01")!],
];

const BARCODE_PRODUCTS: FoodItem[] = [
  { id: "bc01", name: "Quaker Old Fashioned Oats", servingSize: 40, servingUnit: "g (½ cup dry)", calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, sugar: 1, sodium: 0, category: "Grains" },
  { id: "bc02", name: "Chobani Plain Greek Yogurt", servingSize: 170, servingUnit: "g (1 container)", calories: 90, protein: 16, carbs: 6, fat: 0, fiber: 0, sugar: 5, sodium: 65, category: "Dairy" },
  { id: "bc03", name: "Premier Protein Shake", servingSize: 325, servingUnit: "ml (1 shake)", calories: 160, protein: 30, carbs: 5, fat: 3, fiber: 1, sugar: 2, sodium: 380, category: "Snacks" },
  { id: "bc04", name: "Kind Dark Chocolate Bar", servingSize: 40, servingUnit: "g (1 bar)", calories: 200, protein: 6, carbs: 17, fat: 13, fiber: 3, sugar: 6, sodium: 120, category: "Snacks" },
  { id: "bc05", name: "CLIF Energy Bar", servingSize: 68, servingUnit: "g (1 bar)", calories: 250, protein: 9, carbs: 44, fat: 5, fiber: 5, sugar: 22, sodium: 170, category: "Snacks" },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────

function makeDateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

function DonutRing({ consumed, goal, colors }: { consumed: number; goal: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const pct = Math.min(1, consumed / Math.max(1, goal));
  const strokeOffset = CIRCUMFERENCE * (1 - pct);
  const remaining = goal - consumed;
  const cx = DONUT_SIZE / 2;

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
          <Circle
            cx={cx} cy={cx} r={DONUT_R}
            stroke={colors.border} strokeWidth={12} fill="none"
          />
          <Circle
            cx={cx} cy={cx} r={DONUT_R}
            stroke={remaining < 0 ? colors.destructive : colors.primary}
            strokeWidth={12} fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground }}>{consumed}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>consumed</Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: remaining >= 0 ? colors.success : colors.destructive, marginTop: 2 }}>
            {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MacroBarFull({ label, value, max, color, colors }: { label: string; value: number; max: number; color: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.foreground }}>{value}g <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{pct}%</Text></Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function FoodChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color }}>{label}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────

export default function CaloriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addFoodEntry, removeFoodEntry, updateWater, getTodayCalories } = useApp();

  const today = getTodayCalories();
  const todayDateStr = makeDateStr(0);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // ── Sheet state ────────────────────────────────────────────────────────────
  const [addingMeal, setAddingMeal] = useState<MealType | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>("search");

  // ── Search tab ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      const recentNames = new Set<string>();
      const recent: FoodItem[] = [];
      for (const e of [...today.entries].reverse()) {
        if (!recentNames.has(e.name)) {
          recentNames.add(e.name);
          const found = FOODS.find((f) => f.name === e.name);
          if (found) recent.push(found);
        }
        if (recent.length >= 5) break;
      }
      return recent;
    }
    return searchFoods(searchQuery, 15);
  }, [searchQuery, today.entries]);

  // ── Photo simulation ───────────────────────────────────────────────────────
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>("idle");
  const [photoSuggestions, setPhotoSuggestions] = useState<FoodItem[]>([]);
  const photoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startPhotoScan() {
    setPhotoPhase("viewfinder");
  }

  function capturePhoto() {
    setPhotoPhase("analyzing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    photoTimer.current = setTimeout(() => {
      const combo = PHOTO_COMBOS[Math.floor(Math.random() * PHOTO_COMBOS.length)];
      setPhotoSuggestions([...combo]);
      setPhotoPhase("results");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);
  }

  function addPhotoSuggestion(food: FoodItem) {
    if (!addingMeal) return;
    const entry: FoodEntry = {
      id: makeId(),
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    setPhotoSuggestions((prev) => prev.filter((f) => f.id !== food.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (photoSuggestions.length <= 1) setAddingMeal(null);
  }

  // ── Barcode simulation ─────────────────────────────────────────────────────
  const [barcodePhase, setBarcodePhase] = useState<BarcodePhase>("idle");
  const [barcodeProduct, setBarcodeProduct] = useState<FoodItem | null>(null);
  const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startBarcodeScan() {
    setBarcodePhase("scanning");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    barcodeTimer.current = setTimeout(() => {
      const product = BARCODE_PRODUCTS[Math.floor(Math.random() * BARCODE_PRODUCTS.length)];
      setBarcodeProduct(product);
      setBarcodePhase("found");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  }

  function confirmBarcodeProduct() {
    if (!addingMeal || !barcodeProduct) return;
    const entry: FoodEntry = {
      id: makeId(),
      name: barcodeProduct.name,
      calories: barcodeProduct.calories,
      protein: barcodeProduct.protein,
      carbs: barcodeProduct.carbs,
      fat: barcodeProduct.fat,
      fiber: barcodeProduct.fiber,
      sugar: barcodeProduct.sugar,
      sodium: barcodeProduct.sodium,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  // ── Custom tab ─────────────────────────────────────────────────────────────
  const [customName, setCustomName] = useState("");
  const [customCals, setCustomCals] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");

  function handleManualAdd() {
    if (!addingMeal || !customName.trim() || !customCals) return;
    const entry: FoodEntry = {
      id: makeId(),
      name: customName.trim(),
      calories: parseInt(customCals) || 0,
      protein: parseFloat(customProtein) || 0,
      carbs: parseFloat(customCarbs) || 0,
      fat: parseFloat(customFat) || 0,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  // ── Quick add ──────────────────────────────────────────────────────────────
  function handleQuickAdd(food: FoodItem) {
    if (!addingMeal) return;
    const entry: FoodEntry = {
      id: makeId(),
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  // ── Sheet open/close ───────────────────────────────────────────────────────
  function openAdd(meal: MealType) {
    setAddingMeal(meal);
    setSheetTab("search");
    setSearchQuery("");
    setPhotoPhase("idle");
    setPhotoSuggestions([]);
    setBarcodePhase("idle");
    setBarcodeProduct(null);
    setCustomName(""); setCustomCals(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
  }

  function closeSheet() {
    if (photoTimer.current) clearTimeout(photoTimer.current);
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
    setAddingMeal(null);
  }

  useEffect(() => () => {
    if (photoTimer.current) clearTimeout(photoTimer.current);
    if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
  }, []);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totals = useMemo(() =>
    today.entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ), [today.entries]);

  // ── Weekly data ────────────────────────────────────────────────────────────
  const weekData = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = makeDateStr(6 - i);
      const dayLog = state.calorieLog.find((c) => c.date === dateStr);
      const consumed = dayLog?.entries.reduce((s, e) => s + e.calories, 0) ?? 0;
      const protein = dayLog?.entries.reduce((s, e) => s + e.protein, 0) ?? 0;
      const goal = dayLog?.goal ?? state.userProfile.calorieGoal;
      return {
        label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()],
        consumed, protein, goal,
        isToday: dateStr === todayDateStr,
      };
    }), [state.calorieLog, state.userProfile.calorieGoal, todayDateStr]);

  const weekAvg = Math.round(weekData.reduce((s, d) => s + d.consumed, 0) / 7);
  const bestProteinDay = weekData.reduce((b, d) => d.protein > b.protein ? d : b, weekData[0]);
  const adherenceDays = weekData.filter((d) => d.consumed > 0 && Math.abs(d.consumed - d.goal) < 250).length;
  const weekMaxCals = Math.max(state.userProfile.calorieGoal, ...weekData.map((d) => d.consumed), 1);

  // ── Macro goals ────────────────────────────────────────────────────────────
  const proteinGoal = state.userProfile.proteinGoal;
  const carbGoal = Math.round((today.goal * 0.45) / 4);
  const fatGoal = Math.round((today.goal * 0.3) / 9);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={[s.iconBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={[s.screenTitle, { color: colors.foreground }]}>NutriLens</Text>
            <Text style={[s.screenDate, { color: colors.mutedForeground }]}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Donut + Macros Card ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DonutRing consumed={totals.calories} goal={today.goal} colors={colors} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <MacroBarFull label="Protein" value={Math.round(totals.protein)} max={proteinGoal} color="#3b82f6" colors={colors} />
            <MacroBarFull label="Carbs" value={Math.round(totals.carbs)} max={carbGoal} color="#f59e0b" colors={colors} />
            <MacroBarFull label="Fat" value={Math.round(totals.fat)} max={fatGoal} color="#8b5cf6" colors={colors} />
          </View>
          <View style={[s.goalRow, { borderTopColor: colors.border }]}>
            <Text style={[s.goalText, { color: colors.mutedForeground }]}>Daily goal: <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{today.goal} kcal</Text></Text>
            <Text style={[s.goalText, { color: colors.mutedForeground }]}>Protein: <Text style={{ color: "#3b82f6", fontFamily: "Inter_700Bold" }}>{proteinGoal}g</Text></Text>
          </View>
        </View>

        {/* ── Weekly Strip ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: 16 }]}>
          <View style={s.weekHeader}>
            <Text style={[s.weekTitle, { color: colors.foreground }]}>Weekly Overview</Text>
            <View style={[s.badge, { backgroundColor: adherenceDays >= 5 ? colors.success + "22" : colors.warning + "22" }]}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: adherenceDays >= 5 ? colors.success : colors.warning }}>
                {adherenceDays}/7 on track
              </Text>
            </View>
          </View>
          <View style={s.barsRow}>
            {weekData.map((day, i) => (
              <View key={i} style={s.barCol}>
                <View style={{ height: 64, justifyContent: "flex-end" }}>
                  <View
                    style={{
                      width: 22,
                      height: Math.max(3, Math.round((day.consumed / weekMaxCals) * 64)),
                      backgroundColor: day.isToday ? colors.primary : colors.border,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: day.isToday ? colors.primary : colors.mutedForeground, marginTop: 4 }}>{day.label}</Text>
                {day.isToday && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 }} />}
              </View>
            ))}
          </View>
          <View style={[s.weekStats, { borderTopColor: colors.border }]}>
            <View style={s.weekStat}>
              <Text style={[s.weekStatVal, { color: colors.foreground }]}>{weekAvg}</Text>
              <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>7-day avg kcal</Text>
            </View>
            <View style={[s.weekStatDivider, { backgroundColor: colors.border }]} />
            <View style={s.weekStat}>
              <Text style={[s.weekStatVal, { color: "#3b82f6" }]}>{Math.round(bestProteinDay.protein)}g</Text>
              <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>Best protein day</Text>
            </View>
            <View style={[s.weekStatDivider, { backgroundColor: colors.border }]} />
            <View style={s.weekStat}>
              <Text style={[s.weekStatVal, { color: colors.primary }]}>{adherenceDays}</Text>
              <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>Adherence days</Text>
            </View>
          </View>
        </View>

        {/* ── Water Tracker ── */}
        <View style={[s.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Feather name="droplet" size={16} color="#3b82f6" />
            <Text style={[s.waterTitle, { color: colors.foreground }]}>Water</Text>
            <Text style={[s.waterCount, { color: colors.mutedForeground }]}>{today.water}/8 cups</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Pressable
                key={i}
                onPress={() => { updateWater(todayDateStr, i < today.water ? i : i + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[s.cup, { backgroundColor: i < today.water ? "#3b82f6" : colors.muted, borderColor: i < today.water ? "#3b82f6" : colors.border }]}
              >
                <Feather name="droplet" size={14} color={i < today.water ? "#fff" : colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Meal Cards ── */}
        {MEAL_TYPES.map((meal) => {
          const meta = MEAL_META[meal];
          const entries = today.entries.filter((e) => e.meal === meal);
          const mealCals = entries.reduce((s, e) => s + e.calories, 0);
          const mealProtein = entries.reduce((s, e) => s + e.protein, 0);
          const mealCarbs = entries.reduce((s, e) => s + e.carbs, 0);
          const mealFat = entries.reduce((s, e) => s + e.fat, 0);
          return (
            <View key={meal} style={[s.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.mealHeader}>
                <View style={[s.mealIcon, { backgroundColor: meta.color + "22" }]}>
                  <Feather name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.mealName, { color: colors.foreground }]}>{meta.label}</Text>
                  {entries.length > 0 && (
                    <Text style={[s.mealMacroSub, { color: colors.mutedForeground }]}>
                      P:{Math.round(mealProtein)}g · C:{Math.round(mealCarbs)}g · F:{Math.round(mealFat)}g
                    </Text>
                  )}
                </View>
                {mealCals > 0 && <Text style={[s.mealCals, { color: colors.mutedForeground }]}>{mealCals} kcal</Text>}
                <Pressable onPress={() => openAdd(meal)} style={[s.mealAddBtn, { borderColor: colors.primary }]}>
                  <Feather name="plus" size={16} color={colors.primary} />
                </Pressable>
              </View>
              {entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() =>
                    router.push({
                      pathname: "/food-detail",
                      params: {
                        food: JSON.stringify({
                          id: entry.id,
                          name: entry.name,
                          servingSize: 100,
                          servingUnit: "g",
                          calories: entry.calories,
                          protein: entry.protein,
                          carbs: entry.carbs,
                          fat: entry.fat,
                          fiber: entry.fiber ?? 0,
                          sugar: entry.sugar ?? 0,
                          sodium: entry.sodium ?? 0,
                          category: "Custom",
                        }),
                      },
                    })
                  }
                  style={[s.entryRow, { borderTopColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.entryName, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                      <FoodChip label={`P ${entry.protein}g`} color="#3b82f6" />
                      <FoodChip label={`C ${entry.carbs}g`} color="#f59e0b" />
                      <FoodChip label={`F ${entry.fat}g`} color="#8b5cf6" />
                      <Text style={[s.entryTime, { color: colors.mutedForeground }]}>{entry.time}</Text>
                    </View>
                  </View>
                  <Text style={[s.entryCals, { color: colors.foreground }]}>{entry.calories}</Text>
                  <Pressable onPress={() => removeFoodEntry(todayDateStr, entry.id)} hitSlop={8} style={{ padding: 6 }}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* ── Add Food Sheet ── */}
      {addingMeal && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[s.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            {/* Drag handle */}
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            {/* Sheet header */}
            <View style={s.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[s.mealDot, { backgroundColor: MEAL_META[addingMeal].color }]} />
                <Text style={[s.sheetTitle, { color: colors.foreground }]}>
                  Add to {MEAL_META[addingMeal].label}
                </Text>
              </View>
              <Pressable onPress={closeSheet} hitSlop={10}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {(["search", "photo", "barcode", "custom", "quick"] as SheetTab[]).map((tab) => {
                  const icons: Record<SheetTab, string> = { search: "search", photo: "camera", barcode: "maximize", custom: "edit-3", quick: "list" };
                  const labels: Record<SheetTab, string> = { search: "Search", photo: "Photo", barcode: "Barcode", custom: "Custom", quick: "Quick" };
                  const active = sheetTab === tab;
                  return (
                    <Pressable key={tab} onPress={() => setSheetTab(tab)} style={[s.sheetTab, { borderBottomColor: active ? colors.primary : "transparent" }]}>
                      <Feather name={icons[tab] as any} size={13} color={active ? colors.primary : colors.mutedForeground} />
                      <Text style={[s.sheetTabText, { color: active ? colors.primary : colors.mutedForeground }]}>{labels[tab]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* ── Search Tab ── */}
            {sheetTab === "search" && (
              <View style={{ gap: 10 }}>
                <View style={[s.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="search" size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={[s.searchInput, { color: colors.foreground, flex: 1 }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search 80+ foods…"
                    placeholderTextColor={colors.mutedForeground}
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
                {searchResults.length === 0 && searchQuery.trim() ? (
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No results for "{searchQuery}"</Text>
                ) : searchResults.length === 0 ? (
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Type to search, or pick a quick-add below.</Text>
                ) : null}
                {searchQuery.trim() === "" && searchResults.length > 0 && (
                  <Text style={[s.recentsLabel, { color: colors.mutedForeground }]}>Recent foods</Text>
                )}
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {searchResults.map((food) => (
                    <Pressable
                      key={food.id}
                      onPress={() => {
                        closeSheet();
                        router.push({ pathname: "/food-detail", params: { food: JSON.stringify(food), meal: addingMeal } });
                      }}
                      style={[s.resultRow, { borderBottomColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.resultName, { color: colors.foreground }]} numberOfLines={1}>{food.name}</Text>
                        <Text style={[s.resultServing, { color: colors.mutedForeground }]}>{food.servingSize}{food.servingUnit.includes("g") ? "" : " "}{food.servingUnit}</Text>
                        <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                          <FoodChip label={`P ${food.protein}g`} color="#3b82f6" />
                          <FoodChip label={`C ${food.carbs}g`} color="#f59e0b" />
                          <FoodChip label={`F ${food.fat}g`} color="#8b5cf6" />
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={[s.resultCals, { color: colors.primary }]}>{food.calories}</Text>
                        <Text style={[s.resultKcal, { color: colors.mutedForeground }]}>kcal</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.border} style={{ marginLeft: 6 }} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── Photo Tab ── */}
            {sheetTab === "photo" && (
              <View style={{ gap: 14 }}>
                {photoPhase === "idle" && (
                  <View style={{ alignItems: "center", gap: 14 }}>
                    <Text style={[s.simHint, { color: colors.mutedForeground }]}>Simulate AI photo analysis of your meal</Text>
                    <Pressable onPress={startPhotoScan} style={[s.bigBtn, { backgroundColor: colors.primary }]}>
                      <Feather name="camera" size={18} color="#fff" />
                      <Text style={s.bigBtnText}>Take Photo</Text>
                    </Pressable>
                  </View>
                )}

                {photoPhase === "viewfinder" && (
                  <View style={{ alignItems: "center", gap: 16 }}>
                    <View style={[s.viewfinder, { borderColor: colors.border }]}>
                      <View style={[s.vfCorner, s.vfTL, { borderColor: colors.primary }]} />
                      <View style={[s.vfCorner, s.vfTR, { borderColor: colors.primary }]} />
                      <View style={[s.vfCorner, s.vfBL, { borderColor: colors.primary }]} />
                      <View style={[s.vfCorner, s.vfBR, { borderColor: colors.primary }]} />
                      <Feather name="camera" size={36} color={colors.border} />
                      <Text style={[{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8 }]}>
                        Point at your meal
                      </Text>
                    </View>
                    <Pressable onPress={capturePhoto} style={[s.shutterBtn, { borderColor: colors.primary }]}>
                      <View style={[s.shutterInner, { backgroundColor: colors.primary }]} />
                    </Pressable>
                  </View>
                )}

                {photoPhase === "analyzing" && (
                  <View style={{ alignItems: "center", gap: 16, paddingVertical: 20 }}>
                    <View style={[s.analyzingBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                    <Text style={[s.analyzingText, { color: colors.foreground }]}>Analyzing meal…</Text>
                    <Text style={[s.analyzingSubText, { color: colors.mutedForeground }]}>Identifying foods and estimating nutrition</Text>
                  </View>
                )}

                {photoPhase === "results" && (
                  <View style={{ gap: 10 }}>
                    <Text style={[s.aiLabel, { color: colors.mutedForeground }]}>AI detected these foods — tap to add:</Text>
                    {photoSuggestions.map((food) => (
                      <View key={food.id} style={[s.aiCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.resultName, { color: colors.foreground }]}>{food.name}</Text>
                          <Text style={[s.resultServing, { color: colors.mutedForeground }]}>{food.servingUnit}</Text>
                          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                            <FoodChip label={`${food.calories} kcal`} color={colors.primary} />
                            <FoodChip label={`P ${food.protein}g`} color="#3b82f6" />
                          </View>
                        </View>
                        <Pressable onPress={() => addPhotoSuggestion(food)} style={[s.aiAddBtn, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={18} color="#fff" />
                        </Pressable>
                        <Pressable onPress={() => setPhotoSuggestions((p) => p.filter((f) => f.id !== food.id))} style={[s.aiDismissBtn, { borderColor: colors.border }]}>
                          <Feather name="x" size={18} color={colors.mutedForeground} />
                        </Pressable>
                      </View>
                    ))}
                    {photoSuggestions.length === 0 && (
                      <Text style={[s.emptyText, { color: colors.mutedForeground }]}>All added! Tap + on another meal to continue.</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── Barcode Tab ── */}
            {sheetTab === "barcode" && (
              <View style={{ gap: 14 }}>
                {barcodePhase === "idle" && (
                  <View style={{ alignItems: "center", gap: 14 }}>
                    <View style={[s.scanFrame, { borderColor: colors.border }]}>
                      <View style={[s.vfCorner, s.vfTL, { borderColor: colors.info }]} />
                      <View style={[s.vfCorner, s.vfTR, { borderColor: colors.info }]} />
                      <View style={[s.vfCorner, s.vfBL, { borderColor: colors.info }]} />
                      <View style={[s.vfCorner, s.vfBR, { borderColor: colors.info }]} />
                      <Feather name="maximize" size={32} color={colors.border} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 8 }}>
                        Align barcode in frame
                      </Text>
                    </View>
                    <Text style={[s.simHint, { color: colors.mutedForeground }]}>Simulates scanning a barcode</Text>
                    <Pressable onPress={startBarcodeScan} style={[s.bigBtn, { backgroundColor: colors.info }]}>
                      <Feather name="maximize" size={18} color="#fff" />
                      <Text style={s.bigBtnText}>Simulate Scan</Text>
                    </Pressable>
                  </View>
                )}

                {barcodePhase === "scanning" && (
                  <View style={{ alignItems: "center", gap: 16, paddingVertical: 20 }}>
                    <ActivityIndicator color={colors.info} size="large" />
                    <Text style={[s.analyzingText, { color: colors.foreground }]}>Scanning barcode…</Text>
                    <Text style={[s.analyzingSubText, { color: colors.mutedForeground }]}>Looking up product database</Text>
                  </View>
                )}

                {barcodePhase === "found" && barcodeProduct && (
                  <View style={{ gap: 12 }}>
                    <Text style={[s.aiLabel, { color: colors.mutedForeground }]}>Product found:</Text>
                    <View style={[s.aiCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.resultName, { color: colors.foreground }]}>{barcodeProduct.name}</Text>
                        <Text style={[s.resultServing, { color: colors.mutedForeground }]}>{barcodeProduct.servingUnit}</Text>
                        <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                          <FoodChip label={`${barcodeProduct.calories} kcal`} color={colors.primary} />
                          <FoodChip label={`P ${barcodeProduct.protein}g`} color="#3b82f6" />
                          <FoodChip label={`C ${barcodeProduct.carbs}g`} color="#f59e0b" />
                        </View>
                      </View>
                    </View>
                    <Pressable onPress={confirmBarcodeProduct} style={[s.bigBtn, { backgroundColor: colors.primary }]}>
                      <Feather name="plus" size={18} color="#fff" />
                      <Text style={s.bigBtnText}>Add to {MEAL_META[addingMeal!].label}</Text>
                    </Pressable>
                    <Pressable onPress={() => { setBarcodePhase("idle"); setBarcodeProduct(null); }} style={[s.ghostBtn, { borderColor: colors.border }]}>
                      <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Scan again</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* ── Custom Tab ── */}
            {sheetTab === "custom" && (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={[s.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={customName} onChangeText={setCustomName}
                  placeholder="Food name" placeholderTextColor={colors.mutedForeground}
                />
                <TextInput
                  style={[s.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={customCals} onChangeText={setCustomCals}
                  placeholder="Calories (kcal)" placeholderTextColor={colors.mutedForeground} keyboardType="numeric"
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["Protein", "Carbs", "Fat"] as const).map((label, i) => {
                    const vals = [customProtein, customCarbs, customFat];
                    const setters = [setCustomProtein, setCustomCarbs, setCustomFat];
                    return (
                      <TextInput
                        key={label}
                        style={[s.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                        value={vals[i]} onChangeText={setters[i]}
                        placeholder={`${label} g`} placeholderTextColor={colors.mutedForeground} keyboardType="numeric"
                      />
                    );
                  })}
                </View>
                <Pressable
                  onPress={handleManualAdd}
                  style={[s.addBtn, { backgroundColor: colors.primary, opacity: customName.trim() && customCals ? 1 : 0.45 }]}
                >
                  <Text style={s.addBtnText}>Add Food</Text>
                </Pressable>
              </View>
            )}

            {/* ── Quick Tab ── */}
            {sheetTab === "quick" && (
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {QUICK_FOODS.filter(Boolean).map((food) => (
                  <Pressable
                    key={food.id}
                    onPress={() => handleQuickAdd(food)}
                    style={[s.resultRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.resultName, { color: colors.foreground }]}>{food.name}</Text>
                      <Text style={[s.resultServing, { color: colors.mutedForeground }]}>{food.servingUnit}</Text>
                    </View>
                    <Text style={[s.resultCals, { color: colors.primary }]}>{food.calories}</Text>
                    <Text style={[s.resultKcal, { color: colors.mutedForeground }]}> kcal</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  screenDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14 },
  goalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, marginTop: 16, paddingTop: 12 },
  goalText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  weekHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  weekTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  barsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 4 },
  barCol: { alignItems: "center", flex: 1 },
  weekStats: { flexDirection: "row", borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  weekStat: { flex: 1, alignItems: "center" },
  weekStatVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  weekStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  weekStatDivider: { width: 1, marginHorizontal: 8 },
  waterCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  waterTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  waterCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cup: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mealCard: { borderRadius: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  mealHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  mealIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mealMacroSub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  mealCals: { fontSize: 13, fontFamily: "Inter_500Medium" },
  mealAddBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  entryRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  entryName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: 2, alignSelf: "center" },
  entryCals: { fontSize: 14, fontFamily: "Inter_700Bold", marginRight: 4 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, maxHeight: "88%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  mealDot: { width: 10, height: 10, borderRadius: 5 },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2 },
  sheetTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { fontSize: 15, fontFamily: "Inter_400Regular" },
  recentsLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 2 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  resultName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  resultServing: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultCals: { fontSize: 18, fontFamily: "Inter_700Bold" },
  resultKcal: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "flex-end", marginBottom: 2 },
  simHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  bigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, width: "100%" },
  bigBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  ghostBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
  ghostBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  viewfinder: { width: "100%", height: 160, borderRadius: 14, borderWidth: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  scanFrame: { width: "100%", height: 130, borderRadius: 14, borderWidth: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  vfCorner: { position: "absolute", width: 24, height: 24, borderWidth: 3 },
  vfTL: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  vfTR: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  vfBL: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  vfBR: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  shutterBtn: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 52, height: 52, borderRadius: 26 },
  analyzingBox: { width: 90, height: 90, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  analyzingText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  analyzingSubText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  aiLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  aiCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  aiAddBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiDismissBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  addBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
