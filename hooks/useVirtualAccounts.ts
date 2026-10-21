// hooks/useVirtualAccounts.ts
//
// Task 8, branch 8.a.ii.zq. The caller's virtual accounts through the
// global-store-wallet edge function (global_virtual_accounts for a reseller,
// global_customer_virtual_accounts for a customer). Replaces the legacy
// direct reads, which were Nigeria-only.
//
// The create path calls global-create-customer-virtual-account (8.e.v),
// the global_* equivalent of the web action.

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
 * Create a virtual account. No parameters: the function resolves the store
 * and the customer from the caller's JWT.
 *
 * This targets the global-create-customer-virtual-account edge function.
 * The legacy create-mobile-customer-virtual-account it replaced resolved the
 * store by name and is dead under the global_* model - it returned 404
 * "Store not found" for every store (see TASK-8-BOARD.md 8.e.v).
 */
export function useCreateVirtualAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      return callStoreFunction<{
        success: boolean;
        message?: string;
        accounts?: any[];
      }>("global-create-customer-virtual-account");
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
