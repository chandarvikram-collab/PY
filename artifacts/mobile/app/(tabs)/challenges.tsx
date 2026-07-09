import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Challenge } from "@/context/AppContext";

const FREE_ACTIVE_CHALLENGE_LIMIT = 3;

const CHALLENGE_TYPES = [
  { id: "steps", label: "Steps", icon: "navigation", unit: "steps", defaultTarget: 10000 },
  { id: "distance", label: "Distance", icon: "map-pin", unit: "km", defaultTarget: 30 },
  { id: "lifting", label: "Lifting PR", icon: "trending-up", unit: "lbs", defaultTarget: 225 },
  { id: "streak", label: "Streak", icon: "zap-off", unit: "days", defaultTarget: 7 },
] as const;

function Avatar({ initials, color, size = 34 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "33", borderWidth: 1.5, borderColor: color + "66", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color, fontSize: size * 0.35, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const colors = useColors();
  const typeInfo = CHALLENGE_TYPES.find((t) => t.id === challenge.type);
  const pct = Math.min(100, (challenge.myProgress / challenge.target) * 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: challenge.status === "active" ? colors.border : colors.primary + "55" }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: colors.primary + "22" }]}>
          <Feather name={(typeInfo?.icon ?? "zap") as any} size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{challenge.title}</Text>
          {challenge.fromName ? (
            <Text style={[styles.cardFrom, { color: colors.mutedForeground }]}>
              Challenged by {challenge.fromName}
            </Text>
          ) : (
            <Text style={[styles.cardFrom, { color: colors.mutedForeground }]}>Self challenge</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: challenge.status === "active" ? "#22c55e22" : colors.primary + "22" }]}>
          <Text style={[styles.statusText, { color: challenge.status === "active" ? "#22c55e" : colors.primary }]}>
            {challenge.status === "active" ? "Active" : "Pending"}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 12 }}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressCurrent, { color: colors.foreground }]}>
            {challenge.myProgress.toLocaleString()} {challenge.unit}
          </Text>
          <Text style={[styles.progressTarget, { color: colors.mutedForeground }]}>
            {challenge.target.toLocaleString()} {challenge.unit}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${pct}%` as any }]} />
        </View>
        <Text style={[styles.pctLabel, { color: colors.mutedForeground }]}>{Math.round(pct)}% complete</Text>
      </View>

      {/* Participants */}
      {challenge.participants.length > 1 && (
        <View style={[styles.participantsRow, { borderTopColor: colors.border }]}>
          {challenge.participants.map((p) => {
            const pPct = Math.min(100, (p.progress / p.target) * 100);
            return (
              <View key={p.id} style={styles.participant}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Avatar initials={p.id === "me" ? "ME" : p.initials} color={p.id === "me" ? "#E8151B" : p.color} size={24} />
                  <Text style={[styles.participantName, { color: colors.foreground }]}>
                    {p.id === "me" ? "You" : p.name}
                  </Text>
                </View>
                <View style={[styles.miniBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.miniFill, { backgroundColor: p.id === "me" ? "#E8151B" : p.color, width: `${pPct}%` as any }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={[styles.deadline, { color: colors.mutedForeground }]}>
        Ends {challenge.deadline}
      </Text>
    </View>
  );
}

export default function ChallengesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, sendChallenge, isPremium } = useApp();
  const { challenges, friends } = state;
  const [showNew, setShowNew] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"steps" | "distance" | "lifting" | "streak">("steps");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [targetStr, setTargetStr] = useState("");
  const [titleStr, setTitleStr] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const active = challenges.filter((c) => c.status === "active");
  const pending = challenges.filter((c) => c.status === "pending");

  function toggleFriendSelection(friendId: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleSend() {
    const typeInfo = CHALLENGE_TYPES.find((t) => t.id === selectedType)!;
    const target = parseFloat(targetStr) || typeInfo.defaultTarget;
    const selectedFriends = friends.filter((f) => selectedFriendIds.includes(f.id));

    const deadline = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    })();
    const createdAt = new Date().toISOString().split("T")[0];
    const title = titleStr.trim() || `${typeInfo.label} Challenge`;

    // Send one challenge per selected friend so each gets their own invite,
    // while showing a single combined card locally.
    const recipients = selectedFriends.length > 0 ? selectedFriends : [null];
    recipients.forEach((friend) => {
      const newChallenge: Challenge = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        type: selectedType,
        title,
        description: "",
        fromId: null,
        fromName: null,
        participants: [
          { id: "me", name: "You", initials: "ME", color: "#E8151B", progress: 0, target },
          ...(friend ? [{ id: friend.id, name: friend.name, initials: friend.initials, color: friend.color, progress: 0, target }] : []),
        ],
        myProgress: 0,
        target,
        unit: typeInfo.unit,
        deadline,
        status: "active",
        createdAt,
      };
      sendChallenge(newChallenge);
    });

    setShowNew(false);
    setSelectedFriendIds([]);
    setTargetStr("");
    setTitleStr("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: insets.bottom + 90, paddingHorizontal: 18 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>COMPETE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Challenges</Text>
          </View>
          <Pressable
            onPress={() => {
              if (!isPremium && active.length >= FREE_ACTIVE_CHALLENGE_LIMIT) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setLimitError(`Free plan allows up to ${FREE_ACTIVE_CHALLENGE_LIMIT} active challenges. Upgrade for unlimited.`);
                return;
              }
              setLimitError(null);
              setShowNew(true);
            }}
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.newBtnText}>Send Challenge</Text>
          </Pressable>
        </View>

        {limitError && (
          <Pressable
            onPress={() => router.push("/upgrade" as any)}
            style={[styles.limitBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
          >
            <Feather name="lock" size={16} color={colors.primary} />
            <Text style={[styles.limitBannerText, { color: colors.primary }]}>{limitError} Tap to upgrade.</Text>
          </Pressable>
        )}

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{active.length}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Active</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{challenges.filter((c) => c.status === "completed").length}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Completed</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: colors.foreground }]}>{friends.length}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Friends</Text>
          </View>
        </View>

        {active.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Challenges</Text>
            {active.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
          </View>
        )}

        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pending</Text>
            {pending.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
          </View>
        )}

        {/* Challenge Types Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Challenge Types</Text>
          <View style={styles.typesGrid}>
            {CHALLENGE_TYPES.map((t) => (
              <View key={t.id} style={[styles.typeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.typeIconWrap, { backgroundColor: colors.primary + "22" }]}>
                  <Feather name={t.icon as any} size={20} color={colors.primary} />
                </View>
                <Text style={[styles.typeLabel, { color: colors.foreground }]}>{t.label}</Text>
                <Text style={[styles.typeUnit, { color: colors.mutedForeground }]}>Track {t.unit}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* New Challenge Sheet */}
      {showNew && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: "flex-end", zIndex: 100 }]}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => setShowNew(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, height: "50%", paddingBottom: insets.bottom + 12 },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>New Challenge</Text>
              <Pressable onPress={() => setShowNew(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Challenge Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {CHALLENGE_TYPES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedType(t.id)}
                    style={[
                      styles.typeChip,
                      { backgroundColor: selectedType === t.id ? colors.primary : colors.muted, borderColor: selectedType === t.id ? colors.primary : colors.border },
                    ]}
                  >
                    <Feather name={t.icon as any} size={14} color={selectedType === t.id ? "#fff" : colors.mutedForeground} />
                    <Text style={[styles.typeChipText, { color: selectedType === t.id ? "#fff" : colors.mutedForeground }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>Title (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, marginBottom: 14 }]}
              value={titleStr}
              onChangeText={setTitleStr}
              placeholder={`${CHALLENGE_TYPES.find((t) => t.id === selectedType)?.label} Challenge`}
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>
              Target ({CHALLENGE_TYPES.find((t) => t.id === selectedType)?.unit})
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, marginBottom: 14 }]}
              value={targetStr}
              onChangeText={setTargetStr}
              placeholder={String(CHALLENGE_TYPES.find((t) => t.id === selectedType)?.defaultTarget)}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>
              Challenge Friends{selectedFriendIds.length > 0 ? ` (${selectedFriendIds.length} selected)` : ""}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {friends.map((f) => {
                  const isSelected = selectedFriendIds.includes(f.id);
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => toggleFriendSelection(f.id)}
                      style={[
                        styles.friendChip,
                        { backgroundColor: isSelected ? f.color + "33" : colors.muted, borderColor: isSelected ? f.color : colors.border },
                      ]}
                    >
                      <Avatar initials={f.initials} color={f.color} size={28} />
                      <Text style={[styles.friendChipName, { color: isSelected ? f.color : colors.mutedForeground }]}>
                        {f.name.split(" ")[0]}
                      </Text>
                      {isSelected && <Feather name="check-circle" size={14} color={f.color} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSend}
              style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="zap" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>
                {selectedFriendIds.length > 1 ? `Send to ${selectedFriendIds.length} Friends` : "Send Challenge"}
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 },
  eyebrow: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  newBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  limitBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  limitBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 22, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 32 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardFrom: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressCurrent: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressTarget: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: "100%", borderRadius: 3 },
  pctLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  participantsRow: { borderTopWidth: 1, marginTop: 12, paddingTop: 12, flexDirection: "row", gap: 14 },
  participant: { flex: 1 },
  participantName: { fontSize: 12, fontFamily: "Inter_500Medium" },
  miniBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 2 },
  deadline: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8 },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: { width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 8 },
  typeIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typeUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(120,120,120,0.4)", alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  friendChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  friendChipName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  sendBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
