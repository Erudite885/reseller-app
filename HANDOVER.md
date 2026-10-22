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
**deployed (v5)**; what remains is a fresh APK (8.f.iii already shipped the
`kesh-data` APK) and the live gateway call (a person step). See
`TASK-8-BOARD.md` in the web repo.

## Build pipeline (APK workflows) — updated 2026-10-17

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
