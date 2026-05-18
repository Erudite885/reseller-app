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
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/purchase-data`,
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
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/purchase-airtime`,
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

// // ============================================
// // hooks/usePurchaseVTU.ts
// // REPLACED BY usePurchaseData and usePurchaseAirtime with transaction pin support
// // Kept this file for reference in case we need to revert or compare logic
// // ============================================

// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// function getStoreSlug(): string {
//   return useResellerStore.getState().config.storeName;
// }

// interface PlanConfig {
//   markup_type: string;
//   markup_value: number;
//   plan: {
//     id: string;
//     amount: number;
//     plan_name: string;
//   };
// }

// /**
//  * Hook to purchase data
//  */
// export function usePurchaseData() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();
//   const storeSlug = getStoreSlug();

//   return useMutation({
//     mutationFn: async (purchaseData: {
//       plan_id: number;
//       phoneNumber: string;
//       transactionPin: string;
//     }) => {
//       if (!user?.id) throw new Error("No user");

//       const requestId = `REQ-RR-${Date.now()}-${Math.random().toString(36).substring(7)}`;

//       // Step 1: Get reseller ID from store name
//       const { data: reseller, error: resellerError } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (resellerError || !reseller) throw new Error("Store not found");

//       // Step 2: Get the plan config
//       const { data: planConfig, error: planError } = await supabase
//         .from("reseller_plan_configs")
//         .select(
//           `
//           markup_type,
//           markup_value,
//           plan:plan_id (
//             id,
//             amount,
//             plan_name
//           )
//         `,
//         )
//         .eq("reseller_id", reseller.id)
//         .eq("plan_id", purchaseData.plan_id)
//         .eq("enabled", true)
//         .single();

//       if (planError || !planConfig) throw new Error("Plan not available");

//       const config = planConfig as unknown as PlanConfig;

//       if (!config.plan) throw new Error("Plan data not found");

//       // Step 3: Calculate final price
//       const finalPrice =
//         config.markup_type === "percentage"
//           ? Math.round(config.plan.amount * (1 + config.markup_value / 100))
//           : Math.round(config.plan.amount + config.markup_value);

//       console.log("[PurchaseData]", {
//         plan: config.plan.plan_name,
//         basePrice: config.plan.amount,
//         markupType: config.markup_type,
//         markupValue: config.markup_value,
//         finalPrice,
//       });

//       // Step 4: Call existing process_data_purchase RPC
//       const { data: txData, error: txError } = await supabase.rpc(
//         "process_data_purchase",
//         {
//           p_user_id: user.id,
//           p_plan_id: purchaseData.plan_id,
//           p_phone_number: purchaseData.phoneNumber,
//           p_request_id: requestId,
//         },
//       );

//       if (txError) throw txError;
//       if (!txData.success) throw new Error(txData.error);

//       return {
//         success: true,
//         message: `${config.plan.plan_name} purchased successfully for ${purchaseData.phoneNumber}!`,
//         plan_name: config.plan.plan_name,
//         amount: finalPrice,
//       };
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
//       queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
//     },
//   });
// }

// /**
//  * Hook to purchase airtime
//  */
// export function usePurchaseAirtime() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (purchaseData: {
//       network: string;
//       phoneNumber: string;
//       amount: number;
//       transactionPin: string;
//     }) => {
//       if (!user?.id) throw new Error("No user");

//       const requestId = `REQ-RR-${Date.now()}-${Math.random().toString(36).substring(7)}`;

//       console.log("[PurchaseAirtime]", {
//         network: purchaseData.network,
//         phoneNumber: purchaseData.phoneNumber,
//         amount: purchaseData.amount,
//       });

//       // Call existing process_airtime_purchase RPC
//       const { data: txData, error: txError } = await supabase.rpc(
//         "process_airtime_purchase",
//         {
//           p_user_id: user.id,
//           p_network: purchaseData.network,
//           p_phone_number: purchaseData.phoneNumber,
//           p_amount: purchaseData.amount,
//           p_request_id: requestId,
//         },
//       );

//       if (txError) throw txError;
//       if (!txData.success) throw new Error(txData.error);

//       return {
//         success: true,
//         message: `₦${purchaseData.amount} airtime purchased successfully for ${purchaseData.phoneNumber}!`,
//         amount: purchaseData.amount,
//       };
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
//       queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
//     },
//   });
// }
