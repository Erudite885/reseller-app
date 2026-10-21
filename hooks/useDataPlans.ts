import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useResellerStore } from "@/store/resellerStore";

export interface DataPlan {
  /** global_base_plans.id (uuid). */
  id: string;
  /**
   * global_base_plans.provider_plan_id. A string: the purchase functions
   * look this up with .eq("provider_plan_id", providerPlanId), so it must
   * not be coerced to a number.
   */
  plan_id: string;
  network: string;
  plan_type: string;
  plan_name: string;
  price: number;
  validity?: string;
}

/**
 * Customer storefront catalog, read through the global-store-catalog edge
 * function. The function resolves the store's country from
 * global_reseller_applications (never from us), prices plans exactly like
 * the purchase flow, and returns only storefront fields - base cost and
 * markup never leave the server. This replaces the legacy direct read of
 * resellers x reseller_plan_configs x reseller_base_plans, which was
 * Nigeria-only and required a store-name lookup.
 *
 * resellerId comes from the build config (see store/resellerStore.ts); the
 * app never needs to resolve it at runtime.
 *
 * Returns every plan for the store plus the store's own `networks` list.
 * That list is what the customer picks from in countries with no prefix
 * table (see constants/helpers.ts); Nigeria still auto-detects from the
 * phone number.
 */
export function useStoreCatalog() {
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["store_catalog", resellerId],
    queryFn: async () => {
      if (!resellerId) {
        return { plans: [] as DataPlan[], networks: [] as string[] };
      }

      // Only "data" plans exist so far; the function returns every category
      // when none is passed.
      const { data, error } = await supabase.functions.invoke(
        "global-store-catalog",
        { body: { resellerId, category: "data" } },
      );

      if (error) {
        console.error("[useStoreCatalog] Error:", error);
        throw error;
      }

      const plans: DataPlan[] = (data?.plans ?? []).map((p: any) => ({
        id: p.id,
        plan_id: p.plan_id,
        network: p.network ?? "",
        plan_type: p.category ?? "",
        plan_name: p.name,
        validity: p.validity,
        price: p.price,
      }));

      // Sort by price ascending, as the legacy read did.
      plans.sort((a, b) => a.price - b.price);

      return {
        plans,
        networks: (data?.networks ?? []) as string[],
      };
    },
    enabled: !!resellerId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDataPlansByNetwork(network: string) {
  const { data, isLoading, refetch } = useStoreCatalog();

  const target = network.toUpperCase();
  const plans = (data?.plans ?? []).filter(
    (p) =>
      (p.network ?? "").toUpperCase() === target ||
      (p.plan_type ?? "").toUpperCase() === target,
  );

  return { data: plans, isLoading, refetch };
}
