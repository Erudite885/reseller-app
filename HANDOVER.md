# HANDOVER — Pointer File

**This is NOT the master handover file.** The master lives in the web
repo. This file just cross-references it and tracks a short status
mirror so anyone landing in this repo first knows where to go.

## Session bootstrap (do this before anything else)

Every new session working with this repo — whether it's cloning fresh or
already has a local copy — should always land on the **latest commit of
the most recently updated branch**, not just `main`:

1. Fetch all branches:
   ```bash
   git fetch --all
   ```
2. Find the most recently updated branch:
   ```bash
   git for-each-ref --sort=-committerdate refs/remotes --format='%(committerdate:iso8601) %(refname:short) %(objectname:short)'
   ```
3. Check it out at its latest commit:
   ```bash
   git checkout -B <branch-name> origin/<branch-name>
   ```
4. Re-read this `HANDOVER.md` from that checked-out branch, then follow
   its pointer to the master handover in `Edges_LandingPage` (also
   checked out at **its** latest branch, per the same bootstrap steps
   there — the two repos' "latest branch" won't always share the same
   name, check each independently).

Same rule as the web repo: `main` here can be stale — the latest branch
is the source of truth for what to work from, not `main`.

## Master handover

- Repo: [Edges_LandingPage](https://github.com/Edges-Enterprise/Edges_LandingPage)
- Branch: `handover/supabase-dump`
- File: `HANDOVER.md` at repo root
- Sandbox path (if working locally alongside this repo): `../Edges_LandingPage/HANDOVER.md`

## Why these two repos are linked

This repo (`reseller-app`, Expo/React Native) is the mobile client for
the same product as `Edges_LandingPage` (Next.js web). Both talk to the
**same Supabase Postgres backend** — one project, two clients:

- This repo's env vars: `EXPO_PUBLIC_BIMBO_SUPABASE_URL`,
  `EXPO_PUBLIC_BIMBO_SUPABASE_PUBLISHABLE_KEY` (`lib/supabase.ts`)
- Web repo's env vars: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`

Because the backend is shared, cross-repo tasks (like DB dumps, schema
changes, RPC changes) are coordinated from the master handover file, not
duplicated per repo.

## Branch

This repo is on `handover/supabase-dump`, matching the branch name used
in the web repo, so the two can be checked out side by side.

## Current status (mirror only — see master for full detail)

**Task 8, 8.i — store owner login (2026-10-24):** the owner can now sign in on
mobile. The login screen resolves the typed address to the Supabase Auth
identity behind it by calling `global-store-customer-auth-email`, and that
resolver searched only `global_customers`. A reseller has no customer row — their
Auth identity is the application's own derived alias
(`<local>+reseller-<cc>-<slug>-<rand>@<domain>`) — so an owner resolved to
`null`, the screen fell back to the typed address, and sign-in failed with
"Invalid login credentials". Customers were unaffected. The resolver now also
matches the typed address against this store's `global_reseller_applications`
row (store-scoped, exact). Fixed in the web repo's `_shared/storeAuthEmail.ts`,
deployed as edge function **v6**, and live-verified; the mobile change here is
only the helper rename (`getCustomerAuthEmail` → `resolveAuthEmail`, since it now
serves both roles). Mobile `tsc --noEmit` = 0. **The fix reaches a device in the
next APK build** — the edge function is already deployed, so a rebuild is all
that is needed.

**Task 8, 8.k — gateway checkout now opens inside the app (2026-10-26):** the
fund-account/wallet flow used to hand the Korapay/Flutterwave checkout URL to
`WebBrowser.openBrowserAsync`, which opened a Chrome Custom Tab / Safari sheet —
the payer left the app. NG was unaffected (its xixapay gateway issues a virtual
account and never redirects), but every other country was routed out. The
checkout now renders in an in-app `Modal` + `WebView`
(`components/PaymentWebView.tsx`), and `constants/paymentReturn.ts` watches for
the gateway's redirect back to the app's own `/api/payment/callback` to close the
sheet and refresh the wallet. `react-native-webview` was already a dependency, so
no new native module. Verified with `scripts/verify-payment-return.mjs` (27/27),
`tsc --noEmit` = 0, lint unchanged. Shipped as mobile `main` `814b0fd`; the four
test-store APKs were rebuilt and proven to carry the change. See the master
handover for the full entry.

**Task 1 — Supabase direct DB dump:** OPEN. The direct `pg_dump`
command block and the wrapper script (`scripts/supabase_dump.sh`) both
live in the web repo's `HANDOVER.md`, since the dump is backend-wide,
not per-client. Nothing to run from this repo for that task. Check the
master log table for the latest update before starting work.

**Task 8, 8.g.i follow-up — customer row shape (2026-10-22):** `app/_layout.tsx`'s
`setupCustomerForReseller` used to send the session address (the derived alias) as
both `email` and `authEmail`, so a row it *created* was legacy-shaped
(`email == auth_email == alias`) instead of the web's shape (`email` = the address
typed, `authEmail` = the alias). It now takes an `originalEmail` argument and both
call sites pass `session.user.user_metadata?.original_email` (falling back to the
session address when the metadata is absent), mirroring the web's
`registerCustomerToGlobalReseller`. Login already worked either way — the
`global-store-customer-auth-email` lookup recovers the alias from Auth metadata —
so this only aligns the row shape. Committed `31b3c6c`, merged to `main` as
`501eff9` (PR #8). Mobile `tsc --noEmit` = 0. The app is now fully off the legacy
`reseller*` tables (only explanatory comments remain).

**Task 8, 8.f.ii — wallet funding from the app (2026-10-17):** the app can
now fund a wallet by mobile money in every non-Nigeria country. Nigeria is
unchanged (xixapay virtual account). Two new files: `hooks/useFundWallet.ts`
invokes the new `global-store-fund-wallet` edge function (web repo) with the
caller's JWT, then opens the returned checkout URL with
`WebBrowser.openBrowserAsync`; `wallet.tsx` replaces the "coming soon" card
with an amount + mobile-money form (the number field appears only for
Flutterwave), and the home wallet card now routes to the wallet screen. The
function inserts a PENDING transaction and returns the checkout URL;
completion is unchanged and stays on the web (the korapay/flutterwave
webhooks credit the wallet). Mobile `tsc --noEmit` = 0. The function is
**deployed (v5)**; the `kesh-data` APK shipped (8.f.iii) and the app builds an
AAB beside the APK (8.h). **The live gateway leg is now PROVEN (2026-10-24):**
the four built apps were tested on a device, and three non-NG fund attempts from
the app returned live Korapay checkout URLs plus `pending` rows in
`global_customer_transactions` — `KES` (kesh-data/`ke`), `XAF` (sweet-data/`cm`),
`GHS` (kwam-two/`gh`). The `403 invalid authorization key` is gone (a rejection
writes no row). **Still unexercised:** the *post-checkout* leg — every row is
still `pending` and every wallet balance is `0.0`, so the Korapay webhook →
wallet-credit step has not run; complete one real mobile-money payment to close
it. See `TASK-8-BOARD.md` in the web repo.

## Build pipeline (APK workflows) — updated 2026-10-22 (now also builds an AAB)

**Node bump — LANDED.** Both APK workflows pinned `node-version: "20"`, but
`expo/expo-github-action@v8` with `expo-version: latest` installs a CLI whose
`@oclif/plugin-autocomplete` requires Node >=22. Bumped both to
`node-version: "22"`; this is on `handover/supabase-dump` (and thus in CI).
**CI-confirmed 2026-10-17:** run `39058017316` (Roseline) cleared "Setup Expo"
and "Install dependencies" — the old failure is gone. `main` still has Node 20.

The web dispatches this workflow with `ref: handover/supabase-dump`
(`BUILD_WORKFLOW_REF`), so the branch is the right target for now.

**Still open — and the real blocker as of 2026-10-17:** the asset step
(`scripts/generate-global-reseller-assets.sh`) fetches the build config from
`${API_URL}/api/reseller/${COUNTRY_CODE}/config/${CONFIG_ID}`, and that route
returns a **404 on the live production host**. Root cause: the web repo
(`Edges-Enterprise/Edges_LandingPage`) has **never been deployed to
production** — Vercel shows only `Preview` deployments, and
`edges-landing-page.vercel.app` serves a stale `main` that predates the
storefront/config work. So no APK can be built until the web is deployed to
production with the `handover/supabase-dump` lineage. The same root cause
explains the build-callback 404. See the master handover (`Edges_LandingPage`,
`HANDOVER.md`) "The web has never been deployed to production" and Blocker 3 in
`TASK-8-BOARD.md`.

## Pawns module removed; AAB now built beside the APK (2026-10-22)

Person instruction: the pawns (bandwidth-sharing / earnings) module is no longer
used, so delete it, and make the build produce an **AAB alongside the APK**.

**Pawns removal — DONE** (commit `c1c16be`, branch `handover/supabase-dump`):

- `module/pawns/` deleted in full: the native Expo module (`PawnsModule.kt`,
  `PawnsBootReceiver.kt`), both vendored binaries (`pawns-ndk-1.8.1.aar`,
  `internet-sharing-1.8.1.aar`), `AndroidManifest.xml`, drawables/strings, the
  checked-in `.gradle` state, `index.ts`, `expo-module.config.json`, `package.json`.
- `components/EarningsConsentGate.tsx` deleted, and its gate wiring removed from
  `app/_layout.tsx` (the `<EarningsConsentGate>` render, the `showConsentGate` /
  `isCheckingConsent` / `isNavigatingToSettings` / `previousPathname` state, the
  `checkConsentStatus` effect, the three consent handlers, the `isCheckingConsent`
  early-return, and the now-unused `usePathname` / `useCallback` / `useState`
  imports).
- `app/(app)/(protected)/security.tsx`: the Bandwidth Sharing section
  (`BandwidthSharingSection`), the `"bandwidth"` member of the `SecuritySection`
  union, the `previewMode` param, and the `@/module/pawns`, `AsyncStorage`,
  `Switch`, `ActivityIndicator`, `useRouter` imports are all gone.
- `pawns-sdk` dropped from `package.json`; `package-lock.json` regenerated; the
  stale `node_modules/pawns-sdk` symlink removed.
- The `Honeygain - bandwidth sharing` line removed from both third-party lists in
  `constants/legalTextGenerator.ts`. (The remaining `consent` strings there are
  generic legal boilerplate, not pawns-related.)

A repo-wide grep for `pawn` now matches only unrelated npm packages
(`@expo/spawn-async`, `cross-spawn`).

**AAB alongside the APK — DONE:**

- `eas.json` gained a `production-aab` profile (`android.buildType: "app-bundle"`,
  which maps to `:app:bundleRelease` and is the store-submission default).
- `.github/workflows/build-global-reseller-apk.yml` (the live pipeline) now runs a
  second `eas build --platform android --profile production-aab --local
  --output=./<store>.aab` step after the APK step, with the same env; the release
  step attaches **both** files to the one GitHub release and the success webhook
  posts `aabUrl`.
- Job timeout raised 45 → 90 minutes, because each dispatch now runs two full
  Android builds.
- The **legacy** `build-reseller-apk.yml` is deliberately left **untouched**. It
  was originally given the same AAB treatment, on the premise that it was a live
  pipeline; the person has since confirmed the legacy `reseller_app_configs`
  table is not in use, and the evidence agrees (legacy workflow last run
  **2026-10-07**, last success 2026-08-04; it posts to the legacy
  `api/build-webhook`, which writes only that table). The change there was
  reverted, so the legacy path is byte-identical to before this session.

**Verified:** `tsc --noEmit` = 0 (sanity-checked by injecting a deliberate type
error, which tsc caught, then reverting); both workflow YAMLs re-parse and list
15 steps; `expo lint` improved from 55 problems (23 errors) to 42 (12 errors)
with no new finding in any touched file.

**Merged:** PR #10 → `main` `ecd3ef6` (verified: `main` carries
`timeout-minutes: 90`, the `Build Android AAB` step, and `aabUrl` in the webhook
payload). **NOT proven:** no build has been dispatched since the change, so the
`production-aab` profile is not yet shown to build in CI. The dispatch is safe to
run now — the merge-order gate is satisfied (the web dispatches at
`ref: "main"`). Recorded as board item `8.h.iv`; the matching dashboard half is
web PR #35 → `0b5dadc`.


## Handoff process for patches to this repo

See the master handover's **"Standing handoff process"** section — it's
the same process for every task, every repo, don't re-derive it here.
Short version: patches are downloaded into Termux's shared storage and
applied with `git am` from inside this repo's directory, pointing at
the file under `~/storage/downloads/`:

```bash
cd reseller-app
git am ~/storage/downloads/reseller-app_0001-add-handover-pointer-file.patch
git push -u origin handover/supabase-dump
```
