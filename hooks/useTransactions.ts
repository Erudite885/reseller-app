// hooks/useTransactions.ts
//
// Task 8, branch 8.a.ii.zq. The caller's transaction history through the
// global-store-transactions edge function (global_transactions for a
// reseller, global_customer_transactions for a customer). Replaces the legacy
// direct reads of reseller_transactions / reseller_customer_transactions,
// which were Nigeria-only.

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useResellerStore } from "@/store/resellerStore";
import { callStoreFunction } from "@/lib/storeApi";

export interface Transaction {
  id: string;
  type: string;
  service?: string;
  network?: string;
  phone_number?: string;
  amount: number;
  previous_balance?: number;
  new_balance?: number;
  data_plan?: string;
  status: string;
  reference: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/** Map a global_customer_transactions row to the display shape. */
function mapCustomerTxn(txn: any): Transaction {
  const type = txn.type === "purchase" ? "data" : txn.type;
  return {
    id: txn.id,
    type,
    service:
      txn.type === "purchase"
        ? txn.metadata?.plan_name || "Data Bundle"
        : txn.type === "deposit"
          ? "Wallet Funding"
          : txn.type,
    network: txn.metadata?.network || "",
    phone_number: txn.metadata?.phone_number || "",
    amount: txn.amount,
    previous_balance: txn.previous_balance,
    new_balance: txn.new_balance,
    data_plan: txn.metadata?.plan_name || "",
    status: txn.status,
    reference: txn.reference || txn.id,
    description: txn.description,
    metadata: txn.metadata,
    created_at: txn.created_at,
  };
}

function useTransactionsQuery(limit: number, offset: number, queryKey: string) {
  const { user } = useAuthStore();
  const resellerId = useResellerStore.getState().config.resellerId;

  return useQuery({
    queryKey: [queryKey, resellerId, user?.id, limit, offset],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user?.id) throw new Error("No user");

      const data = await callStoreFunction<{ transactions: any[] }>(
        "global-store-transactions",
        { limit, offset },
      );

      return (data.transactions ?? []).map((txn) =>
        txn.previous_balance !== undefined && txn.previous_balance !== null
          ? mapCustomerTxn(txn)
          : ({
              id: txn.id,
              type: txn.type,
              amount: txn.amount,
              status: txn.status,
              reference: txn.reference || txn.id,
              description: txn.description,
              metadata: txn.metadata,
              created_at: txn.created_at,
            } as Transaction),
      );
    },
    enabled: !!user?.id && !!resellerId,
    staleTime: 1000 * 60,
  });
}

export function useTransactions(limit: number = 50, offset: number = 0) {
  return useTransactionsQuery(limit, offset, "transactions");
}

export function useRecentTransactions() {
  return useTransactionsQuery(10, 0, "recent_transactions");
}
