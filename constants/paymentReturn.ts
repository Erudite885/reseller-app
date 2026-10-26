// constants/paymentReturn.ts
//
// Task 8, pointer 8.k.i. Recognising the gateway's return to the app.
//
// Korapay and Flutterwave both end a checkout by redirecting the payer to the
// callback URL the fund-wallet function gave them:
//
//   <APP_URL>/api/payment/callback?reference=<ref>&returnTo=<store path>
//
// In-app checkout renders that checkout in a WebView (components/
// PaymentWebView.tsx), so the moment the WebView is asked for the callback we
// know the payer is done: close the sheet and refresh the wallet. The webhook
// is what actually credits the balance, so "done" here means "stop showing the
// gateway", not "the money has landed".
//
// Deliberately free of imports and of the URL class so it compiles and runs
// under plain Node (see scripts/verify-payment-return.mjs) and needs no
// polyfill on device.

/** Path of the app's payment callback route (src/app/api/payment/callback). */
export const PAYMENT_CALLBACK_PATH = "/api/payment/callback";

/**
 * The path of a URL, with the scheme/host, query and hash removed. Accepts
 * absolute URLs, protocol-relative URLs and bare paths; returns "" for empty
 * input.
 */
export function urlPathname(url: string): string {
  if (!url) return "";
  let path = url;

  const hash = path.indexOf("#");
  if (hash >= 0) path = path.slice(0, hash);
  const query = path.indexOf("?");
  if (query >= 0) path = path.slice(0, query);

  // Drop "scheme://host" (and "//host") so only the path remains.
  const scheme = path.indexOf("://");
  const authorityStart = scheme >= 0 ? scheme + 3 : path.startsWith("//") ? 2 : -1;
  if (authorityStart >= 0) {
    const slash = path.indexOf("/", authorityStart);
    path = slash >= 0 ? path.slice(slash) : "/";
  }

  return path;
}

/** Value of `key` in the URL's query string, decoded, or null. */
export function queryParam(url: string, key: string): string | null {
  const query = url.indexOf("?");
  if (query < 0) return null;

  const hash = url.indexOf("#", query);
  const raw = url.slice(query + 1, hash >= 0 ? hash : undefined);

  for (const pair of raw.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const name = eq >= 0 ? pair.slice(0, eq) : pair;
    if (name !== key) continue;
    const value = eq >= 0 ? pair.slice(eq + 1) : "";
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return value;
    }
  }

  return null;
}

/**
 * True when `url` is the app's payment callback — i.e. the gateway has handed
 * the payer back. Matched on the path alone so it holds even if the app's
 * origin differs from the one baked into the build (custom domain, preview
 * deployment); a gateway page never carries this path.
 */
export function isPaymentReturnUrl(url: string): boolean {
  return urlPathname(url) === PAYMENT_CALLBACK_PATH;
}

/** The `status` the callback was given, e.g. "success" / "pending", or null. */
export function paymentReturnStatus(url: string): string | null {
  return queryParam(url, "status");
}
