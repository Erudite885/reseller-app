// ============================================
// app/(app)/(auth)/login.tsx
// ============================================

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
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// ============================================
// Static asset map — MUST be literal strings for Metro bundler
// Add entries here when new default assets are added
// ============================================
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

/**
 * Resolves the logo source dynamically based on the reseller's config.
 *
 * Priority:
 * 1. Reseller's configured logo path (from reseller-config.json)
 * 2. Default logo (assets/images/logo2.png)
 */
// function getLogoSource() {
//   try {
//     const configLogoPath = useResellerStore.getState().config.assets?.logo;

//     if (configLogoPath && ASSET_MAP[configLogoPath]) {
//       return ASSET_MAP[configLogoPath];
//     }
//   } catch {
//     // Store not initialized yet, use fallback
//   }

//   return require("@/assets/images/logo2.png");
// }

/**
 * Resolves the logo source dynamically based on the reseller's config.
 *
 * Priority:
 * 1. Custom reseller icon (assets/custom/icon.png) — from build
 * 2. Reseller's configured logo path (from reseller-config.json)
 * 3. Default logo (assets/images/logo2.png)
 */
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

/**
 * Resolves any asset path to its required source.
 * Can be reused by other screens (splash, etc.)
 */
export function getAssetSource(assetPath: string | undefined): any {
  if (!assetPath) return null;

  if (ASSET_MAP[assetPath]) {
    return ASSET_MAP[assetPath];
  }

  // Fallback to icon
  return require("@/assets/images/icon.png");
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
    const newErrors = { email: "", password: "" };
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSession(session);
      router.replace("/(app)/(protected)");
    } catch (error: any) {
      Alert.alert("Login Error", error.message || "An error occurred");
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
        {/* Logo */}
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
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: "" });
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
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
          title="Login"
          onPress={handleLogin}
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
