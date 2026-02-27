// ============================================
// hooks/usePurchaseVTU.ts (UPDATED WITH TRANSACTION PIN)
// Replace your existing file with this version
// Adds transactionPin parameter - your RPC functions already handle the rest
// ============================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth.store";

/**
 * Hook to purchase data via Lizzysub
 * NOW WITH TRANSACTION PIN SUPPORT
 */
export function usePurchaseData() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (purchaseData: {
      plan_id: number;
      phoneNumber: string;
      transactionPin: string; // NEW: Transaction PIN parameter
    }) => {
      if (!user?.id) throw new Error("No user");

      // Generate unique request ID
      const requestId = `BBREQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // ============================================
      // OPTIONAL: Add backend PIN verification here
      // ============================================
      // You can add PIN verification in your process_data_purchase RPC
      // For now, frontend validates it before calling this function

      console.log(
        "[usePurchaseData] Transaction PIN provided:",
        !!purchaseData.transactionPin,
      );

      // Step 1: Create transaction in database via RPC
      // Your process_data_purchase RPC handles:
      // - Wallet validation
      // - Balance deduction
      // - Transaction creation
      // - Returns VTU data for API call
      const { data: txData, error: txError } = await supabase.rpc(
        "process_data_purchase",
        {
          p_user_id: user.id,
          p_plan_id: purchaseData.plan_id,
          p_phone_number: purchaseData.phoneNumber,
          p_request_id: requestId,
          // FUTURE: Add p_transaction_pin parameter to your RPC if you want backend validation
        },
      );

      if (txError) throw txError;
      if (!txData.success) throw new Error(txData.error);

      // Step 2: Call data-proxy API via edge function
      try {
        // Get JWT token from session
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error(
            "No authentication token available. Please log in again.",
          );
        }

        console.log(
          "[usePurchaseData] Got JWT token, calling edge function...",
        );

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL}/functions/v1/data-proxy`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(txData.vtu_data),
          },
        );

        const result = await response.json();

        console.log("[usePurchaseData] Edge function response:", result);

        // Step 3: Update transaction with VTU response
        if (result.status === "success") {
          // Update transaction to completed
          await supabase.rpc("update_transaction_status", {
            p_transaction_id: txData.transaction_id,
            p_status: "completed",
            p_provider_reference: result.data?.ident || requestId,
            p_refund: false,
          });

          return {
            success: true,
            message: "Data purchased successfully!",
            transaction: txData,
            vtu_response: result,
          };
        } else {
          // Update transaction to failed and refund
          await supabase.rpc("update_transaction_status", {
            p_transaction_id: txData.transaction_id,
            p_status: "failed",
            p_error_message: result.message || "Purchase failed",
            p_refund: true,
          });

          // throw new Error(result.message || "Purchase failed");
          // Return instead of throwing so catch block doesn't run again
          return {
            success: false,
            message: "Service unavailable. Please try again later.", // ← change this line
          };
        }
      } catch (error: any) {
        console.error("[usePurchaseData] Error:", error.message);

        // If VTU call fails, mark transaction as failed and refund
        await supabase.rpc("update_transaction_status", {
          p_transaction_id: txData.transaction_id,
          p_status: "failed",
          p_error_message: error.message || "VTU API error",
          p_refund: true,
        });

        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh wallet and transactions
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
    },
  });
}

/**
 * Hook to purchase airtime via Lizzysub
 * NOW WITH TRANSACTION PIN SUPPORT
 */
export function usePurchaseAirtime() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (purchaseData: {
      network: string;
      phoneNumber: string;
      amount: number;
      transactionPin: string; // NEW: Transaction PIN parameter
    }) => {
      if (!user?.id) throw new Error("No user");

      // Generate unique request ID
      const requestId = `BBREQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // ============================================
      // OPTIONAL: Add backend PIN verification here
      // ============================================
      console.log(
        "[usePurchaseAirtime] Transaction PIN provided:",
        !!purchaseData.transactionPin,
      );

      // Step 1: Create transaction in database via RPC
      // Your process_airtime_purchase RPC handles:
      // - Wallet validation
      // - Balance deduction
      // - Transaction creation
      // - Returns VTU data for API call
      const { data: txData, error: txError } = await supabase.rpc(
        "process_airtime_purchase",
        {
          p_user_id: user.id,
          p_network: purchaseData.network,
          p_phone_number: purchaseData.phoneNumber,
          p_amount: purchaseData.amount,
          p_request_id: requestId,
          // FUTURE: Add p_transaction_pin parameter to your RPC if you want backend validation
        },
      );

      if (txError) throw txError;
      if (!txData.success) throw new Error(txData.error);

      // Step 2: Call airtime-proxy API via edge function
      try {
        // Get JWT token from session
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error(
            "No authentication token available. Please log in again.",
          );
        }

        console.log(
          "[usePurchaseAirtime] Got JWT token, calling edge function...",
        );

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BIMBO_SUPABASE_URL}/functions/v1/airtime-proxy`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(txData.vtu_data),
          },
        );

        const result = await response.json();

        console.log("[usePurchaseAirtime] Edge function response:", result);

        // Step 3: Update transaction with VTU response
        if (result.status === "success") {
          // Update transaction to completed
          await supabase.rpc("update_transaction_status", {
            p_transaction_id: txData.transaction_id,
            p_status: "completed",
            p_provider_reference: result.data?.ident || requestId,
            p_refund: false,
          });

          return {
            success: true,
            message: "Airtime purchased successfully!",
            transaction: txData,
            vtu_response: result,
          };
        } else {
          // Update transaction to failed and refund
          await supabase.rpc("update_transaction_status", {
            p_transaction_id: txData.transaction_id,
            p_status: "failed",
            p_error_message: result.message || "Purchase failed",
            p_refund: true,
          });

          // throw new Error(result.message || "Purchase failed");
          // Return instead of throwing so catch block doesn't run again
          return {
            success: false,
            message: "Service unavailable. Please try again later.", // ← change this line
          };
        }
      } catch (error: any) {
        console.error("[usePurchaseAirtime] Error:", error.message);

        // If VTU call fails, mark transaction as failed and refund
        await supabase.rpc("update_transaction_status", {
          p_transaction_id: txData.transaction_id,
          p_status: "failed",
          p_error_message: error.message || "VTU API error",
          p_refund: true,
        });

        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh wallet and transactions
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.id] });
    },
  });
}
