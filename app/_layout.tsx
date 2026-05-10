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
async function setupCustomerForReseller(userId: string, userEmail: string) {
  try {
    const storeSlug = useResellerStore.getState().config.storeName;

    // Find the reseller by store name
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

    // Upsert customer record (scoped to this reseller)
    const { error: customerError } = await supabase
      .from("reseller_customers")
      .upsert(
        {
          reseller_id: reseller.id,
          email: userEmail,
          auth_user_id: userId,
        },
        {
          onConflict: "reseller_id,email",
          ignoreDuplicates: true,
        },
      );

    if (customerError) {
      console.error("[Auth] Failed to upsert customer:", customerError);
      return;
    }

    // Create wallet if it doesn't exist
    const { data: existingWallet, error: walletQueryError } = await supabase
      .from("reseller_customer_wallets")
      .select("id")
      .eq("reseller_id", reseller.id)
      .eq("customer_id", userId)
      .single();

    if (walletQueryError && walletQueryError.code !== "PGRST116") {
      console.error("[Auth] Error checking wallet:", walletQueryError);
    }

    if (!existingWallet) {
      const { error: walletError } = await supabase
        .from("reseller_customer_wallets")
        .insert({
          reseller_id: reseller.id,
          customer_id: userId,
          balance: 0,
          total_spent: 0,
        });

      if (walletError) {
        console.error("[Auth] Failed to create customer wallet:", walletError);
      } else {
        console.log("[Auth] ✅ Customer wallet created for:", userEmail);
      }
    }

    // Check if this user is the store owner
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

// // app/_layout.tsx

// import { Slot } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import { QueryClientProvider } from "@tanstack/react-query";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import * as SplashScreen from "expo-splash-screen";
// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { useEffect, useRef } from "react";
// import { Platform } from "react-native";
// import { useRouter } from "expo-router";

// import { queryClient } from "@/lib/queryClient";
// import { useTheme } from "@/hooks/useTheme";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowBanner: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//     shouldShowList: true,
//   }),
// });

// async function registerForPushNotificationsAsync() {
//   if (Platform.OS === "android") {
//     await Notifications.setNotificationChannelAsync("default", {
//       name: "default",
//       importance: Notifications.AndroidImportance.MAX,
//       vibrationPattern: [0, 250, 250, 250],
//       lightColor: (() => {
//         try {
//           return useResellerStore.getState().config.theme.primary + "7c";
//         } catch {
//           return "#3791147c";
//         }
//       })(),
//     });
//   }

//   if (!Device.isDevice) {
//     console.log("Must use physical device for Push Notifications");
//     return null;
//   }

//   const { status: existingStatus } = await Notifications.getPermissionsAsync();
//   let finalStatus = existingStatus;

//   if (existingStatus !== "granted") {
//     const { status } = await Notifications.requestPermissionsAsync();
//     finalStatus = status;
//   }

//   if (finalStatus !== "granted") {
//     console.log("Failed to get push token");
//     return null;
//   }

//   const token = (await Notifications.getExpoPushTokenAsync()).data;
//   return token;
// }

// async function savePushTokenToDatabase(token: string, userId: string) {
//   try {
//     const storeSlug = useResellerStore.getState().config.storeName;

//     // Check if user is a reseller
//     const { data: reseller } = await supabase
//       .from("resellers")
//       .select("id")
//       .eq("auth_user_id", userId)
//       .single();

//     if (reseller) {
//       await supabase
//         .from("resellers")
//         .update({
//           push_token: token,
//           notifications_enabled: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", reseller.id);
//       console.log("✅ Push token saved for reseller");
//       return;
//     }

//     // Check if user is a customer
//     const { data: resellerStore } = await supabase
//       .from("resellers")
//       .select("id")
//       .eq("store_name", storeSlug)
//       .eq("status", "active")
//       .single();

//     if (resellerStore) {
//       const { data: customer } = await supabase
//         .from("reseller_customers")
//         .select("id")
//         .eq("auth_user_id", userId)
//         .eq("reseller_id", resellerStore.id)
//         .single();

//       if (customer) {
//         await supabase
//           .from("reseller_customers")
//           .update({
//             push_token: token,
//             notifications_enabled: true,
//           })
//           .eq("id", customer.id);
//         console.log("✅ Push token saved for customer");
//         return;
//       }
//     }

//     // Fallback to profiles table
//     await supabase
//       .from("profiles")
//       .update({
//         push_token: token,
//         notifications_enabled: true,
//         updated_at: new Date().toISOString(),
//       })
//       .eq("id", userId);
//     console.log("✅ Push token saved to profiles");
//   } catch (error) {
//     console.error("Error saving push token:", error);
//   }
// }

// async function setupCustomerForReseller(userId: string, userEmail: string) {
//   try {
//     const storeSlug = useResellerStore.getState().config.storeName;

//     const { data: reseller } = await supabase
//       .from("resellers")
//       .select("id")
//       .eq("store_name", storeSlug)
//       .eq("status", "active")
//       .single();

//     if (!reseller) {
//       console.log("[Auth] No active reseller found for store:", storeSlug);
//       return;
//     }

//     // Upsert customer record
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

//     // Create wallet if not exists
//     const { data: existingWallet } = await supabase
//       .from("reseller_customer_wallets")
//       .select("id")
//       .eq("reseller_id", reseller.id)
//       .eq("customer_id", userId)
//       .single();

//     if (!existingWallet) {
//       await supabase.from("reseller_customer_wallets").insert({
//         reseller_id: reseller.id,
//         customer_id: userId,
//         balance: 0,
//         total_spent: 0,
//       });
//       console.log("[Auth] Customer wallet created for:", userEmail);
//     }

//     // Check if store owner
//     const { data: storeOwner } = await supabase
//       .from("resellers")
//       .select("auth_user_id")
//       .eq("store_name", storeSlug)
//       .eq("auth_user_id", userId)
//       .single();

//     if (storeOwner) {
//       console.log("[Auth] Store owner logged in:", storeSlug);
//     }
//   } catch (error) {
//     console.error("[Auth] Error setting up customer:", error);
//   }
// }

// export default function RootLayout() {
//   useEffect(() => {
//     SplashScreen.preventAutoHideAsync();
//   }, []);

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <SafeAreaProvider>
//         <QueryClientProvider client={queryClient}>
//           <AppContent />
//         </QueryClientProvider>
//       </SafeAreaProvider>
//     </GestureHandlerRootView>
//   );
// }

// function AppContent() {
//   const { isDark } = useTheme();
//   const { user, setSession } = useAuthStore();
//   const router = useRouter();
//   const realtimeSubscriptionRef = useRef<any>(null);
//   const storeSlug = useResellerStore.getState().config.storeName;

//   // ─── Auth + Push Token + Customer Setup ────────────────────────────────────
//   useEffect(() => {
//     async function initializeApp() {
//       try {
//         const {
//           data: { session },
//         } = await supabase.auth.getSession();
//         setSession(session);

//         if (session?.user) {
//           await setupCustomerForReseller(
//             session.user.id,
//             session.user.email || "",
//           );

//           // Push token - check reseller first, then customer
//           const resellerId = await getResellerId();
//           let hasPushToken = false;

//           if (resellerId) {
//             // Check if user is reseller
//             const { data: reseller } = await supabase
//               .from("resellers")
//               .select("push_token, notifications_enabled")
//               .eq("auth_user_id", session.user.id)
//               .eq("id", resellerId)
//               .single();

//             if (reseller) {
//               hasPushToken = !!(
//                 reseller.push_token && reseller.notifications_enabled
//               );
//             } else {
//               // Check if customer
//               const { data: customer } = await supabase
//                 .from("reseller_customers")
//                 .select("push_token, notifications_enabled")
//                 .eq("auth_user_id", session.user.id)
//                 .eq("reseller_id", resellerId)
//                 .single();

//               if (customer) {
//                 hasPushToken = !!(
//                   customer.push_token && customer.notifications_enabled
//                 );
//               }
//             }
//           }

//           if (!hasPushToken) {
//             const token = await registerForPushNotificationsAsync();
//             if (token) await savePushTokenToDatabase(token, session.user.id);
//           }
//         }
//       } catch (error) {
//         console.error("Error initializing app:", error);
//       } finally {
//         SplashScreen.hideAsync();
//       }
//     }

//     initializeApp();

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(async (_event, session) => {
//       setSession(session);

//       if (_event === "SIGNED_IN" && session?.user) {
//         await setupCustomerForReseller(
//           session.user.id,
//           session.user.email || "",
//         );

//         const token = await registerForPushNotificationsAsync();
//         if (token) await savePushTokenToDatabase(token, session.user.id);
//       }
//     });

//     return () => subscription.unsubscribe();
//   }, [setSession]);

//   // ─── Realtime Subscription for Notifications ───────────────────────────────
//   useEffect(() => {
//     if (!user?.id) {
//       realtimeSubscriptionRef.current?.unsubscribe();
//       realtimeSubscriptionRef.current = null;
//       return;
//     }

//     const channel = supabase
//       .channel(`notifications:${user.id}`)
//       .on(
//         "postgres_changes",
//         { event: "*", schema: "public", table: "reseller_notifications" },
//         () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
//       )
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "reseller_customer_notifications",
//         },
//         () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
//       )
//       .subscribe();

//     realtimeSubscriptionRef.current = channel;

//     return () => {
//       channel.unsubscribe();
//       realtimeSubscriptionRef.current = null;
//     };
//   }, [user?.id]);

//   // ─── Push Notification Listeners ───────────────────────────────────────────
//   useEffect(() => {
//     const notificationListener = Notifications.addNotificationReceivedListener(
//       () => {
//         queryClient.invalidateQueries({ queryKey: ["notifications"] });
//       },
//     );

//     const responseListener =
//       Notifications.addNotificationResponseReceivedListener((response) => {
//         const data = response.notification.request.content.data;
//         const route = data?.route || "/(app)/(protected)/notifications";

//         if (data?.notificationId) {
//           // Try both tables
//           supabase
//             .from("reseller_notifications")
//             .update({ is_read: true })
//             .eq("id", data.notificationId)
//             .then(() => {});

//           supabase
//             .from("reseller_customer_notifications")
//             .update({ is_read: true })
//             .eq("id", data.notificationId)
//             .then(() => {});
//         }

//         router.push(route as any);
//       });

//     return () => {
//       notificationListener.remove();
//       responseListener.remove();
//     };
//   }, [user?.id]);

//   return (
//     <>
//       <StatusBar style={isDark ? "light" : "dark"} />
//       <Slot />
//     </>
//   );
// }

// async function getResellerId(): Promise<string | null> {
//   try {
//     const storeSlug = useResellerStore.getState().config.storeName;
//     const { data } = await supabase
//       .from("resellers")
//       .select("id")
//       .eq("store_name", storeSlug)
//       .eq("status", "active")
//       .single();
//     return data?.id || null;
//   } catch {
//     return null;
//   }
// }

// // import { Slot } from "expo-router";
// // import { StatusBar } from "expo-status-bar";
// // import { QueryClientProvider } from "@tanstack/react-query";
// // import { GestureHandlerRootView } from "react-native-gesture-handler";
// // import { SafeAreaProvider } from "react-native-safe-area-context";
// // import * as SplashScreen from "expo-splash-screen";
// // import * as Notifications from "expo-notifications";
// // import * as Device from "expo-device";
// // import { useEffect, useRef } from "react";
// // import { Platform } from "react-native";
// // import { useRouter } from "expo-router";

// // import { queryClient } from "@/lib/queryClient";
// // import { useTheme } from "@/hooks/useTheme";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";
// // import { useResellerStore } from "@/store/resellerStore";

// // Notifications.setNotificationHandler({
// //   handleNotification: async () => ({
// //     shouldShowBanner: true,
// //     shouldPlaySound: true,
// //     shouldSetBadge: true,
// //     shouldShowList: true,
// //   }),
// // });

// // async function registerForPushNotificationsAsync() {
// //   if (Platform.OS === "android") {
// //     await Notifications.setNotificationChannelAsync("default", {
// //       name: "default",
// //       importance: Notifications.AndroidImportance.MAX,
// //       vibrationPattern: [0, 250, 250, 250],
// //       lightColor: (() => {
// //   try {
// //     return useResellerStore.getState().config.theme.primary + "7c";
// //   } catch {
// //     return "#3791147c";
// //   }
// // })(),
// //     });
// //   }

// //   if (!Device.isDevice) {
// //     console.log("Must use physical device for Push Notifications");
// //     return null;
// //   }

// //   const { status: existingStatus } = await Notifications.getPermissionsAsync();
// //   let finalStatus = existingStatus;

// //   if (existingStatus !== "granted") {
// //     const { status } = await Notifications.requestPermissionsAsync();
// //     finalStatus = status;
// //   }

// //   if (finalStatus !== "granted") {
// //     console.log("Failed to get push token");
// //     return null;
// //   }

// //   // const token = (
// //   //   await Notifications.getExpoPushTokenAsync({
// //   //     projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
// //   //   })
// //   // ).data;
// //   const token = (await Notifications.getDevicePushTokenAsync()).data;

// //   return token;
// // }

// // async function savePushTokenToDatabase(token: string, userId: string) {
// //   try {
// //     const { error } = await supabase
// //       .from("profiles")
// //       .update({
// //         push_token: token,
// //         notifications_enabled: true,
// //         updated_at: new Date().toISOString(),
// //       })
// //       .eq("id", userId);

// //     if (error) throw error;
// //     console.log("✅ Push token saved successfully!");
// //   } catch (error) {
// //     console.error("Error saving push token:", error);
// //   }
// // }

// // /**
// //  * When a user signs in through a reseller's app, ensure they have
// //  * a customer record and wallet scoped to that reseller.
// //  */
// // async function setupCustomerForReseller(userId: string, userEmail: string) {
// //   try {
// //     const storeSlug = useResellerStore.getState().config.storeName;

// //     // Get the reseller by store name
// //     const { data: reseller } = await supabase
// //       .from("resellers")
// //       .select("id")
// //       .eq("store_name", storeSlug)
// //       .eq("status", "active")
// //       .single();

// //     if (!reseller) {
// //       console.log("[Auth] No active reseller found for store:", storeSlug);
// //       return;
// //     }

// //     // Upsert customer record (scoped to this reseller)
// //     const { error: customerError } = await supabase
// //       .from("reseller_customers")
// //       .upsert(
// //         {
// //           reseller_id: reseller.id,
// //           email: userEmail,
// //           auth_user_id: userId,
// //         },
// //         {
// //           onConflict: "reseller_id,email",
// //           ignoreDuplicates: true,
// //         },
// //       );

// //     if (customerError) {
// //       console.error("[Auth] Failed to upsert customer:", customerError);
// //       return;
// //     }

// //     // Check if customer wallet exists
// //     const { data: existingWallet } = await supabase
// //       .from("reseller_customer_wallets")
// //       .select("id")
// //       .eq("reseller_id", reseller.id)
// //       .eq("customer_id", userId)
// //       .single();

// //     // Create wallet if not exists
// //     if (!existingWallet) {
// //       const { error: walletError } = await supabase
// //         .from("reseller_customer_wallets")
// //         .insert({
// //           reseller_id: reseller.id,
// //           customer_id: userId,
// //           balance: 0,
// //           total_spent: 0,
// //         });

// //       if (walletError) {
// //         console.error("[Auth] Failed to create customer wallet:", walletError);
// //       } else {
// //         console.log("[Auth] Customer wallet created for:", userEmail);
// //       }
// //     }

// //     // Check if this user is the store owner
// //     const { data: storeOwner } = await supabase
// //       .from("resellers")
// //       .select("auth_user_id")
// //       .eq("store_name", storeSlug)
// //       .eq("auth_user_id", userId)
// //       .single();

// //     if (storeOwner) {
// //       console.log("[Auth] Store owner logged in:", storeSlug);
// //     }
// //   } catch (error) {
// //     console.error("[Auth] Error setting up customer:", error);
// //   }
// // }

// // export default function RootLayout() {
// //   useEffect(() => {
// //     SplashScreen.preventAutoHideAsync();
// //   }, []);

// //   return (
// //     <GestureHandlerRootView style={{ flex: 1 }}>
// //       <SafeAreaProvider>
// //         <QueryClientProvider client={queryClient}>
// //           <AppContent />
// //         </QueryClientProvider>
// //       </SafeAreaProvider>
// //     </GestureHandlerRootView>
// //   );
// // }

// // function AppContent() {
// //   const { isDark } = useTheme();
// //   const { user, setSession } = useAuthStore();
// //   const router = useRouter();
// //   const realtimeSubscriptionRef = useRef<any>(null);

// //   // ─── Auth + Push Token + Customer Setup ────────────────────────────────────
// //   useEffect(() => {
// //     async function initializeApp() {
// //       try {
// //         const {
// //           data: { session },
// //         } = await supabase.auth.getSession();
// //         setSession(session);

// //         if (session?.user) {
// //           // Setup customer record for this reseller
// //           await setupCustomerForReseller(
// //             session.user.id,
// //             session.user.email || "",
// //           );

// //           // Push token setup
// //           const { data: profile } = await supabase
// //             .from("profiles")
// //             .select("notifications_enabled, push_token")
// //             .eq("id", session.user.id)
// //             .single();

// //           if (!profile?.push_token || !profile?.notifications_enabled) {
// //             const token = await registerForPushNotificationsAsync();
// //             if (token) await savePushTokenToDatabase(token, session.user.id);
// //           }
// //         }
// //       } catch (error) {
// //         console.error("Error initializing app:", error);
// //       } finally {
// //         SplashScreen.hideAsync();
// //       }
// //     }

// //     initializeApp();

// //     const {
// //       data: { subscription },
// //     } = supabase.auth.onAuthStateChange(async (_event, session) => {
// //       setSession(session);

// //       if (_event === "SIGNED_IN" && session?.user) {
// //         // Setup customer record for this reseller
// //         await setupCustomerForReseller(
// //           session.user.id,
// //           session.user.email || "",
// //         );

// //         // Push token
// //         const { data: profile } = await supabase
// //           .from("profiles")
// //           .select("notifications_enabled, push_token")
// //           .eq("id", session.user.id)
// //           .single();

// //         if (!profile?.push_token || !profile?.notifications_enabled) {
// //           const token = await registerForPushNotificationsAsync();
// //           if (token) await savePushTokenToDatabase(token, session.user.id);
// //         }
// //       }
// //     });

// //     return () => subscription.unsubscribe();
// //   }, [setSession]);

// //   // ─── Single Realtime Subscription for Notifications ────────────────────────
// //  useEffect(() => {
// //    if (!user?.id) {
// //      realtimeSubscriptionRef.current?.unsubscribe();
// //      realtimeSubscriptionRef.current = null;
// //      return;
// //    }

// //    realtimeSubscriptionRef.current = supabase
// //      .channel(`notifications:${user.id}`)
// //      .on(
// //        "postgres_changes",
// //        {
// //          event: "*",
// //          schema: "public",
// //          table: "notifications",
// //          filter: `user_id=eq.${user.id}`,
// //        },
// //        () => {
// //          queryClient.invalidateQueries({
// //            queryKey: ["notifications", user.id],
// //          });
// //        },
// //      )
// //      .subscribe();

// //    return () => {
// //      realtimeSubscriptionRef.current?.unsubscribe();
// //      realtimeSubscriptionRef.current = null;
// //    };
// //  }, [user?.id]);

// //   // ─── Push Notification Listeners ───────────────────────────────────────────
// //   useEffect(() => {
// //     const notificationListener = Notifications.addNotificationReceivedListener(
// //       () => {
// //         queryClient.invalidateQueries({
// //           queryKey: ["notifications", user?.id],
// //         });
// //       },
// //     );

// //     const responseListener =
// //       Notifications.addNotificationResponseReceivedListener((response) => {
// //         const data = response.notification.request.content.data;
// //         const route = data?.route || "/(app)/(protected)/notifications";

// //         if (data?.notificationId) {
// //           queryClient.setQueryData(["notifications", user?.id], (old: any[]) =>
// //             old?.map((n) =>
// //               n.id === data.notificationId ? { ...n, isRead: true } : n,
// //             ),
// //           );
// //           supabase
// //             .from("notifications")
// //             .update({ is_read: true, updated_at: new Date().toISOString() })
// //             .eq("id", data.notificationId)
// //             .then(() => {});
// //         }

// //         router.push(route as any);
// //       });

// //     return () => {
// //       notificationListener.remove();
// //       responseListener.remove();
// //     };
// //   }, [user?.id]);

// //   return (
// //     <>
// //       <StatusBar style={isDark ? "light" : "dark"} />
// //       <Slot />
// //     </>
// //   );
// // }

// // // import { Slot } from "expo-router";
// // // import { StatusBar } from "expo-status-bar";
// // // import { QueryClientProvider } from "@tanstack/react-query";
// // // import { GestureHandlerRootView } from "react-native-gesture-handler";
// // // import { SafeAreaProvider } from "react-native-safe-area-context";
// // // import * as SplashScreen from "expo-splash-screen";
// // // import * as Notifications from "expo-notifications";
// // // import * as Device from "expo-device";
// // // import { useEffect, useRef } from "react";
// // // import { Platform } from "react-native";
// // // import { useRouter } from "expo-router";

// // // import { queryClient } from "@/lib/queryClient";
// // // import { useTheme } from "@/hooks/useTheme";
// // // import { supabase } from "@/lib/supabase";
// // // import { useAuthStore } from "@/store/auth.store";

// // // Notifications.setNotificationHandler({
// // //   handleNotification: async () => ({
// // //     shouldShowBanner: true,
// // //     shouldPlaySound: true,
// // //     shouldSetBadge: true,
// // //     shouldShowList: true,
// // //   }),
// // // });

// // // async function registerForPushNotificationsAsync() {
// // //   if (Platform.OS === "android") {
// // //     await Notifications.setNotificationChannelAsync("default", {
// // //       name: "default",
// // //       importance: Notifications.AndroidImportance.MAX,
// // //       vibrationPattern: [0, 250, 250, 250],
// // //       lightColor: "#53ff1f7c",
// // //     });
// // //   }

// // //   if (!Device.isDevice) {
// // //     console.log("Must use physical device for Push Notifications");
// // //     return null;
// // //   }

// // //   const { status: existingStatus } = await Notifications.getPermissionsAsync();
// // //   let finalStatus = existingStatus;

// // //   if (existingStatus !== "granted") {
// // //     const { status } = await Notifications.requestPermissionsAsync();
// // //     finalStatus = status;
// // //   }

// // //   if (finalStatus !== "granted") {
// // //     console.log("Failed to get push token");
// // //     return null;
// // //   }

// // //   const token = (
// // //     await Notifications.getExpoPushTokenAsync({
// // //       projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
// // //     })
// // //   ).data;

// // //   return token;
// // // }

// // // async function savePushTokenToDatabase(token: string, userId: string) {
// // //   try {
// // //     const { error } = await supabase
// // //       .from("profiles")
// // //       .update({
// // //         push_token: token,
// // //         notifications_enabled: true,
// // //         updated_at: new Date().toISOString(),
// // //       })
// // //       .eq("id", userId);

// // //     if (error) throw error;
// // //     console.log("✅ Push token saved successfully!");
// // //   } catch (error) {
// // //     console.error("Error saving push token:", error);
// // //   }
// // // }

// // // export default function RootLayout() {
// // //   useEffect(() => {
// // //     SplashScreen.preventAutoHideAsync();
// // //   }, []);

// // //   return (
// // //     <GestureHandlerRootView style={{ flex: 1 }}>
// // //       <SafeAreaProvider>
// // //         <QueryClientProvider client={queryClient}>
// // //           <AppContent />
// // //         </QueryClientProvider>
// // //       </SafeAreaProvider>
// // //     </GestureHandlerRootView>
// // //   );
// // // }

// // // function AppContent() {
// // //   const { isDark } = useTheme();
// // //   const { user, setSession } = useAuthStore();
// // //   const router = useRouter();
// // //   const realtimeSubscriptionRef = useRef<any>(null);

// // //   // ─── Auth + Push Token Setup ───────────────────────────────────────────────
// // //   useEffect(() => {
// // //     async function initializeApp() {
// // //       try {
// // //         const {
// // //           data: { session },
// // //         } = await supabase.auth.getSession();
// // //         setSession(session);

// // //         if (session?.user) {
// // //           const { data: profile } = await supabase
// // //             .from("profiles")
// // //             .select("notifications_enabled, push_token")
// // //             .eq("id", session.user.id)
// // //             .single();

// // //           if (!profile?.push_token || !profile?.notifications_enabled) {
// // //             const token = await registerForPushNotificationsAsync();
// // //             if (token) await savePushTokenToDatabase(token, session.user.id);
// // //           }
// // //         }
// // //       } catch (error) {
// // //         console.error("Error initializing app:", error);
// // //       } finally {
// // //         SplashScreen.hideAsync();
// // //       }
// // //     }

// // //     initializeApp();

// // //     const {
// // //       data: { subscription },
// // //     } = supabase.auth.onAuthStateChange(async (_event, session) => {
// // //       setSession(session);

// // //       if (_event === "SIGNED_IN" && session?.user) {
// // //         const { data: profile } = await supabase
// // //           .from("profiles")
// // //           .select("notifications_enabled, push_token")
// // //           .eq("id", session.user.id)
// // //           .single();

// // //         if (!profile?.push_token || !profile?.notifications_enabled) {
// // //           const token = await registerForPushNotificationsAsync();
// // //           if (token) await savePushTokenToDatabase(token, session.user.id);
// // //         }
// // //       }
// // //     });

// // //     return () => subscription.unsubscribe();
// // //   }, [setSession]);

// // //   // ─── Single Realtime Subscription for Notifications ────────────────────────
// // //   useEffect(() => {
// // //     if (!user?.id) {
// // //       // Clean up subscription if user logs out
// // //       realtimeSubscriptionRef.current?.unsubscribe();
// // //       realtimeSubscriptionRef.current = null;
// // //       return;
// // //     }

// // //     // Create one subscription for the whole app
// // //     realtimeSubscriptionRef.current = supabase
// // //       .channel(`notifications:${user.id}`)
// // //       .on(
// // //         "postgres_changes",
// // //         {
// // //           event: "*",
// // //           schema: "public",
// // //           table: "notifications",
// // //           filter: `user_id=eq.${user.id}`,
// // //         },
// // //         () => {
// // //           // Just invalidate — Tanstack Query refetches automatically
// // //           // Every component using useNotifications() gets the update
// // //           queryClient.invalidateQueries({
// // //             queryKey: ["notifications", user.id],
// // //           });
// // //         },
// // //       )
// // //       .subscribe();

// // //     return () => {
// // //       realtimeSubscriptionRef.current?.unsubscribe();
// // //       realtimeSubscriptionRef.current = null;
// // //     };
// // //   }, [user?.id]);

// // //   // ─── Push Notification Listeners ───────────────────────────────────────────
// // //   useEffect(() => {
// // //     // Foreground notification received
// // //     const notificationListener = Notifications.addNotificationReceivedListener(
// // //       () => {
// // //         queryClient.invalidateQueries({
// // //           queryKey: ["notifications", user?.id],
// // //         });
// // //       },
// // //     );

// // //     // User taps a notification
// // //     const responseListener =
// // //       Notifications.addNotificationResponseReceivedListener((response) => {
// // //         const data = response.notification.request.content.data;
// // //         const route = data?.route || "/(app)/(protected)/notifications";

// // //         if (data?.notificationId) {
// // //           // Mark as read in cache optimistically
// // //           queryClient.setQueryData(["notifications", user?.id], (old: any[]) =>
// // //             old?.map((n) =>
// // //               n.id === data.notificationId ? { ...n, isRead: true } : n,
// // //             ),
// // //           );
// // //           // Also update in DB
// // //           supabase
// // //             .from("notifications")
// // //             .update({ is_read: true, updated_at: new Date().toISOString() })
// // //             .eq("id", data.notificationId)
// // //             .then(() => {});
// // //         }

// // //         router.push(route as any);
// // //       });

// // //     return () => {
// // //       notificationListener.remove();
// // //       responseListener.remove();
// // //     };
// // //   }, [user?.id]);

// // //   return (
// // //     <>
// // //       <StatusBar style={isDark ? "light" : "dark"} />
// // //       <Slot />
// // //     </>
// // //   );
// // // }
