---
title: Engine HMR = snapshot-reload-resume, not in-place swap
date: 2026-06-12
category: developer-experience
module: DevSessionResume
problem_type: architecture_decision
component: development_workflow
symptoms:
  - "Editing engine source during HMR dev play silently does nothing (stale code keeps running)"
  - "Entry self-accept re-executes a parallel engine world that nothing references, killing the test bridge"
  - "Full reload (F5) drops the player back at the main menu, losing the in-module session"
root_cause: design_limitation
resolution_type: code_fix
severity: high
tags:
  - hmr
  - dev-session-resume
  - webpack
  - localStorage
  - e2e
---

## Problem

"HMR doesn't work" in KotOR.js had a precise meaning that took several
debugging rounds to pin down: edits to **engine** source files (`src/module/**`,
`src/managers/**`, `src/GameState.ts`, …) either silently did nothing or broke
the page, and any full reload sent the developer back to the main menu —
losing minutes of boot + module-load time per iteration.

## Why in-place engine hot-swap is impossible here

Three structural properties of the engine rule out webpack in-place hot
replacement (and the usual class-prototype-patching tricks) for engine code:

1. **Static singleton state** — `GameState`, managers, and loaders keep live
   session state in static class fields. Re-executed modules create parallel
   classes with empty statics → split-brain between old live world and new
   code scope.
2. **Native `#private` fields** — e.g. `ModuleObject.#computedPath`. Private
   field brands are per-constructor; methods from a re-evaluated class throw
   `TypeError` when applied to instances built by the old class.
3. **`instanceof`-heavy logic** — object identity checks fail across class
   generations in either patch direction.

The pre-existing entry self-accept made this worse, not better: engine edits
bubbled into the entry, webpack re-executed the whole import chain into a
detached "new world" (module-scope side effects like `MenuManager.Init()`
re-ran), while the render loop kept running old code. Observed live: the test
bridge died and the edit never took effect.

## Solution: three explicit HMR tiers

| Tier | Mechanism | Files |
|---|---|---|
| React UI shell + probe | true in-place `module.hot.accept` boundaries | `src/apps/game/index.tsx` |
| Engine edits | status handler (`abort`/`fail`) → synchronous localStorage snapshot → `location.reload()` → boot auto-resume | `index.tsx` + `src/dev/DevSessionResume.ts` |
| Manual F5 | continuous 2 s autosave + `beforeunload` snapshot → same boot auto-resume | `src/dev/DevSessionResume.ts` |

Key implementation points:

- **Snapshot is tiny and synchronous** (module, position, facing →
  `localStorage['kotor.devResumeSnapshot']`), so it works from `beforeunload`
  and the HMR status handler without async hazards.
- **Resume rides the quick-play path** (`startQuickPlayToModule` from
  `HmrTestBridge`), then restores the player transform. It must wait for
  `GameState.Ready` **and** `MenuManager.LoadScreen/MenuToolTip` before
  quick-playing — racing the app's own menu init double-runs
  `LoadMainGameMenus` and crashes on menu resources (observed:
  `Resource not found: lplanet_03`).
- **Crash-loop breaker**: attempts counter persisted *before* the risky load;
  3 strikes clears the snapshot. `?devresume=0` disables resume entirely.
- **Entry self-accept was removed** so engine edits deterministically hit the
  `abort` path instead of re-executing a detached world.

## Verified behavior (live, Chrome DevTools MCP, real assets)

- Engine edit (`ModuleArea.update` marker) → auto reload → auto resume into
  `end_m01aa` at the exact pre-edit position → marker counting every frame
  (new code live).
- F5 → resume to the centimeter (nudged position restored), never main menu.
- Probe/UI in-place HMR unaffected (`pageLoadId` constant, `acceptCount`
  increments).

## Regression coverage

- `src/dev/DevSessionResume.test.ts` — snapshot capture guards, URL kill
  switch, attempts breaker, transform restore, idempotent install.
- `scripts/hmr-session.e2e.cjs` — `runF5ResumePhase` +
  `runEngineEditResumePhase` (real-asset in-module mode only; synthetic CI
  mode skips them).

## Known limitations

- Resume replays module entry (intro dialogs restart); state fidelity is
  module + player transform, not a full savegame. Layering
  `SaveGame.SaveCurrentGame` onto the snapshot cadence is the upgrade path.
- A resume costs a real module load (~60–80 s on an external drive).
