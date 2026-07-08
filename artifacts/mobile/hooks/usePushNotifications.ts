import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import { useApp } from "@/context/AppContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// Configure foreground notification behaviour once
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests push notification permissions on first call (not on app launch),
 * registers the Expo push token with the server, and sets up a foreground
 * notification listener. Safe to call multiple times — registration is
 * idempotent and guarded by a ref.
 */
export function usePushNotifications() {
  const { state } = useApp();
  const { getToken } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    const userId = state.userProfile.id;
    if (!userId || userId.startsWith("anon-")) return;

    registeredRef.current = true;

    (async () => {
      try {
        // Push notifications only work on physical devices
        if (!Device.isDevice) return;

        const existingPerms = await Notifications.getPermissionsAsync() as unknown as { granted: boolean };

        if (!existingPerms.granted) {
          const newPerms = await Notifications.requestPermissionsAsync() as unknown as { granted: boolean };
          if (!newPerms.granted) return;
        }

        // Android requires a notification channel
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "IronPace",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenData.data;

        const authToken = await getToken();

        // Register token with the server (authenticated)
        const res = await fetch(`${API_BASE}/api/users/${userId}/push-token`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({ expoPushToken }),
        });

        if (!res.ok) {
          console.warn("[PushNotifications] Failed to register token with server");
        }
      } catch (err) {
        // Never crash the app over push notification registration
        console.warn("[PushNotifications] Registration error:", err);
      }
    })();
  }, [state.userProfile.id]);
}
