import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useResellerStore } from "@/store/resellerStore";

export interface DataPlan {
  id: string;
  plan_id: number;
  network: string;
  plan_type: string;
  plan_name: string;
  price: number;
  validity?: string;
}

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

export function useDataPlansByNetwork(network: string) {
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["store_plans", storeSlug, network],
    queryFn: async () => {
      if (!network) return [];

      // Step 1: Get the reseller ID from the store name
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (!reseller) return [];

      // Step 2: Get plan configs with base plan data using !inner join
      const { data, error } = await supabase
        .from("reseller_plan_configs")
        .select(
          `
          id,
          markup_type,
          markup_value,
          plan:plan_id!inner(
            id,
            plan_id,
            network,
            plan_type,
            plan_name,
            amount,
            validity
          )
        `,
        )
        .eq("reseller_id", reseller.id)
        .eq("enabled", true)
        .eq("plan.network", network.toUpperCase())
        .eq("plan.is_active", true);

      if (error) {
        console.error("[useDataPlansByNetwork] Error:", error);
        throw error;
      }

      // Step 3: Calculate final prices and sort manually
      const plans = (data || []).map((rp: any) => ({
        id: rp.plan.id,
        plan_id: rp.plan.plan_id,
        network: rp.plan.network,
        plan_type: rp.plan.plan_type,
        plan_name: rp.plan.plan_name,
        validity: rp.plan.validity,
        price:
          rp.markup_type === "percentage"
            ? Math.round(rp.plan.amount * (1 + rp.markup_value / 100))
            : Math.round(rp.plan.amount + rp.markup_value),
      }));

      // Sort by price ascending
      return plans.sort((a, b) => a.price - b.price);
    },
    enabled: !!network,
    staleTime: 1000 * 60 * 5,
  });
}

// import { useQuery } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useResellerStore } from "@/store/resellerStore";

// export interface DataPlan {
//   id: string;
//   plan_id: number;
//   network: string;
//   plan_type: string;
//   plan_name: string;
//   price: number;
//   validity?: string;
// }

// function getStoreSlug(): string {
//   return useResellerStore.getState().config.storeName;
// }

// export function useDataPlansByNetwork(network: string) {
//   const storeSlug = getStoreSlug();

//   return useQuery({
//     queryKey: ["store_plans", storeSlug, network],
//     queryFn: async () => {
//       if (!network) return [];

//       // Step 1: Get the reseller ID from the store name
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (!reseller) return [];

//       // Step 2: Get plan configs with base plan data using !inner join
//       const { data, error } = await supabase
//         .from("reseller_plan_configs")
//         .select(
//           `
//           id,
//           markup_type,
//           markup_value,
//           plan:plan_id!inner(
//             id,
//             plan_id,
//             network,
//             plan_type,
//             plan_name,
//             amount,
//             validity
//           )
//         `,
//         )
//         .eq("reseller_id", reseller.id)
//         .eq("enabled", true)
//         .eq("plan.network", network.toUpperCase())
//         .eq("plan.is_active", true)
//         .order("amount", { referencedTable: "plan_id", ascending: true });

//       if (error) {
//         console.error("[useDataPlansByNetwork] Error:", error);
//         throw error;
//       }

//       // Step 3: Calculate final prices
//       return (data || []).map((rp: any) => ({
//         id: rp.plan.id,
//         plan_id: rp.plan.plan_id,
//         network: rp.plan.network,
//         plan_type: rp.plan.plan_type,
//         plan_name: rp.plan.plan_name,
//         validity: rp.plan.validity,
//         price:
//           rp.markup_type === "percentage"
//             ? Math.round(rp.plan.amount * (1 + rp.markup_value / 100))
//             : Math.round(rp.plan.amount + rp.markup_value),
//       }));
//     },
//     enabled: !!network,
//     staleTime: 1000 * 60 * 5,
//   });
// }

// // import { useQuery } from "@tanstack/react-query";
// // import { supabase } from "@/lib/supabase";
// // import { useResellerStore } from "@/store/resellerStore";

// // export interface DataPlan {
// //   id: string;
// //   plan_id: number;
// //   network: string;
// //   plan_type: string;
// //   plan_name: string;
// //   price: number;
// //   validity?: string;
// // }

// // function getStoreSlug(): string {
// //   return useResellerStore.getState().config.storeName;
// // }

// // /**
// //  * Hook to fetch plans by network from the reseller's store
// //  */
// // export function useDataPlansByNetwork(network: string) {
// //   const storeSlug = getStoreSlug();

// //   return useQuery({
// //     queryKey: ["store_plans", storeSlug, network],
// //     queryFn: async () => {
// //       if (!network) return [];

// //       // Step 1: Get the reseller ID from the store name
// //       const { data: reseller } = await supabase
// //         .from("resellers")
// //         .select("id")
// //         .eq("store_name", storeSlug)
// //         .eq("status", "active")
// //         .single();

// //       if (!reseller) return [];

// //       // Step 2: Get their enabled plan configs with calculated prices
// //       const { data, error } = await supabase
// //         .from("reseller_plan_configs")
// //         .select(
// //           `
// //           id,
// //           plan:plan_id (
// //             id,
// //             plan_id,
// //             network,
// //             plan_type,
// //             plan_name,
// //             amount,
// //             validity
// //           ),
// //           markup_type,
// //           markup_value
// //         `,
// //         )
// //         .eq("reseller_id", reseller.id)
// //         .eq("enabled", true)
// //         .eq("plan.network", network)
// //         .eq("plan.is_active", true)
// //         .order("plan(amount)", { ascending: true });

// //       if (error) throw error;

// //       // Step 3: Calculate final prices and return
// //       return (data || []).map((rp: any) => ({
// //         id: rp.plan.id,
// //         plan_id: rp.plan.plan_id,
// //         network: rp.plan.network,
// //         plan_type: rp.plan.plan_type,
// //         plan_name: rp.plan.plan_name,
// //         validity: rp.plan.validity,
// //         price:
// //           rp.markup_type === "percentage"
// //             ? Math.round(rp.plan.amount * (1 + rp.markup_value / 100))
// //             : Math.round(rp.plan.amount + rp.markup_value),
// //       }));
// //     },
// //     enabled: !!network,
// //     staleTime: 1000 * 60 * 5,
// //   });
// // }

// // // // hooks/useDataPlans.ts
// // // import { useQuery } from "@tanstack/react-query";
// // // import { supabase } from "@/lib/supabase";

// // // export interface DataPlan {
// // //   id: string;
// // //   plan_id: number;
// // //   network: string;
// // //   plan_type: string;
// // //   validity: string;
// // //   plan: string;
// // //   sell_price: number;
// // // }

// // // /**
// // //  * Hook to fetch data plans by network
// // //  */
// // // export function useDataPlansByNetwork(network: string) {
// // //   return useQuery({
// // //     queryKey: ["data_plans", network],
// // //     queryFn: async () => {
// // //       if (!network) return [];

// // //       const { data, error } = await supabase
// // //         .from("data_plans")
// // //         .select("id, plan_id, network, plan_type, validity, plan, sell_price")
// // //         .eq("network", network.toUpperCase())
// // //         .eq("is_active", true)
// // //         .order("display_order", { ascending: true });

// // //       if (error) throw error;
// // //       return data as DataPlan[];
// // //     },
// // //     enabled: !!network,
// // //     staleTime: 1000 * 60 * 5, // 5 minutes
// // //   });
// // // }

// // // /**
// // //  * Hook to get all active plans
// // //  */
// // // export function useDataPlans() {
// // //   return useQuery({
// // //     queryKey: ["data_plans", "all"],
// // //     queryFn: async () => {
// // //       const { data, error } = await supabase
// // //         .from("data_plans")
// // //         .select("*")
// // //         .eq("is_active", true)
// // //         .order("network", { ascending: true })
// // //         .order("display_order", { ascending: true});

// // //       if (error) throw error;
// // //       return data as DataPlan[];
// // //     },
// // //     staleTime: 1000 * 60 * 5,
// // //   });
// // // }
