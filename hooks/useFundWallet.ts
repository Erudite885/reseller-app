// hooks/useFundWallet.ts
//
// Task 8, branch 8.f.ii; reworked in 8.k.i. Mobile-money wallet funding
// through the global-store-fund-wallet edge function. The app cannot call the
// web's Next.js server action, so the function is the Deno port of
// fundWallet.ts / fundGlobalCustomerWallet.ts and returns a checkout URL.
//
// This hook only *initiates*. Completion is server-side: the korapay /
// flutterwave webhooks match the reference and credit the wallet. The caller
// renders the returned URL in an in-app sheet (components/PaymentWebView.tsx)
// and refreshes the wallet query once the payer returns — so the payer is
// never handed to the OS browser.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface FundWalletResult {
  success: boolean;
  data?: {
    reference: string;
    redirectUrl?: string;
    providerReference?: string;
    authModel?: string;
  };
}

interface FundWalletParams {
  amount: number;
  /** Required only for gateways that need the payer's MSISDN up front. */
  mobileMoney?: { number: string };
}

export function useFundWallet() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useMutation({
    mutationFn: async ({
      amount,
      mobileMoney,
    }: FundWalletParams): Promise<FundWalletResult> => {
      if (!user?.id) throw new Error("No user");

      return callStoreFunction<FundWalletResult>("global-store-fund-wallet", {
        amount,
        mobileMoney,
      });
    },
    onSuccess: () => {
      // A pending transaction now exists. The wallet and transaction lists
      // pick up the credit once the webhook lands; the caller refreshes them
      // again when the payer closes the checkout sheet.
      queryClient.invalidateQueries({ queryKey: ["wallet", resellerId, user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["virtual_accounts", resellerId, user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions", resellerId, user?.id] });
    },
  });
}
