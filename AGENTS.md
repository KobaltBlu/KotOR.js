# Agent guide — KotOR.js (feat/forge-explorer-progress / PR #101)

Short entrypoint for coding agents. Human developers: see [README.md](README.md).

## Branch context

This branch adds **HMR dev play** (`webpack:serve-hmr`, `DevGameFileBackend`, `/__kotor_dev_fs` middleware) and **Forge explorer progress**.

HMR has three tiers (see `src/dev/DevSessionResume.ts`, `src/apps/game/index.tsx`):

1. **In-place hot swap** — only React UI shell (`@/apps/game/app`, AppContext) and the `HmrTestProbe` canary.
2. **Engine-file edits** — cannot hot-swap in place (static singletons, `#private` fields, `instanceof` identity). The HMR status handler snapshots the session to `localStorage` and full-reloads; boot auto-resumes into the same module/position.
3. **Manual F5** — same snapshot/auto-resume path (continuous 2 s autosave + `beforeunload`). Disable with `?devresume=0`. Upstream `KobaltBlu/KotOR.js` master has **no HMR stack** — browser errors during HMR dev are often branch-only dev infrastructure, not Odyssey engine regressions. See `docs/solutions/runtime-errors/dev-fs-stale-handle-hmr-parity.md`.

## Port map (do not mix these)

| Port | Use |
|------|-----|
| **8080** | Default `webpack:serve-hmr` — File System Access picker unless `KOTOR_DEV_GAME_DIR` set at compile time |
| **8130** | **Recommended manual dev** with real KOTOR install via `KOTOR_DEV_GAME_DIR` |
| **8099** | **CI HMR E2E only** (`KOTOR_HMR_E2E_PORT`) — not for manual browser play |

## Real-asset HMR dev (Linux / local install)

```bash
KOTOR_DEV_GAME_DIR=/path/to/swkotor KOTOR_DEV_PORT=8130 npm run dev:hmr
```

Open: **http://127.0.0.1:8130/game/?key=kotor**

After server is up:

```bash
KOTOR_DEV_PORT=8130 ./scripts/prove-dev-fs-smoke.sh
```

Browser diagnostic: `window.__KOTOR_HMR_TEST__?.getBootstrapStatus?.()`

## Verification ladder (narrowest first)

1. **Unit** — `npm test -- --testPathPatterns=DevGameFileBackend|dev-game-fs-middleware|HotReloadManager`
2. **CI HMR E2E** — `npm run test:hmr-e2e` (synthetic session, port 8099; no game install in CI)
3. **Dev FS smoke** — live server + `prove-dev-fs-smoke.sh` (requires `KOTOR_DEV_GAME_DIR`)
4. **In-module proof** — `KOTOR_VERIFY_HMR=1 node scripts/verify-in-module.cjs` (Puppeteer; slow on external drives)

Green CI **does not** prove manual browser parity. Always run tier 3 when changing dev FS or bootstrap paths.

## Key env vars

| Variable | Purpose |
|----------|---------|
| `KOTOR_DEV_GAME_DIR` | Absolute path to swkotor install; enables `/__kotor_dev_fs` middleware |
| `KOTOR_DEV_PORT` | webpack-dev-server port (default 8080) |
| `KOTOR_HMR_E2E_PORT` | HMR e2e script only (default 8099) |
| `KOTOR_HMR_E2E_MODULE` | Real-asset in-module e2e target (e.g. `end_m01aa`) |

## Documented solutions

`docs/solutions/` — compound learnings (YAML frontmatter: `module`, `tags`, `problem_type`). Search here before debugging HMR, dev FS, or e2e issues.

- `runtime-errors/dev-fs-stale-handle-hmr-parity.md` — stale IndexedDB handle, CI vs manual drift
- `performance-issues/dev-game-fs-range-reads-and-size-guards.md` — ranged BIF reads, 413 guards
- `developer-experience/hmr-real-asset-in-module-e2e.md` — real-asset / in-module e2e patterns

`docs/plans/` and `docs/knowledgebase/` are **local-only** (gitignored).

## Tests location

Jest uses co-located `*.test.ts` under `src/` and `webpack/`. The top-level `tests/` directory is gitignored.

## Remotes

- `origin` — fork (th3w1zard1/KotOR.js)
- `upstream` — KobaltBlu/KotOR.js (PR #101 target)
