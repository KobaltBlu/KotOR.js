---
name: cloud-agent-starter-kotor-js
description: >-
  Minimal runbook for Cursor Cloud agents on KotOR.js — install, build, serve,
  Electron vs web validation, Jest scope, config/debug toggles, and per-area
  test workflows. Update this file when new tricks land.
---

# KotOR.js — Cloud agent starter (run & test)

Use this skill at the **start of a Cloud session** or whenever you need a fast path from clone to green checks, without hunting `README.md` / `AGENTS.md` / `DEVELOPER_QUICK_REFERENCE.md`.

## Preconditions (read once per task)

- **No game assets in repo**: full game client / Forge archive flows need a local KotOR I or II install; do not claim full gameplay coverage without them.
- **Jest only runs `**/*.test.ts`**: `jest.config.js` uses `testMatch: ['**/*.test.ts']` and ignores some paths — `*.spec.ts` files are not picked up by default.
- **Electron on headless VMs** often shows a **black window** (launcher is frameless/transparent). Prefer **static web** validation for UI in Cloud.

---

## First commands (every clean workspace)

From repo root:

```bash
node --version   # expect 18+
npm ci           # clean workspace default; use npm install only when intentionally updating dependencies or package-lock.json
```

Default agent validation loop (non-trivial code changes):

```bash
npm run format:check
npm run lint
npm test
npm run webpack:dev
```

Use `npm run webpack:prod` instead of or in addition to dev webpack when prod bundling might differ (see `AGENTS.md`).

Faster Jest (skips coverage flags from `npm test`):

```bash
npm run test:verbose
```

Target one file:

```bash
npx jest src/path/to/SomeModule.test.ts --no-cache
```

---

## How to “log in” / configure the app

There is **no remote account** for the engine. “Setup” means **pointing profiles at game folders** and **persisted client settings**.

| Surface | Where settings live | What to do |
|--------|---------------------|------------|
| **Browser** (launcher / forge / debugger bundles) | `idb-keyval` key `app_settings`, merged with defaults in `ConfigClient` | First run uses defaults; game paths are null until the user picks a directory in the UI. |
| **Electron** | `ConfigManager` (JSON on disk — see `src/managers/ConfigManager.ts`) | Same logical tree as `ConfigClient` defaults; profile `directory` fields matter for launch. |

**Useful common config keys** (inspect `src/utility/ConfigClient.ts` for the default tree and related keys):

- `Game.debug.*` — FPS overlay, collision/debug visuals, intro skip, “shipping build” flag, etc.
- `Profiles.<key>.directory` — per-profile install path (launcher sets via locate flow).
- `Games.KOTOR.Location` / `Games.TSL.Location` — legacy game-root config keys.

**Mocking / toggling for manual QA**: in browser DevTools, after the app loads, you can patch stored settings only if the app exposes that flow; the reliable approach for agents is **unit tests with mocked `CurrentGame` / loaders** or **documented env vars** (this repo rarely uses `process.env` for feature flags — prefer `ConfigClient` / `ConfigManager` keys). When you discover a new toggle, add it under **Maintaining this skill** below.

---

## Starting the app

### A) Electron (full desktop)

```bash
npm start
```

Compiles Electron main (`tsconfig.electron.json`) then launches via `scripts/write-electron-launcher.js`. Do **not** use `npm run dev` for Electron main-process watch + restart; that script is for the web/static dev flow. For Electron watch workflows, use the actual Electron scripts from `package.json` such as `npm run start-watch`, `npm run serve:electron`, or `npm run start-watch:debug`, depending on whether you want normal or debug startup.

### B) Web / static bundles (best for Cloud UI smoke)

```bash
npm run webpack:dev
cd dist && python3 -m http.server 8080
```

Then open (paths match `webpack.config.js` `publicPath`):

| App | URL |
|-----|-----|
| Launcher | `http://localhost:8080/launcher/` |
| Forge | `http://localhost:8080/forge/` |
| Debugger | `http://localhost:8080/debugger/` |

`npm run serve` serves `./dist` on port **8080** with `serve` (see `package.json`) — alternative to Python.

**HTTPS note** (from `README.md`): real browser deployment expects TLS; localhost HTTP is fine for agent smoke tests.

---

## Organized by codebase area

Paths are under `src/` unless noted.

### 1) Repository root / build / CI

| Concern | Location | Run / test |
|---------|----------|------------|
| Webpack | `webpack.config.js` | `npm run webpack:dev` and `npm run webpack:prod` for config changes |
| Electron TS | `tsconfig.electron.json`, `src/electron/index.ts`, `src/electron/preload.ts`, `main.js` | `npm run electron:compile` |
| Jest | `jest.config.js` | `npm test` — `@/` → `src/` via `moduleNameMapper` |

### 2) Applications (`src/apps/`)

| App | Entry (webpack) | Concrete workflow |
|-----|-------------------|---------------------|
| **Launcher** | `src/apps/launcher/index.tsx` | Build → `http://localhost:8080/launcher/` — test shell, “Need KotOR?”, community links without game files |
| **Game client** | (game bundle in webpack) | Needs archives + modules; rely on **Jest** for pure logic, or manual with install |
| **Forge** | `src/apps/forge/index.tsx` | Build → `/forge/` — editor UI loads; deep GFF flows need assets |
| **Debugger** | `src/apps/debugger/index.tsx` | Build → `/debugger/` |

**Forge + agents**: unsaved tab buffers can diverge from disk — see `docs/agent-native/CAPABILITY_MAP.md`.

### 3) Engine & module runtime (`src/engine/`, `src/module/`)

- **Run**: exercised through game client or tests.
- **Test**: `npm test` with focused patterns, e.g. `npx jest path/to/Module.test.ts --no-cache` when touching one area.
- **Access pattern**: `CurrentGame.<Manager>` — grep callers for the manager you change.

### 4) Resource system & loaders (`src/resource/`, `src/loaders/`)

- **Test**: unit tests near parsers; note `testPathIgnorePatterns` in `jest.config.js` excludes some RIM/GFF/ERF tests — do not assume they run in CI until that changes.
- **Manual**: requires real `.bif` / `.rim` / `.erf` / `.key` trees from an install.

### 5) NWScript (`src/nwscript/`)

- **Test**: Jest on bytecode / instance helpers where `*.test.ts` exists.
- **Manual**: full validation needs `.ncs` from game or mods.

### 6) Odyssey / THREE (`src/odyssey/`, `src/three/`, `src/shaders/`)

- **Test**: prefer isolated math/parser tests; rendering often needs WebGL + assets.
- **Manual**: Electron or browser game client with GPU; headless may not show meaningful frames.

### 7) Audio, combat, effects, enums

- Treat like engine: **targeted Jest** + integration only with install.

---

## Electron-only debugging

```bash
npm run start:debug
# or full build + debug:
npm run start:debug:full
```

Uses `ELECTRON_ENABLE_LOGGING=1` and `NODE_OPTIONS=--trace-warnings` (see `package.json`).

---

## Maintaining this skill

When you find a **new reproducible trick** (env var, config key, URL path, Jest caveat, CI requirement, headless workaround):

1. Add a **one-line bullet** to the relevant section above (or a new subsection if it is cross-cutting).
2. If it is policy-level, also consider **`AGENTS.md`** or **`DEVELOPER_QUICK_REFERENCE.md`** — this skill stays **minimal**; deep docs belong in those files.
3. Commit with conventional commits, e.g. `docs(agents): extend cloud agent starter skill`.

**Trigger phrases to reload this skill**: “how do I run KotOR.js”, “Cloud agent setup”, “test launcher in browser”, “jest not finding tests”, “black Electron window”.
