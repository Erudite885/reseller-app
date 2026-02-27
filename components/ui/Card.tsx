// ============================================
// components/Card.tsx
// ============================================

import { View, Pressable, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius } from "@/constants/Colors";import * as Haptics from "expo-haptics";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "default" | "elevated" | "outlined";
  padding?: keyof typeof Spacing;
  style?: ViewStyle;
}

export const Card = ({
  children,
  onPress,
  variant = "default",
  padding = "md",
  style,
}: CardProps) => {
  const { colors, shadows } = useTheme();

  const variantStyles = {
    default: {
      backgroundColor: colors.card,
      ...shadows.sm,
    },
    elevated: {
      backgroundColor: colors.card,
      ...shadows.lg,
    },
    outlined: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
  };

  const content = (
    <View
      style={[
        {
          borderRadius: Radius.lg,
          padding: Spacing[padding],
          ...variantStyles[variant],
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};
