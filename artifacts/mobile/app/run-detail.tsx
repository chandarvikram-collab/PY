import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, socialFetch } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { RunSession, RunSplit } from "@/context/AppContext";
import { calcRunCalories } from "@workspace/nutrition";

function fmtRunTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RouteMap({ coords, primaryColor }: { coords: Array<{ lat: number; lng: number }>; primaryColor: string }) {
  const W = Dimensions.get("window").width - 40;
  const H = 160;

  if (coords.length < 2) {
    return (
      <View style={[styles.mapPlaceholder, { width: W, height: H }]}>
        <Feather name="map-pin" size={28} color="#999" />
        <Text style={styles.mapPlaceholderText}>No route data</Text>
      </View>
    );
  }

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rangeX = maxLng - minLng || 0.001;
  const rangeY = maxLat - minLat || 0.001;
  const p = 16;

  const norm = (c: { lat: number; lng: number }) => ({
    x: ((c.lng - minLng) / rangeX) * (W - p * 2) + p,
    y: H - (((c.lat - minLat) / rangeY) * (H - p * 2) + p),
  });

  const pts = coords.map((c) => { const { x, y } = norm(c); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  const last = norm(coords[coords.length - 1]);
  const first = norm(coords[0]);

  return (
    <Svg width={W} height={H} style={{ borderRadius: 14, backgroundColor: "#1a1a1a" } as any}>
      <Polyline points={pts} stroke={primaryColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={first.x} cy={first.y} r={5} fill="#22c55e" />
      <Circle cx={last.x} cy={last.y} r={7} fill={primaryColor} />
    </Svg>
  );
}

export default function RunDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateRunSession } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session: RunSession | undefined = useMemo(() => {
    return state.runHistory.find((r) => r.id === id);
  }, [state.runHistory, id]);

  useEffect(() => {
    if (session || !id) return;
    setLoading(true);
    socialFetch(`/sessions/run/id/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((row: any) => {
        const rs: RunSession = {
          id: row.id,
          type: "run",
          date: row.date,
          distance: row.distanceKm ?? 0,
          duration: row.durationSeconds ?? 0,
          avgPace: row.avgPace ?? "",
          bestPace: row.bestPace ?? "",
          calories: row.calories ?? 0,
          splits: (row.splitsJson as RunSplit[]) ?? [],
          routeCoords: (row.routeCoordsJson as Array<{ lat: number; lng: number }>) ?? undefined,
        };
        updateRunSession(rs.id, rs);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [id, session, updateRunSession]);

  const weightKg = state.userProfile.weightKg ?? 75;

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
          {error ?? "Run not found"}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const metCalories = calcRunCalories(session.distance, session.duration, weightKg);

  return (
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Run · {session.date}</Text>
          <Text style={[styles.headerMeta, { color: colors.mutedForeground }]}>
            {fmtRunTime(session.duration)} · {session.avgPace}/km avg
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{session.distance.toFixed(2)}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>km</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{fmtRunTime(session.duration)}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>duration</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{session.avgPace}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>avg pace</Text>
          </View>
        </View>
        <View style={[styles.statRow, { marginTop: 18 }]}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{metCalories}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>calories (MET)</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{session.bestPace}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>best pace</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{session.splits.length}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>splits</Text>
          </View>
        </View>
      </View>

      {/* Route Map */}
      {session.routeCoords && session.routeCoords.length > 0 && (
        <View style={{ paddingHorizontal: 18, marginBottom: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Route</Text>
          <RouteMap coords={session.routeCoords} primaryColor={colors.primary} />
        </View>
      )}

      {/* Splits Table */}
      <View style={{ paddingHorizontal: 18, marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>Splits</Text>
        <View style={[styles.splitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.splitHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.splitHeaderText, { color: colors.mutedForeground }]}>KM</Text>
            <Text style={[styles.splitHeaderText, { color: colors.mutedForeground }]}>Pace</Text>
            <Text style={[styles.splitHeaderText, { color: colors.mutedForeground }]}>Time</Text>
          </View>
          {session.splits.map((split) => (
            <View key={split.km} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.splitCell, { color: colors.foreground }]}>{split.km}</Text>
              <Text style={[styles.splitCell, { color: colors.foreground }]}>{split.pace}</Text>
              <Text style={[styles.splitCell, { color: colors.foreground }]}>{fmtRunTime(split.elapsed)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsCard: { borderRadius: 16, borderWidth: 1, marginHorizontal: 18, padding: 18, marginBottom: 20 },
  statRow: { flexDirection: "row", alignItems: "center" },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 36 },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  mapPlaceholder: { borderRadius: 14, backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  mapPlaceholderText: { color: "#999", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
  splitsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  splitHeader: { flexDirection: "row", padding: 14, borderBottomWidth: 1, gap: 12 },
  splitHeaderText: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  splitRow: { flexDirection: "row", padding: 14, borderBottomWidth: 0.5, gap: 12 },
  splitCell: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
