import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { ME_USER_ID } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function ChatDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, sendMessage, markThreadRead } = useApp();
  const [text, setText] = useState("");
  const flatRef = useRef<FlatList>(null);

  const thread = state.chatThreads.find((t) => t.id === id);

  useEffect(() => {
    if (id) markThreadRead(id);
  }, [id]);

  useEffect(() => {
    if (thread?.messages.length) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [thread?.messages.length]);

  function handleSend() {
    if (!text.trim() || !id) return;
    sendMessage(id, text.trim());
    setText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (!thread) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Thread not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 14 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[styles.avatarSmall, { backgroundColor: thread.friendColor + "33", borderColor: thread.friendColor + "66" }]}>
          <Text style={[styles.avatarSmallText, { color: thread.friendColor }]}>{thread.friendInitials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.friendName, { color: colors.foreground }]}>{thread.friendName}</Text>
          <Text style={[styles.onlineStatus, { color: thread.isOnline ? "#22c55e" : colors.mutedForeground }]}>
            {thread.isOnline ? "Online" : "Offline"}
          </Text>
        </View>
        <Pressable style={[styles.iconBtn, { borderColor: colors.border }]}>
          <Feather name="more-vertical" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={thread.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 14 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: msg, index }) => {
          const isMe = msg.senderId === ME_USER_ID;
          const prevMsg = index > 0 ? thread.messages[index - 1] : null;
          const showTime = !prevMsg || prevMsg.senderId !== msg.senderId;

          return (
            <View style={{ marginBottom: 4 }}>
              {showTime && (
                <Text style={[styles.timeLabel, { color: colors.mutedForeground, textAlign: isMe ? "right" : "left" }]}>
                  {msg.time}
                </Text>
              )}
              <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                <View
                  style={[
                    styles.bubble,
                    isMe
                      ? { backgroundColor: colors.primary, borderBottomRightRadius: 6 }
                      : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderBottomLeftRadius: 6 },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.border }]}
          >
            <Feather name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1 },
  avatarSmall: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarSmallText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  friendName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  onlineStatus: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginBottom: 4, marginTop: 8 },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 18, marginBottom: 2 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular", maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  notFound: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
