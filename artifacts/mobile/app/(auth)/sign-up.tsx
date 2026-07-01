import { useSignUp, useAuth, useSSO } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignUpScreen() {
  useWarmUpBrowser();

  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";

  const handleGoogleSignUp = useCallback(async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) return;
            router.replace("/");
          },
        });
      }
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleAppleSignUp = useCallback(async () => {
    setError("");
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_apple",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) return;
            router.replace("/");
          },
        });
      }
    } catch (err: any) {
      setError(err?.message ?? "Apple sign-in failed");
    } finally {
      setAppleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleSignUp = async () => {
    if (!email || !password) return;
    setError("");
    try {
      const { error: signUpError } = await signUp.password({ emailAddress: email, password });
      if (signUpError) {
        setError(signUpError.message ?? "Sign up failed");
        return;
      }
      await signUp.verifications.sendEmailCode();
      setAwaitingVerification(true);
    } catch (err: any) {
      setError(err?.message ?? "Sign up failed");
    }
  };

  const handleVerify = async () => {
    if (!code) return;
    setError("");
    try {
      await signUp.verifications.verifyEmailCode({ code });
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              return;
            }
            router.replace("/");
          },
        });
      }
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    }
  };

  if (isSignedIn) {
    router.replace("/");
    return null;
  }

  if (awaitingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.inner}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>IP</Text>
          </View>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>

          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter code"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, (!code || isLoading) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!code || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Continue</Text>}
          </Pressable>

          <Pressable
            style={styles.linkBtn}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={styles.linkText}>Resend code</Text>
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => setAwaitingVerification(false)}>
            <Text style={[styles.linkText, { color: "#6b7280" }]}>← Back</Text>
          </Pressable>
        </View>
        <View nativeID="clerk-captcha" />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
    >
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoText}>IP</Text>
        </View>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Sign up so your workouts and progress follow you everywhere</Text>

        <Pressable
          style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
          onPress={handleGoogleSignUp}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#f9fafb" />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            style={[styles.appleBtn, appleLoading && styles.btnDisabled, { marginTop: 12 }]}
            onPress={handleAppleSignUp}
            disabled={appleLoading}
          >
            {appleLoading ? (
              <ActivityIndicator color="#09090b" />
            ) : (
              <>
                <Text style={styles.appleIcon}></Text>
                <Text style={styles.appleBtnText}>Continue with Apple</Text>
              </>
            )}
          </Pressable>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          secureTextEntry
          autoComplete="new-password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, (!email || !password || isLoading) && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={!email || !password || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in">
            <Text style={styles.linkText}>Sign in</Text>
          </Link>
        </View>
      </View>
      <View nativeID="clerk-captcha" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    alignSelf: "center",
  },
  logoText: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 28,
    color: "#f9fafb",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  googleIcon: {
    color: "#f9fafb",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  googleBtnText: {
    color: "#f9fafb",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  appleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  appleIcon: {
    color: "#09090b",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  appleBtnText: {
    color: "#09090b",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerText: {
    color: "#6b7280",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  label: {
    color: "#d1d5db",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f9fafb",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  error: {
    color: "#ef4444",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#6b7280",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  linkBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    color: "#3b82f6",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
