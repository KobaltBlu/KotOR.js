# AGENTS.md — KotOR.js & Forge

This file gives AI coding agents (Cursor, GitHub Copilot, Claude, etc.) the context needed to work effectively in this repository.

## What This Repo Is

- **KotOR.js**: A remake of the Odyssey engine (KotOR I & II). It provides:
  - **Library** (`src/`): Resource loaders/savers (GFF, 2DA, TLK, MDL, TPC, etc.), game systems, Three.js-based rendering.
  - **Forge** (`src/apps/forge/`): A modding toolkit — visual editors for KotOR file formats (UTC, 2DA, DLG, TLK, textures, models, etc.). Forge can run as a **standalone Electron app** or inside the **VS Code extension** as a webview.
- **VS Code extension** (`extensions/kotor-forge-vscode/`): Registers custom editors for KotOR file types. Each opened file is shown in a webview that loads the same Forge UI and editors; the extension host handles save/revert/backup and talks to the webview via `postMessage`.

## Repository Layout

| Path | Purpose |
|------|--------|
| `src/` | Core library + Forge app. `src/KotOR.ts` and `src/resource/` = formats; `src/apps/forge/` = Forge UI and editors. |
| `src/resource/` | Binary format classes: `GFFObject`, `TwoDAObject`, `TLKObject`, `ERFObject`, etc. Many have `toBuffer()` / `toJSON()` / `fromBuffer()`. |
| `src/apps/forge/` | Forge: `ForgeState`, `EditorFile`, `TabState` subclasses, `FileTypeManager`, `IForgeHostAdapter`, React components under `components/tabs/`. |
| `extensions/kotor-forge-vscode/` | VS Code extension: custom editor providers, `KotorDocument`, webview bridge. Webview bundle imports from `@forge` (alias to `src/apps/forge`) and `@kotor` (alias to `src/`). |

## Key Concepts for Agent Work

### 1. File type → Editor type → Tab state

- **Extension** (`KotorForgeProvider`): File extension maps to `editorType` (e.g. `.utc` → `utc`, `.gff` → `gff`, `.2da` → `2da`, `.tlk` → `tlk`). Optional view: `kotor.forge.json` forces `editorType: 'json'`.
- **Webview** (`forgeEditorRegistry.ts`): `editorType` maps to a **TabState** class (e.g. `utc` → `TabUTCEditorState`, `2da` → `TabTwoDAEditorState`, `json` → `TabJsonViewState`). Adding a new editor type requires adding a mapping here and a corresponding TabState in Forge.
- **Standalone Forge** (`FileTypeManager.ts`): Opens `EditorFile` and adds a tab via the same TabState classes (e.g. `TabTwoDAEditorState`, `TabTLKEditorState`).

When adding or changing an editor: (1) implement or reuse a TabState and its React component in `src/apps/forge/`; (2) in the extension, add `editorType` in `getEditorTypeFromExt` and in `forgeEditorRegistry`’s `EDITOR_MAP`; (3) if needed, add a `customEditors` selector in `package.json`.

### 2. Forge host adapter (webview vs Electron)

- **IForgeHostAdapter** (`src/apps/forge/ForgeHostAdapter.ts`): Interface for “who owns save and UI.” In the VS Code webview, `ForgeWebviewAdapter` implements it: save goes to the extension via `postMessage` (`requestSave` → host writes file → `saveComplete`). In Electron, Forge uses real FS/dialogs.
- **Webview bridge** (`extensions/.../webview/WebviewBridge.ts`): Webview calls `bridge.notifyEdit()`, `bridge.postMessage({ type: 'requestSave', buffer })`; extension sends `init`, `undo`, `redo`, `revert`, `saveComplete`, etc. See `WEBVIEW_VSCODE_SYNC_DESIGN.md` in the extension for full protocol.

### 3. EditorFile and TabState

- **EditorFile**: Holds path, buffer(s), resref, ext, optional `buffer2` (e.g. MDX). `readFile()` returns `{ buffer, buffer2? }`; in webview, data often comes from init (no real FS).
- **TabState**: Base class for every editor tab. Subclasses set `tabName`, implement `openFile()`, `getExportBuffer()`, and `updateFile()`. They pass an `EditorFile` in options and call `setContentView(<Component tab={this} />)`.

### 4. Resource formats (library)

- GFF: `GFFObject`, `GFFStruct`, `GFFField` in `src/resource/`. `toJSON()` / binary export via `getExportBuffer()`.
- 2DA: `TwoDAObject` — `toJSON()`, `toBuffer('2da'|'csv'|'json')`, `fromBuffer()` / `fromCSV()` / `fromJSON()`.
- TLK: `TLKObject` — `toBuffer()`, `toJSON()`; entries are `TLKString`.
- Others: ERF, DLG (wraps GFF), MDL/MDX, TPC/TGA, etc. in `src/resource/`.

## Build & Commands

- **Root (library + Forge Electron)**  
  - Install: `npm install`  
  - Build: `npm run build` (webpack + electron compile) or `npm run webpack:dev` then `npm run electron:compile`  
  - Run Forge (Electron): `npm run start:electron` or `npm run start`  
  - Test: `npm test` or `npm run test:quick` (Jest: `./src/tests`, `./src/resource`, `./src/apps/forge`)  
  - Lint: `npm run lint` (ESLint)

- **Extension**  
  - From repo root, build library first. Then:  
    - `cd extensions/kotor-forge-vscode && npm install && npm run compile`  
  - Compile builds both the extension and the webview bundle (webpack). Full extension compile does **not** run the LSP server compile (that’s in `server/`); if you change only extension/webview, `npx webpack --mode production` in the extension dir is enough.  
  - Package VSIX: `npm run package` in the extension dir.

## Conventions

- **TypeScript**: Strict; path aliases `@/` (Forge), `@forge` (extension → Forge), `@kotor` (extension → src).  
- **Logging**: `createScopedLogger(LogScope.X)` from `@kotor/utility/Logger` or `@/utility/Logger`; use trace/debug/info/warn/error.  
- **Forge state**: `ForgeState` holds optional `IForgeHostAdapter`, tab manager, modal manager; set in webview on init.  
- **Adding a new KotOR file type editor**: Add resource parser in `src/resource/` if missing; add TabState + component in `src/apps/forge/`; register in `FileTypeManager` and in extension `forgeEditorRegistry` + `getEditorTypeFromExt` (and optionally `customEditors`).

## What to Do When

- **Editing a resource format (GFF, 2DA, TLK, …)**  
  Prefer changing code in `src/resource/`. Keep `toBuffer()` / `fromBuffer()` (and optional `toJSON()` / `fromJSON()`) in sync; add or extend tests in `src/resource/*.test.ts` or `src/tests/`.

- **Adding or changing a Forge editor (UI for a format)**  
  Work in `src/apps/forge/states/tabs/` (TabState) and `src/apps/forge/components/tabs/`. Use existing patterns (e.g. `TabTwoDAEditorState` + `TabTwoDAEditor`, or `TabJsonViewState` + `TabJsonView`). If the editor is used in the VS Code extension, ensure its `editorType` is in `forgeEditorRegistry.ts` and in `KotorForgeProvider.getEditorTypeFromExt`.

- **Changing extension ↔ webview behavior (save, undo, revert, new view)**  
  Extension: `extensions/kotor-forge-vscode/src/providers/BaseKotorEditorProvider.ts` (messages, revert, edit), `KotorDocument.ts`, `WebviewBridge.ts`, `WebviewApp.tsx`. See `WEBVIEW_VSCODE_SYNC_DESIGN.md` in the extension.

- **Running tests**  
  From repo root: `npm test` or `npm run test:quick`. Fix any new or existing test under the Jest config (resource and Forge paths).

## Documentation

- **SETUP.md**: Human-oriented setup (Node, install, build, run).  
- **extensions/kotor-forge-vscode/README.md**: Extension install and dev.  
- **extensions/kotor-forge-vscode/WEBVIEW_VSCODE_SYNC_DESIGN.md**: Webview ↔ VS Code sync (edits, undo/redo, save, revert, format/sort, TLK perf).

Use this file as the single entry point for project and Forge context when making multi-file or cross-layer changes.
