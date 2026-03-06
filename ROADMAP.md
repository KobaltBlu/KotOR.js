# WebKotor – Browser Playability Roadmap

A full technical roadmap for making **KotOR I** and **KotOR II** playable from beginning to end inside a web browser, based on a thorough analysis of the current codebase (`src/`).

---

## Table of Contents

1. [Legend & Status Key](#legend--status-key)
2. [Architecture Overview](#architecture-overview)
3. [Current Implementation Status](#current-implementation-status)
4. [Game Flow: Beginning to End](#game-flow-beginning-to-end)
5. [Milestone 1 – Browser Bootstrap & Resource Access](#milestone-1--browser-bootstrap--resource-access)
6. [Milestone 2 – Main Menu & Character Creation](#milestone-2--main-menu--character-creation)
7. [Milestone 3 – Core Gameplay Loop](#milestone-3--core-gameplay-loop)
8. [Milestone 4 – Advanced Systems](#milestone-4--advanced-systems)
9. [Milestone 5 – Full Game Completion](#milestone-5--full-game-completion)
10. [Ongoing / Cross-Cutting Concerns](#ongoing--cross-cutting-concerns)
11. [Known Bugs & Blockers](#known-bugs--blockers)

---

## Legend & Status Key

| Icon | Meaning |
|------|---------|
| ✅ | Complete / working |
| 🔶 | Partially implemented – needs work |
| ❌ | Not implemented / stubbed |
| 🔒 | Blocked by another item |

---

## Architecture Overview

```
Browser
  └── /launcher/        React app – game file selection & profiles
        └── /game/      React app – main game loop (Three.js WebGL)
              ├── GameInitializer   – loads archives, 2DAs, audio
              ├── GameState         – global singleton (scene, managers)
              ├── Module system     – area / creature / object graph
              ├── NWScript VM       – game scripting engine
              ├── GUI system        – custom 2D overlay (canvas)
              └── Webpack bundles → dist/ (deployed to web server)
```

Five webpack entry points are built and deployed:
- `dist/KotOR.js` – core library
- `dist/launcher/` – game selector
- `dist/game/` – playable game client
- `dist/forge/` – level editor (separate concern)
- `dist/debugger/` – developer tools (separate concern)

---

## Current Implementation Status

### ✅ Fully Working Systems (90–100 %)

| System | Key Files |
|--------|-----------|
| 3D Rendering (Three.js, post-process) | `src/odyssey/`, `src/shaders/` |
| Archive parsing (KEY / BIF / RIM / ERF / MOD) | `src/resource/` |
| 2DA table loading | `src/managers/TwoDAManager.ts` |
| TLK string tables | `src/managers/TLKManager.ts` |
| Texture loading & caching | `src/loaders/TextureLoader.ts` |
| GFF binary parsing | `src/resource/GFFObject.ts` |
| Audio system (spatial, reverb, streaming) | `src/audio/` |
| BIK video playback | `src/video/bink-demuxer.ts` |
| GUI framework (controls, menus) | `src/gui/` |
| Module / area loading | `src/module/Module.ts`, `ModuleArea.ts` |
| Walkmesh / path collision | `src/odyssey/OdysseyWalkMesh.ts` |
| Action queue system (45 + action types) | `src/actions/` |
| Effect system (60 + effect types) | `src/effects/` |
| Input handling (keyboard, gamepad, mouse) | `src/controls/` |
| Party management structure | `src/managers/PartyManager.ts` |
| Inventory data model | `src/managers/InventoryManager.ts` |
| Character appearance | `src/managers/AppearanceManager.ts` |
| Character generation menus | `src/game/kotor/menu/CharGen*.ts` |
| NWScript bytecode VM | `src/nwscript/NWScript.ts` |
| Rules data (SWRuleSet, 2DA-backed) | `src/engine/rules/` |
| Combat data structures & attack roll | `src/combat/CombatRound.ts` |
| Save game data model | `src/engine/SaveGame.ts` |
| Galaxy map UI | `src/game/kotor/menu/MenuGalaxyMap.ts` |
| Journal / quest log UI | `src/game/kotor/menu/MenuJournal.ts` |
| Store / merchant UI skeleton | `src/game/kotor/menu/MenuStore.ts` |
| Pazaak minigame (partial) | `src/managers/PazaakManager.ts` |

### 🔶 Partially Implemented Systems (30–70 %)

| System | Gap | Key Files |
|--------|-----|-----------|
| Combat resolution | Attack rolls work; feat execution, dual-wield, Force powers, critical multipliers incomplete | `src/combat/CombatRound.ts`, `src/actions/ActionCombat.ts` |
| NWScript standard library | ~80 % of K1 functions wired; ~7 functions have `//TODO` bodies; K2 lib less complete | `src/nwscript/NWScriptDefK1.ts`, `NWScriptDefK2.ts` |
| Dialog / conversation system | UI renders; script callbacks for checks & variable writes partial | `src/game/kotor/menu/InGameDialog.ts` |
| AI / creature behaviour | Basic movement and action execution; no perception, no combat tactics | `src/module/ModuleCreature.ts` |
| Save / load game | Data model present; serialisation round-trip has one `//TODO` block | `src/engine/SaveGame.ts` |
| Level-up UI | Shell exists (48 lines); sub-steps (abilities, feats, skills, powers) empty | `src/game/kotor/menu/MenuLevelUp.ts` |
| Store / merchant transactions | Buy price calculated; actual credit deduction, item transfer incomplete | `src/game/kotor/menu/MenuStore.ts`, `src/module/ModuleStore.ts` |
| Cutscenes / in-engine camera | Video playback works; animated-camera (`camera_animated`) untested end-to-end | `src/module/ModuleCamera.ts` |
| Force powers | Effect types exist; casting sequence, cooldown, Force pool deduction missing | `src/effects/EffectForcePushed.ts` |

### ❌ Not Implemented Systems (0–20 %)

| System | Key Files |
|--------|-----------|
| Level-up logic (stat application, feat/skill grant) | `src/game/kotor/menu/MenuLevelUp.ts` |
| Feat resolution in combat (Flurry, Power Attack, etc.) | `src/enums/combat/CombatFeatType.ts` |
| Perception system (seeing/hearing enemies) | `src/module/ModuleCreature.ts` line 1007 |
| Companion tactical AI | `src/module/ModuleCreature.ts` |
| Skill checks (Persuade, Repair, Computer, etc.) | `src/engine/rules/` |
| Force power full casting pipeline | `src/nwscript/NWScriptDefK1.ts` |
| Party formation (follow, spread, hold) | `src/managers/PartyManager.ts` |
| Area transition persistence (state across module loads) | `src/module/Module.ts` |
| Quest logic / trigger conditions | `src/managers/JournalManager.ts` |
| Minigames: Swoop Racing, Space Turret | `src/module/ModuleMiniGame.ts` |
| Character alignment tracking | `src/module/ModuleCreature.ts` |
| Romance / influence system (K2) | — |
| Credits sequence | — |

---

## Game Flow: Beginning to End

The following steps must work to call the game "playable start-to-finish":

```
1.  Open browser → https://example.com/
2.  Launcher loads → user picks game directory (File System Access API)
3.  Profiles created / selected → enter game
4.  GameInitializer runs → archives, 2DAs, audio indexed
5.  Main Menu renders → "New Game" works
6.  Character Creation completes → player object created with chosen stats
7.  Opening video (BIK) plays
8.  First module loads (Endar Spire / Peragus)
9.  Player moves, explores, loots
10. First combat encounter resolves (enemies die, player may die)
11. NPC dialog conversations play, quest flags set
12. Module transition (Taris / Citadel Station)
13. More conversations, combat, skill checks throughout Taris/CS
14. Galaxy map opened → travel to mid-game planet
15. Exploration, puzzles, combat on planet
16. Level-up granted and applied mid-game
17. Store / merchant visited → buy/sell items
18. Party members join, follow, fight
19. Final planet / endgame module loads
20. Final boss encounter resolves
21. Ending cutscene plays
22. Credits roll
23. Return to Main Menu
```

---

## Milestone 1 – Browser Bootstrap & Resource Access

> **Goal**: A fresh browser visit can locate, index, and begin loading game files without errors.

### 1.1 File System Access (Browser)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1.1 | `showDirectoryPicker` flow prompts user, stores `FileSystemDirectoryHandle` via `idb-keyval` | ✅ | `GameFileSystem.ts:614` |
| 1.1.2 | Persisted handle re-requested on subsequent visits (permission prompt) | ✅ | `ConfigClient.ts` uses `idb-keyval` |
| 1.1.3 | File path resolution for `chitin.key` and game subdirectories case-insensitive | 🔶 | Windows paths use backslash; normalise in `GameFileSystem.normalizePath` |
| 1.1.4 | Override folder (`Override/`) scanned in browser environment | 🔶 | `GameInitializer.LoadOverride()` – verify browser branch |
| 1.1.5 | Graceful error UI when user cancels directory picker or wrong folder selected | ❌ | Launcher shows no feedback |

### 1.2 Webpack Build & Deployment

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.2.1 | `npm run webpack:prod` produces `dist/` with all 5 bundles | ✅ | CI workflow present |
| 1.2.2 | Root `index.html` redirects to `/launcher/` | ✅ | Webpack generates it |
| 1.2.3 | HTTPS requirement documented (File System Access API requires secure context) | ✅ | README mentions SSL |
| 1.2.4 | CORS headers set correctly on web server for SharedArrayBuffer / cross-origin isolation | ❌ | Required for Web Workers and audio worklets |
| 1.2.5 | Worker bundles (`worker-tex`, `bink-worker`) correctly referenced at runtime | 🔶 | Webpack worker URL generation needs verification |

### 1.3 Game Initialisation Sequence

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.3.1 | `GameInitializer.Init()` completes without crash in Chrome / Firefox | 🔶 | Tested in Chrome; Firefox audio APIs diverge |
| 1.3.2 | Loading screen progress bar reflects real initialisation steps | ✅ | `LoadScreen.ts` wired to `GameInitializer` events |
| 1.3.3 | Resource cache warm-up (`InitCache`) works in browser (no native `fs`) | ✅ | Uses `FileSystemFileHandle` branch |
| 1.3.4 | BIF/KEY archive parsed from `FileSystemFileHandle` (large files, chunked reads) | ✅ | `BIFObject.ts` streams chunks |
| 1.3.5 | Error recovery: if one archive fails to parse, game continues with partial data | ❌ | Throws unhandled exceptions |

---

## Milestone 2 – Main Menu & Character Creation

> **Goal**: Player can reach the main menu, start a new game, complete character creation, and enter the first module.

### 2.1 Main Menu

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1.1 | Main menu renders with background artwork and music | ✅ | `MainMenu.ts` |
| 2.1.2 | "New Game" button navigates to character creation | ✅ | |
| 2.1.3 | "Load Game" button shows save list and loads correctly | 🔶 | Save list renders; full load needs M3 |
| 2.1.4 | "Options" menus (graphics, sound, gameplay, controls) open and save settings | 🔶 | Graphics & sound options persist; keybinding save incomplete |
| 2.1.5 | "Movies" menu plays BIK videos | ✅ | `MainMovies.ts` |
| 2.1.6 | "Credits" menu shows credits text | ❌ | `MenuCredits.ts` is a stub |

### 2.2 Character Creation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.2.1 | Quick character creation selects a pre-built character and enters game | ✅ | `CharGenQuickPanel.ts` |
| 2.2.2 | Custom creation: class selection works (Soldier / Scout / Scoundrel) | ✅ | `CharGenClasses.ts` |
| 2.2.3 | Ability score allocation (STR/DEX/CON/INT/WIS/CHA point-buy) | ✅ | `CharGenAbilities.ts` |
| 2.2.4 | Skill point allocation correct per class/INT bonus | 🔶 | UI present; cross-class penalty not applied |
| 2.2.5 | Feat selection (starting feats per class + bonus feat) | 🔶 | UI shows feats; default feats not auto-granted on confirm |
| 2.2.6 | Portrait / appearance selection renders 3D model preview | ✅ | `CharGenPortCust.ts` |
| 2.2.7 | Name entry saves and is used throughout game | ✅ | `CharGenName.ts` |
| 2.2.8 | Player `ModuleCreature` object fully initialised with chosen stats on confirm | 🔶 | Stats applied; derived values (attack bonus, saving throws, HP) recalculation needed |
| 2.2.9 | Opening BIK video plays after character confirm | ✅ | `VideoManager` triggered from `CharGenMain.ts` |

---

## Milestone 3 – Core Gameplay Loop

> **Goal**: Player can navigate a module, interact with objects and NPCs, fight enemies, and transition between areas.

### 3.1 Movement & Navigation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1.1 | Mouse-click-to-move routes player along walkmesh | ✅ | `ActionMoveToPoint.ts` + `OdysseyWalkMesh` |
| 3.1.2 | WASD / gamepad movement | ✅ | `IngameControls.ts` |
| 3.1.3 | Running / walking toggle | ✅ | |
| 3.1.4 | Camera follow and rotation | ✅ | `CameraFollower.ts` |
| 3.1.5 | NPC pathfinding (walk around obstacles) | 🔶 | Basic A* present; complex geometry issues |
| 3.1.6 | Door interaction (approach, open/lock check, trigger scripts) | 🔶 | `ActionOpenDoor.ts` works; lock scripts partial |

### 3.2 Object Interaction

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.2.1 | Right-click context menu on objects (examine, open, use, etc.) | ✅ | `InGameOverlay.ts` |
| 3.2.2 | Container loot UI (`MenuContainer`) opens and transfers items | 🔶 | UI opens; item transfer to player inventory incomplete |
| 3.2.3 | Item pickup (ground items → inventory) | 🔶 | `ActionPickUpItem.ts` – item removed from world, inventory add partial |
| 3.2.4 | Placeable "Use" action fires OnUsed script | 🔶 | Script fires; return values sometimes dropped |
| 3.2.5 | Trigger enter / exit scripts execute | 🔶 | `OnEnter` fires; `OnExit` inconsistent |
| 3.2.6 | Waypoints used for patrols and trigger areas | ✅ | |

### 3.3 Dialog / Conversation System

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.3.1 | Conversation initiates from NPC click or script | ✅ | `ActionDialogObject.ts` |
| 3.3.2 | Dialog UI renders speaker, listener, reply choices | ✅ | `InGameDialog.ts` |
| 3.3.3 | TLK strings fetched and displayed correctly | ✅ | |
| 3.3.4 | Lip-sync animation plays during dialog | ✅ | `LipSyncManager` |
| 3.3.5 | Camera cuts to dialog camera | 🔶 | Camera switches; framing positions not always correct |
| 3.3.6 | Dialog node conditions evaluated (NWScript `if/check` blocks) | 🔶 | Expression evaluator wired; some check functions return 0 |
| 3.3.7 | Dialog node actions execute (set plot flags, give items, etc.) | 🔶 | `ActionFired` called; ~7 NWScript functions have `//TODO` bodies in `NWScriptDefK1.ts` lines 4451, 4695, 6542 |
| 3.3.8 | Persuade / Lie / Intimidate skill-check dialog nodes resolve | ❌ | Skill check logic not implemented |
| 3.3.9 | Dialog ends, camera returns to gameplay camera | 🔶 | Camera transition sometimes jams |
| 3.3.10 | Bark / ambient speech plays from NPCs | ✅ | `InGameBark.ts` |

### 3.4 Combat

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.4.1 | Entering combat (attack cursor, player clicks enemy) | ✅ | `ActionCombat.ts` queued from click |
| 3.4.2 | Combat round timer (3-second rounds) | ✅ | `CombatRound.ROUND_LENGTH = 3000` |
| 3.4.3 | Attack roll vs. AC (d20 + BAB + modifiers) | ✅ | `CombatRound.calculateAttackRoll()` |
| 3.4.4 | Damage roll (weapon dice + STR/DEX modifier) | ✅ | `CombatRound.calculateAttackDamage()` |
| 3.4.5 | Critical hit detection and multiplied damage | 🔶 | Critical detection works; multiplier application partial |
| 3.4.6 | Miss feedback (floating "MISS" text) | ✅ | `FeedbackMessageManager` |
| 3.4.7 | HP reduction and death | 🔶 | HP reduced; death state / animation triggered inconsistently |
| 3.4.8 | Player dies → death screen / reload | ❌ | Game reaches bad state; no death UI |
| 3.4.9 | Enemy AI enters combat when perceiving player | ❌ | Perception system stubbed (`ModuleCreature.ts` line 1007) |
| 3.4.10 | Enemy AI selects attack actions during combat | ❌ | No combat-AI action selection |
| 3.4.11 | Dual-wield (off-hand attack) | 🔶 | `offHandTaken` flag tracked; off-hand attack not scheduled |
| 3.4.12 | Ranged combat (range check, line-of-sight) | 🔶 | Range check works; LoS not verified |
| 3.4.13 | Feat use in combat (Flurry, Power Attack, Sneak Attack) | ❌ | `CombatFeatType` enum only; no resolution |
| 3.4.14 | Force power casting pipeline (Force pool, animations, effect) | ❌ | `EffectForcePushed.ts` stub + TODO |
| 3.4.15 | Combat auto-pause triggers (end of turn, creature attacked, etc.) | 🔶 | `AutoPauseManager` wired; some triggers missing |
| 3.4.16 | Companion party members fight alongside player | ❌ | Party members present in world; no combat AI for them |
| 3.4.17 | Experience points awarded on kill | 🔶 | XP calculation in `SWRuleSet`; `GiveXP` NWScript function partial |
| 3.4.18 | Level-up notification triggered when XP threshold met | 🔶 | `ModuleCreature.ts:2827` checks threshold; no UI trigger |

### 3.5 Inventory & Equipment

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.5.1 | Inventory screen opens and displays items with icons | ✅ | `MenuInventory.ts` |
| 3.5.2 | Item tooltip / description shown | ✅ | `MenuToolTip.ts` |
| 3.5.3 | Equipment screen opens; slots visualised on character model | ✅ | `MenuEquipment.ts` |
| 3.5.4 | Equip item from inventory → model updates, stats change | 🔶 | `ActionEquipItem.ts` queued; stat recalc missing |
| 3.5.5 | Unequip item → returned to inventory | 🔶 | `ActionUnequipItem.ts` present; inventory add incomplete |
| 3.5.6 | Dropped items appear in world | 🔶 | `ActionDropItem.ts` present; 3D object placement incomplete |
| 3.5.7 | Item upgrade screen | 🔶 | `MenuUpgrade.ts` – UI renders; upgrade application missing |

### 3.6 Module Transitions

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.6.1 | Area transition trigger detected, fade-out plays | ✅ | `InGameAreaTransition.ts` |
| 3.6.2 | New module / area loaded | ✅ | `Module.ts` load pipeline |
| 3.6.3 | Player position set at entry waypoint in new area | 🔶 | Sometimes placed at origin |
| 3.6.4 | Party members teleported along with player | 🔶 | Party spawn after transition incomplete |
| 3.6.5 | Global variables preserved across transitions | ✅ | `GlobalVariableManager` survives transitions |
| 3.6.6 | Previously visited areas remember object states (doors opened, items looted) | ❌ | Area state not serialised between visits |

---

## Milestone 4 – Advanced Systems

> **Goal**: All mid-game systems work, enabling progression through the majority of both games.

### 4.1 Level-Up System

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | `MenuLevelUp` navigation (5-step flow: class, abilities, skills, feats, powers) | ❌ | Shell only; step components empty |
| 4.1.2 | Ability score increase (+1 every 4 levels) | ❌ | |
| 4.1.3 | Skill point allocation per new level | ❌ | |
| 4.1.4 | Feat selection (new feat every 3 levels + class bonus) | ❌ | |
| 4.1.5 | Force power selection (Jedi class levels) | ❌ | |
| 4.1.6 | HP increase (class dice + CON modifier) | ❌ | |
| 4.1.7 | Base Attack Bonus increase applied | ❌ | |
| 4.1.8 | Saving throw bonuses updated | ❌ | |
| 4.1.9 | Prestige class selection (K2 Jedi Master / Sith Lord etc.) | ❌ | |
| 4.1.10 | Level-up persists in save game | 🔒 | Blocked by 4.1.1–4.1.8 |

### 4.2 Skill Checks

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | `SkillCheck(SKILL_PERSUADE, 10)` resolves in NWScript | ❌ | |
| 4.2.2 | Computer Use reduces spikes when slicing terminals | ❌ | |
| 4.2.3 | Repair skill heals HK / damaged droids in dialogue | ❌ | |
| 4.2.4 | Security skill unlocks containers | ❌ | |
| 4.2.5 | Stealth / awareness (detect hidden objects) | ❌ | |
| 4.2.6 | Treat Injury heals after combat when using medpac | 🔶 | Medpac item exists; skill modifier not applied |

### 4.3 Store / Merchant System

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.3.1 | Buying item deducts credits from player, adds item to inventory | ❌ | Price shown; transaction not wired |
| 4.3.2 | Selling item adds credits, removes item from inventory | ❌ | |
| 4.3.3 | Store mark-up / mark-down from `getMarkUp()` / `getMarkDown()` applied | ✅ | `MenuStore.ts:55–59` |
| 4.3.4 | Merchant inventory refreshes (restock timer or never) | ❌ | |
| 4.3.5 | Item identified / unidentified state shown | ❌ | |

### 4.4 Party System

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.4.1 | Companion joins party via `AddPartyMember` NWScript call | 🔶 | `PartyManager` holds references; spawn-in-world after join incomplete |
| 4.4.2 | Companion follows player in formation | ❌ | `ActionFollowLeader.ts` present; formation positions not calculated |
| 4.4.3 | `MenuPartySelection` lets player swap party composition | 🔶 | UI exists; saving selected party incomplete |
| 4.4.4 | Companion participates in combat (AI attacks nearest enemy) | ❌ | |
| 4.4.5 | Companion dialog (from `ActionDialogObject` on companion) | ✅ | |
| 4.4.6 | Companion inventory / equipment accessible | 🔶 | Companion `ModuleCreature` exists; `MenuEquipment` doesn't switch target |
| 4.4.7 | K2 influence system tracks relationship score | ❌ | |

### 4.5 Alignment System (Light / Dark Side)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.5.1 | `AdjustAlignment(PC, ALIGNMENT_LIGHT_SIDE, n)` changes alignment value | ❌ | NWScript call is a stub |
| 4.5.2 | Alignment value affects character model (dark side corruption) | ❌ | |
| 4.5.3 | Alignment gates certain dialog options | ❌ | |
| 4.5.4 | Alignment affects Force power unlock (K2) | ❌ | |

### 4.6 Save / Load Game

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.6.1 | Save game serialises all `GlobalVariables` to GFF | 🔶 | Read works; write `//TODO` at line 810 of `SaveGame.ts` |
| 4.6.2 | Save serialises player creature stats, equipment, inventory | ❌ | |
| 4.6.3 | Save records current module + player position | ❌ | |
| 4.6.4 | Save records area object states (looted containers, opened doors) | ❌ | |
| 4.6.5 | Save records party composition and companion states | ❌ | |
| 4.6.6 | Load game restores all of the above | 🔒 | Blocked by 4.6.1–4.6.5 |
| 4.6.7 | Auto-save on area transition | ❌ | |
| 4.6.8 | Save game thumbnail captured from current frame | 🔶 | `TextureLoader` snapshots exist; wiring to save incomplete |
| 4.6.9 | `MenuSaveLoad` / `MenuSaveName` UIs function end-to-end | 🔶 | UI renders; saving not fully wired |

### 4.7 Minigames

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.7.1 | Pazaak card game (turn logic, winning condition, wager) | 🔶 | `PazaakManager` + `MenuPazaakGame` present; wager and win/loss payout incomplete |
| 4.7.2 | Swoop Racing (accelerate, dodge obstacles, finish-line detection) | ❌ | `ModuleMGPlayer.ts` is a stub |
| 4.7.3 | Space Turret minigame (K1 Star Forge approach / K2 Ravager) | ❌ | `ModuleMGGunBank` is a stub |
| 4.7.4 | Minigame exit returns to correct module state | ❌ | |

---

## Milestone 5 – Full Game Completion

> **Goal**: Both KotOR I and KotOR II can be completed with proper endings.

### 5.1 KotOR I Story Completion

| # | Task | Status |
|---|------|--------|
| 5.1.1 | Endar Spire tutorial module completes and ejects to Taris | 🔶 |
| 5.1.2 | Taris: all main quests trigger, Sith base, Vulkar base, swoop race complete | ❌ |
| 5.1.3 | Dantooine: enclave training, first Star Map, Jedi class transition | 🔶 |
| 5.1.4 | Four Star Map planets (Tatooine, Kashyyyk, Manaan, Korriban) explorable | ❌ |
| 5.1.5 | Leviathan sequence (party split, rescue) | ❌ |
| 5.1.6 | Unknown World / Temple of the Ancients | ❌ |
| 5.1.7 | Star Forge final combat and ending cutscene | ❌ |
| 5.1.8 | Light side / dark side ending branches | ❌ |

### 5.2 KotOR II (TSL) Story Completion

| # | Task | Status |
|---|------|--------|
| 5.2.1 | Peragus Mining Facility tutorial completes | 🔶 |
| 5.2.2 | Citadel Station / Telos Surface | ❌ |
| 5.2.3 | Atris' Enclave, Handmaiden/Disciple join | ❌ |
| 5.2.4 | Three planet arcs (Nar Shaddaa, Onderon/Dxun, Dantooine/Korriban) | ❌ |
| 5.2.5 | Rebuilt Jedi Enclave conversation | ❌ |
| 5.2.6 | Malachor V and Trayus Academy final sequence | ❌ |
| 5.2.7 | Influence system affects companion Jedi training | ❌ |
| 5.2.8 | Multiple endings based on influence choices | ❌ |

### 5.3 Ending & Post-Game

| # | Task | Status |
|---|------|--------|
| 5.3.1 | Credits screen plays after final cutscene | ❌ |
| 5.3.2 | "Continue" / "New Game+" option from credits | ❌ |
| 5.3.3 | Return to main menu cleanly (scene disposal, memory cleanup) | ❌ |

---

## Ongoing / Cross-Cutting Concerns

### NWScript VM Completeness

The NWScript VM is the glue for virtually all game events. Every `//TODO` in
`NWScriptDefK1.ts` and `NWScriptDefK2.ts` is a potential story blocker.

Priority functions to implement:

| Function | Why it matters |
|----------|---------------|
| `AdjustAlignment` | All moral-choice dialogs |
| `GiveXPToCreature` | XP from kills and quests |
| `ShowLevelUpGUI` | Triggers level-up menu |
| `AddJournalQuestEntry` | Quest tracking throughout game |
| `SetGlobalBoolean/Number/String` | Plot flag persistence |
| `ChangeToStandardFaction` | Creature hostility changes |
| `ClearAllActions` | Conversation interrupts and scripted events |
| `ActivateForce` (K2) | Force power use |

### Performance & Memory Management

| # | Task |
|---|------|
| P.1 | Dispose Three.js geometries / textures when areas unload |
| P.2 | Worker pool for texture decompression (DXT/TXI parsing off main thread) |
| P.3 | Audio context suspended when tab is backgrounded |
| P.4 | BIF chunk streaming to avoid loading full archives into memory |
| P.5 | GPU memory budget warnings in browser DevTools |

### Browser Compatibility

| # | Task |
|---|------|
| B.1 | Chrome 89+: File System Access API – primary target ✅ |
| B.2 | Firefox 111+: File System Access API now supported – test audio (AudioWorklet differences) |
| B.3 | Safari 15.2+: limited File System Access; fallback to `<input type="file">` for directory |
| B.4 | Mobile (iOS / Android): virtual gamepad overlay, touch controls |
| B.5 | `COOP` / `COEP` headers required for `SharedArrayBuffer` (web workers) |

### Accessibility & UX

| # | Task |
|---|------|
| A.1 | Keyboard-only navigation through all menus |
| A.2 | Subtitle / closed-caption toggle for all voiced lines |
| A.3 | Colorblind-friendly combat feedback icons |
| A.4 | Screen-reader labels on launcher profile UI |

---

## Known Bugs & Blockers

| # | Bug | Severity | Location |
|---|-----|----------|---------|
| K.1 | `TODO` in `SaveGame.ts:810` prevents write of global variables | 🔴 Critical | `src/engine/SaveGame.ts:810` |
| K.2 | Enemy perception not initialised → enemies never enter combat | 🔴 Critical | `src/module/ModuleCreature.ts:1007` |
| K.3 | Player death has no handler → engine enters broken state | 🔴 Critical | `src/module/ModuleCreature.ts` |
| K.4 | `AdjustAlignment` NWScript stub → all moral choices silent | 🔴 Critical | `src/nwscript/NWScriptDefK1.ts:4451` |
| K.5 | `ClearAllActions` stub → conversation interrupts fail | 🔴 Critical | `src/nwscript/NWScriptDefK1.ts:4695` |
| K.6 | `ShowLevelUpGUI` stub → player never gets level-up prompt | 🔴 Critical | `src/nwscript/NWScriptDefK1.ts:6542` |
| K.7 | Area object state not persisted → containers always re-appear looted | 🟠 High | `src/module/Module.ts` |
| K.8 | Party spawn after area transition drops companions | 🟠 High | `src/managers/PartyManager.ts` |
| K.9 | Store buy/sell transactions not wired to credit balance | 🟠 High | `src/game/kotor/menu/MenuStore.ts` |
| K.10 | Level-up menu `MenuLevelUp` is an empty shell | 🟠 High | `src/game/kotor/menu/MenuLevelUp.ts` |
| K.11 | Off-hand attack not scheduled in dual-wield setup | 🟡 Medium | `src/combat/CombatRound.ts` |
| K.12 | Dialog camera framing positions incorrect in some scenes | 🟡 Medium | `src/game/kotor/menu/InGameDialog.ts` |
| K.13 | Item equip/unequip stat recalculation missing | 🟡 Medium | `src/actions/ActionEquipItem.ts` |
| K.14 | CORS headers not set → SharedArrayBuffer unavailable | 🟡 Medium | Web server config |
| K.15 | `TODO` in `NWScriptDefK1.ts:8110–8121` for faction changes | 🟡 Medium | `src/nwscript/NWScriptDefK1.ts` |

---

## Recommended Implementation Order

Given the dependency chain, the following sequence minimises blocked work:

```
Phase A  (Engine foundation)
  → K.1  Fix SaveGame global-variable write
  → K.2  Implement enemy perception (distance check → enter combat state)
  → K.3  Player death handler + death/reload UI

Phase B  (Combat completeness)
  → 3.4.10  Enemy AI: select and queue attack action each round
  → 3.4.16  Party members enter and fight in combat
  → 3.4.13  Feat resolution (Flurry, Power Attack, Sneak Attack)
  → K.11    Dual-wield off-hand scheduling

Phase C  (Progression gates)
  → K.6   ShowLevelUpGUI NWScript stub → open MenuLevelUp
  → 4.1   Full level-up sub-menus (abilities, skills, feats, powers)
  → K.4   AdjustAlignment → moral-choice system
  → K.5   ClearAllActions → scripted event interrupts

Phase D  (Economy & party)
  → 4.3.1  Store buy/sell transaction
  → 4.4.1  Companion spawn after join
  → 4.4.2  Formation follow
  → 4.6    Save / load complete round-trip

Phase E  (Skill checks & NWScript cleanup)
  → 4.2   All six skill check types
  → K.15  Faction change NWScript functions
  → Remaining NWScript TODO stubs in K1 & K2 defs

Phase F  (Story completion)
  → 5.1   KotOR I module-by-module story pass
  → 5.2   KotOR II module-by-module story pass
  → 5.3   Endings and credits
```

---

*Last updated: 2026-03-06*  
*Based on codebase analysis of WebKotor (fork of KotOR.js v2.1.0)*
