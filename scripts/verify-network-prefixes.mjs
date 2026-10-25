// scripts/verify-network-prefixes.mjs
//
// Checks the generated prefix tables in constants/networkPrefixes.ts against
// known-good numbers for every country the app ships to. Run after
// regenerating the tables:
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

  const norm = (v) => (v == null ? null : String(v).toUpperCase());

  // [typed number, country, expected network]. Covers every country with a
  // table, both the trunk-`0` and bare forms, and the null cases.
  const cases = [
    ["0803", "ng", "MTN"], ["08036012345", "ng", "MTN"], ["8036012345", "ng", "MTN"],
    ["0903", "ng", "MTN"], ["0805", "ng", "GLO"], ["0705", "ng", "GLO"],
    ["0802", "ng", "AIRTEL"], ["0808", "ng", "AIRTEL"],
    ["0809", "ng", "9MOBILE"], ["0817", "ng", "9MOBILE"],
    ["024", "gh", "MTN"], ["054", "gh", "MTN"], ["020", "gh", "Telecel"],
    ["027", "gh", "AirtelTigo"], ["057", "gh", "AirtelTigo"],
    ["0722", "ke", "Safaricom"], ["0733", "ke", "Airtel"], ["077", "ke", "KenyaTelkom"],
    ["067", "cm", "MTN"], ["069", "cm", "Orange"], ["062", "cm", "Camtel"],
    ["096", "zm", "MTN"], ["097", "zm", "Airtel"], ["095", "zm", "Zamtel"],
    ["077", "ug", "MTN"], ["075", "ug", "Airtel"], ["071", "ug", "Telecom"],
    ["082", "za", "Vodacom"], ["083", "za", "MTN"], ["084", "za", "CellC"],
    ["0810", "za", "MTN"], ["0811", "za", "TelkomMobile"], ["072", "za", "Vodacom"],
    ["066", "td", "Airtel"], ["090", "tg", "Togocel"],
    ["080", "ng", null], ["08", "ng", null], ["", "ng", null],
    ["0803", "xx", null], ["0803", undefined, null],
  ];

  const lengthCases = [
    ["08036012345", { minDigits: 10, maxDigits: 10 }, true],
    ["0803601234", { minDigits: 10, maxDigits: 10 }, false],
    ["0244123456", { minDigits: 9, maxDigits: 9 }, true],
    ["024412345", { minDigits: 9, maxDigits: 9 }, false],
  ];

  let failures = 0;
  const check = (label, got, want) => {
    const ok = norm(got) === norm(want);
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"} ${label} = ${got} (want ${want})`);
  };

  for (const [input, cc, want] of cases) {
    check(`detect(${JSON.stringify(input)}, ${cc})`, detectNetwork(input, cc), want);
  }
  for (const [input, cfg, want] of lengthCases) {
    check(`valid(${JSON.stringify(input)})`, isValidNationalPhoneNumber(input, cfg), want);
  }

  console.log(`\nMIN_DETECT_DIGITS=${MIN_DETECT_DIGITS}`);
  if (failures) {
    console.error(`\n${failures} FAILURE(S)`);
    process.exitCode = 1;
  } else {
    console.log(`\nALL ${cases.length + lengthCases.length} CHECKS PASS`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}
