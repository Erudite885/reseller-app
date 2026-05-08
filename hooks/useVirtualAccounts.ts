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
 * Generate a unique email for the virtual account per store.
 * alan@gmail.com → alan+soledad1@gmail.com
 * The number suffix ensures uniqueness if they already have an account.
 */
function generateVirtualEmail(baseEmail: string, storeSlug: string): string {
  const [localPart, domain] = baseEmail.split("@");
  // Generate a random 1-digit number for uniqueness
  const suffix = Math.floor(Math.random() * 9) + 1;
  return `${localPart}+${storeSlug}${suffix}@${domain}`;
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
 */
export function useCreateVirtualAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const storeSlug = getStoreSlug();

  return useMutation({
    mutationFn: async (formData: {
      fullName: string;
      phoneNumber: string;
      email: string;
    }) => {
      if (!user?.id) throw new Error("No user");

      const resellerId = await getCurrentResellerId();
      if (!resellerId) throw new Error("Store not found");

      const userType = await getUserType(user.id, resellerId);
      if (!userType) throw new Error("User not found in this store");

      // Generate unique email for this store
      const virtualEmail = generateVirtualEmail(formData.email, storeSlug);

      const table =
        userType.type === "reseller"
          ? "reseller_virtual_accounts"
          : "reseller_customer_virtual_accounts";

      const resellerColumn = "reseller_id";

      // Check if user already has an active virtual account in this store
      const { data: existing } = await supabase
        .from(table)
        .select("id")
        .eq(resellerColumn, resellerId)
        .eq(
          userType.type === "reseller" ? "reseller_id" : "customer_id",
          userType.id,
        )
        .eq("status", "active")
        .limit(1);

      if (existing?.length) {
        throw new Error(
          "You already have an active virtual account in this store",
        );
      }

      // Prepare XixaPay request with generated email and placeholder BVN
      const xixapayPayload = {
        email: virtualEmail,
        name: formData.fullName,
        phoneNumber: formData.phoneNumber,
        bankCode: ["20867"],
        businessId: process.env.EXPO_PUBLIC_XIXAPAY_BUSINESS_ID!,
        accountType: "static",
        id_type: "bvn",
        id_number: "22222222222", // Placeholder BVN
      };

      const xixapayResponse = await fetch(
        "https://api.xixapay.com/api/v1/createVirtualAccount",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_XIXAPAY_SECRET_KEY!}`,
            "api-key": process.env.EXPO_PUBLIC_XIXAPAY_API_KEY!,
          },
          body: JSON.stringify(xixapayPayload),
        },
      );

      const xixapayData = await xixapayResponse.json();

      if (!xixapayResponse.ok || xixapayData.status !== "success") {
        throw new Error(
          xixapayData.message || "Failed to create virtual account",
        );
      }

      const bankAccounts = xixapayData.bankAccounts || [];
      if (bankAccounts.length === 0) {
        throw new Error("No virtual accounts were created");
      }

      // Insert into the correct table
      const accountRecords = bankAccounts.map((bank: any) => ({
        [resellerColumn]: resellerId,
        ...(userType.type === "customer" && { customer_id: userType.id }),
        bank_name: bank.bankName,
        account_number: bank.accountNumber,
        account_name: bank.accountName,
        account_type: bank.accountType || "static",
        tracking_reference: bank.Reserved_Account_Id,
        provider: "xixapay",
        customer_email: virtualEmail,
        customer_name: formData.fullName,
        customer_phone: formData.phoneNumber,
        customer_bvn: "22222222222",
        customer_nin: null,
        status: "active",
      }));

      const { error: insertError } = await supabase
        .from(table)
        .insert(accountRecords);

      if (insertError) throw insertError;

      return {
        success: true,
        message: "Virtual account created successfully!",
        virtualEmail,
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

// /**
//  * Get the current reseller ID from store name
//  */
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

// /**
//  * Check if current user is a reseller or customer
//  */
// async function getUserType(userId: string, resellerId: string) {
//   // Check if reseller
//   const { data: reseller } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("auth_user_id", userId)
//     .eq("id", resellerId)
//     .single();

//   if (reseller) return { type: "reseller" as const, id: reseller.id };

//   // Check if customer
//   const { data: customer } = await supabase
//     .from("reseller_customers")
//     .select("id")
//     .eq("auth_user_id", userId)
//     .eq("reseller_id", resellerId)
//     .single();

//   if (customer) return { type: "customer" as const, id: customer.id };

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

//       // Customer
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
//     mutationFn: async (formData: {
//       fullName: string;
//       phoneNumber: string;
//       bvn?: string;
//       nin?: string;
//       email: string;
//     }) => {
//       if (!user?.id) throw new Error("No user");

//       const resellerId = await getCurrentResellerId();
//       if (!resellerId) throw new Error("Store not found");

//       const userType = await getUserType(user.id, resellerId);
//       if (!userType) throw new Error("User not found in this store");

//       // Determine which table to check
//       const table =
//         userType.type === "reseller"
//           ? "reseller_virtual_accounts"
//           : "reseller_customer_virtual_accounts";

//       const idColumn =
//         userType.type === "reseller" ? "reseller_id" : "customer_id";
//       const resellerColumn =
//         userType.type === "reseller" ? "reseller_id" : "reseller_id";

//       // Check if user already has an active virtual account in this store
//       const { data: existing } = await supabase
//         .from(table)
//         .select("id")
//         .eq(resellerColumn, resellerId)
//         .eq(idColumn, userType.id)
//         .eq("status", "active")
//         .limit(1);

//       if (existing?.length) {
//         throw new Error(
//           "You already have an active virtual account in this store",
//         );
//       }

//       // Prepare XixaPay request
//       const xixapayPayload = {
//         email: formData.email,
//         name: formData.fullName,
//         phoneNumber: formData.phoneNumber,
//         bankCode: ["20867"],
//         businessId: process.env.EXPO_PUBLIC_XIXAPAY_BUSINESS_ID!,
//         accountType: "static",
//         id_type: formData.bvn ? "bvn" : "nin",
//         id_number: formData.bvn || formData.nin,
//       };

//       const xixapayResponse = await fetch(
//         "https://api.xixapay.com/api/v1/createVirtualAccount",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${process.env.EXPO_PUBLIC_XIXAPAY_SECRET_KEY!}`,
//             "api-key": process.env.EXPO_PUBLIC_XIXAPAY_API_KEY!,
//           },
//           body: JSON.stringify(xixapayPayload),
//         },
//       );

//       const xixapayData = await xixapayResponse.json();

//       if (!xixapayResponse.ok || xixapayData.status !== "success") {
//         throw new Error(
//           xixapayData.message || "Failed to create virtual account",
//         );
//       }

//       const bankAccounts = xixapayData.bankAccounts || [];
//       if (bankAccounts.length === 0) {
//         throw new Error("No virtual accounts were created");
//       }

//       // Insert into the correct table
//       const accountRecords = bankAccounts.map((bank: any) => ({
//         [resellerColumn]: resellerId,
//         ...(userType.type === "customer" && { customer_id: userType.id }),
//         bank_name: bank.bankName,
//         account_number: bank.accountNumber,
//         account_name: bank.accountName,
//         account_type: bank.accountType || "static",
//         tracking_reference: bank.Reserved_Account_Id,
//         provider: "xixapay",
//         customer_email: formData.email,
//         customer_name: formData.fullName,
//         customer_phone: formData.phoneNumber,
//         customer_bvn: formData.bvn || null,
//         customer_nin: formData.nin || null,
//         status: "active",
//       }));

//       const { error: insertError } = await supabase
//         .from(table)
//         .insert(accountRecords);

//       if (insertError) throw insertError;

//       return {
//         success: true,
//         message: `${bankAccounts.length} virtual account created successfully!`,
//       };
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ["virtual_accounts", storeSlug, user?.id],
//       });
//     },
//   });
// }

// /**
//  * Check if user has any virtual accounts in this store
//  */
// export function useHasVirtualAccount() {
//   const { data: accounts, isLoading } = useVirtualAccounts();
//   return {
//     hasAccount: (accounts?.length ?? 0) > 0,
//     accountCount: accounts?.length ?? 0,
//     isLoading,
//   };
// }

// // // hooks/useVirtualAccounts.ts
// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";

// // // Virtual Account type definition
// // export interface VirtualAccount {
// //   id: string;
// //   user_id: string;
// //   bank_name: string;
// //   account_number: string;
// //   account_name: string;
// //   provider: string;
// //   status: string;
// //   created_at: string;
// //   updated_at: string;
// // }

// // /**
// //  * Hook to fetch virtual accounts for the current user
// //  */
// // export function useVirtualAccounts() {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["virtual_accounts", user?.id],
// //     queryFn: async () => {
// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("virtual_accounts")
// //         .select("*")
// //         .eq("user_id", user.id)
// //         .eq("status", "active")
// //         .order("created_at", { ascending: false });

// //       if (error) throw error;
// //       return data as VirtualAccount[];
// //     },
// //     enabled: !!user?.id,
// //     staleTime: Infinity, // Virtual accounts rarely change
// //   });
// // }

// // /**
// //  * Hook to create a virtual account
// //  */
// // export function useCreateVirtualAccount() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async (formData: {
// //       fullName: string;
// //       phoneNumber: string;
// //       bvn?: string;
// //       nin?: string;
// //       email: string;
// //     }) => {
// //       console.log('Starting virtual account creation with formData:', formData);

// //       if (!user?.id) throw new Error("No user");

// //       // Check if user already has virtual accounts
// //       const { data: existing, error: checkError } = await supabase
// //         .from("virtual_accounts")
// //         .select("id")
// //         .eq("user_id", user.id)
// //         .limit(1);

// //       if (checkError) {
// //         console.error('Error checking existing accounts:', checkError);
// //         throw checkError;
// //       }

// //       console.log('Existing accounts check:', existing);

// //       if (existing?.length > 0) {
// //         throw new Error("You already have virtual accounts");
// //       }

// //       // Determine id_type and id_number
// //       let id_type: "bvn" | "nin";
// //       let id_number: string;
// //       if (formData.bvn) {
// //         id_type = "bvn";
// //         id_number = formData.bvn;
// //       } else if (formData.nin) {
// //         id_type = "nin";
// //         id_number = formData.nin;
// //       } else {
// //         throw new Error("Either BVN or NIN is required");
// //       }

// //       console.log('ID type:', id_type, 'ID number:', id_number);

// //       // Prepare XixaPay request payload
// //       const xixapayPayload = {
// //         email: formData.email,
// //         name: formData.fullName,
// //         phoneNumber: formData.phoneNumber,
// //         bankCode: ["20867"], // PalmPay
// //         businessId: process.env.EXPO_PUBLIC_XIXAPAY_BUSINESS_ID!,
// //         accountType: "static",
// //         id_type,
// //         id_number,
// //       };

// //       console.log('XixaPay payload:', xixapayPayload);

// //       // Call XixaPay API
// //       const xixapayResponse = await fetch(
// //         "https://api.xixapay.com/api/v1/createVirtualAccount",
// //         {
// //           method: "POST",
// //           headers: {
// //             "Content-Type": "application/json",
// //             Authorization: `Bearer ${process.env.EXPO_PUBLIC_XIXAPAY_SECRET_KEY!}`,
// //             "api-key": process.env.EXPO_PUBLIC_XIXAPAY_API_KEY!,
// //           },
// //           body: JSON.stringify(xixapayPayload),
// //         }
// //       );

// //       console.log('XixaPay response status:', xixapayResponse.status);

// //       const xixapayData = await xixapayResponse.json();

// //       console.log('XixaPay response data:', xixapayData);

// //       if (!xixapayResponse.ok || xixapayData.status !== "success") {
// //         throw new Error(
// //           xixapayData.message || "Failed to create virtual account"
// //         );
// //       }

// //       const bankAccounts = xixapayData.bankAccounts || [];

// //       console.log('Bank accounts received:', bankAccounts);

// //       if (bankAccounts.length === 0) {
// //         throw new Error("No virtual accounts were created");
// //       }

// //       // Store virtual accounts in database
// //       const accountRecords = bankAccounts.map((bank: any) => ({
// //         user_id: user!.id,
// //         bank_name: bank.bankName,
// //         account_number: bank.accountNumber,
// //         account_name: bank.accountName,
// //         account_type: bank.accountType || "static",
// //         tracking_reference: bank.Reserved_Account_Id,
// //         expire_date: null,
// //         provider: "xixapay",
// //         customer_email: formData.email,
// //         customer_name: formData.fullName,
// //         customer_phone: formData.phoneNumber,
// //         customer_bvn: formData.bvn || null,
// //         customer_nin: formData.nin || null,
// //         created_at: new Date().toISOString(),
// //         status: "active",
// //       }));

// //       console.log('Account records to insert:', accountRecords);

// //       const { error: insertError } = await supabase
// //         .from("virtual_accounts")
// //         .insert(accountRecords);

// //       if (insertError) {
// //         console.error('Error inserting accounts:', insertError);
// //         throw insertError;
// //       }

// //       console.log('Accounts inserted successfully');

// //       // Create notification
// //       const { error: notificationError } = await supabase.from("notifications").insert({
// //         user_id: user!.id,
// //         notification_type: "deposit",
// //         message: `Virtual account created successfully! You can now fund your wallet via PalmPay.`,
// //         is_read: false,
// //         metadata: {
// //           accounts_count: bankAccounts.length,
// //           banks: bankAccounts.map((b: any) => b.bankName).join(", "),
// //           provider: "xixapay",
// //         },
// //       });

// //       if (notificationError) {
// //         console.error('Error creating notification:', notificationError);
// //         // Not throwing, as it's non-critical
// //       } else {
// //         console.log('Notification created successfully');
// //       }

// //       // Return RPC-like response for consistency
// //       return {
// //         success: true,
// //         message: `${bankAccounts.length} virtual account created successfully!`,
// //       };
// //     },
// //     onSuccess: () => {
// //       console.log('Mutation success: Invalidating queries');
// //       // Invalidate virtual accounts query to refresh the list
// //       queryClient.invalidateQueries({ queryKey: ["virtual_accounts", user?.id] });
// //     },
// //     onError: (error) => {
// //       console.error('Mutation error:', error);
// //     },
// //   });
// // }

// // /**
// //  * Hook to update virtual account status
// //  */
// // export function useUpdateVirtualAccountStatus() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async ({
// //       accountId,
// //       status,
// //     }: {
// //       accountId: string;
// //       status: "active" | "inactive" | "suspended";
// //     }) => {
// //       console.log('Updating virtual account status:', { accountId, status });

// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("virtual_accounts")
// //         .update({ status })
// //         .eq("id", accountId)
// //         .eq("user_id", user.id)
// //         .select()
// //         .single();

// //       if (error) {
// //         console.error('Update error:', error);
// //         throw error;
// //       }

// //       console.log('Update successful:', data);
// //       return data as VirtualAccount;
// //     },
// //     onSuccess: () => {
// //       console.log('Update mutation success: Invalidating queries');
// //       queryClient.invalidateQueries({ queryKey: ["virtual_accounts", user?.id] });
// //     },
// //     onError: (error) => {
// //       console.error('Update mutation error:', error);
// //     },
// //   });
// // }

// // /**
// //  * Hook to delete a virtual account
// //  */
// // export function useDeleteVirtualAccount() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   return useMutation({
// //     mutationFn: async (accountId: string) => {
// //       console.log('Deleting virtual account:', accountId);

// //       if (!user?.id) throw new Error("No user");

// //       const { error } = await supabase
// //         .from("virtual_accounts")
// //         .delete()
// //         .eq("id", accountId)
// //         .eq("user_id", user.id);

// //       if (error) {
// //         console.error('Delete error:', error);
// //         throw error;
// //       }

// //       console.log('Delete successful');
// //       return { success: true };
// //     },
// //     onSuccess: () => {
// //       console.log('Delete mutation success: Invalidating queries');
// //       queryClient.invalidateQueries({ queryKey: ["virtual_accounts", user?.id] });
// //     },
// //     onError: (error) => {
// //       console.error('Delete mutation error:', error);
// //     },
// //   });
// // }

// // /**
// //  * Hook to get a single virtual account by ID
// //  */
// // export function useVirtualAccount(accountId: string) {
// //   const { user } = useAuthStore();

// //   return useQuery({
// //     queryKey: ["virtual_account", accountId],
// //     queryFn: async () => {
// //       console.log('Fetching single virtual account:', accountId);

// //       if (!user?.id) throw new Error("No user");

// //       const { data, error } = await supabase
// //         .from("virtual_accounts")
// //         .select("*")
// //         .eq("id", accountId)
// //         .eq("user_id", user.id)
// //         .single();

// //       if (error) {
// //         console.error('Fetch single account error:', error);
// //         throw error;
// //       }

// //       console.log('Fetched single account:', data);
// //       return data as VirtualAccount;
// //     },
// //     enabled: !!user?.id && !!accountId,
// //   });
// // }

// // /**
// //  * Check if user has any virtual accounts
// //  */
// // export function useHasVirtualAccount() {
// //   const { data: accounts, isLoading } = useVirtualAccounts();

// //   return {
// //     hasAccount: (accounts?.length ?? 0) > 0,
// //     accountCount: accounts?.length ?? 0,
// //     isLoading,
// //   };
// // }
