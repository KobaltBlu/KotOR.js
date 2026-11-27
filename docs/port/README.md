# Integrated playable-branch port

## Scope and provenance

This is one integrated contribution on top of upstream `002dfe03b9a59ad2adda6404d9632fc78d5bedff`, reconciling the original playable `kotor.js` worktree (committed HEAD `f8bfc1e21f306d36d29c657cae2d3bb96bc6cd89`, including its staged changes) relative to shared ancestor `ea9491d5`.

The original checkout is a read-only reference. The port does not publish its private Git history, copy game assets/saves/logs, or downgrade the target dependency lockfile. The implementation was prepared as a single applyable patch for `kotor.js-port`, not written into the original checkout. No Git commit or public PR was created during preparation.

The acceptance target is recovery of the original Endar Spire → Taris experience on current upstream. **That playthrough has not yet been repeated on this port.** Early TSL functionality is recovered contribution work, not a claim of complete TSL support.

## Contribution inventory

[The exhaustive inventory](inventory.md) accounts for **all 276 original changed paths**, independently enumerated from Git rather than inferred from worker outputs:

| Disposition | Paths |
| --- | ---: |
| Ported / reconciled into changed destination files | 227 |
| Current upstream retained, with subsystem-specific rationale | 40 |
| Empty original placeholders omitted | 4 |
| Large routine-metadata JSON files replaced by compact upstream-derived metadata | 2 |
| Original initializer translated into current app initializer | 1 |
| Current upstream dependency lockfile retained | 1 |
| Operating-system metadata excluded | 1 |

There are additional destination paths for named upstream scripting modules, regression tests, integration repairs and this documentation. Therefore the final patch file count is not the original contribution count.

Subsystem ledgers:

- [Scripting architecture, routine ABI and saved script state](scripting.md)
- [Simulation, combat, actions, entities and pathfinding](simulation.md)
- [Save/load, party, journal, inventory and managers](state.md)
- [K1/TSL menus, launcher, Forge and Electron](interface.md)
- [Audio, music, dialogue, cutscenes, rendering and VFX](audiovisual.md)
- [Archives, serialization and diagnostics](resources.md)
- [Central GameState, initialization and exports](integration.md)

Those ledgers retain historical isolated-slice checks and integration contracts. **The final combined results below supersede earlier notes about missing sibling APIs or tests blocked before integration.** Slice-local revision labels describe their implementation-stage snapshots; the authoritative complete production-code check is `kotor-integrated-port@r115`.

## Important reconciliations

- NWScript remains organized into searchable domain modules, preserving the public action-map API. Fixtures independently extracted from upstream check **772 K1 and 877 TSL action IDs/signatures**, and retained upstream action bodies have AST-hash tests. Engine-specific IDs are not inherited merely because their numbers match.
- Newer upstream real implementations are not replaced by old local stubs. Diagnostic fallbacks remain explicitly unimplemented placeholders, not claimed game support.
- Upstream Bink decoder improvements, modern GUI list APIs, current application architecture, Forge functionality and modern particle/emitter behavior are retained.
- **Intentional visual difference:** the modern upstream instanced first-mesh particle chunk backend remains. The original full animated/multi-mesh model-per-particle backend was not transplanted. Asset-backed visual comparison is still needed for that specific residual feature.
- Original schema and GraphicsManager files are zero-byte placeholders. No fictitious schema or graphics API was added.
- Enhanced lightsabers and time-dilation/cheat features remain optional; normal gameplay does not require enabling cheats.

### Repairs made during combined integration

Script `EffectDamage` now populates one damage slot instead of duplicating typed damage into physical slot 14. Tests execute the registered K1/K2 routines and actual damage-effect application, including immunity without physical leakage.

`ModuleObject.clearAllEffects()` now supplies the lifecycle API required by preserved upstream surrender behavior. It uses existing effect-removal callbacks and tolerates reentrant/sibling removal and pending visual loads.

Video-effect motion input uses current static gameplay key bindings, including strafing, and preserves partial analog input. The bounded diagnostic frame-delta accessor was restored without changing upstream simulation timing.

Browser startup exposed an existing launcher canvas/CORS defect. A named `launcherBackground` helper now handles unsupported/tainted canvas fallback, canceled and stale profile loads, timeouts and object-URL cleanup while preserving layout/artwork/feed URLs.

## Validation

All source validation ran in **protected discard-only Workspace Projection**, not against unapplied drafts accidentally assumed to be live disk. Final production code and tests were checked at **`kotor-integrated-port@r115`**; subsequent contribution inventory/summary/README changes are documentation only. Temporary merge scripts and auxiliary test substitutes are not dependencies of the deliverable.

| Check | Unmodified upstream | Integrated production code r115 |
| --- | --- | --- |
| Full TypeScript `--noEmit` | 145 diagnostics, exit 2 | 141 diagnostics, exit 2; **zero introduced diagnostic signatures**, four resolved |
| Full Jest suite | 23 passed suites, 8 failed, 1 skipped; 107 passed tests, 6 failed, 32 skipped | 47 passed suites, 8 failed, 1 skipped; **361 passed tests**, 6 failed, 32 skipped |
| Added regression coverage | None from this port | **24 added suites / 254 added passing tests** |
| Production webpack | Not required as a baseline comparison | **Pass**, all five configurations, with warnings |
| Electron TypeScript compilation | Not required as a baseline comparison | **Pass** |

The same eight upstream suites remain failing: seven Forge suites and `NWScriptDecompiler.integration.test.ts`. The pre-existing orphan `odysseyModelAscii.test.ts.snap` also remains. No existing tests, snapshots or compiler checks were disabled or weakened to obtain these results. **The overall typecheck and full test suite are not green.** See [machine-readable comparison](validation-summary.json) for diagnostic deltas and exact failing suite paths.

Commands used:

- `node node_modules/typescript/bin/tsc --noEmit --listFiles false --pretty false`
- `node node_modules/jest/bin/jest.js --runInBand --coverage=false`
- `npm run webpack:prod`
- `npm run electron:compile`

Dependencies were installed from the target lockfile with `npm ci --ignore-scripts --no-audit --no-fund`. This intentionally did not run package lifecycle scripts; the Electron binary may need its normal installation step before a later desktop launch. Electron compilation is not a packaged-app or desktop-runtime test.

### Isolated browser smoke checks

The launcher, empty Forge editor and game EULA/directory-access setup screen loaded without observed module-evaluation exceptions. No game installation, saves or original browser profile were accessed.

After the background repair, the launcher was checked again on r115: repeated rapid K1/TSL/Forge switching, waiting for artwork completion, and a 320×480 mobile drawer/profile-selection flow. The earlier canvas DOMException did not recur and no stale-profile artwork overwrite was observed. Remote artwork CORS rejections and the optional YouTube-feed fetch error remained; ordinary-image fallback kept the launcher usable. This is **not** an error-free-console or gameplay claim.

## Apply, test and submit

Apply only the integrated port patch; do not apply the auxiliary reconciliation-tools set. The target's package versions and lockfile are unchanged. Before applying, a topic branch such as `contrib/gameplay-port` can be created in `kotor.js-port` with `git switch -c contrib/gameplay-port` if not already on a contribution branch. Do not run that command in the original reference checkout.

Then follow [the gameplay acceptance checklist](gameplay-acceptance.md), using backed-up/copy saves and isolated application storage. Separate source folders alone do not isolate Electron/browser saves or preferences. Compare against the original build where a behavior is uncertain.

Once acceptance testing is satisfactory, the changes can be committed on that target topic branch and submitted as one integrated PR. The subsystem ledgers support a navigable commit breakdown, but do not require separate PRs. Inspect the staged file list before publishing: never include proprietary resources, snapshots containing game/user state, local logs or private history.
