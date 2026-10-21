// hooks/useFundWallet.ts
//
// Task 8, branch 8.f.ii. Mobile-money wallet funding through the
// global-store-fund-wallet edge function. The app cannot call the web's
// Next.js server action, so the function is the Deno port of
// fundWallet.ts / fundGlobalCustomerWallet.ts and returns a checkout URL.
//
// This hook only *initiates*. Completion is server-side: the korapay /
// flutterwave webhooks match the reference and credit the wallet. The
// caller opens the returned URL in a browser and the balance updates once
// the webhook lands, so refresh the wallet query on return.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
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

      const result = await callStoreFunction<FundWalletResult>(
        "global-store-fund-wallet",
        { amount, mobileMoney },
      );

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", resellerId, user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["virtual_accounts", resellerId, user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions", resellerId, user?.id] });

      // Hand the payer to the gateway's checkout page. openBrowserAsync
      // resolves when the sheet closes, which is also when the payer is
      // back from the redirect - a good moment to refetch the balance.
      const url = result.data?.redirectUrl;
      if (url) {
        WebBrowser.openBrowserAsync(url)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["wallet", resellerId, user?.id] });
            queryClient.invalidateQueries({ queryKey: ["transactions", resellerId, user?.id] });
          })
          .catch(() => {
            // The payer closed the sheet; the webhook still completes the
            // deposit, so nothing to surface here.
          });
      }
    },
  });
}
