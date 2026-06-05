---
title: HMR dev FS stale handle causes NotFoundError storms while CI stays green
date: 2026-06-05
category: runtime-errors
module: DevGameFileBackend
problem_type: runtime_error
component: development_workflow
symptoms:
  - "NotFoundError storms from File System Access API during webpack HMR dev play"
  - "WebSocket connection to ws://localhost:8099/ws failed when dev server runs on another port"
  - "ERR_INSUFFICIENT_RESOURCES on parallel __kotor_dev_fs stat/read requests"
  - "GFF modelname and BIK load failures cascading from incomplete resource bootstrap"
root_cause: config_error
resolution_type: code_fix
severity: high
tags:
  - hmr
  - dev-fs
  - webpack
  - directory-handle
  - kotor-dev-game-dir
related_components:
  - GameFileSystem
  - AppState
  - dev-game-fs-middleware
---

# HMR dev FS stale handle causes NotFoundError storms while CI stays green

## Problem

Manual browser play on the HMR branch failed with console error storms and broken module bootstrap, while CI and HMR E2E stayed green. The failures looked like upstream game regressions but were caused by dev infrastructure: stale persisted File System Access handles and whole-file HTTP reads through the dev middleware.

## Symptoms

- Hundreds of `NotFoundError` from `showDirectoryPicker` / FS Access paths when game assets should load via `/__kotor_dev_fs`
- `WebSocket connection to 'ws://localhost:8099/ws' failed` when the dev server was on a different port (8099 is the HMR E2E default, not manual dev)
- `ERR_INSUFFICIENT_RESOURCES` on concurrent `stat` and `read` requests to the dev middleware
- Downstream GFF parse errors (`modelname` undefined), missing BIK movies, empty 2DA tables after partial bootstrap

## What Didn't Work

- **Repeated `/lfg` validation-only passes** — CI always set `KOTOR_DEV_GAME_DIR` and used the correct port; manual tabs with stale IndexedDB profiles and wrong ports still failed
- **Treating errors as upstream Odyssey engine regressions** — upstream master never exercised `DevGameFileBackend`; the HTTP dev FS path is branch-only
- **Stat cache alone (`63a2fb12`)** — reduced socket pressure but did not stop FS Access fallback when a stale `directory_handle` remained in `ApplicationProfile`

## Solution

### 1. Clear stale handles when dev HTTP FS is active

When the runtime probe finds middleware (or compile-time `KOTOR_DEV_GAME_DIR` is set), clear persisted FS Access state before bootstrap:

```typescript
// src/dev/DevGameFileBackend.ts
export function clearDevBrowserDirectoryHandle(): void {
  ApplicationProfile.directoryHandle = undefined as any;
  if (ApplicationProfile.profile && typeof ApplicationProfile.profile === 'object') {
    ApplicationProfile.profile.directory_handle = undefined;
  }
}
```

Called from `src/apps/game/index.tsx` and `src/apps/game/states/AppState.ts` after `probeDevGameFileBackend()`, plus `GameFileSystem.clearDirectoryHandleCache()`.

### 2. Ranged reads with bounded cache

Replace whole-file `devGameReadFile` fetches with stat + 4MB ranged chunks; cache only files ≤ 8MB:

```typescript
const MAX_FILE_BYTE_CACHE = 8 * 1024 * 1024;
const RANGED_READ_CHUNK = 4 * 1024 * 1024;
```

### 3. Reproducible smoke check

```bash
KOTOR_DEV_GAME_DIR="/path/to/swkotor" KOTOR_DEV_PORT=8130 npm run webpack:serve-hmr
KOTOR_DEV_PORT=8130 ./scripts/prove-dev-fs-smoke.sh
```

**Commits:** `2607fcf2` (core fix), `6074f710` (smoke script + STRATEGY draft)

## Why This Works

The HMR stack added an HTTP-backed dev filesystem (`/__kotor_dev_fs`) for browsers that cannot read native paths. When a user previously picked a game directory via File System Access API, that handle persisted in IndexedDB. If the dev middleware was active (or the user opened the wrong port without middleware), the game still tried FS Access paths → `NotFoundError` storms instead of HTTP reads.

Whole-file reads of large BIF/ERF archives multiplied concurrent fetches and exhausted browser connection limits, causing `ERR_INSUFFICIENT_RESOURCES`. GFF and BIK failures were cascades from incomplete bootstrap after FS failures, not independent parser bugs.

## Prevention

- **Before claiming HMR dev parity**, run `./scripts/prove-dev-fs-smoke.sh` against a live `webpack:serve-hmr` instance with real assets — not only unit tests and CI
- **Manual dev workflow:** use `KOTOR_DEV_PORT=8130` (or your chosen port) consistently; open `http://127.0.0.1:<port>/game/?key=kotor`, not port 8099 unless that server is running
- **Clear site data** after switching between FS Access picker mode and `KOTOR_DEV_GAME_DIR` middleware mode
- **Unit tests:** `clearDevBrowserDirectoryHandle` and large-file ranged read coverage in `src/dev/DevGameFileBackend.test.ts`
- **Diagnostic in browser console:** `window.__KOTOR_HMR__?.getBootstrapStatus?.()`

## Related Issues

- PR [#101](https://github.com/KobaltBlu/KotOR.js/pull/101) — HMR / Forge explorer progress branch
- Local analysis: `.hmr-investigation/upstream-vs-hmr-analysis.md`
- Plan: `docs/plans/2026-06-04-004-fix-dev-fs-stale-handle-root-cause-plan.md`
