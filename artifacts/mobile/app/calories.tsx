import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";
import type { FoodEntry } from "@/context/AppContext";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_COLORS = { breakfast: "#f59e0b", lunch: "#22c55e", dinner: "#3b82f6", snack: "#8b5cf6" };
const MEAL_ICONS = { breakfast: "sun", lunch: "package", dinner: "moon", snack: "coffee" };

type FoodResult = { name: string; calories: number; protein: number; carbs: number; fat: number };

const QUICK_FOODS: FoodResult[] = [
  { name: "Chicken Breast (200g)", calories: 330, protein: 62, carbs: 0, fat: 7 },
  { name: "White Rice (1 cup)", calories: 206, protein: 4, carbs: 45, fat: 0 },
  { name: "Eggs x2 scrambled", calories: 180, protein: 14, carbs: 2, fat: 12 },
  { name: "Protein Shake", calories: 220, protein: 40, carbs: 8, fat: 3 },
  { name: "Oatmeal (1 cup)", calories: 300, protein: 10, carbs: 54, fat: 6 },
  { name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: "Peanut Butter Toast", calories: 280, protein: 9, carbs: 30, fat: 14 },
  { name: "Greek Yogurt (150g)", calories: 130, protein: 18, carbs: 9, fat: 1 },
];

async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=DEMO_KEY&pageSize=10&dataType=Survey%20%28FNDDS%29,SR%20Legacy`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.foods ?? []).map((f: { description: string; foodNutrients?: { nutrientName?: string; value?: number }[] }) => {
      const nutrients = f.foodNutrients ?? [];
      const get = (keyword: string) => {
        const n = nutrients.find((nu) => nu.nutrientName?.toLowerCase().includes(keyword));
        return Math.round(n?.value ?? 0);
      };
      return {
        name: f.description.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        calories: get("energy"),
        protein: get("protein"),
        carbs: get("carbohydrate"),
        fat: get("total lipid"),
      };
    });
  } catch {
    return [];
  }
}

async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const n = p.nutriments ?? {};
      return {
        name: (p.product_name || p.brands || "Unknown Product").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
        calories: Math.round(n["energy-kcal_100g"] ?? 0),
        protein: Math.round(n.proteins_100g ?? 0),
        carbs: Math.round(n.carbohydrates_100g ?? 0),
        fat: Math.round(n.fat_100g ?? 0),
      };
    }
    return null;
  } catch {
    return null;
  }
}

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

type SheetTab = "custom" | "search" | "scan" | "quick";

export default function CaloriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, addFoodEntry, removeFoodEntry, updateWater, getTodayCalories } = useApp();
  const { userProfile } = state;

  const today = getTodayCalories();
  const [addingMeal, setAddingMeal] = useState<typeof MEAL_TYPES[number] | null>(null);
  const [sheetTab, setSheetTab] = useState<SheetTab>("custom");
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  // USDA search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Photo / AI analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<FoodResult[]>([]);

  // Barcode
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState<FoodResult | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const totals = useMemo(() => today.entries.reduce(
    (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fat: acc.fat + e.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [today.entries]);

  const calPct = Math.min(100, (totals.calories / today.goal) * 100);
  const remaining = today.goal - totals.calories;

  function openAdd(meal: typeof MEAL_TYPES[number]) {
    setAddingMeal(meal);
    setFoodName(""); setCalories(""); setProtein(""); setCarbs(""); setFat("");
    setSheetTab("custom");
    setSearchQuery(""); setSearchResults([]);
    setAiResults([]); setBarcodeResult(null); setBarcodeInput("");
  }

  function fillForm(food: FoodResult) {
    setFoodName(food.name);
    setCalories(String(food.calories));
    setProtein(String(food.protein));
    setCarbs(String(food.carbs));
    setFat(String(food.fat));
    setSheetTab("custom");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleManualAdd() {
    if (!addingMeal || !foodName.trim() || !calories) return;
    const entry: FoodEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: foodName.trim(),
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(today.date, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  function handleQuickAdd(food: FoodResult) {
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  const handleUSDASearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await searchUSDA(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  }, [searchQuery]);

  const handlePhotoAnalysis = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission required", "Please allow camera access in Settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (result.canceled || !result.assets[0]?.base64) return;

    setAnalyzing(true);
    setAiResults([]);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const apiUrl = domain ? `https://${domain}/api/analyze-food` : "/api/analyze-food";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: result.assets[0].base64, mimeType: "image/jpeg" }),
      });
      const data = await res.json();
      setAiResults(data.foods ?? []);
      if ((data.foods ?? []).length === 0) {
        Alert.alert("No food detected", "Could not identify food in this photo. Try a clearer image.");
      }
    } catch {
      Alert.alert("Error", "Could not analyze photo. Check your connection.");
    }
    setAnalyzing(false);
  }, []);

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcodeInput.trim()) return;
    setBarcodeLoading(true);
    setBarcodeResult(null);
    const result = await lookupBarcode(barcodeInput.trim());
    setBarcodeResult(result);
    setBarcodeLoading(false);
    if (!result) Alert.alert("Not found", "Product not found. Try typing the barcode number manually.");
  }, [barcodeInput]);

  const SHEET_TABS: { key: SheetTab; label: string; icon: string }[] = [
    { key: "custom", label: "Custom", icon: "edit-3" },
    { key: "search", label: "Search", icon: "search" },
    { key: "scan", label: "Scan", icon: "camera" },
    { key: "quick", label: "Quick", icon: "list" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Calorie Tracker</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Ring Card */}
        <View style={[styles.ringCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ringCenter}>
            <View style={[styles.ringOuter, { borderColor: colors.border }]}>
              <View
                style={[
                  styles.ringFill,
                  { borderColor: colors.primary, borderTopColor: "transparent", borderLeftColor: calPct > 50 ? colors.primary : "transparent", transform: [{ rotate: `${(calPct / 100) * 360}deg` }] },
                ]}
              />
              <View style={styles.ringInner}>
                <Text style={[styles.ringCals, { color: colors.foreground }]}>{totals.calories}</Text>
                <Text style={[styles.ringCalLabel, { color: colors.mutedForeground }]}>consumed</Text>
                <Text style={[styles.ringRemain, { color: remaining >= 0 ? colors.success : colors.destructive }]}>
                  {remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.macroRow}>
            <MacroBar label="Protein" value={totals.protein} max={userProfile.proteinGoal} color="#3b82f6" />
            <View style={{ width: 12 }} />
            <MacroBar label="Carbs" value={totals.carbs} max={Math.round(today.goal * 0.5 / 4)} color="#f59e0b" />
            <View style={{ width: 12 }} />
            <MacroBar label="Fat" value={totals.fat} max={Math.round(today.goal * 0.3 / 9)} color="#8b5cf6" />
          </View>
        </View>

        {/* Water */}
        <View style={[styles.waterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.waterHeader}>
            <Feather name="droplet" size={16} color="#3b82f6" />
            <Text style={[styles.waterTitle, { color: colors.foreground }]}>Water</Text>
            <Text style={[styles.waterCount, { color: colors.mutedForeground }]}>{today.water}/8 cups</Text>
          </View>
          <View style={styles.cupRow}>
            {Array.from({ length: 8 }, (_, i) => (
              <Pressable
                key={i}
                onPress={() => { updateWater(today.date, i < today.water ? i : i + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.cup, { backgroundColor: i < today.water ? "#3b82f6" : colors.muted, borderColor: i < today.water ? "#3b82f6" : colors.border }]}
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
                {mealCals > 0 && <Text style={[styles.mealCals, { color: colors.mutedForeground }]}>{mealCals} kcal</Text>}
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
                Add to {addingMeal.charAt(0).toUpperCase() + addingMeal.slice(1)}
              </Text>
              <Pressable onPress={() => setAddingMeal(null)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Tab Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.sheetTabs}>
                {SHEET_TABS.map((t) => (
                  <Pressable
                    key={t.key}
                    onPress={() => setSheetTab(t.key)}
                    style={[styles.sheetTab, { borderBottomColor: sheetTab === t.key ? colors.primary : "transparent" }]}
                  >
                    <Feather name={t.icon as any} size={13} color={sheetTab === t.key ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.sheetTabText, { color: sheetTab === t.key ? colors.primary : colors.mutedForeground }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Custom Tab */}
            {sheetTab === "custom" && (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={foodName} onChangeText={setFoodName} placeholder="Food name"
                  placeholderTextColor={colors.mutedForeground}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                  value={calories} onChangeText={setCalories} placeholder="Calories (kcal)"
                  placeholderTextColor={colors.mutedForeground} keyboardType="numeric"
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {[["Protein", protein, setProtein], ["Carbs", carbs, setCarbs], ["Fat", fat, setFat]].map(([label, val, setter]) => (
                    <TextInput
                      key={label as string}
                      style={[styles.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                      value={val as string} onChangeText={setter as any}
                      placeholder={`${label} (g)`} placeholderTextColor={colors.mutedForeground} keyboardType="numeric"
                    />
                  ))}
                </View>
                <Pressable
                  onPress={handleManualAdd}
                  style={[styles.addBtn, { backgroundColor: colors.primary, opacity: foodName.trim() && calories ? 1 : 0.5 }]}
                >
                  <Text style={styles.addBtnText}>Add Food</Text>
                </Pressable>
              </View>
            )}

            {/* USDA Search Tab */}
            {sheetTab === "search" && (
              <View style={{ gap: 10 }}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={[styles.searchInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                    value={searchQuery} onChangeText={setSearchQuery}
                    placeholder="Search USDA food database..."
                    placeholderTextColor={colors.mutedForeground}
                    returnKeyType="search"
                    onSubmitEditing={handleUSDASearch}
                  />
                  <Pressable
                    onPress={handleUSDASearch}
                    style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                  >
                    {searching ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="search" size={18} color="#fff" />}
                  </Pressable>
                </View>
                {searching && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Searching USDA database…</Text>
                  </View>
                )}
                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                  {searchResults.map((food, i) => (
                    <Pressable
                      key={i}
                      onPress={() => fillForm(food)}
                      style={[styles.resultRow, { borderBottomColor: colors.border }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={2}>{food.name}</Text>
                        <Text style={[styles.resultMacros, { color: colors.mutedForeground }]}>
                          P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                        </Text>
                      </View>
                      <Text style={[styles.resultCals, { color: colors.primary }]}>{food.calories} kcal</Text>
                    </Pressable>
                  ))}
                  {!searching && searchResults.length === 0 && searchQuery.length > 0 && (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results. Try a different search.</Text>
                  )}
                  {!searching && searchResults.length === 0 && searchQuery.length === 0 && (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Search 900,000+ USDA foods. Results are per 100g.</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Scan Tab */}
            {sheetTab === "scan" && (
              <View style={{ gap: 14 }}>
                {/* AI Photo Analysis */}
                <View style={[styles.scanBlock, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <View style={styles.scanBlockHeader}>
                    <Feather name="camera" size={18} color={colors.primary} />
                    <Text style={[styles.scanBlockTitle, { color: colors.foreground }]}>Photo Analysis</Text>
                  </View>
                  <Text style={[styles.scanBlockSub, { color: colors.mutedForeground }]}>
                    Take a photo of your meal — Gemini AI will identify foods and estimate nutrition.
                  </Text>
                  <Pressable
                    onPress={handlePhotoAnalysis}
                    style={({ pressed }) => [styles.scanActionBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
                    disabled={analyzing}
                  >
                    {analyzing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Feather name="camera" size={16} color="#fff" />}
                    <Text style={styles.scanActionText}>{analyzing ? "Analyzing…" : "Take Photo"}</Text>
                  </Pressable>
                  {aiResults.length > 0 && (
                    <ScrollView style={{ maxHeight: 180, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                      {aiResults.map((food, i) => (
                        <Pressable key={i} onPress={() => fillForm(food)} style={[styles.resultRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.resultName, { color: colors.foreground }]}>{food.name}</Text>
                            <Text style={[styles.resultMacros, { color: colors.mutedForeground }]}>
                              P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                            </Text>
                          </View>
                          <Text style={[styles.resultCals, { color: colors.primary }]}>{food.calories} kcal</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Barcode Lookup */}
                <View style={[styles.scanBlock, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <View style={styles.scanBlockHeader}>
                    <Feather name="maximize" size={18} color={colors.info} />
                    <Text style={[styles.scanBlockTitle, { color: colors.foreground }]}>Barcode Lookup</Text>
                  </View>
                  <Text style={[styles.scanBlockSub, { color: colors.mutedForeground }]}>
                    Type a product barcode to look up nutrition from the Open Food Facts database.
                  </Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.searchInput, { flex: 1, backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                      value={barcodeInput} onChangeText={setBarcodeInput}
                      placeholder="Enter barcode number…"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      returnKeyType="search"
                      onSubmitEditing={handleBarcodeSearch}
                    />
                    <Pressable onPress={handleBarcodeSearch} style={[styles.searchBtn, { backgroundColor: colors.info }]}>
                      {barcodeLoading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="search" size={18} color="#fff" />}
                    </Pressable>
                  </View>
                  {barcodeResult && (
                    <Pressable onPress={() => fillForm(barcodeResult)} style={[styles.resultRow, { borderBottomColor: colors.border, marginTop: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: colors.foreground }]}>{barcodeResult.name}</Text>
                        <Text style={[styles.resultMacros, { color: colors.mutedForeground }]}>
                          P:{barcodeResult.protein}g · C:{barcodeResult.carbs}g · F:{barcodeResult.fat}g · per 100g
                        </Text>
                      </View>
                      <Text style={[styles.resultCals, { color: colors.primary }]}>{barcodeResult.calories} kcal</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Quick Add Tab */}
            {sheetTab === "quick" && (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {QUICK_FOODS.map((food, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handleQuickAdd(food)}
                    style={[styles.resultRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultName, { color: colors.foreground }]}>{food.name}</Text>
                      <Text style={[styles.resultMacros, { color: colors.mutedForeground }]}>
                        P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                      </Text>
                    </View>
                    <Text style={[styles.resultCals, { color: colors.primary }]}>{food.calories} kcal</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
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
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetTabs: { flexDirection: "row", gap: 4 },
  sheetTab: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 2 },
  sheetTabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  addBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  searchBtn: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resultRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  resultName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  resultMacros: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultCals: { fontSize: 14, fontFamily: "Inter_700Bold", marginLeft: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 20 },
  scanBlock: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  scanBlockHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  scanBlockTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scanBlockSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scanActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 10 },
  scanActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
