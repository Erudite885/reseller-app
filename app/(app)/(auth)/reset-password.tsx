// ============================================
// app/(app)/(auth)/reset-password.tsx
// ============================================

import { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Button, Input } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // ✅ Vercel redirect now sends access_token + refresh_token (NOT raw token/email)
  const { access_token, refresh_token, type } = useLocalSearchParams();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const validateForm = () => {
    const newErrors = {
      password: "",
      confirmPassword: "",
    };

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must include uppercase, lowercase, and number";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleResetPassword = async () => {
    // ✅ Guard against missing tokens
    if (!access_token || !refresh_token || type !== "recovery") {
      Alert.alert(
        "Invalid Link",
        "Your reset link is invalid or has expired. Please request a new one.",
      );
      return;
    }

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const accessToken = Array.isArray(access_token)
        ? access_token[0]
        : access_token;
      const refreshToken = Array.isArray(refresh_token)
        ? refresh_token[0]
        : refresh_token;

      // ✅ Step 1: Restore session from tokens — Supabase already verified
      //    the OTP when the email link was clicked, so we just set the session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) throw sessionError;

      // ✅ Step 2: Update the password with the active session
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) throw updateError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Success", "Password updated successfully.", [
        { text: "OK", onPress: () => router.replace("/(app)/(auth)/login") },
      ]);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const err = error as Error;
      setErrors({
        ...errors,
        password: err.message || "Failed to reset password. Please try again.",
      });
      console.error("Reset password error:", error);
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
        {/* Header */}
        <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              backgroundColor: colors.success + "30",
              borderRadius: Radius.xl,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: Spacing.lg,
            }}
          >
            <Text style={{ fontSize: 40 }}>🔐</Text>
          </View>
          <Text
            style={{
              fontSize: Typography.sizes.xxxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.xs,
            }}
          >
            Reset Password
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.textSecondary,
              textAlign: "center",
              lineHeight: Typography.sizes.base * 1.5,
            }}
          >
            Create a new strong password for your account
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginBottom: Spacing.xl }}>
          {/* New Password */}
          <Input
            label="New Password"
            placeholder="Create a strong password"
            value={formData.password}
            onChangeText={(text) => updateField("password", text)}
            error={errors.password}
            secureTextEntry={!showPassword}
            autoFocus
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
            helperText="Min. 8 characters with uppercase, lowercase & number"
            containerStyle={{ marginBottom: Spacing.lg }}
          />

          {/* Confirm Password */}
          <Input
            label="Confirm New Password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateField("confirmPassword", text)}
            error={errors.confirmPassword}
            secureTextEntry={!showConfirmPassword}
            leftIcon={<Text>🔒</Text>}
            rightIcon={
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowConfirmPassword(!showConfirmPassword);
                }}
              >
                <Text style={{ fontSize: 20 }}>
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </Pressable>
            }
            containerStyle={{ marginBottom: Spacing.lg }}
          />

          {/* Password Strength Indicator */}
          {formData.password.length > 0 && (
            <View
              style={{
                backgroundColor: colors.backgroundSecondary,
                padding: Spacing.md,
                borderRadius: Radius.md,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  marginBottom: Spacing.sm,
                }}
              >
                Password strength:
              </Text>
              <View style={{ gap: Spacing.xs }}>
                <PasswordRequirement
                  met={formData.password.length >= 8}
                  text="At least 8 characters"
                />
                <PasswordRequirement
                  met={/[A-Z]/.test(formData.password)}
                  text="One uppercase letter"
                />
                <PasswordRequirement
                  met={/[a-z]/.test(formData.password)}
                  text="One lowercase letter"
                />
                <PasswordRequirement
                  met={/\d/.test(formData.password)}
                  text="One number"
                />
              </View>
            </View>
          )}
        </View>

        {/* Reset Button */}
        <Button
          title="Reset Password"
          onPress={handleResetPassword}
          loading={isLoading}
          fullWidth
          size="md"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Password Requirement Component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text
        style={{
          fontSize: 16,
          marginRight: Spacing.sm,
          color: met ? colors.success : colors.textTertiary,
        }}
      >
        {met ? "✓" : "○"}
      </Text>
      <Text
        style={{
          fontSize: Typography.sizes.sm,
          color: met ? colors.success : colors.textTertiary,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

