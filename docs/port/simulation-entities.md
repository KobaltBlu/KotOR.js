# Core entity port ledger

Source: original `kotor.js` worktree (including staged changes), contribution base `ea9491d5`. Destination baseline: upstream `002dfe03`. Original source and both Git histories remain untouched. This ledger covers exactly four source-contribution paths; other simulation paths belong to the action/combat/world ledgers.

## File-by-file disposition

| Source path | Disposition | Recovered behavior and reconciliation |
| --- | --- | --- |
| `src/module/ModuleCreature.ts` | Ported and reconciled | Deferred damage applies effect objects; effects update safely during removal; optional movement/regen controls; weapon switching; correctly named commandability methods plus backward-compatible misspelled aliases; class-only BAB, ability/finesse/effect/item attack modifiers; constitution-based level-up HP; request-generation guards for body/head/equipment loading; full equipment slots and powered state; richer save fields, correct Constitution/BodyVariation/SubraceIndex/willbonus, finite SHORT serialization and facing vectors; strict item stack identity on load; guarded teardown. All nine three-way conflict blocks resolved explicitly. Upstream audio priority routing, nullable creature appearances, movement fallback values, sound-set handling, head tracking and newer model-loading APIs retained. |
| `src/module/ModuleObject.ts` | Ported and reconciled | Rendering enable flag; user-defined event routing for areas/encounters; inventory routing for party members; property-aware stacking and counted removal; asynchronous effect application after model readiness with cancellation when removed/destroyed; idempotent, isolated cleanup. Both destruction conflicts resolved with the original cleanup structure plus upstream fallback to current module area and preservation of position/rotation/quaternion references. Duplicate commandability stub removed while retaining the legacy alias. |
| `src/module/ModuleItem.ts` | Ported and reconciled | Safe names/descriptions; positive finite stack counts; property-aware stack identity; attack/enhancement/penalty/damage helpers; template load tracking and stack preservation; upgrade-byte sentinel normalization; complete resource/stock/save fields; powered-state retention and optional enhanced lightsaber integration. Upstream unrelated behavior retained through a normalized clean three-way merge. |
| `src/module/ModulePlayer.ts` | Ported | Saving updates both `PartyManager.PlayerTemplate` and `ActualPlayerTemplate` with the current serialized player. Upstream import layout retained. |

No contributed feature from these four files was intentionally deferred. Particle/emitter implementation is not replaced by these files.

## Integration corrections made during the port

- Preserve `setCommadable`/`getCommadable` aliases for current-upstream call sites, while new callers use correctly spelled names. Do not leave duplicate `setCommandable` implementations after the merge.
- Invalidate pending creature/item model requests on destruction; stale body-load failures cannot install a replacement model into a destroyed/newer entity. Guard late hand-model attachment against a changed equipment slot.
- Unequipping detaches an item and returns it to inventory without destroying that same object. The old per-slot implementation sometimes added the object to inventory and immediately destroyed it. The new path handles every named equipment slot, including hide/claws/secondary weapons, and only reloads body/head models when necessary. NPC equipment is removed from/restored to its inventory consistently.
- Cloning an item serializes current state into an independent GFF tree, clears `ObjectId`/`ID` before constructing the new instance, and does not mutate the source blueprint or its stack count.
- Non-finite counts cannot enter item stacks; counts are integral and bounded by their WORD serialization representation.
- Disabled enhanced lightsabers do not allocate enhanced geometry; existing effects are still updated when toggled off.
- Rejected effect model loads retain the original fallback application behavior, but an exception thrown by `onApply` is logged rather than interpreted as a load failure and applied twice.
- Retain upstream transform references after destruction. Local cleanup of other resources and manager detachment remains idempotent.

## Contracts expected from sibling ports

### Diagnostics / central state

`GameState.CheatConsoleManager.getMovementSpeedMultiplier(creature)` returns the ordinary multiplier `1` when no cheat is active. `GameState.disableHealthRegen` exists and defaults to normal gameplay behavior (false). These controls are optional; normal gameplay must not require enabling cheats.

### Rendering

`@/three/odyssey` exports `OdysseyLightsaberEffect`, with `FromSaberMesh(mesh, color)`, `setColor`, `setOpacity`, `setPowered`, `update`, and ordinary Object3D properties. `OdysseyModel3D` continues to expose materials, opacity, animationManager, odysseyAnimationMap, hand/head hooks and disposal. Enhanced-saber effects live in `model.userData.qolLightsaberEffects`; renderer disposal must clean them up. This port does not restore the old emitter implementation.

### Combat

`CombatRound.GetMod` supplies the ability-score modifier. Item properties support attack penalty, to-hit penalty, enhancement and damage values. Creature methods now distinguish `getClassBaseAttackBonus` / `getBaseAttackBonus` from the combined `getAttackModifier(weapon)`; callers needing a full attack modifier must use the latter. Creature deferred damage records may carry an effect to apply instantly at the scheduled hit time.

### Inventory, party and scripts

InventoryManager accepts existing ModuleItem objects, merges only `canStackWith` matches, and supports counted removals. PartyManager exposes `ActualPlayerTemplate`. Existing action/script callers of the misspelled commandability methods remain supported. `ModuleItem.clone()` produces a distinct registered object ID rather than reusing the source ID. Save-related resource helpers remain the upstream GFF API; these four files add no dependency on the new schema layer.

## Verification performed

- Generated candidates were checked for unresolved merge markers.
- TypeScript parsing succeeded for all four reconciled classes.
- A TypeScript AST method-name comparison found no upstream method names removed and no duplicate methods in the reconciled classes. This is a structural check, **not** proof of signature or behavioral equivalence.
- The final formatting minimization restores upstream whitespace only where both per-member and whole-file token/comment streams are unchanged; unrelated source formatting is otherwise left intact rather than risking a semantic rewrite.
- Projected typecheck of `kotor-integrated-port@r7` ran and exited 2. The only diagnostics in these four files were the three planned sibling contracts: `getMovementSpeedMultiplier`, `GameState.disableHealthRegen`, and the `OdysseyLightsaberEffect` export. Initial duplicate-method and void-result errors were fixed. The full diagnostic log is a temporary validation output, not contribution source. Later r8 only restores token-identical formatting in two classes.
- Added `src/tests/simulation-port-entities.test.ts`: stack normalization/identity, non-stackable item behavior, removed asynchronous effect cancellation, and single application on callback failure. The focused Jest run against r5 **did not execute tests**: compilation stopped at the pending `OdysseyLightsaberEffect` export. Tests must be rerun after all subsystem outputs are integrated. No check has been disabled to manufacture a pass.

## Remaining acceptance work

Run the complete integrated typecheck and focused tests after sibling dependencies land. Then check equipment replacement/unequip/re-equip, finite-stock and infinite-stock transactions, same-tag differently modified items, stale party-preview model loads, destruction during model/VFX loading, default (cheats-disabled) combat, and player save/load round trips in the game. No gameplay acceptance is claimed by this ledger.
