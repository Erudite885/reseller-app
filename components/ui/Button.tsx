// components/Button.tsx
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  // Size configurations
  const sizeStyles = {
    sm: {
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      fontSize: Typography.sizes.sm,
    },
    md: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      fontSize: Typography.sizes.base,
    },
    lg: {
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      fontSize: Typography.sizes.lg,
    },
  };

  // Variant configurations
  const variantStyles = {
    primary: {
      backgroundColor: disabled ? colors.disabled : colors.primary,
      textColor: colors.background,
    },
    secondary: {
      backgroundColor: disabled ? colors.disabled : colors.backgroundTertiary,
      textColor: colors.text,
    },
    outline: {
      backgroundColor: "transparent",
      borderColor: disabled ? colors.disabled : colors.border,
      borderWidth: 1.5,
      textColor: disabled ? colors.disabled : colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      textColor: disabled ? colors.disabled : colors.primary,
    },
    danger: {
      backgroundColor: disabled ? colors.disabled : colors.error,
      textColor: "#FFFFFF",
    },
  };

  const currentSize = sizeStyles[size];
  const currentVariant = variantStyles[variant];

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: Radius.md,
          opacity: pressed ? 0.8 : 1,
          ...(fullWidth && { width: "100%" }),
          ...currentVariant,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.textColor} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={{
              color: currentVariant.textColor,
              fontSize: currentSize.fontSize,
              fontWeight: Typography.weights.semibold,
              marginLeft: icon ? Spacing.sm : 0,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};
