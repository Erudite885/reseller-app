// app/(app)/(protected)/wallet.tsx
import { Button, Card, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import {
  useCreateVirtualAccount,
  useVirtualAccounts,
} from "@/hooks/useVirtualAccounts";
// import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    email: profile?.email || "",
    name: profile?.username || "",
    phoneNumber: "",
    bvn: "",
    nin: "",
  });

  // Track which ID type user chose
  const [idType, setIdType] = useState<"bvn" | "nin" | null>(null);

  // Has virtual account
  const hasVirtualAccount = (virtualAccounts?.length ?? 0) > 0;

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

  // Form validation
  const isFormValid =
    formData.name.trim() &&
    formData.phoneNumber.trim() &&
    formData.phoneNumber.length === 11 &&
    (formData.bvn.trim() || formData.nin.trim());

  const handleFormChange = (field: string, value: string) => {
    if (field === "bvn") {
      if (value) {
        setIdType("bvn");
        setFormData({ ...formData, bvn: value, nin: "" });
      } else {
        if (idType === "bvn") setIdType(null);
        setFormData({ ...formData, bvn: value });
      }
    } else if (field === "nin") {
      if (value) {
        setIdType("nin");
        setFormData({ ...formData, nin: value, bvn: "" });
      } else {
        if (idType === "nin") setIdType(null);
        setFormData({ ...formData, nin: value });
      }
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreateAccount = async () => {
    if (!isFormValid) {
      displayToast("Please fill in all required fields");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      await createVirtualAccountMutation.mutateAsync({
        fullName: formData.name,
        phoneNumber: formData.phoneNumber,
        bvn: formData.bvn || undefined,
        nin: formData.nin || undefined,
        email: formData.email,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        "Virtual account created successfully! You can now fund your wallet.",
      );

      // Clear form
      setFormData({
        email: profile?.email || "",
        name: profile?.username || "",
        phoneNumber: "",
        bvn: "",
        nin: "",
      });
      setIdType(null);

      // Refetch virtual accounts
      refetchVirtualAccounts();
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

  // const handleCopyToClipboard = async (text: string, label: string) => {
  //   try {
  //     await Clipboard.setStringAsync(text);
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //     displayToast(`${label} copied to clipboard!`);
  //   } catch (error) {
  //     displayToast("Failed to copy");
  //   }
  // };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        {/* <View
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
          <Pressable onPress={() => router.back()}>
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
            Wallet Settings
          </Text>
          <View style={{ width: 40 }} />
        </View> */}

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
                      // onPress={() =>
                      //   handleCopyToClipboard(
                      //     account.account_number,
                      //     "Account number",
                      //   )
                      // }
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
                      // onPress={() =>
                      //   handleCopyToClipboard(
                      //     account.account_name,
                      //     "Account name",
                      //   )
                      // }
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

                  {/* Account Type */}
                  {/* <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingVertical: Spacing.md,
                      paddingHorizontal: Spacing.md,
                      backgroundColor: colors.primary + "10",
                      borderRadius: Radius.md,
                      borderWidth: 1,
                      borderColor: colors.primary + "40",
                      marginBottom: Spacing.lg,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      Account Type
                    </Text>
                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        fontWeight: Typography.weights.semibold,
                        color: colors.primary,
                      }}
                    >
                      {account.account_type === "static"
                        ? "Static Account"
                        : "Dynamic Account"}
                    </Text>
                  </View> */}

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
            // CREATE VIRTUAL ACCOUNT FORM
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
                  Get your unique account number to fund your wallet instantly
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

              {/* Form Fields */}
              <View style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
                {/* Email */}
                <Input
                  label="Email Address"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChangeText={(text) => handleFormChange("email", text)}
                  editable={!isProcessing}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Text>📧</Text>}
                />

                {/* Full Name */}
                <Input
                  label="Full Name *"
                  placeholder="John Doe"
                  value={formData.name}
                  onChangeText={(text) => handleFormChange("name", text)}
                  editable={!isProcessing}
                  leftIcon={<Text>👤</Text>}
                />

                {/* Phone Number */}
                <Input
                  label="Phone Number *"
                  placeholder="08012345678"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleFormChange("phoneNumber", text)}
                  editable={!isProcessing}
                  keyboardType="numeric"
                  maxLength={11}
                  leftIcon={<Text>📱</Text>}
                />

                {/* BVN Section */}
                <Card
                  variant="outlined"
                  padding="md"
                  style={{
                    backgroundColor: colors.primary + "05",
                    borderColor: colors.primary + "40",
                  }}
                >
                  <View style={{ gap: Spacing.md }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: Spacing.sm,
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>ℹ️</Text>
                      <Text
                        style={{
                          fontSize: Typography.sizes.xs,
                          color: colors.textSecondary,
                          flex: 1,
                          lineHeight: 18,
                        }}
                      >
                        You need to provide your{" "}
                        <Text style={{ fontWeight: Typography.weights.bold }}>
                          BVN{" "}
                        </Text>
                        to create a virtual account.
                      </Text>
                    </View>

                    {/* BVN Input */}
                    <Input
                      label="BVN"
                      placeholder="11 digits"
                      value={formData.bvn}
                      onChangeText={(text) => handleFormChange("bvn", text)}
                      editable={!isProcessing && idType !== "nin"}
                      keyboardType="numeric"
                      maxLength={11}
                      leftIcon={<Text>🆔</Text>}
                      containerStyle={{
                        opacity: idType === "nin" ? 0.5 : 1,
                      }}
                    />

                    {/* NIN Input */}
                    {/* <Input
                      label="NIN"
                      placeholder="11 digits"
                      value={formData.nin}
                      onChangeText={(text) => handleFormChange("nin", text)}
                      editable={!isProcessing && idType !== "bvn"}
                      keyboardType="numeric"
                      maxLength={11}
                      leftIcon={<Text>🆔</Text>}
                      containerStyle={{
                        opacity: idType === "bvn" ? 0.5 : 1,
                      }}
                    /> */}

                    {/* Selected ID Type */}
                    {idType && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: Spacing.sm,
                          backgroundColor: colors.success + "10",
                          paddingHorizontal: Spacing.md,
                          paddingVertical: Spacing.sm,
                          borderRadius: Radius.md,
                          borderWidth: 1,
                          borderColor: colors.success + "40",
                        }}
                      >
                        <Text style={{ fontSize: 14 }}>✓</Text>
                        <Text
                          style={{
                            fontSize: Typography.sizes.sm,
                            color: colors.success,
                            fontWeight: Typography.weights.semibold,
                          }}
                        >
                          Using {idType.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>

                {/* Security Info */}
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
                    🔒 Your information is secure and encrypted. We only share
                    it with our banking partners (PalmPay) to create your
                    virtual account.
                  </Text>
                </Card>
              </View>

              {/* Create Button */}
              <Button
                title={
                  isProcessing
                    ? "Creating Virtual Account..."
                    : "Create Virtual Account"
                }
                onPress={handleCreateAccount}
                loading={isProcessing}
                disabled={!isFormValid || isProcessing}
                fullWidth
                size="md"
              />
            </View>
          )}

          {/* Bottom Padding */}
          <View style={{ height: Spacing.xl }} />
        </ScrollView>

        {/* Toast */}
        {showToast && (
          <View
            style={{
              position: "absolute",
              bottom: Spacing.lg,
              left: Spacing.lg,
              right: Spacing.lg,
              backgroundColor: colors.success,
              borderRadius: Radius.md,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              alignItems: "center",
              ...shadows.lg,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
              }}
            >
              {toastMessage}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
