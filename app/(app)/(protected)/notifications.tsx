// app/(app)/(protected)/notifications.tsx
import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Radius, Typography } from "@/constants/Colors";
import {
  useNotifications,
  DisplayNotification,
} from "@/hooks/useNotifications";

export default function NotificationsScreen() {
  const { colors, shadows } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Use real notifications from hook
  const {
    notifications,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: DisplayNotification) => {
    markAsRead(notification.id);
    if (notification.actionRoute) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(notification.actionRoute as any);
    }
  };

  const handleMarkAllAsRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead();
  };

  const handleDeleteNotification = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    deleteNotification(id);
  };

  const getNotificationIcon = (
    type: "success" | "info" | "warning" | "promo",
  ) => {
    switch (type) {
      case "success":
        return "✅";
      case "info":
        return "ℹ️";
      case "warning":
        return "⚠️";
      case "promo":
        return "🎁";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (
    type: "success" | "info" | "warning" | "promo",
  ) => {
    switch (type) {
      case "success":
        return colors.success;
      case "info":
        return colors.info;
      case "warning":
        return colors.warning;
      case "promo":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingTop: Platform.OS === "android" ? Spacing.xxl : 0,
          paddingBottom: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: Typography.sizes.xxl,
              fontWeight: Typography.weights.bold,
              color: colors.text,
            }}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.textSecondary,
                marginTop: Spacing.xs / 2,
              }}
            >
              {unreadCount} unread
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            width: 40,
            height: 40,
            backgroundColor: colors.card,
            borderRadius: Radius.full,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>

      {/* Filter Tabs & Mark All Read */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: Spacing.lg,
          paddingVertical: Spacing.md,
        }}
      >
        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter("all");
            }}
            style={{
              backgroundColor: filter === "all" ? colors.primary : colors.card,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderRadius: Radius.full,
              borderWidth: 1,
              borderColor: filter === "all" ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: filter === "all" ? "#FFFFFF" : colors.text,
              }}
            >
              All ({notifications.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter("unread");
            }}
            style={{
              backgroundColor:
                filter === "unread" ? colors.primary : colors.card,
              paddingHorizontal: Spacing.md,
              paddingVertical: Spacing.sm,
              borderRadius: Radius.full,
              borderWidth: 1,
              borderColor: filter === "unread" ? colors.primary : colors.border,
            }}
          >
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.semibold,
                color: filter === "unread" ? "#FFFFFF" : colors.text,
              }}
            >
              Unread ({unreadCount})
            </Text>
          </Pressable>
        </View>

        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllAsRead}>
            <Text
              style={{
                fontSize: Typography.sizes.sm,
                color: colors.primary,
                fontWeight: Typography.weights.semibold,
              }}
            >
              Mark all read
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          // Loading State
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: Spacing.xxl * 2,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                marginTop: Spacing.md,
              }}
            >
              Loading notifications...
            </Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          // Empty State
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: Spacing.xxl * 2,
              paddingHorizontal: Spacing.xl,
            }}
          >
            <Text style={{ fontSize: 64, marginBottom: Spacing.lg }}>
              {filter === "unread" ? "✅" : "🔔"}
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.xl,
                fontWeight: Typography.weights.bold,
                color: colors.text,
                marginBottom: Spacing.sm,
                textAlign: "center",
              }}
            >
              {filter === "unread" ? "All caught up!" : "No notifications yet"}
            </Text>
            <Text
              style={{
                fontSize: Typography.sizes.base,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight:
                  Typography.sizes.base * Typography.lineHeights.relaxed,
              }}
            >
              {filter === "unread"
                ? "You've read all your notifications. Great job staying on top of things!"
                : "We'll notify you when something important happens."}
            </Text>
          </View>
        ) : (
          <View
            style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}
          >
            {filteredNotifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                style={{
                  backgroundColor: notification.isRead
                    ? colors.card
                    : colors.card,
                  borderRadius: Radius.lg,
                  padding: Spacing.md,
                  marginBottom: Spacing.md,
                  borderLeftWidth: 4,
                  borderLeftColor: getNotificationColor(notification.type),
                  ...shadows.sm,
                  opacity: notification.isRead ? 0.7 : 1,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      backgroundColor:
                        getNotificationColor(notification.type) + "20",
                      borderRadius: Radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: Spacing.md,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {getNotificationIcon(notification.type)}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: Spacing.xs,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Typography.sizes.base,
                          fontWeight: Typography.weights.bold,
                          color: colors.text,
                          flex: 1,
                        }}
                      >
                        {notification.title}
                      </Text>
                      {!notification.isRead && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            backgroundColor: colors.primary,
                            borderRadius: Radius.full,
                            marginLeft: Spacing.sm,
                          }}
                        />
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: Typography.sizes.sm,
                        color: colors.textSecondary,
                        lineHeight:
                          Typography.sizes.sm * Typography.lineHeights.relaxed,
                        marginBottom: Spacing.sm,
                      }}
                      numberOfLines={2}
                    >
                      {notification.message}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: Typography.sizes.xs,
                          color: colors.textSecondary,
                        }}
                      >
                        {notification.timestamp}
                      </Text>

                      {notification.actionLabel && (
                        <Text
                          style={{
                            fontSize: Typography.sizes.sm,
                            color: colors.primary,
                            fontWeight: Typography.weights.semibold,
                          }}
                        >
                          {notification.actionLabel} →
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Delete Button */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteNotification(notification.id);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      marginLeft: Spacing.sm,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                      🗑️
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* Clear All Button (Bottom) */}
      {notifications.length > 0 && (
        <View
          style={{
            padding: Spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <Button
            title="Clear All Notifications"
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              // Delete all notifications
              notifications.forEach((notif) => {
                deleteNotification(notif.id);
              });
            }}
            variant="outline"
            size="md"
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}