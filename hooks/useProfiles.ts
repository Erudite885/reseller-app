// hooks/useProfiles.ts
//
// Task 8, branch 8.a.ii.zq. Reads the caller's own profile through the
// global-store-customer-context edge function (service-role read of
// global_customers / global_reseller_applications) and renames them through
// global-store-update-profile. This replaces the legacy direct reads of the
// Nigeria-only resellers / reseller_customers tables.
//
// The PIN itself is never returned; the profile carries
// `has_transaction_pin` instead. Verify/set/change the PIN through
// hooks/useTransactionPin.ts (global-store-pin).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface Profile {
  id: string;
  username: string;
  email: string;
  account_type: "reseller" | "customer";
  /** Whether a transaction PIN is set. The PIN value is never sent to the client. */
  has_transaction_pin: boolean;
  created_at?: string;
}

interface CustomerContextResponse {
  profile: {
    id: string;
    account_type: "reseller" | "customer";
    name: string;
    email: string;
    has_transaction_pin: boolean;
    created_at?: string;
  } | null;
}

export function useProfile() {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: ["profile", user?.id, resellerId],
    queryFn: async (): Promise<Profile> => {
      if (!user?.id) throw new Error("No user");

      const data = await callStoreFunction<CustomerContextResponse>(
        "global-store-customer-context",
      );

      if (!data.profile) throw new Error("No profile found");

      return {
        id: data.profile.id,
        username: data.profile.name,
        email: data.profile.email,
        account_type: data.profile.account_type,
        has_transaction_pin: data.profile.has_transaction_pin,
        created_at: data.profile.created_at,
      };
    },
    enabled: !!user?.id && !!resellerId,
    retry: 1,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: { username?: string }) => {
      if (!user?.id) throw new Error("No user");
      if (!updates.username) throw new Error("No valid updates");
      await callStoreFunction("global-store-update-profile", {
        name: updates.username,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
