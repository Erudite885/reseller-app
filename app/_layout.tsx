// app/_layout.tsx

import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import {
  EarningsConsentGate,
  checkAndShowConsent,
  isConsentAccepted,
} from "@/components/EarningsConsentGate";
import { queryClient } from "@/lib/queryClient";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/lib/supabase";
import { callStoreFunction } from "@/lib/storeApi";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  try {
    console.log("📱 Starting push notification registration...");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: (() => {
          try {
            const primaryColor =
              useResellerStore.getState().config.theme?.primary || "#379114";
            return primaryColor + "7c";
          } catch {
            return "#3791147c";
          }
        })(),
      });
      console.log("✅ Android notification channel created");
    }

    if (!Device.isDevice) {
      console.log("⚠️ Physical device required for push notifications");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

    const expoToken = (
      await Notifications.getExpoPushTokenAsync({ projectId: projectId! })
    ).data;
    console.log("✅ Expo push token obtained");

    let fcmToken: string | null = null;
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      fcmToken = deviceToken.data;
      console.log(
        "✅ Raw FCM token obtained:",
        fcmToken?.substring(0, 30) + "...",
      );
      await supabase.from("debug_logs").insert({
        context: "fcm_token_success",
        payload: {
          tokenPrefix: fcmToken?.substring(0, 30),
          package: Platform.OS,
        },
      });
    } catch (err: any) {
      console.log("⚠️ getDevicePushTokenAsync failed:", err?.message || err);
       await supabase.from("debug_logs").insert({
         context: "fcm_token_failure",
         payload: {
           message: err?.message || String(err),
           code: err?.code || null,
           stack: err?.stack?.substring(0, 500) || null,
         },
       });
    }

    return { expoToken, fcmToken };
  } catch (error: any) {
    console.log(
      "⚠️ Push notification error:",
      error?.message || "Unknown error",
    );
    return null;
  }
}

// ============================================
// Check if Push Token Already Exists
// ============================================
async function hasExistingPushToken(): Promise<boolean> {
  try {
    const data = await callStoreFunction<{ enabled: boolean }>(
      "global-store-notifications-settings",
      { action: "status" },
    );
    return !!data.enabled;
  } catch (error) {
    console.error("Error checking push token:", error);
    return false;
  }
}

// ============================================
// Save Push Token to Database
// ============================================
async function savePushTokenToDatabase(tokens: {
  expoToken: string;
  fcmToken: string | null;
}) {
  try {
    await callStoreFunction("global-store-notifications-settings", {
      action: "enable",
      expoToken: tokens.expoToken,
      fcmToken: tokens.fcmToken,
    });
    return true;
  } catch (error) {
    console.error("❌ Error saving push token:", error);
    return false;
  }
}

// ============================================
// Setup Customer for Reseller
// ============================================
async function setupCustomerForReseller(userEmail: string) {
  try {
    const resellerId = useResellerStore.getState().config.resellerId;
    if (!resellerId) return;

    // The function matches by email OR auth_email, so passing the auth email
    // (session.user.email) links the existing customer row rather than
    // creating a duplicate. The store owner is skipped inside the function.
    const data = await callStoreFunction<{ userType?: string }>(
      "global-store-register-customer",
      { email: userEmail, authEmail: userEmail },
    );
    if (data?.userType === "reseller") return;

    console.log("[Auth] ✅ Customer setup complete");
  } catch (error) {
    console.error("[Auth] Error setting up customer:", error);
  }
}

// ============================================
// Root Layout Component
// ============================================
export default function RootLayout() {
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

// ============================================
// App Content Component
// ============================================
function AppContent() {
  const { isDark } = useTheme();
  const { user, setSession } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const realtimeSubscriptionRef = useRef<any>(null);

  // ─── Consent Gate State ────────────────────────────────────────────────
  const [showConsentGate, setShowConsentGate] = useState(false);
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);
  const [isNavigatingToSettings, setIsNavigatingToSettings] = useState(false);
  const [previousPathname, setPreviousPathname] = useState<string>("");

  // ─── Auth + Push Token + Customer Setup ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      try {
        console.log("🚀 Initializing app...");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
        }

        if (session?.user) {
          console.log("👤 User found:", session.user.email);

          await setupCustomerForReseller(session.user.email || "");

          const hasToken = await hasExistingPushToken();

          if (!hasToken) {
            console.log("📱 No existing push token, registering...");
            const tokens = await registerForPushNotificationsAsync();
            if (tokens) {
              await savePushTokenToDatabase(tokens);
            }
          } else {
            console.log("✅ Push token already exists - skipping registration");
          }
        } else {
          console.log("👤 No user session found");
        }
      } catch (error) {
        console.error("Error initializing app:", error);
      } finally {
        if (mounted) {
          await SplashScreen.hideAsync();
        }
      }
    }

    initializeApp();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`);
      setSession(session);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("👤 User signed in:", session.user.email);

        await setupCustomerForReseller(session.user.email || "");

        const hasToken = await hasExistingPushToken();

        if (!hasToken) {
          console.log("📱 No existing push token on sign in, registering...");
          const tokens = await registerForPushNotificationsAsync();
          if (tokens) {
            await savePushTokenToDatabase(tokens);
          }
        } else {
          console.log("✅ Push token already exists - skipping registration");
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
        realtimeSubscriptionRef.current?.unsubscribe();
        realtimeSubscriptionRef.current = null;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  // ─── Check Consent Status ─────────────────────────────────────────────
  const checkConsentStatus = useCallback(async () => {
    if (!user?.id) return;

    if (isNavigatingToSettings) {
      console.log("[ConsentGate] Skipping check - navigating to settings");
      return;
    }

    try {
      const accepted = await isConsentAccepted();
      const shouldShow = await checkAndShowConsent();

      console.log(
        "[ConsentGate] Status - accepted:",
        accepted,
        "shouldShow:",
        shouldShow,
      );

      if (shouldShow && !accepted) {
        setShowConsentGate(true);
      }
    } catch (error) {
      console.error("[ConsentGate] Error checking consent:", error);
    }
  }, [user?.id, isNavigatingToSettings]);

  // ─── Check consent when user logs in ───────────────────────────────────
  useEffect(() => {
    async function initialize() {
      setIsCheckingConsent(true);
      await checkConsentStatus();
      setIsCheckingConsent(false);
    }
    initialize();
  }, [checkConsentStatus]);

  // ─── Monitor path changes to detect returning from settings ───────────
  useEffect(() => {
    const isOnSecurityPage = pathname?.includes("security");

    if (
      isNavigatingToSettings &&
      !isOnSecurityPage &&
      previousPathname?.includes("security")
    ) {
      console.log("[ConsentGate] Returned from settings, re-checking consent");
      setIsNavigatingToSettings(false);
      setTimeout(() => {
        checkConsentStatus();
      }, 300);
    }

    setPreviousPathname(pathname || "");
  }, [pathname, isNavigatingToSettings, checkConsentStatus, previousPathname]);

  // ─── Realtime Subscription for Notifications ───────────────────────────
  useEffect(() => {
    if (!user?.id) {
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
      return;
    }

    console.log("📡 Setting up realtime notifications for user:", user.id);

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_notifications" },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "global_customer_notifications",
        },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();

    realtimeSubscriptionRef.current = channel;

    return () => {
      console.log("🧹 Cleaning up realtime subscription");
      channel.unsubscribe();
      realtimeSubscriptionRef.current = null;
    };
  }, [user?.id]);

  // ─── Push Notification Listeners ───────────────────────────────────────
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      () => {
        console.log("📬 Foreground notification received");
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification tapped");
        const data = response.notification.request.content.data;
        const route = data?.route || "/(app)/(protected)/notifications";
        router.push(route as any);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // ─── Handle Open Settings from Consent Gate ────────────────────────────
  const handleOpenSettingsFromConsent = () => {
    console.log("[ConsentGate] Opening settings - START");
    setIsNavigatingToSettings(true);
    setShowConsentGate(false);

    // Use setTimeout to ensure modal is fully closed before navigation
    setTimeout(() => {
      console.log("[ConsentGate] Navigating to security page now");
      router.push({
        pathname: "/(app)/(protected)/security",
        params: { previewMode: "true" },
      });
    }, 100);
  };

  // ─── Handle Consent Accepted ───────────────────────────────────────────
  const handleConsentAccepted = () => {
    console.log("[ConsentGate] Consent accepted");
    setShowConsentGate(false);
    setIsNavigatingToSettings(false);
  };

  // ─── Handle Dismiss ────────────────────────────────────────────────────
  const handleDismiss = () => {
    console.log("[ConsentGate] Dismissed");
    setShowConsentGate(false);
  };

  // Don't render anything while checking consent
  if (isCheckingConsent) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
      <EarningsConsentGate
        visible={showConsentGate}
        onDismiss={handleDismiss}
        onOpenSettings={handleOpenSettingsFromConsent}
        onConsentAccepted={handleConsentAccepted}
      />
    </>
  );
}