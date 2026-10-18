// hooks/useNotificationSetings.ts
//
// Task 8, branch 8.c.iii. Notification preferences (push token registration,
// enable/disable) through the global-store-notifications-settings edge
// function, which reads/writes the push_token / fcm_token /
// notifications_enabled columns on global_reseller_applications or
// global_customers. Replaces the legacy direct reads/writes of the
// Nigeria-only resellers / reseller_customers tables.
//
// The file name keeps the original (misspelled) "Setings" so the existing
// import in app/(app)/(protected)/settings.tsx keeps resolving.

import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export function useNotificationSettings() {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function registerForPushNotificationsAsync() {
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

    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return null;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get permission for push notifications");
        return null;
      }

      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const expoToken = (
        await Notifications.getExpoPushTokenAsync({ projectId: projectId! })
      ).data;
      const deviceToken = await Notifications.getDevicePushTokenAsync();

      return { expoToken, fcmToken: deviceToken.data };
    } catch (error) {
      console.error("Error getting push tokens:", error);
      return null;
    }
  }

  const checkNotificationStatus = async () => {
    if (!user?.id || !resellerId) return false;
    try {
      const data = await callStoreFunction<{ enabled: boolean }>(
        "global-store-notifications-settings",
        { action: "status" },
      );
      setNotificationsEnabled(!!data.enabled);
      return !!data.enabled;
    } catch (error) {
      console.error("Error checking notification status:", error);
      return false;
    }
  };

  const enableNotifications = async () => {
    setIsChecking(true);
    try {
      const tokens = await registerForPushNotificationsAsync();
      if (!tokens) {
        return {
          success: false,
          error: "Could not get push tokens. Please check your device settings.",
        };
      }

      await callStoreFunction("global-store-notifications-settings", {
        action: "enable",
        expoToken: tokens.expoToken,
        fcmToken: tokens.fcmToken,
      });

      setNotificationsEnabled(true);
      return { success: true };
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
      await callStoreFunction("global-store-notifications-settings", {
        action: "disable",
      });
      setNotificationsEnabled(false);
      return { success: true };
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

  useEffect(() => {
    checkNotificationStatus();
  }, [user?.id, resellerId]);

  return {
    notificationsEnabled,
    isChecking,
    setIsChecking,
    enableNotifications,
    disableNotifications,
    checkNotificationStatus,
  };
}
