---
name: expo-notifications web crash on app load
description: Uncaught error from ExpoNotifications.getLastNotificationResponse in app/_layout.tsx on web preview
---

The web preview (Expo web) throws an uncaught error on load: "The method or property ExpoNotifications.getLastNotificationResponse is not available on web" from the cold-start notification tap handler in `app/_layout.tsx`.

**Why:** `expo-notifications` doesn't implement this API on the web platform; the native module is simply missing on web, not a regression from any particular change.

**How to apply:** This is a pre-existing, platform-specific limitation unrelated to feature work. Don't treat it as a regression signal when screenshotting/testing the web preview — verify functionality via Android/iOS behavior or by checking workflow logs for the actual feature code paths instead. Fixing it (if ever needed) requires gating the `getLastNotificationResponseAsync()` call behind `Platform.OS !== "web"` in `_layout.tsx`.
