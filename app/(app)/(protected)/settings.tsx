// app/(app)/(protected)/settings.tsx
import { Card, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useNotificationSettings } from "@/hooks/useNotificationSetings";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import { useTransactionPin } from "@/hooks/useTransactionPin";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/themeStore";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

type SettingItem = {
  id: string;
  icon: string;
  label: string;
  value?: string;
  type: "navigate" | "toggle" | "info";
  route?: string;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export default function SettingsScreen() {
  const { colors, isDark, shadows } = useTheme();
  const { theme, setTheme } = useThemeStore();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();
  const {
    notificationsEnabled,
    isChecking: checkingNotifications,
    setIsChecking: setCheckingNotifications,
    enableNotifications,
    disableNotifications,
  } = useNotificationSettings();

  // Fetch real profile data from Supabase
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  // ✅ ADD THIS HOOK
  const { validatePin } = useTransactionPin();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Add this state at the top of your SettingsScreen component:
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Add these states for the PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Get member since date from profile or use current date
  const getMemberSinceDate = () => {
    if (profile?.created_at) {
      const date = new Date(profile.created_at);
      return date.toLocaleDateString("en-NG", {
        year: "numeric",
        month: "long",
      });
    }
    return "Now";
  };

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckingNotifications(true);

    if (value) {
      const result = await enableNotifications();
      if (result.success) {
        Alert.alert("Success", "Notifications enabled successfully!");
      } else {
        Alert.alert("Error", result.error || "Failed to enable notifications");
      }
    } else {
      const result = await disableNotifications();
      if (result?.success) {
        Alert.alert("Disabled", "Notifications have been disabled");
      }
    }

    setCheckingNotifications(false);
  };

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            // Clear local session
            clearSession();

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Navigate to login
            router.replace("/(app)/(auth)/login");
          } catch (error: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              "Logout Error",
              error.message || "Failed to logout. Please try again.",
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  // handleDeleteAccount function:
  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Alert.alert(
      "Delete Account",
      "⚠️ This action cannot be undone. All your data will be permanently deleted:\n\n• Wallet balance\n• Transaction history\n• Personal information\n• Virtual accounts",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => showPinConfirmation(),
        },
      ],
    );
  };

  // NEW: Show PIN confirmation dialog - FIXED for cross-platform
  const showPinConfirmation = () => {
    // Check if user has transaction PIN
    // const hasPin = !!profile?.transaction_pin;

    if (profile?.transaction_pin) {
      // If user has PIN, show modal for PIN input
      setShowPinModal(true);
      setPinInput("");
    } else {
      // No PIN, show modal for typed confirmation
      setShowDeleteModal(true);
      setDeleteConfirmText("");
    }
  };

  // Handle PIN modal submission
  const handlePinSubmit = async () => {
    if (!pinInput || pinInput.length !== 4) {
      Alert.alert("Error", "Please enter a valid 4-digit PIN");
      return;
    }

    // ✅ Use the hook's validatePin method instead of manual comparison
    if (!validatePin(pinInput, profile?.transaction_pin)) {
      Alert.alert("Error", "Invalid transaction PIN");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinInput("");
      return;
    }

    // PIN verified, close modal and proceed with deletion
    setShowPinModal(false);
    await performAccountDeletion(pinInput);
  };

  // Handle delete confirmation modal submission
  const handleDeleteConfirmSubmit = async () => {
    if (deleteConfirmText.toUpperCase() !== "DELETE") {
      Alert.alert("Error", 'You must type "DELETE" to confirm');
      return;
    }

    // Confirmation verified, close modal and proceed with deletion
    setShowDeleteModal(false);
    await performAccountDeletion();
  };

  // NEW: Perform the actual account deletion
  const performAccountDeletion = async (transactionPin?: string) => {
    setIsDeletingAccount(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Get JWT token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("No authentication token available");
      }

      console.log("[DELETE-ACCOUNT] Calling edge function...");

      // Call delete-account edge function
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            confirmation_code: "DELETE",
            transaction_pin: transactionPin, // Optional: send PIN for extra verification
          }),
        },
      );

      const result = await response.json();

      console.log("[DELETE-ACCOUNT] Response:", result);

      if (!result.success) {
        throw new Error(result.error || "Failed to delete account");
      }

      // Account deleted successfully
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Account Deleted",
        "Your account has been permanently deleted. We're sorry to see you go!",
        [
          {
            text: "OK",
            onPress: async () => {
              // Sign out and clear local session
              await supabase.auth.signOut();
              clearSession();

              // Redirect to login
              router.replace("/(app)/(auth)/login");
            },
          },
        ],
        { cancelable: false }, // Prevent dismissing without action
      );
    } catch (error: any) {
      console.error("[DELETE-ACCOUNT] Error:", error);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      Alert.alert(
        "Deletion Failed",
        error.message ||
          "Failed to delete account. Please try again or contact support.",
        [{ text: "OK" }],
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const settings: SettingSection[] = [
    {
      title: "Account",
      items: [
        {
          id: "profile",
          icon: "👤",
          label: "Edit Profile",
          value: "Update your information",
          type: "navigate",
          route: "/(app)/(protected)/profile",
        },
        {
          id: "security",
          icon: "🔐",
          label: "Security",
          value: "Password & authentication",
          type: "navigate",
          route: "/(app)/(protected)/security",
        },
        {
          id: "wallet",
          icon: "💰",
          label: "Wallet Settings",
          value: "Payment methods & limits",
          type: "navigate",
          route: "/(app)/(protected)/wallet",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          id: "notifications",
          icon: "🔔",
          label: "Notifications",
          type: "toggle",
          toggleValue: notificationsEnabled,
          onToggle: handleNotificationToggle,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          id: "help",
          icon: "❓",
          label: "Help Center",
          value: "FAQs & support",
          type: "navigate",
          route: "/(app)/(protected)/help",
        },
        {
          id: "contact",
          icon: "📧",
          label: "Contact Us",
          value: "Get in touch",
          type: "navigate",
          route: "/(app)/(protected)/contact",
        },
      ],
    },
    {
      title: "Legal",
      items: [
        {
          id: "terms",
          icon: "📄",
          label: "Terms of Service",
          type: "navigate",
          route: "/(app)/(legal)/terms",
        },
        {
          id: "privacy",
          icon: "🔒",
          label: "Privacy Policy",
          type: "navigate",
          route: "/(app)/(legal)/privacy",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          id: "version",
          icon: "📱",
          label: "App Version",
          value: "1.0.0",
          type: "info",
        },
        {
          id: "build",
          icon: "🔧",
          label: "Build Number",
          value: "2025.01.01",
          type: "info",
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    if (item.type === "toggle") {
      return (
        <View
          key={item.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            backgroundColor: colors.card,
            marginBottom: 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
              {item.icon}
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              {item.label}
            </Text>
          </View>
          <Switch
            value={item.toggleValue ?? false}
            onValueChange={item.onToggle}
            disabled={item.id === "notifications" && checkingNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
          />
        </View>
      );
    }

    if (item.type === "info") {
      return (
        <View
          key={item.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            backgroundColor: colors.card,
            marginBottom: 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
              {item.icon}
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              {item.label}
            </Text>
          </View>
          <Text
            style={{
              fontSize: Typography.sizes.sm,
              color: colors.textSecondary,
            }}
          >
            {item.value}
          </Text>
        </View>
      );
    }

    // Navigate type
    return (
      <Pressable
        key={item.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (item.route) {
            router.push(item.route as any);
          }
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          backgroundColor: colors.card,
          marginBottom: 1,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 24, marginRight: Spacing.md }}>
            {item.icon}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                color: colors.text,
              }}
            >
              {item.label}
            </Text>
            {item.value && (
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                {item.value}
              </Text>
            )}
          </View>
        </View>
        <Text style={{ fontSize: 18, color: colors.textSecondary }}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        {isProfileLoading ? (
          // Loading State
          <Card variant="elevated" padding="md" style={{ margin: Spacing.md }}>
            <View style={{ alignItems: "center", paddingVertical: Spacing.lg }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.textSecondary,
                  marginTop: Spacing.md,
                }}
              >
                Loading profile...
              </Text>
            </View>
          </Card>
        ) : profile ? (
          // User Profile Card
          <Card variant="elevated" padding="md" style={{ margin: Spacing.md }}>
            <View style={{ alignItems: "center" }}>
              {/* User Name */}
              <Text
                style={{
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                  textTransform: "capitalize",
                  marginBottom: Spacing.xs,
                }}
              >
                {profile?.username || "User"}
              </Text>

              {/* Email */}
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  marginBottom: Spacing.xs,
                }}
              >
                {profile?.email}
              </Text>

              {/* Account Type Badge */}
              <View
                style={{
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.xs,
                  backgroundColor: colors.primary + "20",
                  borderRadius: Radius.full,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.primary,
                    fontWeight: "600",
                  }}
                >
                  • Member since {getMemberSinceDate()} •
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          // No Profile State
          <Card variant="elevated" padding="md" style={{ margin: Spacing.md }}>
            <View style={{ alignItems: "center", paddingVertical: Spacing.lg }}>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.textSecondary,
                }}
              >
                Unable to load profile
              </Text>
            </View>
          </Card>
        )}

        {/* Settings Sections */}
        {settings.map((section, index) => (
          <View key={section.title} style={{ marginTop: Spacing.md }}>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: "600",
                color: colors.textSecondary,
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.sm,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                backgroundColor: colors.card,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              {section.items.map((item) => renderSettingItem(item))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          disabled={isLoggingOut}
          style={({ pressed }) => ({
            marginHorizontal: Spacing.lg,
            marginTop: Spacing.lg,
            padding: Spacing.md,
            backgroundColor: colors.error + "10",
            borderRadius: Radius.lg,
            alignItems: "center",
            opacity: pressed || isLoggingOut ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: Typography.sizes.xl,
              fontWeight: "600",
              color: colors.error,
            }}
          >
            {isLoggingOut ? "🔄 Logging out..." : "🚪 Logout"}
          </Text>
        </Pressable>

        {/* Delete Account Button */}
        <Pressable
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
          style={({ pressed }) => ({
            marginHorizontal: Spacing.lg,
            marginTop: Spacing.sm,
            padding: Spacing.md,
            alignItems: "center",
            opacity: pressed || isDeletingAccount ? 0.5 : 0.6,
          })}
        >
          {isDeletingAccount ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: Spacing.sm,
              }}
            >
              <ActivityIndicator size="small" color={colors.error} />
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.error,
                }}
              >
                Deleting account...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.error,
                textDecorationLine: "underline",
              }}
            >
              Delete
            </Text>
          )}
        </Pressable>

        {/* Footer */}
        <Text
          style={{
            fontSize: Typography.sizes.xs,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: Spacing.md,
          }}
        >
          Made with 💛 for VTU Services
        </Text>
      </ScrollView>
      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setPinInput("");
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: Radius.lg,
              padding: Spacing.xl,
              width: "85%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.xl,
                fontWeight: Typography.weights.bold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Confirm Deletion
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                marginBottom: Spacing.lg,
              }}
            >
              Enter your transaction PIN to delete your account
            </Text>
            <Input
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter 4-digit PIN"
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry={true}
              containerStyle={{ marginBottom: Spacing.lg }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: Spacing.sm,
              }}
            >
              <Pressable
                onPress={() => {
                  setShowPinModal(false);
                  setPinInput("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: Spacing.md,
                  backgroundColor: colors.border,
                  borderRadius: Radius.md,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: colors.text,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handlePinSubmit}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: Spacing.md,
                  backgroundColor: colors.error,
                  borderRadius: Radius.md,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: "#FFFFFF",
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText("");
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: Radius.lg,
              padding: Spacing.xl,
              width: "85%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.xl,
                fontWeight: Typography.weights.bold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Final Confirmation
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                marginBottom: Spacing.lg,
              }}
            >
              Type "DELETE" to confirm account deletion
            </Text>
            <Input
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder='Type "DELETE"'
              autoCapitalize="characters"
              containerStyle={{ marginBottom: Spacing.lg }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: Spacing.sm,
              }}
            >
              <Pressable
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: Spacing.md,
                  backgroundColor: colors.border,
                  borderRadius: Radius.md,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: colors.text,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteConfirmSubmit}
                style={({ pressed }) => ({
                  flex: 1,
                  padding: Spacing.md,
                  backgroundColor: colors.error,
                  borderRadius: Radius.md,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: "#FFFFFF",
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
