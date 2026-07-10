import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth as useClerkAuth } from "@clerk/expo";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: danger ? "#ef444422" : colors.muted }]}>
        <Feather name={icon as any} size={18} color={danger ? "#ef4444" : colors.mutedForeground} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? "#ef4444" : colors.foreground }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateProfile, signOutAndClear } = useApp();
  const { userProfile } = state;
  const { isAuthenticated } = useAuth();
  const { getToken } = useClerkAuth();

  const [showEditUsername, setShowEditUsername] = useState(false);
  const [draftUsername, setDraftUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function openEditUsername() {
    setDraftUsername(userProfile.username);
    setUsernameError(null);
    setShowEditUsername(true);
  }

  async function saveUsername() {
    const next = draftUsername.trim().toLowerCase();
    if (next === userProfile.username) {
      setShowEditUsername(false);
      return;
    }
    if (next.length < 3 || next.length > 24 || !/^[a-z0-9_.]+$/.test(next)) {
      setUsernameError("3-24 chars: lowercase letters, numbers, _ or . only");
      return;
    }
    setUsernameSaving(true);
    setUsernameError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/users/${userProfile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username: next }),
      });
      if (res.status === 409) {
        setUsernameError("That username is already taken");
        return;
      }
      if (!res.ok) {
        setUsernameError("Could not update username. Please try again.");
        return;
      }
      updateProfile({ username: next });
      setShowEditUsername(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setUsernameError("Could not update username. Please try again.");
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutAndClear();
    } finally {
      setSigningOut(false);
      router.replace("/(auth)/sign-in");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isAuthenticated && (
            <SettingsRow icon="at-sign" label="Username" value={`@${userProfile.username}`} onPress={openEditUsername} />
          )}
          <SettingsRow icon="refresh-cw" label="Recalculate Targets" onPress={() => router.push("/onboarding")} />
          {isAuthenticated && (
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.row, { borderBottomWidth: 0, opacity: pressed || signingOut ? 0.7 : 1 }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#ef444422" }]}>
                {signingOut ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Feather name="log-out" size={18} color="#ef4444" />
                )}
              </View>
              <Text style={[styles.rowLabel, { color: "#ef4444" }]}>Log Out</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showEditUsername}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!usernameSaving) setShowEditUsername(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Pressable style={styles.sheetOverlay} onPress={() => { if (!usernameSaving) setShowEditUsername(false); }} />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Username</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginRight: 2 }}>@</Text>
              <TextInput
                style={[styles.input, { flex: 1, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
                value={draftUsername}
                onChangeText={(t) => { setDraftUsername(t.toLowerCase()); setUsernameError(null); }}
                placeholder="username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={24}
              />
            </View>
            {usernameError ? (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "#ef4444", marginTop: 8 }}>{usernameError}</Text>
            ) : (
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 8 }}>
                Usernames must be unique across IronPace.
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable
                onPress={() => setShowEditUsername(false)}
                disabled={usernameSaving}
                style={[styles.pillBtn, { flex: 1, justifyContent: "center", backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveUsername}
                disabled={usernameSaving}
                style={[styles.pillBtn, { flex: 1, justifyContent: "center", backgroundColor: colors.primary, borderColor: colors.primary, opacity: usernameSaving ? 0.7 : 1 }]}
              >
                {usernameSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginRight: 8 },
  sheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: "Inter_400Regular" },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
});
