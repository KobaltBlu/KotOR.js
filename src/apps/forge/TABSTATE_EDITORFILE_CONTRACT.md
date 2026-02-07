# TabState and EditorFile Contract Documentation

This document defines the contract between `TabState` (tab lifecycle and UI) and `EditorFile` (file abstraction and I/O) in Forge.

## EditorFile Responsibilities

**Location**: `src/apps/forge/EditorFile.ts`

### Core Properties

- `buffer: Uint8Array` — In-memory file data (primary buffer)
- `buffer2?: Uint8Array` — Secondary buffer for dual-file types (e.g. MDL+MDX)
- `unsaved_changes: boolean` — Tracks if editor has uncommitted changes (getter/setter with event)
- `resref: string` — Resource name (without extension) (getter/setter with event)
- `reskey: number` — Resource type key (from `ResourceTypes` enum) (getter/setter with event)
- `ext: string` — File extension (derived from reskey) (getter/setter with event)
- `protocol: EditorFileProtocol` — File source protocol (FILE, BIF, ERF, MOD, RIM, ZIP, 7ZIP)
- `path: string` — File path (local, game, or project filesystem)
- `archive_path?: string` — Path to containing archive (if protocol is BIF/ERF/MOD/RIM)
- `handle?: FileSystemFileHandle` — Browser File System Access API handle
- `useGameFileSystem: boolean` — If true, uses `GameFileSystem` (game installation)
- `useProjectFileSystem: boolean` — If true, uses `ProjectFileSystem` (project directory)
- `location: FileLocationType` — LOCAL, ARCHIVE, or OTHER

### Core Methods

#### `async readFile(): Promise<EditorFileReadResponse>`
Loads file buffer from appropriate source based on protocol:
- **If `buffer` already populated**: returns cached buffer
- **If `archive_path` exists**: 
  - `BIF`: loads from BIFObject
  - `ERF/MOD`: loads from ERFObject
  - `RIM`: loads from RIMObject
- **If `path` exists**:
  - `useGameFileSystem=true`: uses `GameFileSystem.readFile()`
  - `useProjectFileSystem=true`: uses `ProjectFileSystem.readFile()`
  - Otherwise: Node `fs.readFile()` (Electron) or `FileSystemFileHandle` (Browser)

Special case: `readMdlMdxFile()` for MDL/MDX dual files.

**Returns**: `{ buffer: Uint8Array, buffer2?: Uint8Array }`

#### `setPath(filepath: string)`
Parses filepath URL and extracts:
- Protocol (file://, bif://, erf://, mod://, rim://, zip://, 7zip://)
- Pathname (normalized, slashes replaced)
- Special prefixes: `game.dir`, `project.dir`, `system.dir` → sets filesystem flags
- Query params: `?resref=X&restype=Y` for archive resources
- Sets `this.resref`, `this.ext`, `this.reskey`, `this.location`

#### `getFilename(): string`
Returns `${resref}.${ext}` for display.

### Events (extends EventListenerModel)

- `onNameChanged` — Triggered when resref, reskey, or ext changes
- `onSaveStateChanged` — Triggered when `unsaved_changes` changes
- `onSaved` — (referenced but not seen triggered in EditorFile itself; likely used by tabs)

---

## TabState Responsibilities

**Location**: `src/apps/forge/states/tabs/TabState.tsx`

### Core Properties

- `id: number` — Unique tab ID (from `EditorTabManager.GetNewTabID()`)
- `type: string` — Tab class name (e.g. "TabDLGEditorState")
- `file: EditorFile` — Associated file (optional; not all tabs have files)
- `tabName: string` — Display name in tab bar
- `visible: boolean` — Whether tab is currently shown
- `isClosable: boolean` — Whether user can close tab (default: true)
- `singleInstance: boolean` — Only one instance of this tab type allowed (default: false)
- `isDestroyed: boolean` — Tab has been destroyed and should not be used
- `saveTypes: FilePickerAcceptType[]` — File picker filters for save dialog

### Core Methods

#### `show()`
- Hides all other tabs via `tabManager.hideAll()`
- Sets `visible = true`
- Sets `tabManager.currentTab = this`
- Triggers `onTabShow` events (manager and tab)
- Attaches keyboard event listeners (`keydown`, `keyup`)

#### `hide()`
- Sets `visible = false`
- Triggers `onTabHide` events
- Removes keyboard event listeners

#### `remove()`
- Calls `tabManager.removeTab(this)`
- Triggers `onTabRemoved` event

#### `destroy()`
- Sets `isDestroyed = true`
- Removes keyboard listeners if still visible
- Triggers `onTabDestroyed` event

#### `attach(tabManager: EditorTabManager)`
- Called by `EditorTabManager.addTab()`
- Stores reference to tab manager
- Sets `isDestroyed = false`

#### `async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array>`
**Override in subclasses** to export tab state to saveable buffer.
- Default: returns `this.file.buffer` or empty array
- Example overrides:
  - `TabUTCEditorState`: exports `creature.blueprint.export()`
  - `TabTwoDAEditorState`: exports TwoDA to buffer
  - `TabTextEditorState`: encodes text content to buffer

#### `updateFile()`
**Override in subclasses** to sync tab state → file buffer before save.
- Default: no-op
- Called by `save()` and `saveAs()` before `getExportBuffer()`

#### `async save(): Promise<boolean>`
1. Calls `updateFile()` (subclass hook)
2. If from archive (`archive_path` exists), calls `saveAs()` instead
3. Calls `getExportBuffer()`
4. Writes buffer to filesystem:
   - **Electron**: `fs.writeFile(path, buffer)`
   - **Browser**: `handle.createWritable()` → `write()` → `close()`
5. Updates `file.buffer` and sets `file.unsaved_changes = false`
6. Returns `true` on success, `false` on error

#### `async saveAs(): Promise<boolean>`
1. Calls `updateFile()` (subclass hook)
2. Shows save dialog (Electron: `dialog.showSaveDialog()`, Browser: `showSaveFilePicker()`)
3. Calls `getExportBuffer()`
4. Writes buffer to new path/handle
5. Updates `file.path`, `file.handle`, `file.buffer`, sets `unsaved_changes = false`, clears `archive_path`
6. Calls `editorFileUpdated()` to refresh tab name
7. Returns `true` on success, `false` on error

#### `async compile(): Promise<boolean>`
**Override in subclasses** for compilable files (e.g. NSS → NCS).
- Default: returns `false`

#### `storeState(): TabStoreState`
**Override in subclasses** to persist tab state across sessions.
- Default: `{ type: this.type, file: this.file }`
- Used by `ForgeState.saveOpenTabsState()` → `ConfigClient.set('open_tabs', ...)`
- Restored via `EditorTabManager.restoreTabState(tabState)`

#### `editorFileUpdated()`
Updates `tabName` based on `file.resref`, `file.ext`, and `unsaved_changes`:
- With changes: `"filename.ext *"`
- Without changes: `"filename.ext"`
- Triggers `onTabNameChange` event

#### `setContentView(view: React.ReactElement)`
Sets the React element to render when tab is visible.

#### `getResourceID(): any`
**Override in subclasses** to return a unique resource identifier for deduplication.
- Used by `EditorTabManager.isResourceIdOpenInTab()` to prevent opening same resource twice
- Default: returns `undefined` (no deduplication)

### Events (extends EventListenerModel)

- `onTabShow` — Tab becomes visible
- `onTabHide` — Tab becomes hidden
- `onTabRemoved` — Tab removed from manager
- `onTabDestroyed` — Tab destroyed (cleanup)
- `onTabNameChange` — Tab name changed
- `onEditorFileLoad` — File loaded into editor (custom, used by subclasses)
- `onEditorFileChange` — File content changed (custom, used by subclasses)
- `onEditorFileSaved` — File saved (custom, used by subclasses)
- `onKeyDown` — Keyboard key pressed (while tab visible)
- `onKeyUp` — Keyboard key released (while tab visible)
- `onPropertyChange` — Generic property changed (via `setProperty()`)

---

## EditorTabManager Responsibilities

**Location**: `src/apps/forge/managers/EditorTabManager.ts`

### Core Methods

#### `addTab(tab: TabState)`
1. If `tab.singleInstance=true`, checks if instance already exists → shows existing tab instead
2. Checks if resource ID already open (`isResourceIdOpenInTab()`) → shows existing tab instead
3. Sets `currentTab = tab`
4. Calls `tab.attach(this)` and `tab.show()`
5. Adds to `tabs[]` array
6. Triggers `onTabAdded` event

#### `removeTab(tab: TabState)`
1. Calls `tab.destroy()`
2. Removes from `tabs[]` array
3. If removed tab was `currentTab`, shows sibling tab
4. Triggers `onTabRemoved` event

#### `restoreTabState(tabState: TabStoreState)`
Switch statement on `tabState.type`:
- Reconstructs `EditorFile` via `Object.assign(new EditorFile(), tabState.file)`
- Instantiates correct tab class (e.g. `new TabDLGEditorState({ editorFile })`)
- Calls `addTab()`

**Must be updated** when adding new tab types.

---

## Implementation Contract for New Editors

When creating a new editor tab, follow this pattern:

### 1. Create Tab State (`src/apps/forge/states/tabs/TabXYZEditorState.tsx`)

```typescript
import React from "react";
import { TabXYZEditor } from "../../components/tabs/tab-xyz-editor/TabXYZEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabXYZEditorState extends TabState {
  tabName: string = 'XYZ Editor';
  
  // Add editor-specific state here
  xyzData: any; // Parsed data from file

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    
    if(this.file){
      this.tabName = this.file.getFilename();
    }
    
    // Set save types for file picker
    this.saveTypes = [
      {
        description: 'XYZ File',
        accept: {
          'application/octet-stream': ['.xyz']
        }
      }
    ];

    this.setContentView(<TabXYZEditor tab={this}></TabXYZEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      // Parse buffer using appropriate TS parser
      this.xyzData = KotOR.XYZObject.FromBuffer(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  // Override: export tab state to buffer
  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.xyzData){
      return this.xyzData.export(); // or serialize to buffer
    }
    return new Uint8Array(0);
  }

  // Override: sync tab UI state to data before save
  updateFile() {
    // Update this.xyzData from UI state if needed
  }

  // Override: return unique ID for deduplication
  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
```

### 2. Create Tab Component (`src/apps/forge/components/tabs/tab-xyz-editor/TabXYZEditor.tsx`)

```typescript
import React, { useState, useEffect } from "react";
import { TabXYZEditorState } from "../../../states/tabs";
import { MenuBar, MenuItem } from "../../common/MenuBar";

interface BaseTabProps {
  tab: TabXYZEditorState;
}

export const TabXYZEditor = function(props: BaseTabProps){
  const tab = props.tab as TabXYZEditorState;
  const [data, setData] = useState(tab.xyzData);

  useEffect(() => {
    const handler = () => setData(tab.xyzData);
    tab.addEventListener('onEditorFileLoad', handler);
    return () => tab.removeEventListener('onEditorFileLoad', handler);
  }, [tab]);

  const menuItems: MenuItem[] = [
    {
      label: 'File',
      children: [
        { label: 'Save', onClick: () => tab.save() },
        { label: 'Save As', onClick: () => tab.saveAs() }
      ]
    }
  ];

  return (
    <div className="forge-xyz-editor">
      <MenuBar items={menuItems} />
      {/* Editor UI here */}
    </div>
  );
};
```

### 3. Register in FileTypeManager (`src/apps/forge/FileTypeManager.ts`)

Add case to `onOpenResource()` switch:

```typescript
case 'xyz':
  ForgeState.tabManager.addTab(new TabXYZEditorState({editorFile: res}));
break;
```

### 4. Register in EditorTabManager (`src/apps/forge/managers/EditorTabManager.ts`)

Add case to `restoreTabState()` switch:

```typescript
case 'TabXYZEditorState':
  this.addTab(new TabXYZEditorState({editorFile: tabState.file}));
break;
```

### 5. Export from Index (`src/apps/forge/states/tabs/index.ts`)

```typescript
export { TabXYZEditorState } from './TabXYZEditorState';
```

---

## File Loading Flow

1. **User opens file** → `FileTypeManager.onOpenResource(editorFile)`
2. **Routing** → `FileTypeManager` instantiates correct `Tab*State` with `editorFile`
3. **Tab init** → `TabState` constructor calls `this.openFile()`
4. **File read** → `editorFile.readFile()` loads buffer based on protocol
5. **Parse** → Tab parses buffer using TS parser (e.g. `GFFObject.FromBuffer()`)
6. **Render** → Tab triggers `onEditorFileLoad` event → React UI updates

## File Saving Flow

1. **User triggers save** → `tab.save()` or `tab.saveAs()`
2. **Sync state** → `tab.updateFile()` (override hook to sync UI → data)
3. **Export** → `tab.getExportBuffer()` (override hook to serialize data → buffer)
4. **Write** → Platform-specific write (Node fs or Browser FileSystemFileHandle)
5. **Update state** → `editorFile.buffer = savedBuffer`, `editorFile.unsaved_changes = false`
6. **UI update** → `editorFileUpdated()` removes `*` from tab name

## Persistence/Restoration Flow

1. **On app exit** → `ForgeState.saveOpenTabsState()` (currently disabled but available)
   - Calls `tab.storeState()` for each open tab
   - Saves to `ConfigClient.set('open_tabs', tabStoreStates)`
2. **On app init** → `ForgeState.InitializeApp()`
   - Reads `ConfigClient.get('open_tabs', [])`
   - Calls `EditorTabManager.restoreTabState(tabState)` for each
3. **Restoration** → `restoreTabState()` switch on `tabState.type`
   - Reconstructs `EditorFile` from serialized data
   - Instantiates correct tab class
   - Tab constructor calls `openFile()` → buffer loads → UI renders

## Unsaved Changes Tracking

- `EditorFile.unsaved_changes` setter triggers `onSaveStateChanged` event
- `TabState.editorFileUpdated()` listens to this event and updates `tabName` (adds/removes `*`)
- Tab subclass should set `this.file.unsaved_changes = true` when user edits data
- `save()` and `saveAs()` set `unsaved_changes = false` on success

## Archive (BIF/ERF/MOD/RIM) Handling

When opening from archive:
- `EditorFile.path` = URL format: `erf://path/to/archive.erf?resref=myfile&restype=utc`
- `EditorFile.archive_path` = `path/to/archive.erf`
- `EditorFile.resref` = `myfile`
- `EditorFile.ext` = `utc`
- `readFile()` loads from archive object
- `save()` → forces `saveAs()` (cannot save back to archive directly)
- Alternative: use "Save to Module/Override/RIM" modals for structured archive saving

## Browser vs Electron Differences

### Electron
- Uses Node `fs` module directly
- `dialog.showSaveDialog()` returns file path as string
- No permission prompts

### Browser
- Uses File System Access API (`FileSystemFileHandle`)
- `window.showSaveFilePicker()` returns handle
- Requires permission prompts (`queryPermission()`, `requestPermission()`)
- Handle stored in `EditorFile.handle` for future writes

## Best Practices

1. **Always call `updateFile()` before `getExportBuffer()`** in save flow (already handled by `TabState.save/saveAs`)
2. **Set `file.unsaved_changes = true` when user edits data** in React UI
3. **Parse file in constructor or `openFile()`** and trigger `onEditorFileLoad` when done
4. **Use existing TS parsers** from `src/resource/*` and `src/managers/*`
5. **Implement `getResourceID()`** to prevent duplicate tabs for same resource
6. **Add case to `FileTypeManager` and `restoreTabState()`** for new tab types
7. **Use `TabState` base class methods** (`save`, `saveAs`, `show`, `hide`) — don't override unless necessary

## Maintenance

- Keep this document in sync with `EditorTabManager.restoreTabState()` (switch cases must match all tab types) and `FileTypeManager.onOpenResource()` (ext → tab mapping).
- When adding a new tab type, add a case to both `restoreTabState()` and the `FileTypeManager` switch.
