// scripts/generate-network-prefixes.mjs
//
// Regenerates constants/networkPrefixes.ts from Google's libphonenumber
// carrier data (resources/carrier/en/<dial-code>.txt), which maps a national
// number prefix to the operator that owns it.
//
// Why generate instead of hand-writing: the tables are large (South Africa
// alone has 138 entries) and drift as regulators reassign ranges. The source
// is the same dataset Android's phone stack uses, so it agrees with what a
// device reports.
//
// The app matches on the local, trunk-`0`-less national prefix (e.g. NG `803`),
// so the country dial code is stripped here and detectNetwork() strips a
// leading `0` from what the user types. Carrier names in the source are
// marketing names that drift (`at`, `MTN Cameroon`, `Togocel`) or are
// historical (`Areeba`), so each country has an alias map onto the network
// names the catalog actually uses - the names in constants/countryConfig.ts.
// A carrier with no alias is dropped: the store sells no plans for it, so
// detecting it would only produce an empty list.
//
// Run: node scripts/generate-network-prefixes.mjs

import { writeFileSync } from "node:fs";

const DIAL = {
  bf: 226, bj: 229, cd: 243, cf: 236, cg: 242, ci: 225, cm: 237, eg: 20,
  ga: 241, gh: 233, gn: 224, gq: 240, ke: 254, ma: 212, ml: 223, ne: 227,
  ng: 234, rw: 250, sn: 221, td: 235, tg: 228, ug: 256, za: 27, zm: 260,
};

// libphonenumber carrier name -> countryConfig network name. Only carriers the
// store can actually sell are mapped.
const ALIASES = {
  bf: { Orange: "Orange", "Moov Africa": "Onatel", "Telecel Faso": "Telecel" },
  bj: { MTN: "MTN", Moov: "Moov" },
  cd: { Africell: "Africell", Airtel: "Airtel", Orange: "Orange" },
  cf: { Telecel: "Telecel" },
  cg: { MTN: "MTN" },
  ci: { MTN: "MTN", Moov: "Moov", Orange: "Orange" },
  cm: { Camtel: "Camtel", "MTN Cameroon": "MTN", Orange: "Orange" },
  eg: { Orange: "Orange" },
  ga: { Moov: "Moov" },
  gh: { MTN: "MTN", Telecel: "Telecel", at: "AirtelTigo" },
  gn: { Cellcom: "Cellcom", Orange: "Orange", Areeba: "MTN" },
  gq: { GETESA: "Orange" },
  ke: { Airtel: "Airtel", Safaricom: "Safaricom", Telkom: "KenyaTelkom" },
  ma: { Orange: "Orange" },
  ml: { Orange: "Orange", Sotelma: "Malitel" },
  ne: { Airtel: "Airtel", Moov: "Moov", Orange: "Orange" },
  ng: { MTN: "MTN", Airtel: "Airtel", Glo: "GLO", "9mobile": "9MOBILE" },
  rw: { Airtel: "Airtel", MTN: "MTN" },
  sn: { Orange: "Orange", Expresso: "Expresso", Yas: "YAS" },
  td: { Airtel: "Airtel" },
  tg: { Moov: "Moov", "Togo Telecom": "Togocel" },
  ug: { MTN: "MTN", Airtel: "Airtel", UTL: "Telecom" },
  za: {
    MTN: "MTN",
    Vodacom: "Vodacom",
    "Cell C": "CellC",
    "Telkom Mobile": "TelkomMobile",
  },
  zm: { MTN: "MTN", Airtel: "Airtel", ZAMTEL: "Zamtel" },
};

// Longest prefix the app can ever match: detection reads at most the first
// MAX_DETECT_DIGITS digits, so anything longer is dead weight.
const MAX_PREFIX_DIGITS = 6;

const BASE =
  "https://raw.githubusercontent.com/google/libphonenumber/master/resources/carrier/en";

const tables = {};

for (const [cc, dial] of Object.entries(DIAL)) {
  const res = await fetch(`${BASE}/${dial}.txt`);
  if (!res.ok) throw new Error(`${cc}: HTTP ${res.status}`);
  const text = await res.text();
  const alias = ALIASES[cc] ?? {};
  const byNetwork = {};

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [e164, carrier] = trimmed.split("|");
    const network = alias[(carrier ?? "").trim()];
    if (!network) continue;
    if (!e164.startsWith(String(dial))) {
      throw new Error(`${cc}: ${e164} does not start with ${dial}`);
    }
    const national = e164.slice(String(dial).length);
    if (!national || national.length > MAX_PREFIX_DIGITS) continue;
    (byNetwork[network] ??= new Set()).add(national);
  }

  tables[cc] = Object.fromEntries(
    Object.entries(byNetwork)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([network, prefixes]) => [
        network,
        [...prefixes].sort((a, b) => a.length - b.length || a.localeCompare(b)),
      ]),
  );
}

const header = `// constants/networkPrefixes.ts
//
// GENERATED - do not edit by hand.
// Source: Google libphonenumber carrier data
// (resources/carrier/en/<dial-code>.txt), fetched by
// scripts/generate-network-prefixes.mjs.
//
// Maps a country's local mobile prefixes (national format, no country code and
// no trunk \`0\`) to the network names used by the catalog and
// constants/countryConfig.ts. detectNetwork() strips a leading \`0\` from the
// typed number before matching, so both \`0803...\` and \`803...\` resolve.
//
// A country with no entry has no published carrier data; detectNetwork()
// returns null for it and the caller shows the store's own network list.

export const NETWORK_PREFIXES_BY_COUNTRY: Record<
  string,
  Record<string, string[]>
> = `;

writeFileSync(
  new URL("../constants/networkPrefixes.ts", import.meta.url),
  header + JSON.stringify(tables, null, 2) + ";\n",
);

for (const [cc, nets] of Object.entries(tables)) {
  const summary = Object.entries(nets)
    .map(([n, p]) => `${n}(${p.length})`)
    .join(" ");
  console.log(cc, summary || "(none)");
}
