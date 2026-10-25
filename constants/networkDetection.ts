// constants/networkDetection.ts
//
// Network detection from a typed phone number, for every country the app
// ships to. Kept free of React Native imports (unlike constants/helpers.ts,
// which requires image assets) so the logic can be exercised directly by
// scripts/verify-network-prefixes.mjs under plain Node.
//
// The prefix tables live in constants/networkPrefixes.ts and are generated
// from Google's libphonenumber carrier data - the same dataset Android's own
// phone stack uses, so detection agrees with what the device reports.

import { NETWORK_PREFIXES_BY_COUNTRY } from "./networkPrefixes";

/**
 * Digits the user must type before the network is resolved. Chosen so that
 * even a country whose longest distinguishing prefix is six digits (South
 * Africa has several) has resolved by the time plans are shown.
 */
export const MIN_DETECT_DIGITS = 6;

/** Prefixes for one country, or null when that country has no table. */
export function getNetworkPrefixes(
  countryCode: string | undefined,
): { [networkKey: string]: string[] } | null {
  return NETWORK_PREFIXES_BY_COUNTRY[(countryCode || "").toLowerCase()] || null;
}

/**
 * The national significant number: digits only, with a leading trunk `0`
 * removed. `0803...` and `803...` normalize to the same value, which is what
 * the prefix tables are keyed on. Mirrors the web storefront's
 * normalizePhoneDigits so both surfaces accept the same input.
 */
export function normalizeNationalDigits(input: string): string {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  return digits;
}

/**
 * Resolve the network a phone number belongs to. Returns null when the
 * country has no prefix table or nothing matches - the caller then keeps the
 * plans hidden rather than guessing.
 *
 * Longest prefix wins, so a six-digit range beats the shorter range it is
 * nested inside (South Africa publishes both).
 */
export function detectNetwork(
  phoneNumber: string,
  countryCode: string | undefined,
): string | null {
  const prefixes = getNetworkPrefixes(countryCode);
  if (!prefixes) return null;

  const digits = normalizeNationalDigits(phoneNumber);
  if (!digits) return null;

  let best: { network: string; length: number } | null = null;
  for (const [network, list] of Object.entries(prefixes)) {
    for (const prefix of list) {
      if (digits.length >= prefix.length && digits.startsWith(prefix)) {
        if (!best || prefix.length > best.length) {
          best = { network, length: prefix.length };
        }
      }
    }
  }

  // Uppercased to match the catalog's network values, which the plan filter
  // compares case-insensitively against.
  return best ? best.network.toUpperCase() : null;
}

/**
 * Whether a typed number is a complete local mobile number for its country,
 * counting the national significant number (so a Nigerian `0803...` and its
 * `803...` form both pass).
 */
export function isValidNationalPhoneNumber(
  input: string,
  config: { minDigits: number; maxDigits: number },
): boolean {
  const digits = normalizeNationalDigits(input);
  return digits.length >= config.minDigits && digits.length <= config.maxDigits;
}
