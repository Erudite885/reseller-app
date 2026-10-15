// hooks/useVirtualAccounts.ts
//
// Task 8, branch 8.a.ii.zq. The caller's virtual accounts through the
// global-store-wallet edge function (global_virtual_accounts for a reseller,
// global_customer_virtual_accounts for a customer). Replaces the legacy
// direct reads, which were Nigeria-only.
//
// The create path still targets the existing
// create-mobile-customer-virtual-account function (an account-creation
// integration outside Task 8's read-layer scope).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface VirtualAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  provider: string;
  status: string;
  created_at: string;
}

interface WalletResponse {
  wallet: { id: string; balance: number; currency: string | null } | null;
  virtual_accounts: VirtualAccount[];
}

export function useVirtualAccounts() {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["virtual_accounts", resellerId, user?.id],
    queryFn: async (): Promise<VirtualAccount[]> => {
      if (!user?.id) throw new Error("No user");
      const data = await callStoreFunction<WalletResponse>("global-store-wallet");
      return data.virtual_accounts ?? [];
    },
    enabled: !!user?.id && !!resellerId,
    staleTime: Infinity,
  });
}

/**
 * Create a virtual account. No parameters: the function uses the logged-in
 * user's info from the database.
 */
export function useCreateVirtualAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;
  const storeSlug = useResellerStore.getState().config.storeName;

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Supabase URL not configured");

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-mobile-customer-virtual-account`;

      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create virtual account");
      }

      return {
        success: true,
        message: data.message,
        accounts: data.accounts,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual_accounts", resellerId, user?.id],
      });
    },
  });
}

export function useHasVirtualAccount() {
  const { data: accounts, isLoading } = useVirtualAccounts();

  return {
    hasAccount: (accounts?.length ?? 0) > 0,
    accountCount: accounts?.length ?? 0,
    isLoading,
  };
}
