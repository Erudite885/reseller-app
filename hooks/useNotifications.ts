// hooks/useNotifications.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

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

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

async function getNotificationTable(
  userId: string,
): Promise<{
  table: string;
  filterColumn: string;
  filterValue: string;
} | null> {
  const storeSlug = getStoreSlug();

  // Get reseller
  const { data: resellerStore } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeSlug)
    .eq("status", "active")
    .single();

  if (!resellerStore) return null;

  // Check if user is the reseller
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("id", resellerStore.id)
    .single();

  if (reseller) {
    return {
      table: "reseller_notifications",
      filterColumn: "reseller_id",
      filterValue: reseller.id,
    };
  }

  // Check if user is a customer
  const { data: customer } = await supabase
    .from("reseller_customers")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("reseller_id", resellerStore.id)
    .single();

  if (customer) {
    return {
      table: "reseller_customer_notifications",
      filterColumn: "customer_id",
      filterValue: customer.id,
    };
  }

  return null;
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
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
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
    case "system":
      title = dbNotif.metadata?.title || "🔔 System Notice";
      break;
    default:
      title = "🔔 Notification";
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
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications", storeSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const notifConfig = await getNotificationTable(user.id);
      if (!notifConfig) return [];

      const { data, error } = await supabase
        .from(notifConfig.table)
        .select("*")
        .eq(notifConfig.filterColumn, notifConfig.filterValue)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(convertToDisplayNotification);
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const notifConfig = await getNotificationTable(user!.id);
      if (!notifConfig) return;

      const { error } = await supabase
        .from(notifConfig.table)
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["notifications", storeSlug, user?.id],
      });
      const previous = queryClient.getQueryData([
        "notifications",
        storeSlug,
        user?.id,
      ]);
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        (old: DisplayNotification[]) =>
          old?.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        context?.previous,
      );
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const notifConfig = await getNotificationTable(user!.id);
      if (!notifConfig) return;

      const { error } = await supabase
        .from(notifConfig.table)
        .update({ is_read: true })
        .eq(notifConfig.filterColumn, notifConfig.filterValue)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["notifications", storeSlug, user?.id],
      });
      const previous = queryClient.getQueryData([
        "notifications",
        storeSlug,
        user?.id,
      ]);
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        (old: DisplayNotification[]) =>
          old?.map((n) => ({ ...n, isRead: true })),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        context?.previous,
      );
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const notifConfig = await getNotificationTable(user!.id);
      if (!notifConfig) return;

      const { error } = await supabase
        .from(notifConfig.table)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({
        queryKey: ["notifications", storeSlug, user?.id],
      });
      const previous = queryClient.getQueryData([
        "notifications",
        storeSlug,
        user?.id,
      ]);
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        (old: DisplayNotification[]) => old?.filter((n) => n.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(
        ["notifications", storeSlug, user?.id],
        context?.previous,
      );
    },
  });

  return {
    notifications,
    isLoading,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  };
}

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";

// export interface DatabaseNotification {
//   id: string;
//   user_id: string;
//   notification_type: string;
//   message: string;
//   is_read: boolean;
//   metadata?: Record<string, any>;
//   created_at: string;
//   updated_at: string;
// }

// export interface DisplayNotification {
//   id: string;
//   type: "success" | "info" | "warning" | "promo";
//   title: string;
//   message: string;
//   timestamp: string;
//   isRead: boolean;
//   actionLabel?: string;
//   actionRoute?: string;
//   metadata?: Record<string, any>;
//   createdAt: string;
// }

// const mapNotificationType = (
//   type: string,
// ): "success" | "info" | "warning" | "promo" => {
//   switch (type) {
//     case "transaction_success":
//     case 'deposit':
//       return "success";
//     case "transaction_failed":
//     case "promotion":
//       return "promo";
//     default:
//       return "info";
//   }
// };

// const formatTimeAgo = (date: Date): string => {
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMins = Math.floor(diffMs / 60000);
//   const diffHours = Math.floor(diffMs / 3600000);
//   const diffDays = Math.floor(diffMs / 86400000);

//   if (diffMins < 1) return "just now";
//   if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
//   if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
//   if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
//   if (diffDays < 30)
//     return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
//   if (diffDays < 365)
//     return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
//   return "a long time ago";
// };

// const convertToDisplayNotification = (
//   dbNotif: DatabaseNotification,
// ): DisplayNotification => {
//   const notifType = dbNotif.notification_type.toLowerCase();
//   let title = "";
//   let actionLabel: string | undefined;
//   let actionRoute: string | undefined;

//   switch (notifType) {
//     case "transaction_success":
//       title = "✅ Transaction Successful";
//       actionLabel = "View Details";
//       actionRoute = "/(app)/(protected)/transaction-history";
//       break;
//     case "transaction_failed":
//       title = "❌ Transaction Failed";
//       actionLabel = "Retry";
//       actionRoute = "/(app)/(protected)";
//       break;
//     case 'deposit':
//       title = "💰 Wallet Funded";
//        actionLabel = "View Details";
//        actionRoute = "/(app)/(protected)";
//       break;
//     case "promotion":
//       title = dbNotif.metadata?.title || "🎁 Special Offer!";
//       actionLabel = "View";
//       actionRoute = "/(app)/(protected)";
//       break;
//     case "system":
//       title = dbNotif.metadata?.title || "🔔 System Notice";
//       break;
//     default:
//       title = "🔔 Notification";
//   }

//   return {
//     id: dbNotif.id,
//     type: mapNotificationType(notifType),
//     title,
//     message: dbNotif.message,
//     timestamp: formatTimeAgo(new Date(dbNotif.created_at)),
//     isRead: dbNotif.is_read,
//     actionLabel,
//     actionRoute,
//     metadata: dbNotif.metadata,
//     createdAt: dbNotif.created_at,
//   };
// };

// export function useNotifications() {
//   const { user } = useAuthStore();
//   const queryClient = useQueryClient();

//   const {
//     data: notifications = [],
//     isLoading,
//     refetch,
//   } = useQuery({
//     queryKey: ["notifications", user?.id],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from("notifications")
//         .select("*")
//         .eq("user_id", user?.id)
//         .order("created_at", { ascending: false });

//       if (error) throw error;
//       return data.map(convertToDisplayNotification);
//     },
//     enabled: !!user?.id,
//   });

//   const markAsReadMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const { error } = await supabase
//         .from("notifications")
//         .update({ is_read: true, updated_at: new Date().toISOString() })
//         .eq("id", id);
//       if (error) throw error;
//     },
//     onMutate: async (id) => {
//       // Optimistic update
//       await queryClient.cancelQueries({
//         queryKey: ["notifications", user?.id],
//       });
//       const previous = queryClient.getQueryData(["notifications", user?.id]);
//       queryClient.setQueryData(
//         ["notifications", user?.id],
//         (old: DisplayNotification[]) =>
//           old.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
//       );
//       return { previous };
//     },
//     onError: (_err, _id, context) => {
//       queryClient.setQueryData(["notifications", user?.id], context?.previous);
//     },
//   });

//   const markAllAsReadMutation = useMutation({
//     mutationFn: async () => {
//       const { error } = await supabase
//         .from("notifications")
//         .update({ is_read: true, updated_at: new Date().toISOString() })
//         .eq("user_id", user?.id)
//         .eq("is_read", false);
//       if (error) throw error;
//     },
//     onMutate: async () => {
//       await queryClient.cancelQueries({
//         queryKey: ["notifications", user?.id],
//       });
//       const previous = queryClient.getQueryData(["notifications", user?.id]);
//       queryClient.setQueryData(
//         ["notifications", user?.id],
//         (old: DisplayNotification[]) =>
//           old.map((n) => ({ ...n, isRead: true })),
//       );
//       return { previous };
//     },
//     onError: (_err, _vars, context) => {
//       queryClient.setQueryData(["notifications", user?.id], context?.previous);
//     },
//   });

//   const deleteNotificationMutation = useMutation({
//     mutationFn: async (id: string) => {
//       const { error } = await supabase
//         .from("notifications")
//         .delete()
//         .eq("id", id);
//       if (error) throw error;
//     },
//     onMutate: async (id) => {
//       await queryClient.cancelQueries({
//         queryKey: ["notifications", user?.id],
//       });
//       const previous = queryClient.getQueryData(["notifications", user?.id]);
//       queryClient.setQueryData(
//         ["notifications", user?.id],
//         (old: DisplayNotification[]) => old.filter((n) => n.id !== id),
//       );
//       return { previous };
//     },
//     onError: (_err, _id, context) => {
//       queryClient.setQueryData(["notifications", user?.id], context?.previous);
//     },
//   });

//   return {
//     notifications,
//     isLoading,
//     refetch,
//     markAsRead: markAsReadMutation.mutate,
//     markAllAsRead: markAllAsReadMutation.mutate,
//     deleteNotification: deleteNotificationMutation.mutate,
//   };
// }
