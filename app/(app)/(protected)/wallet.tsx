// app/(app)/(protected)/wallet.tsx
import { Button, Card } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import {
  useCreateVirtualAccount,
  useVirtualAccounts,
} from "@/hooks/useVirtualAccounts";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function WalletScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();

  // Fetch profile and virtual accounts
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const {
    data: virtualAccounts,
    isLoading: isVirtualAccountsLoading,
    refetch: refetchVirtualAccounts,
  } = useVirtualAccounts();
  const createVirtualAccountMutation = useCreateVirtualAccount();

  // State
  const [isProcessing, setIsProcessing] = useState(false);

  // Has virtual account
  const hasVirtualAccount = (virtualAccounts?.length ?? 0) > 0;

  const handleCreateAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      // ✅ No parameters needed - uses logged-in user
      await createVirtualAccountMutation.mutateAsync();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        "Virtual account created successfully! You can now fund your wallet.",
      );

      // Refetch virtual accounts
      await refetchVirtualAccounts();
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Create account error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create virtual account. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.lg,
          }}
        >
          {/* Loading State */}
          {isVirtualAccountsLoading ? (
            <Card variant="elevated" padding="lg">
              <View
                style={{ alignItems: "center", paddingVertical: Spacing.xl }}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                    marginTop: Spacing.md,
                  }}
                >
                  Loading wallet details...
                </Text>
              </View>
            </Card>
          ) : hasVirtualAccount ? (
            // EXISTING VIRTUAL ACCOUNTS
            <View>
              <View style={{ marginBottom: Spacing.lg }}>
                <Text
                  style={{
                    fontSize: Typography.sizes.lg,
                    fontWeight: Typography.weights.bold,
                    color: colors.text,
                    marginBottom: Spacing.xs,
                  }}
                >
                  💰 Your Virtual Account
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.textSecondary,
                  }}
                >
                  Transfer money to fund your wallet instantly
                </Text>
              </View>

              {(virtualAccounts || []).map((account: any, index: number) => (
                <Card
                  key={index}
                  variant="elevated"
                  padding="lg"
                  style={{ marginBottom: Spacing.lg }}
                >
                  {/* Bank Name Header */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: Spacing.lg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.lg,
                        fontWeight: Typography.weights.semibold,
                        color: colors.primary,
                      }}
                    >
                      {account.bank_name}
                    </Text>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        backgroundColor: colors.primary,
                        borderRadius: Radius.full,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 18 }}>💳</Text>
                    </View>
                  </View>

                  {/* Account Number */}
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginBottom: Spacing.sm,
                      }}
                    >
                      Account Number
                    </Text>
                    <Pressable
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: colors.backgroundSecondary,
                        borderRadius: Radius.md,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Typography.sizes.lg,
                          fontWeight: Typography.weights.bold,
                          color: colors.text,
                          flex: 1,
                          letterSpacing: 2,
                        }}
                      >
                        {account.account_number}
                      </Text>
                      <Text style={{ fontSize: 20, marginLeft: Spacing.md }}>
                        📋
                      </Text>
                    </Pressable>
                  </View>

                  {/* Account Name */}
                  <View style={{ marginBottom: Spacing.lg }}>
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginBottom: Spacing.sm,
                      }}
                    >
                      Account Name
                    </Text>
                    <Pressable
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: colors.backgroundSecondary,
                        borderRadius: Radius.md,
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Typography.sizes.base,
                          color: colors.text,
                          flex: 1,
                        }}
                      >
                        {account.account_name}
                      </Text>
                      <Text style={{ fontSize: 20, marginLeft: Spacing.md }}>
                        📋
                      </Text>
                    </Pressable>
                  </View>

                  {/* Info Box */}
                  <View
                    style={{
                      backgroundColor: colors.success + "10",
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor: colors.success + "40",
                      padding: Spacing.md,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.xs,
                        color: colors.textSecondary,
                        lineHeight: 18,
                      }}
                    >
                      💡{" "}
                      <Text style={{ fontWeight: Typography.weights.bold }}>
                        Tip:
                      </Text>{" "}
                      Save this account number in your bank app for quick and
                      easy transfers. Any money sent to this account will be
                      automatically credited to your wallet.
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            // CREATE VIRTUAL ACCOUNT - ONE CLICK (No form needed)
            <View>
              <View style={{ marginBottom: Spacing.lg }}>
                <Text
                  style={{
                    fontSize: Typography.sizes.lg,
                    fontWeight: Typography.weights.bold,
                    color: colors.text,
                    marginBottom: Spacing.xs,
                  }}
                >
                  Create Virtual Account
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.textSecondary,
                  }}
                >
                  One-click setup to fund your wallet instantly
                </Text>
              </View>

              {/* Info Card */}
              <Card
                variant="elevated"
                padding="md"
                style={{ marginBottom: Spacing.lg }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  A virtual account allows you to fund your wallet directly via
                  bank transfer. We partner with{" "}
                  <Text style={{ fontWeight: Typography.weights.bold }}>
                    PalmPay
                  </Text>{" "}
                  to provide you with a dedicated account number.
                </Text>
              </Card>

              {/* Security Info */}
              <Card
                variant="outlined"
                padding="md"
                style={{
                  marginBottom: Spacing.lg,
                  backgroundColor: colors.primary + "05",
                  borderColor: colors.primary + "40",
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.textSecondary,
                    lineHeight: 18,
                  }}
                >
                  🔒 Your information is secure and encrypted. We only share it
                  with our banking partners (PalmPay) to create your virtual
                  account.
                </Text>
              </Card>

              {/* Create Button - One Click */}
              <Button
                title={
                  isProcessing
                    ? "Creating Virtual Account..."
                    : "Create Virtual Account →"
                }
                onPress={handleCreateAccount}
                loading={isProcessing}
                disabled={isProcessing}
                fullWidth
                size="md"
              />
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}