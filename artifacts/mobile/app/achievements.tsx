import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth as useClerkAuth } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type AchievementsResponse = {
  streak: { weeks: number; milestones: { weeks: number; key: string; label: string; earned: boolean }[] };
  earlyBird: { earned: boolean; key: string; label: string; description: string };
  nightOwl: { earned: boolean; key: string; label: string; description: string };
  socialButterfly: { count: number; target: number; earned: boolean; key: string; label: string; description: string };
  prCrusher: { count: number; earned: boolean; key: string; label: string; description: string };
};

function Badge({ icon, label, description, earned, progress, colors }: {
  icon: string;
  label: string;
  description: string;
  earned: boolean;
  progress?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.badgeCard,
        { backgroundColor: colors.card, borderColor: earned ? colors.primary : colors.border, opacity: earned ? 1 : 0.65 },
      ]}
    >
      <View style={[styles.badgeIconWrap, { backgroundColor: earned ? colors.primary + "22" : colors.muted }]}>
        <Feather name={icon as any} size={22} color={earned ? colors.primary : colors.mutedForeground} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground }}>{label}</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>{description}</Text>
        {progress ? (
          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: earned ? colors.primary : colors.mutedForeground, marginTop: 4 }}>
            {progress}
          </Text>
        ) : null}
      </View>
      {earned ? <Feather name="check-circle" size={20} color={colors.primary} /> : <Feather name="lock" size={16} color={colors.mutedForeground} />}
    </View>
  );
}

export default function AchievementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useClerkAuth();
  const { state } = useApp();
  const { userProfile } = state;

  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/achievements/${userProfile.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      setError("Could not load achievements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userProfile.id]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const earnedCount = data
    ? data.streak.milestones.filter((m) => m.earned).length +
      (data.earlyBird.earned ? 1 : 0) +
      (data.nightOwl.earned ? 1 : 0) +
      (data.socialButterfly.earned ? 1 : 0) +
      (data.prCrusher.earned ? 1 : 0)
    : 0;
  const totalCount = data ? data.streak.milestones.length + 4 : 0;

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
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Achievements</Text>
          <View style={{ width: 36 }} />
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{error}</Text>
            <Pressable onPress={load} style={[styles.retryBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Retry</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 18 }}>
              {earnedCount} of {totalCount} unlocked
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Streak Milestones</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              {data.streak.milestones.map((m) => (
                <Badge
                  key={m.key}
                  icon="zap"
                  label={m.label}
                  description={`${m.weeks} week${m.weeks > 1 ? "s" : ""} of scheduled workouts completed`}
                  earned={m.earned}
                  progress={`${Math.min(data.streak.weeks, m.weeks)}/${m.weeks} weeks`}
                  colors={colors}
                />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Habits</Text>
            <View style={{ gap: 10, marginBottom: 20 }}>
              <Badge icon="sunrise" label={data.earlyBird.label} description={data.earlyBird.description} earned={data.earlyBird.earned} colors={colors} />
              <Badge icon="moon" label={data.nightOwl.label} description={data.nightOwl.description} earned={data.nightOwl.earned} colors={colors} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Social & Strength</Text>
            <View style={{ gap: 10 }}>
              <Badge
                icon="send"
                label={data.socialButterfly.label}
                description={data.socialButterfly.description}
                earned={data.socialButterfly.earned}
                progress={`${data.socialButterfly.count}/${data.socialButterfly.target} challenges sent`}
                colors={colors}
              />
              <Badge
                icon="award"
                label={data.prCrusher.label}
                description={data.prCrusher.description}
                earned={data.prCrusher.earned}
                progress={`${data.prCrusher.count} PR${data.prCrusher.count === 1 ? "" : "s"} set`}
                colors={colors}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10, opacity: 0.7 },
  badgeCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14 },
  badgeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  retryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
});
