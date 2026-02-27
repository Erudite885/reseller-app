// ============================================
// components/ui/Input.tsx
// ============================================

import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export const Input = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  disabled = false,
  ...textInputProps
}: InputProps) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {/* Label */}
      {label && (
        <Text
          style={{
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.medium,
            color: colors.text,
            marginBottom: Spacing.sm,
          }}
        >
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: disabled
            ? colors.backgroundTertiary
            : colors.inputBackground,
          borderWidth: 1.5,
          borderColor: error
            ? colors.error
            : isFocused
              ? colors.borderFocus
              : colors.inputBorder,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View style={{ marginRight: Spacing.sm }}>{leftIcon}</View>
        )}

        {/* Text Input */}
        <TextInput
          {...textInputProps}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            textInputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            textInputProps.onBlur?.(e);
          }}
          style={{
            flex: 1,
            fontSize: Typography.sizes.base,
            color: colors.inputText,
            paddingVertical: Spacing.md,
          }}
          placeholderTextColor={colors.placeholder}
        />

        {/* Right Icon */}
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={{ marginLeft: Spacing.sm }}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>

      {/* Helper Text / Error */}
      {(error || helperText) && (
        <Text
          style={{
            fontSize: Typography.sizes.xs,
            color: error ? colors.error : colors.textSecondary,
            marginTop: Spacing.sm,
          }}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};
