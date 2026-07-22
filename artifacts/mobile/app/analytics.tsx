import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth as useClerkAuth } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

const CHART_WIDTH = Dimensions.get("window").width - 36;

type ProgressPhotoEntry = { id: string; date: string; imageUrl: string | null; weightKg: number; notes: string };
type WeightEntry = { id: string; date: string; weightKg: number };
type PersonalRecord = { id: string; exerciseName: string; weightLbs: number; reps: number; estimatedOneRm: number; date: string };

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();
  const { state, isPremium, premiumStatusLoading } = useApp();
  const { userProfile, workoutHistory } = state;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [photos, setPhotos] = useState<ProgressPhotoEntry[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [progressRes, prsRes] = await Promise.all([
          fetch(`${API_BASE}/api/progress/entries`, { headers }),
          fetch(`${API_BASE}/api/prs/${userProfile.id}`, { headers }),
        ]);
        if (!progressRes.ok || !prsRes.ok) throw new Error("Failed to fetch");
        const progressData = await progressRes.json();
        const prsData = await prsRes.json();
        if (cancelled) return;
        setWeightHistory(progressData.weightHistory ?? []);
        setPhotos(progressData.progressPhotos ?? []);
        setPrs(prsData.records ?? []);
      } catch {
        if (!cancelled) setError("Could not load analytics data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userProfile.id]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklyVolume: { label: string; volume: number; sessions: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = now - (i + 1) * weekMs;
    const weekEnd = now - i * weekMs;
    const inWeek = workoutHistory.filter((w) => {
      const t = new Date(w.date).getTime();
      return t >= weekStart && t < weekEnd;
    });
    weeklyVolume.push({
      label: i === 0 ? "This wk" : `${i}wk ago`,
      volume: inWeek.reduce((sum, w) => sum + w.volume, 0),
      sessions: inWeek.length,
    });
  }
  const maxVolume = Math.max(1, ...weeklyVolume.map((w) => w.volume));

  const chartData = [...weightHistory].sort((a, b) => a.date.localeCompare(b.date)).slice(-12);
  const hasEnoughChartData = chartData.length >= 2;
  const labelStep = chartData.length > 6 ? Math.ceil(chartData.length / 6) : 1;
  const lineChartData = {
    labels: chartData.map((w, i) => (i % labelStep === 0 || i === chartData.length - 1 ? w.date.slice(5) : "")),
    datasets: [
      {
        data: chartData.length > 0 ? chartData.map((w) => parseFloat((w.weightKg * 2.20462).toFixed(1))) : [0],
        color: () => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  const avgDuration = workoutHistory.length
    ? Math.round(workoutHistory.reduce((sum, w) => sum + w.duration, 0) / workoutHistory.length / 60)
    : 0;
  const totalVolume = workoutHistory.reduce((sum, w) => sum + w.volume, 0);

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
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Progress & Analytics</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Training volume — premium gated, same as Detailed Analytics card on profile */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Training Volume</Text>
        {workoutHistory.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border, alignItems: "center", paddingVertical: 20, marginBottom: 20 }]}>
            <Feather name="bar-chart-2" size={22} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}>Log a workout to see your analytics</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 20 }]}>
            <View style={{ flexDirection: "row", marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statVal, { color: colors.foreground }]}>{Math.round(totalVolume).toLocaleString()}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Volume (lbs)</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statVal, { color: colors.foreground }]}>{avgDuration}m</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Avg Duration</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statVal, { color: colors.foreground }]}>{workoutHistory.length}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Sessions</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 90, gap: 10 }}>
              {weeklyVolume.map((w) => (
                <View key={w.label} style={{ flex: 1, alignItems: "center" }}>
                  <View
                    style={{
                      width: "100%",
                      height: Math.max(4, (w.volume / maxVolume) * 70),
                      backgroundColor: colors.primary,
                      borderRadius: 4,
                    }}
                  />
                  <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 6 }}>{w.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weight trend + progress photos */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight Trend</Text>
        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 30 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : error ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 20 }}>{error}</Text>
        ) : hasEnoughChartData ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, overflow: "hidden", marginBottom: 20, padding: 0 }]}>
            <LineChart
              data={lineChartData}
              width={CHART_WIDTH}
              height={180}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: () => colors.primary,
                labelColor: () => colors.mutedForeground,
                propsForDots: { r: "4", strokeWidth: "2", stroke: colors.primary },
                propsForBackgroundLines: { stroke: colors.border, strokeWidth: 1 },
              }}
              bezier
              style={{ marginLeft: -8, marginTop: 8 }}
              withInnerLines
              withOuterLines={false}
            />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border, alignItems: "center", paddingVertical: 20, marginBottom: 20 }]}>
            <Feather name="trending-up" size={22} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}>Log at least two weight entries to see a trend</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Progress Photos</Text>
        {!loading && photos.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border, alignItems: "center", paddingVertical: 20, marginBottom: 20 }]}>
            <Feather name="camera" size={22} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}>No progress photos yet</Text>
          </View>
        ) : (
          <View style={[styles.photoGrid, { marginBottom: 20 }]}>
            {photos.map((p) => (
              <View key={p.id} style={{ width: "31%" }}>
                {p.imageUrl ? (
                  <Image source={{ uri: p.imageUrl }} style={styles.photoThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.photoThumb, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="image" size={16} color={colors.mutedForeground} />
                  </View>
                )}
                <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 4 }}>{p.date}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Personal Records */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Records</Text>
        {!loading && prs.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.muted, borderColor: colors.border, alignItems: "center", paddingVertical: 20 }]}>
            <Feather name="award" size={22} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 8 }}>Log a lift to start setting PRs</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}>
            {prs.map((pr, i) => (
              <View
                key={pr.id}
                style={[styles.prRow, { borderBottomColor: colors.border, borderBottomWidth: i < prs.length - 1 ? 1 : 0 }]}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground, flex: 1 }}>{pr.exerciseName}</Text>
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.primary }}>{pr.weightLbs} lb x {pr.reps}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, opacity: 0.7 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: "3.5%", rowGap: 12 },
  photoThumb: { width: "100%", aspectRatio: 3 / 4, borderRadius: 10 },
  prRow: { flexDirection: "row", alignItems: "center", padding: 14 },
});
