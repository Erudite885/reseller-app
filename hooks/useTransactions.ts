// hooks/useTransactions.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

// Transaction type definition
export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  service: string;
  network: string;
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
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

/**
 * Hook to fetch user transactions
 */
export function useTransactions(limit: number = 50, offset: number = 0) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["transactions", user?.id, limit, offset],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // Consider data fresh for 1 minute
  });
}

/**
 * Hook to purchase data or airtime
 */
export function usePurchase() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (purchaseData: {
      type: "data" | "airtime";
      network: string;
      phoneNumber: string;
      amount: number;
      dataPlan?: string;
    }) => {
      if (!user?.id) throw new Error("No user");

      // Call the Supabase RPC function to process purchase
      const { data, error } = await supabase.rpc("process_purchase", {
        p_user_id: user.id,
        p_type: purchaseData.type,
        p_network: purchaseData.network,
        p_phone_number: purchaseData.phoneNumber,
        p_amount: purchaseData.amount,
        p_data_plan: purchaseData.dataPlan || null,
      });

      if (error) throw error;

      // Check if the result indicates success
      if (data && !data.success) {
        throw new Error(data.error || "Purchase failed");
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
    },
  });
}

/**
 * Hook to get a single transaction by ID
 */
export function useTransaction(transactionId: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    enabled: !!user?.id && !!transactionId,
  });
}

/**
 * Hook to get transaction statistics
 */
export function useTransactionStats() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["transaction_stats", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, status")
        .eq("user_id", user.id);

      if (error) throw error;

      // Calculate statistics
      const stats = {
        total: data.length,
        totalSpent: data
          .filter((t) => t.status === "completed")
          .reduce((sum, t) => sum + Number(t.amount), 0),
        dataTransactions: data.filter((t) => t.type === "data").length,
        airtimeTransactions: data.filter((t) => t.type === "airtime").length,
        completedTransactions: data.filter((t) => t.status === "completed")
          .length,
        pendingTransactions: data.filter((t) => t.status === "pending").length,
        failedTransactions: data.filter((t) => t.status === "failed").length,
      };

      return stats;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
}

/**
 * Hook to get recent transactions (last 10)
 */
export function useRecentTransactions() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["recent_transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook to update transaction status (for admin/webhook use)
 */
export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      transactionId,
      status,
      providerReference,
      errorMessage,
    }: {
      transactionId: string;
      status: "pending" | "completed" | "failed" | "cancelled";
      providerReference?: string;
      errorMessage?: string;
    }) => {
      const { data, error } = await supabase.rpc("update_transaction_status", {
        p_transaction_id: transactionId,
        p_status: status,
        p_provider_reference: providerReference || null,
        p_error_message: errorMessage || null,
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.error || "Failed to update transaction status");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
    },
  });
}

/**
 * Hook to filter transactions by type
 */
export function useTransactionsByType(
  type: "data" | "airtime" | "credit" | "debit"
) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["transactions_by_type", user?.id, type],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to filter transactions by date range
 */
export function useTransactionsByDateRange(startDate: Date, endDate: Date) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["transactions_by_date", user?.id, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user?.id,
  });
}