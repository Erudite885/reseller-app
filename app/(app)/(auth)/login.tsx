// ============================================
// app/(app)/(auth)/login.tsx
// ============================================

import { Button, Input } from "@/components/ui";
import { Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
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

export default function LoginScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const handleLogin = async () => {
    const newErrors = { email: "", password: "" };
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (newErrors.email || newErrors.password) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    // TODO: Supabase auth: done
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
            source={require("@/assets/images/logo2.png")}
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
