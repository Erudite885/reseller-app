// hooks/useProfiles.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface Profile {
  id: string;
  username: string;
  email: string;
  first_name?: string;
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

      // Priority 1: Check if user is a reseller
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

      // Priority 2: Check if user is a customer of THIS reseller
      const { data: currentReseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (currentReseller) {
        const { data: customer } = await supabase
          .from("reseller_customers")
          .select(
            "id, email, first_name, last_name, transaction_pin, created_at",
          )
          .eq("auth_user_id", user.id)
          .eq("reseller_id", currentReseller.id)
          .single();

        if (customer) {
          // Use first_name as username for customers
          const displayName =
            customer.first_name || customer.email?.split("@")[0] || "Customer";

          return {
            id: customer.id,
            username: displayName,
            email: customer.email,
            first_name: customer.first_name,
            account_type: "customer" as const,
            transaction_pin: customer.transaction_pin,
            created_at: customer.created_at,
          };
        }
      }

      throw new Error("No profile found");
    },
    enabled: !!user?.id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      if (!user?.id) throw new Error("No user");

      // Check if reseller
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (reseller) {
        const resellerUpdates: Record<string, string> = {};
        if (updates.username) resellerUpdates.store_name = updates.username;

        if (Object.keys(resellerUpdates).length > 0) {
          const { data, error } = await supabase
            .from("resellers")
            .update(resellerUpdates)
            .eq("id", reseller.id)
            .select("id, email, store_name, status, created_at")
            .single();

          if (error) throw error;

          return {
            id: data.id,
            username: data.store_name,
            email: data.email,
            account_type: "reseller",
            created_at: data.created_at,
          };
        }
        throw new Error("No valid fields to update");
      }

      // Check if customer
      const { data: customer } = await supabase
        .from("reseller_customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (customer) {
        const customerUpdates: Record<string, string> = {};

        // For customers, username maps to first_name
        if (updates.username) {
          customerUpdates.first_name = updates.username;
        }
        if (updates.first_name) customerUpdates.first_name = updates.first_name;
        if (updates.last_name) customerUpdates.last_name = updates.last_name;

        if (Object.keys(customerUpdates).length > 0) {
          const { data, error } = await supabase
            .from("reseller_customers")
            .update(customerUpdates)
            .eq("id", customer.id)
            .select("id, email, first_name, last_name, created_at")
            .single();

          if (error) throw error;

          // Return the updated profile with proper display name
          const displayName =
            data.first_name || data.email?.split("@")[0] || "Customer";

          return {
            id: data.id,
            username: displayName,
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
            account_type: "customer",
            created_at: data.created_at,
          };
        }
        throw new Error("No valid fields to update");
      }

      throw new Error("No profile found");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}

// // hooks/useProfiles.ts

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// export interface Profile {
//   id: string;
//   username: string;
//   email: string;
//   first_name?: string;
//   last_name?: string;
//   account_type: "reseller" | "customer";
//   transaction_pin?: string | null;
//   created_at?: string;
// }

// export function useProfile() {
//   const { user } = useAuthStore();
//   const storeSlug = useResellerStore.getState().config.storeName;

//   return useQuery({
//     queryKey: ["profile", user?.id, storeSlug],
//     queryFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       // Priority 1: Check if user is a reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id, email, store_name, status, transaction_pin, created_at")
//         .eq("auth_user_id", user.id)
//         .eq("status", "active")
//         .single();

//       if (reseller) {
//         return {
//           id: reseller.id,
//           username: reseller.store_name,
//           email: reseller.email,
//           account_type: "reseller" as const,
//           transaction_pin: reseller.transaction_pin,
//           created_at: reseller.created_at,
//         };
//       }

//       // Priority 2: Check if user is a customer of THIS reseller
//       const { data: currentReseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("store_name", storeSlug)
//         .eq("status", "active")
//         .single();

//       if (currentReseller) {
//         const { data: customer } = await supabase
//           .from("reseller_customers")
//           .select(
//             "id, email, first_name, last_name, transaction_pin, created_at",
//           )
//           .eq("auth_user_id", user.id)
//           .eq("reseller_id", currentReseller.id)
//           .single();

//         if (customer) {
//           return {
//             id: customer.id,
//             username:
//               customer.first_name ||
//               customer.email?.split("@")[0] ||
//               "Customer",
//             email: customer.email,
//             first_name: customer.first_name,
//             last_name: customer.last_name,
//             account_type: "customer" as const,
//             transaction_pin: customer.transaction_pin,
//             created_at: customer.created_at,
//           };
//         }
//       }

//       throw new Error("No profile found");
//     },
//     enabled: !!user?.id,
//   });
// }

// export function useUpdateProfile() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (updates: Record<string, string>) => {
//       if (!user?.id) throw new Error("No user");

//       // Check if reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .single();

//       if (reseller) {
//         const resellerUpdates: Record<string, string> = {};
//         if (updates.username) resellerUpdates.store_name = updates.username;

//         if (Object.keys(resellerUpdates).length > 0) {
//           const { data, error } = await supabase
//             .from("resellers")
//             .update(resellerUpdates)
//             .eq("id", reseller.id)
//             .select("id, email, store_name, status, created_at")
//             .single();

//           if (error) throw error;

//           return {
//             id: data.id,
//             username: data.store_name,
//             email: data.email,
//             account_type: "reseller",
//             created_at: data.created_at,
//           };
//         }
//         throw new Error("No valid fields to update");
//       }

//       // Check if customer
//       const { data: customer } = await supabase
//         .from("reseller_customers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .single();

//       if (customer) {
//         const customerUpdates: Record<string, string> = {};
//         if (updates.first_name) customerUpdates.first_name = updates.first_name;
//         if (updates.last_name) customerUpdates.last_name = updates.last_name;

//         if (Object.keys(customerUpdates).length > 0) {
//           const { data, error } = await supabase
//             .from("reseller_customers")
//             .update(customerUpdates)
//             .eq("id", customer.id)
//             .select("id, email, first_name, last_name, created_at")
//             .single();

//           if (error) throw error;

//           return {
//             id: data.id,
//             username:
//               data.first_name || data.email?.split("@")[0] || "Customer",
//             email: data.email,
//             first_name: data.first_name,
//             last_name: data.last_name,
//             account_type: "customer",
//             created_at: data.created_at,
//           };
//         }
//         throw new Error("No valid fields to update");
//       }

//       throw new Error("No profile found");
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
//     },
//   });
// }

// // // hooks/useProfiles.ts

// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";
// // import { useResellerStore } from "@/store/resellerStore";

// // export interface Profile {
// //   id: string;
// //   username: string;
// //   email: string;
// //   first_name?: string;
// //   last_name?: string;
// //   account_type: "reseller" | "customer";
// //   transaction_pin?: string | null;
// //   created_at?: string;
// // }

// // export function useProfile() {
// //   const { user } = useAuthStore();
// //   const storeSlug = useResellerStore.getState().config.storeName;

// //   return useQuery({
// //     queryKey: ["profile", user?.id, storeSlug],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       // Priority 1: Check if user is a reseller
// //       const { data: reseller } = await supabase
// //         .from("resellers")
// //         .select("id, email, store_name, status, created_at")
// //         .eq("auth_user_id", user.id)
// //         .eq("status", "active")
// //         .single();

// //       if (reseller) {
// //         return {
// //           id: reseller.id,
// //           username: reseller.store_name,
// //           email: reseller.email,
// //           first_name: reseller.store_name,
// //           account_type: "reseller" as const,
// //           created_at: reseller.created_at,
// //         };
// //       }

// //       // Priority 2: Check if user is a customer
// //       const { data: customer } = await supabase
// //         .from("reseller_customers")
// //         .select("id, email, first_name, last_name, auth_user_id, created_at")
// //         .eq("auth_user_id", user.id)
// //         .single();

// //       if (customer) {
// //         return {
// //           id: customer.id,
// //           username:
// //             customer.first_name || customer.email?.split("@")[0] || "Customer",
// //           email: customer.email,
// //           first_name: customer.first_name,
// //           last_name: customer.last_name,
// //           account_type: "customer" as const,
// //           created_at: customer.created_at,
// //         };
// //       }

// //       throw new Error("No profile found");
// //     },
// //     enabled: !!user?.id,
// //   });
// // }

// // export function useUpdateProfile() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async (updates: Record<string, string>) => {
// //       if (!user?.id) throw new Error("No user");

// //       // Check if reseller
// //       const { data: reseller } = await supabase
// //         .from("resellers")
// //         .select("id")
// //         .eq("auth_user_id", user.id)
// //         .single();

// //       if (reseller) {
// //         const resellerUpdates: Record<string, string> = {};
// //         if (updates.username) resellerUpdates.store_name = updates.username;

// //         if (Object.keys(resellerUpdates).length > 0) {
// //           const { data, error } = await supabase
// //             .from("resellers")
// //             .update(resellerUpdates)
// //             .eq("id", reseller.id)
// //             .select("id, email, store_name, status, created_at")
// //             .single();

// //           if (error) throw error;

// //           return {
// //             id: data.id,
// //             username: data.store_name,
// //             email: data.email,
// //             account_type: "reseller",
// //             created_at: data.created_at,
// //           };
// //         }
// //         throw new Error("No valid fields to update");
// //       }

// //       // Check if customer
// //       const { data: customer } = await supabase
// //         .from("reseller_customers")
// //         .select("id")
// //         .eq("auth_user_id", user.id)
// //         .single();

// //       if (customer) {
// //         const customerUpdates: Record<string, string> = {};
// //         if (updates.first_name) customerUpdates.first_name = updates.first_name;
// //         if (updates.last_name) customerUpdates.last_name = updates.last_name;

// //         if (Object.keys(customerUpdates).length > 0) {
// //           const { data, error } = await supabase
// //             .from("reseller_customers")
// //             .update(customerUpdates)
// //             .eq("id", customer.id)
// //             .select("id, email, first_name, last_name, created_at")
// //             .single();

// //           if (error) throw error;

// //           return {
// //             id: data.id,
// //             username:
// //               data.first_name || data.email?.split("@")[0] || "Customer",
// //             email: data.email,
// //             first_name: data.first_name,
// //             last_name: data.last_name,
// //             account_type: "customer",
// //             created_at: data.created_at,
// //           };
// //         }
// //         throw new Error("No valid fields to update");
// //       }

// //       throw new Error("No profile found");
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
// //     },
// //   });
// // }

// // // // hooks/useProfile.ts
// // // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // // import { supabase } from "@/lib/supabase";
// // // import { useAuthStore } from "@/store/auth.store";

// // // export function useProfile() {
// // //   const { user } = useAuthStore();

// // //   return useQuery({
// // //     queryKey: ["profile", user?.id],
// // //     queryFn: async () => {
// // //       if (!user?.id) throw new Error("No user");

// // //       const { data, error } = await supabase
// // //         .from("profiles")
// // //         .select("*")
// // //         .eq("id", user.id)
// // //         .single();

// // //       if (error) throw error;
// // //       return data;
// // //     },
// // //     enabled: !!user?.id,
// // //     // staleTime: Infinity, // or a very high number like 1000 * 60 * 60 * 24 (1 day)
// // //   });
// // // }

// // // export function useUpdateProfile() {
// // //   const queryClient = useQueryClient();
// // //   const { user } = useAuthStore();

// // //   return useMutation({
// // //     mutationFn: async (updates: any) => {
// // //       const { data, error } = await supabase
// // //         .from("profiles")
// // //         .update(updates)
// // //         .eq("id", user?.id)
// // //         .select()
// // //         .single();

// // //       if (error) throw error;
// // //       return data;
// // //     },
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
// // //     },
// // //   });
// // // }
