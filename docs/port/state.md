# State subsystem port ledger

## Inputs and scope

Original worktree: `kotor.js`, including staged changes, based on shared ancestor `ea9491d5`. Destination baseline: upstream `002dfe03`. The original checkout was read only. This ledger covers all ten files assigned to the state group; no file in this group was deferred or discarded.

The mechanical pass normalized relative source imports to the destination's `@/` aliases before a three-way comparison. Seven files had no upstream behavior changes after normalization; `CurrentGame` and `SaveGame` merged cleanly with newer upstream behavior retained. `MenuManager` required manual reconciliation.

## File-by-file decisions

| File | Decision and recovered behavior |
| --- | --- |
| `src/engine/CurrentGame.ts` | Ported case-insensitive saved-module lookup restricted to `.sav` files, use of the actual filename returned by the filesystem, and case-insensitive resource extensions. Preserved upstream browser directory-handle checks and parallel ERF extraction. |
| `src/engine/JournalEntry.ts` | Ported normalized quest lookup, title/text/priority/planet/received-order accessors, completed-state handling, plot XP lookup, and tolerant GFF output that retains unresolved quest ID/state rather than dereferencing absent category data. |
| `src/engine/SaveGame.ts` | Ported boolean packing/unpacking with rounded-up storage and consistent least-significant-bit ordering; location storage sized to the actual count; metadata hydration promises; name/timestamp exports; case-aware save discovery; stable folder identity; deduplication; minigame save guard; and awaited module loads. Preserved upstream additions outside the contribution, including save deletion. |
| `src/managers/CharGenManager.ts` | Ported menu-music coordination and synchronization of derived HP/saving-throw fields when character-generation abilities change. |
| `src/managers/CursorManager.ts` | Ported mesh-first hover picking with point fallback, corrected point-buffer indexing/update flags, selectable reticle hotspots, interaction preview target, and clearing stale hover state. |
| `src/managers/InventoryManager.ts` | Ported quest-item classification including plot-use item classes, sellable inventory filtering, compatibility-based stack merging, normalized stack quantities, and the existing special credit/Pazaak routing behavior. |
| `src/managers/JournalManager.ts` | Ported insertion of new quests, state advancement/explicit lower-state overrides, idempotent repeated state updates, received ordering, case-insensitive normalized lookup, quest XP, world-entry replacement/deletion, and entry deduplication. |
| `src/managers/MenuManager.ts` | Added K1/K2 quest-item menu initialization and top-menu linkage, plus TSL swoop-upgrade menu initialization. Kept upstream parallel menu initialization, in-game menu caching, events, foreground modal handling, and all other upstream behavior. Additional menus are initialized after the corresponding existing parallel group instead of reverting to the original sequential loader. |
| `src/managers/ModuleObjectManager.ts` | Ported object-ID counter resynchronization, model-independent nearest-object distances, and safe clearing of selectable/hoverable/visible caches when no player exists. |
| `src/managers/PartyManager.ts` | Ported live player-template synchronization without replacing an established actual protagonist template with a temporarily controlled companion; persisted leader/member ordering by identity rather than portraits; stale member removal; spawn ordering; journal/message reset on load; journal sort order; TSL puppet/influence/component/chemical exports; played time; and companion template/export safeguards. |

## Intentional compatibility decisions

- The original `loadPIFO()` behavior is intentionally disabled as in the playable branch: a stale `pifo.ifo` must not overwrite the current module player template or the actual protagonist. The module loader and optional `pc.utc` provide the relevant identities. The `loadPIFO` method remains callable as a no-op for compatibility.
- Save-folder discovery preserves an existing `saves`/`Saves` directory through `ResolveBaseDirectory()` rather than imposing a case-only rename.
- The binary boolean ordering is verified by synthetic exported bytes and by re-import, not only by comparing matching reader/writer implementations. Native-save compatibility still belongs in gameplay/save acceptance testing.
- No game resources, save files, private logs, or original game snapshots are included in the contribution.

## Integration contracts

Other port groups provide these collaborators:

- `ModuleItem.canStackWith(item)` is required by `InventoryManager.getItemMergeTarget`; the simulation group owns it. Do not substitute tag-only stacking to make an intermediate build pass.
- `GameState.MusicManager.playMenuMusicTrack(...)` is called by `CharGenManager.StartBackgroundMusic`; the audiovisual and integration groups provide the manager and GameState binding.
- Character-generation menus can call `CharGenManager.syncDerivedStats(...)`.
- Interaction controls/action menus can call `CursorManager.getInteractionTargetObject()`; the simulation group carries the corresponding interaction changes.
- Module loading should use `PartyManager.GetPlayerStartingPartyIndex()`, `GetCurrentMemberStartingPartyIndex()`, and `GetCreatureStartingPartyIndex()` and resynchronize `ModuleObjectManager.COUNT` with `SyncCount()` after restored objects are registered.
- `SaveGame.load()` clears `PlayerTemplate` and `ActualPlayerTemplate` before loading. The module loader must reconstruct the module player and retain the optional `SaveGame.pc` protagonist template; it must not use a stale PIFO template.
- Save menus may await `save.ensureMetadataLoaded()`, identify last saves by `folderName`, and use `SaveGame.CanSaveCurrentGame()`.
- Journal menus use `JournalManager.SortOrder` plus `JournalEntry` accessors/completion flags; K1 and TSL quest-item screens are now instantiated in `MenuManager`.
- Store transaction methods and item equivalence are implemented by the simulation group; this group supplies the inventory classification/stacking/accounting hooks, not duplicate transaction implementations.

## Tests and current evidence

New tests are under `src/tests/state/`:

- `SaveState.port.test.ts`: zero/partial/full-byte boolean cases (0, 1, 7, 8, 9, 17 booleans), expected bit positions, GFF binary round trips, 101 locations with all six floats, string/number preservation, case-insensitive module `.sav` lookup, and save-entry deduplication/order.
- `JournalState.port.test.ts`: first insertion, repeated-state idempotence and XP, explicit lower-state override, received ordering, completed-entry GFF persistence, and world-entry replacement/deletion without removing ordinary feedback.
- `PartyInventory.port.test.ts`: actual protagonist versus temporary companion identity, stale-member removal and leader identity, duplicate-portrait order reconstruction, compatible stack accounting, plot-use quest filtering, and credit routing. Module creatures/items are synthetic collaborators; these are manager tests, not model/transaction integration tests.

Executed against protected projection `kotor-integrated-port@r6`: the save and journal suites passed all **13 tests**. The process still exited 1 because upstream contains an unrelated orphan `src/tests/__snapshots__/odysseyModelAscii.test.ts.snap`; that snapshot was not deleted or rewritten.

Executed against protected projection `kotor-integrated-port@r7` with Jest discovery rooted at `src/tests/state`: the same 13 tests passed, with no orphan-snapshot problem. The party/inventory suite was blocked at TypeScript compilation because the simulation group's `ModuleItem.canStackWith` port was not yet included in this intermediate revision. This is an explicit cross-group dependency, not a suppressed diagnostic. Re-run the following against the final combined patch before claiming all state tests pass:

`node node_modules/jest/bin/jest.js --runInBand --no-coverage --roots src/tests/state`

No gameplay, real-save compatibility, rendering, or full-project build claim is made by this subsystem pass.

## Gameplay acceptance checks

Use isolated storage and copies of saves: new character ability editing; Endar Spire item pickup/stacking; quest insertion and active/completed journal ordering; Taris buying/selling and quest inventory; saving/reloading with a companion as leader; transitions after changing party composition; and TSL temporary-player identity plus puppet/influence/item-resource persistence. Confirm the character shown in save metadata remains the actual protagonist during a temporary companion-controlled segment.
