// hooks/useResellerLegal.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useResellerStore } from "@/store/resellerStore";
import {
  generatePrivacyPolicy,
  generateTermsAndConditions,
} from "@/constants/legalTextGenerator";

export function useResellerLegal() {
  const storeSlug = useResellerStore.getState().config.storeName;

  return useQuery({
    queryKey: ["reseller-legal", storeSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resellers")
        .select("store_name, email")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (error) throw error;

      return {
        privacyPolicy: generatePrivacyPolicy(data),
        termsAndConditions: generateTermsAndConditions(data),
      };
    },
    enabled: !!storeSlug,
  });
}
