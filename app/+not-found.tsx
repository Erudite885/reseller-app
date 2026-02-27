// ============================================
// app/+not-found.tsx
// ============================================

import { View, Text, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Typography } from '@/constants/Colors';

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "KAi!" }} />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          padding: Spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: Typography.sizes.xxxl,
            fontWeight: Typography.weights.bold,
            color: colors.text,
            marginBottom: Spacing.sm,
          }}
        >
          404
        </Text>
        <Text
          style={{
            fontSize: Typography.sizes.lg,
            color: colors.textSecondary,
            marginBottom: Spacing.xl,
            textAlign: "center",
          }}
        >
          This screen doesn't exist fa.
        </Text>

        <Link href="/(app)/(auth)/login" asChild>
          <Pressable
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: Spacing.xl,
              paddingVertical: Spacing.md,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: Typography.sizes.base,
                fontWeight: Typography.weights.semibold,
              }}
            >
              Go to Login
            </Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}