import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useResellerStore } from "@/store/resellerStore";

export interface StorePlan {
  /** global_base_plans.id (uuid). */
  id: string;
  /**
   * global_base_plans.provider_plan_id. A string: the purchase functions
   * look this up with .eq("provider_plan_id", providerPlanId), so it must
   * not be coerced to a number.
   */
  plan_id: string;
  network: string;
  /** "data" or "airtime". */
  category: string;
  plan_name: string;
  price: number;
  validity?: string;
  /** The destination country this plan delivers to (lowercase). */
  country_code: string;
}

/** A data plan. Retained as an alias so existing imports keep working. */
export type DataPlan = StorePlan;

/**
 * Customer storefront catalog, read through the global-store-catalog edge
 * function. The function resolves the store's country from
 * global_reseller_applications (never from us) for pricing, and returns only
 * storefront fields - base cost and markup never leave the server. This
 * replaces the legacy direct read of resellers x reseller_plan_configs x
 * reseller_base_plans, which was Nigeria-only and required a store-name lookup.
 *
 * Phase 2 cross-border: the catalog is NOT scoped to the store's own country.
 * A reseller sells any country the platform covers, priced in the store's own
 * currency, so every enabled plan is returned with its destination
 * `country_code` and the caller filters by the country the typed number
 * resolves to. Both categories ("data" and "airtime") are fetched, so the
 * customer can switch service type without a second round trip.
 *
 * resellerId comes from the build config (see store/resellerStore.ts); the
 * app never needs to resolve it at runtime.
 */
export function useStoreCatalog() {
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["store_catalog", resellerId],
    queryFn: async () => {
      if (!resellerId) {
        return { plans: [] as StorePlan[], networks: [] as string[] };
      }

      // No category: the function returns every enabled plan (data + airtime),
      // each tagged with its own category and destination country.
      const { data, error } = await supabase.functions.invoke(
        "global-store-catalog",
        { body: { resellerId } },
      );

      if (error) {
        console.error("[useStoreCatalog] Error:", error);
        throw error;
      }

      const plans: StorePlan[] = (data?.plans ?? []).map((p: any) => ({
        id: p.id,
        plan_id: p.plan_id,
        network: p.network ?? "",
        category: (p.category ?? "").toLowerCase(),
        plan_name: p.name,
        validity: p.validity,
        price: p.price,
        country_code: (p.country_code ?? "").toLowerCase(),
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

/**
 * Every plan the store sells for a destination country and a service type.
 *
 * `country` is the country the typed number resolved to (see
 * hooks/useNetworkLookup.ts). A plan for a country the store never enabled is
 * simply absent from the catalog - the catalog is the store's opt-in set - so
 * an empty result is the correct answer for an unsupported destination.
 */
export function usePlansForDestination(
  country: string | null | undefined,
  category: "data" | "airtime",
) {
  const { data, isLoading, refetch } = useStoreCatalog();

  const cc = (country || "").toLowerCase();
  const cat = category.toLowerCase();
  const plans = cc
    ? (data?.plans ?? []).filter(
        (p) => p.country_code === cc && p.category === cat,
      )
    : [];

  return { data: plans, isLoading, refetch };
}

/**
 * Plans for a single network in a destination country and category.
 *
 * Kept for the existing per-network call sites. `network` is matched
 * case-insensitively; an empty network returns every plan for the destination.
 */
export function useDataPlansByNetwork(
  network: string,
  country?: string | null,
  category: "data" | "airtime" = "data",
) {
  const { data, isLoading, refetch } = usePlansForDestination(country, category);

  if (!network) return { data, isLoading, refetch };

  const target = network.toUpperCase();
  const plans = data.filter((p) => (p.network ?? "").toUpperCase() === target);

  return { data: plans, isLoading, refetch };
}
