// hooks/useNotifications.ts
//
// Task 8, branch 8.c.iii. The caller's notifications through the
// global-store-notifications edge function (global_notifications for a
// reseller, global_customer_notifications for a customer). Replaces the
// legacy direct reads/writes of reseller_notifications /
// reseller_customer_notifications, which were Nigeria-only.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface DatabaseNotification {
  id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DisplayNotification {
  id: string;
  type: "success" | "info" | "warning" | "promo";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  actionRoute?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const mapNotificationType = (
  type: string,
): "success" | "info" | "warning" | "promo" => {
  switch (type) {
    case "transaction_success":
    case "deposit":
      return "success";
    case "transaction_failed":
    case "promotion":
    case "promotional":
      return "promo";
    default:
      return "info";
  }
};

const formatTimeAgo = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return "a long time ago";
};

const convertToDisplayNotification = (
  dbNotif: DatabaseNotification,
): DisplayNotification => {
  const notifType = dbNotif.notification_type.toLowerCase();
  let title = "";
  let actionLabel: string | undefined;
  let actionRoute: string | undefined;

  switch (notifType) {
    case "transaction_success":
      title = "✅ Transaction Successful";
      actionLabel = "View Details";
      actionRoute = "/(app)/(protected)/transaction-history";
      break;
    case "transaction_failed":
      title = "❌ Transaction Failed";
      actionLabel = "Retry";
      actionRoute = "/(app)/(protected)";
      break;
    case "deposit":
      title = "💰 Wallet Funded";
      actionLabel = "View Details";
      actionRoute = "/(app)/(protected)";
      break;
    case "promotion":
    case "promotional":
      title = dbNotif.metadata?.title || "🎁 Special Offer!";
      actionLabel = "View";
      actionRoute = "/(app)/(protected)";
      break;
    default:
      title = dbNotif.metadata?.title || "🔔 Notification";
      break;
  }

  return {
    id: dbNotif.id,
    type: mapNotificationType(notifType),
    title,
    message: dbNotif.message,
    timestamp: formatTimeAgo(new Date(dbNotif.created_at)),
    isRead: dbNotif.is_read,
    actionLabel,
    actionRoute,
    metadata: dbNotif.metadata,
    createdAt: dbNotif.created_at,
  };
};

export function useNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;
  const queryKey = ["notifications", resellerId, user?.id];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<DisplayNotification[]> => {
      if (!user?.id) throw new Error("No user");
      const data = await callStoreFunction<{ notifications: DatabaseNotification[] }>(
        "global-store-notifications",
        { action: "list" },
      );
      return (data.notifications ?? []).map(convertToDisplayNotification);
    },
    enabled: !!user?.id && !!resellerId,
    staleTime: 1000 * 60,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await callStoreFunction("global-store-notifications", {
        action: "mark_read",
        id,
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: DisplayNotification[] | undefined) =>
        old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await callStoreFunction("global-store-notifications", {
        action: "mark_all_read",
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: DisplayNotification[] | undefined) =>
        old?.map((n) => ({ ...n, isRead: true })),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await callStoreFunction("global-store-notifications", {
        action: "delete",
        id,
      });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (old: DisplayNotification[] | undefined) =>
        old?.filter((n) => n.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    notifications: data ?? [],
    isLoading,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  };
}
