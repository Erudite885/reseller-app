// components/BandwidthSettings.tsx
import { Radius, Spacing, Typography } from "@/constants/Colors";
import { usePawns } from "@/hooks/usePawns";
import { useTheme } from "@/hooks/useTheme";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

export function BandwidthSettings() {
  const { colors, shadows } = useTheme();
  const {
    isLoading,
    consentGiven,
    isSharing,
    serviceState,
    grantConsent,
    revokeConsent,
    toggleSharing,
    requestBatteryExemption,
  } = usePawns();

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Android only ─────────────────────────────────────────────────────────
  if (Platform.OS !== "android") {
    return (
      <View
        style={{
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          backgroundColor: colors.card,
        }}
      >
        <Text
          style={{ fontSize: Typography.sizes.sm, color: colors.textSecondary }}
        >
          Bandwidth sharing is only available on Android.
        </Text>
      </View>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={{
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: Spacing.sm,
          backgroundColor: colors.card,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text
          style={{ fontSize: Typography.sizes.sm, color: colors.textSecondary }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  // ─── State badge helpers ──────────────────────────────────────────────────
  const getStateBadge = () => {
    switch (serviceState) {
      case "CONNECTED":
        return { label: "Active", color: colors.success ?? "#22c55e" };
      case "CONNECTING":
        return { label: "Connecting…", color: colors.warning ?? "#f59e0b" };
      case "DISCONNECTING":
        return { label: "Stopping…", color: colors.warning ?? "#f59e0b" };
      case "ERROR":
        return { label: "Error", color: colors.error };
      default:
        return { label: "Inactive", color: colors.textSecondary };
    }
  };

  const badge = getStateBadge();

  // ─── Main toggle handler ──────────────────────────────────────────────────
  const handleMainToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (value) {
      // User wants to enable — check consent first
      if (!consentGiven) {
        setShowConsentModal(true);
      } else {
        // Already consented, just start
        setIsProcessing(true);
        await toggleSharing(true);
        setIsProcessing(false);
      }
    } else {
      // User wants to disable — revoke consent & stop
      Alert.alert(
        "Stop Bandwidth Sharing",
        "This will stop sharing your bandwidth and withdraw your consent. You can re-enable it anytime.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Stop Sharing",
            style: "destructive",
            onPress: async () => {
              setIsProcessing(true);
              await revokeConsent();
              setIsProcessing(false);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            },
          },
        ],
      );
    }
  };

  // ─── Consent modal — Accept ───────────────────────────────────────────────
  const handleConsentAccept = async () => {
    setIsProcessing(true);
    setShowConsentModal(false);
    const ok = await grantConsent();
    setIsProcessing(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Offer battery optimisation tip
      Alert.alert(
        "🎉 Sharing Started!",
        "For best results, consider exempting this app from battery optimisation so sharing continues when the app is closed.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => requestBatteryExemption(),
          },
        ],
      );
    } else {
      Alert.alert(
        "Error",
        "Could not start bandwidth sharing. Please try again.",
      );
    }
  };

  // ─── Consent modal — Decline ──────────────────────────────────────────────
  const handleConsentDecline = () => {
    setShowConsentModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <>
      {/* ── Main Row (mirrors the notifications toggle style in settings.tsx) ── */}
      <View
        style={{
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          backgroundColor: colors.card,
        }}
      >
        {/* Top row: icon + title + toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Text style={{ fontSize: 24, marginRight: Spacing.md }}>📡</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                }}
              >
                Bandwidth Sharing
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: badge.color,
                  }}
                />
                <Text
                  style={{ fontSize: Typography.sizes.xs, color: badge.color }}
                >
                  {badge.label}
                </Text>
              </View>
            </View>
          </View>

          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={
                consentGiven && (isSharing || serviceState === "CONNECTING")
              }
              onValueChange={handleMainToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
            />
          )}
        </View>

        {/* Description */}
        <Text
          style={{
            fontSize: Typography.sizes.xs,
            color: colors.textSecondary,
            marginTop: Spacing.sm,
            lineHeight: 18,
          }}
        >
          Share your unused internet bandwidth and earn rewards. Runs quietly in
          the background even when the app is closed.
        </Text>
      </View>

      {/* ── Consent Modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={showConsentModal}
        transparent
        animationType="slide"
        onRequestClose={handleConsentDecline}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: Radius.xl ?? 20,
              borderTopRightRadius: Radius.xl ?? 20,
              padding: Spacing.xl,
              maxHeight: "85%",
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: "center",
                marginBottom: Spacing.lg,
              }}
            />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <Text
                style={{
                  fontSize: Typography.sizes.xxl ?? 22,
                  fontWeight: Typography.weights.bold,
                  color: colors.text,
                  marginBottom: Spacing.sm,
                }}
              >
                📡 Internet Sharing
              </Text>
              <Text
                style={{
                  fontSize: Typography.sizes.base,
                  color: colors.textSecondary,
                  marginBottom: Spacing.lg,
                  lineHeight: 22,
                }}
              >
                Before enabling, please read and agree to the following:
              </Text>

              {/* Consent box */}
              <View
                style={{
                  backgroundColor: colors.background,
                  borderRadius: Radius.md,
                  padding: Spacing.lg,
                  marginBottom: Spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.text,
                    lineHeight: 22,
                    marginBottom: Spacing.md,
                  }}
                >
                  By enabling Bandwidth Sharing, you agree to allow this app to
                  share a portion of your unused internet bandwidth through the
                  Pawns network. Your device may act as a gateway for internet
                  traffic.
                </Text>

                <Text
                  style={{
                    fontSize: Typography.sizes.sm,
                    color: colors.text,
                    lineHeight: 22,
                    marginBottom: Spacing.md,
                  }}
                >
                  • You can withdraw your consent and stop sharing at any time
                  from Settings.{"\n"}• Sharing runs as a foreground service and
                  will display a persistent notification.{"\n"}• Only unused
                  bandwidth is shared — it will not interrupt your normal
                  internet usage.
                </Text>

                {/* Links */}
                <Pressable
                  onPress={() => Linking.openURL("https://pawns.app/terms")}
                >
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: colors.primary,
                      textDecorationLine: "underline",
                      marginBottom: Spacing.xs,
                    }}
                  >
                    Terms &amp; Conditions →
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL("https://pawns.app/privacy")}
                >
                  <Text
                    style={{
                      fontSize: Typography.sizes.sm,
                      color: colors.primary,
                      textDecorationLine: "underline",
                    }}
                  >
                    Privacy Policy →
                  </Text>
                </Pressable>
              </View>

              {/* Buttons */}
              <Pressable
                onPress={handleConsentAccept}
                style={({ pressed }) => ({
                  backgroundColor: colors.primary,
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  alignItems: "center",
                  marginBottom: Spacing.sm,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    fontWeight: Typography.weights.semibold,
                    color: "#fff",
                  }}
                >
                  I Agree — Enable Sharing
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConsentDecline}
                style={({ pressed }) => ({
                  borderRadius: Radius.md,
                  padding: Spacing.md,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: Typography.sizes.base,
                    color: colors.textSecondary,
                  }}
                >
                  No Thanks
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
