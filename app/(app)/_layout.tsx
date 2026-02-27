// ============================================
// app/(app)/_layout.tsx (App Group Layout)
// ============================================

import { useTheme } from "@/hooks/useTheme";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";

export default function AppLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { user } = useAuthStore();
  
  useEffect(() => {
    // Check authentication and redirect
    const checkAuth = async () => {
      // TODO: Check Supabase session
      const isAuthenticated = !!user; // Replace with actual auth check
      const inAuthGroup = segments[1] === "(auth)";
      const inProtectedGroup = segments[1] === "(protected)";

      if (!isAuthenticated && inProtectedGroup) {
        // Redirect to login if not authenticated
        router.replace("/(app)/(auth)/login");
      } else if (isAuthenticated && inAuthGroup) {
        // Redirect to home if already authenticated
        router.replace("/(app)/(protected)");
      }
    };

    checkAuth();
  }, [user, segments]);

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
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(legal)" />
      <Stack.Screen name="(protected)" />
    </Stack>
  );
}
