# Simulation, combat, movement and entity port

## Scope

All **60 original contribution paths** classified as `simulation` by the port inventory are included. Source is the immutable original `kotor.js` worktree, including staged changes, compared with shared base `ea9491d5`; target baseline is upstream `002dfe03`. No simulation contribution path was silently omitted or deferred. Both checkouts' production source and Git history remain unchanged on disk; the implementation is in the integrated patch set.

The path accounting is exhaustive across four ledgers:

| Slice | Paths | Ledger |
| --- | ---: | --- |
| Actions, movement scheduling, avoidance and computed paths | 27 | [simulation-actions.md](simulation-actions.md) |
| Creature, object, item and player entities | 4 | [simulation-entities.md](simulation-entities.md) |
| Areas, module lifecycle, doors, stores, triggers, encounters and minigames | 21 | [simulation-world.md](simulation-world.md) |
| Combat, damage, item properties and control integration | 8 | The table below |

## Combat and control path ledger

| Original / target path | Outcome |
| --- | --- |
| `src/combat/CombatAttackData.ts` | Ported melee/unarmed strength, enhancement damage, and delayed typed damage effects. Corrected active power-feat bonuses so owning several ranks does not grant cumulative passive damage. Non-creature targets receive damage immediately because only creatures drain delayed-damage queues; this prevents doors/placeables becoming immune to delayed weapon impacts. Unarmed killing blows are recorded. |
| `src/combat/CombatRound.ts` | Ported separate natural roll / modifier / total roll, natural 1/20 rules, AC equality, natural-roll critical range, creature-only animation reactions and impact-time damage. Retains existing upstream behavior outside this delta. Additional attacks dynamically grow storage rather than failing after five; all allocated entries are reset and considered for killing blows. Invalid targets and missing models are handled without dereferencing them. |
| `src/combat/SpellCastInstance.ts` | Ported last-Force-power success state for owner/target. Reconciled projectile and hand-effect lifecycle with async cancellation: late loads are disposed, completed impacts cannot resurrect projectiles, timers capture their own model and are cleared during idempotent disposal. Loader rejections are caught. |
| `src/controls/IngameControls.ts` | Reconciled sprint-modifier input with all newer upstream canvas-overlay filtering, keyboard/gamepad interaction, movie skipping and GUI navigation. No input architecture rollback. |
| `src/effects/EffectDamage.ts` | Ported nonnegative typed-slot aggregation, immunity, resistance and physical reduction, with optional one-punch behavior gated by the cheat manager. Fixed mutation-unsafe effect iteration so exhausted defensive effects do not skip subsequent effects or cause an out-of-bounds crash; non-finite slot values cannot contaminate HP calculations. Corrected slot comments to match the actual enum. |
| `src/engine/ItemProperty.ts` | Ported absent cost-table guards, historical field-name aliases, byte sentinel normalization and coherent save labels. Damage-die side strings from 2DA tables are parsed numerically rather than silently falling back to d8. |
| `src/engine/menu/ActionMenuManager.ts` | Ported plot-object protection: destructive attack/mine options are not offered for plot doors or placeables. Existing security/unlock interactions remain available. |
| `src/engine/rules/SWCreatureAppearance.ts` | Ported removal of noisy per-load body-model debug logging; behavior otherwise unchanged. |

## Preservation and reconciliation

- Imports follow the target's `@/` convention. Existing upstream API additions remain rather than replacing entire classes with April versions.
- The action/world/entity ledgers document each conflict and behavior decision, including `Module.LoadFromArchives`/Forge preview support, audio priority groups, nullable appearances, head tracking, transform retention on destruction and current model-loading APIs.
- Current upstream particle/controller/model architecture is not replaced by this slice. Enhanced lightsabers integrate through the rendering slice's export and existing model hooks.
- The original explicitly unsupported mid-minigame runtime-state persistence remains unsupported; this port does not falsely advertise it as implemented.
- Existing incomplete combat rules are not claimed to be a full rules-engine conformance implementation. This port preserves the contribution's reduction/immunity policy while correcting the concrete integration and lifetime defects described here.

## Integration contracts

The complete port must supply the following restored APIs; temporary test substitutes are not production dependencies:

- `RuntimeFaultManager.run<T>` for action and module update fault isolation.
- `ModuleObjectManager.SyncCount`, `PartyManager.RebuildPortraitOrder`, player/protagonist templates including `ActualPlayerTemplate`, and counted inventory operations returning the removed item object.
- `GameState.MusicManager` area/day/night/battle/stinger methods and the rendering export `OdysseyLightsaberEffect` with its original item-facing API.
- `GameState.disableHealthRegen` must default to `false`; `CheatConsoleManager.getMovementSpeedMultiplier` and `getWorldDeltaScale` must default to `1`. `setSprintModifierDown`, `shouldApplyOnePunch`, and `getOnePunchDamage` must not alter ordinary gameplay when their cheats are disabled.
- Creature attack callers requiring the full modifier use `getAttackModifier(weapon)`, not the now class-only `getBaseAttackBonus`.
- **Important NWScript damage integration:** the original `builtins/effects.ts` `EffectDamage` routine writes both the requested typed slot and slot 14 as a legacy total. With the newly ported aggregation, that would double-count typed script damage. The scripting/integration slice must emit the damage into only the intended slot(s), not duplicate the same amount into the physical slot. This file is owned by the scripting slice and is intentionally not edited here.

## Verification

Added `src/tests/simulation/simulation-port-combat.test.ts`, which executes projected implementation source against minimal engine-boundary doubles without game assets, WebGL or a browser. It covers natural-roll and AC boundaries, non-guaranteed critical threats, more than five attacks, selected rather than passively owned power feats, melee/ranged strength, delayed typed creature damage, immediate non-creature damage, typed immunity, finite resistance exhaustion, physical reduction budgets, item aliases/die strings and a cancelled asynchronous projectile load.

The final combat suite passed **18 tests, exit 0** against protected discard-only projection **`kotor-integrated-port@r27`**, including the door/placeable delayed-damage regression. The subsequent ledger update changes documentation only; tested implementation and test bytes are unchanged.

Command: `node node_modules/jest/bin/jest.js --runInBand --no-cache --coverage=false --roots src/tests/simulation --runTestsByPath src/tests/simulation/simulation-port-combat.test.ts`.

The initial 17-case run at `r24` also passed. Neither run depended on temporary production-source overrides from the auxiliary tooling set.

`tsc --noEmit --pretty false --listFiles false` against `kotor-integrated-port@r24` exited **2**. Diagnostics in owned simulation files were exclusively still-missing parallel-slice APIs listed above. The project also reported unrelated upstream/app/compiler errors; this is not a passing typecheck claim. Full integrated validation remains mandatory after every sibling slice joins.

Action regression tests passed 15 tests in their scoped run. World tests passed 10 assertions but the process reported the pre-existing orphan snapshot outside their scope; it was not deleted or updated. Entity tests were blocked at compilation by the not-yet-delivered lightsaber export. See the individual ledgers for exact historical revisions and limitations. Test results for earlier isolated slices must not be confused with validation of the complete final port.

## Gameplay acceptance

After integrated checks, test default (cheats-disabled) combat, weapon impact timing, destructible doors/placeables, immune/resistant targets, power attacks and ordinary attacks, crowded passages and moving targets, companion following, stores and item stacks, equip/unequip/re-equip, scripted trigger progression, module transitions, weather/fog persistence, protagonist/party identity and save round trips. Exercise interruption during model/effect loading and spell/projectile teardown. No live gameplay, asset-backed save compatibility, visual or audio-device validation is claimed by this slice.
