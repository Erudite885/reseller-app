// hooks/useDataPlans.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DataPlan {
  id: string;
  plan_id: number;
  network: string;
  plan_type: string;
  validity: string;
  plan: string;
  sell_price: number;
}

/**
 * Hook to fetch data plans by network
 */
export function useDataPlansByNetwork(network: string) {
  return useQuery({
    queryKey: ["data_plans", network],
    queryFn: async () => {
      if (!network) return [];

      const { data, error } = await supabase
        .from("data_plans")
        .select("id, plan_id, network, plan_type, validity, plan, sell_price")
        .eq("network", network.toUpperCase())
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as DataPlan[];
    },
    enabled: !!network,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get all active plans
 */
export function useDataPlans() {
  return useQuery({
    queryKey: ["data_plans", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_plans")
        .select("*")
        .eq("is_active", true)
        .order("network", { ascending: true })
        .order("display_order", { ascending: true});

      if (error) throw error;
      return data as DataPlan[];
    },
    staleTime: 1000 * 60 * 5,
  });
}