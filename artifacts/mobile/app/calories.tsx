import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Circle, ClipPath, Defs, G, Rect, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import type { FoodEntry } from "@/context/AppContext";
import type { MealTemplate } from "@/context/AppContext";
import FOODS, { searchFoods } from "@/constants/foods";
import type { FoodItem } from "@/constants/foods";
import { useColors } from "@/hooks/useColors";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];
type SheetTab = "search" | "photo" | "barcode" | "custom" | "quick" | "templates";
type PhotoPhase = "idle" | "analyzing" | "results";
type BarcodePhase = "idle" | "camera" | "scanning" | "found";

type AiFoodResult = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
};

async function compressToJpeg(
  uri: string,
  base64?: string | null,
  mimeType?: string | null
): Promise<{ base64: string; mimeType: string }> {
  // Native: use expo-image-manipulator to resize ≤ 1024×1024 and compress JPEG
  if (Platform.OS !== "web") {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024, height: 1024 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return {
      base64: manipulated.base64 ?? "",
      mimeType: "image/jpeg",
    };
  }
  // Web fallback: canvas-based resize
  if (!base64 || typeof document === "undefined") {
    return { base64: base64 ?? "", mimeType: mimeType ?? "image/jpeg" };
  }
  return new Promise((resolve) => {
    const img = new (window as any).Image() as HTMLImageElement;
    img.onload = () => {
      const MAX = 1024;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ base64, mimeType: mimeType ?? "image/jpeg" }); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      resolve({ base64: dataUrl.split(",")[1] ?? base64, mimeType: "image/jpeg" });
    };
    img.onerror = () => resolve({ base64, mimeType: mimeType ?? "image/jpeg" });
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

type ScannedProduct = {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  servingGrams: number;
  per100gCalories: number;
  per100gProtein: number;
  per100gCarbs: number;
  per100gFat: number;
};

function parseServingGrams(serving: string): number {
  const m = serving.match(/(\d+(?:\.\d+)?)\s*g/i);
  return m ? Math.round(parseFloat(m[1])) : 100;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const MEAL_META: Record<MealType, { label: string; color: string; icon: string }> = {
  breakfast: { label: "Breakfast", color: "#f59e0b", icon: "sun" },
  lunch:     { label: "Lunch",     color: "#22c55e", icon: "package" },
  dinner:    { label: "Dinner",    color: "#3b82f6", icon: "moon" },
  snack:     { label: "Snacks",    color: "#8b5cf6", icon: "coffee" },
};

const DONUT_R = 56;
const DONUT_SIZE = 140;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_R;

// Animated SVG circle (JS-driven, works cross-platform with useNativeDriver: false)
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── STACKED BAR CHART ─────────────────────────────────────────────────────

const SBAR_H = 64;
const SBAR_W = 22;

function StackedBar({ protein, carbs, fat, maxGrams, dayIdx }: {
  protein: number; carbs: number; fat: number; maxGrams: number; dayIdx: number;
}) {
  const total = protein + carbs + fat;
  if (total === 0 || maxGrams === 0) return <View style={{ height: SBAR_H, width: SBAR_W }} />;

  const scale = SBAR_H / maxGrams;
  const fH = Math.max(0, Math.round(fat * scale));
  const cH = Math.max(0, Math.round(carbs * scale));
  const pH = Math.max(0, Math.round(protein * scale));
  const totalH = Math.min(SBAR_H, fH + cH + pH);

  if (totalH === 0) return <View style={{ height: SBAR_H, width: SBAR_W }} />;

  // SVG y=0 is the top; stack from bottom up: fat → carbs → protein
  const fY = SBAR_H - fH;
  const cY = fY - cH;
  const pY = cY - pH;
  const clipId = `sc${dayIdx}`;

  return (
    <Svg width={SBAR_W} height={SBAR_H}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={SBAR_H - totalH} width={SBAR_W} height={totalH} rx={3} ry={3} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {fH > 0 && <Rect x={0} y={fY} width={SBAR_W} height={fH} fill="#8b5cf6" />}
        {cH > 0 && <Rect x={0} y={cY} width={SBAR_W} height={cH} fill="#f59e0b" />}
        {pH > 0 && <Rect x={0} y={pY} width={SBAR_W} height={pH} fill="#3b82f6" />}
      </G>
    </Svg>
  );
}

const QUICK_FOODS: FoodItem[] = [
  FOODS.find((f) => f.id === "pr10")!, // Whey Protein
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

type ColorsType = ReturnType<typeof import("@/hooks/useColors").useColors>;

function DonutRing({ consumed, goal, colors }: { consumed: number; goal: number; colors: ColorsType }) {
  const pct = Math.min(1, consumed / Math.max(1, goal));
  const remaining = goal - consumed;
  const cx = DONUT_SIZE / 2;

  const offsetAnim = useRef(new Animated.Value(CIRCUMFERENCE)).current;

  useEffect(() => {
    Animated.timing(offsetAnim, {
      toValue: CIRCUMFERENCE * (1 - pct),
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <View style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
          <Circle cx={cx} cy={cx} r={DONUT_R} stroke={colors.border} strokeWidth={12} fill="none" />
          <AnimatedCircle
            cx={cx} cy={cx} r={DONUT_R}
            stroke={remaining < 0 ? colors.destructive : colors.primary}
            strokeWidth={12} fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={offsetAnim}
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

function MacroBarFull({ label, value, max, color, colors }: { label: string; value: number; max: number; color: string; colors: ColorsType }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", color: colors.foreground }}>
          {value}g <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{pct}%</Text>
        </Text>
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
  const { state, addFoodEntry, removeFoodEntry, updateWater, getTodayCalories, getWeeklyNutrition, saveMealTemplate, deleteMealTemplate, loadMealTemplate } = useApp();

  const today = getTodayCalories();
  const todayDateStr = makeDateStr(0);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  // ── Weekly chart view toggle ───────────────────────────────────────────────
  const [weekViewMode, setWeekViewMode] = useState<"calories" | "macros">("calories");

  // ── Day breakdown modal ────────────────────────────────────────────────────
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // ── Expandable meal cards ──────────────────────────────────────────────────
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(
    () => new Set(MEAL_TYPES.filter((m) => today.entries.some((e) => e.meal === m)))
  );

  function toggleMeal(meal: MealType) {
    setExpandedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(meal)) next.delete(meal);
      else next.add(meal);
      return next;
    });
  }

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

  // ── Camera permission ──────────────────────────────────────────────────────
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ── Photo (real image picker + AI) ────────────────────────────────────────
  const [photoPhase, setPhotoPhase] = useState<PhotoPhase>("idle");
  const [photoSuggestions, setPhotoSuggestions] = useState<AiFoodResult[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoGrams, setPhotoGrams] = useState<Record<string, string>>({});
  const [photoBaseGrams, setPhotoBaseGrams] = useState<Record<string, number>>({});
  const [photoElapsed, setPhotoElapsed] = useState(0);

  useEffect(() => {
    if (photoPhase !== "analyzing") {
      setPhotoElapsed(0);
      return;
    }
    setPhotoElapsed(0);
    const interval = setInterval(() => setPhotoElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [photoPhase]);

  async function pickAndAnalyze(launcher: () => Promise<ImagePicker.ImagePickerResult>) {
    setPhotoError(null);
    const result = await launcher();
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const raw = asset.base64;
    const mime = asset.mimeType ?? "image/jpeg";
    const uri = asset.uri;
    if (!uri && !raw) { setPhotoError("Could not read image data."); return; }
    const { base64, mimeType } = await compressToJpeg(uri, raw, mime);
    if (!base64) { setPhotoError("Failed to compress image."); return; }
    await startAnalysis(base64, mimeType);
  }

  async function startPhotoScan() {
    setPhotoError(null);
    if (Platform.OS === "web") {
      await pickAndAnalyze(() =>
        ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5, base64: true })
      );
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camResult = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted" && camResult.status !== "granted") {
      Alert.alert("Permission needed", "Allow camera or photo library access to analyze food.");
      return;
    }
    Alert.alert(
      "Add Food Photo",
      "Choose how to capture your meal",
      [
        {
          text: "Take Photo",
          onPress: () => pickAndAnalyze(() =>
            ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5, base64: true })
          ),
        },
        {
          text: "Choose from Library",
          onPress: () => pickAndAnalyze(() =>
            ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.5, base64: true })
          ),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  async function startAnalysis(base64: string, mimeType: string) {
    setPhotoPhase("analyzing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/analyze-food`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = (await res.json()) as {
        analysisId?: string;
        status?: string;
        foods?: unknown[];
        error?: string;
      };

      // Cache hit — server returned done immediately
      if (data.status === "done" && Array.isArray(data.foods)) {
        populateResults(data.foods);
        return;
      }

      const analysisId = data.analysisId;
      if (!analysisId) throw new Error("No analysisId returned from server.");

      // Poll every 3 seconds until done or error
      const poll = async (): Promise<void> => {
        const pollRes = await fetch(`${API_BASE}/api/food-analyses/${encodeURIComponent(analysisId)}`);
        if (!pollRes.ok) throw new Error(`Polling error ${pollRes.status}`);
        const pollData = (await pollRes.json()) as {
          status: string;
          foods?: unknown[];
          error?: string;
        };
        if (pollData.status === "done") {
          populateResults(pollData.foods ?? []);
          return;
        }
        if (pollData.status === "error") {
          throw new Error(pollData.error || "Analysis failed.");
        }
        // Still processing — wait 3s and try again
        await new Promise((r) => setTimeout(r, 3000));
        return poll();
      };

      await poll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze photo.";
      setPhotoError(msg);
      setPhotoPhase("idle");
    }
  }

  function populateResults(foods: unknown[]) {
    const items = (foods ?? []) as Array<{
      name: string;
      quantity?: number;
      unit?: string;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
      serving?: string;
    }>;
    if (items.length === 0) {
      setPhotoError("No food detected in the photo. Try a clearer image.");
      setPhotoPhase("idle");
      return;
    }
    const results: AiFoodResult[] = items.map((f, i) => {
      const servingText = f.serving ?? `${f.quantity ?? 1} ${f.unit ?? "serving"}`;
      const baseGrams = parseServingGrams(servingText);
      return {
        id: `ai-${i}-${Date.now()}`,
        name: f.name,
        calories: Math.round(f.calories ?? 0),
        protein: Math.round(f.proteinG ?? 0),
        carbs: Math.round(f.carbsG ?? 0),
        fat: Math.round(f.fatG ?? 0),
        serving: servingText,
      };
    });
    const gramsMap: Record<string, string> = {};
    const baseMap: Record<string, number> = {};
    results.forEach((r) => {
      const base = parseServingGrams(r.serving);
      gramsMap[r.id] = String(base);
      baseMap[r.id] = base;
    });
    setPhotoGrams(gramsMap);
    setPhotoBaseGrams(baseMap);
    setPhotoSuggestions(results);
    setPhotoPhase("results");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function addPhotoSuggestion(food: AiFoodResult) {
    if (!addingMeal) return;
    const grams = Math.max(1, parseFloat(photoGrams[food.id] ?? "100") || 100);
    const base = photoBaseGrams[food.id] ?? 100;
    const ratio = grams / base;
    const entry: FoodEntry = {
      id: makeId(),
      name: `${food.name} (${grams}g)`,
      calories: Math.round(food.calories * ratio),
      protein: Math.round(food.protein * ratio),
      carbs: Math.round(food.carbs * ratio),
      fat: Math.round(food.fat * ratio),
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    setPhotoSuggestions((prev) => prev.filter((f) => f.id !== food.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (photoSuggestions.length <= 1) setAddingMeal(null);
  }

  // ── Barcode (camera on native, text input on web + Open Food Facts) ────────
  const [barcodePhase, setBarcodePhase] = useState<BarcodePhase>("idle");
  const [barcodeProduct, setBarcodeProduct] = useState<ScannedProduct | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeGrams, setBarcodeGrams] = useState("100");
  const barcodeScanningRef = useRef(false);
  const isWeb = Platform.OS === "web";

  async function startBarcodeScan() {
    setBarcodeError(null);
    setBarcodeInput("");
    if (isWeb) {
      setBarcodePhase("camera");
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Camera permission required", "Enable camera access in Settings to scan barcodes.");
        return;
      }
    }
    barcodeScanningRef.current = false;
    setBarcodePhase("camera");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleBarcodeLookup(barcode: string) {
    if (!barcode.trim()) return;
    if (barcodeScanningRef.current) return;
    barcodeScanningRef.current = true;
    setBarcodePhase("scanning");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/barcode/${encodeURIComponent(barcode.trim())}`);
      const data = await res.json() as ScannedProduct & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`);
      setBarcodeProduct(data);
      setBarcodePhase("found");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not find product.";
      setBarcodeError(msg);
      barcodeScanningRef.current = false;
      setBarcodePhase("camera");
    }
  }

  function confirmBarcodeProduct() {
    if (!addingMeal || !barcodeProduct) return;
    const grams = Math.max(1, parseFloat(barcodeGrams) || 100);
    const ratio = grams / 100;
    const baseName = barcodeProduct.brand
      ? `${barcodeProduct.name} (${barcodeProduct.brand})`
      : barcodeProduct.name;
    const entry: FoodEntry = {
      id: makeId(),
      name: `${baseName} – ${grams}g`,
      calories: Math.round(barcodeProduct.per100gCalories * ratio),
      protein: Math.round(barcodeProduct.per100gProtein * ratio),
      carbs: Math.round(barcodeProduct.per100gCarbs * ratio),
      fat: Math.round(barcodeProduct.per100gFat * ratio),
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
      id: makeId(), name: customName.trim(),
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
      id: makeId(), name: food.name, calories: food.calories,
      protein: food.protein, carbs: food.carbs, fat: food.fat,
      fiber: food.fiber, sugar: food.sugar, sodium: food.sodium,
      meal: addingMeal,
      time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };
    addFoodEntry(todayDateStr, entry);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddingMeal(null);
  }

  // ── Template save modal ───────────────────────────────────────────────────
  const [saveTemplateVisible, setSaveTemplateVisible] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");

  function openSaveTemplate() {
    const d = new Date();
    const defaultName = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    setTemplateNameInput(defaultName);
    setSaveTemplateVisible(true);
  }

  function confirmSaveTemplate() {
    if (!templateNameInput.trim()) return;
    saveMealTemplate(templateNameInput.trim(), today.entries);
    setSaveTemplateVisible(false);
    setTemplateNameInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // ── Sheet open/close ───────────────────────────────────────────────────────
  function openAdd(meal: MealType) {
    setAddingMeal(meal);
    setSheetTab("search");
    setSearchQuery("");
    setPhotoPhase("idle"); setPhotoSuggestions([]);
    setBarcodePhase("idle"); setBarcodeProduct(null);
    setCustomName(""); setCustomCals(""); setCustomProtein(""); setCustomCarbs(""); setCustomFat("");
    // Auto-expand the target meal card
    setExpandedMeals((prev) => new Set([...prev, meal]));
  }

  function closeSheet() {
    setAddingMeal(null);
    setPhotoPhase("idle");
    setPhotoSuggestions([]);
    setPhotoError(null);
    setPhotoGrams({});
    setPhotoBaseGrams({});
    setBarcodePhase("idle");
    setBarcodeProduct(null);
    setBarcodeError(null);
    setBarcodeInput("");
    setBarcodeGrams("100");
    barcodeScanningRef.current = false;
  }

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
  const weekData = getWeeklyNutrition();
  const weekDayLabels = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { label: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()], isToday: i === 6 };
    }), []);
  const weekDayDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => makeDateStr(6 - i)), []);

  const weekAvg = Math.round(weekData.reduce((s, d) => s + d.consumed, 0) / 7);
  const bestProteinDay = weekData.reduce((b, d) => d.protein > b.protein ? d : b, weekData[0]);
  const adherenceDays = weekData.filter((d) => d.consumed > 0 && Math.abs(d.consumed - d.goal) < 250).length;
  const weekMaxCals = Math.max(state.userProfile.calorieGoal, ...weekData.map((d) => d.consumed), 1);
  const weekMaxGrams = Math.max(1, ...weekData.map((d) => d.protein + d.carbs + d.fat));
  const weekAvgProtein = Math.round(weekData.reduce((s, d) => s + d.protein, 0) / 7);
  const weekAvgCarbs = Math.round(weekData.reduce((s, d) => s + d.carbs, 0) / 7);
  const weekAvgFat = Math.round(weekData.reduce((s, d) => s + d.fat, 0) / 7);

  // ── Macro goals ────────────────────────────────────────────────────────────
  const proteinGoal = state.userProfile.proteinGoal;
  const carbGoal = state.userProfile.carbGoal ?? Math.round((today.goal * 0.45) / 4);
  const fatGoal = state.userProfile.fatGoal ?? Math.round((today.goal * 0.3) / 9);

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
            <Text style={[s.goalText, { color: colors.mutedForeground }]}>
              Goal: <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold" }}>{today.goal} kcal</Text>
            </Text>
            <Text style={[s.goalText, { color: colors.mutedForeground }]}>
              Protein: <Text style={{ color: "#3b82f6", fontFamily: "Inter_700Bold" }}>{proteinGoal}g</Text>
            </Text>
          </View>
        </View>

        {/* ── Weekly Strip ── */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: 16 }]}>
          {/* Header row with title + Calories/Macros toggle */}
          <View style={s.weekHeader}>
            <Text style={[s.weekTitle, { color: colors.foreground }]}>Weekly Overview</Text>
            <View style={s.weekToggle}>
              {(["calories", "macros"] as const).map((mode) => {
                const active = weekViewMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => { setWeekViewMode(mode); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[s.weekToggleBtn, { backgroundColor: active ? colors.primary : "transparent", borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[s.weekToggleBtnText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {mode === "calories" ? "Calories" : "Macros"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Macros legend (only in macros view) */}
          {weekViewMode === "macros" && (
            <View style={s.weekLegend}>
              {[{ label: "Protein", color: "#3b82f6" }, { label: "Carbs", color: "#f59e0b" }, { label: "Fat", color: "#8b5cf6" }].map((l) => (
                <View key={l.label} style={s.weekLegendItem}>
                  <View style={[s.weekLegendDot, { backgroundColor: l.color }]} />
                  <Text style={[s.weekLegendText, { color: colors.mutedForeground }]}>{l.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Bar chart — Calories or Macros */}
          <View style={s.barsRow}>
            {weekData.map((day, i) => {
              const meta = weekDayLabels[i];
              return (
                <Pressable
                  key={i}
                  style={s.barCol}
                  onPress={() => {
                    setSelectedDayDate(weekDayDates[i]);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {weekViewMode === "calories" ? (
                    <View style={{ height: SBAR_H, justifyContent: "flex-end" }}>
                      <View
                        style={{
                          width: SBAR_W,
                          height: Math.max(3, Math.round((day.consumed / weekMaxCals) * SBAR_H)),
                          backgroundColor: meta.isToday ? colors.primary : colors.border,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  ) : (
                    <StackedBar
                      protein={day.protein}
                      carbs={day.carbs}
                      fat={day.fat}
                      maxGrams={weekMaxGrams}
                      dayIdx={i}
                    />
                  )}
                  <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: meta.isToday ? colors.primary : colors.mutedForeground, marginTop: 4 }}>
                    {meta.label}
                  </Text>
                  {meta.isToday && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 }} />}
                </Pressable>
              );
            })}
          </View>

          {/* Stats row — changes based on active view */}
          <View style={[s.weekStats, { borderTopColor: colors.border }]}>
            {weekViewMode === "calories" ? (
              <>
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
              </>
            ) : (
              <>
                <View style={s.weekStat}>
                  <Text style={[s.weekStatVal, { color: "#3b82f6" }]}>{weekAvgProtein}g</Text>
                  <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>Avg protein</Text>
                </View>
                <View style={[s.weekStatDivider, { backgroundColor: colors.border }]} />
                <View style={s.weekStat}>
                  <Text style={[s.weekStatVal, { color: "#f59e0b" }]}>{weekAvgCarbs}g</Text>
                  <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>Avg carbs</Text>
                </View>
                <View style={[s.weekStatDivider, { backgroundColor: colors.border }]} />
                <View style={s.weekStat}>
                  <Text style={[s.weekStatVal, { color: "#8b5cf6" }]}>{weekAvgFat}g</Text>
                  <Text style={[s.weekStatLabel, { color: colors.mutedForeground }]}>Avg fat</Text>
                </View>
              </>
            )}
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
          const isExpanded = expandedMeals.has(meal);

          return (
            <View key={meal} style={[s.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Tappable header toggles expansion */}
              <Pressable onPress={() => toggleMeal(meal)} style={s.mealHeader}>
                <View style={[s.mealIcon, { backgroundColor: meta.color + "22" }]}>
                  <Feather name={meta.icon as any} size={16} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.mealName, { color: colors.foreground }]}>{meta.label}</Text>
                  {entries.length > 0 && (
                    <Text style={[s.mealMacroSub, { color: colors.mutedForeground }]}>
                      {mealCals} kcal · P:{Math.round(mealProtein)}g · C:{Math.round(mealCarbs)}g · F:{Math.round(mealFat)}g
                    </Text>
                  )}
                </View>
                {entries.length > 0 && (
                  <Feather
                    name={isExpanded ? "chevron-down" : "chevron-right"}
                    size={16}
                    color={colors.mutedForeground}
                    style={{ marginRight: 4 }}
                  />
                )}
                <Pressable
                  onPress={() => openAdd(meal)}
                  hitSlop={8}
                  style={[s.mealAddBtn, { borderColor: colors.primary }]}
                >
                  <Feather name="plus" size={16} color={colors.primary} />
                </Pressable>
              </Pressable>

              {/* Entries — shown only when expanded */}
              {isExpanded && entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  onPress={() =>
                    router.push({
                      pathname: "/food-detail",
                      params: {
                        food: JSON.stringify({
                          id: entry.id, name: entry.name,
                          servingSize: 100, servingUnit: "g",
                          calories: entry.calories, protein: entry.protein,
                          carbs: entry.carbs, fat: entry.fat,
                          fiber: entry.fiber ?? 0, sugar: entry.sugar ?? 0, sodium: entry.sodium ?? 0,
                          category: "Custom",
                        }),
                        entryId: entry.id,
                        date: todayDateStr,
                      },
                    })
                  }
                  style={[s.entryRow, { borderTopColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.entryName, { color: colors.foreground }]} numberOfLines={1}>{entry.name}</Text>
                    <View style={{ flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
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

        {/* ── Save Today as Template ── */}
        {today.entries.length > 0 && (
          <Pressable
            onPress={openSaveTemplate}
            style={[s.saveTemplateBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="bookmark" size={16} color={colors.primary} />
            <Text style={[s.saveTemplateBtnText, { color: colors.primary }]}>Save today as template</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Add Food Full-Screen Modal ── */}
      {addingMeal && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 100 }]}>
          <View style={[s.sheet, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 16, flex: 1, maxHeight: "67%" }]}>

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
                {(["search", "photo", "barcode", "custom", "quick", "templates"] as SheetTab[]).map((tab) => {
                  const icons: Record<SheetTab, string> = { search: "search", photo: "camera", barcode: "maximize", custom: "edit-3", quick: "list", templates: "bookmark" };
                  const labels: Record<SheetTab, string> = { search: "Search", photo: "Photo", barcode: "Barcode", custom: "Custom", quick: "Quick", templates: "Templates" };
                  const active = sheetTab === tab;
                  const templateCount = tab === "templates" ? state.mealTemplates.length : 0;
                  return (
                    <Pressable key={tab} onPress={() => setSheetTab(tab)} style={[s.sheetTab, { borderBottomColor: active ? colors.primary : "transparent" }]}>
                      <Feather name={icons[tab] as any} size={13} color={active ? colors.primary : colors.mutedForeground} />
                      <Text style={[s.sheetTabText, { color: active ? colors.primary : colors.mutedForeground }]}>{labels[tab]}</Text>
                      {templateCount > 0 && (
                        <View style={[s.tabBadge, { backgroundColor: colors.primary }]}>
                          <Text style={s.tabBadgeText}>{templateCount}</Text>
                        </View>
                      )}
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
                    value={searchQuery} onChangeText={setSearchQuery}
                    placeholder="Search 85+ foods…"
                    placeholderTextColor={colors.mutedForeground}
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
                {searchQuery.trim() === "" && searchResults.length > 0 && (
                  <Text style={[s.recentsLabel, { color: colors.mutedForeground }]}>Recent foods</Text>
                )}
                {searchQuery.trim() !== "" && searchResults.length === 0 && (
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No results for "{searchQuery}"</Text>
                )}
                {searchQuery.trim() === "" && searchResults.length === 0 && (
                  <Text style={[s.emptyText, { color: colors.mutedForeground }]}>Type to search the local food database.</Text>
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
                        <Text style={[s.resultServing, { color: colors.mutedForeground }]}>{food.servingUnit}</Text>
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
                    <Text style={[s.simHint, { color: colors.mutedForeground }]}>
                      AI analyzes your meal photo and estimates nutrition
                    </Text>
                    {photoError && (
                      <View style={{ backgroundColor: "#ef444422", borderRadius: 10, padding: 10, width: "100%" }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444", textAlign: "center" }}>
                          {photoError}
                        </Text>
                      </View>
                    )}
                    <Pressable onPress={startPhotoScan} style={[s.bigBtn, { backgroundColor: colors.primary }]}>
                      <Feather name="camera" size={18} color="#fff" />
                      <Text style={s.bigBtnText}>Take / Choose Photo</Text>
                    </Pressable>
                  </View>
                )}

                {photoPhase === "analyzing" && (
                  <View style={{ alignItems: "center", gap: 16, paddingVertical: 20 }}>
                    <View style={[s.analyzingBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                    <Text style={[s.analyzingText, { color: colors.foreground }]}>Analyzing meal…</Text>
                    <Text style={[s.analyzingSubText, { color: colors.mutedForeground }]}>
                      Identifying foods and estimating nutrition
                    </Text>
                    <Text style={[s.analyzingSubText, { color: colors.mutedForeground }]}>
                      {photoElapsed}s elapsed
                    </Text>
                  </View>
                )}

                {photoPhase === "results" && (
                  <View style={{ gap: 10 }}>
                    <Text style={[s.aiLabel, { color: colors.mutedForeground }]}>AI detected these foods — set grams, then add:</Text>
                    {photoSuggestions.map((food) => {
                      const base = photoBaseGrams[food.id] ?? 100;
                      const grams = Math.max(1, parseFloat(photoGrams[food.id] ?? String(base)) || base);
                      const ratio = grams / base;
                      return (
                        <View key={food.id} style={[s.aiCard, { backgroundColor: colors.muted, borderColor: colors.border, flexDirection: "column", gap: 10 }]}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.resultName, { color: colors.foreground }]} numberOfLines={1}>{food.name}</Text>
                              <Text style={[s.resultServing, { color: colors.mutedForeground }]}>AI estimate for {base}g</Text>
                            </View>
                            <Pressable onPress={() => setPhotoSuggestions((p) => p.filter((f) => f.id !== food.id))} style={[s.aiActionBtn, { borderColor: colors.border, borderWidth: 1 }]}>
                              <Feather name="x" size={16} color={colors.mutedForeground} />
                            </Pressable>
                          </View>

                          {/* Grams row */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, flex: 1 }}>Amount</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 }}>
                              <Pressable
                                onPress={() => {
                                  const cur = parseFloat(photoGrams[food.id] ?? String(base)) || base;
                                  setPhotoGrams((q) => ({ ...q, [food.id]: String(Math.max(1, cur - 10)) }));
                                }}
                                hitSlop={8}
                              >
                                <Feather name="minus" size={15} color={colors.mutedForeground} />
                              </Pressable>
                              <TextInput
                                style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 44, textAlign: "center" }}
                                value={photoGrams[food.id] ?? String(base)}
                                onChangeText={(v) => setPhotoGrams((q) => ({ ...q, [food.id]: v }))}
                                keyboardType="decimal-pad"
                                selectTextOnFocus
                              />
                              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>g</Text>
                              <Pressable
                                onPress={() => {
                                  const cur = parseFloat(photoGrams[food.id] ?? String(base)) || base;
                                  setPhotoGrams((q) => ({ ...q, [food.id]: String(cur + 10) }));
                                }}
                                hitSlop={8}
                              >
                                <Feather name="plus" size={15} color={colors.mutedForeground} />
                              </Pressable>
                            </View>
                          </View>

                          {/* Live macro chips + add button */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View style={{ flexDirection: "row", gap: 4, flex: 1, flexWrap: "wrap" }}>
                              <FoodChip label={`${Math.round(food.calories * ratio)} kcal`} color={colors.primary} />
                              <FoodChip label={`P ${Math.round(food.protein * ratio)}g`} color="#3b82f6" />
                              <FoodChip label={`C ${Math.round(food.carbs * ratio)}g`} color="#f59e0b" />
                              <FoodChip label={`F ${Math.round(food.fat * ratio)}g`} color="#8b5cf6" />
                            </View>
                            <Pressable onPress={() => addPhotoSuggestion(food)} style={[s.aiActionBtn, { backgroundColor: colors.primary }]}>
                              <Feather name="check" size={16} color="#fff" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                    {photoSuggestions.length === 0 && (
                      <Text style={[s.emptyText, { color: colors.mutedForeground }]}>All done!</Text>
                    )}
                    {photoSuggestions.length > 0 && (
                      <Pressable onPress={() => { setPhotoPhase("idle"); setPhotoSuggestions([]); setPhotoGrams({}); setPhotoBaseGrams({}); }} style={[s.ghostBtn, { borderColor: colors.border }]}>
                        <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Scan another photo</Text>
                      </Pressable>
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
                        Point camera at any barcode
                      </Text>
                    </View>
                    {barcodeError && (
                      <View style={{ backgroundColor: "#ef444422", borderRadius: 10, padding: 10, width: "100%" }}>
                        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444", textAlign: "center" }}>
                          {barcodeError}
                        </Text>
                      </View>
                    )}
                    <Pressable onPress={startBarcodeScan} style={[s.bigBtn, { backgroundColor: colors.info }]}>
                      <Feather name="maximize" size={18} color="#fff" />
                      <Text style={s.bigBtnText}>Scan Barcode</Text>
                    </Pressable>
                  </View>
                )}

                {barcodePhase === "camera" && (
                  <View style={{ gap: 12 }}>
                    {isWeb ? (
                      <>
                        <Text style={[s.simHint, { color: colors.mutedForeground }]}>
                          Enter the barcode number from the product packaging
                        </Text>
                        <View style={[s.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                          <Feather name="hash" size={16} color={colors.mutedForeground} />
                          <TextInput
                            style={[s.searchInput, { color: colors.foreground, flex: 1 }]}
                            value={barcodeInput}
                            onChangeText={setBarcodeInput}
                            placeholder="e.g. 5449000000996"
                            placeholderTextColor={colors.mutedForeground}
                            keyboardType="numeric"
                            autoFocus
                            returnKeyType="search"
                            onSubmitEditing={() => void handleBarcodeLookup(barcodeInput)}
                          />
                          {barcodeInput.length > 0 && (
                            <Pressable onPress={() => setBarcodeInput("")} hitSlop={8}>
                              <Feather name="x" size={14} color={colors.mutedForeground} />
                            </Pressable>
                          )}
                        </View>
                        {barcodeError && (
                          <View style={{ backgroundColor: "#ef444422", borderRadius: 10, padding: 10 }}>
                            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444", textAlign: "center" }}>
                              {barcodeError}
                            </Text>
                          </View>
                        )}
                        <Pressable
                          onPress={() => void handleBarcodeLookup(barcodeInput)}
                          style={[s.bigBtn, { backgroundColor: colors.info, opacity: barcodeInput.trim().length >= 6 ? 1 : 0.4 }]}
                        >
                          <Feather name="search" size={18} color="#fff" />
                          <Text style={s.bigBtnText}>Look Up Barcode</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={{ borderRadius: 14, overflow: "hidden", height: 220, position: "relative" }}>
                          <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128", "code39"] }}
                            onBarcodeScanned={(result) => { void handleBarcodeLookup(result.data); }}
                          />
                          <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", pointerEvents: "none" }]}>
                            <View style={[s.vfCorner, s.vfTL, { borderColor: "#fff", top: 40, left: 40 }]} />
                            <View style={[s.vfCorner, s.vfTR, { borderColor: "#fff", top: 40, right: 40 }]} />
                            <View style={[s.vfCorner, s.vfBL, { borderColor: "#fff", bottom: 40, left: 40 }]} />
                            <View style={[s.vfCorner, s.vfBR, { borderColor: "#fff", bottom: 40, right: 40 }]} />
                          </View>
                        </View>
                        <Text style={[s.analyzingSubText, { color: colors.mutedForeground, textAlign: "center" }]}>
                          Align barcode in frame — scans automatically
                        </Text>
                      </>
                    )}
                    <Pressable onPress={() => { setBarcodePhase("idle"); setBarcodeError(null); }} style={[s.ghostBtn, { borderColor: colors.border }]}>
                      <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                    </Pressable>
                  </View>
                )}

                {barcodePhase === "scanning" && (
                  <View style={{ alignItems: "center", gap: 16, paddingVertical: 20 }}>
                    <ActivityIndicator color={colors.info} size="large" />
                    <Text style={[s.analyzingText, { color: colors.foreground }]}>Looking up product…</Text>
                    <Text style={[s.analyzingSubText, { color: colors.mutedForeground }]}>Searching Open Food Facts database</Text>
                  </View>
                )}

                {barcodePhase === "found" && barcodeProduct && (() => {
                  const g = Math.max(1, parseFloat(barcodeGrams) || 100);
                  const r = g / 100;
                  return (
                    <View style={{ gap: 12 }}>
                      <Text style={[s.aiLabel, { color: colors.mutedForeground }]}>Product found — set grams:</Text>
                      <View style={[s.aiCard, { backgroundColor: colors.muted, borderColor: colors.border, flexDirection: "column", gap: 10 }]}>
                        <View>
                          <Text style={[s.resultName, { color: colors.foreground }]}>{barcodeProduct.name}</Text>
                          {barcodeProduct.brand && (
                            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>{barcodeProduct.brand}</Text>
                          )}
                          <Text style={[s.resultServing, { color: colors.mutedForeground }]}>per 100g · label: {barcodeProduct.servingSize}</Text>
                        </View>

                        {/* Grams stepper */}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, flex: 1 }}>Amount</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Pressable
                              onPress={() => setBarcodeGrams((v) => String(Math.max(1, (parseFloat(v) || 100) - 10)))}
                              hitSlop={8}
                            >
                              <Feather name="minus" size={16} color={colors.mutedForeground} />
                            </Pressable>
                            <TextInput
                              style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 44, textAlign: "center" }}
                              value={barcodeGrams}
                              onChangeText={setBarcodeGrams}
                              keyboardType="decimal-pad"
                              selectTextOnFocus
                            />
                            <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>g</Text>
                            <Pressable
                              onPress={() => setBarcodeGrams((v) => String((parseFloat(v) || 100) + 10))}
                              hitSlop={8}
                            >
                              <Feather name="plus" size={16} color={colors.mutedForeground} />
                            </Pressable>
                          </View>
                        </View>

                        {/* Live macro preview */}
                        <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
                          <FoodChip label={`${Math.round(barcodeProduct.per100gCalories * r)} kcal`} color={colors.primary} />
                          <FoodChip label={`P ${Math.round(barcodeProduct.per100gProtein * r)}g`} color="#3b82f6" />
                          <FoodChip label={`C ${Math.round(barcodeProduct.per100gCarbs * r)}g`} color="#f59e0b" />
                          <FoodChip label={`F ${Math.round(barcodeProduct.per100gFat * r)}g`} color="#8b5cf6" />
                        </View>
                      </View>

                      <Pressable onPress={confirmBarcodeProduct} style={[s.bigBtn, { backgroundColor: colors.primary }]}>
                        <Feather name="plus" size={18} color="#fff" />
                        <Text style={s.bigBtnText}>Add to {MEAL_META[addingMeal!].label}</Text>
                      </Pressable>
                      <Pressable onPress={() => { setBarcodePhase("idle"); setBarcodeProduct(null); setBarcodeError(null); setBarcodeGrams("100"); }} style={[s.ghostBtn, { borderColor: colors.border }]}>
                        <Text style={[s.ghostBtnText, { color: colors.mutedForeground }]}>Scan again</Text>
                      </Pressable>
                    </View>
                  );
                })()}
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

            {/* ── Templates Tab ── */}
            {sheetTab === "templates" && (
              <View style={{ gap: 10 }}>
                {state.mealTemplates.length === 0 ? (
                  <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
                    <Feather name="bookmark" size={32} color={colors.border} />
                    <Text style={[s.emptyText, { color: colors.mutedForeground, textAlign: "center" }]}>
                      No templates yet.{"\n"}Add food today and tap "Save today as template".
                    </Text>
                  </View>
                ) : (
                  <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                    {state.mealTemplates.map((tmpl: MealTemplate) => {
                      const tmplCals = tmpl.entries.reduce((s, e) => s + e.calories, 0);
                      const tmplProtein = tmpl.entries.reduce((s, e) => s + e.protein, 0);
                      return (
                        <View key={tmpl.id} style={[s.templateRow, { borderBottomColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.resultName, { color: colors.foreground }]} numberOfLines={1}>{tmpl.name}</Text>
                            <Text style={[s.resultServing, { color: colors.mutedForeground }]}>
                              {tmpl.entries.length} items · {tmplCals} kcal · P {Math.round(tmplProtein)}g
                            </Text>
                            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>
                              Saved {tmpl.createdAt}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              if (!addingMeal) return;
                              loadMealTemplate(todayDateStr, tmpl.id, addingMeal);
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              closeSheet();
                            }}
                            style={[s.templateLoadBtn, { backgroundColor: colors.primary }]}
                          >
                            <Feather name="download" size={14} color="#fff" />
                            <Text style={s.templateLoadBtnText}>Load</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => deleteMealTemplate(tmpl.id)}
                            hitSlop={8}
                            style={{ padding: 6 }}
                          >
                            <Feather name="trash-2" size={14} color={colors.destructive} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Day Breakdown Sheet ── */}
      {selectedDayDate && (() => {
        const dayLog = state.calorieLog.find((d) => d.date === selectedDayDate);
        const dayEntries = dayLog?.entries ?? [];
        const dayGoal = dayLog?.goal ?? state.userProfile.calorieGoal;
        const dayTotal = dayEntries.reduce((s, e) => s + e.calories, 0);
        const remaining = dayGoal - dayTotal;
        const [y, m, d] = selectedDayDate.split("-").map(Number);
        const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        const isToday = selectedDayDate === todayDateStr;
        return (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "flex-end", zIndex: 150 }]}>
            <View style={[s.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
              <View style={[s.handle, { backgroundColor: colors.border }]} />
              <View style={s.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sheetTitle, { color: colors.foreground }]}>{dateLabel}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: isToday ? colors.primary : colors.mutedForeground, marginTop: 2 }}>
                    {isToday ? "Today · " : ""}{dayTotal} kcal of {dayGoal} goal
                    {dayTotal > 0 ? (remaining >= 0
                      ? `  ·  ${remaining} left`
                      : `  ·  ${Math.abs(remaining)} over`) : ""}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedDayDate(null)} hitSlop={10}>
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Macro summary pills */}
              {dayEntries.length > 0 && (() => {
                const p = Math.round(dayEntries.reduce((s, e) => s + e.protein, 0));
                const c = Math.round(dayEntries.reduce((s, e) => s + e.carbs, 0));
                const f = Math.round(dayEntries.reduce((s, e) => s + e.fat, 0));
                return (
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3b82f622", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#3b82f6" }} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#3b82f6" }}>{p}g P</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f59e0b22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#f59e0b" }} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#f59e0b" }}>{c}g C</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#8b5cf622", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#8b5cf6" }} />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8b5cf6" }}>{f}g F</Text>
                    </View>
                  </View>
                );
              })()}

              {dayEntries.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 32 }}>
                  <Feather name="calendar" size={32} color={colors.border} />
                  <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10, textAlign: "center" }}>
                    No food logged for this day
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {MEAL_TYPES.filter((meal) => dayEntries.some((e) => e.meal === meal)).map((meal) => {
                    const mealEntries = dayEntries.filter((e) => e.meal === meal);
                    const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
                    const meta = MEAL_META[meal];
                    return (
                      <View key={meal} style={{ marginBottom: 14 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 7 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{meta.label}</Text>
                          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginLeft: "auto" }}>{mealCals} kcal</Text>
                        </View>
                        {mealEntries.map((entry) => (
                          <View key={entry.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground }} numberOfLines={1}>{entry.name}</Text>
                              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 }}>
                                P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F {Math.round(entry.fat)}g
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.foreground, marginLeft: 8 }}>{entry.calories}</Text>
                            <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginLeft: 3, alignSelf: "flex-end", marginBottom: 1 }}>kcal</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              <Pressable
                onPress={() => setSelectedDayDate(null)}
                style={{ marginTop: 12, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Close</Text>
              </Pressable>
            </View>
          </View>
        );
      })()}

      {/* ── Save Template Modal ── */}
      {saveTemplateVisible && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "center", alignItems: "center", zIndex: 200, paddingHorizontal: 24 }]}>
          <View style={[s.templateModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.templateModalTitle, { color: colors.foreground }]}>Save as Template</Text>
            <Text style={[s.templateModalSubtitle, { color: colors.mutedForeground }]}>
              {today.entries.length} food{today.entries.length !== 1 ? "s" : ""} will be saved
            </Text>
            <TextInput
              style={[s.templateModalInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={templateNameInput}
              onChangeText={setTemplateNameInput}
              placeholder="Template name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              selectTextOnFocus
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setSaveTemplateVisible(false)}
                style={[s.templateModalCancel, { borderColor: colors.border }]}
              >
                <Text style={{ fontFamily: "Inter_500Medium", color: colors.mutedForeground, fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmSaveTemplate}
                style={[s.templateModalSave, { backgroundColor: colors.primary, opacity: templateNameInput.trim() ? 1 : 0.45 }]}
              >
                <Feather name="bookmark" size={15} color="#fff" />
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#fff", fontSize: 14 }}>Save</Text>
              </Pressable>
            </View>
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
  mealAddBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  entryRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  entryName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entryTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: 2, alignSelf: "center" },
  entryCals: { fontSize: 14, fontFamily: "Inter_700Bold", marginRight: 4 },
  sheet: { padding: 20, flex: 1 },
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
  aiCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  aiActionBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  addBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  addBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  weekToggle: { flexDirection: "row", gap: 4, backgroundColor: "transparent" },
  weekToggleBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  weekToggleBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  weekLegend: { flexDirection: "row", gap: 12, justifyContent: "center", marginBottom: 10 },
  weekLegendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  weekLegendDot: { width: 8, height: 8, borderRadius: 4 },
  weekLegendText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  saveTemplateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", padding: 14, marginBottom: 10 },
  saveTemplateBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabBadge: { borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  templateRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1 },
  templateLoadBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  templateLoadBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  templateModal: { borderRadius: 20, borderWidth: 1, padding: 22, width: "100%", gap: 12 },
  templateModalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  templateModalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  templateModalInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  templateModalCancel: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", justifyContent: "center" },
  templateModalSave: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, padding: 12 },
});
