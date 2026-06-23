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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/context/AppContext";

function Avatar({ initials, color, size = 38 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + "33", borderWidth: 1.5, borderColor: color + "66", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color, fontSize: size * 0.35, fontFamily: "Inter_700Bold" }}>{initials}</Text>
    </View>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: () => void }) {
  const colors = useColors();

  const typeIcon = post.type === "workout"
    ? "activity"
    : post.type === "achievement"
    ? "award"
    : post.type === "challenge"
    ? "zap"
    : "trending-up";

  const typeColor = post.type === "workout"
    ? colors.primary
    : post.type === "achievement"
    ? "#f59e0b"
    : post.type === "challenge"
    ? "#3b82f6"
    : "#22c55e";

  return (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.postHeader}>
        <Avatar initials={post.userInitials} color={post.userColor} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.postUser, { color: colors.foreground }]}>{post.userName}</Text>
          <Text style={[styles.postTime, { color: colors.mutedForeground }]}>{post.time}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "22" }]}>
          <Feather name={typeIcon as any} size={12} color={typeColor} />
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>
            {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      {post.stats && Object.keys(post.stats).length > 0 && (
        <View style={[styles.statsGrid, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {Object.entries(post.stats).map(([key, val]) => (
            <View key={key} style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.foreground }]}>{val}</Text>
              <Text style={[styles.statKey, { color: colors.mutedForeground }]}>{key}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.postActions}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLike();
          }}
          style={styles.actionBtn}
        >
          <Feather
            name="heart"
            size={18}
            color={post.liked ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.actionCount, { color: post.liked ? colors.primary : colors.mutedForeground }]}>
            {post.likes}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Feather name="message-circle" size={18} color={colors.mutedForeground} />
          <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{post.comments}</Text>
        </Pressable>
        <Pressable style={styles.actionBtn}>
          <Feather name="share-2" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, likePost, addPost } = useApp();
  const { posts, friends, userProfile } = state;
  const [tab, setTab] = useState<"feed" | "explore">("feed");
  const [composing, setComposing] = useState(false);
  const [draftText, setDraftText] = useState("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  function submitPost() {
    if (!draftText.trim()) return;
    addPost({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      userId: "me",
      userName: userProfile.name,
      userInitials: userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
      userColor: "#E8151B",
      type: "workout",
      content: draftText.trim(),
      likes: 0,
      comments: 0,
      liked: false,
      time: "Just now",
      stats: {},
    });
    setDraftText("");
    setComposing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const EXPLORE_REELS = [
    { id: "e1", title: "5 min ab finisher", views: "42k", initials: "TF", color: "#8b5cf6" },
    { id: "e2", title: "Deadlift form check", views: "18k", initials: "LP", color: "#3b82f6" },
    { id: "e3", title: "Pre-workout routine", views: "31k", initials: "KM", color: "#22c55e" },
    { id: "e4", title: "PR attempt 405 lbs", views: "88k", initials: "RJ", color: "#f59e0b" },
    { id: "e5", title: "Morning mobility", views: "25k", initials: "AN", color: "#06b6d4" },
    { id: "e6", title: "Arm day superset", views: "14k", initials: "DS", color: "#ef4444" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community</Text>
          <Pressable
            onPress={() => setComposing(true)}
            style={[styles.composeBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-3" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Stories Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 10, gap: 14 }}>
          <View style={styles.storyItem}>
            <View style={[styles.storyRing, { borderColor: colors.primary }]}>
              <View style={[styles.storyAvatar, { backgroundColor: colors.primary + "33" }]}>
                <Text style={[styles.storyInitials, { color: colors.primary }]}>
                  {userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.storyName, { color: colors.mutedForeground }]}>You</Text>
          </View>
          {friends.map((f) => (
            <View key={f.id} style={styles.storyItem}>
              <View style={[styles.storyRing, { borderColor: f.color }]}>
                <View style={[styles.storyAvatar, { backgroundColor: f.color + "33" }]}>
                  <Text style={[styles.storyInitials, { color: f.color }]}>{f.initials}</Text>
                </View>
              </View>
              <Text style={[styles.storyName, { color: colors.mutedForeground }]}>{f.name.split(" ")[0]}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Tabs */}
        <View style={[styles.tabRow, { paddingHorizontal: 18 }]}>
          {(["feed", "explore"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                {t === "feed" ? "Following" : "Explore"}
              </Text>
              {tab === t && <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />}
            </Pressable>
          ))}
        </View>
      </View>

      {tab === "feed" ? (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <PostCard post={item} onLike={() => likePost(item.id)} />
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 14 }]}>
            Short-Form Content
          </Text>
          <View style={styles.reelsGrid}>
            {EXPLORE_REELS.map((reel) => (
              <Pressable
                key={reel.id}
                style={({ pressed }) => [
                  styles.reelCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.reelThumb, { backgroundColor: reel.color + "22" }]}>
                  <View style={[styles.reelAvatarMini, { backgroundColor: reel.color + "44" }]}>
                    <Text style={[styles.reelInitials, { color: reel.color }]}>{reel.initials}</Text>
                  </View>
                  <View style={[styles.playBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                    <Feather name="play" size={12} color="#fff" />
                  </View>
                </View>
                <View style={{ padding: 8 }}>
                  <Text style={[styles.reelTitle, { color: colors.foreground }]} numberOfLines={2}>{reel.title}</Text>
                  <Text style={[styles.reelViews, { color: colors.mutedForeground }]}>{reel.views} views</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Compose Modal */}
      {composing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.composeSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.composeHeaderRow}>
              <Avatar
                initials={userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                color="#E8151B"
                size={40}
              />
              <Text style={[styles.composeName, { color: colors.foreground }]}>{userProfile.name}</Text>
              <Pressable onPress={() => { setComposing(false); setDraftText(""); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.composeInput, { color: colors.foreground }]}
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Share your training moment..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              autoFocus
              maxLength={280}
            />
            <View style={styles.composeFooter}>
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{draftText.length}/280</Text>
              <Pressable
                onPress={submitPost}
                style={[styles.postBtn, { backgroundColor: draftText.trim() ? colors.primary : colors.border }]}
              >
                <Text style={styles.postBtnText}>Post</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { borderBottomWidth: 1, paddingHorizontal: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, marginBottom: 0 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  composeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  storiesScroll: {},
  storyItem: { alignItems: "center", gap: 5 },
  storyRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, padding: 2 },
  storyAvatar: { flex: 1, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  storyInitials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  storyName: { fontSize: 10, fontFamily: "Inter_500Medium" },
  tabRow: { flexDirection: "row", gap: 24, marginTop: 4 },
  tabBtn: { paddingBottom: 10, alignItems: "center" },
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  tabUnderline: { height: 2, width: "100%", borderRadius: 1, marginTop: 4 },
  postCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  postUser: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  postTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 },
  statsGrid: { flexDirection: "row", borderRadius: 10, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  statItem: { flex: 1, padding: 10, alignItems: "center", borderRightWidth: 1 },
  statVal: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statKey: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },
  postActions: { flexDirection: "row", gap: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  reelsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  reelCard: { width: "47%", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  reelThumb: { height: 120, alignItems: "center", justifyContent: "center" },
  reelAvatarMini: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  reelInitials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  playBadge: { position: "absolute", bottom: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  reelTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  reelViews: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  composeSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  composeHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  composeName: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  composeInput: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, minHeight: 100, textAlignVertical: "top" },
  composeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  charCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  postBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  postBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
