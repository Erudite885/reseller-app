// app/(app)/(protected)/profile.tsx
import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useProfile, useUpdateProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/auth.store";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function EditProfileScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  // Fetch profile and update mutation
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile?.username || "");
      setEmail(profile?.email || user?.email || "");
      setFullName(profile?.full_name || "");
      setPhoneNumber(profile?.phone_number || "");
    }
  }, [profile]);

  // Track if anything has changed
  useEffect(() => {
    const hasChanged =
      username !== (profile?.username || "") ||
      fullName !== (profile?.full_name || "") ||
      phoneNumber !== (profile?.phone_number || "");

    setHasChanges(hasChanged);
  }, [username, fullName, phoneNumber, profile]);

  const handleSaveProfile = async () => {
    if (!hasChanges) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("No Changes", "You haven't made any changes yet.");
      return;
    }

    if (!username.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Validation Error", "Username is required.");
      return;
    }

    if (username.trim().length < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert(
        "Validation Error",
        "Username must be at least 3 characters long.",
      );
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const updates: Record<string, string> = {};

      // Only include fields that changed
      if (username !== (profile?.username || "")) {
        updates.username = username.trim();
      }
      if (fullName !== (profile?.full_name || "")) {
        updates.full_name = fullName.trim();
      }
      if (phoneNumber !== (profile?.phone_number || "")) {
        updates.phone_number = phoneNumber.trim();
      }

      await updateProfileMutation.mutateAsync(updates);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        "Profile updated successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Email Change",
      "To change your email address, please contact our support team.",
      [
        {
          text: "Contact Support",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/(protected)/contact");
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
      ],
    );
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (hasChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          {
            text: "Keep Editing",
            style: "cancel",
            onPress: () =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            },
          },
        ],
      );
    } else {
      router.back();
    }
  };

  if (isProfileLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.md,
          marginTop:Spacing.xl,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={handleCancel}>
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: colors.primary,
              fontWeight: Typography.weights.semibold,
            }}
          >
            Cancel
          </Text>
        </Pressable>
        <Text
          style={{
            fontSize: Typography.sizes.lg,
            fontWeight: Typography.weights.bold,
            color: colors.text,
          }}
        >
          Edit Profile
        </Text>
        <Pressable
          onPress={handleSaveProfile}
          disabled={isSaving || !hasChanges}
        >
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color:
                isSaving || !hasChanges ? colors.textSecondary : colors.primary,
              fontWeight: Typography.weights.semibold,
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: Spacing.lg }}
      >
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg }}>
          {/* Profile Avatar */}
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary + "20",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
              }}
            >
              {user?.email}
            </Text>
          </View>

          {/* Username Field */}
          <View>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Username
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>@</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  fontSize: Typography.sizes.base,
                  color: colors.text,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              This is your public profile name
            </Text>
          </View>

          {/* Full Name Field */}
          {/* <View>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Full Name
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: Spacing.md,
              }}
            >
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  fontSize: Typography.sizes.base,
                  color: colors.text,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              Optional - Your real name
            </Text>
          </View> */}

          {/* Phone Number Field */}
          {/* <View>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Phone Number
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: Spacing.md,
              }}
            >
              <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>📱</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  fontSize: Typography.sizes.base,
                  color: colors.text,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              Optional - Your phone number
            </Text>
          </View> */}

          {/* Email Field - Read Only */}
          <View>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.sm,
              }}
            >
              Email Address
            </Text>
            <Pressable onPress={handleEmailPress}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: Radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: Spacing.md,
                  opacity: 0.6,
                }}
              >
                <Text style={{ fontSize: 16, marginRight: Spacing.sm }}>
                  📧
                </Text>
                <Text
                  style={{
                    flex: 1,
                    paddingVertical: Spacing.md,
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                  }}
                >
                  {email}
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.primary,
                    fontWeight: Typography.weights.semibold,
                  }}
                >
                  Help
                </Text>
              </View>
            </Pressable>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              Contact support to change your email
            </Text>
          </View>

          {/* Info Box */}
          <View
            style={{
              backgroundColor: colors.primary + "10",
              borderRadius: Radius.md,
              borderLeftWidth: 4,
              borderLeftColor: colors.primary,
              padding: Spacing.md,
              marginTop: Spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.text,
                fontWeight: Typography.weights.semibold,
                marginBottom: Spacing.sm,
              }}
            >
              💡 Profile Tips
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: colors.textSecondary,
                lineHeight: 18,
              }}
            >
              • Choose a unique username{"\n"}• Keep your phone number updated
              {"\n"}• Email changes require support assistance
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View
        style={{
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          marginBottom:Spacing.xl,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={handleSaveProfile}
          disabled={isSaving || !hasChanges}
          style={({ pressed }) => ({
            backgroundColor:
              isSaving || !hasChanges ? colors.card : colors.primary,
            paddingVertical: Spacing.md,
            borderRadius: Radius.lg,
            alignItems: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.bold,
                color:
                  isSaving || !hasChanges ? colors.textSecondary : "#FFFFFF",
              }}
            >
              Save Changes
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
