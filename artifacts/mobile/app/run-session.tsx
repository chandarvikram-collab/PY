import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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

import { useApp, ME_USER_ID } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { RunSession, RunSplit } from "@/context/AppContext";

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatPace(kmPerSec: number): string {
  if (kmPerSec <= 0) return "--:--";
  const secPerKm = 1 / kmPerSec;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const SIM_BASE = { lat: 37.7749, lng: -122.4194 };

function simNextCoord(elapsed: number, prev: { lat: number; lng: number }) {
  const bearing = (elapsed * 0.005) % (Math.PI * 2);
  const noise = (Math.random() - 0.5) * 0.00004;
  return {
    lat: prev.lat + Math.cos(bearing) * 0.000026 + noise,
    lng: prev.lng + Math.sin(bearing) * 0.000036 + noise,
  };
}

const CALS_PER_KM = 65;

function speak(text: string) {
  try { Speech.speak(text, { rate: 0.92, pitch: 1.0 }); } catch {}
}

function RouteMap({ coords }: { coords: Array<{ lat: number; lng: number }> }) {
  const colors = useColors();
  const W = Dimensions.get("window").width - 40;
  const H = 140;

  if (coords.length < 2) {
    return (
      <View style={[styles.routePlaceholder, { width: W, height: H, backgroundColor: colors.muted }]}>
        <Feather name="map-pin" size={28} color={colors.mutedForeground} />
        <Text style={[styles.routeLabel, { color: colors.mutedForeground }]}>Route will appear here</Text>
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
    <Svg width={W} height={H} style={{ borderRadius: 14, backgroundColor: colors.muted } as any}>
      <Polyline points={pts} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={first.x} cy={first.y} r={5} fill={colors.success} />
      <Circle cx={last.x} cy={last.y} r={7} fill={colors.primary} />
    </Svg>
  );
}

type Phase = "pre" | "running" | "paused" | "summary";

export default function RunSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addRunSession, addPost, state } = useApp();

  const [phase, setPhase] = useState<Phase>("pre");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coords, setCoords] = useState<Array<{ lat: number; lng: number }>>([]);
  const [splits, setSplits] = useState<RunSplit[]>([]);
  const [currentPace, setCurrentPace] = useState("--:--");
  const [bestPaceSec, setBestPaceSec] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationRef = useRef<Location.LocationSubscription | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCoordRef = useRef<{ lat: number; lng: number }>(SIM_BASE);
  const elapsedRef = useRef(0);
  const distanceRef = useRef(0);
  const lastSplitKmRef = useRef(0);
  const lastSplitElapsedRef = useRef(0);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const stopAll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (locationRef.current) locationRef.current.remove();
    if (simRef.current) clearInterval(simRef.current);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  const processCoord = useCallback((coord: { lat: number; lng: number }) => {
    const prev = prevCoordRef.current;
    const d = haversineKm(prev, coord);
    prevCoordRef.current = coord;

    distanceRef.current += d;
    const totalDist = distanceRef.current;

    setDistance(totalDist);
    setCoords((c) => [...c, coord]);

    if (d > 0) {
      setCurrentPace(formatPace(d / 2));
    }

    const newKm = Math.floor(totalDist);
    if (newKm > lastSplitKmRef.current && totalDist >= 1) {
      const splitElapsed = elapsedRef.current;
      const splitDuration = splitElapsed - lastSplitElapsedRef.current;
      const pace = formatPace(splitDuration > 0 ? 1 / splitDuration : 0);
      const splitData: RunSplit = { km: newKm, pace, elapsed: splitElapsed };
      setSplits((s) => [...s, splitData]);
      if (splitDuration > 0) {
        setBestPaceSec((best) => (best === null || splitDuration < best ? splitDuration : best));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speak(`${newKm} kilometer. Pace: ${pace} per kilometer.`);
      lastSplitKmRef.current = newKm;
      lastSplitElapsedRef.current = splitElapsed;
    }
  }, []);

  const startSimulation = useCallback(() => {
    prevCoordRef.current = { ...SIM_BASE };
    setCoords([{ ...SIM_BASE }]);
    simRef.current = setInterval(() => {
      const next = simNextCoord(elapsedRef.current, prevCoordRef.current);
      processCoord(next);
    }, 2000);
  }, [processCoord]);

  const startGPS = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return false;
      const loc = await Location.getCurrentPositionAsync({});
      const initial = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      prevCoordRef.current = initial;
      setCoords([initial]);
      locationRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5, timeInterval: 2000 },
        (l) => processCoord({ lat: l.coords.latitude, lng: l.coords.longitude })
      );
      return true;
    } catch {
      return false;
    }
  }, [processCoord]);

  const startRun = useCallback(async () => {
    setPhase("running");
    speak("Run started. Good luck!");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    let usingReal = false;
    if (Platform.OS !== "web") {
      usingReal = await startGPS();
    }
    if (!usingReal) startSimulation();

    timerRef.current = setInterval(() => {
      setElapsed((e) => { elapsedRef.current = e + 1; return e + 1; });
    }, 1000);
  }, [startGPS, startSimulation]);

  const pauseRun = useCallback(() => {
    setPhase("paused");
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
    speak("Run paused.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const resumeRun = useCallback(() => {
    setPhase("running");
    speak("Resuming run.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === "web" || !locationRef.current) startSimulation();
    timerRef.current = setInterval(() => {
      setElapsed((e) => { elapsedRef.current = e + 1; return e + 1; });
    }, 1000);
  }, [startSimulation]);

  const finishRun = useCallback(() => {
    stopAll();
    speak("Run complete. Well done!");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase("summary");
  }, [stopAll]);

  const saveRun = useCallback(() => {
    const dist = distanceRef.current;
    const dur = elapsedRef.current;
    const avgPace = dist > 0 && dur > 0 ? formatPace(dist / dur) : "--:--";
    const bestPace = bestPaceSec !== null ? formatPace(1 / bestPaceSec) : avgPace;

    const session: RunSession = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      type: "run",
      date: new Date().toISOString().split("T")[0],
      distance: Math.round(dist * 100) / 100,
      duration: dur,
      avgPace,
      bestPace,
      calories: Math.round(dist * CALS_PER_KM),
      splits,
      routeCoords: coords.slice(0, 300),
    };

    addRunSession(session);
    addPost({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: ME_USER_ID,
      userName: state.userProfile.name,
      userInitials: state.userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
      userColor: "#E8151B",
      type: "milestone",
      content: `Just completed a ${session.distance.toFixed(2)} km run in ${fmtTime(dur)}!`,
      likes: 0,
      comments: 0,
      liked: false,
      time: "Just now",
      stats: { Distance: `${session.distance.toFixed(2)} km`, Pace: `${avgPace} /km`, Calories: String(session.calories) },
    });

    router.back();
  }, [bestPaceSec, splits, coords, addRunSession, addPost, state.userProfile, router]);

  const avgPace = elapsed > 0 && distance > 0 ? formatPace(distance / elapsed) : "--:--";
  const calories = Math.round(distance * CALS_PER_KM);
  const nextKmProgress = Math.min(100, (distance % 1) * 100);

  if (phase === "pre") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.preHeader, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.preTitle, { color: colors.foreground }]}>Ready to Run</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 40 }}>
          <View style={[styles.preCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="navigation" size={40} color={colors.primary} />
            <Text style={[styles.preCardTitle, { color: colors.foreground }]}>GPS Running Tracker</Text>
            <Text style={[styles.preCardSub, { color: colors.mutedForeground }]}>
              {Platform.OS !== "web"
                ? "Uses your phone's GPS to track real-time distance and route."
                : "Web preview uses simulated GPS with realistic pace variance."}
            </Text>
          </View>

          <View style={styles.preTips}>
            {[
              "Live distance, pace, and calorie tracking",
              "Audio coaching cues at every kilometer",
              "Route map drawn as you run",
              "Haptic alerts at km milestones",
              "Splits logged per kilometer",
            ].map((tip) => (
              <View key={tip} style={styles.preTipRow}>
                <Feather name="check-circle" size={15} color={colors.success} />
                <Text style={[styles.preTipText, { color: colors.mutedForeground }]}>{tip}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={startRun}
            style={({ pressed }) => [styles.startBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="play" size={24} color="#fff" />
            <Text style={styles.startBtnText}>Start Run</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (phase === "summary") {
    const finalAvg = distanceRef.current > 0 && elapsedRef.current > 0 ? formatPace(distanceRef.current / elapsedRef.current) : "--:--";
    const finalBest = bestPaceSec !== null ? formatPace(1 / bestPaceSec) : finalAvg;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.summaryHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Run Complete</Text>
          <Text style={[styles.summaryDistance, { color: colors.primary }]}>{distance.toFixed(2)} km</Text>
          <Text style={[styles.summaryTime, { color: colors.foreground }]}>{fmtTime(elapsed)}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 20 }}>
          <RouteMap coords={coords} />

          <View style={[styles.statsGrid, { marginTop: 16 }]}>
            {[
              { label: "Avg Pace", value: `${finalAvg}/km` },
              { label: "Best Pace", value: `${finalBest}/km` },
              { label: "Calories", value: `${Math.round(distance * CALS_PER_KM)} kcal` },
              { label: "Splits", value: `${splits.length} km` },
            ].map((s) => (
              <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statBoxVal, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statBoxLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {splits.length > 0 && (
            <View style={[styles.splitsCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
              <Text style={[styles.splitsTitle, { color: colors.foreground }]}>Splits</Text>
              {splits.map((sp) => (
                <View key={sp.km} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.splitKm, { color: colors.mutedForeground }]}>km {sp.km}</Text>
                  <Text style={[styles.splitPace, { color: colors.foreground }]}>{sp.pace}/km</Text>
                  <Text style={[styles.splitTime, { color: colors.mutedForeground }]}>{fmtTime(sp.elapsed)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.summaryBtns}>
            <Pressable onPress={() => router.back()} style={[styles.discardBtn, { borderColor: colors.border }]}>
              <Text style={[styles.discardText, { color: colors.mutedForeground }]}>Discard</Text>
            </Pressable>
            <Pressable onPress={saveRun} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Feather name="save" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Run</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.runHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        {phase === "paused" && (
          <View style={[styles.pausedBadge, { backgroundColor: colors.warning + "22" }]}>
            <Text style={[styles.pausedText, { color: colors.warning }]}>PAUSED</Text>
          </View>
        )}
        <Text style={[styles.runTimer, { color: colors.foreground }]}>{fmtTime(elapsed)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.mainStatBlock}>
          <Text style={[styles.bigDistance, { color: colors.foreground }]}>{distance.toFixed(2)}</Text>
          <Text style={[styles.bigDistLabel, { color: colors.mutedForeground }]}>kilometers</Text>
        </View>

        <View style={[styles.kmProgressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.kmFill, { backgroundColor: colors.primary, width: `${nextKmProgress}%` as any }]} />
        </View>
        <Text style={[styles.kmNextText, { color: colors.mutedForeground }]}>
          {((1 - (distance % 1)) % 1).toFixed(2)} km to next split
        </Text>

        <View style={[styles.paceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.paceItem}>
            <Text style={[styles.paceVal, { color: colors.foreground }]}>{currentPace}</Text>
            <Text style={[styles.paceLbl, { color: colors.mutedForeground }]}>Current</Text>
          </View>
          <View style={[styles.paceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.paceItem}>
            <Text style={[styles.paceVal, { color: colors.foreground }]}>{avgPace}</Text>
            <Text style={[styles.paceLbl, { color: colors.mutedForeground }]}>Avg Pace</Text>
          </View>
          <View style={[styles.paceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.paceItem}>
            <Text style={[styles.paceVal, { color: colors.primary }]}>{calories}</Text>
            <Text style={[styles.paceLbl, { color: colors.mutedForeground }]}>kcal</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <RouteMap coords={coords} />
        </View>

        {splits.length > 0 && (
          <View style={[styles.splitsCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.splitsTitle, { color: colors.foreground }]}>Splits</Text>
            {splits.slice(-4).map((sp) => (
              <View key={sp.km} style={[styles.splitRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.splitKm, { color: colors.mutedForeground }]}>km {sp.km}</Text>
                <Text style={[styles.splitPace, { color: colors.foreground }]}>{sp.pace}/km</Text>
                <Text style={[styles.splitTime, { color: colors.mutedForeground }]}>{fmtTime(sp.elapsed)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.controls}>
          <Pressable
            onPress={phase === "running" ? pauseRun : resumeRun}
            style={({ pressed }) => [styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name={phase === "running" ? "pause" : "play"} size={22} color={colors.foreground} />
            <Text style={[styles.controlBtnText, { color: colors.foreground }]}>{phase === "running" ? "Pause" : "Resume"}</Text>
          </Pressable>
          <Pressable
            onPress={finishRun}
            style={({ pressed }) => [styles.finishRunBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
          >
            <Feather name="flag" size={22} color="#fff" />
            <Text style={styles.finishRunBtnText}>Finish</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  preHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 20 },
  preTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  preCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 14, marginBottom: 28 },
  preCardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  preCardSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  preTips: { gap: 14, marginBottom: 36 },
  preTipRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  preTipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, padding: 20, borderRadius: 18 },
  startBtnText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  runHeader: { alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  runTimer: { fontSize: 48, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  pausedBadge: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 8, marginBottom: 6 },
  pausedText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  mainStatBlock: { alignItems: "center", paddingVertical: 20 },
  bigDistance: { fontSize: 68, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  bigDistLabel: { fontSize: 15, fontFamily: "Inter_500Medium", marginTop: 4 },
  kmProgressTrack: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  kmFill: { height: 4, borderRadius: 2 },
  kmNextText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 16 },
  paceRow: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 18, alignItems: "center" },
  paceItem: { flex: 1, alignItems: "center", gap: 4 },
  paceVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  paceLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  paceDivider: { width: 1, height: 36 },
  routePlaceholder: { borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 },
  routeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  splitsCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  splitsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  splitRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  splitKm: { width: 50, fontSize: 13, fontFamily: "Inter_500Medium" },
  splitPace: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  splitTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  controls: { flexDirection: "row", gap: 12, marginTop: 20 },
  controlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, borderRadius: 16, borderWidth: 1 },
  controlBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  finishRunBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 18, borderRadius: 16 },
  finishRunBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  summaryHeader: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryDistance: { fontSize: 56, fontFamily: "Inter_700Bold", letterSpacing: -2 },
  summaryTime: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statBox: { width: "47%", padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statBoxVal: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statBoxLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  summaryBtns: { flexDirection: "row", gap: 12, marginTop: 24 },
  discardBtn: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center" },
  discardText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 16 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
