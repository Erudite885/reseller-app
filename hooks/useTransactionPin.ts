// hooks/useTransactionPin.ts

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function getStoreSlug(): string {
  return useResellerStore.getState().config.storeName;
}

async function getUserTable(
  userId: string,
): Promise<{ table: string; idColumn: string; id: string } | null> {
  // Check reseller
  const { data: reseller } = await supabase
    .from("resellers")
    .select("id")
    .eq("auth_user_id", userId)
    .single();

  if (reseller) {
    return { table: "resellers", idColumn: "id", id: reseller.id };
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
      .select("id")
      .eq("auth_user_id", userId)
      .eq("reseller_id", resellerStore.id)
      .single();

    if (customer) {
      return { table: "reseller_customers", idColumn: "id", id: customer.id };
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

  const createPinMutation = useMutation({
    mutationFn: async ({ newPin }: { newPin: string; profileId: string }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!newPin || newPin.length !== 4)
        throw new Error("PIN must be exactly 4 digits");

      const userRecord = await getUserTable(user.id);
      if (!userRecord) throw new Error("User not found");

      const { data, error } = await supabase
        .from(userRecord.table)
        .update({
          transaction_pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq(userRecord.idColumn, userRecord.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const updatePinMutation = useMutation({
    mutationFn: async ({
      oldPin,
      newPin,
      storedPin,
    }: {
      oldPin: string;
      newPin: string;
      profileId: string;
      storedPin?: string | null;
    }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!validatePin(oldPin, storedPin))
        throw new Error("Current PIN is incorrect");
      if (!newPin || newPin.length !== 4)
        throw new Error("New PIN must be exactly 4 digits");

      const userRecord = await getUserTable(user.id);
      if (!userRecord) throw new Error("User not found");

      const { data, error } = await supabase
        .from(userRecord.table)
        .update({
          transaction_pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq(userRecord.idColumn, userRecord.id)
        .select()
        .single();

      if (error) throw error;
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