// app/(app)/(auth)/login.tsx

import { Button, Input } from "@/components/ui";
import { Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Image,
  ActivityIndicator,
} from "react-native";

const ASSET_MAP: Record<string, any> = {
  "./assets/images/icon.png": require("@/assets/images/icon.png"),
  "./assets/images/splash.png": require("@/assets/images/splash.png"),
  "./assets/images/logo2.png": require("@/assets/images/logo2.png"),
  "./assets/images/adaptive-icon.png": require("@/assets/images/adaptive-icon.png"),
  "./assets/images/notification-icon.png": require("@/assets/images/icon.png"),
  "./assets/custom/icon.png": require("@/assets/custom/icon.png"),
  "./assets/custom/splash.png": require("@/assets/custom/splash.png"),
  "./assets/custom/adaptive-icon.png": require("@/assets/custom/adaptive-icon.png"),
};

//  */
function getLogoSource() {
  try {
    // Priority 1: Custom reseller icon from build
    if (ASSET_MAP["./assets/custom/icon.png"]) {
      return ASSET_MAP["./assets/custom/icon.png"];
    }

    // Priority 2: Configured logo path
    const configLogoPath = useResellerStore.getState().config.assets?.logo;
    if (configLogoPath && ASSET_MAP[configLogoPath]) {
      return ASSET_MAP[configLogoPath];
    }
  } catch {
    // Store not initialized yet, use fallback
  }

  // Priority 3: Default
  return require("@/assets/images/logo2.png");
}

export function getAssetSource(assetPath: string | undefined): any {
  if (!assetPath) return null;

  if (ASSET_MAP[assetPath]) {
    return ASSET_MAP[assetPath];
  }

  // Fallback to icon
  return require("@/assets/images/icon.png");
}

// ============================================
// Resolve the store's derived auth email
// ============================================
// The per-store suffix is internal: the customer signs in with the address
// they registered with. The function maps it to the Supabase Auth identity
// behind it (service-role only, so it runs server-side). Invoked through the
// configured client rather than a hand-built fetch, so it reuses the app's
// Supabase URL and publishable key.
async function getCustomerAuthEmail(
  originalEmail: string,
  resellerId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "global-store-customer-auth-email",
      {
        body: {
          resellerId,
          email: originalEmail.trim().toLowerCase(),
        },
      },
    );

    if (error) {
      console.error("[Login] auth-email lookup failed:", error);
      return null;
    }
    return data?.authEmail || null;
  } catch (error) {
    console.error("[Login] auth-email lookup network error:", error);
    return null;
  }
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  // Get the themed logo source
  const logoSrc = getLogoSource();

  const handleLogin = async () => {
    // Validation
    const newErrors = { email: "", password: "" };
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const resellerId = useResellerStore.getState().config.resellerId;

      // The per-store suffix on the stored auth email is internal only: the
      // customer always types the address they registered with. Resolve it
      // to the Supabase Auth identity behind it, and fall back to the typed
      // address for accounts whose auth email is the real one (store
      // owners, and customers registered before the suffix existed). This
      // mirrors the web storefront's sign-in exactly.
      //
      // Deliberately no client-side reconstruction of the derived email:
      // web signup uses a random suffix and mobile a deterministic one, so a
      // guess is wrong for anyone who registered on the other platform, and
      // a wrong guess surfaces as a misleading "invalid credentials".
      const authEmail = resellerId
        ? await getCustomerAuthEmail(email, resellerId)
        : null;
      const loginEmail = authEmail || email.trim().toLowerCase();

      console.log(
        "[Login] Attempting login with:",
        loginEmail,
        "resolved:",
        Boolean(authEmail),
      );

      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password.trim(),
      });

      if (error) throw error;

      // Success! Save session and redirect
      setSession(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(app)/(protected)");
    } catch (error: any) {
      console.error("[Login] Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Provide user-friendly error messages
      let errorMessage = "Invalid email or password. Please try again.";

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage =
          "Please verify your email address before logging in. Check your inbox for a confirmation link.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage =
          "Too many login attempts. Please wait a few minutes and try again.";
      }

      Alert.alert("Login Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        {/* Logo Section */}
        <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
           <Image
            source={logoSrc}
            style={{
              width: 150,
              height: 150,
              borderRadius: 70,
              marginBottom: 10,
            }}
          /> 
          <Text
            style={{
              fontSize: Typography.sizes.xxxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.xs,
            }}
          >
            Welcome Back
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
            }}
          >
            Login to continue
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Input
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: "" });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Text>📧</Text>}
            containerStyle={{ marginBottom: Spacing.lg }}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: "" });
            }}
            error={errors.password}
            secureTextEntry={!showPassword}
            leftIcon={<Text>🔒</Text>}
            rightIcon={
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPassword(!showPassword);
                }}
              >
                <Text style={{ fontSize: 20 }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </Pressable>
            }
            containerStyle={{ marginBottom: Spacing.md }}
          />

          <Link href="/(app)/(auth)/forgot-password" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                  textAlign: "right",
                }}
              >
                Forgot Password?
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Login Button */}
        <Button
          title={isLoading ? "Logging in..." : "Login"}
          onPress={handleLogin}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          size="md"
          style={{ marginBottom: Spacing.md }}
        />

        {/* Register Link */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.sm,
              color: colors.textSecondary,
              marginRight: Spacing.xs,
            }}
          >
            Don't have an account?
          </Text>
          <Link href="/(app)/(auth)/register" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Sign Up
              </Text>
            </Pressable>
          </Link>
        </View>

        {/* Legal Links */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: Spacing.xl,
            gap: Spacing.md,
          }}
        >
          <Link href="/(app)/(legal)/privacy" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textTertiary,
                }}
              >
                Privacy
              </Text>
            </Pressable>
          </Link>
          <Text style={{ color: colors.textTertiary }}>•</Text>
          <Link href="/(app)/(legal)/terms" asChild>
            <Pressable>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textTertiary,
                }}
              >
                Terms
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}