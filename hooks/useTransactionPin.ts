// hooks/useTransactionPin.ts
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Clean Transaction PIN Hook
 * - No internal useProfile()
 * - No stale closures
 * - No duplicate queries
 */
export function useTransactionPin() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  /**
   * Validate PIN (pure function)
   */
  const validatePin = (
    enteredPin: string,
    storedPin?: string | null,
  ): boolean => {
    if (!storedPin) return false;
    return enteredPin === storedPin;
  };

  /**
   * Create PIN
   */
  const createPinMutation = useMutation({
    mutationFn: async ({
      newPin,
      profileId,
    }: {
      newPin: string;
      profileId: string;
    }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!profileId) throw new Error("Profile not loaded");

      if (!newPin || newPin.length !== 4) {
        throw new Error("PIN must be exactly 4 digits");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          transaction_pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedProfile, variables) => {
      // Update correct query cache
      queryClient.setQueryData(
        ["profile", variables.profileId],
        updatedProfile,
      );
    },
  });

  /**
   * Update PIN
   */
  const updatePinMutation = useMutation({
    mutationFn: async ({
      oldPin,
      newPin,
      profileId,
      storedPin,
    }: {
      oldPin: string;
      newPin: string;
      profileId: string;
      storedPin?: string | null;
    }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!profileId) throw new Error("Profile not loaded");

      if (!validatePin(oldPin, storedPin)) {
        throw new Error("Current PIN is incorrect");
      }

      if (!newPin || newPin.length !== 4) {
        throw new Error("New PIN must be exactly 4 digits");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          transaction_pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedProfile, variables) => {
      queryClient.setQueryData(
        ["profile", variables.profileId],
        updatedProfile,
      );
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
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useProfile } from "./useProfiles";

// /**
//  * Hook to manage transaction PIN operations
//  * Handles PIN creation, validation, and cache management
//  */
// export function useTransactionPin() {
//   const queryClient = useQueryClient();
//   const { user } = useAuthStore();
//   const { data: profile } = useProfile();

//   /**
//    * Check if user has a transaction PIN set
//    */
//   const hasTransactionPin = !!profile?.transaction_pin;

//   /**
//    * Validate a PIN against the user's stored PIN
//    */
// //   const validatePin = (enteredPin: string): boolean => {
// //     if (!profile?.transaction_pin) {
// //       return false;
// //     }
// //     return enteredPin === profile.transaction_pin;
//     //   };
//     const validatePin = (enteredPin: string, storedPin?: string): boolean => {
//       if (!storedPin) return false;
//       return enteredPin === storedPin;
//     };

//   /**
//    * Create or update transaction PIN
//    * Automatically invalidates and refetches profile cache
//    */
//   const createPinMutation = useMutation({
//     mutationFn: async (newPin: string) => {
//       if (!user?.id) throw new Error("No user authenticated");
//       if (!profile?.id) throw new Error("Profile not loaded");

//       if (!newPin || newPin.length !== 4) {
//         throw new Error("PIN must be exactly 4 digits");
//       }

//       const { data, error } = await supabase
//         .from("profiles")
//         .update({
//           transaction_pin: newPin,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", profile.id)
//         .select()
//         .single();

//       if (error) throw error;
//       return data;
//     },
//     onSuccess: (updatedProfile) => {
//       // Directly update the query cache with the fresh profile data
//       queryClient.setQueryData(["profile", user?.id], updatedProfile);
//       // Invalidate profile cache to ensure fresh data x //  changed to refetch
//       //   queryClient.refetchQueries({ queryKey: ["profile", user?.id] });
//     },
//   });

//   /**
//    * Update/Change existing transaction PIN
//    * Requires old PIN for verification
//    */
//   const updatePinMutation = useMutation({
//     mutationFn: async ({
//       oldPin,
//       newPin,
//     }: {
//       oldPin: string;
//       newPin: string;
//     }) => {
//       if (!user?.id) throw new Error("No user authenticated");
//       if (!profile?.id) throw new Error("Profile not loaded");

//       // Verify old PIN
//       if (!validatePin(oldPin)) {
//         throw new Error("Current PIN is incorrect");
//       }

//       if (!newPin || newPin.length !== 4) {
//         throw new Error("New PIN must be exactly 4 digits");
//       }

//       const { data, error } = await supabase
//         .from("profiles")
//         .update({
//           transaction_pin: newPin,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", profile.id)
//         .select()
//         .single();

//       if (error) throw error;
//       return data;
//     },
//     onSuccess: (updatedProfile) => {
//       // Directly update the query cache with the fresh profile data
//       queryClient.setQueryData(["profile", user?.id], updatedProfile);
//       // Invalidate profile cache to ensure fresh data
//       //   queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
//     },
//   });

//   return {
//     // State
//     hasTransactionPin,
//     currentPin: profile?.transaction_pin || null,

//     // Mutations
//     createPin: createPinMutation.mutateAsync,
//     updatePin: updatePinMutation.mutateAsync,
//     isCreatingPin: createPinMutation.isPending,
//     isUpdatingPin: updatePinMutation.isPending,

//     // Validation
//     validatePin,
//   };
// }
