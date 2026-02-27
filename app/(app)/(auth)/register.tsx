// app/(app)/(auth)/register.tsx
import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
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
} from "react-native";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Update form field
  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    setErrors({ ...errors, [field]: "" });
  };

  // Validation
  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
      confirmPassword: "",
    };

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password =
        "Password must include uppercase, lowercase, and number";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (session) {
        setSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // If email confirmation is enabled in Supabase
        Alert.alert(
          "Check Your Email",
          "A confirmation email has been sent. Please verify your email to complete registration.",
        );
        router.replace("/(app)/(auth)/login");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Registration Error",
        error.message || "An error occurred during registration.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            padding: Spacing.xl,
            paddingTop: Platform.OS === "ios" ? 60 : 40,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: Spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: colors.primary,
                borderRadius: Radius.xl,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 40 }}>🚀</Text>
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.xxxl,
                fontWeight: Typography.weights.bold,
                color: colors.text,
                marginBottom: Spacing.xs,
              }}
            >
              Create Account
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Sign up to start buying data and airtime
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: Spacing.lg }}>
            {/* Email */}
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={formData.email}
              onChangeText={(text) => updateField("email", text.toLowerCase())}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Text>📧</Text>}
              containerStyle={{ marginBottom: Spacing.md }}
            />

            {/* Password */}
            <Input
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChangeText={(text) => updateField("password", text)}
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
              helperText="Min. 8 characters with uppercase, lowercase & number"
              containerStyle={{ marginBottom: Spacing.md }}
            />

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
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
              containerStyle={{ marginBottom: Spacing.md }}
            />

            {/* Terms Agreement */}
            <View
              style={{
                backgroundColor: colors.backgroundSecondary,
                padding: Spacing.md,
                borderRadius: Radius.md,
                marginBottom: Spacing.sm,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  lineHeight: Typography.sizes.sm * 1.5,
                }}
              >
                By creating an account, you agree to our{" "}
                <Link href="/(app)/(legal)/terms" asChild>
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: Typography.weights.semibold,
                    }}
                  >
                    Terms of Service
                  </Text>
                </Link>{" "}
                and{" "}
                <Link href="/(app)/(legal)/privacy" asChild>
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: Typography.weights.semibold,
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Link>
              </Text>
            </View>
          </View>

          {/* Register Button */}
          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="md"
            style={{ marginBottom: Spacing.md }}
          />

          {/* Login Link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: Spacing.xl,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
                marginRight: Spacing.xs,
              }}
            >
              Already have an account?
            </Text>
            <Link href="/(app)/(auth)/login" asChild>
              <Pressable>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.primary,
                    fontWeight: Typography.weights.semibold,
                  }}
                >
                  Login
                </Text>
              </Pressable>
            </Link>
          </View>

          {/* Bottom Padding for Keyboard */}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
