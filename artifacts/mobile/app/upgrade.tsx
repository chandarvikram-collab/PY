import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { startPremiumCheckout } from "@/lib/stripe";

const PERKS = [
  { icon: "bar-chart-2", title: "Detailed Analytics", desc: "Volume trends, session insights & more" },
  { icon: "cpu", title: "Advanced AI Coaching", desc: "Higher-tier personalized training plans" },
  { icon: "target", title: "Unlimited Challenges", desc: "Join as many active challenges as you want" },
];

export default function UpgradeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPremium, premiumStatusLoading, refreshPremiumStatus } = useApp();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpgraded, setJustUpgraded] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  async function handleUpgrade() {
    setError(null);
    setCheckingOut(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await startPremiumCheckout();
      if (result.outcome === "success") {
        await refreshPremiumStatus();
        setJustUpgraded(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.outcome === "error") {
        setError(result.message);
      }
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>IronPace Premium</Text>
          <View style={{ width: 36 }} />
        </View>

        {premiumStatusLoading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isPremium || justUpgraded ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <View style={[styles.badgeCircle, { backgroundColor: colors.primary + "22" }]}>
              <Feather name="check" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.foreground, marginTop: 20 }]}>
              You're Premium
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: "center", marginTop: 8 }]}>
              Thanks for supporting IronPace. All premium features are unlocked.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={[styles.ctaBtn, { backgroundColor: colors.primary, marginTop: 28 }]}
            >
              <Text style={styles.ctaBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <View style={[styles.badgeCircle, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="star" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground, marginTop: 16 }]}>
                Go Premium
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: "center", marginTop: 6 }]}>
                $7.99/month · cancel anytime
              </Text>
            </View>

            <View style={styles.perksList}>
              {PERKS.map((p) => (
                <View key={p.title} style={[styles.perkCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <View style={[styles.perkIconWrap, { backgroundColor: colors.primary + "22" }]}>
                    <Feather name={p.icon as any} size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.perkTitle, { color: colors.foreground }]}>{p.title}</Text>
                    <Text style={[styles.perkDesc, { color: colors.mutedForeground }]}>{p.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {error ? (
              <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
            ) : null}

            <Pressable
              onPress={handleUpgrade}
              disabled={checkingOut}
              style={[styles.ctaBtn, { backgroundColor: colors.primary, opacity: checkingOut ? 0.7 : 1 }]}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaBtnText}>Upgrade for $7.99/mo</Text>
              )}
            </Pressable>

            <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
              Test mode: payment is processed via Stripe test cards only. No real charge will occur.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  badgeCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  perksList: { gap: 12, marginBottom: 24 },
  perkCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  perkIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  perkTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  perkDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  ctaBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 12, textAlign: "center" },
  disclaimer: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 14, lineHeight: 16 },
});
