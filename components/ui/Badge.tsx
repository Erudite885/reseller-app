// ============================================
// components/ui/Badge.tsx
// ============================================

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";

interface BadgeProps {
  label: string;
  variant?: "success" | "warning" | "error" | "info" | "default";
  style?: ViewStyle;
}

export function Badge({ label, variant = "default", style }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`${variant}Badge`], style]}>
      <Text style={[styles.badgeText, styles[`${variant}Text`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  defaultBadge: {
    backgroundColor: "#f5f5f5",
  },
  defaultText: {
    color: "#000",
  },
  successBadge: {
    backgroundColor: "#d1fae5",
  },
  successText: {
    color: "#065f46",
  },
  warningBadge: {
    backgroundColor: "#fef3c7",
  },
  warningText: {
    color: "#92400e",
  },
  errorBadge: {
    backgroundColor: "#fee2e2",
  },
  errorText: {
    color: "#991b1b",
  },
  infoBadge: {
    backgroundColor: "#dbeafe",
  },
  infoText: {
    color: "#1e40af",
  },
});

// Object.assign(styles);
