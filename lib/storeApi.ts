// lib/storeApi.ts
//
// Task 8, branch 8.a.ii. Thin wrapper around supabase.functions.invoke for
// the global-store-* edge functions. The functions derive identity from the
// caller's JWT and take resellerId as a routing hint only, so every call
// needs the current session's access token and the build's resellerId.

import { supabase } from "@/lib/supabase";
import { useResellerStore } from "@/store/resellerStore";

export function getResellerId(): string | undefined {
  return useResellerStore.getState().config.resellerId;
}

/**
 * Invoke a global-store-* function with the caller's JWT and this build's
 * resellerId merged into the body. Throws on transport or function error.
 */
export async function callStoreFunction<T = any>(
  name: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const resellerId = getResellerId();
  if (!resellerId) throw new Error("Store is not configured (missing resellerId)");

  const { data, error } = await supabase.functions.invoke(name, {
    body: { resellerId, ...body },
  });

  if (error) {
    // supabase-js wraps a non-2xx function response in error; surface the
    // function's own message when it is present.
    let message = error.message || "Request failed";
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) message = payload.error;
      }
    } catch {
      // keep the transport message
    }
    throw new Error(message);
  }

  return data as T;
}
