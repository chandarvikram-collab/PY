import { useSignIn, useSSO } from "@clerk/expo";
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

export default function SignInScreen() {
  useWarmUpBrowser();

  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";

  const handleGoogleSignIn = useCallback(async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive, signIn } = await startSSOFlow({
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
      } else if (signIn) {
        const verification = signIn.firstFactorVerification;
        const isTransferable = verification?.status === "transferable";
        const isConflict =
          signIn.status === "needs_identifier" ||
          isTransferable ||
          verification?.error?.code === "external_account_exists";

        if (isConflict) {
          const conflictEmail =
            (signIn.identifier as string | undefined) ??
            (signIn.supportedFirstFactors?.find(
              (f: any) => f.emailAddressId
            ) as any)?.emailAddress ??
            "";
          if (conflictEmail) setEmail(conflictEmail);
          setError(
            "This Google account's email is already registered with a password. " +
              "Sign in with your password below — once you're in, you can link Google from your account settings."
          );
        } else {
          setError("Google sign-in could not be completed. Please try again.");
        }
      }
    } catch (err: any) {
      const clerkErrors: any[] = err?.errors ?? [];
      const isConflict = clerkErrors.some(
        (e) =>
          e.code === "external_account_exists" ||
          e.code === "identifier_already_signed_in" ||
          e.code === "oauth_access_denied"
      );
      if (isConflict) {
        setError(
          "This Google account's email is already registered with a password. " +
            "Sign in with your password below — once you're in, you can link Google from your account settings."
        );
      } else {
        setError(err?.errors?.[0]?.longMessage ?? err?.message ?? "Google sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

  const handleAppleSignIn = useCallback(async () => {
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

  const handleSignIn = async () => {
    if (!email || !password) return;
    setError("");
    try {
      const { error: signInError } = await signIn.password({ emailAddress: email, password });
      if (signInError) {
        setError(signInError.message ?? "Sign in failed");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl("/");
            if (url.startsWith("http")) {
              return;
            }
            router.replace("/");
          },
        });
      } else if (signIn.status === "needs_client_trust") {
        await signIn.mfa.sendEmailCode();
        setNeedsVerify(true);
      }
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
    }
  };

  const handleVerify = async () => {
    if (!verifyCode) return;
    setError("");
    try {
      await signIn.mfa.verifyEmailCode({ code: verifyCode });
      if (signIn.status === "complete") {
        await signIn.finalize({
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

  if (needsVerify) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      >
        <View style={styles.inner}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>IP</Text>
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>Enter the code we sent to {email}</Text>

          <TextInput
            style={styles.input}
            value={verifyCode}
            onChangeText={setVerifyCode}
            placeholder="Verification code"
            placeholderTextColor="#6b7280"
            keyboardType="number-pad"
            autoFocus
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, (!verifyCode || isLoading) && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={!verifyCode || isLoading}
          >
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
          </Pressable>

          <Pressable style={styles.linkBtn} onPress={() => setNeedsVerify(false)}>
            <Text style={styles.linkText}>← Back</Text>
          </Pressable>
        </View>
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
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to sync your data across devices</Text>

        <Pressable
          style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
          onPress={handleGoogleSignIn}
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
            onPress={handleAppleSignIn}
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
          autoComplete="password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.btn, (!email || !password || isLoading) && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={!email || !password || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up">
            <Text style={styles.linkText}>Sign up</Text>
          </Link>
        </View>
      </View>
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
