// hooks/useTransactionPin.ts
//
// Task 8, branch 8.a.ii.zq. Transaction-PIN set/change via the
// global-store-pin edge function. The stored PIN is never sent to the
// client: the profile exposes only `has_transaction_pin`, and the function
// verifies the current PIN server-side. The client-side validatePin helper
// is therefore no longer a security check - callers must use the
// server-verified changePin for changes (see the security screen).

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { callStoreFunction } from "@/lib/storeApi";

export function useTransactionPin() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const setPinMutation = useMutation({
    mutationFn: async ({ newPin }: { newPin: string }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!/^\d{4}$/.test(newPin)) throw new Error("PIN must be exactly 4 digits");
      await callStoreFunction("global-store-pin", { action: "set", newPin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  const changePinMutation = useMutation({
    mutationFn: async ({ oldPin, newPin }: { oldPin: string; newPin: string }) => {
      if (!user?.id) throw new Error("No user authenticated");
      if (!/^\d{4}$/.test(newPin)) {
        throw new Error("New PIN must be exactly 4 digits");
      }
      await callStoreFunction("global-store-pin", {
        action: "change",
        oldPin,
        newPin,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return {
    createPin: setPinMutation.mutateAsync,
    updatePin: changePinMutation.mutateAsync,
    isCreatingPin: setPinMutation.isPending,
    isUpdatingPin: changePinMutation.isPending,
  };
}
