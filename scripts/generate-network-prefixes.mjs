// scripts/generate-network-prefixes.mjs
//
// Regenerates constants/networkPrefixes.ts from Google's libphonenumber data:
//
//   - resources/carrier/en/<dial-code>.txt - national number prefix -> operator
//   - resources/PhoneNumberMetadata.xml    - each country's trunk prefix
//
// Why generate instead of hand-writing: the tables are large (South Africa
// alone has 138 entries) and drift as regulators reassign ranges. The source
// is the same dataset Android's phone stack uses, so it agrees with what a
// device reports.
//
// The tables are keyed on the FULL dialed local number, trunk prefix
// included - a Nigerian `0803`, not `803`. The carrier files give the national
// significant number with the country code stripped but the trunk `0` also
// gone, so the trunk is read back out of the metadata and prepended. That
// matters for two reasons: the providers expect the trunk form (`0803...`),
// and the countries with no trunk at all (Benin, Cote d'Ivoire, Congo, Gabon)
// have numbers that legitimately begin with `0`, so stripping it would break
// them. detectNetwork() therefore does NOT strip anything - it matches the
// typed digits as-is.
//
// Carrier names in the source are marketing names that drift (`at`,
// `MTN Cameroon`, `Togocel`) or are historical (`Areeba`), so each country has
// an alias map onto the network names the catalog actually uses - the names in
// constants/countryConfig.ts. A carrier with no alias is dropped: the store
// sells no plans for it, so detecting it would only produce an empty list.
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

const CARRIER_BASE =
  "https://raw.githubusercontent.com/google/libphonenumber/master/resources/carrier/en";
const METADATA_URL =
  "https://raw.githubusercontent.com/google/libphonenumber/master/resources/PhoneNumberMetadata.xml";

/** Territory id (ISO alpha-2, upper case) for each country we ship to. */
const TERRITORY = Object.fromEntries(
  Object.keys(DIAL).map((cc) => [cc, cc.toUpperCase()]),
);

/**
 * The trunk prefix each country's subscribers dial before the national
 * significant number, read from libphonenumber's metadata. Empty string means
 * the country has no trunk (its numbers start with the significant digits, and
 * for Benin/Cote d'Ivoire/Congo/Gabon that first digit is often `0`).
 *
 * Parsed from the `<territory>` opening tag. The regex requires the attribute
 * to be preceded by a non-letter, otherwise it also matches the tail of
 * `internationalPrefix="..."` - which silently yielded `00` for every country.
 */
function parseTrunkPrefixes(xml) {
  const parsed = {};
  for (const [cc, territory] of Object.entries(TERRITORY)) {
    const tag = xml.match(new RegExp(`<territory id="${territory}"[^>]*>`));
    if (!tag) throw new Error(`${cc}: territory ${territory} not in metadata`);
    const match = tag[0].match(/(?<![a-zA-Z])nationalPrefix="([^"]*)"/);
    parsed[cc] = match ? match[1] : "";
  }
  return parsed;
}

const metadata = await (await fetch(METADATA_URL)).text();
const TRUNKS = parseTrunkPrefixes(metadata);

const tables = {};
const trunks = {};

for (const [cc, dial] of Object.entries(DIAL)) {
  const res = await fetch(`${CARRIER_BASE}/${dial}.txt`);
  if (!res.ok) throw new Error(`${cc}: HTTP ${res.status}`);
  const text = await res.text();
  const alias = ALIASES[cc] ?? {};
  const trunk = TRUNKS[cc] ?? "";
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
    // The carrier file lists the national significant number; put the trunk
    // back so the key is exactly what the subscriber dials.
    const national = trunk + e164.slice(String(dial).length);
    if (!national) continue;
    (byNetwork[network] ??= new Set()).add(national);
  }

  // Two networks must never share a prefix, or detection would be a coin toss.
  const owners = {};
  for (const [network, prefixes] of Object.entries(byNetwork)) {
    for (const prefix of prefixes) {
      if (owners[prefix] && owners[prefix] !== network) {
        throw new Error(
          `${cc}: prefix ${prefix} claimed by ${owners[prefix]} and ${network}`,
        );
      }
      owners[prefix] = network;
    }
  }

  tables[cc] = Object.fromEntries(
    Object.entries(byNetwork)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([network, prefixes]) => [
        network,
        [...prefixes].sort((a, b) => a.length - b.length || a.localeCompare(b)),
      ]),
  );
  trunks[cc] = trunk;
}

const header = `// constants/networkPrefixes.ts
//
// GENERATED - do not edit by hand.
// Source: Google libphonenumber (resources/carrier/en/<dial-code>.txt for the
// prefixes, resources/PhoneNumberMetadata.xml for the trunk prefixes), fetched
// by scripts/generate-network-prefixes.mjs.
//
// Maps a country's local mobile prefixes, in the FULL form the subscriber
// dials - trunk \`0\` included (\`0803\`, not \`803\`) - to the network names used
// by the catalog and constants/countryConfig.ts. detectNetwork() matches the
// typed digits as-is and never strips a leading \`0\`, so a trunkless \`803\`
// does NOT resolve.
//
// A country with no entry has no published carrier data; detectNetwork()
// returns null for it and the caller shows the store's own network list.

/** Trunk prefix per country, "" when the country has none. */
export const NATIONAL_TRUNK_BY_COUNTRY: Record<string, string> = `;

const tablesHeader = `
export const NETWORK_PREFIXES_BY_COUNTRY: Record<
  string,
  Record<string, string[]>
> = `;

writeFileSync(
  new URL("../constants/networkPrefixes.ts", import.meta.url),
  header +
    JSON.stringify(trunks, null, 2) +
    ";\n" +
    tablesHeader +
    JSON.stringify(tables, null, 2) +
    ";\n",
);

for (const [cc, nets] of Object.entries(tables)) {
  const summary = Object.entries(nets)
    .map(([n, p]) => `${n}(${p.length})`)
    .join(" ");
  console.log(
    `${cc} trunk=${JSON.stringify(trunks[cc])} ${summary || "(none)"}`,
  );
}
