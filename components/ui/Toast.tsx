// components/ui/Toast.tsx
import { useEffect, useRef } from "react";
import { Animated, Text, View, Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";

interface ToastProps {
  visible: boolean;
  message: string;
  type: "success" | "error";
  onHide: () => void;
  duration?: number;
}

export const Toast = ({
  visible,
  message,
  type,
  onHide,
  duration = 5000,
}: ToastProps) => {
  const { colors, shadows } = useTheme();
  // Start offscreen to the right (positive value pushes it to the right)
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset values when becoming visible
      slideAnim.setValue(100);
      opacityAnim.setValue(0);

      // Slide in animation from right to left
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, // Animate to position 0 (fully visible)
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100, // Slide out to the right
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const backgroundColor = type === "success" ? colors.success : colors.error;
  const icon = type === "success" ? "✓" : "✕";

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: Platform.OS === "android" ? Spacing.xxl : Spacing.lg,
        right: 0,
        zIndex: 9999,
        transform: [{ translateX: slideAnim }], // Changed from translateY to translateX
        opacity: opacityAnim,
      }}
    >
      <View
        style={{
          backgroundColor,
          borderRadius: Radius.lg,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          maxWidth: 300,
          minWidth: 200,
          marginRight: Spacing.lg, // Add some margin from the right edge
          ...shadows.lg,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: Radius.full,
            backgroundColor: "rgba(255, 255, 255, 0.3)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: Spacing.sm,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: Typography.weights.bold,
              color: "#FFFFFF",
            }}
          >
            {icon}
          </Text>
        </View>

        {/* Message */}
        <Text
          style={{
            flex: 1,
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.semibold,
            color: "#FFFFFF",
            lineHeight: Typography.sizes.sm * 1.4,
          }}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};