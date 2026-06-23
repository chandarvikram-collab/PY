import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function Avatar({ initials, color, size = 46, online = false }: { initials: string; color: string; size?: number; online?: boolean }) {
  return (
    <View style={{ position: "relative" }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "33", borderWidth: 2, borderColor: color + "66", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color, fontSize: size * 0.34, fontFamily: "Inter_700Bold" }}>{initials}</Text>
      </View>
      {online && (
        <View style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#0E0E0E" }} />
      )}
    </View>
  );
}

export default function ChatListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state } = useApp();
  const { chatThreads } = state;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const totalUnread = chatThreads.reduce((s, t) => s + t.unread, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{totalUnread} unread</Text>
          )}
        </View>
        <Pressable style={[styles.composeBtn, { backgroundColor: colors.primary }]}>
          <Feather name="edit" size={16} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={chatThreads}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: thread }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/chat/[id]", params: { id: thread.id } })}
            style={({ pressed }) => [
              styles.threadRow,
              { borderBottomColor: colors.border, backgroundColor: pressed ? colors.muted : "transparent" },
            ]}
          >
            <Avatar
              initials={thread.friendInitials}
              color={thread.friendColor}
              size={50}
              online={thread.isOnline}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={styles.threadTopRow}>
                <Text style={[styles.threadName, { color: colors.foreground }]}>{thread.friendName}</Text>
                <Text style={[styles.threadTime, { color: colors.mutedForeground }]}>{thread.lastTime}</Text>
              </View>
              <View style={styles.threadBottomRow}>
                <Text
                  style={[styles.threadLast, { color: thread.unread > 0 ? colors.foreground : colors.mutedForeground, fontFamily: thread.unread > 0 ? "Inter_600SemiBold" : "Inter_400Regular" }]}
                  numberOfLines={1}
                >
                  {thread.lastMessage}
                </Text>
                {thread.unread > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.unreadCount}>{thread.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="message-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No messages yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  composeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  threadRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  threadTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  threadName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  threadTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  threadBottomRow: { flexDirection: "row", alignItems: "center" },
  threadLast: { flex: 1, fontSize: 13, lineHeight: 18 },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  unreadCount: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
