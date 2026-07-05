import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

import { useAuth } from "@clerk/expo";

import { useRouter } from "expo-router";

import { useApp } from "@/context/AppContext";
import { ME_USER_ID } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import type { AppNotification, Comment, DiscoverUser, Friend, InviteStatus, Post, WorkoutInvite } from "@/context/AppContext";

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
        if (!isFollowing) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onFollow();
        }
      }}
      onLongPress={() => {
        if (isFollowing) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert("Unfollow", "Stop following this athlete?", [
            { text: "Cancel", style: "cancel" },
            { text: "Unfollow", style: "destructive", onPress: onUnfollow },
          ]);
        }
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

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function colorFromId(id: string): string {
  const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash * 31) + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── Comment Sheet ────────────────────────────────────────────────────────────

function CommentSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { fetchComments, addComment, deleteComment, state } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    setLoading(true);
    fetchComments(post.id)
      .then((c) => setComments(c))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [post.id]);

  async function submit() {
    if (!text.trim() || submitting) return;
    const optimisticContent = text.trim();
    const tempId = `temp-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      postId: post.id,
      userId: state.userProfile.id,
      userName: state.userProfile.name,
      userImageUrl: state.userProfile.imageUrl,
      content: optimisticContent,
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [...prev, tempComment]);
    setText("");
    setSubmitting(true);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);

    const result = await addComment(post.id, optimisticContent);
    if (result) {
      setComments((prev) => prev.map((c) => (c.id === tempId ? result : c)));
    } else {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setText(optimisticContent);
    }
    setSubmitting(false);
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
            {/* Handle bar */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Comments</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <FlatList
                ref={flatRef}
                data={comments}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 320 }}
                contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 }}
                ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
                ListEmptyComponent={() => (
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                      No comments yet. Be the first!
                    </Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const canDelete = item.userId === state.userProfile.id || post.userId === state.userProfile.id;
                  function handleLongPress() {
                    if (!canDelete) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert("Delete Comment", "Remove this comment?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          setComments((prev) => prev.filter((c) => c.id !== item.id));
                          const ok = await deleteComment(post.id, item.id);
                          if (!ok) {
                            setComments((prev) => {
                              if (prev.find((c) => c.id === item.id)) return prev;
                              const idx = prev.findIndex((c) => new Date(c.createdAt) > new Date(item.createdAt));
                              const next = [...prev];
                              if (idx === -1) next.push(item);
                              else next.splice(idx, 0, item);
                              return next;
                            });
                          }
                        },
                      },
                    ]);
                  }
                  return (
                    <Pressable onLongPress={handleLongPress} delayLongPress={400}>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Avatar initials={initials(item.userName)} color={colorFromId(item.userId)} size={32} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: colors.foreground }}>
                              {item.userName}
                            </Text>
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground }}>
                              {relativeTime(new Date(item.createdAt))}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, lineHeight: 20, marginTop: 2 }}>
                            {item.content}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            {/* Input bar */}
            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
              <Avatar
                initials={initials(state.userProfile.name)}
                color="#E8151B"
                size={30}
              />
              <TextInput
                style={[styles.commentInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={text}
                onChangeText={setText}
                placeholder="Add a comment…"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="send"
                onSubmitEditing={submit}
                editable={!submitting}
              />
              <Pressable
                onPress={submit}
                disabled={!text.trim() || submitting}
                style={{ opacity: text.trim() && !submitting ? 1 : 0.4 }}
              >
                <Feather name="send" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Notification Panel ──────────────────────────────────────────────────────

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, markNotificationsRead } = useApp();
  const { notifications } = state;

  useEffect(() => {
    markNotificationsRead().catch(() => {});
  }, []);

  function notifBody(n: AppNotification): string {
    if (n.type === "like") return "liked your post";
    if (n.type === "follow") return "started following you";
    if (n.type === "comment") {
      return n.commentText ? `commented: "${n.commentText}"` : "commented on your post";
    }
    if (n.type === "invite") return "invited you to a workout";
    if (n.type === "invite_response") return "responded to your invite";
    return "";
  }

  function notifIcon(n: AppNotification): { name: string; color: string } {
    if (n.type === "like") return { name: "heart", color: colors.primary };
    if (n.type === "follow") return { name: "user-plus", color: "#3b82f6" };
    if (n.type === "invite" || n.type === "invite_response") return { name: "calendar", color: "#f59e0b" };
    return { name: "message-circle", color: "#22c55e" };
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8, maxHeight: "75%" }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Notifications</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {notifications.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 12 }}>
              <Feather name="bell" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>
                No notifications yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.id}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />}
              renderItem={({ item }) => {
                const icon = notifIcon(item);
                return (
                  <View style={[styles.notifRow, { opacity: item.read ? 0.7 : 1 }]}>
                    <View style={[styles.notifIconWrap, { backgroundColor: icon.color + "20" }]}>
                      <Feather name={icon.name as any} size={16} color={icon.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.foreground, lineHeight: 18 }}>
                        <Text style={{ fontFamily: "Inter_600SemiBold" }}>{item.actorName}</Text>
                        {" "}{notifBody(item)}
                      </Text>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                        {relativeTime(new Date(item.createdAt))}
                      </Text>
                    </View>
                    {!item.read && (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Discover User Card ───────────────────────────────────────────────────────

function DiscoverUserCard({ user, isFollowing, onFollow, onUnfollow }: {
  user: DiscoverUser;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
}) {
  const colors = useColors();
  const userColor = colorFromId(user.id);
  const userInitials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const levelColor = user.sharedLevel ? colors.primary : colors.mutedForeground;

  return (
    <View style={[styles.discoverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Avatar initials={userInitials} color={userColor} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>{user.name}</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground }}>@{user.username}</Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 5, alignItems: "center", flexWrap: "wrap" }}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "22", borderColor: levelColor + "55" }]}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: levelColor }}>
              {user.sharedLevel ? "✓ " : ""}{user.level.charAt(0).toUpperCase() + user.level.slice(1)}
            </Text>
          </View>
          {user.sharedGoals.map((g) => (
            <View key={g} style={[styles.levelBadge, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.primary }}>🎯 {g}</Text>
            </View>
          ))}
          {user.sharedEquipment.map((e) => (
            <View key={e} style={[styles.levelBadge, { backgroundColor: colors.primary + "11", borderColor: colors.primary + "44" }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.primary }}>🏋️ {e}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            🔥 {user.streak}d streak
          </Text>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            💪 {user.totalWorkouts} workouts
          </Text>
        </View>
      </View>
      <FollowButton
        userId={user.id}
        isFollowing={isFollowing}
        onFollow={onFollow}
        onUnfollow={onUnfollow}
      />
    </View>
  );
}

// ─── Invite Composer ──────────────────────────────────────────────────────────

function InviteComposer({ friend, onClose, onSend }: {
  friend: Friend;
  onClose: () => void;
  onSend: (activity: string, location: string, date: string, time: string) => Promise<boolean>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activity, setActivity] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!activity.trim() || !date.trim() || sending) return;
    setSending(true);
    setError(null);
    const ok = await onSend(activity.trim(), location.trim(), date.trim(), time.trim());
    setSending(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } else {
      setError("Couldn't send invite. Try again.");
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, paddingHorizontal: 18 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Invite {friend.name.split(" ")[0]}</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Activity</Text>
            <TextInput
              style={[styles.inviteInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              value={activity}
              onChangeText={setActivity}
              placeholder="e.g. Leg day, 5k run..."
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Location</Text>
            <TextInput
              style={[styles.inviteInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Downtown Gym"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Date</Text>
                <TextInput
                  style={[styles.inviteInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  value={date}
                  onChangeText={setDate}
                  placeholder="e.g. Fri, Jul 10"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>Time</Text>
                <TextInput
                  style={[styles.inviteInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                  value={time}
                  onChangeText={setTime}
                  placeholder="e.g. 6:00 PM"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            {error && (
              <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 }}>{error}</Text>
            )}

            <Pressable
              onPress={submit}
              disabled={!activity.trim() || !date.trim() || sending}
              style={[styles.postBtn, {
                backgroundColor: activity.trim() && date.trim() ? colors.primary : colors.border,
                alignItems: "center",
                marginTop: 14,
              }]}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.postBtnText}>Send Invite</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── Friend Row ───────────────────────────────────────────────────────────────

function FriendRow({ friend, onMessage, onInvite }: {
  friend: Friend;
  onMessage: () => void;
  onInvite: () => void;
}) {
  const colors = useColors();
  return (
    <View style={[styles.discoverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Avatar initials={friend.initials} color={friend.color} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>{friend.name}</Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground }}>@{friend.username}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            🔥 {friend.streak}d streak
          </Text>
        </View>
      </View>
      <Pressable onPress={onInvite} style={[styles.friendActionBtn, { borderColor: colors.border }]}>
        <Feather name="calendar" size={16} color={colors.primary} />
      </Pressable>
      <Pressable onPress={onMessage} style={[styles.friendActionBtn, { borderColor: colors.border, marginLeft: 8 }]}>
        <Feather name="message-circle" size={16} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ─── Invite Row ───────────────────────────────────────────────────────────────

function InviteRow({ invite, isReceived, onRespond }: {
  invite: WorkoutInvite;
  isReceived: boolean;
  onRespond?: (status: Exclude<InviteStatus, "pending">) => void;
}) {
  const colors = useColors();
  const otherName = isReceived ? invite.senderName : invite.receiverName;
  const statusColor = invite.status === "accepted" ? "#22c55e" : invite.status === "declined" ? "#ef4444" : invite.status === "maybe" ? "#f59e0b" : colors.mutedForeground;

  return (
    <View style={[styles.discoverCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "flex-start" }]}>
      <Avatar initials={initials(otherName)} color={colorFromId(isReceived ? invite.senderId : invite.receiverId)} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.foreground }}>
          {invite.activity}
        </Text>
        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
          {isReceived ? `from ${otherName}` : `with ${otherName}`} · {invite.date}{invite.time ? ` at ${invite.time}` : ""}
        </Text>
        {invite.location ? (
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 1 }}>
            📍 {invite.location}
          </Text>
        ) : null}

        {isReceived && invite.status === "pending" && onRespond ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => onRespond("accepted")}
              style={[styles.inviteRespondBtn, { backgroundColor: "#22c55e" }]}
            >
              <Text style={styles.inviteRespondText}>Accept</Text>
            </Pressable>
            <Pressable
              onPress={() => onRespond("maybe")}
              style={[styles.inviteRespondBtn, { backgroundColor: "#f59e0b" }]}
            >
              <Text style={styles.inviteRespondText}>Maybe</Text>
            </Pressable>
            <Pressable
              onPress={() => onRespond("declined")}
              style={[styles.inviteRespondBtn, { backgroundColor: "#ef4444" }]}
            >
              <Text style={styles.inviteRespondText}>Decline</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.levelBadge, { backgroundColor: statusColor + "22", borderColor: statusColor + "55", marginTop: 8, alignSelf: "flex-start" }]}>
            <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: statusColor }}>
              {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onLike, onOpenComments }: { post: Post; onLike: () => void; onOpenComments: () => void }) {
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
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onOpenComments();
          }}
          style={styles.actionBtn}
        >
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
  const router = useRouter();
  const {
    state,
    likePost,
    addPost,
    followUser,
    unfollowUser,
    refreshNotifications,
    fetchDiscover,
    fetchInvites,
    fetchThreads,
    sendInvite,
    respondInvite,
  } = useApp();
  const { posts, friends, followingIds, userProfile, workoutHistory, notifications, workoutInvites } = state;
  const [tab, setTab] = useState<"feed" | "explore" | "friends">("feed");
  const [inviteTarget, setInviteTarget] = useState<Friend | null>(null);
  const [composing, setComposing] = useState(false);
  const [composerStep, setComposerStep] = useState<ComposerStep>("pick-type");
  const [draftText, setDraftText] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState<"photo" | "video" | "text">("text");
  const [pickedMedia, setPickedMedia] = useState<{ uri: string; contentType: string; name: string; thumbnailUri?: string } | null>(null);
  const [linkedWorkout, setLinkedWorkout] = useState<typeof workoutHistory[0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeCommentPost, setActiveCommentPost] = useState<Post | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  useFocusEffect(
    useCallback(() => {
      refreshNotifications().catch(() => {});
    }, [refreshNotifications]),
  );

  useEffect(() => {
    if (tab !== "explore") return;
    setDiscoverLoading(true);
    fetchDiscover(userProfile.level, userProfile.goals, userProfile.equipment)
      .then(setDiscoverUsers)
      .finally(() => setDiscoverLoading(false));
  }, [tab, userProfile.level, userProfile.goals, userProfile.equipment]);

  useEffect(() => {
    if (tab !== "friends") return;
    fetchInvites().catch(() => {});
    fetchThreads().catch(() => {});
  }, [tab]);

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

  const recentWorkouts = workoutHistory.slice(0, 5);

  const buddies = friends.filter((f) => followingIds.includes(f.id));
  const pendingInvites = workoutInvites.filter((i) => i.receiverId === ME_USER_ID && i.status === "pending");
  const upcomingInvites = workoutInvites.filter((i) => i.status === "accepted");

  const filteredDiscover = discoverQuery.trim()
    ? discoverUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(discoverQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(discoverQuery.toLowerCase()),
      )
    : discoverUsers;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            {/* Notification bell */}
            <Pressable
              onPress={() => setShowNotifications(true)}
              style={[styles.headerIconBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="bell" size={18} color={colors.foreground} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={openComposer}
              style={[styles.composeBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="edit-3" size={16} color="#fff" />
            </Pressable>
          </View>
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
          {(["feed", "explore", "friends"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
              <Text style={[styles.tabLabel, { color: tab === t ? colors.primary : colors.mutedForeground }]}>
                {t === "feed" ? "Following" : t === "explore" ? "Explore" : "Friends"}
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
            <PostCard
              post={item}
              onLike={() => likePost(item.id)}
              onOpenComments={() => setActiveCommentPost(item)}
            />
          )}
        />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Search bar */}
          <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6 }}>
            <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={{ flex: 1, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, marginLeft: 8 }}
                value={discoverQuery}
                onChangeText={setDiscoverQuery}
                placeholder="Search athletes..."
                placeholderTextColor={colors.mutedForeground}
              />
              {discoverQuery.length > 0 && (
                <Pressable onPress={() => setDiscoverQuery("")} hitSlop={8}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </View>

          {discoverLoading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredDiscover}
              keyExtractor={(u) => u.id}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: insets.bottom + 90 }}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                  <Feather name="users" size={40} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_500Medium" }}>
                    {discoverQuery ? "No athletes found" : "No suggestions yet"}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <DiscoverUserCard
                  user={item}
                  isFollowing={followingIds.includes(item.id)}
                  onFollow={() => followUser(item.id)}
                  onUnfollow={() => unfollowUser(item.id)}
                />
              )}
            />
          )}
        </View>
      )}

      {tab === "friends" && (
        <FlatList
          data={buddies}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 14 }}>
              {pendingInvites.length > 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>Invites</Text>
                  {pendingInvites.map((inv) => (
                    <View key={inv.id} style={{ marginBottom: 10 }}>
                      <InviteRow
                        invite={inv}
                        isReceived
                        onRespond={(status) => respondInvite(inv.id, status)}
                      />
                    </View>
                  ))}
                </View>
              )}
              {upcomingInvites.length > 0 && (
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>Upcoming</Text>
                  {upcomingInvites.map((inv) => (
                    <View key={inv.id} style={{ marginBottom: 10 }}>
                      <InviteRow invite={inv} isReceived={inv.receiverId === ME_USER_ID} />
                    </View>
                  ))}
                </View>
              )}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Buddies</Text>
            </View>
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontSize: 15, fontFamily: "Inter_500Medium" }}>
                Follow athletes to build your buddy list
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <FriendRow
              friend={item}
              onMessage={() => router.push({ pathname: "/chat/[id]", params: { id: item.id } })}
              onInvite={() => setInviteTarget(item)}
            />
          )}
        />
      )}

      {/* Invite Composer */}
      {inviteTarget && (
        <InviteComposer
          friend={inviteTarget}
          onClose={() => setInviteTarget(null)}
          onSend={(activity, location, date, time) => sendInvite(inviteTarget.id, activity, location, date, time)}
        />
      )}

      {/* Compose Flow */}
      {composing && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-start", paddingTop: insets.top + 20, zIndex: 100 }]}>
          <View style={[styles.composeSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20, maxHeight: "67%" }]}>

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

      {/* Comment Sheet */}
      {activeCommentPost && (
        <CommentSheet
          post={activeCommentPost}
          onClose={() => setActiveCommentPost(null)}
        />
      )}

      {/* Notification Panel */}
      {showNotifications && (
        <NotificationPanel onClose={() => setShowNotifications(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { borderBottomWidth: 1, paddingHorizontal: 0 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, marginBottom: 0 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: 0, right: 0, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
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
  searchBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  discoverCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
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
  // Sheet styles (comments + notifications)
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, marginBottom: 10 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  commentInputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  commentInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  notifRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 4 },
  notifIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  friendActionBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  inviteLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 12 },
  inviteInput: { fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  inviteRespondBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  inviteRespondText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff" },
});
