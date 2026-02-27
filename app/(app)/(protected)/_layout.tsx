// ============================================
// app/(app)/(protected)/_layout.tsx
// ============================================

import { Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function ProtectedLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
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
      <Stack.Screen
        name="index"
        options={{ headerShown: false, title: "Home" }}
      />
      {/* Home screen */}
      <Stack.Screen
        name="wallet"
        options={{
          headerShown: true,
          title: "Wallet",
        }}
      />
      <Stack.Screen
        name="transaction-history"
        options={{
          headerShown: true,
          title: "Transactions History",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerShown: false,
          title: "Notification",
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          headerShown: true,
          title: "Help Center",
        }}
      />
      <Stack.Screen
        name="contact"
        options={{
          headerShown: true,
          title: "Contact Us",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          title: "Edit Profile",
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          headerShown: true,
          title: "Security",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: "Settings",
        }}
      />
    </Stack>
  );
}
