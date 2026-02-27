import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";

import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#53ff1f7c",
    });
  }

  if (!Device.isDevice) {
    console.log("Must use physical device for Push Notifications");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Failed to get push token");
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
  ).data;

  return token;
}

async function savePushTokenToDatabase(token: string, userId: string) {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        push_token: token,
        notifications_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    console.log("✅ Push token saved successfully!");
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const { user, setSession } = useAuthStore();
  const router = useRouter();
  const realtimeSubscriptionRef = useRef<any>(null);

  // ─── Auth + Push Token Setup ───────────────────────────────────────────────
  useEffect(() => {
    async function initializeApp() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("notifications_enabled, push_token")
            .eq("id", session.user.id)
            .single();

          if (!profile?.push_token || !profile?.notifications_enabled) {
            const token = await registerForPushNotificationsAsync();
            if (token) await savePushTokenToDatabase(token, session.user.id);
          }
        }
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        SplashScreen.hideAsync();
      }
    }

    initializeApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (_event === "SIGNED_IN" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("notifications_enabled, push_token")
          .eq("id", session.user.id)
          .single();

        if (!profile?.push_token || !profile?.notifications_enabled) {
          const token = await registerForPushNotificationsAsync();
          if (token) await savePushTokenToDatabase(token, session.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  // ─── Single Realtime Subscription for Notifications ────────────────────────
  useEffect(() => {
    if (!user?.id) {
      // Clean up subscription if user logs out
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
      return;
    }

    // Create one subscription for the whole app
    realtimeSubscriptionRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Just invalidate — Tanstack Query refetches automatically
          // Every component using useNotifications() gets the update
          queryClient.invalidateQueries({
            queryKey: ["notifications", user.id],
          });
        },
      )
      .subscribe();

    return () => {
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
    };
  }, [user?.id]);

  // ─── Push Notification Listeners ───────────────────────────────────────────
  useEffect(() => {
    // Foreground notification received
    const notificationListener = Notifications.addNotificationReceivedListener(
      () => {
        queryClient.invalidateQueries({
          queryKey: ["notifications", user?.id],
        });
      },
    );

    // User taps a notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const route = data?.route || "/(app)/(protected)/notifications";

        if (data?.notificationId) {
          // Mark as read in cache optimistically
          queryClient.setQueryData(["notifications", user?.id], (old: any[]) =>
            old?.map((n) =>
              n.id === data.notificationId ? { ...n, isRead: true } : n,
            ),
          );
          // Also update in DB
          supabase
            .from("notifications")
            .update({ is_read: true, updated_at: new Date().toISOString() })
            .eq("id", data.notificationId)
            .then(() => {});
        }

        router.push(route as any);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [user?.id]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
    </>
  );
}

