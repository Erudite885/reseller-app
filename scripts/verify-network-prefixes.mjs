// scripts/verify-network-prefixes.mjs
//
// Checks the generated prefix tables in constants/networkPrefixes.ts.
//
//   node scripts/generate-network-prefixes.mjs
//   node scripts/verify-network-prefixes.mjs
//
// Compiles the detection module with tsc first, since it is TypeScript.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "netprefix-"));
let failures = 0;

const check = (label, got, want) => {
  const norm = (v) => (v == null ? null : String(v).toUpperCase());
  const ok = norm(got) === norm(want);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} = ${got} (want ${want})`);
};

/** A full-length number starting with `prefix`, for detection at any depth. */
const fullNumber = (prefix) => (prefix + "000000000000").slice(0, 12);

try {
  execFileSync(
    "npx",
    [
      "tsc",
      "constants/networkDetection.ts",
      "constants/networkPrefixes.ts",
      "--outDir",
      out,
      "--module",
      "esnext",
      "--target",
      "es2022",
      "--moduleResolution",
      "bundler",
    ],
    { stdio: "inherit" },
  );

  const entry = join(out, "networkDetection.js");
  writeFileSync(
    entry,
    readFileSync(entry, "utf8").replace(
      'from "./networkPrefixes"',
      'from "./networkPrefixes.js"',
    ),
  );

  const { detectNetwork, isValidNationalPhoneNumber, MIN_DETECT_DIGITS } =
    await import(entry);
  const { NETWORK_PREFIXES_BY_COUNTRY } = await import(
    join(out, "networkPrefixes.js")
  );

  // --- Explicit cases. The full dialed form resolves; the trunkless form does
  //     not, for countries that have a trunk. ---
  const cases = [
    // Nigeria (trunk `0` required).
    ["0803", "ng", "MTN"], ["08036012345", "ng", "MTN"], ["0903", "ng", "MTN"],
    ["0805", "ng", "GLO"], ["0802", "ng", "AIRTEL"], ["0809", "ng", "9MOBILE"],
    ["8036012345", "ng", null], ["803", "ng", null],
    // Ghana (trunk `0`).
    ["024", "gh", "MTN"], ["020", "gh", "Telecel"], ["023", "gh", "AirtelTigo"],
    ["244123456", "gh", null],
    // Kenya (trunk `0`).
    ["0722", "ke", "Safaricom"], ["0733", "ke", "Airtel"], ["077", "ke", "KenyaTelkom"],
    // South Africa (trunk `0`). Longest prefix wins, so a 4-digit MTN range
    // beats the 3-digit range it sits inside.
    ["082", "za", "Vodacom"], ["083", "za", "MTN"], ["084", "za", "CellC"],
    ["019", "za", "TelkomMobile"], ["081", "za", null],
    ["0690", "za", "MTN"], ["0710", "za", "MTN"],
    // No trunk, and the leading `0` is a significant digit - it must NOT be
    // stripped. These are the countries the old strip-a-leading-`0` code broke.
    ["0145", "bj", "Moov"], ["0155", "bj", "Moov"], ["0142", "bj", "MTN"],
    ["0150", "bj", "MTN"],
    ["01", "ci", "Moov"], ["05", "ci", "MTN"], ["07", "ci", "Orange"],
    ["06", "cg", "MTN"],
    ["05000000", "ga", "Moov"],
    // No trunk, numbers start with a significant digit.
    ["67", "cm", "MTN"], ["69", "cm", "Orange"], ["62", "cm", "Camtel"],
    ["067", "cm", null],
    // Zambia / Uganda (trunk `0`).
    ["096", "zm", "MTN"], ["097", "zm", "Airtel"], ["095", "zm", "Zamtel"],
    ["077", "ug", "MTN"], ["075", "ug", "Airtel"], ["071", "ug", "Telecom"],
    // The trunkless form must NOT resolve in any trunk country.
    ["96", "zm", null], ["97", "zm", null],
    ["77", "ug", null], ["75", "ug", null], ["71", "ug", null],
    ["82", "za", null], ["83", "za", null],
    ["722", "ke", null], ["733", "ke", null],
    // Too short / unknown / unmapped.
    ["080", "ng", null], ["", "ng", null],
    ["0803", "xx", null], ["0803", undefined, null],
  ];
  for (const [input, cc, want] of cases) {
    check(`detect(${JSON.stringify(input)}, ${cc})`, detectNetwork(input, cc), want);
  }

  // --- Length validation removes the country's own trunk, not any leading 0.
  //     For a trunk country the trunk is required, so the trunkless form fails.
  const lengthCases = [
    ["08036012345", { minDigits: 10, maxDigits: 10 }, "ng", true],
    ["0803601234", { minDigits: 10, maxDigits: 10 }, "ng", false],
    ["8036012345", { minDigits: 10, maxDigits: 10 }, "ng", false],
    ["0195123456", { minDigits: 10, maxDigits: 10 }, "bj", true],
    ["019512345", { minDigits: 10, maxDigits: 10 }, "bj", false],
    ["0231234567", { minDigits: 9, maxDigits: 9 }, "gh", true],
    ["231234567", { minDigits: 9, maxDigits: 9 }, "gh", false],
    ["023123456", { minDigits: 9, maxDigits: 9 }, "gh", false],
    ["0712123456", { minDigits: 9, maxDigits: 9 }, "ke", true],
    ["712123456", { minDigits: 9, maxDigits: 9 }, "ke", false],
  ];
  for (const [input, cfg, cc, want] of lengthCases) {
    check(
      `valid(${JSON.stringify(input)}, ${cc})`,
      isValidNationalPhoneNumber(input, cfg, cc),
      want,
    );
  }

  // --- Invariant: typing any published prefix in full resolves to a network.
  let orphan = 0;
  let prefixCount = 0;
  for (const [cc, nets] of Object.entries(NETWORK_PREFIXES_BY_COUNTRY)) {
    for (const prefixes of Object.values(nets)) {
      for (const prefix of prefixes) {
        prefixCount++;
        if (!detectNetwork(fullNumber(prefix), cc)) orphan++;
      }
    }
  }
  check(`all ${prefixCount} published prefixes resolve once typed in full`, orphan, 0);

  // --- Invariant: every network in the table is reachable - at least one of its
  //     prefixes resolves to it (none is entirely shadowed by a longer range).
  let unreachable = 0;
  for (const [cc, nets] of Object.entries(NETWORK_PREFIXES_BY_COUNTRY)) {
    for (const [network, prefixes] of Object.entries(nets)) {
      const reachable = prefixes.some(
        (p) => detectNetwork(fullNumber(p), cc) === network.toUpperCase(),
      );
      if (!reachable) {
        unreachable++;
        console.log(`FAIL ${cc} network ${network} is unreachable`);
      }
    }
  }
  check("every network is reachable by at least one prefix", unreachable, 0);

  // --- Invariant: the MIN_DETECT_DIGITS gate never resolves to the WRONG
  //     network. For any published prefix, looking at only the first
  //     MIN_DETECT_DIGITS digits yields either nothing (a range whose
  //     distinguishing digits come later, e.g. the seven-digit South African
  //     landlines) or exactly the network the full number resolves to. It can
  //     never show one network's plans for another network's number.
  let gatedChecked = 0;
  let gatedWrong = 0;
  let gatedDeferred = 0;
  for (const [cc, nets] of Object.entries(NETWORK_PREFIXES_BY_COUNTRY)) {
    for (const prefixes of Object.values(nets)) {
      for (const prefix of prefixes) {
        gatedChecked++;
        const full = fullNumber(prefix);
        const inFull = detectNetwork(full, cc);
        const atGate = detectNetwork(full.slice(0, MIN_DETECT_DIGITS), cc);
        if (atGate === null) {
          gatedDeferred++;
        } else if (atGate !== inFull) {
          gatedWrong++;
          if (gatedWrong <= 10) {
            console.log(
              `FAIL gate ${cc} ${prefix}: ${atGate} at the gate vs ${inFull} in full`,
            );
          }
        }
      }
    }
  }
  check(
    `gate never mis-resolves (checked ${gatedChecked}, ${gatedDeferred} deferred)`,
    gatedWrong,
    0,
  );

  console.log(`\nMIN_DETECT_DIGITS=${MIN_DETECT_DIGITS}`);
  if (failures) {
    console.error(`\n${failures} FAILURE(S)`);
    process.exitCode = 1;
  } else {
    console.log(`\nALL CHECKS PASS`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
