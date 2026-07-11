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

  const getDeterministicSuffix = (email: string, storeSlug: string): number => {
    const input = `${email.toLowerCase()}:${storeSlug}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
    }
    return (Math.abs(hash) % 9) + 1;
  };

  const registerCustomerToReseller = async (
    userId: string,
    originalEmail: string,
    authEmail: string,
  ) => {
    try {
      const storeSlug = useResellerStore.getState().config.storeName;
      const username = originalEmail.split("@")[0];

      const { data: reseller, error: resellerError } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .maybeSingle();

      if (resellerError || !reseller) {
        console.log(
          "[Register] No active reseller found for store:",
          storeSlug,
        );
        return;
      }

      // Fetch ALL rows that could be related to this registration:
      const { data: allMatches } = await supabase
        .from("reseller_customers")
        .select("id, email, auth_user_id, auth_email")
        .eq("reseller_id", reseller.id)
        .or(
          `email.eq.${originalEmail},email.eq.${authEmail},auth_email.eq.${authEmail}`,
        );

      // The "real" record is the one whose email == originalEmail; fall back to first match
      const existingCustomer =
        allMatches?.find((c) => c.email === originalEmail) ??
        allMatches?.[0] ??
        null;

      // Ghost rows: any row where email === authEmail (the storeEmail leaked into the email column)
      const ghostRows =
        allMatches?.filter(
          (c) => c.id !== existingCustomer?.id && c.email === authEmail,
        ) ?? [];

      if (ghostRows.length > 0) {
        await supabase
          .from("reseller_customers")
          .delete()
          .in(
            "id",
            ghostRows.map((g) => g.id),
          );
        console.log(
          "[Register] 🗑️ Cleaned up",
          ghostRows.length,
          "ghost row(s)",
        );
      }

      if (existingCustomer) {
        const updates: any = {};
        if (!existingCustomer.auth_user_id) updates.auth_user_id = userId;
        if (!existingCustomer.auth_email) updates.auth_email = authEmail;

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("reseller_customers")
            .update(updates)
            .eq("id", existingCustomer.id);

          if (updateError) {
            console.error("[Register] Failed to update customer:", updateError);
          } else {
            console.log("[Register] ✅ Customer updated:", updates);
          }
        } else {
          console.log("[Register] Customer already fully registered");
        }
      } else {
        // No existing record at all — create a fresh one
        const { error: insertError } = await supabase
          .from("reseller_customers")
          .insert({
            reseller_id: reseller.id,
            email: originalEmail,
            auth_email: authEmail,
            first_name: username,
            auth_user_id: userId,
          });

        if (insertError) {
          console.error("[Register] Failed to create customer:", insertError);
          return;
        }
        console.log(
          "[Register] ✅ Customer created with auth_email:",
          authEmail,
        );
      }

      // Get the canonical customer record (by originalEmail) to create/check wallet
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("reseller_id", reseller.id)
        .eq("email", originalEmail)
        .maybeSingle();

      if (customer) {
        const { data: existingWallet } = await supabase
          .from("reseller_customer_wallets")
          .select("id")
          .eq("reseller_id", reseller.id)
          .eq("customer_id", customer.id)
          .maybeSingle();

        if (!existingWallet) {
          await supabase.from("reseller_customer_wallets").insert({
            reseller_id: reseller.id,
            customer_id: customer.id,
            balance: 0,
            total_spent: 0,
          });
          console.log("[Register] ✅ Customer wallet created");
        }
      }
    } catch (error) {
      console.error("[Register] Error:", error);
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