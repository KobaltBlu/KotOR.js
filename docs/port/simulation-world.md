# World and module lifecycle port

## Scope and provenance

Source: the original `kotor.js` working tree, including staged changes, based on `ea9491d5` and committed through `f8bfc1e21f306d36d29c657cae2d3bb96bc6cd89`. Destination baseline: upstream `002dfe03b9a59ad2adda6404d9632fc78d5bedff`. The original checkout and Git index are unchanged.

All 21 paths owned by this slice are ported. Three-way candidates normalize relative source imports to the target's `@/` convention. The two textual conflicts were resolved explicitly, not with an ours/theirs preference. No original contribution path in this slice was deferred.

## Path-by-path disposition

| Path under `src/module/` | Disposition and behavior retained |
| --- | --- |
| `AreaMap.ts` | Ported fog-of-war serialization: pack only explored pixels, rebuild bytes rather than accumulating stale bits, and preserve partial final bytes. Upstream map changes retained. |
| `AreaWeather.ts` | Ported stable current-weather selection and replacement of an existing weather model before loading. Restored weather state is not randomly selected again. |
| `Module.ts` | Reconciled player-versus-protagonist templates, location-effect loading/cleanup, exception-safe event/effect teardown and object-ID synchronization. Retained upstream `LoadFromArchives` and Forge in-memory module-preview entry points. Kept upstream spell-effect audio priority while using the ported attached-effect object. |
| `ModuleArea.ts` | Ported bounded object-update fault handling, comprehensive object-list teardown, party reconstruction, loose-item load/save, music-manager hooks, weather/restriction/stealth/fog persistence, and optional world-time scaling. Upstream area/model-loading changes retained. |
| `ModuleAreaOfEffect.ts` | Ported object registration, scripts and action restoration, orientation aliases, saved object references, heartbeat time and coherent position/orientation field names. |
| `ModuleCamera.ts` | Ported quaternion-derived camera orientation and proper FLOAT, ORIENTATION and VECTOR serialization. |
| `ModuleDoor.ts` | Ported safe collision updates, key-unlock feedback, absent-walkmesh fallback, locals/actions, idempotent destruction and expanded door persistence. Retained upstream door changes. |
| `ModuleEncounter.ts` | Ported integer locals, action restoration, localized name handling, template metadata and idempotent destruction. |
| `ModuleMGEnemy.ts` | Ported deterministic field initialization, script loading, safe absent-model bounds, normalized track references and explicit unsupported runtime-state persistence marker. |
| `ModuleMGGunBank.ts` | Ported per-bank fire cooldown, missing-bullet/hook guards, sound naming and safe bullet initialization. |
| `ModuleMGObstacle.ts` | Ported layout-driven placement, optional templates, correct script-resource lookup, load initialization and explicit runtime-state persistence limitation. |
| `ModuleMGPlayer.ts` | Ported asynchronous camera loading, script loading, room-ID handling, reset of initialization data and normalized track references. Explicit runtime-state persistence limitation retained. |
| `ModuleMGTrack.ts` | Ported layout placement and initialization; explicit runtime-state persistence limitation retained. |
| `ModuleMiniGame.ts` | Ported direct player construction, obstacle-template lookup/loading, safe missing-track handling, bounding-box initialization and continue-on-missing enemy script behavior. Explicit runtime-state persistence limitation retained. |
| `ModulePath.ts` | Ported line-of-sight graph connections for both endpoints and preservation of a failed/empty search result rather than returning an unsafe straight-line fallback after a blocked graph search. |
| `ModulePlaceable.ts` | Ported key feedback, corrected locking condition, source stack quantity, open/container flags, integer locals/actions, idempotent teardown and expanded persistence. Retained upstream placeable changes. |
| `ModuleRoom.ts` | Ported idempotent destruction guard while retaining upstream room rendering/model changes. |
| `ModuleSound.ts` | Ported localized names, continuous flag, reset of sound lists, integer locals/actions, template metadata and idempotent teardown. Retained upstream priority-group routing and distance/variance behavior. |
| `ModuleStore.ts` | Ported customer buy/sell direction checks, on-open script loading and customer execution context, template-resref fallback, actions, robust teardown and persistence of script/template metadata. |
| `ModuleTrigger.ts` | Ported ordinary friendly trigger enter/exit handling, trap-specific gating, initial overlap suppression only for transitions, integer locals/actions, corrected field names and idempotent teardown. Retained upstream trigger dialogue/action APIs. |
| `ModuleWaypoint.ts` | Ported action restoration and complete map-note/description/orientation/template metadata persistence with idempotent teardown. |

## Explicit reconciliation details

- `Module.addEffect` uses the local attached object's position/rotation/quaternion and async-load lifetime check, while preserving `AudioPriorityGroup.NORMAL_SPELL_EFFECTS` from upstream.
- `ModuleSound` imports both upstream `AudioPriorityGroup` and the original contribution's `CExoLocString`.
- An upstream type-contract mismatch was corrected: `CExoLocString` takes a numeric TLK reference, so a fallback literal name now uses `new CExoLocString().addSubString(name)` rather than passing the name to the constructor.
- `GameEffect.loadModel()` is declared `void` on the base class, although implementations can be asynchronous. The effect-load result is explicitly received as `unknown` before promise detection; this preserves synchronous and asynchronous behavior without assuming an inaccurate base return type.

## Cross-subsystem contracts

These are deliberate dependencies on the other slices of the integrated port, not optional fallback implementations:

- `ModuleObject`: `destroyed`, `destroying`, idempotent cleanup, numeric-local restoration, action serialization and persisted state support.
- `ModuleObjectManager.SyncCount(minimum)`: invoked after module object loading and again after saved inventory loading.
- `PartyManager.RebuildPortraitOrder()`, `GetCreatureStartingPartyIndex`, `ActualPlayerTemplate`, `PlayerTemplate`, `CurrentMembers`, `LoadPartyMember` and preserved protagonist identity during saving.
- `GameState.MusicManager`: `UpdateAreaMusicState`, `playAreaMusic`, `stopAreaMusic`, `setAreaMusicDelay`, `setAreaDayTrack`, `setAreaNightTrack`, `playBattleMusic`, `stopBattleMusic`, `setBattleTrack` and `setBattleStinger`.
- `RuntimeFaultManager.run` and `CheatConsoleManager.getWorldDeltaScale()`. The latter's ordinary-play default must remain `1`.
- `AudioEmitter.setPriorityGroupId`, plus the upstream priority-group enum and routing behavior.
- `EffectVisualEffect` asynchronous loading/removal must cooperate with the location-effect attached object and must not resurrect visuals after disposal.
- `ModuleItem.save()` returns a `GFFStruct`; creature and module entity saves retain their existing `GFFObject` contracts.

Minigame runtime-state persistence is explicitly unsupported in the original contribution for the marked classes. This port preserves that limitation; it does not claim to add complete mid-minigame save/load support.

## Validation

Added `src/tests/simulation-port-world.test.ts`. It executes the actual implementation source with minimal engine-boundary doubles, avoiding browser/renderer initialization and proprietary game assets. It covers fog bytes and round-trip alpha pixels; all merchant flag combinations; on-open customer context; friendly trigger entry/exit/re-entry; trap hostility/one-shot gating; transition overlap suppression; and localized literal sound names.

At `kotor-integrated-port@r5`, Jest reported **10 tests passed, 1 suite passed**. The overall process exited **1** because the existing unrelated `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap` was reported obsolete. That snapshot was not deleted or updated. These results are behavioral unit-test evidence, not a green full-suite claim.

An intermediate project-wide `tsc --noEmit --pretty false --listFiles false` at `kotor-integrated-port@r3` exited 2. It exposed the two world type mismatches corrected above, expected missing contracts from parallel slices, and unrelated upstream diagnostics (including React JSX and compiler/decompiler types). Final integrated type/build checks remain the parent integration stage's responsibility.

No gameplay, WebGL visual check, asset-backed module transition, real save compatibility or audio-device test has been performed in this slice. Acceptance testing should include Endar Spire scripted triggers, doors/keys, module transitions, creature identity/party portraits after save/load, loose items, stores, area music, location VFX teardown, fog persistence and minigame track/obstacle loading.
