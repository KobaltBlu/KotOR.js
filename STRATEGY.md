---
name: KotOR.js
last_updated: 2026-06-04
---

# KotOR.js Strategy

> **Note:** Draft inferred from README and active HMR/dev-FS work. Run `/ce-strategy` for a full interview and user-validated revision.

## Target problem

Classic KotOR I & II run on a proprietary Odyssey engine that is no longer maintained. Players and modders who want to play or extend those games in modern environments (browser, desktop, tooling) lack a faithful, extensible engine they can run without reverse-engineering the originals from scratch.

## Our approach

Reimplement the Odyssey engine in TypeScript with THREE.js rendering, ship it as both Electron desktop and browser-capable builds, and prioritize **playable parity** with real game assets over speculative features. Dev workflows (HMR, Forge modding suite) must not regress the runtime path users actually play on.

## Who it's for

**Primary:** KotOR player-modder — They want to load their legally owned K1/K2 install, play in browser or Electron, and use Forge to inspect and edit game data without leaving the ecosystem.

**Secondary:** Engine contributor — They need a fast dev loop (webpack HMR + local game dir) and CI that proves real-asset sessions still bootstrap after changes.

## Key metrics

- **Module bootstrap success rate** — Game reaches in-module state with expected creature/module counts; measured via HMR E2E and `scripts/verify-in-module.cjs` on real assets
- **Dev FS read reliability** — Stat/read on `chitin.key` and representative assets succeed via `/__kotor_dev_fs` without NotFoundError or socket exhaustion; measured via unit tests + dev smoke curl + browser console on port with `KOTOR_DEV_GAME_DIR`
- **CI green on PR** — Quality checks, bundle builds, and HMR session E2E pass on KobaltBlu/KotOR.js upstream; tracked in GitHub Actions on open PRs

## Tracks

### Runtime engine parity

Faithful reimplementation of Odyssey systems (resources, modules, combat, dialogue, saves) so K1/K2 content loads and plays correctly.

_Why it serves the approach:_ Without parity, the TypeScript rewrite is a demo, not a replacement engine.

### Browser + Electron delivery

Webpack builds, File System Access / dev middleware paths, and Electron packaging so the same codebase runs where users actually play.

_Why it serves the approach:_ Multi-surface delivery is core to the project's web-compatibility goal; each surface must share one resource-loading truth.

### KotOR Forge (modding suite)

Editor and explorer tooling for GFF, modules, and assets integrated with the engine's parsers.

_Why it serves the approach:_ Modders are a primary audience; Forge is the wedge that keeps contributors invested in the engine.

### Dev experience (HMR, local assets)

Fast iteration with `KOTOR_DEV_GAME_DIR`, dev FS middleware, and session-preserving HMR without breaking manual browser play.

_Why it serves the approach:_ Contributors cannot sustain parity work if CI-green dev paths diverge from what developers run locally.

## Not working on

- Distributing copyrighted game assets (users must supply their own install)
- Feature parity with unrelated remakes or total conversions outside K1/K2 Odyssey scope
- Production-hardening dev FS middleware for untrusted networks (localhost-only dev aid)

## Marketing

**One-liner:** KotOR.js — a TypeScript remake of the Odyssey engine so you can play and mod Knights of the Old Republic in the browser or on desktop.

**Key message:** Built on THREE.js and Electron, KotOR.js supports real K1/K2 installs, ships Forge for modding, and is developed in the open with the OpenKotOR community.
