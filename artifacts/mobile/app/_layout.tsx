import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ClerkProvider, ClerkLoaded, useAuth as useClerkAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { useAuth } from "@/lib/auth";

import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
if (domain) setBaseUrl(`https://${domain}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

const AUTH_INITIALIZED_KEY = "ironpace_auth_initialized";

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9_]/g, "");
}

function NamePickerModal({ visible, onDone }: { visible: boolean; onDone: (name: string, username: string) => void }) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const usernameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName("");
      setUsername("");
    }
  }, [visible]);

  const handleNameChange = useCallback((v: string) => {
    setName(v);
    setUsername(slugify(v));
  }, []);

  const canSubmit = name.trim().length > 0 && username.length > 0;

  const handleDone = useCallback(() => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    onDone(name.trim(), username.trim() || slugify(name.trim()));
  }, [canSubmit, name, username, onDone]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalRoot}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
        <View style={[styles.modalInner, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>IronPace</Text>
          </View>

          <Text style={styles.heading}>What's your name?</Text>
          <Text style={styles.subheading}>
            This is how other IronPace athletes will see you.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Display name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Alex Jordan"
              placeholderTextColor="#6B6B68"
              autoCapitalize="words"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => usernameRef.current?.focus()}
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Username</Text>
            <View style={styles.inputRow}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                ref={usernameRef}
                style={[styles.input, styles.inputFlex]}
                value={username}
                onChangeText={setUsername}
                placeholder="alexjordan"
                placeholderTextColor="#6B6B68"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleDone}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, { opacity: pressed || !canSubmit ? 0.7 : 1 }]}
            onPress={handleDone}
            disabled={!canSubmit}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ClerkTokenSync() {
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  return null;
}

function FirstLoginHandler() {
  const { isAuthenticated, isLoading } = useAuth();
  const { resetForAuthUser, updateProfile } = useApp();
  const prevAuthRef = useRef<boolean | null>(null);
  const [showNamePicker, setShowNamePicker] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const prev = prevAuthRef.current;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated || prev === true) return;

    (async () => {
      const done = await AsyncStorage.getItem(AUTH_INITIALIZED_KEY);
      if (!done) {
        await resetForAuthUser();
        setShowNamePicker(true);
      }
    })();
  }, [isAuthenticated, isLoading, resetForAuthUser]);

  const handleNameDone = useCallback(
    (name: string, username: string) => {
      updateProfile({ name, username });
      AsyncStorage.setItem(AUTH_INITIALIZED_KEY, "1").catch(() => {});
      setShowNamePicker(false);
    },
    [updateProfile],
  );

  return <NamePickerModal visible={showNamePicker} onDone={handleNameDone} />;
}

function OnboardingGate() {
  const router = useRouter();
  const { state } = useApp();
  const { userProfile } = state;
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (hasNavigatedRef.current) return;
    // Wait for profile to load (non-anon user with missing nutrition data)
    if (!userProfile.id || userProfile.id.startsWith("anon-")) return;
    if (userProfile.biologicalSex) return;

    hasNavigatedRef.current = true;
    // Small delay to let the navigation stack settle
    const t = setTimeout(() => {
      router.push("/onboarding");
    }, 600);
    return () => clearTimeout(t);
  }, [userProfile.id, userProfile.biologicalSex, router]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="ai-plan"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="calories"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="chat"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="session"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="run-session"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="food-detail"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <ClerkTokenSync />
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <AppProvider>
                <FirstLoginHandler />
                <OnboardingGate />
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </AppProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "#0E0E0E",
  },
  modalInner: {
    flex: 1,
    paddingHorizontal: 28,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 48,
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8151B",
    marginRight: 8,
  },
  logoText: {
    color: "#F5F4F1",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  heading: {
    color: "#F5F4F1",
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
    lineHeight: 36,
  },
  subheading: {
    color: "#6B6B68",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginBottom: 40,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldLabel: {
    color: "#ADADA9",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A28",
  },
  atSign: {
    color: "#6B6B68",
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    paddingLeft: 16,
  },
  input: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2A2A28",
    color: "#F5F4F1",
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  cta: {
    backgroundColor: "#E8151B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  ctaText: {
    color: "#F5F4F1",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
});
