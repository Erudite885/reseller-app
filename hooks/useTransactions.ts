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