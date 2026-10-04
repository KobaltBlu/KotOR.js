# Interface, application and presentation port

Original: tracked `kotor.js` worktree, including staged changes, relative to `ea9491d5`. Target: `kotor.js-port` upstream `002dfe03`. Original checkout remains read-only. This packet accounts for all **59 assigned contribution paths**: 57 source paths ported/reconciled, two retained upstream because their original changes are superseded or already present. Four synthetic regression suites were added. No game assets or saves are included.

The interface packet retains upstream's GUI mutation/publication APIs (`setItems`, `setItem`, proto builders and row registry), current launcher mobile drawer/shared purchase panel, modern Forge editors, and relocated game initialization. The initialization file `src/apps/game/GameInitializer.ts` is owned by the central-integration packet and is not changed here.

## Applications and Electron: 26 paths

Paths in this table are relative to `src/`.

| Path | Disposition / preserved behavior |
|---|---|
| `apps/forge/components/tabs/tab-quick-start/TabQuickStart.scss` | Original subtitle spacing; preserve current theme variables and virtual-project UI. |
| `apps/forge/components/tabs/tab-utm-editor/TabUTMEditor.tsx` | Correct merchant flag labels/values: 1 sells, 2 buys, 3 both, 0 legacy/unknown. Preserve current resource/script selectors and editor events. |
| `apps/forge/module-editor/ForgeStore.ts` | New stores default to BuySellFlag 3; preserve newer blueprint/mesh/facing behavior. |
| `apps/game/components/cheat-console/cheat-console.scss` | Expanded console, autocomplete, debug/progress and toast presentation. |
| `apps/game/components/cheat-console/cheatConsole.tsx` | Command and argument completion, help, snapshots, resource export controls/progress, input isolation/reset, save reload and result messages. Runtime manager comes from external `KotOR.GameState` to avoid a second engine graph; source manager import is type-only. |
| `apps/game/context/AppContext.tsx` | Single cleaned-up key listener, functional toggling and editable-input filtering. Preserve upstream EULA, directory grants, audio unlock and loading-modal gates. |
| `apps/game/states/AppState.ts` | Return command results, stable save-folder lookup with legacy index fallback, snapshot/resource export entry points. Preserve upstream profile/direct-entry, SEO and setup/audio-unlock behavior. |
| `apps/launcher/components/ProfileMenuItem.tsx` | Profile subtitles while preserving upstream mobile-drawer close on selection. |
| `apps/launcher/components/ProfileTabContent.tsx` | Profile hero/description/kicker, labelled logo and media layout; retain shared launch and lightbox components. |
| `apps/launcher/index.tsx` | Profile themes and tab styling combined with upstream mobile drawer/backdrop, accessibility labels, Discord mutual exclusion, window controls and shared NeedKotorPanel. Do not resurrect obsolete inline GOG/Steam panel. |
| `apps/launcher/profiles/forge.ts` | Theme, kicker and description metadata; preserve launch configuration. |
| `apps/launcher/profiles/kotor.ts` | Theme, kicker and description metadata; preserve launch configuration. |
| `apps/launcher/profiles/tsl.ts` | Theme, kicker and description metadata; preserve launch configuration. |
| `apps/launcher/styles/DiscordWidget.scss` | Original visual refresh, upstream mobile breakpoint and fixed-panel behavior. |
| `apps/launcher/styles/launch-buttons.scss` | Accent-driven buttons/selectors plus upstream mobile full-width controls; clear desktop offset on mobile. |
| `apps/launcher/styles/launcher-menu.scss` | Translucent themed header and window controls; preserve sticky 56px mobile header. |
| `apps/launcher/styles/launcher-profile-nav.scss` | Themed profile rail/subtitles, hero and media layout with upstream mobile drawer/backdrop. |
| `apps/launcher/styles/launcher.scss` | Theme variables, overlay/panel/typography/scrollbars; preserve screen-reader utility/mobile content. Omit obsolete GOGWidget import because shared purchase component owns it. |
| `apps/launcher/styles/promo-items.scss` | Refreshed tile/hover styling while keeping responsive aspect ratio and spacing. |
| `apps/launcher/styles/promo-items/promo-gallery.scss` | Gallery/transition refresh; preserve mobile controls and responsive dimensions. |
| `apps/launcher/styles/promo-items/promo-video.scss` | Cropped desktop video tile; preserve pointer-transparent overlay and mobile sizing. |
| `apps/launcher/styles/promo-items/promo-webview.scss` | Desktop tile height; preserve newer block iframe and mobile layout. |
| `apps/launcher/styles/promo-items/promo-ytvideo.scss` | Cropped desktop thumbnail/tile; preserve pointer-transparent overlay and mobile layout. |
| `apps/launcher/styles/tabhost.scss` | Themed navigation/selected indicator; preserve mobile toggle/header geometry. |
| `electron/WindowManager.ts` | Normalize direct and legacy one-element-array options for both open/save dialogs. Relative Electron imports retained because tsc output has no webpack alias resolver. Remove debug event dump from save handler; preserve rejection propagation. |
| `electron/preload.ts` | Original open-dialog argument spreading combined with upstream typed rest arguments, Dirent/Stats serialization and other preload APIs. |

## K1 menus: 18 paths

Paths in this table are relative to `src/game/kotor/menu/`.

| Path | Disposition / preserved behavior |
|---|---|
| `CharGenAbilities.ts` | Derived-stat synchronization after ability changes. |
| `CharGenCustomPanel.ts` | Player-template versus actual-player identity and portrait-order initialization. |
| `CharGenMain.ts` | Ability modifiers and HP/AC/save comparisons with stat synchronization; preserve upstream model loading. |
| `CharGenQuickOrCustom.ts` | Reset/rebuild granted feats and synchronize derived stats. |
| `InGameAreaTransition.ts` | Clear stale transition object when called without a specific object. |
| `InGameBark.ts` | Original generation-based cancellation integrated with upstream typed DLGNode/loadLIP. Reset LIP on replacement, close, completion and failure; stale audio cannot take ownership of a newer bark. |
| `InGameComputer.ts` | Display actual computer-spike and repair-part counts; retain batched reply/message APIs. |
| `InGameDialog.ts` | Viewport-sized reply area, wrapping and height/layout recalculation using current `setItems`. Two passes account for scrollbar-induced wrapping-width changes. |
| `InGameOverlay.ts` | Interaction-target lookup, reticle-node positioning and nameplate material guards while retaining upstream overlay additions. |
| `MainMenu.ts` | Coordinated menu music. Replace async Promise executor with ordinary async flow so errors reject rather than hang. |
| `MenuEquipment.ts` | Signed attack modifiers, dual-wield penalties and refreshed equipped stats; preserve upstream lists. |
| `MenuInventory.ts` | Quest-item navigation; clear stale description on invalid selection. |
| `MenuJournal.ts` | Active/completed filtering, persisted sorting, received-order sort and case-insensitive plot-ID selection. Sort a copy instead of mutating manager order. |
| `MenuPartySelection.ts` | Distinguish selected versus in-party; required-companion restrictions, availability/selectability, names/levels and default selection. |
| `MenuQuestItem.ts` | Functional quest inventory and selected details on current proto/list APIs; clear stale empty state. |
| `MenuSaveLoad.ts` | Original new/manual-save handling reconciled with confirmation/minigame guards and upstream list registry/publication. |
| `MenuStore.ts` | Buy/sell transactions, pricing/bonuses, customer and merchant stock, finite/infinite copies, credits/details and shared TSL hooks. Uses current list APIs. |
| `MenuTop.ts` | Close quest-item screen on top-level navigation. |

## TSL menus and shared GUI: 15 paths

Paths in this table are relative to `src/`.

| Path | Disposition / preserved behavior |
|---|---|
| `game/tsl/gui/GUIJournalItem.ts` | Journal display name with empty fallback; build row before assigning text. |
| `game/tsl/gui/GUISaveGameItem.ts` | Keep upstream 46px presenter and localized special-save names. Handle invalid/missing timestamps; new slots never read timestamps. |
| `game/tsl/menu/InGameDialog.ts` | Use shared responsive reply layout; retain TSL controls and letterbox. |
| `game/tsl/menu/MainMusic.ts` | Shared MusicManager playback/stop/volume and return-to-menu track restoration; retain list builders. |
| `game/tsl/menu/MenuEquipment.ts` | Refresh after equip/weapon swap, including async completion; preserve locked slots, controllers, icons and list publication. |
| `game/tsl/menu/MenuJournal.ts` | Shared sorting/filtering/details, active/completed toggle and buttons; current builders/selection callbacks. |
| `game/tsl/menu/MenuPartySelection.ts` | Shared K1 required/selected behavior and TSL model setup. Strengthen original stale-request protection with generation and hide invalidation, including repeated same-NPC requests. Dispose discarded preview creatures. |
| `game/tsl/menu/MenuQuestItem.ts` | Quest row/details callbacks and back action; current presenter registration. |
| `game/tsl/menu/MenuSaveLoad.ts` | Share K1 overwrite/delete workflow; PC filters preserve New Save and special saves, clamp stale index and show PC/time labels. |
| `game/tsl/menu/MenuSaveName.ts` | Delegate name/save workflow to implemented K1 parent instead of empty initialization. |
| `game/tsl/menu/MenuStore.ts` | Share complete K1 transactions instead of old duplicate buy-only logic. Preserve category filters/count/highlighting; recognize armbands in armor filter. |
| `game/tsl/menu/MenuTop.ts` | Quest-screen closure/class labels and safe empty-leader navigation. |
| `gui/GUICheckBox.ts` | Selected boxes retain highlight/pulse on mouse-out; preserve upstream UI/audio behavior. |
| `gui/GUIListBox.ts` | **Retained upstream unchanged.** Its measured pixel/prefix-sum variable-height layout supersedes original index-based scrolling fixes. Do not roll back `setItems`/`setItem`, mutation/publication or disposal APIs. |
| `gui/GUIProtoItem.ts` | **Retained upstream unchanged.** Full-text-height correction is already present. Original added padding would be double-counted because current GUIListBox adds it once per row pitch. |

## Deterministic checks

All checks ran in protected discard-only Workspace Projection. No live game, browser visual comparison or real save compatibility test has been performed.

- Four interface suites passed together: **49 tests, exit 0**, against exact code revision `kotor-integrated-port@r20` (`403037ad5c25`). Suites: `src/tests/port/interface-kotor-menu.test.ts`, `interface-kotor-presentation.test.ts`, `interface-tsl.test.ts`, `interface-electron.test.ts`.
- Tests exercise actual proposed methods with synthetic dependencies: store stock/credits/infinite items/merchant flags/prices; journal filtering/sort/selection; bark cancellation; save filters/timestamps; variable-height list invariants; checkbox highlighting; repeated/hidden party previews; direct/legacy Electron IPC options and failures. Also includes syntax/conflict-marker assertions.
- Command: `node node_modules/jest/bin/jest.js --runInBand --no-coverage --silent --roots src/tests/port --runTestsByPath src/tests/port/interface-kotor-menu.test.ts src/tests/port/interface-kotor-presentation.test.ts src/tests/port/interface-tsl.test.ts src/tests/port/interface-electron.test.ts`.
- Electron `tsc --project tsconfig.electron.json --noEmit --pretty false` passed on r19 (same Electron implementation as r20).
- Launcher, game and Forge webpack builds passed during the application child stage. Those used esbuild and are not semantic TypeScript checks or validation of later integrated engine changes.
- Whole-project `tsc --noEmit --listFiles false --pretty false` on interface-only r17 failed: expected missing sibling model/manager/export contracts plus upstream diagnostics. The two pre-existing strict save-dialog indexing errors in assigned WindowManager were fixed after this check. The root integration pass must rerun full TypeScript checks after other packets land; this packet does not claim whole-project typecheck success.
- Initial unscoped Jest runs passed assertions but returned 1 for an upstream orphan `odysseyModelAscii.test.ts.snap`. The passing command scopes discovery to the new test directory; no existing snapshots or tests were deleted or weakened.

## Cross-packet contracts

The integrated implementation must provide these original/public contracts. The interface packet does not implement substitute state/model methods merely to satisfy tests.

- `CharGenManager.syncDerivedStats`, `getAbilityModifier`; `CursorManager.getInteractionTargetObject`; entity `getReticleNode`; creature `getAttackModifier`.
- `MusicManager.playMenuMusicTrack(resref, loop?, force?, volume?)`, `stopMenuMusic`, `setMenuMusicVolume`, and exposure through GameState.
- `InventoryManager.getQuestInventory`, `getNonQuestInventory`, customer-aware `getSellableInventory(0, trader)`. `ModuleCreature.removeItem(item, 1)` returns removed item; addItem respects party inventory. ModuleItem cloning/stack/infinite-stock/template identity semantics; mutable ModuleStore inventory and addItem.
- PartyManager player-template/portrait-order fields, correct required/in-party/selectable companions and shared gold. `LoadPartyMemberCreature` must return a preview creature with its model already loaded; discarded previews are destroyed by the UI.
- JournalEntry `getName`, `isCompleted`, `getReceivedSortValue`, `getPriority`, `getPlanetId`, with JournalManager persistent sorting.
- MenuManager registers `MenuQuestItem`; SaveGame supplies `isNewSave`, `getFullName`, `CanSaveCurrentGame`, async save/overwrite/delete results and stable `folderName`.
- `DLGNode.resetLIP` invalidates pending `loadLIP`; `AudioEmitter.stop` invalidates pending starts, not merely current playback.
- `CheatConsoleManager` exports `CheatCommandDefinition`, definitions/suggestions and `{ok,message}` command results. Public KotOR exports `GameStateSnapshot`, `GameResourceDumper`, `GameResourceDumpOptions`, `GameResourceDumpProgress`.
- All original keyboard reset fields used by the expanded console remain available.

## Gameplay acceptance follow-up

Use copied game data/saves and isolated storage. Check K1 character creation, stat/equipment updates, dialogue wrapping/bark replacement, required companions and quest inventory, Taris merchant buying/selling/stock/credit conservation, journal progression and save/new/overwrite/delete. Check equivalent early TSL menus, rapid party-preview selection/close and menu-music restoration. Compare launcher desktop/mobile appearance and Electron dialogs. Baseline syntax and synthetic tests cannot establish playthrough or rendering correctness.
