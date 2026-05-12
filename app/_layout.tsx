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
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});

// ============================================
// Push Notification Registration
// ============================================
async function registerForPushNotificationsAsync() {
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
  }

  // Must use physical device for push notifications
  if (!Device.isDevice) {
    console.log("⚠️ Must use physical device for Push Notifications");
    return null;
  }

  // Check/request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ Failed to get push token - permission denied");
    return null;
  }

  // Get Expo push token (no Firebase needed)
  try {
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      )
    ).data;

    console.log("✅ Push token obtained:", token.substring(0, 20) + "...");
    return token;
  } catch (error) {
    console.error("❌ Failed to get push token:", error);
    return null;
  }
}

// ============================================
// Save Push Token to Database
// ============================================
async function savePushTokenToDatabase(token: string, userId: string) {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;

    // Check if user is a reseller
    const { data: reseller } = await supabase
      .from("resellers")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (reseller) {
      const { error } = await supabase
        .from("resellers")
        .update({
          push_token: token,
          notifications_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reseller.id);

      if (error) throw error;
      console.log("✅ Push token saved for reseller:", storeSlug);
      return;
    }

    // Check if user is a customer of the current reseller
    const { data: resellerStore } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .single();

    if (resellerStore) {
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", userId)
        .eq("reseller_id", resellerStore.id)
        .single();

      if (customer) {
        const { error } = await supabase
          .from("reseller_customers")
          .update({
            push_token: token,
            notifications_enabled: true,
          })
          .eq("id", customer.id);

        if (error) throw error;
        console.log("✅ Push token saved for customer of:", storeSlug);
        return;
      }
    }

    // Fallback: Save to profiles table
    const { error } = await supabase
      .from("profiles")
      .update({
        push_token: token,
        notifications_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    console.log("✅ Push token saved to profiles");
  } catch (error) {
    console.error("❌ Error saving push token:", error);
  }
}

// ============================================
// Check if Push Token Already Exists
// ============================================
async function hasExistingPushToken(userId: string): Promise<boolean> {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;

    // Check reseller
    const { data: reseller } = await supabase
      .from("resellers")
      .select("push_token, notifications_enabled")
      .eq("auth_user_id", userId)
      .single();

    if (reseller) {
      return !!(reseller.push_token && reseller.notifications_enabled);
    }

    // Check customer
    const { data: resellerStore } = await supabase
      .from("resellers")
      .select("id")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .single();

    if (resellerStore) {
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("push_token, notifications_enabled")
        .eq("auth_user_id", userId)
        .eq("reseller_id", resellerStore.id)
        .single();

      if (customer) {
        return !!(customer.push_token && customer.notifications_enabled);
      }
    }

    // Check profiles fallback
    const { data: profile } = await supabase
      .from("profiles")
      .select("push_token, notifications_enabled")
      .eq("id", userId)
      .single();

    return !!(profile?.push_token && profile?.notifications_enabled);
  } catch (error) {
    console.error("Error checking push token:", error);
    return false;
  }
}

// ============================================
// Setup Customer for Reseller
// ============================================
// async function setupCustomerForReseller(userId: string, userEmail: string) {
//   try {
//     const storeSlug = useResellerStore.getState().config.storeName;

//     // Find the reseller by store name
//     const { data: reseller, error: resellerError } = await supabase
//       .from("resellers")
//       .select("id, store_name")
//       .eq("store_name", storeSlug)
//       .eq("status", "active")
//       .single();

//     if (resellerError || !reseller) {
//       console.log("[Auth] No active reseller found for store:", storeSlug);
//       return;
//     }

//     // Upsert customer record (scoped to this reseller)
//     const { error: customerError } = await supabase
//       .from("reseller_customers")
//       .upsert(
//         {
//           reseller_id: reseller.id,
//           email: userEmail,
//           auth_user_id: userId,
//         },
//         {
//           onConflict: "reseller_id,email",
//           ignoreDuplicates: true,
//         },
//       );

//     if (customerError) {
//       console.error("[Auth] Failed to upsert customer:", customerError);
//       return;
//     }

//     // Create wallet if it doesn't exist
//     const { data: existingWallet, error: walletQueryError } = await supabase
//       .from("reseller_customer_wallets")
//       .select("id")
//       .eq("reseller_id", reseller.id)
//       .eq("customer_id", userId)
//       .single();

//     if (walletQueryError && walletQueryError.code !== "PGRST116") {
//       console.error("[Auth] Error checking wallet:", walletQueryError);
//     }

//     if (!existingWallet) {
//       const { error: walletError } = await supabase
//         .from("reseller_customer_wallets")
//         .insert({
//           reseller_id: reseller.id,
//           customer_id: userId,
//           balance: 0,
//           total_spent: 0,
//         });

//       if (walletError) {
//         console.error("[Auth] Failed to create customer wallet:", walletError);
//       } else {
//         console.log("[Auth] ✅ Customer wallet created for:", userEmail);
//       }
//     }

//     // Check if this user is the store owner
//     const { data: storeOwner } = await supabase
//       .from("resellers")
//       .select("auth_user_id")
//       .eq("store_name", storeSlug)
//       .eq("auth_user_id", userId)
//       .single();

//     if (storeOwner) {
//       console.log("[Auth] 👑 Store owner logged in:", storeSlug);
//     } else {
//       console.log("[Auth] 👤 Customer logged in:", userEmail);
//     }
//   } catch (error) {
//     console.error("[Auth] ❌ Error setting up customer:", error);
//   }
// }

async function setupCustomerForReseller(userId: string, userEmail: string) {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;
    const username = userEmail.split("@")[0];

    const { data: reseller, error: resellerError } = await supabase
      .from("resellers")
      .select("id, store_name")
      .eq("store_name", storeSlug)
      .eq("status", "active")
      .single();

    if (resellerError || !reseller) {
      console.log("[Auth] No active reseller found for store:", storeSlug);
      return;
    }

    // Check if customer exists for this reseller
    const { data: existingCustomer } = await supabase
      .from("reseller_customers")
      .select("id, auth_user_id")
      .eq("reseller_id", reseller.id)
      .eq("email", userEmail)
      .single();

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
        .single();

      if (newCustomer) customerId = newCustomer.id;
    }

    // Create wallet using reseller_customers.id
    if (customerId) {
      const { data: existingWallet } = await supabase
        .from("reseller_customer_wallets")
        .select("id")
        .eq("reseller_id", reseller.id)
        .eq("customer_id", customerId)
        .single();

      if (!existingWallet) {
        await supabase.from("reseller_customer_wallets").insert({
          reseller_id: reseller.id,
          customer_id: customerId,
          balance: 0,
          total_spent: 0,
        });
        console.log("[Auth] ✅ Customer wallet created for:", userEmail);
      }
    }

    // Check if store owner
    const { data: storeOwner } = await supabase
      .from("resellers")
      .select("auth_user_id")
      .eq("store_name", storeSlug)
      .eq("auth_user_id", userId)
      .single();

    if (storeOwner) {
      console.log("[Auth] 👑 Store owner logged in:", storeSlug);
    } else {
      console.log("[Auth] 👤 Customer logged in:", userEmail);
    }
  } catch (error) {
    console.error("[Auth] ❌ Error setting up customer:", error);
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
          console.log("👤 User session found:", session.user.email);

          // Setup customer/reseller records
          await setupCustomerForReseller(
            session.user.id,
            session.user.email || "",
          );

          // Check if push token already exists
          const hasToken = await hasExistingPushToken(session.user.id);

          if (!hasToken) {
            console.log("📱 No existing push token, registering...");
            const token = await registerForPushNotificationsAsync();
            if (token) {
              await savePushTokenToDatabase(token, session.user.id);
            }
          } else {
            console.log("✅ Push token already exists");
          }
        } else {
          console.log("👤 No user session found");
        }
      } catch (error) {
        console.error("❌ Error initializing app:", error);
      } finally {
        if (mounted) {
          await SplashScreen.hideAsync();
          console.log("🎉 App initialized successfully");
        }
      }
    }

    initializeApp();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth state changed: ${event}`);

      setSession(session);

      if (event === "SIGNED_IN" && session?.user) {
        console.log("👤 User signed in:", session.user.email);

        // Setup customer/reseller records
        await setupCustomerForReseller(
          session.user.id,
          session.user.email || "",
        );

        // Register for push notifications on sign in
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushTokenToDatabase(token, session.user.id);
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
      // Clean up subscription if user logs out
      realtimeSubscriptionRef.current?.unsubscribe();
      realtimeSubscriptionRef.current = null;
      return;
    }

    console.log("📡 Setting up realtime notifications for user:", user.id);

    // Create realtime subscription for both notification tables
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reseller_notifications",
        },
        (payload) => {
          console.log("📬 New reseller notification:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reseller_customer_notifications",
        },
        (payload) => {
          console.log("📬 New customer notification:", payload.eventType);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe((status) => {
        console.log("📡 Realtime subscription status:", status);
      });

    realtimeSubscriptionRef.current = channel;

    return () => {
      console.log("🧹 Cleaning up realtime subscription");
      channel.unsubscribe();
      realtimeSubscriptionRef.current = null;
    };
  }, [user?.id]);

  // ─── Push Notification Listeners ───────────────────────────────────────
  useEffect(() => {
    // Handle notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log(
          "📬 Foreground notification received:",
          notification.request.identifier,
        );
        // Invalidate notifications query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    );

    // Handle notification taps (when user taps on notification)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "👆 Notification tapped:",
          response.notification.request.identifier,
        );

        const data = response.notification.request.content.data;
        const route = data?.route || "/(app)/(protected)/notifications";

        // Mark notification as read in database
        if (data?.notificationId) {
          // Try both tables
          supabase
            .from("reseller_notifications")
            .update({ is_read: true })
            .eq("id", data.notificationId)
            .then(({ error }) => {
              if (error)
                console.error("Error marking notification as read:", error);
            });

          supabase
            .from("reseller_customer_notifications")
            .update({ is_read: true })
            .eq("id", data.notificationId)
            .then(({ error }) => {
              if (error)
                console.error("Error marking notification as read:", error);
            });

          // Invalidate notifications query
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }

        // Navigate to the specified route
        router.push(route as any);
      });

    return () => {
      console.log("🧹 Cleaning up notification listeners");
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
