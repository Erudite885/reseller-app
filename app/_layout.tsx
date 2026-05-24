// app/_layout.tsx

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

// ============================================
// Push Notification Registration
// ============================================
async function registerForPushNotificationsAsync() {
  try {
    console.log("📱 Starting push notification registration...");

    // Set up Android notification channel
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

    // Check if it's a physical device
    if (!Device.isDevice) {
      console.log("⚠️ Physical device required for push notifications");
      return null;
    }

    // Check/request permissions
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

    console.log("✅ Notification permission granted");

    // Get Expo push token - Use the project ID from app.config.ts
    const projectId = "bde21e0b-dd38-48b3-a695-ec1b381c3890";

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log("✅ Expo push token obtained successfully");
    return token;
  } catch (error: any) {
    // This catches the Firebase error and ignores it
    console.log(
      "⚠️ Push notification error (safe to ignore):",
      error?.message || "Unknown error",
    );
    return null;
  }
}

// ============================================
// Check if Push Token Already Exists
// ============================================
async function hasExistingPushToken(userId: string): Promise<boolean> {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;

    // Check if user is a reseller
    const { data: reseller } = await supabase
      .from("resellers")
      .select("push_token, notifications_enabled")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (reseller) {
      const hasToken = !!(
        reseller.push_token && reseller.notifications_enabled
      );
      console.log(`🔍 Reseller push token exists: ${hasToken}`);
      return hasToken;
    }

    // Check if user is a customer
    const { data: resellerStore } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .maybeSingle();

    if (resellerStore) {
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("push_token, notifications_enabled")
        .eq("auth_user_id", userId)
        .eq("reseller_id", resellerStore.id)
        .maybeSingle();

      if (customer) {
        const hasToken = !!(
          customer.push_token && customer.notifications_enabled
        );
        console.log(`🔍 Customer push token exists: ${hasToken}`);
        return hasToken;
      }
    }

    console.log("🔍 No push token found for user");
    return false;
  } catch (error) {
    console.error("Error checking push token:", error);
    return false;
  }
}

// ============================================
// Save Push Token to Database
// ============================================
async function savePushTokenToDatabase(token: string, userId: string) {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;
    console.log("💾 Saving push token to database for user:", userId);

    // Try to save as reseller first
    const { data: reseller } = await supabase
      .from("resellers")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (reseller) {
      const { error } = await supabase
        .from("resellers")
        .update({
          push_token: token,
          notifications_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reseller.id);

      if (!error) {
        console.log("✅ Push token saved for reseller");
        return true;
      }
    }

    // Try to save as customer
    const { data: resellerStore } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .maybeSingle();

    if (resellerStore) {
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", userId)
        .eq("reseller_id", resellerStore.id)
        .maybeSingle();

      if (customer) {
        const { error } = await supabase
          .from("reseller_customers")
          .update({
            push_token: token,
            notifications_enabled: true,
          })
          .eq("id", customer.id);

        if (!error) {
          console.log("✅ Push token saved for customer");
          return true;
        }
      }
    }

    console.log("⚠️ Could not save push token - no matching profile");
    return false;
  } catch (error) {
    console.error("❌ Error saving push token:", error);
    return false;
  }
}

// ============================================
// Setup Customer for Reseller
// ============================================
async function setupCustomerForReseller(userId: string, userEmail: string) {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;
    const username = userEmail.split("@")[0];

    const { data: reseller } = await supabase
      .from("resellers")
      .select("id, store_name")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .maybeSingle();

    if (!reseller) {
      console.log("[Auth] No active reseller found for store:", storeSlug);
      return;
    }

    // Check if customer exists
    const { data: existingCustomer } = await supabase
      .from("reseller_customers")
      .select("id, auth_user_id")
      .eq("reseller_id", reseller.id)
      .eq("email", userEmail)
      .maybeSingle();

    let customerId: string | null = null;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (!existingCustomer.auth_user_id) {
        await supabase
          .from("reseller_customers")
          .update({ auth_user_id: userId })
          .eq("id", existingCustomer.id);
      }
    } else {
      const { data: newCustomer } = await supabase
        .from("reseller_customers")
        .insert({
          reseller_id: reseller.id,
          email: userEmail,
          first_name: username,
          auth_user_id: userId,
        })
        .select("id")
        .maybeSingle();

      if (newCustomer) customerId = newCustomer.id;
    }

    // Create wallet if needed
    if (customerId) {
      const { data: existingWallet } = await supabase
        .from("reseller_customer_wallets")
        .select("id")
        .eq("reseller_id", reseller.id)
        .eq("customer_id", customerId)
        .maybeSingle();

      if (!existingWallet) {
        await supabase.from("reseller_customer_wallets").insert({
          reseller_id: reseller.id,
          customer_id: customerId,
          balance: 0,
          total_spent: 0,
        });
        console.log("[Auth] ✅ Customer wallet created");
      }
    }

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
  const realtimeSubscriptionRef = useRef<any>(null);

  // ─── Auth + Push Token + Customer Setup ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      try {
        console.log("🚀 Initializing app...");

        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
        }

        if (session?.user) {
          console.log("👤 User found:", session.user.email);

          // Setup customer/reseller records
          await setupCustomerForReseller(
            session.user.id,
            session.user.email || "",
          );

          // ✅ Check if push token already exists before registering
          const hasToken = await hasExistingPushToken(session.user.id);

          if (!hasToken) {
            console.log("📱 No existing push token, registering...");
            const token = await registerForPushNotificationsAsync();
            if (token) {
              await savePushTokenToDatabase(token, session.user.id);
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`);
      setSession(session);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("👤 User signed in:", session.user.email);

        // Setup customer/reseller records
        await setupCustomerForReseller(
          session.user.id,
          session.user.email || "",
        );

        // ✅ Check if push token already exists on sign in
        const hasToken = await hasExistingPushToken(session.user.id);

        if (!hasToken) {
          console.log("📱 No existing push token on sign in, registering...");
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushTokenToDatabase(token, session.user.id);
          }
        } else {
          console.log("✅ Push token already exists - skipping registration");
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
        // Clean up realtime subscription on sign out
        realtimeSubscriptionRef.current?.unsubscribe();
        realtimeSubscriptionRef.current = null;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

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
        { event: "*", schema: "public", table: "reseller_notifications" },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reseller_customer_notifications",
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

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Slot />
    </>
  );
}
