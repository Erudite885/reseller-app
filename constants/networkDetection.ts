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
 * National digits for a country, from any form the customer may type.
 *
 * The customer may know the number as "+2348036076543", "2348036076543",
 * "08036076543" or "8036076543"; all four must reduce to the same national
 * digits ("8036076543") - the form the provider and the purchase expect. A
 * leading trunk `0` and a dial code already on the front are removed, and a
 * leading `0` is never kept, so the same input resolves identically for the
 * store's country and for a cross-border destination.
 *
 * Mirrors the web's `_shared/phone/normalize.ts` `toNationalDigits`, so the two
 * clients send the provider the same subscriber.
 */
export function toNationalDigits(input: string, dialCode: string): string {
  const dial = (dialCode || "").replace(/\D/g, "");
  const raw = (input || "").trim();
  const digits = digitsOnly(raw);
  if (raw.startsWith("+") || raw.startsWith("00")) {
    const stripped = raw.startsWith("00") ? digits.slice(2) : digits;
    return dial && stripped.startsWith(dial)
      ? stripped.slice(dial.length)
      : stripped;
  }
  if (dial && !digits.startsWith("0") && digits.startsWith(dial)) {
    return digits.slice(dial.length);
  }
  return digits.replace(/^0+/, "");
}

/**
 * The country-coded MSISDN ("250788123456") a mobile-money gateway expects,
 * from any form the payer may type: "+250788123456", "00250788123456",
 * "250788123456", "0788123456" or "788123456". Returns "" when there is
 * nothing to normalise.
 *
 * Flutterwave's `mobilemoney.phone` is a full international number, not the
 * local form - which is why the web storefront asks for the country code. The
 * app instead accepts either form and adds the dial code itself, so a payer
 * who types their familiar local number is not rejected.
 */
export function toMsisdn(input: string, dialCode: string): string {
  const dial = (dialCode || "").replace(/\D/g, "");
  const national = toNationalDigits(input, dialCode);
  if (!national) return "";
  return dial ? dial + national : national;
}

/**
 * Whether a typed number is a complete mobile number for the country whose
 * dial code and digit bounds are supplied. Used for a cross-border destination
 * as well as the store's own country, so a Rwandan store selling a Ugandan
 * bundle accepts a 9-digit UG number.
 */
export function isValidDestinationPhone(
  input: string,
  dialCode: string,
  config: { minDigits: number; maxDigits: number },
): boolean {
  const national = toNationalDigits(input, dialCode);
  return (
    national.length >= config.minDigits && national.length <= config.maxDigits
  );
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
