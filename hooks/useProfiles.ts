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

function cleanUsername(
  raw: string | null | undefined,
  fallback = "User",
): string {
  if (!raw || !raw.trim()) return fallback;
  let name = raw.trim();

  // First, if this looks like an email (contains @), extract the local part
  if (name.includes("@")) {
    name = name.split("@")[0];
  }

  // Remove everything after + (Gmail alias)
  const plusIndex = name.indexOf("+");
  if (plusIndex > 0) name = name.substring(0, plusIndex);

  // Clean up: remove any remaining special chars, keep letters, numbers, dots, underscores
  name = name.replace(/[^\w\s\.\-]/gi, "");

  // Capitalize first letter of each word for better display
  name = name
    .split(/[\.\-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return name || fallback;
}

function displayEmail(raw: string | null | undefined): string {
  if (!raw) return "";

  // Strip everything after + in the local part
  const atIndex = raw.indexOf("@");
  if (atIndex < 0) return raw;

  const local = raw.substring(0, atIndex);
  const domain = raw.substring(atIndex);

  // Remove everything after + in the local part
  const plusIndex = local.indexOf("+");
  const cleanLocal = plusIndex > 0 ? local.substring(0, plusIndex) : local;

  // Capitalize the first letter for better display
  const displayLocal = cleanLocal.charAt(0).toUpperCase() + cleanLocal.slice(1);

  return displayLocal + domain;
}

export function useProfile() {
  const { user } = useAuthStore();
  const storeSlug = useResellerStore.getState().config.storeName;

  return useQuery({
    queryKey: ["profile", user?.id, storeSlug],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      console.log("[useProfile] Looking for user:", user.id);
      console.log("[useProfile] Store slug:", storeSlug);

      // 1. Check if Reseller
      const { data: reseller, error: resellerError } = await supabase
        .from("resellers")
        .select("id, email, store_name, status, transaction_pin, created_at")
        .eq("auth_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (resellerError) {
        console.error("[useProfile] Reseller lookup error:", resellerError);
      }

      if (reseller) {
        console.log("[useProfile] Found reseller:", reseller.store_name);
        return {
          id: reseller.id,
          username: reseller.store_name,
          email: reseller.email,
          account_type: "reseller" as const,
          transaction_pin: reseller.transaction_pin,
          created_at: reseller.created_at,
        };
      }

      // 2. Check if Customer — look up reseller by store slug first
      if (storeSlug) {
        const { data: currentReseller, error: resellerLookupError } =
          await supabase
            .from("resellers")
            .select("id")
            .eq("store_name", storeSlug)
            .eq("status", "active")
            .maybeSingle();

        if (resellerLookupError) {
          console.error(
            "[useProfile] Reseller slug lookup error:",
            resellerLookupError,
          );
        }

        if (currentReseller) {
          console.log(
            "[useProfile] Found reseller with ID:",
            currentReseller.id,
          );

          const { data: customer, error: customerError } = await supabase
            .from("reseller_customers")
            .select("id, email, first_name, transaction_pin, created_at")
            .eq("auth_user_id", user.id)
            .eq("reseller_id", currentReseller.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (customerError) {
            console.error("[useProfile] Customer lookup error:", customerError);
          }

          if (customer) {
            const username =
              cleanUsername(customer.first_name) !== "User"
                ? cleanUsername(customer.first_name)
                : cleanUsername(customer.email);

            console.log(
              "[useProfile] Found customer:",
              customer.id,
              "username:",
              username,
            );

            return {
              id: customer.id,
              username,
              email: displayEmail(customer.email),
              account_type: "customer" as const,
              transaction_pin: customer.transaction_pin,
              created_at: customer.created_at,
            };
          }
        }
      }

      // 3. Fallback — direct lookup by auth_user_id only, pick newest record
      console.log(
        "[useProfile] Trying direct customer lookup by auth_user_id only",
      );

      const { data: directCustomers, error: directError } = await supabase
        .from("reseller_customers")
        .select(
          "id, email, first_name, transaction_pin, created_at, reseller_id",
        )
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (directError) {
        console.error("[useProfile] Direct lookup error:", directError);
      }

      const directCustomer = directCustomers?.[0] ?? null;

      if (directCustomer) {
        const username =
          cleanUsername(directCustomer.first_name) !== "User"
            ? cleanUsername(directCustomer.first_name)
            : cleanUsername(directCustomer.email);

        console.log(
          "[useProfile] Found customer via direct lookup:",
          directCustomer.id,
          "username:",
          username,
        );

        return {
          id: directCustomer.id,
          username,
          email: directCustomer.email,
          account_type: "customer" as const,
          transaction_pin: directCustomer.transaction_pin,
          created_at: directCustomer.created_at,
        };
      }

      console.log("[useProfile] No profile found");
      throw new Error("No profile found");
    },
    enabled: !!user?.id,
    retry: 1,
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
        .maybeSingle();

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
            account_type: "reseller" as const,
          };
        }
        throw new Error("No valid updates");
      }

      // Customer — pick newest record to update
      const { data: customers } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const customer = customers?.[0] ?? null;

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
          account_type: "customer" as const,
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