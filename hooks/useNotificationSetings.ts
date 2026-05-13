// hooks/useNotificationSettings.ts

import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export function useNotificationSettings() {
  const { user } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function registerForPushNotificationsAsync() {
    // Set up notification channel for Android
    if (Platform.OS === "android") {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#3791147c",
        });
      } catch (error) {
        console.log("Error setting notification channel:", error);
      }
    }

    // Check if it's a physical device (not simulator/emulator)
    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If permission not granted, return null
      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return null;
      }

      // Get Expo push token - NO Firebase needed
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

      if (!projectId) {
        console.error(
          "EXPO_PUBLIC_PROJECT_ID is not set in environment variables",
        );
        return null;
      }

      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })
      ).data;

      console.log("Expo push token obtained:", token.substring(0, 20) + "...");
      return token;
    } catch (error) {
      console.error("Error getting push token:", error);
      return null;
    }
  }

  const checkNotificationStatus = async () => {
    if (!user?.id) return false;

    try {
      const storeSlug = useResellerStore.getState().config.storeName;

      // Check reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("notifications_enabled, push_token")
        .eq("auth_user_id", user.id)
        .single();

      if (reseller) {
        const enabled = reseller.notifications_enabled || false;
        setNotificationsEnabled(enabled);
        return enabled;
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
          .select("notifications_enabled, push_token")
          .eq("auth_user_id", user.id)
          .eq("reseller_id", resellerStore.id)
          .single();

        if (customer) {
          const enabled = customer.notifications_enabled || false;
          setNotificationsEnabled(enabled);
          return enabled;
        }
      }

      return false;
    } catch (error) {
      console.error("Error checking notification status:", error);
      return false;
    }
  };

  const enableNotifications = async () => {
    setIsChecking(true);

    try {
      const token = await registerForPushNotificationsAsync();

      if (!token) {
        return {
          success: false,
          error:
            "Could not get push token. Please check your device settings and make sure you're on a physical device.",
        };
      }

      const storeSlug = useResellerStore.getState().config.storeName;

      // Check reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user?.id)
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
        setNotificationsEnabled(true);
        return { success: true };
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
          .select("id")
          .eq("auth_user_id", user?.id)
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
          setNotificationsEnabled(true);
          return { success: true };
        }
      }

      return { success: false, error: "User not found" };
    } catch (error: any) {
      console.error("Error enabling notifications:", error);
      return {
        success: false,
        error: error.message || "Failed to enable notifications",
      };
    } finally {
      setIsChecking(false);
    }
  };

  const disableNotifications = async () => {
    setIsChecking(true);

    try {
      const storeSlug = useResellerStore.getState().config.storeName;

      // Check reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      if (reseller) {
        const { error } = await supabase
          .from("resellers")
          .update({
            notifications_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", reseller.id);

        if (error) throw error;
        setNotificationsEnabled(false);
        return { success: true };
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
          .select("id")
          .eq("auth_user_id", user?.id)
          .eq("reseller_id", resellerStore.id)
          .single();

        if (customer) {
          const { error } = await supabase
            .from("reseller_customers")
            .update({
              notifications_enabled: false,
            })
            .eq("id", customer.id);

          if (error) throw error;
          setNotificationsEnabled(false);
          return { success: true };
        }
      }

      return { success: false, error: "User not found" };
    } catch (error: any) {
      console.error("Error disabling notifications:", error);
      return {
        success: false,
        error: error.message || "Failed to disable notifications",
      };
    } finally {
      setIsChecking(false);
    }
  };

  // Check status on mount
  useEffect(() => {
    checkNotificationStatus();
  }, [user?.id]);

  return {
    notificationsEnabled,
    isChecking,
    setIsChecking,
    enableNotifications,
    disableNotifications,
    checkNotificationStatus,
  };
}

// // hooks/useNotificationSettings.ts

// import { useState, useEffect } from "react";
// import * as Notifications from "expo-notifications";
// import * as Device from "expo-device";
// import { Platform } from "react-native";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// export function useNotificationSettings() {
//   const { user } = useAuthStore();
//   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
//   const [isChecking, setIsChecking] = useState(false);

//   async function registerForPushNotificationsAsync() {
//     if (Platform.OS === "android") {
//       await Notifications.setNotificationChannelAsync("default", {
//         name: "default",
//         importance: Notifications.AndroidImportance.MAX,
//         vibrationPattern: [0, 250, 250, 250],
//         lightColor: (() => {
//           try {
//             const primaryColor =
//               useResellerStore.getState().config.theme?.primary || "#379114";
//             return primaryColor + "7c";
//           } catch {
//             return "#3791147c";
//           }
//         })(),
//       });
//     }

//     if (!Device.isDevice) return null;

//     const { status: existingStatus } =
//       await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;

//     if (existingStatus !== "granted") {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== "granted") return null;

//     // ✅ Use Expo push token (NO Firebase needed)
//     const token = (
//       await Notifications.getExpoPushTokenAsync({
//         projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
//       })
//     ).data;

//     return token;
//   }

//   const checkNotificationStatus = async () => {
//     if (!user?.id) return false;
//     try {
//       const storeSlug = useResellerStore.getState().config.storeName;

//       // Check reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("notifications_enabled, push_token")
//         .eq("auth_user_id", user.id)
//         .single();

//       if (reseller) {
//         const enabled = reseller.notifications_enabled || false;
//         setNotificationsEnabled(enabled);
//         return enabled;
//       }

//       // Check customer
//       const { data: resellerStore } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (resellerStore) {
//         const { data: customer } = await supabase
//           .from("reseller_customers")
//           .select("notifications_enabled, push_token")
//           .eq("auth_user_id", user.id)
//           .eq("reseller_id", resellerStore.id)
//           .single();

//         if (customer) {
//           const enabled = customer.notifications_enabled || false;
//           setNotificationsEnabled(enabled);
//           return enabled;
//         }
//       }

//       return false;
//     } catch (error) {
//       console.error("Error checking notification status:", error);
//       return false;
//     }
//   };

//   const enableNotifications = async () => {
//     try {
//       const token = await registerForPushNotificationsAsync();
//       if (!token)
//         return {
//           success: false,
//           error: "Could not get push token. Please check your device settings.",
//         };

//       const storeSlug = useResellerStore.getState().config.storeName;

//       // Check reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user?.id)
//         .single();

//       if (reseller) {
//         const { error } = await supabase
//           .from("resellers")
//           .update({
//             push_token: token,
//             notifications_enabled: true,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("id", reseller.id);

//         if (error) throw error;
//         setNotificationsEnabled(true);
//         return { success: true };
//       }

//       // Check customer
//       const { data: resellerStore } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (resellerStore) {
//         const { data: customer } = await supabase
//           .from("reseller_customers")
//           .select("id")
//           .eq("auth_user_id", user?.id)
//           .eq("reseller_id", resellerStore.id)
//           .single();

//         if (customer) {
//           const { error } = await supabase
//             .from("reseller_customers")
//             .update({
//               push_token: token,
//               notifications_enabled: true,
//             })
//             .eq("id", customer.id);

//           if (error) throw error;
//           setNotificationsEnabled(true);
//           return { success: true };
//         }
//       }

//       return { success: false, error: "User not found" };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   const disableNotifications = async () => {
//     try {
//       const storeSlug = useResellerStore.getState().config.storeName;

//       // Check reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user?.id)
//         .single();

//       if (reseller) {
//         const { error } = await supabase
//           .from("resellers")
//           .update({
//             notifications_enabled: false,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("id", reseller.id);

//         if (error) throw error;
//         setNotificationsEnabled(false);
//         return { success: true };
//       }

//       // Check customer
//       const { data: resellerStore } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (resellerStore) {
//         const { data: customer } = await supabase
//           .from("reseller_customers")
//           .select("id")
//           .eq("auth_user_id", user?.id)
//           .eq("reseller_id", resellerStore.id)
//           .single();

//         if (customer) {
//           const { error } = await supabase
//             .from("reseller_customers")
//             .update({
//               notifications_enabled: false,
//             })
//             .eq("id", customer.id);

//           if (error) throw error;
//           setNotificationsEnabled(false);
//           return { success: true };
//         }
//       }

//       return { success: false, error: "User not found" };
//     } catch (error: any) {
//       return { success: false, error: error.message };
//     }
//   };

//   // Check status on mount
//   useEffect(() => {
//     checkNotificationStatus();
//   }, [user?.id]);

//   return {
//     notificationsEnabled,
//     isChecking,
//     setIsChecking,
//     enableNotifications,
//     disableNotifications,
//     checkNotificationStatus,
//   };
// }

// // // hooks/useNotificationSettings.ts
// // import { useState, useEffect } from "react";
// // import * as Notifications from "expo-notifications";
// // import * as Device from "expo-device";
// // import { Platform } from "react-native";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";

// // export function useNotificationSettings() {
// //   const { user } = useAuthStore();
// //   const [notificationsEnabled, setNotificationsEnabled] = useState(false);
// //   const [isChecking, setIsChecking] = useState(false);

// //   async function registerForPushNotificationsAsync() {
// //     if (Platform.OS === "android") {
// //       await Notifications.setNotificationChannelAsync("default", {
// //         name: "default",
// //         importance: Notifications.AndroidImportance.MAX,
// //         vibrationPattern: [0, 250, 250, 250],
// //         lightColor: "#FF231F7C",
// //       });
// //     }

// //     if (!Device.isDevice) return null;

// //     const { status: existingStatus } =
// //       await Notifications.getPermissionsAsync();
// //     let finalStatus = existingStatus;

// //     if (existingStatus !== "granted") {
// //       const { status } = await Notifications.requestPermissionsAsync();
// //       finalStatus = status;
// //     }

// //     if (finalStatus !== "granted") return null;

// //     const token = (
// //       await Notifications.getExpoPushTokenAsync({
// //         projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
// //       })
// //     ).data;

// //     return token;
// //   }

// //   const checkNotificationStatus = async () => {
// //     if (!user?.id) return false;
// //     try {
// //       const { data, error } = await supabase
// //         .from("profiles")
// //         .select("notifications_enabled, push_token")
// //         .eq("id", user.id)
// //         .single();

// //       if (error) throw error;
// //       const enabled = data?.notifications_enabled || false;
// //       setNotificationsEnabled(enabled);
// //       return enabled;
// //     } catch (error) {
// //       console.error("Error checking notification status:", error);
// //       return false;
// //     }
// //   };

// //   const enableNotifications = async () => {
// //     try {
// //       const token = await registerForPushNotificationsAsync();
// //       if (!token)
// //         return {
// //           success: false,
// //           error: "Could not get push token. Please check your device settings.",
// //         };

// //       const { error } = await supabase
// //         .from("profiles")
// //         .update({
// //           push_token: token,
// //           notifications_enabled: true,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq("id", user?.id);

// //       if (error) throw error;
// //       setNotificationsEnabled(true);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   const disableNotifications = async () => {
// //     try {
// //       const { error } = await supabase
// //         .from("profiles")
// //         .update({
// //           notifications_enabled: false,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq("id", user?.id);

// //       if (error) throw error;
// //       setNotificationsEnabled(false);
// //       return { success: true };
// //     } catch (error: any) {
// //       return { success: false, error: error.message };
// //     }
// //   };

// //   // Check status on mount
// //   useEffect(() => {
// //     checkNotificationStatus();
// //   }, [user?.id]);

// //   return {
// //     notificationsEnabled,
// //     isChecking,
// //     setIsChecking,
// //     enableNotifications,
// //     disableNotifications,
// //     checkNotificationStatus,
// //   };
// // }
