// hooks/useWallet.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface Wallet {
  id: string;
  balance: number;
  total_sales: number;
  total_profit: number;
}

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

export function useWallet() {
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["wallet", storeSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      // First, get the reseller for this store
      const { data: reseller, error: resellerError } = await supabase
        .from("resellers")
        .select("id, auth_user_id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (resellerError || !reseller) {
        throw new Error("Store not found");
      }

      // Check if the logged-in user IS the reseller (store owner)
      if (reseller.auth_user_id === user.id) {
        // User is a reseller - fetch from reseller_wallets
        const { data: wallet, error: walletError } = await supabase
          .from("reseller_wallets")
          .select("id, balance, total_sales, total_profit")
          .eq("reseller_id", reseller.id)
          .maybeSingle();

        if (walletError) throw walletError;

        return {
          id: wallet?.id || "",
          balance: wallet?.balance || 0,
          total_sales: wallet?.total_sales || 0,
          total_profit: wallet?.total_profit || 0,
        } as Wallet;
      }

      // User is a customer - get their customer record first
      const { data: customer, error: customerError } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("reseller_id", reseller.id)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customer) {
        // Customer record not found - return zero balance
        return {
          id: "",
          balance: 0,
          total_sales: 0,
          total_profit: 0,
        } as Wallet;
      }

      // Get customer wallet
      const { data: wallet, error: walletError } = await supabase
        .from("reseller_customer_wallets")
        .select("id, balance, total_spent")
        .eq("reseller_id", reseller.id)
        .eq("customer_id", customer.id)
        .maybeSingle();

      if (walletError) throw walletError;

      return {
        id: wallet?.id || "",
        balance: wallet?.balance || 0,
        total_sales: wallet?.total_spent || 0,
        total_profit: 0,
      } as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30 * 30, // Consider data fresh for 60 seconds
    refetchInterval: 360000, // Auto-refetch every 360 seconds
  });
}

