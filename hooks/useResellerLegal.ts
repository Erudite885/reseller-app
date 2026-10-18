// hooks/useResellerLegal.ts
//
// Task 8, branch 8.b. The store's legal copy (privacy policy / terms),
// generated from the store's name + contact email. Those come from the
// global_* store record via the global-store-customer-context function's
// public-store fields... but the legal pages are shown to signed-out users,
// so this reads the store identity from the catalog function's response
// instead (which is public) - see below.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getCountryConfig } from "@/constants/countryConfig";
import { useResellerStore } from "@/store/resellerStore";
import {
  generatePrivacyPolicy,
  generateTermsAndConditions,
} from "@/constants/legalTextGenerator";

interface StoreIdentityResponse {
  store?: { name: string; email: string | null; country_code?: string } | null;
}

export function useResellerLegal() {
  const resellerId = useResellerStore.getState().config.resellerId;
  const storeName = useResellerStore.getState().config.storeName;

  return useQuery({
    queryKey: ["reseller-legal", resellerId],
    queryFn: async () => {
      // Public store identity (name + contact email) via the catalog
      // function's store block; the legal pages render for signed-out users
      // too, so no JWT is required here.
      const { data, error } = await supabase.functions.invoke(
        "global-store-catalog",
        { body: { resellerId } },
      );
      if (error) throw error;

      const store = (data as StoreIdentityResponse)?.store;
      const country = getCountryConfig(
        store?.country_code ||
          useResellerStore.getState().config.countryCode,
      );
      return {
        privacyPolicy: generatePrivacyPolicy({
          store_name: store?.name || storeName,
          email: store?.email || "",
          country: country.name,
        }),
        termsAndConditions: generateTermsAndConditions({
          store_name: store?.name || storeName,
          email: store?.email || "",
          country: country.name,
        }),
      };
    },
    enabled: !!resellerId,
  });
}
