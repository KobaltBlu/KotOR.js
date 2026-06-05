---
title: Dev game FS must range-read large BIF archives and guard whole-file size
date: 2026-06-03
category: performance-issues
module: dev-hmr
problem_type: performance_issue
component: development_workflow
symptoms:
  - "NotReadableError when loading RIM/BIF headers in browser dev with KOTOR_DEV_GAME_DIR"
  - "Resource not found for lplanet_* MDL after failed archive reads"
  - "Browser tab OOM or hang when opening models.bif (~954MB) via devGameOpen eager load"
root_cause: memory_leak
resolution_type: code_fix
severity: high
tags:
  - hmr
  - dev-game-fs
  - range-read
  - bif
  - oom
  - kotor-dev-game-dir
---

# Dev game FS must range-read large BIF archives and guard whole-file size

## Problem

Browser HMR dev with `KOTOR_DEV_GAME_DIR` failed to load past "Loading Keys" because the dev file backend eagerly buffered entire multi-hundred-megabyte archives (notably `data/models.bif` at ~954MB) into browser memory on every `open`/`readFile`, causing OOM and cascading resource-not-found errors.

## Symptoms

- `NotReadableError: The requested file could not be read` on RIM header reads
- `Error: Resource not found: ResRef: lplanet_0X ResId: 2002`
- `TypeError: Cannot read properties of undefined (reading 'Type')` during GFF/DLG parsing after partial loads
- Dev server or browser tab memory spike when touching large BIFs

## What Didn't Work

- Fixing KEY lookup case sensitivity alone — assets still failed once BIF reads OOM'd
- Assuming CI HMR e2e (`scripts/hmr-session.e2e.cjs`) proved real-asset loading — it uses synthetic `activateSession()` without `KOTOR_DEV_GAME_DIR`
- Whole-file `fetch` + `fileByteCache` on every `devGameOpen` — reintroduces OOM for any code path that opens large archives

## Solution

1. **Range reads end-to-end:** `devGameRead` issues HTTP requests with `offset` and `length` query params. Middleware uses `fs.open` + `fs.read` to return only the requested byte window. `devGameOpen` stat-checks existence only — no eager load.

2. **Whole-file size guard (64 MiB):** Middleware returns HTTP 413 for non-ranged reads of files larger than 64 MiB, and for ranged reads whose `length` exceeds the same cap (prevents `Buffer.alloc` abuse).

3. **Client error surfacing:** `loadFileBytes` includes HTTP status and server message in thrown errors for actionable debugging.

4. **Direct test coverage:** `src/dev/DevGameFileBackend.test.ts` and `webpack/dev-game-fs-middleware.test.ts` exercise virtual writes, cache, range URLs, traversal/symlink guards, and 413 paths without a real install.

5. **Localhost-only access:** Middleware rejects non-loopback `remoteAddress` with 403 so `host: 0.0.0.0` can stay for Puppeteer while the install path is not LAN-exposed.

### Key files

- `src/dev/DevGameFileBackend.ts` — ranged `devGameRead`, virtual write store, cache fast paths
- `webpack/dev-game-fs-middleware.js` — `/__kotor_dev_fs` actions, guards
- `webpack/Game.hmr.js` — registers middleware when `KOTOR_DEV_GAME_DIR` is set

### Runtime verification (real install)

With `KOTOR_DEV_GAME_DIR=/path/to/swkotor`:

- `stat chitin.key` → 200, size ~569239
- ranged `chitin.key[0:8]` → `"KEY V1  "`
- whole `models.bif` → 413
- ranged `models.bif[0:16]` → 200, 16 bytes `"BIFFV1  ..."`

## Why This Works

KOTOR archives are designed for random access via KEY/BIF/RIM headers read in small windows. Eager whole-file loads defeat that model in a browser with finite heap. Range reads mirror native engine I/O: open handle, read header slice, seek/read resource windows. Server-side 413 prevents both Node and browser from allocating gigabyte buffers on accidental `readFile` paths.

## Prevention

- Never call `devGameReadFile` / whole-file middleware reads for paths under `data/*.bif` or other known large archives — use `devGameOpen` + `devGameRead` with explicit offsets.
- When adding new dev FS actions, apply `resolveSafe` (path normalize + `realpathSync`) and localhost guard before disk access.
- Extend `webpack/dev-game-fs-middleware.test.ts` for any new middleware behavior; keep Jest `testMatch` as `**/*.test.ts`.
- HMR e2e proves hot-swap mechanics only; real-asset smoke requires `KOTOR_DEV_GAME_DIR` and manual or dedicated asset e2e.

## Related Issues

- PR #101 — HMR dev stack with real KOTOR install path
- Origin plan: `docs/plans/2026-05-29-031-feat-in-game-hmr-verification-plan.md` (U5–U7)

## Remaining gaps

- Automated in-module HMR session preservation with real assets in CI — optional local run via `KOTOR_HMR_E2E_MODULE` (see `docs/solutions/developer-experience/hmr-real-asset-in-module-e2e.md`)
