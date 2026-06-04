
// app/(app)/(protected)/security.tsx

import { Button, Input } from "@/components/ui";
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { useProfile } from "@/hooks/useProfiles";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  Switch,
  View,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CONSENT_STORAGE_KEY,
  revokeConsent,
  isConsentAccepted,
} from "@/components/EarningsConsentGate";
import { initialize, optIn, start, stop, optOut } from "@/module/pawns";

type SecuritySection = "password" | "pin" | "bandwidth" | "main";

// Bandwidth Sharing Toggle Component
function BandwidthSharingSection({
  colors,
  previewMode = false,
  onAcceptComplete,
}: {
  colors: any;
  previewMode?: boolean;
  onAcceptComplete?: () => void;
}) {
  const [visualEnabled, setVisualEnabled] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasRealConsent, setHasRealConsent] = useState(false);
  const [hasAttemptedFirstToggle, setHasAttemptedFirstToggle] = useState(false); // Track if user has toggled at least once

  // Load initial state
  // Load initial state
  // useEffect(() => {
  //   async function loadState() {
  //     try {
  //       // Check if user has actually accepted consent
  //       const accepted = await isConsentAccepted();
  //       setHasRealConsent(accepted);

  //       if (!previewMode) {
  //         // Normal mode - show actual state
  //         setIsEnabled(accepted);
  //       } else {
  //         // Preview mode - show OFF initially, not ON
  //         // This shows the toggle as OFF but with a preview banner
  //         setIsEnabled(false);
  //       }
  //     } catch (error) {
  //       console.error("[BandwidthSharing] Error loading state:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  //   loadState();
  // }, [previewMode]);

  useEffect(() => {
    async function loadState() {
      try {
        // Check if user has actually accepted consent
        const accepted = await isConsentAccepted();
        setHasRealConsent(accepted);

        if (!previewMode) {
          // Normal mode - show actual state
          setVisualEnabled(accepted);
        } else {
          // Preview mode - start with ON (visual only) to show user what enabling looks like
          setVisualEnabled(true);
          setHasAttemptedFirstToggle(false);
        }
      } catch (error) {
        console.error("[BandwidthSharing] Error loading state:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, [previewMode]);

  // const handleToggle = useCallback(
  //   async (value: boolean) => {
  //     if (isToggling || isAccepting) return;

  //     setIsToggling(true);
  //     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  //     try {
  //       if (value) {
  //         // User is trying to enable
  //         if (previewMode && !hasRealConsent) {
  //           // Coming from consent gate preview - this is the actual acceptance
  //           setIsAccepting(true);

  //           Alert.alert(
  //             "Enable Bandwidth Sharing",
  //             "You're about to enable bandwidth sharing. Please confirm you have reviewed and agree to the terms.",
  //             [
  //               {
  //                 text: "Cancel",
  //                 style: "cancel",
  //                 onPress: () => {
  //                   setIsEnabled(false);
  //                   setIsToggling(false);
  //                   setIsAccepting(false);
  //                 },
  //               },
  //               {
  //                 text: "I Agree",
  //                 onPress: async () => {
  //                   try {
  //                     // Initialize and start the Pawns SDK
  //                     await initialize();
  //                     await optIn();
  //                     await start();

  //                     // Store consent decision
  //                     await AsyncStorage.setItem(
  //                       CONSENT_STORAGE_KEY,
  //                       "accepted",
  //                     );
  //                     setHasRealConsent(true);

  //                     // Update UI state
  //                     setIsEnabled(true);

  //                     Haptics.notificationAsync(
  //                       Haptics.NotificationFeedbackType.Success,
  //                     );
  //                     Alert.alert(
  //                       "Success",
  //                       "Bandwidth sharing has been enabled! You can now earn rewards.",
  //                     );

  //                     // Callback to notify parent
  //                     if (onAcceptComplete) {
  //                       onAcceptComplete();
  //                     }
  //                   } catch (error) {
  //                     console.error(
  //                       "[BandwidthSharing] Accept error:",
  //                       error,
  //                     );
  //                     Haptics.notificationAsync(
  //                       Haptics.NotificationFeedbackType.Error,
  //                     );
  //                     Alert.alert(
  //                       "Error",
  //                       "Failed to enable bandwidth sharing. Please try again.",
  //                     );
  //                     setIsEnabled(false);
  //                   } finally {
  //                     setIsAccepting(false);
  //                     setIsToggling(false);
  //                   }
  //                 },
  //               },
  //             ],
  //           );
  //         } else if (hasRealConsent) {
  //           // Already have consent, just enabling the service
  //           try {
  //             await initialize();
  //             await optIn();
  //             await start();
  //             setIsEnabled(true);
  //             Haptics.notificationAsync(
  //               Haptics.NotificationFeedbackType.Success,
  //             );
  //           } catch (error) {
  //             console.error("[BandwidthSharing] Start error:", error);
  //             Alert.alert("Error", "Failed to start bandwidth sharing.");
  //             setIsEnabled(false);
  //           } finally {
  //             setIsToggling(false);
  //           }
  //         } else {
  //           // Should not happen - but just in case
  //           setIsEnabled(false);
  //           setIsToggling(false);
  //         }
  //       } else {
  //         // User is disabling
  //         Alert.alert(
  //           "Disable Bandwidth Sharing",
  //           "Are you sure you want to disable bandwidth sharing?\n\nYou will stop earning rewards from this feature immediately.",
  //           [
  //             {
  //               text: "Cancel",
  //               style: "cancel",
  //               onPress: () => {
  //                 setIsEnabled(true);
  //                 setIsToggling(false);
  //               },
  //             },
  //             {
  //               text: "Disable",
  //               style: "destructive",
  //               onPress: async () => {
  //                 try {
  //                   await stop();
  //                   await optOut();

  //                   // Only revoke consent if this is not preview mode or if they had real consent
  //                   if (!previewMode || hasRealConsent) {
  //                     await revokeConsent();
  //                     setHasRealConsent(false);
  //                   }

  //                   setIsEnabled(false);

  //                   Haptics.notificationAsync(
  //                     Haptics.NotificationFeedbackType.Success,
  //                   );
  //                   Alert.alert(
  //                     "Success",
  //                     "Bandwidth sharing has been disabled.",
  //                   );
  //                 } catch (error) {
  //                   console.error(
  //                     "[BandwidthSharing] Error disabling:",
  //                     error,
  //                   );
  //                   Haptics.notificationAsync(
  //                     Haptics.NotificationFeedbackType.Error,
  //                   );
  //                   Alert.alert(
  //                     "Error",
  //                     "Failed to disable bandwidth sharing. Please try again.",
  //                   );
  //                   setIsEnabled(true);
  //                 } finally {
  //                   setIsToggling(false);
  //                 }
  //               },
  //             },
  //           ],
  //         );
  //       }
  //     } catch (error) {
  //       console.error("[BandwidthSharing] Toggle error:", error);
  //       setIsToggling(false);
  //       setIsAccepting(false);
  //     }
  //   },
  //   [isToggling, isAccepting, previewMode, hasRealConsent, onAcceptComplete],
  // );

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (isToggling || isAccepting) return;

      setIsToggling(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        // PREVIEW MODE: First toggle (ON -> OFF) - just visual, no backend change
        if (previewMode && !hasRealConsent && !hasAttemptedFirstToggle) {
          console.log(
            "[BandwidthSharing] Preview mode - first toggle, visual only",
          );
          setVisualEnabled(false);
          setHasAttemptedFirstToggle(true);
          setIsToggling(false);
          return;
        }

        // PREVIEW MODE: Second toggle (OFF -> ON) - now actually enable
        if (
          previewMode &&
          !hasRealConsent &&
          hasAttemptedFirstToggle &&
          value
        ) {
          console.log(
            "[BandwidthSharing] Preview mode - second toggle, actually enabling",
          );
          setIsAccepting(true);

          Alert.alert(
            "Enable Bandwidth Sharing",
            "You're about to enable bandwidth sharing. Please confirm you have reviewed and agree to the terms.",
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setVisualEnabled(false);
                  // Keep hasAttemptedFirstToggle = true so toggle stays OFF,
                  // not back to the initial ON-preview state
                  setIsToggling(false);
                  setIsAccepting(false);
                },
              },
              {
                text: "I Agree",
                onPress: async () => {
                  try {
                    // Initialize and start the Pawns SDK
                    await initialize();
                    await optIn();
                    await start();

                    // Store consent decision
                    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
                    setHasRealConsent(true);

                    // Update UI state
                    setVisualEnabled(true);

                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    Alert.alert(
                      "Success",
                      "Bandwidth sharing has been enabled! You can now earn rewards.",
                    );

                    // Callback to notify parent
                    if (onAcceptComplete) {
                      onAcceptComplete();
                    }
                  } catch (error) {
                    console.error("[BandwidthSharing] Accept error:", error);
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Error,
                    );
                    Alert.alert(
                      "Error",
                      "Failed to enable bandwidth sharing. Please try again.",
                    );
                    setVisualEnabled(false);
                    setHasAttemptedFirstToggle(false);
                  } finally {
                    setIsAccepting(false);
                    setIsToggling(false);
                  }
                },
              },
            ],
          );
          return;
        }

        // Normal mode - already have consent
        if (hasRealConsent) {
          if (value) {
            // Enabling the service
            try {
              await initialize();
              await optIn();
              await start();
              setVisualEnabled(true);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch (error) {
              console.error("[BandwidthSharing] Start error:", error);
              Alert.alert("Error", "Failed to start bandwidth sharing.");
              setVisualEnabled(false);
            }
          } else {
            // Disabling the service
            Alert.alert(
              "Disable Bandwidth Sharing",
              "Are you sure you want to disable bandwidth sharing?\n\nYou will stop earning rewards from this feature immediately.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                    setVisualEnabled(true);
                    setIsToggling(false);
                  },
                },
                {
                  text: "Disable",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await stop();
                      await optOut();
                      await revokeConsent();
                      setHasRealConsent(false);
                      setVisualEnabled(false);
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success,
                      );
                      Alert.alert(
                        "Success",
                        "Bandwidth sharing has been disabled.",
                      );
                    } catch (error) {
                      console.error(
                        "[BandwidthSharing] Error disabling:",
                        error,
                      );
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Error,
                      );
                      Alert.alert(
                        "Error",
                        "Failed to disable bandwidth sharing. Please try again.",
                      );
                      setVisualEnabled(true);
                    } finally {
                      setIsToggling(false);
                    }
                  },
                },
              ],
            );
          }
        }
      } catch (error) {
        console.error("[BandwidthSharing] Toggle error:", error);
        setIsToggling(false);
        setIsAccepting(false);
      } finally {
        if (!isAccepting) {
          setIsToggling(false);
        }
      }
    },
    [
      isToggling,
      isAccepting,
      previewMode,
      hasRealConsent,
      hasAttemptedFirstToggle,
      onAcceptComplete,
    ],
  );

  // const getStatusText = () => {
  //   if (isLoading) return "Loading...";
  //   if (isAccepting) return "Enabling...";
  //   if (previewMode && !hasRealConsent && !isEnabled)
  //     return "Toggle to enable and accept terms";
  //   if (isEnabled) return "Active - You are earning rewards";
  //   return "Inactive - No rewards being earned";
  // };

  const getStatusText = () => {
    if (isLoading) return "Loading...";
    if (isAccepting) return "Enabling...";
    if (previewMode && !hasRealConsent && !hasAttemptedFirstToggle && visualEnabled)
      return "Preview — tap to turn off";
    if (previewMode && !hasRealConsent && hasAttemptedFirstToggle && !visualEnabled)
      return "Tap to enable bandwidth sharing";
    if (visualEnabled) return "Active - You are earning rewards";
    return "Inactive - No rewards being earned";
  };

  const getStatusColor = () => {
    if (visualEnabled) return colors.success;
    return colors.textTertiary;
  };

  if (isLoading) {
    return (
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: Radius.lg,
          padding: Spacing.lg,
          marginBottom: Spacing.md,
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // return (
  //   <View
  //     style={{
  //       backgroundColor: colors.card,
  //       borderRadius: Radius.lg,
  //       padding: Spacing.lg,
  //       marginBottom: Spacing.md,
  //     }}
  //   >
  //     <View
  //       style={{
  //         flexDirection: "row",
  //         alignItems: "center",
  //         justifyContent: "space-between",
  //       }}
  //     >
  //       <View style={{ flex: 1 }}>
  //         <View
  //           style={{
  //             flexDirection: "row",
  //             alignItems: "center",
  //             marginBottom: Spacing.xs,
  //           }}
  //         >
  //           <Text style={{ fontSize: 20, marginRight: 8 }}>🌐</Text>
  //           <Text
  //             style={{
  //               fontSize: Typography.sizes.base,
  //               fontWeight: Typography.weights.semibold,
  //               color: colors.text,
  //             }}
  //           >
  //             Bandwidth Sharing
  //           </Text>
  //         </View>
  //         <Text
  //           style={{
  //             fontSize: Typography.sizes.sm,
  //             color: colors.textSecondary,
  //             marginBottom: Spacing.xs,
  //           }}
  //         >
  //           Share idle bandwidth to earn rewards
  //         </Text>
  //         <View
  //           style={{
  //             flexDirection: "row",
  //             alignItems: "center",
  //             marginTop: Spacing.xs,
  //           }}
  //         >
  //           <View
  //             style={{
  //               width: 8,
  //               height: 8,
  //               borderRadius: 4,
  //               backgroundColor: getStatusColor(),
  //               marginRight: 6,
  //             }}
  //           />
  //           <Text
  //             style={{
  //               fontSize: Typography.sizes.xs,
  //               color: getStatusColor(),
  //             }}
  //           >
  //             {getStatusText()}
  //           </Text>
  //         </View>
  //       </View>
  //       <Switch
  //         value={isEnabled}
  //         onValueChange={handleToggle}
  //         trackColor={{ false: colors.disabled, true: colors.primary }}
  //         thumbColor="#FFFFFF"
  //         disabled={isToggling || isAccepting}
  //       />
  //     </View>

  //     {/* Preview mode info banner */}
  //     {previewMode && (
  //       <View
  //         style={{
  //           marginTop: Spacing.md,
  //           paddingTop: Spacing.sm,
  //           borderTopWidth: 1,
  //           borderTopColor: colors.border,
  //           backgroundColor: colors.primary + "10",
  //           borderRadius: Radius.sm,
  //           padding: Spacing.sm,
  //         }}
  //       >
  //         <Text
  //           style={{
  //             fontSize: Typography.sizes.xs,
  //             color: colors.textSecondary,
  //             lineHeight: 18,
  //             textAlign: "center",
  //           }}
  //         >
  //           💡 Toggle ON to review and accept the terms. Your bandwidth sharing
  //           will only start after you confirm.
  //         </Text>
  //       </View>
  //     )}

  //     {/* Info text when enabled */}
  //     {isEnabled && !previewMode && (
  //       <View
  //         style={{
  //           marginTop: Spacing.md,
  //           paddingTop: Spacing.sm,
  //           borderTopWidth: 1,
  //           borderTopColor: colors.border,
  //         }}
  //       >
  //         <Text
  //           style={{
  //             fontSize: Typography.sizes.xs,
  //             color: colors.textSecondary,
  //             lineHeight: 18,
  //           }}
  //         >
  //           💡 Your device is currently sharing idle bandwidth. This uses
  //           minimal resources and you earn rewards. You can disable this at any
  //           time.
  //         </Text>
  //       </View>
  //     )}

  //     {/* Info text when disabled (non-preview) */}
  //     {!isEnabled && !previewMode && (
  //       <View
  //         style={{
  //           marginTop: Spacing.md,
  //           paddingTop: Spacing.sm,
  //           borderTopWidth: 1,
  //           borderTopColor: colors.border,
  //         }}
  //       >
  //         <Text
  //           style={{
  //             fontSize: Typography.sizes.xs,
  //             color: colors.textSecondary,
  //             lineHeight: 18,
  //           }}
  //         >
  //           💡 Enable bandwidth sharing to earn rewards by sharing your idle
  //           internet connection. Your data is always encrypted and your privacy
  //           is protected.
  //         </Text>
  //       </View>
  //     )}
  //   </View>
  // );

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: Spacing.xs,
            }}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>🌐</Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.semibold,
                color: colors.text,
              }}
            >
              Bandwidth Sharing
            </Text>
          </View>
          <Text
            style={{
              fontSize: Typography.sizes.sm,
              color: colors.textSecondary,
              marginBottom: Spacing.xs,
            }}
          >
            Share idle bandwidth to earn rewards
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: Spacing.xs,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: getStatusColor(),
                marginRight: 6,
              }}
            />
            <Text
              style={{
                fontSize: Typography.sizes.xs,
                color: getStatusColor(),
              }}
            >
              {getStatusText()}
            </Text>
          </View>
        </View>
        <Switch
          value={visualEnabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.disabled, true: colors.primary }}
          thumbColor="#FFFFFF"
          disabled={isToggling || isAccepting}
        />
      </View>

      {/* Preview mode info banner */}
      {previewMode && !hasRealConsent && (
        <View
          style={{
            marginTop: Spacing.md,
            paddingTop: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.primary + "10",
            borderRadius: Radius.sm,
            padding: Spacing.sm,
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.xs,
              color: colors.textSecondary,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            {!hasAttemptedFirstToggle
              ? "💡 This is a preview — the toggle is ON but nothing is enabled yet. Tap it to turn it off, then tap again to actually enable bandwidth sharing."
              : "💡 Tap the toggle to enable bandwidth sharing and start earning rewards."}
          </Text>
        </View>
      )}

      {/* Info text when enabled */}
      {visualEnabled && !previewMode && (
        <View
          style={{
            marginTop: Spacing.md,
            paddingTop: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.xs,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            💡 Your device is currently sharing idle bandwidth. This uses
            minimal resources and you earn rewards. You can disable this at any
            time.
          </Text>
        </View>
      )}

      {/* Info text when disabled (non-preview) */}
      {!visualEnabled && !previewMode && !hasRealConsent && (
        <View
          style={{
            marginTop: Spacing.md,
            paddingTop: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: Typography.sizes.xs,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            💡 Enable bandwidth sharing to earn rewards by sharing your idle
            internet connection. Your data is always encrypted and your privacy
            is protected.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function SecurityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const storeSlug = useResellerStore.getState().config.storeName;
  const params = useLocalSearchParams();
  const previewMode = params.previewMode === "true";

  // Fetch profile to check if user has a transaction PIN
  const { data: profile } = useProfile();
  const hasTransactionPin = profile?.transaction_pin != null;
  const userType = profile?.account_type; // "reseller" or "customer"

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
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPinData({ ...pinData, [field]: cleaned });
    setPinErrors({ ...pinErrors, [field]: "" });
  };

  // PIN mutation - works for both resellers and customers
  const pinMutation = useMutation({
    mutationFn: async ({ newPinValue }: { newPinValue: string }) => {
      if (!user?.id || !profile?.id) throw new Error("No user found");

      if (userType === "reseller") {
        // Update reseller PIN
        const { error } = await supabase
          .from("resellers")
          .update({ transaction_pin: newPinValue })
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        // Update customer PIN
        const { error } = await supabase
          .from("reseller_customers")
          .update({ transaction_pin: newPinValue })
          .eq("id", profile.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile", user?.id, storeSlug],
      });
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
    if (password.length < 8)
      return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(password))
      return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(password))
      return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(password))
      return "Password must contain at least one number";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      return "Password must contain at least one special character (!@#$%^&*)";
    return null;
  };

  // PIN Validation
  const validatePin = (pin: string): string | null => {
    if (!pin) return "PIN is required";
    if (pin.length !== 4) return "PIN must be exactly 4 digits";
    if (!/^\d+$/.test(pin)) return "PIN must contain only numbers";
    return null;
  };

  // Handle Change Password
  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newErrors = { current: "", new: "", confirm: "" };

    if (!passwordData.current.trim())
      newErrors.current = "Current password is required";
    if (!passwordData.new.trim()) newErrors.new = "New password is required";
    if (!passwordData.confirm.trim())
      newErrors.confirm = "Please confirm your new password";

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
      if (!user?.email) throw new Error("User email not found");

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.current,
      });

      if (verifyError) throw new Error("Current password is incorrect");

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been changed successfully!", [
        {
          text: "OK",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPasswordData({ current: "", new: "", confirm: "" });
            setPasswordErrors({ current: "", new: "", confirm: "" });
            setCurrentSection("main");
          },
        },
      ]);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message?.includes("incorrect")) {
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

  // Handle Create/Change Transaction PIN
  const handlePinSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newErrors = { current: "", new: "", confirm: "" };

    const newPinError = validatePin(pinData.new);
    if (newPinError) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      newErrors.new = newPinError;
      setPinErrors(newErrors);
      return;
    }

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

    pinMutation.mutate({ newPinValue: pinData.new });
  };

  // Handle acceptance complete - go back to main screen
  const handleAcceptComplete = () => {
    // Navigate back to home/index page after successful enable
    router.replace("/(app)/(protected)");
  };

  // Show preview banner at top of security page when in preview mode
  const renderPreviewBanner = () => {
    if (!previewMode) return null;

    return (
      <View
        style={{
          backgroundColor: colors.primary + "15",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
          marginBottom: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.primary + "30",
        }}
      >
        <Text
          style={{
            fontSize: Typography.sizes.sm,
            color: colors.text,
            textAlign: "center",
            fontWeight: Typography.weights.medium,
          }}
        >
          👋 Welcome! Toggle the switch below to review and accept the bandwidth
          sharing terms.
        </Text>
      </View>
    );
  };

  // Main Security Menu
  if (currentSection === "main") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: Spacing.lg }}
        >
          {renderPreviewBanner()}

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

            {/* Bandwidth Sharing - New Section */}
            <BandwidthSharingSection
              colors={colors}
              previewMode={previewMode}
              onAcceptComplete={handleAcceptComplete}
            />
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
                • At least 8 characters long{"\n"}• Uppercase letter (A-Z){"\n"}
                • Lowercase letter (a-z){"\n"}• Number (0-9){"\n"}• Special
                character (!@#$%^&*)
              </Text>
            </View>

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
                    setShowPassword({ ...showPassword, new: !showPassword.new })
                  }
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPassword.new ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              }
              containerStyle={{ marginBottom: Spacing.lg }}
            />
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


// // app/(app)/(protected)/security.tsx

// import { Button, Input } from "@/components/ui";
// import { Radius, Spacing, Typography } from "@/constants/Colors";
// import { useProfile } from "@/hooks/useProfiles";
// import { useTheme } from "@/hooks/useTheme";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import * as Haptics from "expo-haptics";
// import { useRouter, useLocalSearchParams } from "expo-router";
// import { useState, useEffect, useCallback } from "react";
// import {
//   Alert,
//   KeyboardAvoidingView,
//   Platform,
//   Pressable,
//   SafeAreaView,
//   ScrollView,
//   Text,
//   Switch,
//   View,
//   ActivityIndicator,
// } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import {
//   CONSENT_STORAGE_KEY,
//   revokeConsent,
//   isConsentAccepted,
// } from "@/components/EarningsConsentGate";
// import { initialize, optIn, start, stop, optOut } from "@/module/pawns";

// type SecuritySection = "password" | "pin" | "bandwidth" | "main";

// // Bandwidth Sharing Toggle Component
// function BandwidthSharingSection({
//   colors,
//   previewMode = false,
//   onAcceptComplete,
// }: {
//   colors: any;
//   previewMode?: boolean;
//   onAcceptComplete?: () => void;
// }) {
//   const [isEnabled, setIsEnabled] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isToggling, setIsToggling] = useState(false);
//   const [isAccepting, setIsAccepting] = useState(false);
//   const [hasRealConsent, setHasRealConsent] = useState(false);

//   // Load initial state
//   // Load initial state
//   useEffect(() => {
//     async function loadState() {
//       try {
//         // Check if user has actually accepted consent
//         const accepted = await isConsentAccepted();
//         setHasRealConsent(accepted);

//         if (!previewMode) {
//           // Normal mode - show actual state
//           setIsEnabled(accepted);
//         } else {
//           // Preview mode - show OFF initially, not ON
//           // This shows the toggle as OFF but with a preview banner
//           setIsEnabled(false);
//         }
//       } catch (error) {
//         console.error("[BandwidthSharing] Error loading state:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     }
//     loadState();
//   }, [previewMode]);

//  const handleToggle = useCallback(
//    async (value: boolean) => {
//      if (isToggling || isAccepting) return;

//      setIsToggling(true);
//      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

//      try {
//        if (value) {
//          // User is trying to enable
//          if (previewMode && !hasRealConsent) {
//            // Coming from consent gate preview - this is the actual acceptance
//            setIsAccepting(true);

//            Alert.alert(
//              "Enable Bandwidth Sharing",
//              "You're about to enable bandwidth sharing. Please confirm you have reviewed and agree to the terms.",
//              [
//                {
//                  text: "Cancel",
//                  style: "cancel",
//                  onPress: () => {
//                    setIsEnabled(false);
//                    setIsToggling(false);
//                    setIsAccepting(false);
//                  },
//                },
//                {
//                  text: "I Agree",
//                  onPress: async () => {
//                    try {
//                      // Initialize and start the Pawns SDK
//                      await initialize();
//                      await optIn();
//                      await start();

//                      // Store consent decision
//                      await AsyncStorage.setItem(
//                        CONSENT_STORAGE_KEY,
//                        "accepted",
//                      );
//                      setHasRealConsent(true);

//                      // Update UI state
//                      setIsEnabled(true);

//                      Haptics.notificationAsync(
//                        Haptics.NotificationFeedbackType.Success,
//                      );
//                      Alert.alert(
//                        "Success",
//                        "Bandwidth sharing has been enabled! You can now earn rewards.",
//                      );

//                      // Callback to notify parent
//                      if (onAcceptComplete) {
//                        onAcceptComplete();
//                      }
//                    } catch (error) {
//                      console.error("[BandwidthSharing] Accept error:", error);
//                      Haptics.notificationAsync(
//                        Haptics.NotificationFeedbackType.Error,
//                      );
//                      Alert.alert(
//                        "Error",
//                        "Failed to enable bandwidth sharing. Please try again.",
//                      );
//                      setIsEnabled(false);
//                    } finally {
//                      setIsAccepting(false);
//                      setIsToggling(false);
//                    }
//                  },
//                },
//              ],
//            );
//          } else if (hasRealConsent) {
//            // Already have consent, just enabling the service
//            try {
//              await initialize();
//              await optIn();
//              await start();
//              setIsEnabled(true);
//              Haptics.notificationAsync(
//                Haptics.NotificationFeedbackType.Success,
//              );
//            } catch (error) {
//              console.error("[BandwidthSharing] Start error:", error);
//              Alert.alert("Error", "Failed to start bandwidth sharing.");
//              setIsEnabled(false);
//            } finally {
//              setIsToggling(false);
//            }
//          } else {
//            // Should not happen - but just in case
//            setIsEnabled(false);
//            setIsToggling(false);
//          }
//        } else {
//          // User is disabling
//          Alert.alert(
//            "Disable Bandwidth Sharing",
//            "Are you sure you want to disable bandwidth sharing?\n\nYou will stop earning rewards from this feature immediately.",
//            [
//              {
//                text: "Cancel",
//                style: "cancel",
//                onPress: () => {
//                  setIsEnabled(true);
//                  setIsToggling(false);
//                },
//              },
//              {
//                text: "Disable",
//                style: "destructive",
//                onPress: async () => {
//                  try {
//                    await stop();
//                    await optOut();

//                    // Only revoke consent if this is not preview mode or if they had real consent
//                    if (!previewMode || hasRealConsent) {
//                      await revokeConsent();
//                      setHasRealConsent(false);
//                    }

//                    setIsEnabled(false);

//                    Haptics.notificationAsync(
//                      Haptics.NotificationFeedbackType.Success,
//                    );
//                    Alert.alert(
//                      "Success",
//                      "Bandwidth sharing has been disabled.",
//                    );
//                  } catch (error) {
//                    console.error("[BandwidthSharing] Error disabling:", error);
//                    Haptics.notificationAsync(
//                      Haptics.NotificationFeedbackType.Error,
//                    );
//                    Alert.alert(
//                      "Error",
//                      "Failed to disable bandwidth sharing. Please try again.",
//                    );
//                    setIsEnabled(true);
//                  } finally {
//                    setIsToggling(false);
//                  }
//                },
//              },
//            ],
//          );
//        }
//      } catch (error) {
//        console.error("[BandwidthSharing] Toggle error:", error);
//        setIsToggling(false);
//        setIsAccepting(false);
//      }
//    },
//    [isToggling, isAccepting, previewMode, hasRealConsent, onAcceptComplete],
//  );

//   const getStatusText = () => {
//     if (isLoading) return "Loading...";
//     if (isAccepting) return "Enabling...";
//     if (previewMode && !hasRealConsent && !isEnabled)
//       return "Toggle to enable and accept terms";
//     if (isEnabled) return "Active - You are earning rewards";
//     return "Inactive - No rewards being earned";
//   };

//   const getStatusColor = () => {
//     if (isEnabled) return colors.success;
//     return colors.textTertiary;
//   };

//   if (isLoading) {
//     return (
//       <View
//         style={{
//           backgroundColor: colors.card,
//           borderRadius: Radius.lg,
//           padding: Spacing.lg,
//           marginBottom: Spacing.md,
//           alignItems: "center",
//         }}
//       >
//         <ActivityIndicator size="small" color={colors.primary} />
//       </View>
//     );
//   }

//   return (
//     <View
//       style={{
//         backgroundColor: colors.card,
//         borderRadius: Radius.lg,
//         padding: Spacing.lg,
//         marginBottom: Spacing.md,
//       }}
//     >
//       <View
//         style={{
//           flexDirection: "row",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <View style={{ flex: 1 }}>
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               marginBottom: Spacing.xs,
//             }}
//           >
//             <Text style={{ fontSize: 20, marginRight: 8 }}>🌐</Text>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.base,
//                 fontWeight: Typography.weights.semibold,
//                 color: colors.text,
//               }}
//             >
//               Bandwidth Sharing
//             </Text>
//           </View>
//           <Text
//             style={{
//               fontSize: Typography.sizes.sm,
//               color: colors.textSecondary,
//               marginBottom: Spacing.xs,
//             }}
//           >
//             Share idle bandwidth to earn rewards
//           </Text>
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               marginTop: Spacing.xs,
//             }}
//           >
//             <View
//               style={{
//                 width: 8,
//                 height: 8,
//                 borderRadius: 4,
//                 backgroundColor: getStatusColor(),
//                 marginRight: 6,
//               }}
//             />
//             <Text
//               style={{
//                 fontSize: Typography.sizes.xs,
//                 color: getStatusColor(),
//               }}
//             >
//               {getStatusText()}
//             </Text>
//           </View>
//         </View>
//         <Switch
//           value={isEnabled}
//           onValueChange={handleToggle}
//           trackColor={{ false: colors.disabled, true: colors.primary }}
//           thumbColor="#FFFFFF"
//           disabled={isToggling || isAccepting}
//         />
//       </View>

//       {/* Preview mode info banner */}
//       {previewMode && (
//         <View
//           style={{
//             marginTop: Spacing.md,
//             paddingTop: Spacing.sm,
//             borderTopWidth: 1,
//             borderTopColor: colors.border,
//             backgroundColor: colors.primary + "10",
//             borderRadius: Radius.sm,
//             padding: Spacing.sm,
//           }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.xs,
//               color: colors.textSecondary,
//               lineHeight: 18,
//               textAlign: "center",
//             }}
//           >
//             💡 Toggle ON to review and accept the terms. Your bandwidth sharing
//             will only start after you confirm.
//           </Text>
//         </View>
//       )}

//       {/* Info text when enabled */}
//       {isEnabled && !previewMode && (
//         <View
//           style={{
//             marginTop: Spacing.md,
//             paddingTop: Spacing.sm,
//             borderTopWidth: 1,
//             borderTopColor: colors.border,
//           }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.xs,
//               color: colors.textSecondary,
//               lineHeight: 18,
//             }}
//           >
//             💡 Your device is currently sharing idle bandwidth. This uses
//             minimal resources and you earn rewards. You can disable this at any
//             time.
//           </Text>
//         </View>
//       )}

//       {/* Info text when disabled (non-preview) */}
//       {!isEnabled && !previewMode && (
//         <View
//           style={{
//             marginTop: Spacing.md,
//             paddingTop: Spacing.sm,
//             borderTopWidth: 1,
//             borderTopColor: colors.border,
//           }}
//         >
//           <Text
//             style={{
//               fontSize: Typography.sizes.xs,
//               color: colors.textSecondary,
//               lineHeight: 18,
//             }}
//           >
//             💡 Enable bandwidth sharing to earn rewards by sharing your idle
//             internet connection. Your data is always encrypted and your privacy
//             is protected.
//           </Text>
//         </View>
//       )}
//     </View>
//   );
// }

// export default function SecurityScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const { user } = useAuthStore();
//   const queryClient = useQueryClient();
//   const storeSlug = useResellerStore.getState().config.storeName;
//   const params = useLocalSearchParams();
//   const previewMode = params.previewMode === "true";

//   // Fetch profile to check if user has a transaction PIN
//   const { data: profile } = useProfile();
//   const hasTransactionPin = profile?.transaction_pin != null;
//   const userType = profile?.account_type; // "reseller" or "customer"

//   // Navigation
//   const [currentSection, setCurrentSection] = useState<SecuritySection>("main");

//   // Password Change State
//   const [passwordData, setPasswordData] = useState({
//     current: "",
//     new: "",
//     confirm: "",
//   });
//   const [showPassword, setShowPassword] = useState({
//     current: false,
//     new: false,
//     confirm: false,
//   });
//   const [passwordErrors, setPasswordErrors] = useState({
//     current: "",
//     new: "",
//     confirm: "",
//   });
//   const [isChangingPassword, setIsChangingPassword] = useState(false);

//   // Transaction PIN State
//   const [pinData, setPinData] = useState({
//     current: "",
//     new: "",
//     confirm: "",
//   });
//   const [showPin, setShowPin] = useState({
//     current: false,
//     new: false,
//     confirm: false,
//   });
//   const [pinErrors, setPinErrors] = useState({
//     current: "",
//     new: "",
//     confirm: "",
//   });

//   // Update password field
//   const updatePasswordField = (
//     field: "current" | "new" | "confirm",
//     value: string,
//   ) => {
//     setPasswordData({ ...passwordData, [field]: value });
//     setPasswordErrors({ ...passwordErrors, [field]: "" });
//   };

//   // Update PIN field
//   const updatePinField = (
//     field: "current" | "new" | "confirm",
//     value: string,
//   ) => {
//     const cleaned = value.replace(/[^0-9]/g, "").slice(0, 4);
//     setPinData({ ...pinData, [field]: cleaned });
//     setPinErrors({ ...pinErrors, [field]: "" });
//   };

//   // PIN mutation - works for both resellers and customers
//   const pinMutation = useMutation({
//     mutationFn: async ({ newPinValue }: { newPinValue: string }) => {
//       if (!user?.id || !profile?.id) throw new Error("No user found");

//       if (userType === "reseller") {
//         // Update reseller PIN
//         const { error } = await supabase
//           .from("resellers")
//           .update({ transaction_pin: newPinValue })
//           .eq("id", profile.id);

//         if (error) throw error;
//       } else {
//         // Update customer PIN
//         const { error } = await supabase
//           .from("reseller_customers")
//           .update({ transaction_pin: newPinValue })
//           .eq("id", profile.id);

//         if (error) throw error;
//       }
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["profile", user?.id, storeSlug],
//       });
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

//       const message = hasTransactionPin
//         ? "Your transaction PIN has been changed successfully!"
//         : "Your transaction PIN has been created successfully!";

//       Alert.alert("Success", message, [
//         {
//           text: "OK",
//           onPress: () => {
//             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//             setPinData({ current: "", new: "", confirm: "" });
//             setPinErrors({ current: "", new: "", confirm: "" });
//             setCurrentSection("main");
//           },
//         },
//       ]);
//     },
//     onError: (error: any) => {
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       console.error("PIN operation error:", error);
//       Alert.alert(
//         "Error",
//         error.message || "Failed to update PIN. Please try again.",
//       );
//     },
//   });

//   // Password Validation
//   const validatePassword = (password: string): string | null => {
//     if (password.length < 8)
//       return "Password must be at least 8 characters long";
//     if (!/[A-Z]/.test(password))
//       return "Password must contain at least one uppercase letter";
//     if (!/[a-z]/.test(password))
//       return "Password must contain at least one lowercase letter";
//     if (!/[0-9]/.test(password))
//       return "Password must contain at least one number";
//     if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
//       return "Password must contain at least one special character (!@#$%^&*)";
//     return null;
//   };

//   // PIN Validation
//   const validatePin = (pin: string): string | null => {
//     if (!pin) return "PIN is required";
//     if (pin.length !== 4) return "PIN must be exactly 4 digits";
//     if (!/^\d+$/.test(pin)) return "PIN must contain only numbers";
//     return null;
//   };

//   // Handle Change Password
//   const handleChangePassword = async () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

//     const newErrors = { current: "", new: "", confirm: "" };

//     if (!passwordData.current.trim())
//       newErrors.current = "Current password is required";
//     if (!passwordData.new.trim()) newErrors.new = "New password is required";
//     if (!passwordData.confirm.trim())
//       newErrors.confirm = "Please confirm your new password";

//     if (newErrors.current || newErrors.new || newErrors.confirm) {
//       setPasswordErrors(newErrors);
//       return;
//     }

//     const passwordError = validatePassword(passwordData.new);
//     if (passwordError) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       setPasswordErrors({ ...newErrors, new: passwordError });
//       return;
//     }

//     if (passwordData.new !== passwordData.confirm) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       setPasswordErrors({
//         ...newErrors,
//         confirm: "New passwords do not match",
//       });
//       return;
//     }

//     if (passwordData.current === passwordData.new) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       Alert.alert(
//         "Same Password",
//         "New password must be different from current password",
//       );
//       return;
//     }

//     setIsChangingPassword(true);

//     try {
//       if (!user?.email) throw new Error("User email not found");

//       // Verify current password
//       const { error: verifyError } = await supabase.auth.signInWithPassword({
//         email: user.email,
//         password: passwordData.current,
//       });

//       if (verifyError) throw new Error("Current password is incorrect");

//       // Update password
//       const { error } = await supabase.auth.updateUser({
//         password: passwordData.new,
//       });

//       if (error) throw error;

//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
//       Alert.alert("Success", "Your password has been changed successfully!", [
//         {
//           text: "OK",
//           onPress: () => {
//             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//             setPasswordData({ current: "", new: "", confirm: "" });
//             setPasswordErrors({ current: "", new: "", confirm: "" });
//             setCurrentSection("main");
//           },
//         },
//       ]);
//     } catch (error: any) {
//       Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
//       if (error.message?.includes("incorrect")) {
//         setPasswordErrors({
//           ...newErrors,
//           current: "Current password is incorrect",
//         });
//       } else {
//         Alert.alert(
//           "Error",
//           error.message || "Failed to change password. Please try again.",
//         );
//       }
//     } finally {
//       setIsChangingPassword(false);
//     }
//   };

//   // Handle Create/Change Transaction PIN
//   const handlePinSubmit = () => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

//     const newErrors = { current: "", new: "", confirm: "" };

//     const newPinError = validatePin(pinData.new);
//     if (newPinError) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       newErrors.new = newPinError;
//       setPinErrors(newErrors);
//       return;
//     }

//     const confirmPinError = validatePin(pinData.confirm);
//     if (confirmPinError) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       newErrors.confirm = confirmPinError;
//       setPinErrors(newErrors);
//       return;
//     }

//     if (pinData.new !== pinData.confirm) {
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
//       newErrors.confirm = "New PINs do not match";
//       setPinErrors(newErrors);
//       return;
//     }

//     pinMutation.mutate({ newPinValue: pinData.new });
//   };

//   // Handle acceptance complete - go back to main screen
//   const handleAcceptComplete = () => {
//     // Navigate back to home/index page after successful enable
//     router.replace("/(app)/(protected)");
//   };

//   // Show preview banner at top of security page when in preview mode
//   const renderPreviewBanner = () => {
//     if (!previewMode) return null;
    
//     return (
//       <View
//         style={{
//           backgroundColor: colors.primary + "15",
//           paddingHorizontal: Spacing.lg,
//           paddingVertical: Spacing.md,
//           marginBottom: Spacing.md,
//           borderBottomWidth: 1,
//           borderBottomColor: colors.primary + "30",
//         }}
//       >
//         <Text
//           style={{
//             fontSize: Typography.sizes.sm,
//             color: colors.text,
//             textAlign: "center",
//             fontWeight: Typography.weights.medium,
//           }}
//         >
//           👋 Welcome! Toggle the switch below to review and accept the bandwidth sharing terms.
//         </Text>
//       </View>
//     );
//   };

//   // Main Security Menu
//   if (currentSection === "main") {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
//         <ScrollView
//           showsVerticalScrollIndicator={false}
//           contentContainerStyle={{ paddingVertical: Spacing.lg }}
//         >
//           {renderPreviewBanner()}
          
//           <View style={{ paddingHorizontal: Spacing.lg }}>
//             {/* Change Password */}
//             <Pressable
//               onPress={() => {
//                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                 setCurrentSection("password");
//               }}
//               style={({ pressed }) => ({
//                 backgroundColor: colors.card,
//                 borderRadius: Radius.lg,
//                 padding: Spacing.lg,
//                 marginBottom: Spacing.md,
//                 opacity: pressed ? 0.7 : 1,
//               })}
//             >
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.base,
//                   fontWeight: Typography.weights.semibold,
//                   color: colors.text,
//                   marginBottom: Spacing.xs,
//                 }}
//               >
//                 🔐 Change Password
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                 }}
//               >
//                 Update your login password
//               </Text>
//             </Pressable>

//             {/* Transaction PIN */}
//             <Pressable
//               onPress={() => {
//                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                 setCurrentSection("pin");
//               }}
//               style={({ pressed }) => ({
//                 backgroundColor: colors.card,
//                 borderRadius: Radius.lg,
//                 padding: Spacing.lg,
//                 marginBottom: Spacing.md,
//                 opacity: pressed ? 0.7 : 1,
//               })}
//             >
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.base,
//                   fontWeight: Typography.weights.semibold,
//                   color: colors.text,
//                   marginBottom: Spacing.xs,
//                 }}
//               >
//                 🔑 {hasTransactionPin ? "Change" : "Create"} Transaction PIN
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   color: colors.textSecondary,
//                 }}
//               >
//                 {hasTransactionPin
//                   ? "Update your 4-digit transaction PIN"
//                   : "Create a 4-digit PIN for transactions"}
//               </Text>
//             </Pressable>

//             {/* Bandwidth Sharing - New Section */}
//             <BandwidthSharingSection 
//               colors={colors} 
//               previewMode={previewMode}
//               onAcceptComplete={handleAcceptComplete}
//             />
//           </View>
//         </ScrollView>
//       </SafeAreaView>
//     );
//   }

//   // Change Password Section
//   if (currentSection === "password") {
//     return (
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1, backgroundColor: colors.background }}
//       >
//         <SafeAreaView style={{ flex: 1 }}>
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               justifyContent: "space-between",
//               paddingHorizontal: Spacing.lg,
//               paddingVertical: Spacing.md,
//               borderBottomWidth: 1,
//               borderBottomColor: colors.border,
//             }}
//           >
//             <Pressable onPress={() => setCurrentSection("main")}>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.base,
//                   color: colors.primary,
//                   fontWeight: Typography.weights.semibold,
//                 }}
//               >
//                 Back
//               </Text>
//             </Pressable>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.lg,
//                 fontWeight: Typography.weights.bold,
//                 color: colors.text,
//               }}
//             >
//               Change Password
//             </Text>
//             <View style={{ width: 40 }} />
//           </View>

//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{
//               paddingHorizontal: Spacing.lg,
//               paddingVertical: Spacing.lg,
//             }}
//           >
//             <View
//               style={{
//                 backgroundColor: colors.primary + "10",
//                 borderRadius: Radius.md,
//                 padding: Spacing.md,
//                 marginBottom: Spacing.lg,
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   fontWeight: Typography.weights.semibold,
//                   color: colors.text,
//                   marginBottom: Spacing.sm,
//                 }}
//               >
//                 📋 Password Requirements
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.xs,
//                   color: colors.textSecondary,
//                   lineHeight: 18,
//                 }}
//               >
//                 • At least 8 characters long{"\n"}• Uppercase letter (A-Z){"\n"}
//                 • Lowercase letter (a-z){"\n"}• Number (0-9){"\n"}• Special
//                 character (!@#$%^&*)
//               </Text>
//             </View>

//             <Input
//               label="Current Password"
//               placeholder="Enter your current password"
//               value={passwordData.current}
//               onChangeText={(text) => updatePasswordField("current", text)}
//               error={passwordErrors.current}
//               secureTextEntry={!showPassword.current}
//               leftIcon={<Text>🔒</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() =>
//                     setShowPassword({
//                       ...showPassword,
//                       current: !showPassword.current,
//                     })
//                   }
//                 >
//                   <Text style={{ fontSize: 18 }}>
//                     {showPassword.current ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.lg }}
//             />
//             <Input
//               label="New Password"
//               placeholder="Enter your new password"
//               value={passwordData.new}
//               onChangeText={(text) => updatePasswordField("new", text)}
//               error={passwordErrors.new}
//               secureTextEntry={!showPassword.new}
//               leftIcon={<Text>🔐</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() =>
//                     setShowPassword({ ...showPassword, new: !showPassword.new })
//                   }
//                 >
//                   <Text style={{ fontSize: 18 }}>
//                     {showPassword.new ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.lg }}
//             />
//             <Input
//               label="Confirm Password"
//               placeholder="Confirm your new password"
//               value={passwordData.confirm}
//               onChangeText={(text) => updatePasswordField("confirm", text)}
//               error={passwordErrors.confirm}
//               secureTextEntry={!showPassword.confirm}
//               leftIcon={<Text>✓</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() =>
//                     setShowPassword({
//                       ...showPassword,
//                       confirm: !showPassword.confirm,
//                     })
//                   }
//                 >
//                   <Text style={{ fontSize: 18 }}>
//                     {showPassword.confirm ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.xl }}
//             />

//             <Button
//               title="Change Password"
//               onPress={handleChangePassword}
//               loading={isChangingPassword}
//               fullWidth
//               size="md"
//               style={{ marginBottom: Spacing.md }}
//             />
//           </ScrollView>
//         </SafeAreaView>
//       </KeyboardAvoidingView>
//     );
//   }

//   // Change Transaction PIN Section
//   if (currentSection === "pin") {
//     return (
//       <KeyboardAvoidingView
//         behavior={Platform.OS === "ios" ? "padding" : "height"}
//         style={{ flex: 1, backgroundColor: colors.background }}
//       >
//         <SafeAreaView style={{ flex: 1 }}>
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               justifyContent: "space-between",
//               paddingHorizontal: Spacing.lg,
//               paddingVertical: Spacing.md,
//               borderBottomWidth: 1,
//               borderBottomColor: colors.border,
//             }}
//           >
//             <Pressable onPress={() => setCurrentSection("main")}>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.base,
//                   color: colors.primary,
//                   fontWeight: Typography.weights.semibold,
//                 }}
//               >
//                 Back
//               </Text>
//             </Pressable>
//             <Text
//               style={{
//                 fontSize: Typography.sizes.lg,
//                 fontWeight: Typography.weights.bold,
//                 color: colors.text,
//               }}
//             >
//               {hasTransactionPin ? "Change" : "Create"} PIN
//             </Text>
//             <View style={{ width: 40 }} />
//           </View>

//           <ScrollView
//             showsVerticalScrollIndicator={false}
//             contentContainerStyle={{
//               paddingHorizontal: Spacing.lg,
//               paddingVertical: Spacing.lg,
//             }}
//           >
//             <View
//               style={{
//                 backgroundColor: colors.primary + "10",
//                 borderRadius: Radius.md,
//                 padding: Spacing.md,
//                 marginBottom: Spacing.lg,
//               }}
//             >
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.sm,
//                   fontWeight: Typography.weights.semibold,
//                   color: colors.text,
//                   marginBottom: Spacing.sm,
//                 }}
//               >
//                 📋 PIN Requirements
//               </Text>
//               <Text
//                 style={{
//                   fontSize: Typography.sizes.xs,
//                   color: colors.textSecondary,
//                   lineHeight: 18,
//                 }}
//               >
//                 • Exactly 4 digits long{"\n"}• Numbers only (0-9){"\n"}• Easy to
//                 remember{"\n"}• Don't use sequential numbers{"\n"}• Keep it
//                 confidential
//               </Text>
//             </View>

//             <Input
//               label="New PIN"
//               placeholder="••••"
//               value={pinData.new}
//               onChangeText={(text) => updatePinField("new", text)}
//               error={pinErrors.new}
//               secureTextEntry={!showPin.new}
//               keyboardType="number-pad"
//               maxLength={4}
//               leftIcon={<Text>🆕</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() => setShowPin({ ...showPin, new: !showPin.new })}
//                 >
//                   <Text style={{ fontSize: 18 }}>
//                     {showPin.new ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.lg }}
//             />
//             <Input
//               label="Confirm PIN"
//               placeholder="••••"
//               value={pinData.confirm}
//               onChangeText={(text) => updatePinField("confirm", text)}
//               error={pinErrors.confirm}
//               secureTextEntry={!showPin.confirm}
//               keyboardType="number-pad"
//               maxLength={4}
//               leftIcon={<Text>✓</Text>}
//               rightIcon={
//                 <Pressable
//                   onPress={() =>
//                     setShowPin({ ...showPin, confirm: !showPin.confirm })
//                   }
//                 >
//                   <Text style={{ fontSize: 18 }}>
//                     {showPin.confirm ? "👁️" : "👁️‍🗨️"}
//                   </Text>
//                 </Pressable>
//               }
//               containerStyle={{ marginBottom: Spacing.xl }}
//             />

//             <Button
//               title={hasTransactionPin ? "Change PIN" : "Create PIN"}
//               onPress={handlePinSubmit}
//               loading={pinMutation.isPending}
//               fullWidth
//               size="md"
//               style={{ marginBottom: Spacing.md }}
//             />
//           </ScrollView>
//         </SafeAreaView>
//       </KeyboardAvoidingView>
//     );
//   }

//   return null;
// }

