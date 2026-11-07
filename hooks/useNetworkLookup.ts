// hooks/useNetworkLookup.ts
//
// Cross-border phone-number detection for the mobile app.
//
// The web storefront reads a number's country from the number itself (via the
// `global-network-lookup` edge function), so a store can sell a destination it
// never enabled. The app previously detected only the store's own country from
// a local prefix table, so a Rwandan customer could never buy for a Ugandan
// number. This calls the same deployed function, so the two clients agree on
// which country a number belongs to.
//
// The function is deliberately anonymous (verify_jwt=false), so it is called
// with the publishable key and needs no signed-in session. `countryHint` (the
// store's country) and `preferred` (the countries the store sells) only break
// ties for an ambiguous local number; the number's own country wins when its
// form is unambiguous.

import { supabase } from "@/lib/supabase";
import { detectNetwork } from "@/constants/networkDetection";

export interface NetworkDetection {
  /** Lowercase ISO-3166 alpha-2, or "" when the number cannot be placed. */
  country: string;
  brand: string;
  /** The carrier the number resolves to, or null. */
  network: string | null;
  /** "lookup" (provider), "prefix" (local fallback) or "unknown". */
  method: "lookup" | "prefix" | "unknown";
  /** True when the answer came from the local fallback, not the provider. */
  fallback: boolean;
}

/**
 * Resolve the carrier/country for a phone number through the shared edge
 * function. Returns null when the number is too short or the lookup could not
 * run, so the caller can keep the plans hidden rather than guess.
 *
 * On a transport failure the local prefix table is used for the store's own
 * country only (that is the one country the table can place a number on), so a
 * local customer is not blocked by a dropped connection. A cross-border number
 * needs the function.
 */
export async function lookupNetwork(
  phoneNumber: string,
  countryHint?: string,
  preferred?: string[],
): Promise<NetworkDetection | null> {
  const trimmed = (phoneNumber || "").replace(/\s/g, "");
  if (trimmed.replace(/\D/g, "").length < 6) return null;

  try {
    const { data, error } = await supabase.functions.invoke(
      "global-network-lookup",
      {
        body: {
          phoneNumber: trimmed,
          country: countryHint || undefined,
          preferred: preferred && preferred.length ? preferred : undefined,
        },
      },
    );

    if (error) throw error;
    if (!data || typeof data.country !== "string") return null;

    return {
      country: data.country,
      brand: data.brand ?? "",
      network: data.network ?? null,
      method: data.method ?? "unknown",
      fallback: Boolean(data.fallback),
    };
  } catch {
    // Offline / function unavailable: the local prefix table can still place a
    // number on the store's own country.
    const hint = (countryHint || "").toLowerCase();
    const network = hint ? detectNetwork(trimmed, hint) : null;
    if (!network) return null;
    return {
      country: hint,
      brand: network,
      network,
      method: "prefix",
      fallback: true,
    };
  }
}
