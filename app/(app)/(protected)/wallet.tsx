// app/(app)/(protected)/wallet.tsx
import { Button, Card, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { getCountryConfig } from "@/constants/countryConfig";
import { useFundWallet } from "@/hooks/useFundWallet";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import {
  useCreateVirtualAccount,
  useVirtualAccounts,
} from "@/hooks/useVirtualAccounts";
import { useResellerStore } from "@/store/resellerStore";
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

  // Funding is country-scoped. Nigeria's gateway (xixapay) issues virtual
  // accounts; every other country funds by mobile money through
  // global-store-fund-wallet (korapay / flutterwave), which returns a
  // checkout URL the customer completes in a browser. See TASK-8-BOARD.md
  // 8.f.ii - this replaces the "coming soon" fallback 8.e.iv added.
  const countryCode = useResellerStore.getState().config.countryCode;
  const country = getCountryConfig(countryCode);
  const isVirtualAccountCountry = country.paymentGateway.provider === "xixapay";

  // Fetch profile and virtual accounts
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const {
    data: virtualAccounts,
    isLoading: isVirtualAccountsLoading,
    refetch: refetchVirtualAccounts,
  } = useVirtualAccounts();
  const createVirtualAccountMutation = useCreateVirtualAccount();
  const fundWalletMutation = useFundWallet();

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  // Has virtual account
  const hasVirtualAccount = (virtualAccounts?.length ?? 0) > 0;

  // Flutterwave needs the payer's MSISDN up front; korapay (checkout
  // redirect) collects it on its own page. Mirrors the web storefront.
  const needsMobileNumber = country.paymentGateway.provider === "flutterwave";

  const handleFundWallet = async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert("Enter an amount", "Please enter an amount greater than 0.");
      return;
    }

    if (needsMobileNumber) {
      const digits = mobileNumber.replace(/\D/g, "");
      if (
        digits.length < country.phoneNumber.minDigits ||
        digits.length > country.phoneNumber.maxDigits
      ) {
        Alert.alert(
          "Check the number",
          `Enter a ${country.name} mobile money number (${country.phoneNumber.minDigits}-${country.phoneNumber.maxDigits} digits).`,
        );
        return;
      }
    }

    setIsProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await fundWalletMutation.mutateAsync({
        amount: parsed,
        mobileMoney: needsMobileNumber
          ? { number: mobileNumber.replace(/\D/g, "") }
          : undefined,
      });

      if (result?.data?.redirectUrl) {
        // The checkout sheet has closed. The webhook completes the deposit,
        // so the balance may land a moment later.
        Alert.alert(
          "Complete your payment",
          "Finish the payment in the browser, then your wallet will be credited automatically.",
        );
      } else {
        Alert.alert(
          "Payment started",
          "Follow the instructions from your mobile money provider. Your wallet will be credited once the payment is confirmed.",
        );
      }
      setAmount("");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Funding failed",
        error?.message || "Could not start the payment. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

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
          {!isVirtualAccountCountry ? (
            // MOBILE MONEY COUNTRY (korapay / flutterwave)
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
                  Add Money
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.textSecondary,
                  }}
                >
                  Fund your wallet in {country.name}
                </Text>
              </View>

              <Card
                variant="elevated"
                padding="lg"
                style={{ marginBottom: Spacing.lg }}
              >
                <Input
                  label="Amount"
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  editable={!isProcessing}
                />

                {needsMobileNumber && (
                  <Input
                    label="Mobile money number"
                    placeholder="Mobile money number"
                    keyboardType="phone-pad"
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    editable={!isProcessing}
                    containerStyle={{ marginTop: Spacing.lg }}
                    helperText={`${country.phoneNumber.minDigits}-${country.phoneNumber.maxDigits} digits`}
                  />
                )}

                <Text
                  style={{
                    fontSize: Typography.sizes.xs,
                    color: colors.textSecondary,
                    lineHeight: 18,
                    marginTop: Spacing.md,
                  }}
                >
                  You will be redirected to{" "}
                  {country.paymentGateway.provider === "flutterwave"
                    ? "Flutterwave"
                    : "Korapay"}{" "}
                  to complete the payment by mobile money. Your wallet is
                  credited automatically once the payment is confirmed.
                </Text>

                <Button
                  title={isProcessing ? "Starting payment..." : "Fund Wallet"}
                  onPress={handleFundWallet}
                  loading={isProcessing}
                  disabled={isProcessing}
                  fullWidth
                  size="md"
                  style={{ marginTop: Spacing.lg }}
                />
              </Card>

              <Card
                variant="outlined"
                padding="md"
                style={{
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
                  🔒 Your balance is safe and unaffected. Only the way you add
                  money differs by country.
                </Text>
              </Card>
            </View>
          ) : isVirtualAccountsLoading ? (
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