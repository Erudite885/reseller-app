import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";

export interface Wallet {
  id: string;
  balance: number;
  total_sales: number;
  total_profit: number;
}

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

/**
 * Hook to fetch wallet for a customer under a specific reseller
 * The wallet is scoped to the reseller's store
 */
export function useWallet() {
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useQuery({
    queryKey: ["wallet", storeSlug, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No user");

      // Get reseller ID from store name
      const { data: reseller } = await supabase
        .from("resellers")
        .select("id")
        .eq("store_name", storeSlug)
        .eq("status", "active")
        .single();

      if (!reseller) throw new Error("Store not found");

      // Get customer wallet for this reseller
      const { data: customerWallet, error } = await supabase
        .from("reseller_customer_wallets")
        .select("id, balance, total_spent")
        .eq("reseller_id", reseller.id)
        .eq("customer_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // If no wallet exists yet, return zero balance
      if (!customerWallet) {
        return {
          id: "",
          balance: 0,
          total_sales: 0,
          total_profit: 0,
        } as Wallet;
      }

      return {
        id: customerWallet.id,
        balance: customerWallet.balance,
        total_sales: customerWallet.total_spent || 0,
        total_profit: 0,
      } as Wallet;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30,
    refetchInterval: 60000,
  });
}

// // hooks/useWallet.ts
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";

// // Wallet type definition
// export interface Wallet {
//   id: string;
//   user_id: string;
//   balance: number;
//   currency: string;
//   created_at: string;
//   updated_at: string;
// }

// /**
//  * Hook to fetch wallet data for the current user
//  */
// export function useWallet() {
//   const { user } = useAuthStore();

//   return useQuery({
//     queryKey: ["wallet", user?.id],
//     queryFn: async () => {
//       if (!user?.id) throw new Error("No user");

//       const { data, error } = await supabase
//         .from("wallets")
//         .select("*")
//         .eq("user_id", user.id)
//         .single();

//       if (error) throw error;
//       return data as Wallet;
//     },
//     enabled: !!user?.id,
//     staleTime: 1000 * 30, // Consider data fresh for 30 seconds
//     refetchInterval: 60000, // Auto-refetch every 60 seconds
//   });
// }

// /**
//  * Hook to fund wallet (add money)
//  */
// export function useFundWallet() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (amount: number) => {
//       if (!user?.id) throw new Error("No user");
//       if (amount <= 0) throw new Error("Amount must be greater than 0");

//       // Get current wallet balance
//       const { data: wallet, error: fetchError } = await supabase
//         .from("wallets")
//         .select("balance")
//         .eq("user_id", user.id)
//         .single();

//       if (fetchError) throw fetchError;

//       // Update wallet with new balance
//       const newBalance = Number(wallet.balance) + amount;

//       const { data, error } = await supabase
//         .from("wallets")
//         .update({ balance: newBalance })
//         .eq("user_id", user.id)
//         .select()
//         .single();

//       if (error) throw error;
//       return data as Wallet;
//     },
//     onSuccess: () => {
//       // Invalidate wallet query to refresh the balance
//       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
//     },
//   });
// }

// /**
//  * Hook to deduct from wallet (for purchases)
//  */
// export function useDeductWallet() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (amount: number) => {
//       if (!user?.id) throw new Error("No user");
//       if (amount <= 0) throw new Error("Amount must be greater than 0");

//       // Get current wallet balance
//       const { data: wallet, error: fetchError } = await supabase
//         .from("wallets")
//         .select("balance")
//         .eq("user_id", user.id)
//         .single();

//       if (fetchError) throw fetchError;

//       const currentBalance = Number(wallet.balance);

//       // Check if user has sufficient balance
//       if (currentBalance < amount) {
//         throw new Error("Insufficient wallet balance");
//       }

//       // Deduct amount from wallet
//       const newBalance = currentBalance - amount;

//       const { data, error } = await supabase
//         .from("wallets")
//         .update({ balance: newBalance })
//         .eq("user_id", user.id)
//         .select()
//         .single();

//       if (error) throw error;
//       return data as Wallet;
//     },
//     onSuccess: () => {
//       // Invalidate wallet query to refresh the balance
//       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
//     },
//   });
// }

// /**
//  * Hook to set wallet balance directly (admin/testing purposes)
//  */
// export function useSetWalletBalance() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   return useMutation({
//     mutationFn: async (newBalance: number) => {
//       if (!user?.id) throw new Error("No user");
//       if (newBalance < 0) throw new Error("Balance cannot be negative");

//       const { data, error } = await supabase
//         .from("wallets")
//         .update({ balance: newBalance })
//         .eq("user_id", user.id)
//         .select()
//         .single();

//       if (error) throw error;
//       return data as Wallet;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
//     },
//   });
// }

// // // hooks/useWallet.ts
// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";

// // export function useWallet() {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["wallet", user?.id],
// //     queryFn: async () => {
// //       const { data, error } = await supabase
// //         .from("wallets")
// //         .select("*")
// //         .eq("user_id", user?.id)
// //         .single();

// //       if (error) throw error;
// //       return data;
// //     },
// //     enabled: !!user?.id,
// //     // refetchInterval: 30000, // Refetch every 30 seconds
// //   });
// // }
