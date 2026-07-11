// hooks/useTransactionPin.ts

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

// Helper to get user record with table info
async function getUserRecord(userId: string) {
  // Check reseller first
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id, transaction_pin")
    .eq("auth_user_id", userId)
    .single();

  if (reseller) {
    return { 
      table: "resellers", 
      idColumn: "id", 
      id: reseller.id,
      currentPin: reseller.transaction_pin,
      hasUpdatedAt: true // resellers have updated_at
    };
  }

  // Check customer
  const storeSlug = getStoreSlug();
  const { data: resellerStore } = await supabase
    .from("resellers")
    .select("id")
    .eq("store_name", storeSlug)
    .single();

  if (resellerStore) {
    const { data: customer } = await supabase
      .from("reseller_customers")
      .select("id, transaction_pin")
      .eq("auth_user_id", userId)
      .eq("reseller_id", resellerStore.id)
      .single();

    if (customer) {
      return { 
        table: "reseller_customers", 
        idColumn: "id", 
        id: customer.id,
        currentPin: customer.transaction_pin,
        hasUpdatedAt: false // customers do NOT have updated_at
      };
    }
  }

  return null;
}

export function useTransactionPin() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const validatePin = (
    enteredPin: string,
    storedPin?: string | null,
  ): boolean => {
    if (!storedPin) return false;
    return enteredPin === storedPin;
  };

  // FIXED: Create PIN mutation - only update transaction_pin
  const createPinMutation = useMutation({
    mutationFn: async ({ newPin }: { newPin: string; profileId?: string }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!newPin || newPin.length !== 4) {
        throw new Error("PIN must be exactly 4 digits");
      }

      const userRecord = await getUserRecord(user.id);
      if (!userRecord) {
        throw new Error("User not found");
      }

      // CRITICAL FIX: Only update transaction_pin
      // DO NOT include updated_at for customers (table doesn't have it)
      const updateData: any = { 
        transaction_pin: newPin 
      };
      
      // Only add updated_at for resellers (who have the column)
      if (userRecord.hasUpdatedAt) {
        updateData.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from(userRecord.table)
        .update(updateData)
        .eq(userRecord.idColumn, userRecord.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(error.message || "Failed to save PIN");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  // FIXED: Update PIN mutation - only update transaction_pin
  const updatePinMutation = useMutation({
    mutationFn: async ({
      oldPin,
      newPin,
      storedPin,
    }: {
      oldPin: string;
      newPin: string;
      profileId?: string;
      storedPin?: string | null;
    }) => {
      if (!user?.id) throw new Error("No user authenticated");
      
      if (!validatePin(oldPin, storedPin)) {
        throw new Error("Current PIN is incorrect");
      }
      
      if (!newPin || newPin.length !== 4) {
        throw new Error("New PIN must be exactly 4 digits");
      }

      const userRecord = await getUserRecord(user.id);
      if (!userRecord) {
        throw new Error("User not found");
      }

      // Only update transaction_pin
      const updateData: any = { 
        transaction_pin: newPin 
      };
      
      // Only add updated_at for resellers
      if (userRecord.hasUpdatedAt) {
        updateData.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from(userRecord.table)
        .update(updateData)
        .eq(userRecord.idColumn, userRecord.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(error.message || "Failed to update PIN");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return {
    validatePin,
    createPin: createPinMutation.mutateAsync,
    updatePin: updatePinMutation.mutateAsync,
    isCreatingPin: createPinMutation.isPending,
    isUpdatingPin: updatePinMutation.isPending,
  };
}

// // hooks/useTransactionPin.ts

// import { supabase } from "@/lib/supabase";
// import { useAuthStore } from "@/store/auth.store";
// import { useResellerStore } from "@/store/resellerStore";
// import { useMutation, useQueryClient } from "@tanstack/react-query";

// function getStoreSlug(): string {
//   return useResellerStore.getState().config.storeName;
// }

// async function getUserTable(
//   userId: string,
// ): Promise<{ table: string; idColumn: string; id: string } | null> {
//   // Check reseller first
//   const { data: reseller } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("auth_user_id", userId)
//     .single();

//   if (reseller) {
//     return { table: "resellers", idColumn: "id", id: reseller.id };
//   }

//   // Check customer
//   const storeSlug = getStoreSlug();
//   const { data: resellerStore } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", storeSlug)
//     .single();

//   if (resellerStore) {
//     const { data: customer } = await supabase
//       .from("reseller_customers")
//       .select("id")
//       .eq("auth_user_id", userId)
//       .eq("reseller_id", resellerStore.id)
//       .single();

//     if (customer) {
//       return { table: "reseller_customers", idColumn: "id", id: customer.id };
//     }
//   }

//   return null;
// }

// // Helper function to get user record for PIN operations
// async function getUserRecord(userId: string) {
//   // Check reseller
//   const { data: reseller } = await supabase
//     .from("resellers")
//     .select("id, transaction_pin")
//     .eq("auth_user_id", userId)
//     .single();

//   if (reseller) {
//     return { 
//       table: "resellers", 
//       idColumn: "id", 
//       id: reseller.id,
//       currentPin: reseller.transaction_pin,
//       isReseller: true 
//     };
//   }

//   // Check customer
//   const storeSlug = getStoreSlug();
//   const { data: resellerStore } = await supabase
//     .from("resellers")
//     .select("id")
//     .eq("store_name", storeSlug)
//     .single();

//   if (resellerStore) {
//     const { data: customer } = await supabase
//       .from("reseller_customers")
//       .select("id, transaction_pin")
//       .eq("auth_user_id", userId)
//       .eq("reseller_id", resellerStore.id)
//       .single();

//     if (customer) {
//       return { 
//         table: "reseller_customers", 
//         idColumn: "id", 
//         id: customer.id,
//         currentPin: customer.transaction_pin,
//         isReseller: false 
//       };
//     }
//   }

//   return null;
// }

// export function useTransactionPin() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();

//   const validatePin = (
//     enteredPin: string,
//     storedPin?: string | null,
//   ): boolean => {
//     if (!storedPin) return false;
//     return enteredPin === storedPin;
//   };

//   // FIXED: Properly handle PIN creation with the correct fields
//   const createPinMutation = useMutation({
//     mutationFn: async ({ newPin, profileId }: { newPin: string; profileId?: string }) => {
//       if (!user?.id) throw new Error("No user authenticated");
//       if (!newPin || newPin.length !== 4) {
//         throw new Error("PIN must be exactly 4 digits");
//       }

//       // Get user record to determine which table to update
//       const userRecord = await getUserRecord(user.id);
//       if (!userRecord) {
//         throw new Error("User not found. Please contact support.");
//       }

//       // CRITICAL FIX: Use the correct update fields
//       // Only update transaction_pin, NOT updated_at (let the database handle it)
//       const { data, error } = await supabase
//         .from(userRecord.table)
//         .update({ 
//           transaction_pin: newPin
//           // Remove updated_at from here - let the database handle it with a trigger or default
//         })
//         .eq(userRecord.idColumn, userRecord.id)
//         .select()
//         .single();

//       if (error) {
//         console.error("Supabase update error:", error);
//         throw new Error(error.message || "Failed to save PIN");
//       }
      
//       return data;
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
//       // Also invalidate profile queries that might be using storeSlug
//       queryClient.invalidateQueries({ queryKey: ["profile"] });
//     },
//     onError: (error: any) => {
//       console.error("Create PIN error:", error);
//       // Re-throw the error to be caught in the component
//       throw error;
//     },
//   });

//   const updatePinMutation = useMutation({
//     mutationFn: async ({
//       oldPin,
//       newPin,
//       storedPin,
//     }: {
//       oldPin: string;
//       newPin: string;
//       profileId?: string;
//       storedPin?: string | null;
//     }) => {
//       if (!user?.id) throw new Error("No user authenticated");
      
//       if (!validatePin(oldPin, storedPin)) {
//         throw new Error("Current PIN is incorrect");
//       }
      
//       if (!newPin || newPin.length !== 4) {
//         throw new Error("New PIN must be exactly 4 digits");
//       }

//       const userRecord = await getUserRecord(user.id);
//       if (!userRecord) {
//         throw new Error("User not found. Please contact support.");
//       }

//       const { data, error } = await supabase
//         .from(userRecord.table)
//         .update({ 
//           transaction_pin: newPin
//           // Remove updated_at from here - let the database handle it
//         })
//         .eq(userRecord.idColumn, userRecord.id)
//         .select()
//         .single();

//       if (error) {
//         console.error("Supabase update error:", error);
//         throw new Error(error.message || "Failed to update PIN");
//       }
      
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
//       queryClient.invalidateQueries({ queryKey: ["profile"] });
//     },
//   });

//   return {
//     validatePin,
//     createPin: createPinMutation.mutateAsync,
//     updatePin: updatePinMutation.mutateAsync,
//     isCreatingPin: createPinMutation.isPending,
//     isUpdatingPin: updatePinMutation.isPending,
//   };
// }

// // // hooks/useTransactionPin.ts

// // import { supabase } from "@/lib/supabase";
// // import { useAuthStore } from "@/store/auth.store";
// // import { useResellerStore } from "@/store/resellerStore";
// // import { useMutation, useQueryClient } from "@tanstack/react-query";

// // function getStoreSlug(): string {
// //   return useResellerStore.getState().config.storeName;
// // }

// // async function getUserTable(
// //   userId: string,
// // ): Promise<{ table: string; idColumn: string; id: string } | null> {
// //   // Check reseller
// //   const { data: reseller } = await supabase
// //     .from("resellers")
// //     .select("id")
// //     .eq("auth_user_id", userId)
// //     .single();

// //   if (reseller) {
// //     return { table: "resellers", idColumn: "id", id: reseller.id };
// //   }

// //   // Check customer
// //   const storeSlug = getStoreSlug();
// //   const { data: resellerStore } = await supabase
// //     .from("resellers")
// //     .select("id")
// //     .eq("store_name", storeSlug)
// //     .single();

// //   if (resellerStore) {
// //     const { data: customer } = await supabase
// //       .from("reseller_customers")
// //       .select("id")
// //       .eq("auth_user_id", userId)
// //       .eq("reseller_id", resellerStore.id)
// //       .single();

// //     if (customer) {
// //       return { table: "reseller_customers", idColumn: "id", id: customer.id };
// //     }
// //   }

// //   return null;
// // }

// // export function useTransactionPin() {
// //   const queryClient = useQueryClient();
// //   const { user } = useAuthStore();

// //   const validatePin = (
// //     enteredPin: string,
// //     storedPin?: string | null,
// //   ): boolean => {
// //     if (!storedPin) return false;
// //     return enteredPin === storedPin;
// //   };

// //   const createPinMutation = useMutation({
// //     mutationFn: async ({ newPin }: { newPin: string; profileId: string }) => {
// //       if (!user?.id) throw new Error("No user authenticated");
// //       if (!newPin || newPin.length !== 4)
// //         throw new Error("PIN must be exactly 4 digits");

// //       const userRecord = await getUserTable(user.id);
// //       if (!userRecord) throw new Error("User not found");

// //       const { data, error } = await supabase
// //         .from(userRecord.table)
// //         .update({
// //           transaction_pin: newPin,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq(userRecord.idColumn, userRecord.id)
// //         .select()
// //         .single();

// //       if (error) throw error;
// //       return data;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
// //     },
// //   });

// //   const updatePinMutation = useMutation({
// //     mutationFn: async ({
// //       oldPin,
// //       newPin,
// //       storedPin,
// //     }: {
// //       oldPin: string;
// //       newPin: string;
// //       profileId: string;
// //       storedPin?: string | null;
// //     }) => {
// //       if (!user?.id) throw new Error("No user authenticated");
// //       if (!validatePin(oldPin, storedPin))
// //         throw new Error("Current PIN is incorrect");
// //       if (!newPin || newPin.length !== 4)
// //         throw new Error("New PIN must be exactly 4 digits");

// //       const userRecord = await getUserTable(user.id);
// //       if (!userRecord) throw new Error("User not found");

// //       const { data, error } = await supabase
// //         .from(userRecord.table)
// //         .update({
// //           transaction_pin: newPin,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq(userRecord.idColumn, userRecord.id)
// //         .select()
// //         .single();

// //       if (error) throw error;
// //       return data;
// //     },
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
// //     },
// //   });

// //   return {
// //     validatePin,
// //     createPin: createPinMutation.mutateAsync,
// //     updatePin: updatePinMutation.mutateAsync,
// //     isCreatingPin: createPinMutation.isPending,
// //     isUpdatingPin: updatePinMutation.isPending,
// //   };
// // }