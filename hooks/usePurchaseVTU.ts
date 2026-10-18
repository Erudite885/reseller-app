// hooks/usePurchaseVTU.ts
//
// Task 8, pointer 8.c.i. Repoints purchases at the multi-country functions
// global-purchase-data / global-purchase-airtime (via
// _shared/purchaseOrchestrator.ts), replacing the legacy Nigeria-only
// purchase-data / purchase-airtime calls. Until this landed, browsing a
// catalog worked but buying failed, because the catalog returns
// global_base_plans.provider_plan_id values the legacy functions cannot
// resolve.
//
// Request shape matches what the orchestrator expects:
// { resellerId, planId, phoneNumber, transactionPin, userId }.
//
// Airtime is a fixed-denomination catalog in the global_* model (there is no
// free-amount airtime product - every active airtime plan is a priced
// denomination). So airtime resolves the caller's amount to the matching
// airtime plan for the store's country and sends that plan's
// provider_plan_id.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

async function callPurchaseFunction(
  name: string,
  body: Record<string, unknown>,
): Promise<any> {
  const resellerId = useResellerStore.getState().config.resellerId;
  if (!resellerId) throw new Error("Store is not configured");

  const { data, error } = await supabase.functions.invoke(name, {
    body: { resellerId, ...body },
  });

  // The purchase functions return { success: false, error } with a 400 for a
  // business failure; surface that message rather than a transport error.
  const result: any = data;
  if (error && !result) throw new Error(error.message || "Purchase failed");
  if (result && result.success === false) {
    throw new Error(result.error || result.message || "Purchase failed");
  }
  return result;
}

/** The store's airtime denominations (from the catalog). */
export function useAirtimePlans() {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["store_airtime_plans", resellerId, user?.id],
    queryFn: async () => {
      if (!resellerId) return [];
      const data = await callStoreFunction<{ plans: any[] }>(
        "global-store-catalog",
        { category: "airtime" },
      );
      return (data.plans ?? []).map((p: any) => ({
        plan_id: p.plan_id,
        network: p.network ?? "",
        name: p.name,
        price: p.price,
      }));
    },
    enabled: !!resellerId,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePurchaseData() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (purchaseData: {
      // global_base_plans.provider_plan_id (string).
      plan_id: string;
      phoneNumber: string;
      transactionPin: string;
    }) => {
      if (!user?.id) throw new Error("No user");
      return callPurchaseFunction("global-purchase-data", {
        planId: purchaseData.plan_id,
        phoneNumber: purchaseData.phoneNumber,
        transactionPin: purchaseData.transactionPin,
        userId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function usePurchaseAirtime() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: airtimePlans } = useAirtimePlans();

  return useMutation({
    mutationFn: async (purchaseData: {
      phoneNumber: string;
      amount: number;
      transactionPin: string;
    }) => {
      if (!user?.id) throw new Error("No user");

      const match = (airtimePlans ?? []).find(
        (p) => Number(p.price) === Number(purchaseData.amount),
      );
      if (!match) {
        throw new Error(
          "No airtime plan matches that amount for this store. Please choose a listed denomination.",
        );
      }

      return callPurchaseFunction("global-purchase-airtime", {
        planId: match.plan_id,
        phoneNumber: purchaseData.phoneNumber,
        transactionPin: purchaseData.transactionPin,
        userId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
