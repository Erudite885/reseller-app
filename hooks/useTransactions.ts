// hooks/useTransactions.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface Transaction {
  id: string;
  user_id?: string;
  user_email?: string;
  type: string;
  service?: string;
  network?: string;
  phone_number?: string;
  amount: number;
  previous_balance?: number;
  new_balance?: number;
  data_plan?: string;
  status: string;
  reference: string;
  description?: string;
  provider_reference?: string;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

async function getCurrentResellerId(): Promise<string | null> {
  const storeSlug = getStoreSlug();
  const { data } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeSlug)
    .eq("status", "active")
    .single();
  return data?.id || null;
}

/**
 * Hook to fetch transactions for the current user scoped to this reseller store
 */
export function useTransactions(limit: number = 50, offset: number = 0) {
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["transactions", storeSlug, user?.id, limit, offset],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const resellerId = await getCurrentResellerId();
      if (!resellerId) return [];

      // Check if user is the reseller (store owner)
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("id", resellerId)
        .single();

      if (reseller) {
        // RESELLER: Get their store transactions
        const { data, error } = await supabase
          .from("reseller_transactions")
          .select("*")
          .eq("reseller_id", resellerId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        return data as Transaction[];
      }

      // CUSTOMER: Get their customer transactions
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("reseller_id", resellerId)
        .single();

      if (customer) {
        // ✅ Use reseller_customer_transactions instead of reseller_orders
        const { data, error } = await supabase
          .from("reseller_customer_transactions")
          .select("*")
          .eq("reseller_id", resellerId)
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        // Map to Transaction format
        return (data || []).map((txn: any) => ({
          id: txn.id,
          type: txn.type === "purchase" ? "data" : txn.type,
          service:
            txn.type === "purchase"
              ? txn.metadata?.plan_name || "Data Bundle"
              : txn.type === "deposit"
                ? "Wallet Funding"
                : txn.type,
          network: txn.metadata?.network || "",
          phone_number: txn.metadata?.phone_number || "",
          amount: txn.amount,
          previous_balance: txn.previous_balance,
          new_balance: txn.new_balance,
          data_plan: txn.metadata?.plan_name || "",
          status: txn.status,
          reference: txn.reference || txn.id,
          description: txn.description,
          metadata: txn.metadata,
          created_at: txn.created_at,
        })) as Transaction[];
      }

      return [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get recent transactions (last 10)
 */
export function useRecentTransactions() {
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["recent_transactions", storeSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const resellerId = await getCurrentResellerId();
      if (!resellerId) return [];

      // Check if user is the reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("id", resellerId)
        .single();

      if (reseller) {
        const { data, error } = await supabase
          .from("reseller_transactions")
          .select("*")
          .eq("reseller_id", resellerId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        return data as Transaction[];
      }

      // Customer
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .eq("reseller_id", resellerId)
        .single();

      if (customer) {
        // ✅ Use reseller_customer_transactions
        const { data, error } = await supabase
          .from("reseller_customer_transactions")
          .select("*")
          .eq("reseller_id", resellerId)
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        return (data || []).map((txn: any) => ({
          id: txn.id,
          type: txn.type === "purchase" ? "data" : txn.type,
          service:
            txn.type === "purchase"
              ? txn.metadata?.plan_name || "Data Bundle"
              : txn.type === "deposit"
                ? "Wallet Funding"
                : txn.type,
          network: txn.metadata?.network || "",
          phone_number: txn.metadata?.phone_number || "",
          amount: txn.amount,
          previous_balance: txn.previous_balance,
          new_balance: txn.new_balance,
          data_plan: txn.metadata?.plan_name || "",
          status: txn.status,
          reference: txn.reference || txn.id,
          description: txn.description,
          metadata: txn.metadata,
          created_at: txn.created_at,
        })) as Transaction[];
      }

      return [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
  });
}

// // hooks/useTransactions.ts

// import { useQuery } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// export interface Transaction {
//   id: string;
//   user_id?: string;
//   user_email?: string;
//   type: string;
//   service?: string;
//   network?: string;
//   phone_number?: string;
//   amount: number;
//   previous_balance?: number;
//   new_balance?: number;
//   data_plan?: string;
//   status: string;
//   reference: string;
//   description?: string;
//   provider_reference?: string;
//   error_message?: string;
//   metadata?: Record<string, any>;
//   created_at: string;
// }

// function getStoreSlug(): string {
//   return useResellerStore.getState().config.storeName;
// }

// async function getCurrentResellerId(): Promise<string | null> {
//   const storeSlug = getStoreSlug();
//   const { data } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", storeSlug)
//     .eq("status", "active")
//     .single();
//   return data?.id || null;
// }

// /**
//  * Hook to fetch transactions for the current user scoped to this reseller store
//  */
// export function useTransactions(limit: number = 50, offset: number = 0) {
//   const { user } = useAuthStore();
//   const storeSlug = getStoreSlug();

//   return useQuery({
//     queryKey: ["transactions", storeSlug, user?.id, limit, offset],
//     queryFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       const resellerId = await getCurrentResellerId();
//       if (!resellerId) return [];

//       // Check if user is the reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .eq("id", resellerId)
//         .single();

//       if (reseller) {
//         // Reseller: get their store transactions
//         const { data, error } = await supabase
//           .from("reseller_transactions")
//           .select("*")
//           .eq("reseller_id", resellerId)
//           .order("created_at", { ascending: false })
//           .range(offset, offset + limit - 1);

//         if (error) throw error;
//         return data as Transaction[];
//       }

//       // Customer: get their orders through this reseller
//       const { data: customer } = await supabase
//         .from("reseller_customers")
//         .select("id, email")
//         .eq("auth_user_id", user.id)
//         .eq("reseller_id", resellerId)
//         .single();

//       if (customer) {
//         const { data, error } = await supabase
//           .from("reseller_orders")
//           .select("*")
//           .eq("reseller_id", resellerId)
//           .eq("customer_email", customer.email)
//           .order("created_at", { ascending: false })
//           .range(offset, offset + limit - 1);

//         if (error) throw error;

//         // Map orders to Transaction format
//         return (data || []).map((order: any) => ({
//           id: order.id,
//           type: "data",
//           service: "Data Bundle",
//           amount: order.amount,
//           status: order.status,
//           reference: order.id,
//           created_at: order.created_at,
//         })) as Transaction[];
//       }

//       return [];
//     },
//     enabled: !!user?.id,
//     staleTime: 1000 * 60,
//   });
// }

// /**
//  * Hook to get recent transactions (last 10)
//  */
// export function useRecentTransactions() {
//   const { user } = useAuthStore();
//   const storeSlug = getStoreSlug();

//   return useQuery({
//     queryKey: ["recent_transactions", storeSlug, user?.id],
//     queryFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       const resellerId = await getCurrentResellerId();
//       if (!resellerId) return [];

//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .eq("id", resellerId)
//         .single();

//       if (reseller) {
//         const { data, error } = await supabase
//           .from("reseller_transactions")
//           .select("*")
//           .eq("reseller_id", resellerId)
//           .order("created_at", { ascending: false })
//           .limit(10);

//         if (error) throw error;
//         return data as Transaction[];
//       }

//       const { data: customer } = await supabase
//         .from("reseller_customers")
//         .select("id, email")
//         .eq("auth_user_id", user.id)
//         .eq("reseller_id", resellerId)
//         .single();

//       if (customer) {
//         const { data, error } = await supabase
//           .from("reseller_orders")
//           .select("*")
//           .eq("reseller_id", resellerId)
//           .eq("customer_email", customer.email)
//           .order("created_at", { ascending: false })
//           .limit(10);

//         if (error) throw error;

//         return (data || []).map((order: any) => ({
//           id: order.id,
//           type: "data",
//           service: "Data Bundle",
//           amount: order.amount,
//           status: order.status,
//           reference: order.id,
//           created_at: order.created_at,
//         })) as Transaction[];
//       }

//       return [];
//     },
//     enabled: !!user?.id,
//     staleTime: 1000 * 30,
//   });
// }

// // // hooks/useTransactions.ts
// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";

// // // Transaction type definition
// // export interface Transaction {
// //   id: string;
// //   user_id: string;
// //   type: string;
// //   service: string;
// //   network: string;
// //   phone_number?: string;
// //   amount: number;
// //   previous_balance?: number;
// //   new_balance?: number;
// //   data_plan?: string;
// //   status: string;
// //   reference: string;
// //   description?: string;
// //   provider_reference?: string;
// //   error_message?: string;
// //   created_at: string;
// //   updated_at: string;
// //   completed_at?: string;
// // }

// // /**
// //  * Hook to fetch user transactions
// //  */
// // export function useTransactions(limit: number = 50, offset: number = 0) {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["transactions", user?.id, limit, offset],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("*")
// //         .eq("user_id", user.id)
// //         .order("created_at", { ascending: false })
// //         .range(offset, offset + limit - 1);

// //       if (error) throw error;
// //       return data as Transaction[];
// //     },
// //     enabled: !!user?.id,
// //     staleTime: 1000 * 60, // Consider data fresh for 1 minute
// //   });
// // }

// // /**
// //  * Hook to purchase data or airtime
// //  */
// // export function usePurchase() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async (purchaseData: {
// //       type: "data" | "airtime";
// //       network: string;
// //       phoneNumber: string;
// //       amount: number;
// //       dataPlan?: string;
// //     }) => {
// //       if (!user?.id) throw new Error("No user");

// //       // Call the Supabase RPC function to process purchase
// //       const { data, error } = await supabase.rpc("process_purchase", {
// //         p_user_id: user.id,
// //         p_type: purchaseData.type,
// //         p_network: purchaseData.network,
// //         p_phone_number: purchaseData.phoneNumber,
// //         p_amount: purchaseData.amount,
// //         p_data_plan: purchaseData.dataPlan || null,
// //       });

// //       if (error) throw error;

// //       // Check if the result indicates success
// //       if (data && !data.success) {
// //         throw new Error(data.error || "Purchase failed");
// //       }

// //       return data;
// //     },
// //     onSuccess: () => {
// //       // Invalidate queries to refresh data
// //       queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
// //       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
// //     },
// //   });
// // }

// // /**
// //  * Hook to get a single transaction by ID
// //  */
// // export function useTransaction(transactionId: string) {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["transaction", transactionId],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("*")
// //         .eq("id", transactionId)
// //         .eq("user_id", user.id)
// //         .single();

// //       if (error) throw error;
// //       return data as Transaction;
// //     },
// //     enabled: !!user?.id && !!transactionId,
// //   });
// // }

// // /**
// //  * Hook to get transaction statistics
// //  */
// // export function useTransactionStats() {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["transaction_stats", user?.id],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("type, amount, status")
// //         .eq("user_id", user.id);

// //       if (error) throw error;

// //       // Calculate statistics
// //       const stats = {
// //         total: data.length,
// //         totalSpent: data
// //           .filter((t) => t.status === "completed")
// //           .reduce((sum, t) => sum + Number(t.amount), 0),
// //         dataTransactions: data.filter((t) => t.type === "data").length,
// //         airtimeTransactions: data.filter((t) => t.type === "airtime").length,
// //         completedTransactions: data.filter((t) => t.status === "completed")
// //           .length,
// //         pendingTransactions: data.filter((t) => t.status === "pending").length,
// //         failedTransactions: data.filter((t) => t.status === "failed").length,
// //       };

// //       return stats;
// //     },
// //     enabled: !!user?.id,
// //     staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
// //   });
// // }

// // /**
// //  * Hook to get recent transactions (last 10)
// //  */
// // export function useRecentTransactions() {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["recent_transactions", user?.id],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("*")
// //         .eq("user_id", user.id)
// //         .order("created_at", { ascending: false })
// //         .limit(10);

// //       if (error) throw error;
// //       return data as Transaction[];
// //     },
// //     enabled: !!user?.id,
// //     staleTime: 1000 * 30, // Consider data fresh for 30 seconds
// //   });
// // }

// // /**
// //  * Hook to update transaction status (for admin/webhook use)
// //  */
// // export function useUpdateTransactionStatus() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async ({
// //       transactionId,
// //       status,
// //       providerReference,
// //       errorMessage,
// //     }: {
// //       transactionId: string;
// //       status: "pending" | "completed" | "failed" | "cancelled";
// //       providerReference?: string;
// //       errorMessage?: string;
// //     }) => {
// //       const { data, error } = await supabase.rpc("update_transaction_status", {
// //         p_transaction_id: transactionId,
// //         p_status: status,
// //         p_provider_reference: providerReference || null,
// //         p_error_message: errorMessage || null,
// //       });

// //       if (error) throw error;

// //       if (data && !data.success) {
// //         throw new Error(data.error || "Failed to update transaction status");
// //       }

// //       return data;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
// //       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
// //     },
// //   });
// // }

// // /**
// //  * Hook to filter transactions by type
// //  */
// // export function useTransactionsByType(
// //   type: "data" | "airtime" | "credit" | "debit"
// // ) {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["transactions_by_type", user?.id, type],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("*")
// //         .eq("user_id", user.id)
// //         .eq("type", type)
// //         .order("created_at", { ascending: false });

// //       if (error) throw error;
// //       return data as Transaction[];
// //     },
// //     enabled: !!user?.id,
// //   });
// // }

// // /**
// //  * Hook to filter transactions by date range
// //  */
// // export function useTransactionsByDateRange(startDate: Date, endDate: Date) {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["transactions_by_date", user?.id, startDate, endDate],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("transactions")
// //         .select("*")
// //         .eq("user_id", user.id)
// //         .gte("created_at", startDate.toISOString())
// //         .lte("created_at", endDate.toISOString())
// //         .order("created_at", { ascending: false });

// //       if (error) throw error;
// //       return data as Transaction[];
// //     },
// //     enabled: !!user?.id,
// //   });
// // }
