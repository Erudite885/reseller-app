// app/(app)/(auth)/register.tsx

import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
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
} from "react-native";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

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

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

  const validateForm = () => {
    const newErrors = { email: "", password: "", confirmPassword: "" };

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

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
    return !Object.values(newErrors).some((e) => e !== "");
  };

  // Per-store derived auth email. Kept from the legacy flow: it gives each
  // store its own auth user for the same shopper email, which the
  // global_* model preserves (a customer row is keyed by (reseller_id, email)).
  const getDeterministicSuffix = (email: string, storeSlug: string): number => {
    const input = `${email.toLowerCase()}:${storeSlug}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 9) + 1;
  };

  const registerCustomerToReseller = async (
    _userId: string,
    originalEmail: string,
    authEmail: string,
  ) => {
    // Find-or-create the customer in global_customers through the
    // service-role function (the app only holds the publishable key and has
    // no global_* write policy). The function resolves the store from
    // resellerId, so there is no store_name lookup and no ghost-row cleanup
    // (that was a legacy reseller_customers quirk).
    const resellerId = useResellerStore.getState().config.resellerId;
    if (!resellerId) {
      console.log("[Register] No resellerId configured; skipping customer link");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke(
        "global-store-register-customer",
        {
          body: { resellerId, email: originalEmail, authEmail },
        },
      );
      if (error) throw error;
      if (data?.success === false) {
        throw new Error(data.error || "Failed to register customer");
      }
      console.log("[Register] ✅ Customer linked:", data?.customerId);
    } catch (error) {
      // Non-fatal: the customer is linked on first authenticated login
      // (app/_layout.tsx) if this early attempt fails.
      console.error("[Register] Customer link error:", error);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const storeSlug = useResellerStore.getState().config.storeName;
      const [localPart, domain] = formData.email.split("@");
      const separator = localPart.includes("+") ? "" : "+";
      const suffix = getDeterministicSuffix(formData.email, storeSlug);
      const storeEmail = `${localPart}${separator}${storeSlug}${suffix}@${domain}`;

      const username = formData.email.split("@")[0];

      const {
        data: { session, user },
        error,
      } = await supabase.auth.signUp({
        email: storeEmail,
        password: formData.password,
        options: {
          data: {
            username: username,
            role: "customer",
            original_email: formData.email,
          },
        },
      });

      if (error) throw error;

      if (user) {
        await registerCustomerToReseller(user.id, formData.email, storeEmail);
      }

      if (session) {
        setSession(session);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(app)/(protected)");
      } else {
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

            {/* Terms */}
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

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="md"
            style={{ marginBottom: Spacing.md }}
          />

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

          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}