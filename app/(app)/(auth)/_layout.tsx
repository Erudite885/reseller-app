// ============================================
// app/(app)/(auth)/_layout.tsx
// ============================================

import { Stack } from "expo-router";
import { useTheme } from "@/hooks/useTheme";

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: "Forgot Password" }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ title: "Reset Password" }}
      />
    </Stack>
  );
}
