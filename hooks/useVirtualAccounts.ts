// hooks/useVirtualAccounts.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface VirtualAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  provider: string;
  status: string;
  created_at: string;
}

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

async function getCurrentResellerId(): Promise<string | null> {
  const storeSlug = getStoreSlug();
  const { data } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeSlug)
    .eq("status", "active")
    .single();
  return data?.id || null;
}

async function getUserType(userId: string, resellerId: string) {
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("id", resellerId)
    .single();

  if (reseller) return { type: "reseller" as const, id: reseller.id };

  const { data: customer } = await supabase
    .from("reseller_customers")
    .select("id, email")
    .eq("auth_user_id", userId)
    .eq("reseller_id", resellerId)
    .single();

  if (customer)
    return {
      type: "customer" as const,
      id: customer.id,
      email: customer.email,
    };

  return null;
}

/**
 * Hook to fetch virtual accounts for the current user in this store
 */
export function useVirtualAccounts() {
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["virtual_accounts", storeSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      const resellerId = await getCurrentResellerId();
      if (!resellerId) return [];

      const userType = await getUserType(user.id, resellerId);
      if (!userType) return [];

      if (userType.type === "reseller") {
        const { data, error } = await supabase
          .from("reseller_virtual_accounts")
          .select("*")
          .eq("reseller_id", userType.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as VirtualAccount[];
      }

      const { data, error } = await supabase
        .from("reseller_customer_virtual_accounts")
        .select("*")
        .eq("reseller_id", resellerId)
        .eq("customer_id", userType.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as VirtualAccount[];
    },
    enabled: !!user?.id,
    staleTime: Infinity,
  });
}

/**
 * Hook to create a virtual account
 * ✅ No parameters needed - uses logged-in user's info from the database
 */
export function useCreateVirtualAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useMutation({
    // ✅ Remove parameters - no args needed
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Supabase URL not configured");

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-mobile-customer-virtual-account`;

      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeSlug,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create virtual account");
      }

      return {
        success: true,
        message: data.message,
        accounts: data.accounts,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["virtual_accounts", storeSlug, user?.id],
      });
    },
  });
}

export function useHasVirtualAccount() {
  const { data: accounts, isLoading } = useVirtualAccounts();

  return {
    hasAccount: (accounts?.length ?? 0) > 0,
    accountCount: accounts?.length ?? 0,
    isLoading,
  };
}


// // hooks/useVirtualAccounts.ts

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// export interface VirtualAccount {
//   id: string;
//   bank_name: string;
//   account_number: string;
//   account_name: string;
//   provider: string;
//   status: string;
//   created_at: string;
// }

// function getStoreSlug(): string {
//   return useResellerStore.getState().config.storeName;
// }

// async function getCurrentResellerId(): Promise<string | null> {
//   const storeSlug = getStoreSlug();
//   const { data } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", storeSlug)
//     .eq("status", "active")
//     .single();
//   return data?.id || null;
// }

// async function getUserType(userId: string, resellerId: string) {
//   const { data: reseller } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("auth_user_id", userId)
//     .eq("id", resellerId)
//     .single();

//   if (reseller) return { type: "reseller" as const, id: reseller.id };

//   const { data: customer } = await supabase
//     .from("reseller_customers")
//     .select("id, email")
//     .eq("auth_user_id", userId)
//     .eq("reseller_id", resellerId)
//     .single();

//   if (customer)
//     return {
//       type: "customer" as const,
//       id: customer.id,
//       email: customer.email,
//     };

//   return null;
// }

// /**
//  * Hook to fetch virtual accounts for the current user in this store
//  */
// export function useVirtualAccounts() {
//   const { user } = useAuthStore();
//   const storeSlug = getStoreSlug();

//   return useQuery({
//     queryKey: ["virtual_accounts", storeSlug, user?.id],
//     queryFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       const resellerId = await getCurrentResellerId();
//       if (!resellerId) return [];

//       const userType = await getUserType(user.id, resellerId);
//       if (!userType) return [];

//       if (userType.type === "reseller") {
//         const { data, error } = await supabase
//           .from("reseller_virtual_accounts")
//           .select("*")
//           .eq("reseller_id", userType.id)
//           .eq("status", "active")
//           .order("created_at", { ascending: false });

//         if (error) throw error;
//         return data as VirtualAccount[];
//       }

//       const { data, error } = await supabase
//         .from("reseller_customer_virtual_accounts")
//         .select("*")
//         .eq("reseller_id", resellerId)
//         .eq("customer_id", userType.id)
//         .eq("status", "active")
//         .order("created_at", { ascending: false });

//       if (error) throw error;
//       return data as VirtualAccount[];
//     },
//     enabled: !!user?.id,
//     staleTime: Infinity,
//   });
// }

// /**
//  * Hook to create a virtual account
//  */
// export function useCreateVirtualAccount() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();
//   const storeSlug = getStoreSlug();

//   return useMutation({
//     mutationFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       const supabaseUrl = process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL;
//       if (!supabaseUrl) throw new Error("Supabase URL not configured");

//       const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-mobile-customer-virtual-account`;

//       const response = await fetch(edgeFunctionUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           storeSlug,
//           userId: user.id,
//           userEmail: user.email,
//         }),
//       });
//       console.log("storeSlug being sent:", storeSlug);
//       console.log("userId being sent:", user.id);
//       console.log("userEmail being sent:", user.email);


//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to create virtual account");
//       }

//       return {
//         success: true,
//         message: data.message,
//         accounts: data.accounts,
//       };
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["virtual_accounts", storeSlug, user?.id],
//       });
//     },
//   });
// }

// export function useHasVirtualAccount() {
//   const { data: accounts, isLoading } = useVirtualAccounts();

//   return {
//     hasAccount: (accounts?.length ?? 0) > 0,
//     accountCount: accounts?.length ?? 0,
//     isLoading,
//   };
// }