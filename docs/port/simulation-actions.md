# Action and movement port

## Scope and preservation

Source: original `kotor.js` worktree including staged changes, compared with shared base `ea9491d5`. Destination: upstream `002dfe03` in `kotor.js-port`.

All 27 source paths owned by this slice are included. No owned contribution was deferred. Relative source imports were normalized to upstream's `@/` convention before three-way reconciliation. Twenty-four existing paths were unchanged upstream apart from imports, `ActionCombat.ts` merged cleanly while retaining newer upstream behavior, and two helper files were new. The original checkout and target disk source files were not edited; the deliverable is in the integrated patch set.

## Exhaustive path ledger

| Original / destination path | Outcome |
| --- | --- |
| `src/actions/Action.ts` | Ported helper extraction and type-only imports; retained upstream parameter contracts and fixed loss of valid object ID zero. |
| `src/actions/ActionCastSpell.ts` | Ported centralized movement scheduling, preserving cast range and action grouping. |
| `src/actions/ActionCloseDoor.ts` | Ported centralized movement scheduling and original interaction range. |
| `src/actions/ActionCombat.ts` | Reconciled newer upstream combat parameters with correct spell/equip/unequip `isUserAction` assignment. |
| `src/actions/ActionDialogObject.ts` | Ported resolved conversation fallback, stealth/orientation handling and grouped movement. |
| `src/actions/ActionDisarmMine.ts` | Ported grouped movement helper; existing disarm skill-check TODO remains as in source. |
| `src/actions/ActionDropItem.ts` | Ported inventory removal, world placement, possessor clearing and model attachment. |
| `src/actions/ActionExamineMine.ts` | Ported grouped movement helper; original examine-mine TODO remains. |
| `src/actions/ActionFollowLeader.ts` | Ported grouped follow movement helper. |
| `src/actions/ActionForceFollowObject.ts` | Ported grouped movement helper; queued replacement now survives completion/failure through the queue fix. |
| `src/actions/ActionGiveItem.ts` | Ported source removal and transfer of the actual removed stack, with party inventory routing. |
| `src/actions/ActionLockObject.ts` | Ported grouped movement and corrected target initialization before type validation. |
| `src/actions/ActionMoveToPoint.ts` | Ported moving-target replanning, occupied-destination sampling and helper-based avoidance; corrected timeout persistence, force direction ordering, adjusted destination retention and completion/disposal cleanup. |
| `src/actions/ActionOpenDoor.ts` | Ported grouped movement helper without replacing door-use behavior. |
| `src/actions/ActionPhysicalAttacks.ts` | Ported grouped movement helper while retaining current combat-round integration. |
| `src/actions/ActionPickUpItem.ts` | Ported world detachment, possessor assignment and party inventory routing. |
| `src/actions/ActionQueue.ts` | Ported runtime-fault isolation; corrected removal of the executed action when it prepends a successor, one-time disposal, all insertion API queue/group assignment and positive group clearing. |
| `src/actions/ActionRandomWalk.ts` | Ported centralized movement helper; queue fix preserves scheduled movement when the random-walk action completes. |
| `src/actions/ActionRecoverMine.ts` | Ported grouped movement helper; original recover skill-check TODO remains. |
| `src/actions/ActionSetMine.ts` | Ported grouped movement helper while retaining original trap/animation scheduling. |
| `src/actions/ActionTakeItem.ts` | Ported checked item removal and corrected mutually exclusive party/non-party destination routing. |
| `src/actions/ActionUnequipItem.ts` | Ported armor-slot support and added invalid-item rejection. |
| `src/actions/ActionUnlockObject.ts` | Ported grouped movement and corrected security-tool charge consumption to occur once per attempt, not once per animation frame. |
| `src/actions/ActionUseObject.ts` | Ported shared 4.5-unit use range and grouped movement. |
| `src/actions/helpers/CreatureAvoidance.ts` | New searchable helper extracted from the action monolith. Preserves moving-target realtime/timer state across avoidance replans and sets owner before walk-edge correction. |
| `src/actions/helpers/enqueueMoveToPoint.ts` | New typed movement-scheduling helper, retaining object ID zero, area IDs, group IDs and typed timeout defaults. |
| `src/engine/pathfinding/ComputedPath.ts` | Ported empty-helper/merge safety and LOS-based smoothing. Corrected self-parent cycles, vector aliasing, mutation of merged input paths and smoothed point area/destination bookkeeping. |

## Integration contracts

- `RuntimeFaultManager.run<T>` is supplied by the resources/diagnostics slice. The action slice does not own that production file. Tests used the unchanged original implementation in a temporary auxiliary projection while that slice was in flight.
- Entity inventory methods must return the actual removed `ModuleItem` from `removeItem`, and preserve its stack/properties. `ModuleItem` must support `placedInWorld`, `setPossessor`, `load`, `loadModel` and `getCurrentRoom`; module areas must attach/detach item objects correctly. These are original playable-branch contracts restored by the entity/module slices.
- Movement uses existing area contracts `getNearestWalkablePoint`, `scorePointEdgeDistance`, `path.traverseToPoint`, `creatures` and `walkEdges`, plus creature hit radius, force vector, facing and computed-path ownership.
- `Action.runCreatureAvoidance` was extracted into the named helper. A source search found its only caller was the ported `ActionMoveToPoint`; no unrelated action caller needs translation.
- Combat dispatch retains upstream `spellClassIndex`, domain level, projectile path, override spell and instant equipment parameters. This port fixes the three branches that accidentally assigned `isUserAction` through the attack-case variable.
- `ActionQueue.push` and `unshift` now return the array length and accept multiple actions; existing single-action callers remain supported. `add` and `addFront` retain their existing usage and now consistently attach queue/owner/group metadata.

## Verification

Added `src/tests/simulation/simulation-port-actions.test.ts`, requiring no proprietary assets. It tests queue prepending and self-clearing, error isolation, group ownership and clearing, typed movement parameters, timeout countdown, jump fallback preservation, stopping at tracked targets, adjusted destinations, object ID zero, empty path safety, vector/input-path ownership, terminating predecessor links and ownerless disposal.

Final focused command:

`node node_modules/jest/bin/jest.js --runInBand --no-cache --coverage=false --roots src/tests/simulation --runTestsByPath src/tests/simulation/simulation-port-actions.test.ts`

Result: **15 tests passed, exit 0**, against protected discard-only projection `kotor-integrated-port@r6` plus `kotor-port-tools@r5`. The auxiliary set supplied the original fault-manager dependency; it is not a required production deliverable once the diagnostics slice is integrated. This ledger was added after that test run and does not change tested source bytes.

An earlier unrestricted-root focused run passed its 14 then-existing tests but exited 1 because upstream contains the orphan `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`. The scoped run did not delete, rewrite or bless that unrelated snapshot.

This is focused regression evidence, not a full-engine build or gameplay validation. Parent integration must run the combined patch checks. Gameplay should exercise a moving combat target, crowded doorways, companion following, random walking, item give/take/drop/pickup, armor unequip and a multi-frame security-tool unlock.
