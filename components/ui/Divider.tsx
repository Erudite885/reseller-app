// ============================================
// components/ui/Divider.tsx
// ============================================

import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";

interface DividerProps {
  style?: ViewStyle;
  orientation?: "horizontal" | "vertical";
}

export function Divider({ style, orientation = "horizontal" }: DividerProps) {
  return (
    <View
      style={[
        styles.divider,
        orientation === "vertical" && styles.vertical,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: "#e5e5e5",
    height: 1,
    width: "100%",
  },
  vertical: {
    width: 1,
    height: "100%",
  },
});

// Object.assign(styles, dividerStyles);
