import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@clerk/expo";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/context/AppContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

function FollowButton({ userId, isFollowing, onFollow, onUnfollow }: {
  userId: string;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        isFollowing ? onUnfollow() : onFollow();
      }}
      style={[{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 4,
        borderColor: isFollowing ? colors.border : colors.primary,
        backgroundColor: isFollowing ? "transparent" : colors.primary + "15",
      }]}
    >
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: isFollowing ? colors.mutedForeground : colors.primary }}>
        {isFollowing ? "Following" : "Follow"}
      </Text>
    </Pressable>
  );
}

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

  const mediaServingUrl = post.mediaUrl ?? null;

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

      {/* Media: photo or video thumbnail */}
      {mediaServingUrl && post.mediaType === "photo" && (
        <Image
          source={{ uri: mediaServingUrl }}
          style={styles.postMedia}
          resizeMode="cover"
        />
      )}
      {mediaServingUrl && post.mediaType === "video" && (
        <View style={[styles.postMedia, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
          {post.thumbnailUrl ? (
            <Image source={{ uri: post.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={[styles.playOverlay, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
            <Feather name="play" size={28} color="#fff" />
          </View>
        </View>
      )}

      <Text style={[styles.postContent, { color: colors.foreground }]}>{post.content}</Text>

      {/* Linked workout badge */}
      {post.workoutSnapshot && Object.keys(post.workoutSnapshot).length > 0 && (
        <View style={[styles.workoutBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Feather name="zap" size={12} color={colors.primary} />
          <Text style={[styles.workoutBadgeText, { color: colors.primary }]}>
            {Object.entries(post.workoutSnapshot).map(([k, v]) => `${k}: ${v}`).join(" · ")}
          </Text>
        </View>
      )}

      {post.stats && Object.keys(post.stats).length > 0 && (
        <View style={[styles.statsGrid, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          {Object.entries(post.stats).map(([key, val]) => (
            <View key={key} style={[styles.statItem, { borderRightColor: colors.border }]}>
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

type ComposerStep = "pick-type" | "pick-media" | "caption";

export default function SocialScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { state, likePost, addPost, followUser, unfollowUser } = useApp();
  const { posts, friends, followingIds, userProfile, workoutHistory } = state;
  const [tab, setTab] = useState<"feed" | "explore">("feed");
  const [composing, setComposing] = useState(false);
  const [composerStep, setComposerStep] = useState<ComposerStep>("pick-type");
  const [draftText, setDraftText] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState<"photo" | "video" | "text">("text");
  const [pickedMedia, setPickedMedia] = useState<{ uri: string; contentType: string; name: string; thumbnailUri?: string } | null>(null);
  const [linkedWorkout, setLinkedWorkout] = useState<typeof workoutHistory[0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  function openComposer() {
    setComposerStep("pick-type");
    setDraftText("");
    setSelectedMediaType("text");
    setPickedMedia(null);
    setLinkedWorkout(null);
    setUploadError(null);
    setComposing(true);
  }

  function closeComposer() {
    setComposing(false);
    setPickedMedia(null);
    setDraftText("");
    setUploadError(null);
  }

  async function pickImage(mediaType: "photo" | "video") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setUploadError("Permission to access photos is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === "photo"
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const ext = (asset.uri.split(".").pop() ?? "jpg").toLowerCase();
    const contentType = mediaType === "video"
      ? (ext === "mov" ? "video/quicktime" : "video/mp4")
      : "image/jpeg";

    let thumbnailUri: string | undefined;
    if (mediaType === "video") {
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, { time: 0 });
        thumbnailUri = thumb.uri;
      } catch {}
    }
    setPickedMedia({ uri: asset.uri, contentType, name: `upload.${ext}`, thumbnailUri });
    setComposerStep("caption");
  }

  async function requestUploadUrl(name: string, size: number, contentType: string): Promise<{ uploadURL: string; objectPath: string }> {
    const token = await getToken();
    const r = await fetch(`${API_BASE}/api/posts/upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, size, contentType }),
    });
    if (!r.ok) throw new Error("Failed to get upload URL");
    return r.json();
  }

  async function uploadMedia(media: { uri: string; contentType: string; name: string }): Promise<string> {
    const token = await getToken();
    const formData = new FormData();
    formData.append("file", { uri: media.uri, type: media.contentType, name: media.name } as unknown as Blob);
    const r = await fetch(`${API_BASE}/api/posts/upload`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!r.ok) throw new Error("Upload failed");
    const json = await r.json() as { url: string };
    return json.url;
  }

  async function submitPost() {
    if (!draftText.trim()) return;
    setUploadError(null);
    setUploading(true);

    let mediaUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    try {
      if (pickedMedia) {
        mediaUrl = await uploadMedia(pickedMedia);
        if (pickedMedia.thumbnailUri) {
          thumbnailUrl = await uploadMedia({
            uri: pickedMedia.thumbnailUri,
            contentType: "image/jpeg",
            name: "thumbnail.jpg",
          });
        }
      }
    } catch {
      setUploadError("Upload failed. Post will be shared without media.");
      mediaUrl = undefined;
      thumbnailUrl = undefined;
    } finally {
      setUploading(false);
    }

    const workoutSnap: Record<string, string> | undefined = linkedWorkout
      ? {
          name: linkedWorkout.name,
          volume: `${(linkedWorkout.volume / 1000).toFixed(1)}k lbs`,
          sets: `${linkedWorkout.exercises} exercises`,
        }
      : undefined;

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
      mediaUrl,
      mediaType: pickedMedia ? selectedMediaType : undefined,
      thumbnailUrl,
      workoutSnapshot: workoutSnap,
    });

    setDraftText("");
    setComposing(false);
    setPickedMedia(null);
    setLinkedWorkout(null);
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

  const recentWorkouts = workoutHistory.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community</Text>
          <Pressable
            onPress={openComposer}
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
            <View key={f.id} style={[styles.storyItem, { alignItems: "center" }]}>
              <View style={[styles.storyRing, { borderColor: followingIds.includes(f.id) ? f.color : colors.border }]}>
                <View style={[styles.storyAvatar, { backgroundColor: f.color + "33" }]}>
                  <Text style={[styles.storyInitials, { color: f.color }]}>{f.initials}</Text>
                </View>
              </View>
              <Text style={[styles.storyName, { color: colors.mutedForeground }]}>{f.name.split(" ")[0]}</Text>
              <FollowButton
                userId={f.id}
                isFollowing={followingIds.includes(f.id)}
                onFollow={() => followUser(f.id)}
                onUnfollow={() => unfollowUser(f.id)}
              />
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
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_500Medium" }}>
                Follow people to see their posts here
              </Text>
            </View>
          )}
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

      {/* Compose Flow */}
      {composing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end", zIndex: 100 }]}>
          <View style={[styles.composeSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>

            {/* Step 1: Pick media type */}
            {composerStep === "pick-type" && (
              <>
                <View style={styles.composeHeaderRow}>
                  <Text style={[styles.composeName, { color: colors.foreground, flex: 1 }]}>New Post</Text>
                  <Pressable onPress={closeComposer}>
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>
                <Text style={[styles.pickTypeLabel, { color: colors.mutedForeground }]}>Choose post type</Text>
                <View style={styles.mediaTypeRow}>
                  {([
                    { key: "photo", icon: "image", label: "Photo" },
                    { key: "video", icon: "film", label: "Video" },
                    { key: "text", icon: "edit-2", label: "Text" },
                  ] as const).map(({ key, icon, label }) => (
                    <Pressable
                      key={key}
                      onPress={async () => {
                        setSelectedMediaType(key);
                        if (key === "photo" || key === "video") {
                          setComposerStep("pick-media");
                          await pickImage(key);
                        } else {
                          setComposerStep("caption");
                        }
                      }}
                      style={[styles.mediaTypeBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
                    >
                      <Feather name={icon as any} size={24} color={colors.primary} />
                      <Text style={[styles.mediaTypeBtnLabel, { color: colors.foreground }]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Step 2: Picking media (loading state) */}
            {composerStep === "pick-media" && (
              <View style={{ alignItems: "center", padding: 40, gap: 16 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>Opening picker...</Text>
                <Pressable onPress={() => setComposerStep("pick-type")}>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Cancel</Text>
                </Pressable>
              </View>
            )}

            {/* Step 3: Caption + optional workout link */}
            {composerStep === "caption" && (
              <>
                <View style={styles.composeHeaderRow}>
                  <Pressable onPress={() => setComposerStep("pick-type")} style={{ marginRight: 10 }}>
                    <Feather name="chevron-left" size={22} color={colors.mutedForeground} />
                  </Pressable>
                  <Avatar
                    initials={userProfile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    color="#E8151B"
                    size={36}
                  />
                  <Text style={[styles.composeName, { color: colors.foreground }]}>{userProfile.name}</Text>
                  <Pressable onPress={closeComposer}>
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                {/* Media preview */}
                {pickedMedia && selectedMediaType === "photo" && (
                  <View style={{ position: "relative", marginBottom: 10 }}>
                    <Image source={{ uri: pickedMedia.uri }} style={styles.previewImage} resizeMode="cover" />
                    <Pressable
                      onPress={() => { setPickedMedia(null); }}
                      style={[styles.removeMedia, { backgroundColor: "rgba(0,0,0,0.6)" }]}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </Pressable>
                  </View>
                )}
                {pickedMedia && selectedMediaType === "video" && (
                  <View style={[styles.previewImage, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center", marginBottom: 10 }]}>
                    <Feather name="film" size={32} color={colors.mutedForeground} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6, fontFamily: "Inter_400Regular" }}>
                      Video selected
                    </Text>
                    <Pressable onPress={() => setPickedMedia(null)} style={{ position: "absolute", top: 8, right: 8 }}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                )}

                {uploadError && (
                  <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 }}>{uploadError}</Text>
                )}

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

                {/* Link a Workout (optional) */}
                {recentWorkouts.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6 }}>
                      Link a workout (optional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                      {recentWorkouts.map((w) => {
                        const selected = linkedWorkout?.id === w.id;
                        return (
                          <Pressable
                            key={w.id}
                            onPress={() => setLinkedWorkout(selected ? null : w)}
                            style={[styles.workoutChip, {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary + "18" : colors.muted,
                              marginHorizontal: 4,
                            }]}
                          >
                            <Feather name="zap" size={12} color={selected ? colors.primary : colors.mutedForeground} />
                            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: selected ? colors.primary : colors.foreground, marginLeft: 4 }}>
                              {w.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.composeFooter}>
                  <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{draftText.length}/280</Text>
                  {uploading ? (
                    <View style={[styles.postBtn, { backgroundColor: colors.border, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.postBtnText}>Uploading…</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={submitPost}
                      style={[styles.postBtn, { backgroundColor: draftText.trim() ? colors.primary : colors.border }]}
                    >
                      <Text style={styles.postBtnText}>Post</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
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
  postMedia: { width: "100%", height: 200, borderRadius: 10, marginBottom: 12, overflow: "hidden" },
  playOverlay: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  postContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 },
  workoutBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  workoutBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
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
  pickTypeLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 14 },
  mediaTypeRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  mediaTypeBtn: { flex: 1, alignItems: "center", paddingVertical: 20, borderRadius: 14, borderWidth: 1, gap: 8 },
  mediaTypeBtnLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  previewImage: { width: "100%", height: 180, borderRadius: 12, marginBottom: 4 },
  removeMedia: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  composeInput: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, minHeight: 80, textAlignVertical: "top" },
  workoutChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  composeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  charCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  postBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  postBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
});
