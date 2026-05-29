// hooks/useProfiles.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface Profile {
  id: string;
  username: string;
  email: string;
  account_type: "reseller" | "customer";
  transaction_pin?: string | null;
  created_at?: string;
}

export function useProfile() {
  const { user } = useAuthStore();
  const storeSlug = useResellerStore.getState().config.storeName;

  return useQuery({
    queryKey: ["profile", user?.id, storeSlug],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      // 1. Check if Reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id, email, store_name, status, transaction_pin, created_at")
        .eq("auth_user_id", user.id)
        .eq("status", "active")
        .single();

      if (reseller) {
        return {
          id: reseller.id,
          username: reseller.store_name,
          email: reseller.email,
          account_type: "reseller" as const,
          transaction_pin: reseller.transaction_pin,
          created_at: reseller.created_at,
        };
      }

      // 2. Check if Customer (Improved + Simplified)
      let customer: any = null;

      // Try via store slug first
      if (storeSlug) {
        const { data: currentReseller } = await supabase
          .from("resellers")
          .select("id")
          .eq("store_name", storeSlug)
          .eq("status", "active")
          .single();

        if (currentReseller) {
          const { data } = await supabase
            .from("reseller_customers")
            .select("id, email, first_name, transaction_pin, created_at")
            .eq("auth_user_id", user.id)
            .eq("reseller_id", currentReseller.id)
            .single();

          if (data) customer = data;
        }
      }

      // Fallback: Direct lookup by auth_user_id
      if (!customer) {
        const { data } = await supabase
          .from("reseller_customers")
          .select("id, email, first_name, transaction_pin, created_at")
          .eq("auth_user_id", user.id)
          .single();

        if (data) customer = data;
      }

      if (customer) {
        const displayName =
          customer.first_name?.trim() ||
          customer.email?.split("@")[0] ||
          "Customer";

        return {
          id: customer.id,
          username: displayName,
          email: customer.email,
          account_type: "customer" as const,
          transaction_pin: customer.transaction_pin,
          created_at: customer.created_at,
        };
      }

      throw new Error("No profile found");
    },
    enabled: !!user?.id,
    retry: 2,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: { username?: string }) => {
      if (!user?.id) throw new Error("No user");

      // Reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (reseller) {
        if (updates.username) {
          const { data, error } = await supabase
            .from("resellers")
            .update({ store_name: updates.username })
            .eq("id", reseller.id)
            .select("id, email, store_name, created_at")
            .single();

          if (error) throw error;
          return {
            ...data,
            username: data.store_name,
            account_type: "reseller",
          };
        }
        throw new Error("No valid updates");
      }

      // Customer - Only update first_name
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (customer && updates.username) {
        const { data, error } = await supabase
          .from("reseller_customers")
          .update({ first_name: updates.username })
          .eq("id", customer.id)
          .select("id, email, first_name, created_at")
          .single();

        if (error) throw error;

        return {
          id: data.id,
          username: data.first_name || "Customer",
          email: data.email,
          account_type: "customer",
          created_at: data.created_at,
        };
      }

      throw new Error("No profile found or no updates provided");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}