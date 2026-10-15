// hooks/useWallet.ts
//
// Task 8, branch 8.a.ii.zq. The caller's wallet through the
// global-store-wallet edge function (global_wallets for a reseller,
// global_customer_wallets for a customer). Replaces the legacy direct reads
// of reseller_wallets / reseller_customer_wallets, which were Nigeria-only.

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface Wallet {
  id: string;
  balance: number;
  currency?: string | null;
}

interface WalletResponse {
  wallet: { id: string; balance: number; currency: string | null } | null;
  virtual_accounts: any[];
}

export function useWallet() {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["wallet", resellerId, user?.id],
    queryFn: async (): Promise<Wallet> => {
      if (!user?.id) throw new Error("No user");

      const data = await callStoreFunction<WalletResponse>("global-store-wallet");

      return {
        id: data.wallet?.id ?? "",
        balance: data.wallet?.balance ?? 0,
        currency: data.wallet?.currency ?? null,
      };
    },
    enabled: !!user?.id && !!resellerId,
    staleTime: 1000 * 30,
    refetchInterval: 360000,
  });
}
