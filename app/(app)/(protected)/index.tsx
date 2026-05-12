// app/(app)/(protected)/index.tsx (HOME SCREEN - WITH TOAST INTEGRATION)
import { PlanCarousel } from "@/components/PlanCarousel";
import { Button, Card, Input, Toast } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import {
  getNetworkColorLight,
  getNetworkImage,
  getPlanColor,
  NETWORK_PREFIXES,
  quickAmounts,
} from "@/constants/helpers";
import { useDataPlansByNetwork } from "@/hooks/useDataPlans";
import { useNotifications } from "@/hooks/useNotifications";
import { useProfile } from "@/hooks/useProfiles";
import { usePurchaseAirtime, usePurchaseData } from "@/hooks/usePurchaseVTU";
import { useTheme } from "@/hooks/useTheme";
import { useTransactionPin } from "@/hooks/useTransactionPin"; // ADD THIS
import {
  useCreateVirtualAccount,
  useVirtualAccounts,
} from "@/hooks/useVirtualAccounts";
import { useWallet } from "@/hooks/useWallet";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function HomeScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useProfile();

  // ADD THIS HOOK - It handles all PIN operations
  const { validatePin, createPin, isCreatingPin } = useTransactionPin();

  const {
    data: wallet,
    isLoading: isWalletLoading,
    refetch: refetchWallet,
  } = useWallet();
  const {
    data: virtualAccounts,
    isLoading: isVirtualAccountsLoading,
    refetch: refetchVirtualAccounts,
  } = useVirtualAccounts();
  const createVirtualAccount = useCreateVirtualAccount();

  // Get notifications data
  const { notifications } = useNotifications();

  // Service Selection State
  const [serviceType, setServiceType] = useState<"data" | "airtime">("data");
  const [network, setNetwork] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Add these new state variables at the top of your component:
  const [showBalance, setShowBalance] = useState(true);
  const [showAccountDetails, setShowAccountDetails] = useState(false);

  // Toast State
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Virtual Account States
  const [showCreateAccountForm, setShowCreateAccountForm] = useState(false);
  const hasVirtualAccount = (virtualAccounts?.length ?? 0) > 0;

  // Form States
  const [formData, setFormData] = useState({
    email: profile?.email || "",
    name: profile?.username || "",
    phoneNumber: "",
  });

  // Fetch data plans for selected network
  const { data: dataPlans = [], isLoading: isDataPlansLoading } =
    useDataPlansByNetwork(network);

  // Purchase hooks
  const purchaseDataMutation = usePurchaseData();
  const purchaseAirtimeMutation = usePurchaseAirtime();

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        email: profile.email || prev.email,
        name: profile.username || prev.name,
      }));
    }
  }, [profile]);

  // Auto-detect network from phone number
  useEffect(() => {
    if (phoneNumber.length >= 4) {
      let detected = false;

      for (const [networkKey, prefixes] of Object.entries(NETWORK_PREFIXES)) {
        for (const prefix of prefixes) {
          if (
            phoneNumber.startsWith(prefix) &&
            phoneNumber.length >= prefix.length
          ) {
            setNetwork(networkKey.toUpperCase());
            setSelectedPlanId(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            detected = true;
            break;
          }
        }
        if (detected) break;
      }

      if (!detected) {
        setNetwork("");
        setSelectedPlanId(null);
      }
    } else {
      setNetwork("");
      setSelectedPlanId(null);
    }
  }, [phoneNumber]);

  // Format phone number as user types
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    const limited = cleaned.substring(0, 11);
    setPhoneNumber(limited);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Refetch wallet, profile data, and virtual accounts
    await Promise.all([refetchWallet(), refetchVirtualAccounts()]);

    setRefreshing(false);
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Get selected plan details
  const selectedPlan = dataPlans.find(
    (plan) => plan.plan_id === selectedPlanId,
  );

  // ============================================
  // UPDATED handlePurchase Function for Your Existing System
  // Replace the existing handlePurchase function in index.tsx
  // Works with your process_data_purchase and process_airtime_purchase RPCs
  // ============================================

  const handlePurchase = async () => {
    // Validate wallet
    if (!wallet) {
      showToast("Unable to load wallet balance. Please try again.", "error");
      return;
    }

    // Determine purchase amount
    const purchaseAmount =
      serviceType === "data" ? selectedPlan?.price : parseFloat(amount || "0");

    if (!purchaseAmount || purchaseAmount <= 0) {
      showToast("Please select a valid amount.", "error");
      return;
    }

    // Check balance
    if (wallet.balance < purchaseAmount) {
      showToast(
        `Insufficient balance. You need ₦${purchaseAmount.toFixed(2)} but have ₦${wallet.balance.toFixed(2)}`,
        "error",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // ============================================
    // TRANSACTION PIN VALIDATION (NEW)
    // ============================================
    if (!profile) {
      showToast("Unable to load profile. Please try again.", "error");
      return;
    }

    if (profile?.transaction_pin) {
      if (!validatePin(transactionPin, profile.transaction_pin)) {
        showToast("❌ Invalid transaction PIN. Please try again.", "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTransactionPin("");
        return;
      }
    } else {
      try {
        await createPin({
          newPin: transactionPin,
          profileId: profile.id,
        });

        showToast("🎉 Transaction PIN created successfully!", "success");
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (error: any) {
        showToast(
          error.message || "Failed to create transaction PIN.",
          "error",
        );
        return;
      }
    }

    // ============================================
    // END TRANSACTION PIN VALIDATION
    // ============================================

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      if (serviceType === "data") {
        // Data purchase
        if (!selectedPlan) {
          throw new Error("Please select a data plan");
        }

        // Your existing RPC call handles everything (wallet deduction, transaction creation, VTU API call)
        const result = await purchaseDataMutation.mutateAsync({
          plan_id: selectedPlan.plan_id,
          phoneNumber: phoneNumber,
          transactionPin: transactionPin, // Pass PIN (for future backend validation if needed)
        });

        if (result.success) {
          showToast(
            `${selectedPlan.plan_name} data purchased successfully for ${phoneNumber}!`,
            "success",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Reset form
          setPhoneNumber("");
          setSelectedPlanId(null);
          setNetwork("");
          setTransactionPin(""); // Clear PIN input

          // Refresh wallet
          refetchWallet();
        } else {
          // Provider failed, user was refunded
          showToast(
            result.message ||
              "Purchase failed. Your balance has been refunded.",
            "error",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          refetchWallet(); // refresh so user sees their balance is still intact
        }
      } else {
        // Airtime purchase
        const result = await purchaseAirtimeMutation.mutateAsync({
          network: network,
          phoneNumber: phoneNumber,
          amount: purchaseAmount,
          transactionPin: transactionPin, // Pass PIN (for future backend validation if needed)
        });

        if (result.success) {
          showToast(
            `₦${purchaseAmount.toFixed(2)} airtime purchased successfully for ${phoneNumber}!`,
            "success",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Reset form
          setPhoneNumber("");
          setAmount("");
          setNetwork("");
          setTransactionPin(""); // Clear PIN input

          // Refresh wallet
          refetchWallet();
        } else {
          // Provider failed, user was refunded
          showToast(
            result.message ||
              "Purchase failed. Your balance has been refunded.",
            "error",
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          refetchWallet(); // refresh so user sees their balance is still intact
        }
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      showToast(
        error.message || "Transaction failed. Please try again.",
        "error",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Update to index.tsx - only the handleCreateAccount function

  const handleCreateAccount = async () => {
    setIsProcessing(true);

    try {
      const result = await createVirtualAccount.mutateAsync({
        fullName: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
      });

      showToast(
        result.message || "Virtual account created successfully!",
        "success",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchVirtualAccounts();

      setTimeout(() => {
        setShowCreateAccountForm(false);
      }, 2000);
    } catch (error: any) {
      showToast(error.message || "Failed to create virtual account", "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid =
    formData.name.trim().length >= 3 &&
    formData.phoneNumber.trim().length >= 11 &&
    formData.email.trim().length >= 5;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // const hasTransactionPin = !!profile?.transaction_pin;
  const [transactionPin, setTransactionPin] = useState("");
  const [showTransactionPin, setShowTransactionPin] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
        duration={5000}
      />

      {/* Header with Notification Bell */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingTop: Platform.OS === "android" ? Spacing.xxl : 0,
          paddingBottom: Spacing.md,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: Typography.sizes.lg,
              color: colors.textSecondary,
            }}
          >
            Welcome back,
          </Text>
          <Text
            style={{
              fontSize: Typography.sizes.xxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              textTransform: "capitalize",
            }}
          >
            {isProfileLoading ? "Loading..." : profile?.username || "User"} 👋
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(app)/(protected)/notifications");
          }}
          style={{
            width: 48,
            height: 48,
            backgroundColor: colors.card,
            borderRadius: Radius.full,
            alignItems: "center",
            justifyContent: "center",
            ...shadows.md,
          }}
        >
          <Text style={{ fontSize: 24 }}>🔔</Text>
          {/* Show badge only if there are unread notifications */}
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <View
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 18,
                height: 18,
                backgroundColor: colors.error,
                borderRadius: Radius.full,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  color: "#FFFFFF",
                }}
              >
                {notifications.filter((n) => !n.isRead).length > 9
                  ? "9+"
                  : notifications.filter((n) => !n.isRead).length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Wallet Balance Section */}
        <View
          style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.xl }}
        >
          <Card variant="elevated" padding="md">
            {/* Balance Header with Eye Icon */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-start",
                alignItems: "center",
                marginBottom: Spacing.xs,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                }}
              >
                Wallet Balance
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowBalance(!showBalance);
                }}
                style={{
                  padding: Spacing.xs,
                }}
              >
                <Text style={{ fontSize: 16 }}>
                  {showBalance ? "👁️" : "👁️‍🗨️"}
                </Text>
              </Pressable>
            </View>

            {/* Balance Amount with Plus Icon */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: Spacing.lg,
                gap: Spacing.md,
              }}
            >
              {isWalletLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={{
                    flex: 1,
                    fontSize: 42,
                    fontWeight: Typography.weights.bold,
                    color: colors.text,
                  }}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.5}
                >
                  {showBalance
                    ? formatCurrency(wallet?.balance || 0)
                    : "₦••••••"}
                </Text>
              )}
              {/* Plus Icon to Toggle Account Details */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowAccountDetails(!showAccountDetails);
                }}
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: colors.primary,
                  borderRadius: Radius.full,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadows.md,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    color: "#FFFFFF",
                    transform: [
                      { rotate: showAccountDetails ? "45deg" : "0deg" },
                    ],
                  }}
                >
                  +
                </Text>
              </Pressable>
            </View>
            {/* Expandable Account Details or Create Form */}
            {showAccountDetails && (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: Spacing.lg,
                }}
              >
                {hasVirtualAccount ? (
                  // Show Existing Virtual Accounts
                  <View>
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginBottom: Spacing.md,
                      }}
                    >
                      Transfer money to this account to fund your wallet
                      instantly.
                    </Text>
                    {(virtualAccounts || []).map(
                      (account: any, index: number) => (
                        <View
                          key={index}
                          style={{
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: Radius.md,
                            padding: Spacing.md,
                            marginBottom: Spacing.sm,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: Spacing.md,
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
                              <Text style={{ color: "#FFFFFF", fontSize: 18 }}>
                                💳
                              </Text>
                            </View>
                          </View>

                          <View style={{ marginBottom: Spacing.sm }}>
                            <Text
                              style={{
                                fontSize: Typography.sizes.sm,
                                color: colors.textSecondary,
                                marginBottom: Spacing.xs,
                              }}
                            >
                              Account Number
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                backgroundColor: colors.card,
                                borderRadius: Radius.sm,
                                padding: Spacing.sm,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: Typography.sizes.base,
                                  fontWeight: Typography.weights.semibold,
                                  color: colors.text,
                                }}
                              >
                                {account.account_number}
                              </Text>
                              <Pressable
                                onPress={() => {
                                  Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light,
                                  );
                                  // TODO: Copy to clipboard
                                  showToast(
                                    `${account.account_number} copied!`,
                                    "success",
                                  );
                                }}
                              >
                                <Text
                                  style={{
                                    color: colors.primary,
                                    fontSize: 20,
                                  }}
                                >
                                  📋
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          <View>
                            <Text
                              style={{
                                fontSize: Typography.sizes.sm,
                                color: colors.textSecondary,
                                marginBottom: Spacing.xs,
                              }}
                            >
                              Account Name
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                backgroundColor: colors.card,
                                borderRadius: Radius.sm,
                                padding: Spacing.sm,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: Typography.sizes.base,
                                  color: colors.text,
                                }}
                              >
                                {account.account_name}
                              </Text>
                              <Pressable
                                onPress={() => {
                                  Haptics.impactAsync(
                                    Haptics.ImpactFeedbackStyle.Light,
                                  );
                                  // TODO: Copy to clipboard
                                  showToast(
                                    `${account.account_name} copied!`,
                                    "success",
                                  );
                                }}
                              >
                                <Text
                                  style={{
                                    color: colors.primary,
                                    fontSize: 20,
                                  }}
                                >
                                  📋
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ),
                    )}
                    <Text
                      style={{
                        fontSize: Typography.sizes.xs,
                        color: colors.textSecondary,
                        textAlign: "center",
                        marginTop: Spacing.sm,
                      }}
                    >
                      💡 Tip: Save this account number in your bank app for
                      quick transfers
                    </Text>
                  </View>
                ) : (
                  // Show Create Virtual Account Form
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: Spacing.md,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Typography.sizes.lg,
                          fontWeight: Typography.weights.bold,
                          color: colors.text,
                        }}
                      >
                        Create Virtual Account
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginBottom: Spacing.lg,
                      }}
                    >
                      Get your unique account number to fund your wallet easily
                    </Text>

                    {/* Form */}
                    <View style={{ gap: Spacing.md }}>
                      {/* Email */}
                      <View>
                        <Text
                          style={{
                            fontSize: Typography.sizes.sm,
                            color: colors.textSecondary,
                            marginBottom: Spacing.xs,
                          }}
                        >
                          Email Address
                        </Text>
                        <TextInput
                          value={formData.email}
                          onChangeText={(value) =>
                            handleFormChange("email", value)
                          }
                          style={{
                            height: 48,
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: Radius.sm,
                            paddingHorizontal: Spacing.md,
                            color: colors.text,
                          }}
                          placeholder="your@email.com"
                          placeholderTextColor={colors.textSecondary}
                          editable={!isProcessing}
                        />
                      </View>

                      {/* Full Name */}
                      <View>
                        <Text
                          style={{
                            fontSize: Typography.sizes.sm,
                            color: colors.textSecondary,
                            marginBottom: Spacing.xs,
                          }}
                        >
                          Username{" "}
                          <Text style={{ color: colors.error }}>*</Text>
                        </Text>
                        <TextInput
                          value={formData.name}
                          onChangeText={(value) =>
                            handleFormChange("name", value)
                          }
                          style={{
                            height: 48,
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: Radius.sm,
                            paddingHorizontal: Spacing.md,
                            color: colors.text,
                          }}
                          placeholder="John Doe"
                          placeholderTextColor={colors.textSecondary}
                          editable={!isProcessing}
                        />
                      </View>

                      {/* Phone Number */}
                      <View>
                        <Text
                          style={{
                            fontSize: Typography.sizes.sm,
                            color: colors.textSecondary,
                            marginBottom: Spacing.xs,
                          }}
                        >
                          Phone Number{" "}
                          <Text style={{ color: colors.error }}>*</Text>
                        </Text>
                        <TextInput
                          value={formData.phoneNumber}
                          onChangeText={(value) =>
                            handleFormChange("phoneNumber", value)
                          }
                          style={{
                            height: 48,
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: Radius.sm,
                            paddingHorizontal: Spacing.md,
                            color: colors.text,
                          }}
                          placeholder="08012345678"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          maxLength={11}
                          editable={!isProcessing}
                        />
                      </View>

                      {/* Submit Button */}
                      <Button
                        title={
                          isProcessing
                            ? "Creating..."
                            : "Create Virtual Account"
                        }
                        onPress={handleCreateAccount}
                        disabled={!isFormValid || isProcessing}
                        variant="primary"
                        size="md"
                        fullWidth
                        loading={isProcessing}
                      />

                      {/* Info Box */}
                      <View
                        style={{
                          backgroundColor: colors.primary + "20",
                          borderWidth: 1,
                          borderColor: colors.primary + "40",
                          borderRadius: Radius.md,
                          padding: Spacing.md,
                          marginTop: Spacing.sm,
                        }}
                      >
                        {/* <Text
                          style={{
                            fontSize: Typography.sizes.xs,
                            color: colors.textSecondary,
                            marginBottom: Spacing.xs,
                          }}
                        >
                          🔒 Your information is secure and encrypted.
                        </Text> */}
                        <Text
                          style={{
                            fontSize: Typography.sizes.xs,
                            color: colors.textSecondary,
                          }}
                        >
                          ⚠️ Your information is only used to create your
                          virtual account with our banking partners (PalmPay).
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </Card>
        </View>

        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.base,
              fontWeight: Typography.weights.semibold,
              color: colors.text,
              marginBottom: Spacing.md,
            }}
          >
            Select Service
          </Text>
          <View style={{ flexDirection: "row", gap: 0 }}>
            <Pressable
              // key={'data'}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setServiceType("data");
                setSelectedPlanId(null);
                setAmount("");
                setNetwork("");
                setPhoneNumber("");
              }}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor:
                  serviceType === "data" ? colors.primary : colors.card,
                paddingVertical: Spacing.md,
                borderRadius: Radius.md,
                borderBottomRightRadius: 0,
                borderTopRightRadius: 0,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
                ...shadows.sm,
                // borderWidth: 2,
                // borderColor:
                //   serviceType === "data" ? colors.primary : colors.border,
              })}
            >
              <Text style={{ fontSize: 16, marginBottom: Spacing.xs }}>📱</Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: serviceType === "data" ? "#FFFFFF" : colors.text,
                  textTransform: "capitalize",
                }}
              >
                Buy Data
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                // key={'airtime'}
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setServiceType("airtime");
                setSelectedPlanId(null);
                setAmount("");
                setNetwork("");
                setPhoneNumber("");
              }}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor:
                  serviceType === "airtime" ? colors.primary : colors.card,
                paddingVertical: Spacing.md,
                borderRadius: Radius.md,
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
                ...shadows.sm,
              })}
            >
              <Text style={{ fontSize: 16, marginBottom: Spacing.xs }}>📞</Text>
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  fontWeight: Typography.weights.semibold,
                  color: serviceType === "airtime" ? "#FFFFFF" : colors.text,
                  textTransform: "capitalize",
                }}
              >
                Buy Airtime
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Phone Number Input with Dynamic Network Logo */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}
        >
          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="numeric"
            leftIcon={
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 24,
                  backgroundColor: colors.backgroundSecondary,
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                  ...shadows.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                {getNetworkImage(network.toLowerCase()) ? (
                  <Image
                    source={getNetworkImage(network.toLowerCase())!}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={{ fontSize: 24 }}>📱</Text>
                )}
              </View>
            }
          />
        </View>

        {/* Data Plan Selection Grid (Only for Data) */}
        {/* {serviceType === "data" && (
          <View
            style={{ paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.md,
                paddingHorizontal: Spacing.lg,
              }}
            >
              Select Data Plan
            </Text>
            {network ? (
              <>
                <View style={{ paddingHorizontal: Spacing.md }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: Spacing.md,
                      backgroundColor: getNetworkColorLight(network),
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.sm,
                      borderRadius: Radius.full,
                      alignSelf: "flex-start",
                    }}
                  >
                    {getNetworkImage(network.toLowerCase()) && (
                      <Image
                        source={getNetworkImage(network.toLowerCase())!}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: Radius.full,
                          marginRight: Spacing.xs,
                        }}
                        resizeMode="contain"
                      />
                    )}
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        fontWeight: Typography.weights.semibold,
                        color: colors.primary,
                        textTransform: "uppercase",
                      }}
                    >
                      {network} Plans
                    </Text>
                  </View>
                </View>

                {isDataPlansLoading ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.lg,
                    }}
                  >
                    <ActivityIndicator color={colors.primary} />
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginTop: Spacing.md,
                      }}
                    >
                      Loading plans...
                    </Text>
                  </View>
                ) : dataPlans.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      gap: Spacing.sm,
                    }}
                  >
                    {dataPlans.map((plan, index) => {
                      const planColor = getPlanColor(index);
                      const isSelected = selectedPlanId === plan.plan_id;
                      return (
                        <Pressable
                          key={`${plan.plan_id}-${plan.price}`}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Medium,
                            );
                            setSelectedPlanId(plan.plan_id);
                          }}
                          style={({ pressed }) => ({
                            width: "30%",
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.card,
                            borderRadius: Radius.xs,
                            padding: Spacing.md,
                            opacity: pressed ? 0.7 : 1,
                            ...shadows.md,
                          })}
                        >
                          <Text
                            style={{
                              fontSize: Typography.sizes.xs * 1.33,
                              fontWeight: Typography.weights.bold,
                              color: isSelected ? "#FFFFFF" : colors.text,
                              marginBottom: Spacing.xs / 2,
                            }}
                          >
                            {plan.plan_name}
                          </Text>

                          <Text
                            style={{
                              fontSize: Typography.sizes.sm,
                              fontWeight: Typography.weights.semibold,
                              color: isSelected ? "#FFFFFF" : planColor,
                              marginBottom: Spacing.xs / 2,
                            }}
                          >
                            ₦{plan.price.toLocaleString()}
                          </Text>

                          <Text
                            style={{
                              fontSize: Typography.sizes.xs,
                              color: isSelected
                                ? "rgba(255, 255, 255, 0.8)"
                                : colors.textSecondary,
                            }}
                          >
                            {plan.validity}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.lg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.base,
                        color: colors.textSecondary,
                      }}
                    >
                      No plans available
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: Radius.md,
                  padding: Spacing.xl,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>
                  📱
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Enter a phone number to see available plans
                </Text>
              </View>
            )}
          </View>
        )} */}
        {serviceType === "data" && (
          <View
            style={{ paddingHorizontal: Spacing.sm, marginBottom: Spacing.lg }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
                marginBottom: Spacing.md,
                paddingHorizontal: Spacing.lg,
              }}
            >
              Select Data Plan
            </Text>
            {network ? (
              <>
                <View style={{ paddingHorizontal: Spacing.md }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: Spacing.md,
                      backgroundColor: getNetworkColorLight(network),
                      paddingHorizontal: Spacing.md,
                      paddingVertical: Spacing.sm,
                      borderRadius: Radius.full,
                      alignSelf: "flex-start",
                    }}
                  >
                    {getNetworkImage(network.toLowerCase()) && (
                      <Image
                        source={getNetworkImage(network.toLowerCase())!}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: Radius.full,
                          marginRight: Spacing.xs,
                        }}
                        resizeMode="contain"
                      />
                    )}
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        fontWeight: Typography.weights.semibold,
                        color: colors.primary,
                        textTransform: "uppercase",
                      }}
                    >
                      {network} Plans
                    </Text>
                  </View>
                </View>

                {isDataPlansLoading ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.lg,
                    }}
                  >
                    <ActivityIndicator color={colors.primary} />
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        marginTop: Spacing.md,
                      }}
                    >
                      Loading plans...
                    </Text>
                  </View>
                ) : dataPlans.length > 0 ? (
                  <PlanCarousel
                    plans={dataPlans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={(planId) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedPlanId(planId);
                    }}
                    colors={colors}
                    shadows={shadows}
                  />
                ) : (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: Spacing.lg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.base,
                        color: colors.textSecondary,
                      }}
                    >
                      No plans available
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View
                style={{
                  backgroundColor: colors.card,
                  borderRadius: Radius.md,
                  padding: Spacing.xl,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>
                  📱
                </Text>
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Enter a phone number to see available plans
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Airtime Amount (Only for Airtime) */}
        {serviceType === "airtime" && (
          <>
            <View
              style={{
                paddingHorizontal: Spacing.lg,
                marginBottom: Spacing.md,
              }}
            >
              <Input
                label="Amount"
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                leftIcon={<Text>₦</Text>}
              />
            </View>

            <View
              style={{
                paddingHorizontal: Spacing.lg,
                marginBottom: Spacing.lg,
              }}
            >
              <Text
                style={{
                  fontSize: Typography.sizes.sm,
                  color: colors.textSecondary,
                  marginBottom: Spacing.sm,
                }}
              >
                Quick Select
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: Spacing.sm,
                }}
              >
                {quickAmounts.map((amt) => (
                  <Pressable
                    key={amt}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setAmount(amt);
                    }}
                    style={{
                      backgroundColor:
                        amount === amt ? colors.primaryLight : colors.card,
                      paddingVertical: Spacing.sm,
                      paddingHorizontal: Spacing.lg,
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor:
                        amount === amt ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.base,
                        fontWeight: Typography.weights.semibold,
                        color: amount === amt ? colors.primary : colors.text,
                      }}
                    >
                      ₦{amt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Purchase Button */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}
        >
          {serviceType && (
            <Input
              label={
                profile?.transaction_pin
                  ? "Enter Transaction PIN"
                  : "Create Transaction PIN"
              }
              placeholder="••••"
              value={transactionPin}
              onChangeText={(text) =>
                setTransactionPin(text.replace(/[^0-9]/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              secureTextEntry={!showTransactionPin}
              rightIcon={
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTransactionPin(!showTransactionPin);
                  }}
                >
                  <Text style={{ fontSize: 20 }}>
                    {showTransactionPin ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              maxLength={4}
              containerStyle={{ marginBottom: Spacing.md }}
            />
          )}

          <Button
            title={serviceType === "data" ? "Buy Data Now" : "Buy Airtime Now"}
            onPress={handlePurchase}
            loading={
              isProcessing ||
              purchaseDataMutation.isPending ||
              purchaseAirtimeMutation.isPending
            }
            disabled={
              !network ||
              !phoneNumber ||
              (serviceType === "data" ? !selectedPlanId : !amount) ||
              isProcessing ||
              purchaseDataMutation.isPending ||
              purchaseAirtimeMutation.isPending ||
              !transactionPin ||
              transactionPin.length !== 4
            }
            fullWidth
            size="md"
          />
        </View>

        {/* Quick Actions Section */}
        <View
          style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.lg,
              fontWeight: Typography.weights.bold,
              color: colors.text,
              marginBottom: Spacing.md,
            }}
          >
            Quick Actions
          </Text>

          <View style={{ gap: Spacing.md }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(app)/(protected)/transaction-history");
              }}
              style={{
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                padding: Spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                ...shadows.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: colors.primary + "20",
                    borderRadius: Radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: Spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>📊</Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: Typography.sizes.base,
                      fontWeight: Typography.weights.semibold,
                      color: colors.text,
                      marginBottom: Spacing.xs / 2,
                    }}
                  >
                    Transaction History
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    View all your purchases
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }}>›</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(app)/(protected)/settings");
              }}
              style={{
                backgroundColor: colors.card,
                borderRadius: Radius.md,
                padding: Spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                ...shadows.sm,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    backgroundColor: colors.success + "20",
                    borderRadius: Radius.md,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: Spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: Typography.sizes.base,
                      fontWeight: Typography.weights.semibold,
                      color: colors.text,
                      marginBottom: Spacing.xs / 2,
                    }}
                  >
                    Profile & Settings
                  </Text>
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    Manage your account
                  </Text>
                </View>
              </View>
              <Text style={{ color: colors.textSecondary }}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
