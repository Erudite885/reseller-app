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
  const plusIndex = name.indexOf("+");
  if (plusIndex > 0) name = name.substring(0, plusIndex);
  const atIndex = name.indexOf("@");
  if (atIndex > 0) name = name.substring(0, atIndex);
  return name || fallback;
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
              email: customer.email,
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

// // hooks/useProfiles.ts

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";

// export interface Profile {
//   id: string;
//   username: string;
//   email: string;
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

//       console.log("[useProfile] Looking for user:", user.id);
//       console.log("[useProfile] Store slug:", storeSlug);

//       // 1. Check if Reseller
//       const { data: reseller, error: resellerError } = await supabase
//         .from("resellers")
//         .select("id, email, store_name, status, transaction_pin, created_at")
//         .eq("auth_user_id", user.id)
//         .eq("status", "active")
//         .maybeSingle();

//       if (reseller) {
//         console.log("[useProfile] Found reseller:", reseller.store_name);
//         return {
//           id: reseller.id,
//           username: reseller.store_name,
//           email: reseller.email,
//           account_type: "reseller" as const,
//           transaction_pin: reseller.transaction_pin,
//           created_at: reseller.created_at,
//         };
//       }

//       // 2. Check if Customer
//       // First get the reseller ID from store slug
//       const { data: currentReseller, error: resellerLookupError } =
//         await supabase
//           .from("resellers")
//           .select("id")
//           .eq("store_name", storeSlug)
//           .eq("status", "active")
//           .maybeSingle();

//       if (resellerLookupError) {
//         console.error(
//           "[useProfile] Error finding reseller:",
//           resellerLookupError,
//         );
//       }

//       if (currentReseller) {
//         console.log("[useProfile] Found reseller with ID:", currentReseller.id);

//         // Now look for the customer
//         const { data: customer, error: customerError } = await supabase
//           .from("reseller_customers")
//           .select("id, email, first_name, transaction_pin, created_at")
//           .eq("auth_user_id", user.id)
//           .eq("reseller_id", currentReseller.id)
//           .maybeSingle();

//         if (customerError) {
//           console.error("[useProfile] Customer lookup error:", customerError);
//         }

//         if (customer) {
//           console.log("[useProfile] Found customer:", customer);

//           let username = "User";
//           if (customer.first_name && customer.first_name.trim()) {
//             username = customer.first_name.trim();
//             // Clean up - remove everything after +
//             const plusIndex = username.indexOf("+");
//             if (plusIndex > 0) {
//               username = username.substring(0, plusIndex);
//             }
//           } else if (customer.email) {
//             username = customer.email.split("@")[0];
//             const plusIndex = username.indexOf("+");
//             if (plusIndex > 0) {
//               username = username.substring(0, plusIndex);
//             }
//           }

//           console.log("[useProfile] Final username:", username);

//           return {
//             id: customer.id,
//             username: username,
//             email: customer.email,
//             account_type: "customer" as const,
//             transaction_pin: customer.transaction_pin,
//             created_at: customer.created_at,
//           };
//         }
//       }

//       // If we get here, try direct lookup without store filter as last resort
//       console.log(
//         "[useProfile] Trying direct customer lookup by auth_user_id only",
//       );
//       const { data: directCustomer, error: directError } = await supabase
//         .from("reseller_customers")
//         .select(
//           "id, email, first_name, transaction_pin, created_at, reseller_id",
//         )
//         .eq("auth_user_id", user.id)
//         .maybeSingle();

//       if (directError) {
//         console.error("[useProfile] Direct lookup error:", directError);
//       }

//       if (directCustomer) {
//         console.log(
//           "[useProfile] Found customer via direct lookup:",
//           directCustomer,
//         );

//         let username = "User";
//         if (directCustomer.first_name && directCustomer.first_name.trim()) {
//           username = directCustomer.first_name.trim();
//           const plusIndex = username.indexOf("+");
//           if (plusIndex > 0) {
//             username = username.substring(0, plusIndex);
//           }
//         } else if (directCustomer.email) {
//           username = directCustomer.email.split("@")[0];
//           const plusIndex = username.indexOf("+");
//           if (plusIndex > 0) {
//             username = username.substring(0, plusIndex);
//           }
//         }

//         return {
//           id: directCustomer.id,
//           username: username,
//           email: directCustomer.email,
//           account_type: "customer" as const,
//           transaction_pin: directCustomer.transaction_pin,
//           created_at: directCustomer.created_at,
//         };
//       }

//       console.log("[useProfile] No profile found");
//       throw new Error("No profile found");
//     },
//     enabled: !!user?.id,
//     retry: 1,
//   });
// }

// export function useUpdateProfile() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (updates: { username?: string }) => {
//       if (!user?.id) throw new Error("No user");

//       // Reseller
//       const { data: reseller } = await supabase
//         .from("resellers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .maybeSingle();

//       if (reseller) {
//         if (updates.username) {
//           const { data, error } = await supabase
//             .from("resellers")
//             .update({ store_name: updates.username })
//             .eq("id", reseller.id)
//             .select("id, email, store_name, created_at")
//             .single();

//           if (error) throw error;
//           return {
//             ...data,
//             username: data.store_name,
//             account_type: "reseller",
//           };
//         }
//         throw new Error("No valid updates");
//       }

//       // Customer - Update first_name
//       const { data: customer } = await supabase
//         .from("reseller_customers")
//         .select("id")
//         .eq("auth_user_id", user.id)
//         .maybeSingle();

//       if (customer && updates.username) {
//         const { data, error } = await supabase
//           .from("reseller_customers")
//           .update({ first_name: updates.username })
//           .eq("id", customer.id)
//           .select("id, email, first_name, created_at")
//           .single();

//         if (error) throw error;

//         return {
//           id: data.id,
//           username: data.first_name || "Customer",
//           email: data.email,
//           account_type: "customer",
//           created_at: data.created_at,
//         };
//       }

//       throw new Error("No profile found or no updates provided");
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["profile"] });
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
// //   account_type: "reseller" | "customer";
// //   transaction_pin?: string | null;
// //   created_at?: string;
// // }

// // export function useProfile() {
// //   const { user } = useAuthStore();
// //   const storeSlug = useResellerStore.getState().config.storeName;

// //   console.log("[useProfile] Hook called with:", {
// //     userId: user?.id,
// //     storeSlug,
// //   });

// //   return useQuery({
// //     queryKey: ["profile", user?.id, storeSlug],
// //     queryFn: async () => {
// //       console.log("[useProfile] queryFn running...");

// //       if (!user?.id) {
// //         console.log("[useProfile] No user ID");
// //         throw new Error("No user");
// //       }

// //       // 1. Check if Reseller
// //       console.log("[useProfile] Checking if user is a reseller...");
// //       const { data: reseller, error: resellerError } = await supabase
// //         .from("resellers")
// //         .select("id, email, store_name, status, transaction_pin, created_at")
// //         .eq("auth_user_id", user.id)
// //         .eq("status", "active")
// //         .maybeSingle(); // Use maybeSingle to avoid 406 errors

// //       console.log("[useProfile] Reseller check result:", {
// //         found: !!reseller,
// //         error: resellerError?.message,
// //         store_name: reseller?.store_name,
// //       });

// //       if (reseller) {
// //         console.log("[useProfile] User is a reseller:", reseller.store_name);
// //         return {
// //           id: reseller.id,
// //           username: reseller.store_name,
// //           email: reseller.email,
// //           account_type: "reseller" as const,
// //           transaction_pin: reseller.transaction_pin,
// //           created_at: reseller.created_at,
// //         };
// //       }

// //       // 2. Check if Customer
// //       console.log("[useProfile] Checking if user is a customer...");
// //       let customer: any = null;

// //       // Try via store slug first
// //       if (storeSlug) {
// //         console.log(
// //           "[useProfile] Looking up reseller by store slug:",
// //           storeSlug,
// //         );
// //         const { data: currentReseller, error: resellerLookupError } =
// //           await supabase
// //             .from("resellers")
// //             .select("id")
// //             .eq("store_name", storeSlug)
// //             .eq("status", "active")
// //             .maybeSingle();

// //         console.log("[useProfile] Reseller lookup result:", {
// //           found: !!currentReseller,
// //           error: resellerLookupError?.message,
// //           resellerId: currentReseller?.id,
// //         });

// //         if (currentReseller) {
// //           console.log(
// //             "[useProfile] Looking up customer with reseller_id:",
// //             currentReseller.id,
// //           );
// //           const { data, error: customerError } = await supabase
// //             .from("reseller_customers")
// //             .select("id, email, first_name, transaction_pin, created_at")
// //             .eq("auth_user_id", user.id)
// //             .eq("reseller_id", currentReseller.id)
// //             .maybeSingle();

// //           console.log("[useProfile] Customer lookup by store result:", {
// //             found: !!data,
// //             error: customerError?.message,
// //             first_name: data?.first_name,
// //             email: data?.email,
// //           });

// //           if (data) customer = data;
// //         }
// //       }

// //       // Fallback: Direct lookup by auth_user_id (no store slug filter)
// //       if (!customer) {
// //         console.log(
// //           "[useProfile] Fallback: Looking up customer by auth_user_id only",
// //         );
// //         const { data, error: customerError } = await supabase
// //           .from("reseller_customers")
// //           .select("id, email, first_name, transaction_pin, created_at")
// //           .eq("auth_user_id", user.id)
// //           .maybeSingle();

// //         console.log("[useProfile] Fallback customer lookup result:", {
// //           found: !!data,
// //           error: customerError?.message,
// //           first_name: data?.first_name,
// //           email: data?.email,
// //         });

// //         if (data) customer = data;
// //       }

// //       if (customer) {
// //         // Get username from first_name
// //         let username = "User";

// //         if (customer.first_name && customer.first_name.trim()) {
// //           username = customer.first_name.trim();
// //         } else if (customer.email) {
// //           username = customer.email.split("@")[0];
// //         }

// //         // Clean up the username
// //         if (username.includes("+")) {
// //           username = username.split("+")[0];
// //         }

// //         if (username.includes("@")) {
// //           username = username.split("@")[0];
// //         }

// //         console.log("[useProfile] ✅ Customer profile found:", {
// //           id: customer.id,
// //           original_first_name: customer.first_name,
// //           final_username: username,
// //           email: customer.email,
// //         });

// //         return {
// //           id: customer.id,
// //           username: username,
// //           email: customer.email,
// //           account_type: "customer" as const,
// //           transaction_pin: customer.transaction_pin,
// //           created_at: customer.created_at,
// //         };
// //       }

// //       console.log("[useProfile] ❌ No profile found for user:", user.id);
// //       throw new Error("No profile found");
// //     },
// //     enabled: !!user?.id,
// //     retry: 1,
// //   });
// // }

// // export function useUpdateProfile() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async (updates: { username?: string }) => {
// //       if (!user?.id) throw new Error("No user");

// //       // Reseller
// //       const { data: reseller } = await supabase
// //         .from("resellers")
// //         .select("id")
// //         .eq("auth_user_id", user.id)
// //         .maybeSingle();

// //       if (reseller) {
// //         if (updates.username) {
// //           const { data, error } = await supabase
// //             .from("resellers")
// //             .update({ store_name: updates.username })
// //             .eq("id", reseller.id)
// //             .select("id, email, store_name, created_at")
// //             .single();

// //           if (error) throw error;
// //           return {
// //             ...data,
// //             username: data.store_name,
// //             account_type: "reseller",
// //           };
// //         }
// //         throw new Error("No valid updates");
// //       }

// //       // Customer - Update first_name
// //       const { data: customer } = await supabase
// //         .from("reseller_customers")
// //         .select("id")
// //         .eq("auth_user_id", user.id)
// //         .maybeSingle();

// //       if (customer && updates.username) {
// //         const { data, error } = await supabase
// //           .from("reseller_customers")
// //           .update({ first_name: updates.username })
// //           .eq("id", customer.id)
// //           .select("id, email, first_name, created_at")
// //           .single();

// //         if (error) throw error;

// //         return {
// //           id: data.id,
// //           username: data.first_name || "Customer",
// //           email: data.email,
// //           account_type: "customer",
// //           created_at: data.created_at,
// //         };
// //       }

// //       throw new Error("No profile found or no updates provided");
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["profile"] });
// //     },
// //   });
// // }

// // // // hooks/useProfiles.ts

// // // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // // import { supabase } from "@/lib/supabase";
// // // import { useAuthStore } from "@/store/auth.store";
// // // import { useResellerStore } from "@/store/resellerStore";

// // // export interface Profile {
// // //   id: string;
// // //   username: string;
// // //   email: string;
// // //   account_type: "reseller" | "customer";
// // //   transaction_pin?: string | null;
// // //   created_at?: string;
// // // }

// // // export function useProfile() {
// // //   const { user } = useAuthStore();
// // //   const storeSlug = useResellerStore.getState().config.storeName;

// // //   return useQuery({
// // //     queryKey: ["profile", user?.id, storeSlug],
// // //     queryFn: async () => {
// // //       if (!user?.id) throw new Error("No user");

// // //       // 1. Check if Reseller
// // //       const { data: reseller } = await supabase
// // //         .from("resellers")
// // //         .select("id, email, store_name, status, transaction_pin, created_at")
// // //         .eq("auth_user_id", user.id)
// // //         .eq("status", "active")
// // //         .single();

// // //       if (reseller) {
// // //         return {
// // //           id: reseller.id,
// // //           username: reseller.store_name,
// // //           email: reseller.email,
// // //           account_type: "reseller" as const,
// // //           transaction_pin: reseller.transaction_pin,
// // //           created_at: reseller.created_at,
// // //         };
// // //       }

// // //       // 2. Check if Customer
// // //       let customer: any = null;

// // //       // Try via store slug first
// // //       if (storeSlug) {
// // //         const { data: currentReseller } = await supabase
// // //           .from("resellers")
// // //           .select("id")
// // //           .eq("store_name", storeSlug)
// // //           .eq("status", "active")
// // //           .single();

// // //         if (currentReseller) {
// // //           const { data } = await supabase
// // //             .from("reseller_customers")
// // //             .select("id, email, first_name, transaction_pin, created_at")
// // //             .eq("auth_user_id", user.id)
// // //             .eq("reseller_id", currentReseller.id)
// // //             .maybeSingle(); // Use maybeSingle to avoid 406 error

// // //           if (data) customer = data;
// // //         }
// // //       }

// // //       // Fallback: Direct lookup by auth_user_id (no store slug filter)
// // //       if (!customer) {
// // //         const { data } = await supabase
// // //           .from("reseller_customers")
// // //           .select("id, email, first_name, transaction_pin, created_at")
// // //           .eq("auth_user_id", user.id)
// // //           .maybeSingle();

// // //         if (data) customer = data;
// // //       }

// // //       if (customer) {
// // //         // Get username from first_name, fallback to email local part, then "Customer"
// // //         let username = "User";

// // //         if (customer.first_name && customer.first_name.trim()) {
// // //           // Use first_name if available
// // //           username = customer.first_name.trim();
// // //         } else if (customer.email) {
// // //           // Fallback to email username part
// // //           username = customer.email.split("@")[0];
// // //         }

// // //         // Clean up the username - remove any "+" and everything after it
// // //         // Example: "uchebianca.megabliss+devmob2" -> "uchebianca.megabliss"
// // //         if (username.includes("+")) {
// // //           username = username.split("+")[0];
// // //         }

// // //         // Also clean up any email-like patterns
// // //         if (username.includes("@")) {
// // //           username = username.split("@")[0];
// // //         }

// // //         console.log("[useProfile] Customer found:", {
// // //           id: customer.id,
// // //           original_first_name: customer.first_name,
// // //           cleaned_username: username,
// // //           email: customer.email,
// // //         });

// // //         return {
// // //           id: customer.id,
// // //           username: username,
// // //           email: customer.email,
// // //           account_type: "customer" as const,
// // //           transaction_pin: customer.transaction_pin,
// // //           created_at: customer.created_at,
// // //         };
// // //       }

// // //       throw new Error("No profile found");
// // //     },
// // //     enabled: !!user?.id,
// // //     retry: 2,
// // //   });
// // // }

// // // export function useUpdateProfile() {
// // //   const queryClient = useQueryClient();
// // //   const { user } = useAuthStore();

// // //   return useMutation({
// // //     mutationFn: async (updates: { username?: string }) => {
// // //       if (!user?.id) throw new Error("No user");

// // //       // Reseller
// // //       const { data: reseller } = await supabase
// // //         .from("resellers")
// // //         .select("id")
// // //         .eq("auth_user_id", user.id)
// // //         .single();

// // //       if (reseller) {
// // //         if (updates.username) {
// // //           const { data, error } = await supabase
// // //             .from("resellers")
// // //             .update({ store_name: updates.username })
// // //             .eq("id", reseller.id)
// // //             .select("id, email, store_name, created_at")
// // //             .single();

// // //           if (error) throw error;
// // //           return {
// // //             ...data,
// // //             username: data.store_name,
// // //             account_type: "reseller",
// // //           };
// // //         }
// // //         throw new Error("No valid updates");
// // //       }

// // //       // Customer - Update first_name
// // //       const { data: customer } = await supabase
// // //         .from("reseller_customers")
// // //         .select("id")
// // //         .eq("auth_user_id", user.id)
// // //         .maybeSingle();

// // //       if (customer && updates.username) {
// // //         const { data, error } = await supabase
// // //           .from("reseller_customers")
// // //           .update({ first_name: updates.username })
// // //           .eq("id", customer.id)
// // //           .select("id, email, first_name, created_at")
// // //           .single();

// // //         if (error) throw error;

// // //         return {
// // //           id: data.id,
// // //           username: data.first_name || "Customer",
// // //           email: data.email,
// // //           account_type: "customer",
// // //           created_at: data.created_at,
// // //         };
// // //       }

// // //       throw new Error("No profile found or no updates provided");
// // //     },
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ["profile"] });
// // //     },
// // //   });
// // // }

// // // // // hooks/useProfiles.ts

// // // // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // // // import { supabase } from "@/lib/supabase";
// // // // import { useAuthStore } from "@/store/auth.store";
// // // // import { useResellerStore } from "@/store/resellerStore";

// // // // export interface Profile {
// // // //   id: string;
// // // //   username: string;
// // // //   email: string;
// // // //   account_type: "reseller" | "customer";
// // // //   transaction_pin?: string | null;
// // // //   created_at?: string;
// // // // }

// // // // export function useProfile() {
// // // //   const { user } = useAuthStore();
// // // //   const storeSlug = useResellerStore.getState().config.storeName;

// // // //   return useQuery({
// // // //     queryKey: ["profile", user?.id, storeSlug],
// // // //     queryFn: async () => {
// // // //       if (!user?.id) throw new Error("No user");

// // // //       // 1. Check if Reseller
// // // //       const { data: reseller } = await supabase
// // // //         .from("resellers")
// // // //         .select("id, email, store_name, status, transaction_pin, created_at")
// // // //         .eq("auth_user_id", user.id)
// // // //         .eq("status", "active")
// // // //         .single();

// // // //       if (reseller) {
// // // //         return {
// // // //           id: reseller.id,
// // // //           username: reseller.store_name,
// // // //           email: reseller.email,
// // // //           account_type: "reseller" as const,
// // // //           transaction_pin: reseller.transaction_pin,
// // // //           created_at: reseller.created_at,
// // // //         };
// // // //       }

// // // //       // 2. Check if Customer (Improved + Simplified)
// // // //       let customer: any = null;

// // // //       // Try via store slug first
// // // //       if (storeSlug) {
// // // //         const { data: currentReseller } = await supabase
// // // //           .from("resellers")
// // // //           .select("id")
// // // //           .eq("store_name", storeSlug)
// // // //           .eq("status", "active")
// // // //           .single();

// // // //         if (currentReseller) {
// // // //           const { data } = await supabase
// // // //             .from("reseller_customers")
// // // //             .select("id, email, first_name, transaction_pin, created_at")
// // // //             .eq("auth_user_id", user.id)
// // // //             .eq("reseller_id", currentReseller.id)
// // // //             .single();

// // // //           if (data) customer = data;
// // // //         }
// // // //       }

// // // //       // Fallback: Direct lookup by auth_user_id
// // // //       if (!customer) {
// // // //         const { data } = await supabase
// // // //           .from("reseller_customers")
// // // //           .select("id, email, first_name, transaction_pin, created_at")
// // // //           .eq("auth_user_id", user.id)
// // // //           .single();

// // // //         if (data) customer = data;
// // // //       }

// // // //       if (customer) {
// // // //         const displayName =
// // // //           customer.first_name?.trim() ||
// // // //           customer.email?.split("@")[0] ||
// // // //           "Customer";

// // // //         return {
// // // //           id: customer.id,
// // // //           username: displayName,
// // // //           email: customer.email,
// // // //           account_type: "customer" as const,
// // // //           transaction_pin: customer.transaction_pin,
// // // //           created_at: customer.created_at,
// // // //         };
// // // //       }

// // // //       throw new Error("No profile found");
// // // //     },
// // // //     enabled: !!user?.id,
// // // //     retry: 2,
// // // //   });
// // // // }

// // // // export function useUpdateProfile() {
// // // //   const queryClient = useQueryClient();
// // // //   const { user } = useAuthStore();

// // // //   return useMutation({
// // // //     mutationFn: async (updates: { username?: string }) => {
// // // //       if (!user?.id) throw new Error("No user");

// // // //       // Reseller
// // // //       const { data: reseller } = await supabase
// // // //         .from("resellers")
// // // //         .select("id")
// // // //         .eq("auth_user_id", user.id)
// // // //         .single();

// // // //       if (reseller) {
// // // //         if (updates.username) {
// // // //           const { data, error } = await supabase
// // // //             .from("resellers")
// // // //             .update({ store_name: updates.username })
// // // //             .eq("id", reseller.id)
// // // //             .select("id, email, store_name, created_at")
// // // //             .single();

// // // //           if (error) throw error;
// // // //           return {
// // // //             ...data,
// // // //             username: data.store_name,
// // // //             account_type: "reseller",
// // // //           };
// // // //         }
// // // //         throw new Error("No valid updates");
// // // //       }

// // // //       // Customer - Only update first_name
// // // //       const { data: customer } = await supabase
// // // //         .from("reseller_customers")
// // // //         .select("id")
// // // //         .eq("auth_user_id", user.id)
// // // //         .single();

// // // //       if (customer && updates.username) {
// // // //         const { data, error } = await supabase
// // // //           .from("reseller_customers")
// // // //           .update({ first_name: updates.username })
// // // //           .eq("id", customer.id)
// // // //           .select("id, email, first_name, created_at")
// // // //           .single();

// // // //         if (error) throw error;

// // // //         return {
// // // //           id: data.id,
// // // //           username: data.first_name || "Customer",
// // // //           email: data.email,
// // // //           account_type: "customer",
// // // //           created_at: data.created_at,
// // // //         };
// // // //       }

// // // //       throw new Error("No profile found or no updates provided");
// // // //     },
// // // //     onSuccess: () => {
// // // //       queryClient.invalidateQueries({ queryKey: ["profile"] });
// // // //     },
// // // //   });
// // // // }
