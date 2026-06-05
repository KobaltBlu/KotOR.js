---
title: Real-asset and in-module HMR session e2e
date: 2026-06-03
category: developer-experience
module: dev
problem_type: developer_experience
component: testing_framework
severity: medium
tags: [hmr, e2e, kotor-dev-game-dir, puppeteer, keymapper]
applies_when:
  - "Extending HMR e2e to exercise real KOTOR installs locally"
  - "Game init crashes during real asset load in headless e2e"
---

# Real-asset and in-module HMR session e2e

## Context

CI HMR e2e used synthetic `activateSession()` and did not prove session preservation after real KEY/BIF loading or in-game module state. Local developers with `KOTOR_DEV_GAME_DIR` needed an automated gate matching manual HMR dev.

## Guidance

### Dual-mode e2e (`scripts/hmr-session.e2e.cjs`)

- **`USE_REAL_ASSETS`**: when `KOTOR_DEV_GAME_DIR` exists on disk, pass it to webpack serve and poll `snapshotSession().ready` instead of calling `activateSession()`.
- **`USE_IN_MODULE`**: when `KOTOR_HMR_E2E_MODULE` is also set (e.g. `end_m01aa`), call `window.__KOTOR_HMR_TEST__.startQuickPlayToModule()` after menu ready, then assert module + player position survive probe HMR.
- Use Node-side polling (2s interval) rather than long `page.waitForFunction` to avoid Puppeteer protocol timeouts on multi-minute loads.
- Set `protocolTimeout` and `--disable-dev-shm-usage` for headless Chromium on large asset loads.

### HmrTestBridge quick-play

`startQuickPlayToModule` mirrors CharGen quick-play: init CharGen template, save player template, init game-in-progress folder, `LoadModule(name)`. Snapshot uses `module.filename` (not `module.name`) for comparison with env module id.

### KeyMapper guards

Real load initializes gamepad and action processors before all `KeyMapAction` entries exist. Use helpers that skip missing entries:

```typescript
static setActionProcessor(action: KeyMapAction, callback: KeymapProcessorCallback) {
  const entry = KeyMapper.Actions[action];
  if (entry) entry.setProcessor(callback);
}
```

Same pattern as `setGamepad` in `BindGamepad`.

## Why This Matters

Without guards, a single undefined `KeyMapAction` entry throws during init and blocks reaching `GameState.Ready` in real-asset e2e. Without quick-play bridge, in-module HMR proof required fragile canvas/menu automation.

## When to Apply

- Adding HMR or dev-FS test paths that load real game data locally.
- Any init path that binds processors to sparse `KeyMapper.Actions` tables during partial startup.

## Examples

```bash
# CI path (synthetic)
npm run test:hmr-e2e

# Local real assets to main menu
KOTOR_DEV_GAME_DIR=/path/to/swkotor npm run test:hmr-e2e

# Local in-module HMR preservation
KOTOR_DEV_GAME_DIR=/path/to/swkotor KOTOR_HMR_E2E_MODULE=end_m01aa npm run test:hmr-e2e
```

## Related Issues

- PR #101 — HMR dev stack and session preservation
- Prior plan: in-game HMR verification (R6 partial → in-module e2e)
