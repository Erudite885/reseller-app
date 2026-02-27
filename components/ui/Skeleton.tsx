// ============================================
// components/SkeletonLoader.tsx
// ============================================
import { useEffect, useRef } from "react";
import { View, Animated, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Radius } from "@/constants/Colors";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader = ({
  width = "100%",
  height = 20,
  borderRadius = Radius.sm,
  style,
}: SkeletonLoaderProps) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any, // Type assertion for width compatibility
          height,
          backgroundColor: colors.disabled,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};
