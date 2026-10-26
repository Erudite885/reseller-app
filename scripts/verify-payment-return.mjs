// scripts/verify-payment-return.mjs
//
// Checks constants/paymentReturn.ts, the module that tells the in-app checkout
// WebView when the gateway has handed the payer back.
//
//   node scripts/verify-payment-return.mjs
//
// Compiles the module with tsc first, since it is TypeScript.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = mkdtempSync(join(tmpdir(), "payreturn-"));
let failures = 0;

const check = (label, got, want) => {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label} = ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
};

try {
  execFileSync(
    "npx",
    [
      "tsc",
      "constants/paymentReturn.ts",
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

  const entry = join(out, "paymentReturn.js");
  const { isPaymentReturnUrl, paymentReturnStatus, urlPathname, queryParam } =
    await import(entry);

  // --- urlPathname strips scheme/host/query/hash ---
  check("path absolute", urlPathname("https://edges.example.com/api/payment/callback?x=1"), "/api/payment/callback");
  check("path protocol-relative", urlPathname("//edges.example.com/api/payment/callback"), "/api/payment/callback");
  check("path bare", urlPathname("/api/payment/callback?a=1#h"), "/api/payment/callback");
  check("path host only", urlPathname("https://edges.example.com"), "/");
  check("path empty", urlPathname(""), "");
  check("path root", urlPathname("https://edges.example.com/"), "/");

  // --- the callback itself is recognised, in every URL shape the gateway uses ---
  check(
    "return absolute",
    isPaymentReturnUrl("https://edges.example.com/api/payment/callback?reference=KPY-1&status=success&returnTo=%2Fgh%2Fkwam-two"),
    true,
  );
  check(
    "return different origin",
    isPaymentReturnUrl("https://preview-abc.vercel.app/api/payment/callback?reference=FLW-1"),
    true,
  );
  check(
    "return protocol-relative",
    isPaymentReturnUrl("//edges.example.com/api/payment/callback?reference=KPY-2"),
    true,
  );
  check("return bare path", isPaymentReturnUrl("/api/payment/callback?reference=KPY-3"), true);

  // --- gateway and app pages are NOT mistaken for the callback ---
  check("gateway checkout page", isPaymentReturnUrl("https://checkout.korapay.com/pay/KPY-1"), false);
  check("flutterwave page", isPaymentReturnUrl("https://checkout.flutterwave.com/v3/hosted/pay/abc"), false);
  check("storefront", isPaymentReturnUrl("https://edges.example.com/gh/kwam-two?reference=KPY-1"), false);
  check("callback with extra path", isPaymentReturnUrl("https://edges.example.com/api/payment/callback/extra"), false);
  check("prefix lookalike", isPaymentReturnUrl("https://evil.com/x/api/payment/callback"), false);
  check("empty", isPaymentReturnUrl(""), false);
  check("about:blank", isPaymentReturnUrl("about:blank"), false);

  // --- query parsing ---
  check("status success", paymentReturnStatus("https://e.com/api/payment/callback?reference=KPY-1&status=success"), "success");
  check("status pending default shape", paymentReturnStatus("https://e.com/api/payment/callback?status=pending&reference=KPY-1"), "pending");
  check("status absent", paymentReturnStatus("https://e.com/api/payment/callback?reference=KPY-1"), null);
  check("param url-encoded", queryParam("https://e.com/x?returnTo=%2Fgh%2Fkwam-two", "returnTo"), "/gh/kwam-two");
  check("param plus is space", queryParam("https://e.com/x?name=a+b", "name"), "a b");
  check("param first of many", queryParam("https://e.com/x?a=1&b=2&c=3", "a"), "1");
  check("param last of many", queryParam("https://e.com/x?a=1&b=2&c=3", "c"), "3");
  check("param missing key", queryParam("https://e.com/x?a=1", "z"), null);
  check("param no query", queryParam("https://e.com/x", "a"), null);
  check("param empty value", queryParam("https://e.com/x?a=", "a"), "");
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nALL CHECKS PASS" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
