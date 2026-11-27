# NWScript port ledger

## Baselines and scope

Source: the original `kotor.js` worktree, including staged work, based on shared ancestor `ea9491d5`. Target baseline: upstream `002dfe03b9a59ad2adda6404d9632fc78d5bedff`. The source checkout was not changed. This ledger covers every original changed path under `src/nwscript/`.

## Architecture

`NWScriptDefK1.Actions` and `NWScriptDefK2.Actions` retain the public map shape used by the interpreter, compiler, decompiler and tooling. The monolithic definitions are replaced with explicit named-domain imports and `buildReconciledActionMap`.

The assembly order is deliberate:

1. Compact canonical upstream ABI metadata establishes every engine-specific ID, name, return type and argument signature.
2. Authored domain definitions supply local behavior, with duplicate-ID and ABI mismatch rejection.
3. Explicit `builtins/upstream` maps supply preserved newer upstream bodies instead of local stubs or placeholders.

K1/K2 routine inheritance is matched by name, not blindly by numeric ID. For example, K1 770 is `PlayMovieQueue`, while K2 770 is `EffectForceBody`; real movie routines are installed at K2 805–807 instead.

The original typed builder preserves `this` binding, parameter order, hidden engine-specific parameters, defaults and explicit variants. It now rejects duplicate active IDs rather than silently overwriting them. There are 653 authored definitions and no duplicate IDs in the original collection.

## Exhaustive original-path disposition

All paths below are relative to `src/nwscript`.

| Original path(s) | Disposition |
| --- | --- |
| `NWScriptDefK1.ts`, `NWScriptDefK2.ts` | Replaced by small explicit assembly entry points. All 772 K1 and 877 K2 ABI entries are checked against an upstream-derived fixture. |
| `NWScriptStack.ts` | Ported pointer-slot units, unique `TotalSize` and restore handling. Regression tests additionally found and fixed numeric type tags being encoded as text CHAR values; type tags now serialize as BYTE and legacy decimal-string tags are accepted. Null object references serialize as invalid objects. |
| `NWScriptInstructionSet.ts` | Ported encoded `STORE_STATE` continuation offset and unknown-action guards; preserves upstream imports. |
| `builtins/actionBuilder.ts` | Ported and hardened; direct tests cover binding, inflation, engine variants, falsy defaults and duplicate rejection. |
| `builtins/index.ts`, `builtins/objects.ts` | Ported explicit domain aggregation and exports. |
| `builtins/audio.ts`, `combat.ts`, `core.ts`, `creatures.ts`, `dice.ts`, `doorsplaceables.ts`, `effectManagement.ts`, `effects.ts`, `encounters.ts`, `events.ts`, `faction.ts`, `galaxy.ts`, `globals.ts`, `items.ts`, `itemsLegacy.ts`, `journal.ts`, `k2special.ts`, `localvars.ts`, `mathString.ts`, `minigame.ts`, `miscLegacy.ts`, `missing.ts`, `movement.ts`, `party.ts`, `perception.ts`, `scripting.ts`, `talents.ts`, `traps.ts`, `ui.ts`, `video.ts`, `world.ts` | Ported with upstream alias imports. Newer upstream bodies take precedence over overlapping local stubs, via explicit named upstream-domain maps. Original substantive TSL implementations, including skill adjustments/base ranks, spell costs, combat-queue queries, party and UI behavior, remain available. |
| `builtins/dialog.ts` | Ported ownership/listener and explicit range handling. K1 now exposes upstream's additional `bUseLeader` argument in its ABI rather than consuming only eleven arguments. |
| `builtins/effectsLegacy.ts` | Ported. TSL `EffectDeath` now consumes its third upstream `nNoFadeAway` argument. The effect's existing implementation semantics are retained; the extra flag is not presented as newly implemented behavior. |
| `builtins/objects/animation.ts`, `combat.ts`, `conversation.ts`, `economy.ts`, `effects.ts`, `equipment.ts`, `feedback.ts`, `interaction.ts`, `inventory.ts`, `lifecycle.ts`, `minigame.ts`, `module.ts`, `party.ts`, `perception.ts`, `progression.ts`, `query.ts`, `relations.ts`, `skills.ts`, `spellcasting.ts` | Ported with upstream alias imports and preserved local behavior. |
| `builtins/objects/control.ts` | Ported; integer script booleans are converted to booleans before calling upstream's `setCommandable` API. |
| `engineRoutineFallbacks.ts` | Reconciled: preserves explicitly diagnostic fail-soft placeholders, identifies K1 versus TSL correctly, warns once per engine/ID and exposes `isEngineRoutineFallback`. Placeholders never override real preserved bodies. |
| `k1_nwscript_engine_routines.json`, `tsl_nwscript_engine_routines.json` | Superseded by compact `routineMetadata.ts`, extracted from checked upstream action tables. The two roughly 2 MB JSON files duplicate declarations, parsed documentation and raw comments; they are not copied. All routine IDs/signatures remain covered without shipping raw parse artifacts or requiring JSON imports. |

No proprietary game assets, game-state snapshots, logs or binaries are included in this scripting contribution.

## Upstream reconciliation

An AST comparison found 86 K1 action bodies changed since the shared base (83 newly added bodies and three modified existing bodies). The port retains the newer behavior rather than overlaying the old action tables wholesale.

95 upstream action entries are extracted into cohesive modules under `builtins/upstream`: `camera`, `creatures`, `effects`, `feedback`, `inventory`, `math`, `minigame`, `movement`, `party`, `perception`, `time`, `video`, and `world`. These include changed bodies and pre-existing entries necessary to avoid replacing upstream behavior with a local stub. Each preserved body has an upstream-derived AST hash fixture. The maps explicitly wire 95 K2 inherited/name-matched counterparts too.

Four overlapping changes are deliberately reconciled in the authored modules instead of copied verbatim:

- **106 `GetObjectType`:** local implementation retains all upstream object classifications and adds AREA support.
- **139 `GetAbilityScore`:** local implementation follows the declared object-then-ability ABI. The newer upstream body reverses these two arguments; copying it verbatim would break ordinary calls. Tests exercise both engine variants.
- **204 `ActionStartConversation`:** retains the original branch's ownership/listener handling and explicit `bIgnoreStartRange` behavior instead of restoring upstream's unconditional range bypass. The newer K1 signature is retained.
- **241 `DestroyObject`:** retains upstream delayed destruction/fade handling for creatures and placeables plus the local inventory-detachment fix for items.

`PlayMovieQueue` retains upstream's updated skip handling and no-argument `VideoManager.playMovieQueue()` API. K2's previously stubbed movie IDs receive these real implementations by routine name.

## Deterministic validation

The focused suites are:

- `src/tests/nwscript/actionBuilderPort.test.ts`: 8 builder cases.
- `src/tests/nwscript/scriptStatePort.test.ts`: 7 saved-state/instruction cases.
- `src/tests/nwscript/routinePort.test.ts`: ABI parity for both engines, implementation preservation, AST body hashes, inheritance precedence, and representative gameplay behavior.

Fixtures `upstreamActionManifest.json` and `upstreamPreservedBodies.json` were extracted from the recorded upstream Git revision, not from the assembled port's action maps.

The isolated routine harness loads real definition/registration code, enums, `BitWise` and Three, while supplying controlled engine dependencies. It does not establish full browser-engine integration or replace type/build checks and gameplay testing.

Initial focused invocation at `kotor-integrated-port@r11` passed all 26 then-existing assertions (exit 0). Two additional behavior cases cover conversation range and boolean commandability; the final revision is re-tested by the implementation owner. The whole-root Jest invocation has an unrelated upstream orphan snapshot; focused checks use `--roots src/tests/nwscript` without removing or rewriting that snapshot.

A full TypeScript check of the scripting-only patch was run and failed, as expected before sibling subsystems were integrated. The new scripts require the original branch's `AudioEngine.percentageToNormalizedGain`, journal-world entry methods, `JournalManager.AwardPlotXPByTag`, creature properties/methods (`stealthMode`, `switchWeapons`, `orientOnClick`, `keepStealthInDialog`, `aiLevel`, `getCommandable`), `ModuleStore.runOnOpenStore`, and `GameState.disableHealthRegen`. These are owned by the corresponding audio, state, simulation and central integration ports; final checks must confirm their contracts.

One upstream body also calls `ModuleCreature.clearAllEffects`, which does not exist in the inspected upstream or original module declarations. The full integration should supply the intended effect-removal API or explicitly reconcile that routine; do not suppress the error or silently drop the upstream functionality. Existing compiler/parser diagnostics remain outside this contribution's behavioral refactor.

## Remaining acceptance work

After integrating all subsystem patches, run the full type/build/test comparison against baseline, then exercise the Endar Spire-to-Taris scenarios. Passing the scripting unit tests is not a claim of a completed game playthrough or fully implemented K1/TSL routine coverage. Explicit legacy stubs and metadata fallbacks remain diagnostic placeholders.
