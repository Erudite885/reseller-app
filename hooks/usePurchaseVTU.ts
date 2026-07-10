// hooks/usePurchaseVTU.ts - UPDATED VERSION
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

/**
 * Hook to purchase data via Edge Function
 */
export function usePurchaseData() {
  const queryClient = useQueryClient();
  const { user, session } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useMutation({
    mutationFn: async (purchaseData: {
      plan_id: number;
      phoneNumber: string;
      transactionPin: string;
    }) => {
      if (!user?.id) throw new Error("No user");
      if (!session?.access_token) throw new Error("No session");

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL}/functions/v1/purchase-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            storeSlug,
            planId: purchaseData.plan_id,
            phoneNumber: purchaseData.phoneNumber,
            transactionPin: purchaseData.transactionPin,
            userId: user.id,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Purchase failed");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
    },
  });
}

/**
 * Hook to purchase airtime via Edge Function
 */
export function usePurchaseAirtime() {
  const queryClient = useQueryClient();
  const { user, session } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useMutation({
    mutationFn: async (purchaseData: {
      network: string;
      phoneNumber: string;
      amount: number;
      transactionPin: string;
    }) => {
      if (!user?.id) throw new Error("No user");
      if (!session?.access_token) throw new Error("No session");

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL}/functions/v1/purchase-airtime`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            storeSlug,
            network: purchaseData.network,
            phoneNumber: purchaseData.phoneNumber,
            amount: purchaseData.amount,
            transactionPin: purchaseData.transactionPin,
            userId: user.id,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Purchase failed");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
    },
  });
}

