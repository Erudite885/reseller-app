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
