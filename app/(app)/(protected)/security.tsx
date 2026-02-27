// app/(app)/(protected)/security.tsx
import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

type SecuritySection = "password" | "pin" | "main";

export default function SecurityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch profile to check if user has a transaction PIN
  const { data: profile } = useProfile();
  const hasTransactionPin = profile?.transaction_pin != null;

  // Navigation
  const [currentSection, setCurrentSection] = useState<SecuritySection>("main");

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Transaction PIN State
  const [pinData, setPinData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPin, setShowPin] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [pinErrors, setPinErrors] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Update password field
  const updatePasswordField = (
    field: "current" | "new" | "confirm",
    value: string,
  ) => {
    setPasswordData({ ...passwordData, [field]: value });
    setPasswordErrors({ ...passwordErrors, [field]: "" });
  };

  // Update PIN field
  const updatePinField = (
    field: "current" | "new" | "confirm",
    value: string,
  ) => {
    // Only allow digits and max 4 characters
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPinData({ ...pinData, [field]: cleaned });
    setPinErrors({ ...pinErrors, [field]: "" });
  };

  // PIN mutation for create/update (no verification needed)
  const pinMutation = useMutation({
    mutationFn: async ({ newPinValue }: { newPinValue: string }) => {
      if (!user?.id) throw new Error("No user found");

      // Directly update the PIN without verification
      const { data, error } = await supabase
        .from("profiles")
        .update({ transaction_pin: newPinValue })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const message = hasTransactionPin
        ? "Your transaction PIN has been changed successfully!"
        : "Your transaction PIN has been created successfully!";

      Alert.alert("Success", message, [
        {
          text: "OK",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPinData({ current: "", new: "", confirm: "" });
            setPinErrors({ current: "", new: "", confirm: "" });
            setCurrentSection("main");
          },
        },
      ]);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("PIN operation error:", error);

      Alert.alert(
        "Error",
        error.message || "Failed to update PIN. Please try again.",
      );
    },
  });

  // Password Validation
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&*)";
    }
    return null;
  };

  // PIN Validation
  const validatePin = (pin: string): string | null => {
    if (!pin) {
      return "PIN is required";
    }
    if (pin.length !== 4) {
      return "PIN must be exactly 4 digits";
    }
    if (!/^\d+$/.test(pin)) {
      return "PIN must contain only numbers";
    }
    return null;
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newErrors = { current: "", new: "", confirm: "" };

    // Validation
    if (!passwordData.current.trim()) {
      newErrors.current = "Current password is required";
    }

    if (!passwordData.new.trim()) {
      newErrors.new = "New password is required";
    }

    if (!passwordData.confirm.trim()) {
      newErrors.confirm = "Please confirm your new password";
    }

    if (newErrors.current || newErrors.new || newErrors.confirm) {
      setPasswordErrors(newErrors);
      return;
    }

    const passwordError = validatePassword(passwordData.new);
    if (passwordError) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setPasswordErrors({ ...newErrors, new: passwordError });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setPasswordErrors({
        ...newErrors,
        confirm: "New passwords do not match",
      });
      return;
    }

    if (passwordData.current === passwordData.new) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        "Same Password",
        "New password must be different from current password",
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.current,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect");
      }

      // Update password via Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        "Your password has been changed successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPasswordData({ current: "", new: "", confirm: "" });
              setPasswordErrors({ current: "", new: "", confirm: "" });
              setCurrentSection("main");
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Password change error:", error);

      if (
        error.message?.includes("Invalid") ||
        error.message?.includes("incorrect")
      ) {
        setPasswordErrors({
          ...newErrors,
          current: "Current password is incorrect",
        });
      } else {
        Alert.alert(
          "Error",
          error.message || "Failed to change password. Please try again.",
        );
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Create/Change Transaction PIN (No current PIN verification needed)
  const handlePinSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newErrors = { current: "", new: "", confirm: "" };

    // Validate new PIN
    const newPinError = validatePin(pinData.new);
    if (newPinError) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      newErrors.new = newPinError;
      setPinErrors(newErrors);
      return;
    }

    // Validate confirm PIN
    const confirmPinError = validatePin(pinData.confirm);
    if (confirmPinError) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      newErrors.confirm = confirmPinError;
      setPinErrors(newErrors);
      return;
    }

    if (pinData.new !== pinData.confirm) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      newErrors.confirm = "New PINs do not match";
      setPinErrors(newErrors);
      return;
    }

    // Submit (no current PIN needed)
    pinMutation.mutate({
      newPinValue: pinData.new,
    });
  };

  // Main Security Menu
  if (currentSection === "main") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: Spacing.lg }}
        >
          {/* Security Options */}
          <View style={{ paddingHorizontal: Spacing.lg }}>
            {/* Change Password */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentSection("password");
              }}
              style={({ pressed }) => ({
                backgroundColor: colors.card,
                borderRadius: Radius.lg,
                padding: Spacing.lg,
                marginBottom: Spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.xs,
                }}
              >
                🔐 Change Password
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                }}
              >
                Update your login password
              </Text>
            </Pressable>

            {/* Transaction PIN */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCurrentSection("pin");
              }}
              style={({ pressed }) => ({
                backgroundColor: colors.card,
                borderRadius: Radius.lg,
                padding: Spacing.lg,
                marginBottom: Spacing.md,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.xs,
                }}
              >
                🔑 {hasTransactionPin ? "Change" : "Create"} Transaction PIN
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                }}
              >
                {hasTransactionPin
                  ? "Update your 4-digit transaction PIN"
                  : "Create a 4-digit PIN for transactions"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Change Password Section
  if (currentSection === "password") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={() => setCurrentSection("main")}>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Back
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              Change Password
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.lg,
            }}
          >
            {/* Password Requirements */}
            <View
              style={{
                backgroundColor: colors.primary + "10",
                borderRadius: Radius.md,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.sm,
                }}
              >
                📋 Password Requirements
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.xs,
                  color: colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                • At least 8 characters long{"\n"}• Uppercase letter (A-Z)
                {"\n"}• Lowercase letter (a-z){"\n"}• Number (0-9){"\n"}•
                Special character (!@#$%^&*)
              </Text>
            </View>

            {/* Current Password Input */}
            <Input
              label="Current Password"
              placeholder="Enter your current password"
              value={passwordData.current}
              onChangeText={(text) => updatePasswordField("current", text)}
              error={passwordErrors.current}
              secureTextEntry={!showPassword.current}
              leftIcon={<Text>🔒</Text>}
              rightIcon={
                <Pressable
                  onPress={() =>
                    setShowPassword({
                      ...showPassword,
                      current: !showPassword.current,
                    })
                  }
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPassword.current ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.lg }}
            />

            {/* New Password Input */}
            <Input
              label="New Password"
              placeholder="Enter your new password"
              value={passwordData.new}
              onChangeText={(text) => updatePasswordField("new", text)}
              error={passwordErrors.new}
              secureTextEntry={!showPassword.new}
              leftIcon={<Text>🔐</Text>}
              rightIcon={
                <Pressable
                  onPress={() =>
                    setShowPassword({
                      ...showPassword,
                      new: !showPassword.new,
                    })
                  }
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPassword.new ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.lg }}
            />

            {/* Confirm Password Input */}
            <Input
              label="Confirm Password"
              placeholder="Confirm your new password"
              value={passwordData.confirm}
              onChangeText={(text) => updatePasswordField("confirm", text)}
              error={passwordErrors.confirm}
              secureTextEntry={!showPassword.confirm}
              leftIcon={<Text>✓</Text>}
              rightIcon={
                <Pressable
                  onPress={() =>
                    setShowPassword({
                      ...showPassword,
                      confirm: !showPassword.confirm,
                    })
                  }
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPassword.confirm ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.xl }}
            />

            {/* Action Buttons */}
            <Button
              title="Change Password"
              onPress={handleChangePassword}
              loading={isChangingPassword}
              fullWidth
              size="md"
              style={{ marginBottom: Spacing.md }}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // Change Transaction PIN Section
  if (currentSection === "pin") {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={() => setCurrentSection("main")}>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.primary,
                  fontWeight: Typography.weights.semibold,
                }}
              >
                Back
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              {hasTransactionPin ? "Change" : "Create"} PIN
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.lg,
            }}
          >
            {/* PIN Requirements */}
            <View
              style={{
                backgroundColor: colors.primary + "10",
                borderRadius: Radius.md,
                padding: Spacing.md,
                marginBottom: Spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: colors.text,
                  marginBottom: Spacing.sm,
                }}
              >
                📋 PIN Requirements
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.xs,
                  color: colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                • Exactly 4 digits long{"\n"}• Numbers only (0-9){"\n"}• Easy to
                remember{"\n"}• Don't use sequential numbers{"\n"}• Keep it
                confidential
              </Text>
            </View>

            {/* New PIN Input */}
            <Input
              label="New PIN"
              placeholder="••••"
              value={pinData.new}
              onChangeText={(text) => updatePinField("new", text)}
              error={pinErrors.new}
              secureTextEntry={!showPin.new}
              keyboardType="number-pad"
              maxLength={4}
              leftIcon={<Text>🆕</Text>}
              rightIcon={
                <Pressable
                  onPress={() => setShowPin({ ...showPin, new: !showPin.new })}
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPin.new ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.lg }}
            />

            {/* Confirm PIN Input */}
            <Input
              label="Confirm PIN"
              placeholder="••••"
              value={pinData.confirm}
              onChangeText={(text) => updatePinField("confirm", text)}
              error={pinErrors.confirm}
              secureTextEntry={!showPin.confirm}
              keyboardType="number-pad"
              maxLength={4}
              leftIcon={<Text>✓</Text>}
              rightIcon={
                <Pressable
                  onPress={() =>
                    setShowPin({ ...showPin, confirm: !showPin.confirm })
                  }
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPin.confirm ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.xl }}
            />

            {/* Action Buttons */}
            <Button
              title={hasTransactionPin ? "Change PIN" : "Create PIN"}
              onPress={handlePinSubmit}
              loading={pinMutation.isPending}
              fullWidth
              size="md"
              style={{ marginBottom: Spacing.md }}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return null;
}
