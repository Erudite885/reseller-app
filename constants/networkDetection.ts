// constants/networkDetection.ts
//
// Network detection from a typed phone number, for every country the app
// ships to. Kept free of React Native imports (unlike constants/helpers.ts,
// which requires image assets) so the logic can be exercised directly by
// scripts/verify-network-prefixes.mjs under plain Node.
//
// The prefix tables live in constants/networkPrefixes.ts and are generated
// from Google's libphonenumber data - the same dataset Android's own phone
// stack uses, so detection agrees with what the device reports.
//
// Matching is on the FULL dialed number, trunk prefix included: `0803...` for
// Nigeria, not `803...`. Nothing is stripped, because the trunk is part of
// what the subscriber dials and the providers expect that form; and because
// several countries have no trunk at all (Benin, Cote d'Ivoire, Congo, Gabon)
// where a leading `0` is a significant digit. A number typed without its trunk
// simply does not resolve.

import {
  NATIONAL_TRUNK_BY_COUNTRY,
  NETWORK_PREFIXES_BY_COUNTRY,
} from "./networkPrefixes";

/**
 * Digits the user must type before the network is resolved. Six covers every
 * distinguishing prefix in the table except a handful of seven-digit South
 * African landline ranges; those resolve one digit later, and the buy screen
 * re-runs detection on every keystroke, so they are picked up as the user
 * keeps typing.
 */
export const MIN_DETECT_DIGITS = 6;

/** Prefixes for one country, or null when that country has no table. */
export function getNetworkPrefixes(
  countryCode: string | undefined,
): { [networkKey: string]: string[] } | null {
  return NETWORK_PREFIXES_BY_COUNTRY[(countryCode || "").toLowerCase()] || null;
}

/** The trunk prefix for a country, "" when it has none. */
export function getNationalTrunk(countryCode: string | undefined): string {
  return NATIONAL_TRUNK_BY_COUNTRY[(countryCode || "").toLowerCase()] ?? "";
}

/** Digits only - spaces, dashes, parentheses and a leading `+` are dropped. */
export function digitsOnly(input: string): string {
  return (input || "").replace(/\D/g, "");
}

/**
 * Resolve the network a phone number belongs to. Returns null when the country
 * has no prefix table or nothing matches - the caller then keeps the plans
 * hidden rather than guessing.
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

  const digits = digitsOnly(phoneNumber);
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
 * Whether a typed number is a complete local mobile number for its country.
 *
 * `config` counts the national significant number (without the trunk). When the
 * country has a trunk prefix it is required and removed before measuring, so a
 * Nigerian `0803...` passes while the trunkless `803...` does not - the same
 * "must be full" rule detection follows. The trunk is removed by value rather
 * than by stripping any leading `0`, so a Benin `01 95...` keeps its
 * significant `0`.
 */
export function isValidNationalPhoneNumber(
  input: string,
  config: { minDigits: number; maxDigits: number },
  countryCode?: string,
): boolean {
  let digits = digitsOnly(input);
  const trunk = getNationalTrunk(countryCode);
  if (trunk) {
    if (!digits.startsWith(trunk)) return false;
    digits = digits.slice(trunk.length);
  }
  return digits.length >= config.minDigits && digits.length <= config.maxDigits;
}
