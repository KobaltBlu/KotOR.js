# Plan: Merge HolocronToolset into KotOR.js Forge

## TL;DR
Port all missing HolocronToolset (Python/Qt) functionality into `src/apps/forge/` (TypeScript/React), merging into existing editors where they overlap and creating new ones where no TS equivalent exists. The goal is feature parity with HolocronToolset inside Forge, never duplicating what already works in TS.

---

## Phase 1: Foundation — Shared Infrastructure (blocks all later phases)

### Step 1.1: HTInstallation-equivalent 2DA Registry
- **What**: Port the 60+ 2DA registry constants and lazy-loading cache from Python `data/installation.py` → new TS class `src/apps/forge/data/InstallationRegistry.ts`
- **Why**: Nearly every editor needs 2DA lookups (appearances, baseitems, feats, skills, etc.). HolocronToolset uses `HTInstallation` as the central data broker. Forge currently relies on raw `ResourceLoader` without a typed registry.
- **Reference**: Python `HTInstallation` class with constants like `TwoDA_APPEARANCES`, `TwoDA_BASEITEMS`, `TwoDA_FEATS`, etc.
- **Merge with**: Existing `ResourceLoader.ts` (scope precedence logic already correct). Add cached `TwoDAObject` accessors on top.
- **Key files to modify**:
  - Create: `src/apps/forge/data/InstallationRegistry.ts`
  - Modify: `src/apps/forge/data/` index or imports
  - Reference: `src/loaders/ResourceLoader.ts`, `src/resource/TwoDAObject.ts`

### Step 1.2: Inventory Browser Dialog Component
- **What**: Port the reusable inventory dialog from Python `dialogs/inventory.py` → new React component `src/apps/forge/components/modal/ModalInventoryBrowser.tsx` + state `src/apps/forge/states/modal/ModalInventoryBrowserState.ts`
- **Why**: Used by UTC (creatures), UTP (placeables), UTM (merchants), and the Savegame editor. The Python version has: 13 equipment slots with drag-drop, 3-source item browser (core/module/override), item icon resolution from 2DA, store mode, droid detection.
- **Merge with**: Existing UTC editor slot droppers (extend, don't replace). The TS UTC editor already has slot management — add the missing item browser panel and drag-drop between slots.
- **Key files to modify**:
  - Create: `src/apps/forge/components/modal/ModalInventoryBrowser.tsx`, `src/apps/forge/states/modal/ModalInventoryBrowserState.ts`
  - Modify: `src/apps/forge/components/tabs/tab-utc-editor/TabUTCEditor.tsx` (integrate browser)
  - Modify: `src/apps/forge/components/tabs/tab-utp-editor/TabUTPEditor.tsx` (integrate browser)
  - Modify: `src/apps/forge/components/tabs/tab-utm-editor/TabUTMEditor.tsx` (integrate browser)
- **Depends on**: Step 1.1 (needs baseitems.2da for item browsing)

### Step 1.3: CExoLocString Editor Enhancement
- **What**: Verify the existing `CExoLocStringEditor` component supports full language selection, StrRef lookup, and text editing. Port any missing features from Python `dialogs/edit/locstring.py`.
- **Merge with**: Existing `src/apps/forge/components/CExoLocStringEditor/`
- **Key files**: `src/apps/forge/components/CExoLocStringEditor/`

---

## Phase 2: Editor Enhancements — Upgrade Existing Editors (parallel with each other, depends on Phase 1)

### Step 2.1: ARE Editor — Complete All Tabs
- **What**: Port the missing ARE editor tabs (Environment, Scripts, Rooms) and minimap visualization from Python `editors/are.py`.
- **Missing features**: Fog settings (color/near/far), ambient/diffuse/dynamic light colors, stealth XP settings, TSL-only weather fields (dirt colors, grass emissive), script assignments (4 slots), room list from LYT, minimap texture rendering with walkmesh overlay, map coordinate system (zoom, north axis, image/world points).
- **Merge with**: Existing `TabAREEditor.tsx` which has Basic and Audio tabs functional.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-are-editor/TabAREEditor.tsx`
  - `src/apps/forge/states/tabs/TabAREEditorState.tsx`

### Step 2.2: DLG Editor — Complete Feature Set
- **What**: Port advanced DLG features from Python `editors/dlg/editor.py` into the existing (already functional) DLG editor.
- **Missing features**: Orphaned node management (auto-collect/drag-to-reintegrate), advanced search operators (AND/OR, property existence), MimeData inter-DLG copy/paste, animation selection dialog, stunt integration, computer type / conversation type enums.
- **Merge with**: Existing `TabDLGEditor.tsx` which already has tree view, property panels, search, undo/redo, validation.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-dlg-editor/TabDLGEditor.tsx`
  - `src/apps/forge/components/tabs/tab-dlg-editor/DLGTreeView.tsx`
  - `src/apps/forge/components/tabs/tab-dlg-editor/DLGNodePropertiesPanel.tsx`
  - `src/apps/forge/states/tabs/TabDLGEditorState.tsx`

### Step 2.3: GIT Editor — Instance Property Editing & Visualization
- **What**: Port GIT editor features from Python `editors/git/git.py` into the existing functional GIT editor.
- **Missing features**: Instance modes (instance/geometry/spawn), marquee selection, instance label customization (resref/tag/name), walkmesh overlay, LYT room boundaries, undo/redo commands (Duplicate/Move/Rotate/Delete/Insert), instance filtering by text, context menu actions.
- **Merge with**: Existing `TabGITEditor.tsx` which has sidebar with 9 instance lists and basic property editing.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-git-editor/` (all components)
  - `src/apps/forge/states/tabs/TabGITEditorState.tsx`

### Step 2.4: WOK Editor — Material Painting & Transition Editing
- **What**: Port walkmesh editing (not just viewing) from Python `editors/bwm.py`.
- **Missing features**: Face material painting (Shift+Click), material color palette selector, transition edge list with double-click highlight, face index feedback, editable surface properties (walkable/LOS/grass/sound flags).
- **Merge with**: Existing `TabWOKEditor.tsx` which has 3D view and readonly face properties.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-wok-editor/TabWOKEditor.tsx`
  - `src/apps/forge/states/tabs/TabWOKEditorState.tsx`

### Step 2.5: PTH Editor — Property Panel & Editing
- **What**: Port path editing from Python `editors/pth.py` — add property panel with editable connection fields.
- **Missing features**: Waypoint position editing via form, connection list with add/remove, status bar feedback, walkmesh overlay.
- **Merge with**: Existing `TabPTHEditor.tsx` which has 3D interaction (Select/Add point/Add connection modes) but no form-based editing.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-pth-editor/TabPTHEditor.tsx`
  - `src/apps/forge/states/tabs/TabPTHEditorState.tsx`

### Step 2.6: UTC Editor — Inventory Browser Integration
- **What**: Wire the new inventory browser dialog (Step 1.2) into the creature editor. Add missing fields from Python `editors/utc.py`.
- **Missing features**: Inventory item list browser (add from core/module/override), drag-drop between equipment slots and inventory, droid slot image detection, level-up history per class.
- **Merge with**: Existing `TabUTCEditor.tsx` which already has 85+ fields and 15 equipment slots.
- **Key files**: `src/apps/forge/components/tabs/tab-utc-editor/TabUTCEditor.tsx`
- **Depends on**: Step 1.2

### Step 2.7: UTI Editor — Item Browser & Icon Resolution
- **What**: Add item icon resolution and 3-source browsing from Python `editors/uti.py`.
- **Missing features**: TPC icon preview (from baseitems.2da → icon resref), load-from-location dialog, duplicate item support.
- **Merge with**: Existing `TabUTIEditor.tsx` which has basic property editing and localized strings.
- **Key files**: `src/apps/forge/components/tabs/tab-uti-editor/TabUTIEditor.tsx`
- **Depends on**: Step 1.1

---

## Phase 3: New Editors — Missing Functionality (parallel with each other, depends on Phase 1)

### Step 3.1: Savegame Editor
- **What**: Port the full savegame editor from Python `editors/savegame.py` → new TS editor.
- **Features**: Party table (gold, XP, components), global variables (bool/number/string/location), per-character editing (stats, abilities, skills, feats, class/level, alignment), save metadata (screenshot, name, area, time), NPC influence table, available NPCs checklist, event queue flushing, cached module rebuild.
- **Pattern**: New `TabSavegameEditorState.tsx` + `TabSavegameEditor.tsx` component following existing tab patterns.
- **Note**: The existing `TabSAVEditorState.tsx` handles SAV as ERF archive viewing. The savegame editor is different — it edits the internal data structures. Consider extending the existing SAV tab or creating a parallel editor mode.
- **Key files to create**:
  - `src/apps/forge/components/tabs/tab-savegame-editor/TabSavegameEditor.tsx`
  - `src/apps/forge/states/tabs/TabSavegameEditorState.tsx`
- **Or modify**: Extend existing `TabSAVEditorState.tsx` with internal editing panels

### Step 3.2: Module Clone Dialog
- **What**: Port module cloning from Python `dialogs/clone_module.py` → new modal dialog.
- **Features**: Source module selection, new identifier/prefix/name, asset cloning options (textures, lightmaps, doors, placeables, sounds, pathing), async execution with progress.
- **Key files to create**:
  - `src/apps/forge/components/modal/ModalCloneModule.tsx`
  - `src/apps/forge/states/modal/ModalCloneModuleState.ts`

### Step 3.3: Indoor Settings Dialog
- **What**: Port indoor map settings from Python `dialogs/indoor_settings.py` → new modal dialog.
- **Features**: Indoor map name, lighting color, module ID/warp code, skybox selection from kits, game version targeting.
- **Merge with**: Existing Indoor Builder tab (add settings button/panel).
- **Key files to create/modify**:
  - `src/apps/forge/components/modal/ModalIndoorSettings.tsx`
  - `src/apps/forge/states/modal/ModalIndoorSettingsState.ts`
  - Modify: `src/apps/forge/components/tabs/tab-indoor-builder/TabIndoorBuilder.tsx` (add settings trigger)

### Step 3.4: Insert Instance Dialog Enhancement
- **What**: Port the template picker from Python `dialogs/insert_instance.py`. 
- **Features**: Template picker (UTC/UTD/UTE/UTP/UTS/UTM/UTT/UTW), create/reuse/copy modes, resref auto-generation, location selector (override/module capsules).
- **Merge with**: Existing Module Editor's blueprint browser system.
- **Key files to modify**:
  - `src/apps/forge/components/tabs/tab-module-editor/` (blueprint browser)

---

## Phase 4: TSLPatcher & Advanced Tools (depends on Phases 1-3)

### Step 4.1: TSLPatcher Data Editor Enhancement
- **What**: Upgrade the existing patcher project UI from metadata-only to full instruction editing from Python `dialogs/tslpatchdata_editor.py`.
- **Features**: 2DA memory/token editing, TLK StrRef insertion, GFF field modification rules, INI config parsing, file packaging.
- **Merge with**: Existing `ModalPatcherProject.tsx` (extend with instruction editing panels).
- **Key files to modify**:
  - `src/apps/forge/components/modal/ModalPatcherProject.tsx`
  - `src/apps/forge/states/modal/ModalPatcherProjectState.ts`

### Step 4.2: Undo/Redo System (Cross-Editor)
- **What**: Port the undo/redo pattern from Python's `QUndoStack` usage into a generic TS undo system. Currently only the DLG editor has undo/redo.
- **Key editors needing it**: GIT (Duplicate/Move/Rotate/Delete/Insert commands), 2DA, SSF, WOK, PTH.
- **Pattern**: Create `src/apps/forge/managers/UndoManager.ts` with command pattern (execute/undo/redo).
- **Merge with**: Existing DLG editor's undo system (generalize it).

---

## Phase 5: Blender Integration (optional, lowest priority)

### Step 5.1: Blender IPC Client
- **What**: Port Blender IPC from Python `blender/` → TS equivalent. Enables live 3D editing sync between Forge and Blender.
- **Features**: Process detection, bidirectional IPC (load module, sync instances, transform syncing), GIT serialization.
- **Create**: `src/apps/forge/blender/BlenderIntegration.ts`, `BlenderCommands.ts`, `BlenderDetection.ts`
- **Scope note**: This is a lower priority "nice to have" — Forge already has THREE.js-based 3D editing that exceeds what Blender IPC offers for basic editing.

---

## Relevant Files

### Existing TS to Modify
- `src/apps/forge/components/tabs/tab-are-editor/TabAREEditor.tsx` — complete missing tabs
- `src/apps/forge/components/tabs/tab-dlg-editor/*.tsx` — enhance with orphan management, advanced search
- `src/apps/forge/components/tabs/tab-git-editor/*.tsx` — add modes, undo, marquee, overlay
- `src/apps/forge/components/tabs/tab-wok-editor/TabWOKEditor.tsx` — add material painting
- `src/apps/forge/components/tabs/tab-pth-editor/TabPTHEditor.tsx` — add property panel
- `src/apps/forge/components/tabs/tab-utc-editor/TabUTCEditor.tsx` — integrate inventory browser
- `src/apps/forge/components/tabs/tab-uti-editor/TabUTIEditor.tsx` — add icons and browser
- `src/apps/forge/components/tabs/tab-indoor-builder/TabIndoorBuilder.tsx` — add settings dialog
- `src/apps/forge/components/modal/ModalPatcherProject.tsx` — enhance with instructions
- `extensions/kotor-forge-vscode/src/webview/forgeEditorRegistry.ts` — register new editor types
- `extensions/kotor-forge-vscode/src/providers/KotorForgeProvider.ts` — register file extensions

### New TS to Create
- `src/apps/forge/data/InstallationRegistry.ts` — 2DA registry + cache
- `src/apps/forge/components/modal/ModalInventoryBrowser.tsx` — inventory dialog
- `src/apps/forge/states/modal/ModalInventoryBrowserState.ts`
- `src/apps/forge/components/tabs/tab-savegame-editor/TabSavegameEditor.tsx` — savegame editor
- `src/apps/forge/states/tabs/TabSavegameEditorState.tsx`
- `src/apps/forge/components/modal/ModalCloneModule.tsx`
- `src/apps/forge/states/modal/ModalCloneModuleState.ts`
- `src/apps/forge/components/modal/ModalIndoorSettings.tsx`
- `src/apps/forge/states/modal/ModalIndoorSettingsState.ts`
- `src/apps/forge/managers/UndoManager.ts` — generic undo system

### Python Reference Files (read-only, for porting)
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/data/installation.py` — 2DA registry
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/dialogs/inventory.py` — inventory dialog
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/savegame.py` — savegame editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/are.py` — ARE editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/bwm.py` — walkmesh editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/git/git.py` — GIT editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/dlg/editor.py` — DLG editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/editors/pth.py` — PTH editor
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/dialogs/clone_module.py` — clone module
- `vendor/PyKotor/Tools/HolocronToolset/src/toolset/gui/dialogs/indoor_settings.py` — indoor settings

---

## Verification

1. **Unit tests**: Run `npm test` after each phase — existing tests must pass (no regressions)
2. **Compile check**: `npm run webpack:dev` from root must compile cleanly
3. **Extension build**: `npm run compile` from `extensions/kotor-forge-vscode/` must succeed
4. **Manual testing per editor**:
   - ARE: Open a .are file → verify all 6 tabs render and edit
   - DLG: Open a .dlg file → verify tree view, copy/paste between DLGs, orphan detection
   - GIT: Open a .git file → verify all 9 instance types, mode switching, undo/redo
   - WOK: Open a .wok file → verify face material painting with Shift+Click
   - PTH: Open a .pth file → verify waypoint property editing
   - UTC: Open a .utc file → verify inventory browser opens and item drag-drop works
   - SAV: Open a .sav file → verify savegame internals (party, globals, characters)
   - Clone: Tools menu → Clone Module → verify module duplication
5. **Type safety**: `npx tsc --noEmit` on touched files
6. **Extension registry**: Verify new editor types appear in `getSupportedEditorTypes()`

---

## Decisions
- **No Blender IPC in Phase 1-4**: THREE.js 3D editing in Forge is already more capable for basic operations. Blender integration is Phase 5 (optional).
- **Extend existing SAV tab, don't replace**: The ERF-archive view of .sav files is useful. Add savegame-internal editing as a separate mode/tab within the same editor.
- **Use existing React/TabState pattern**: All new editors follow the TabState + React component pattern. No new architectural patterns introduced.
- **Undo system is generic**: One `UndoManager` shared across editors, not per-editor implementations.
- **K1/TSL conditional fields**: Follow existing pattern (check game type, conditionally show TSL-only fields like dirt colors, grass emissive, etc.).

## Further Considerations
1. **Priority ordering**: Phase 1 → Phase 2 (parallel steps) → Phase 3 (parallel) → Phase 4 → Phase 5. Recommend starting with Step 1.1 (2DA registry) as it unblocks the most downstream work.
2. **Incremental delivery**: Each step produces a testable increment. Steps within Phase 2 and Phase 3 can be done in any order or parallelized across developers.
3. **PyKotor library types**: Some Python classes in `Libraries/PyKotor/src/pykotor/` (e.g., `resource/generics/`, `tools/`) have TS equivalents in `src/resource/` and `src/module/`. The porting should reference these for data structures (GFF fields, 2DA columns) but NOT port the Python library classes — use existing TS resource classes.
