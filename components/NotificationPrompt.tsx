// components/NotificationPrompt.tsx
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography, Radius } from "@/constants/Colors";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui";

type NotificationPromptProps = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
};

export function NotificationPrompt({
  visible,
  onAccept,
  onDecline,
  loading = false,
}: NotificationPromptProps) {
  const { colors, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.card },
            shadows.lg,
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text style={styles.icon}>🔔</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            Enable Notifications
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Get instant updates on your transactions, special offers, and
            important account activities.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            {[
              "✅ Transaction confirmations",
              "✅ Payment reminders",
              "✅ Exclusive deals & offers",
              "✅ Account security alerts",
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title={loading ? "Enabling..." : "Enable Notifications"}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAccept();
              }}
              disabled={loading}
              loading={loading}
              variant="primary"
              size="md"
              fullWidth
              style={{ marginBottom: Spacing.sm }}
            />

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDecline();
              }}
              disabled={loading}
              style={({ pressed }) => ({
                padding: Spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                Maybe Later
              </Text>
            </Pressable>
          </View>

          {/* Privacy Note */}
          <Text style={[styles.privacyNote, { color: colors.textTertiary }]}>
            🔒 You can change this anytime in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: Typography.sizes.base,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: Typography.sizes.base * 1.5,
  },
  benefitsList: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  benefitItem: {
    paddingVertical: Spacing.xs,
  },
  benefitText: {
    fontSize: Typography.sizes.sm,
    lineHeight: Typography.sizes.sm * 1.5,
  },
  buttonContainer: {
    width: "100%",
    marginTop: Spacing.md,
  },
  skipText: {
    fontSize: Typography.sizes.sm,
    textAlign: "center",
    fontWeight: Typography.weights.semibold,
  },
  privacyNote: {
    fontSize: Typography.sizes.xs,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
