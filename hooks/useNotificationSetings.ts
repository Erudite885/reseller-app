// hooks/useNotificationSettings.ts
import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

export function useNotificationSettings() {
  const { user } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (!Device.isDevice) return null;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })
    ).data;

    return token;
  }

  const checkNotificationStatus = async () => {
    if (!user?.id) return false;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notifications_enabled, push_token")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      const enabled = data?.notifications_enabled || false;
      setNotificationsEnabled(enabled);
      return enabled;
    } catch (error) {
      console.error("Error checking notification status:", error);
      return false;
    }
  };

  const enableNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token)
        return {
          success: false,
          error: "Could not get push token. Please check your device settings.",
        };

      const { error } = await supabase
        .from("profiles")
        .update({
          push_token: token,
          notifications_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;
      setNotificationsEnabled(true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const disableNotifications = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notifications_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;
      setNotificationsEnabled(false);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
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
