

// ============================================
// components/Select.tsx
// ============================================

import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";

interface SelectOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export const Select = ({
  label,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  error,
  containerStyle,
  disabled = false,
}: SelectProps) => {
  const { colors, shadows } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange(optionValue);
    setIsOpen(false);
  };

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

      {/* Select Trigger */}
      <Pressable
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: disabled
            ? colors.backgroundTertiary
            : colors.inputBackground,
          borderWidth: 1.5,
          borderColor: error ? colors.error : colors.inputBorder,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.md,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {selectedOption?.icon && (
            <View style={{ marginRight: Spacing.sm }}>
              {selectedOption.icon}
            </View>
          )}
          <Text
            style={{
              fontSize: Typography.sizes.base,
              color: selectedOption ? colors.inputText : colors.placeholder,
            }}
          >
            {selectedOption?.label || placeholder}
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary }}>▼</Text>
      </Pressable>

      {/* Error */}
      {error && (
        <Text
          style={{
            fontSize: Typography.sizes.sm,
            color: colors.error,
            marginTop: Spacing.sm,
          }}
        >
          {error}
        </Text>
      )}

      {/* Options Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={{
              width: "85%",
              maxHeight: "60%",
              backgroundColor: colors.card,
              borderRadius: Radius.lg,
              ...shadows.lg,
            }}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item.value)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: Spacing.md,
                    backgroundColor:
                      item.value === value
                        ? colors.primaryLight + "20"
                        : pressed
                          ? colors.backgroundSecondary
                          : "transparent",
                  })}
                >
                  {item.icon && (
                    <View style={{ marginRight: Spacing.md }}>{item.icon}</View>
                  )}
                  <Text
                    style={{
                      fontSize: Typography.sizes.base,
                      color:
                        item.value === value ? colors.primary : colors.text,
                      fontWeight:
                        item.value === value
                          ? Typography.weights.semibold
                          : Typography.weights.regular,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
