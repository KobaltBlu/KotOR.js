---
name: Forge VS Code Extension Continuation
overview: "Continue the KotOR Forge VS Code extension in extensions/kotor-forge-vscode without duplicating logic: keep sharing Forge TabState/editors via the existing webview build and IForgeHostAdapter pattern, complete document sync (undo/redo/revert/format), then systematically add VS Code contribution points and runtime APIs to maximize quality, discoverability, and accessibility."
todos: []
isProject: false
---

# Forge VS Code Extension – Continuation and API Integration Plan

## Context

- **Forge (standalone):** [src/apps/forge](src/apps/forge) – Webpack/Electron app; editors are TabState subclasses and React components; [FileTypeManager](src/apps/forge/FileTypeManager.ts) maps extension → TabState; [IForgeHostAdapter](src/apps/forge/ForgeHostAdapter.ts) abstracts save/tabs/modals for embedding.
- **Extension:** [extensions/kotor-forge-vscode](extensions/kotor-forge-vscode) – Single [KotorForgeProvider](extensions/kotor-forge-vscode/src/providers/KotorForgeProvider.ts), one webview per document; webview bundle compiles Forge from `../../src` via aliases ([forgeEditorRegistry](extensions/kotor-forge-vscode/src/webview/forgeEditorRegistry.ts), [ForgeWebviewAdapter](extensions/kotor-forge-vscode/src/webview/ForgeWebviewAdapter.ts)); LSP + debug for NWScript.
- **Compatibility:** No duplication of editor UI or resource parsers: extension reuses Forge + KotOR source in the webview; extension host uses only VS Code + Node; no workspace package yet.

---

## 1. Current VS Code APIs and Contribution Points in Use


| Area                    | API / Contribution                                                                                                                                                                                                            | Usage                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Window**              | `createOutputChannel`, `createWebviewPanel`, `registerCustomEditorProvider`, `showOpenDialog`, `showInformationMessage` / `showWarningMessage` / `showErrorMessage`, `activeTextEditor`, `tabGroups.activeTabGroup.activeTab` | Logging, custom editors, dialogs, active editor detection       |
| **Workspace**           | `getConfiguration`, `fs.readFile` / `writeFile` / `delete`, `createFileSystemWatcher`, `registerTextDocumentContentProvider`                                                                                                  | Settings, file I/O, NWScript watcher, `kotor-forge://` builtins |
| **Commands**            | `registerCommand`, `executeCommand`, `getCommands`                                                                                                                                                                            | Path settings, Open as JSON, NWScript Start Debugging           |
| **Debug**               | `registerDebugConfigurationProvider`, `registerDebugAdapterDescriptorFactory`, `registerDebugAdapterTrackerFactory`, `startDebugging`                                                                                         | NWScript debugger                                               |
| **ExtensionContext**    | `subscriptions`, `extensionUri`, `globalState`                                                                                                                                                                                | Disposables, webview roots, first-run welcome                   |
| **Contribution points** | `customEditors`, `languages`, `grammars`, `iconThemes`, `configuration`, `debuggers`, `commands`, `menus` (editor/context)                                                                                                    | All current `package.json` contributes                          |


Revert is already wired: [BaseKotorEditorProvider](extensions/kotor-forge-vscode/src/providers/BaseKotorEditorProvider.ts) subscribes to `document.onDidChangeContent` and posts `revert` to webviews; webview has a `revert` handler. Undo/redo and format/sort are not: Forge editors do not call `bridge.notifyEdit()`, and undo/redo handlers in the webview are no-ops (see [WEBVIEW_VSCODE_SYNC_DESIGN.md](extensions/kotor-forge-vscode/WEBVIEW_VSCODE_SYNC_DESIGN.md)).

---

## 2. Possible VS Code APIs and Contribution Points (Full Map)

### 2.1 Contribution points – already used

- **customEditors** – KotOR Forge / GFF / JSON view types.
- **languages** – `nwscript` (.nss, .ncs).
- **grammars** – `source.nwscript` (TextMate).
- **iconThemes** – `kotor-icons`.
- **configuration** – kotorForge.*, nwscript.*.
- **debuggers** – `nwscript` type.
- **commands** – path setters, Open as JSON, Start Debugging.
- **menus** – editor context for NWScript and KotOR files.

### 2.2 Contribution points – not yet used (and how they help)


| Contribution                               | Purpose                                         | Benefit for KotOR Forge                                                                                                        |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **walkthroughs**                           | Get-started steps in Welcome                    | First-time setup (game paths, “Open a .utc”), accessibility to key flows.                                                      |
| **viewsWelcome**                           | Message when a view is empty                    | “Open a KotOR file or set game path” in a future KotOR view.                                                                   |
| **viewsContainers**                        | Sidebar container (e.g. KotOR icon)             | Dedicated place for KotOR tools; discoverability.                                                                              |
| **views**                                  | Tree/list in sidebar                            | Resource explorer (BIF/KEY/ERF), recent KotOR files, script list; navigation without opening files first.                      |
| **keybindings**                            | Default shortcuts                               | Format/Sort when focus in Forge editor; Undo/Redo (if needed beyond default); “Open as JSON”; consistent UX and accessibility. |
| **snippets**                               | Code snippets for nwscript                      | Faster scripting, fewer typos; `when: resourceLangId == nwscript`.                                                             |
| **taskDefinitions**                        | Task type for “Build module” / “Compile script” | Run mod tools from VS Code Tasks; CI-like workflows.                                                                           |
| **breakpoints**                            | Languages for breakpoints                       | `nwscript` in breakpoints list so breakpoints are enabled for .nss/.ncs (improves debug UX).                                   |
| **colors**                                 | Themeable colors                                | Status bar or decoration colors for Forge (e.g. dirty state); respects user theme and high contrast.                           |
| **resourceLabelFormatters**                | Pretty path labels                              | Show “Creature (foo.utc)” in tabs/explorer; clarity.                                                                           |
| **jsonValidation**                         | Schema for JSON view                            | If we persist or export JSON for 2DA/GFF/TLK, schema improves validation and IntelliSense.                                     |
| **submenus**                               | “KotOR Forge” submenu                           | Group “Open as JSON”, “Format”, “Sort”, “Set KotOR path” under one menu; less clutter.                                         |
| **chatInstructions** / **chatPromptFiles** | Copilot instructions/prompts                    | When editing .nss or KotOR files, guide AI with NWScript/KotOR conventions; quality of AI suggestions.                         |


Not a priority for this extension: authentication, themes, productIconThemes (we use iconThemes), terminal profile, TypeScript server plugins.

### 2.3 Runtime APIs – not yet used (and how they help)


| API                                                         | Purpose                            | Benefit for KotOR Forge                                                              |
| ----------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| **vscode.window.createStatusBarItem**                       | Status bar item                    | Show “KotOR: K1” / “TSL” or active game path; quick visibility and accessibility.    |
| **vscode.window.createTreeView**                            | Sidebar tree                       | Resource explorer, recent files, or script list; TreeDataProvider.                   |
| **vscode.window.showQuickPick** (with many items)           | Picker with search                 | “Go to TLK entry”, “Open resource by ResRef”; fast navigation.                       |
| **vscode.workspace.findFiles**                              | Search workspace                   | List all .utc, .nss, etc.; power “Recent KotOR files” or indexes.                    |
| **vscode.workspace.getWorkspaceFolder**                     | Workspace root                     | Resolve relative paths (e.g. override game path per folder); multi-root.             |
| **vscode.env.openExternal**                                 | Open browser                       | Links to KotOR.js docs, OpenKotOR Discord, modding guides; discoverability and help. |
| **vscode.languages.registerDocumentFormattingEditProvider** | Format document                    | Format NWScript (indent, braces); quality and consistency.                           |
| **vscode.languages.registerDocumentSymbolProvider**         | Outline                            | NWScript symbols in Outline view; navigation and accessibility.                      |
| **vscode.languages.registerFoldingRangeProvider**           | Folding                            | Fold functions/blocks in .nss; readability.                                          |
| **vscode.languages.registerHoverProvider**                  | Hover                              | Hover for builtins/script library in .nss; learnability.                             |
| **LSP** (existing server)                                   | Completion, diagnostics, go-to-def | Already used; can extend with semantic tokens, inlay hints for richer IntelliSense.  |
| **vscode.tasks.registerTaskProvider**                       | Run tasks                          | “Build ERF”, “Compile all scripts”; workflow.                                        |
| **vscode.workspace.fs** (readDir, etc.)                     | List dirs                          | Virtual “KotOR resources” tree or file picker from game dir.                         |


Optional later: Comment controller (collab), Timeline (file history), Testing API (if we add script tests).

---

## 3. Architecture Compatibility (No Duplication)

- **Single editor implementation:** All KotOR file editing stays in Forge TabState + components; the extension only hosts them in a webview and implements [IForgeHostAdapter](src/apps/forge/ForgeHostAdapter.ts) via [ForgeWebviewAdapter](extensions/kotor-forge-vscode/src/webview/ForgeWebviewAdapter.ts) for save and (when wired) tab/modal/recent.
- **Shared build:** Webview continues to depend on repo `src/` via webpack/tsconfig aliases (`@forge`, `@kotor`, `@/`); no copy of editor or resource code.
- **Optional shared package later:** A small `@kotor/forge-core` or `@kotor/resource` package could be introduced so both Forge and extension depend on it; not required to “continue” the extension.

---

## 4. Implementation Phases

### Phase A: Document sync and editor commands (from WEBVIEW_VSCODE_SYNC_DESIGN.md)

- **Undo/Redo:** In Forge editors (or a thin sync layer in the webview), call `bridge.notifyEdit(label, currentBuffer, undoData, redoData)` on user edits; use full-buffer strategy initially. In the webview, implement `bridge.on('undo')` and `bridge.on('redo')` to replace document buffer and re-initialize the tab (do not call `notifyEdit` on host-driven updates).
- **Revert:** Already implemented in provider and webview; verify behavior and that webview re-loads tab from reverted content.
- **Format/Sort:** Register commands (e.g. `kotorForge.format`, `kotorForge.sort`); when active editor is a Forge custom editor, post `runCommand` to webview; webview handles per editor type (TLK sort, 2DA format, etc.) and optionally sends an `edit` so dirty/undo stay consistent.
- **Keybindings:** Add keybindings for Format/Sort when focus is in the custom editor (e.g. `when: customEditorFocus` or resourceExtname in KotOR list).

Deliverable: Edits make VS Code dirty; Undo/Redo and Revert work; Format/Sort available from command palette and (optionally) keys.

### Phase B: Discoverability and onboarding

- **walkthroughs:** One walkthrough: set KotOR/TSL path, open a sample file, “Open as JSON”, mention NWScript debugging.
- **viewsContainers + views:** Add a “KotOR” view container and a view (e.g. “KotOR Resources” or “Recent KotOR Files”) using `createTreeView`; populate from workspace findFiles + game path (BIF/KEY/ERF) in a later iteration if desired.
- **viewsWelcome:** In that view, show “Set game path” / “Open a KotOR file” when empty.
- **submenus + menus:** Add “KotOR Forge” submenu; move “Open as JSON”, “Format”, “Sort”, path commands into it; add to editor/context and possibly editor/title.

Deliverable: New users get guided setup; KotOR has a dedicated place in the UI.

### Phase C: Status bar, keybindings, and resource labels

- **createStatusBarItem:** Show active game (K1/TSL) or “No game set”; click opens settings or path picker.
- **keybindings:** Document and add default keybindings for `kotorForge.format`, `kotorForge.sort`, `kotorForge.openAsJson` with `when` for KotOR files or custom editor focus.
- **resourceLabelFormatters:** For KotOR extensions, optionally show a short label (e.g. “Creature: foo” for .utc) in explorer/tabs.

Deliverable: At-a-glance game context; consistent shortcuts; clearer labels.

### Phase D: NWScript language richness

- **breakpoints:** Add `contributes.breakpoints` with `language: "nwscript"` so breakpoints are enabled for .nss/.ncs.
- **snippets:** Contribute nwscript snippets (main, switch, loops, GetPC, etc.) with `when: resourceLangId == nwscript`.
- **DocumentFormattingEditProvider:** Register for `nwscript` to format .nss (if not already done by LSP).
- **DocumentSymbolProvider / FoldingRangeProvider / HoverProvider:** Either extend the existing LSP server or register in the extension for outline, folding, and hover (reuse LSP data if possible to avoid duplication).

Deliverable: Better scripting UX and accessibility (outline, folding, hover, snippets, breakpoints).

### Phase E: Tasks, optional views, and polish

- **taskDefinitions + TaskProvider:** Define “KotOR” task type (e.g. “Compile script”, “Pack ERF”); implement TaskProvider that suggests tasks based on workspace/game path.
- **colors:** If we add status bar or custom decorations, contribute themeable colors and use `ThemeColor` for high-contrast support.
- **jsonValidation:** If JSON export/import for 2DA or GFF is used, add jsonValidation for that schema.
- **chatInstructions / chatPromptFiles:** Optional; add instructions/prompts for NWScript and KotOR file editing for Copilot users.

Deliverable: Tasks for mod workflows; themeable UI; optional AI guidance.

---

## 5. API Summary Table (Quick Reference)


| Category                | Already used                                                                                                                     | To add (priority)                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contribution points** | customEditors, languages, grammars, iconThemes, configuration, debuggers, commands, menus                                        | breakpoints, keybindings, walkthroughs, viewsContainers, views, viewsWelcome, snippets, submenus, taskDefinitions, colors, resourceLabelFormatters, jsonValidation (optional), chatInstructions (optional) |
| **Window API**          | createOutputChannel, createWebviewPanel, registerCustomEditorProvider, showOpenDialog, show*Message, activeTextEditor, tabGroups | createStatusBarItem, createTreeView, showQuickPick                                                                                                                                                         |
| **Workspace API**       | getConfiguration, fs (read/write/delete), createFileSystemWatcher, registerTextDocumentContentProvider                           | findFiles, getWorkspaceFolder                                                                                                                                                                              |
| **Languages API**       | (LSP client)                                                                                                                     | registerDocumentFormattingEditProvider, registerDocumentSymbolProvider, registerFoldingRangeProvider, registerHoverProvider (or extend LSP)                                                                |
| **Other**               | commands, debug, ExtensionContext                                                                                                | env.openExternal, tasks.registerTaskProvider                                                                                                                                                               |


---

## 6. Accessibility and User Intuitivity

- **Discoverability:** Walkthroughs, viewsWelcome, and a KotOR view container make the extension and “where to start” obvious.
- **Consistency:** Keybindings and a submenu group KotOR actions in one place; status bar shows game context.
- **Navigation:** Outline (DocumentSymbolProvider), folding, and “Go to resource” (QuickPick) reduce hunting; resourceLabelFormatters clarify file purpose.
- **Screen readers and keyboard:** VS Code’s built-in behavior applies to commands and tree views; use `role` and labels in webview where applicable; StatusBarItem and TreeView are accessible by default.
- **Theme and contrast:** Contribute `colors` and use `ThemeColor` so status bar and decorations respect theme and high contrast.
- **Help:** `openExternal` for docs/Discord; chatInstructions for AI-assisted editing.

---

## 7. Files to Touch (Summary)

- **Extension host:** [extension.ts](extensions/kotor-forge-vscode/src/extension.ts), [package.json](extensions/kotor-forge-vscode/package.json), new modules for status bar, tree view, walkthrough, tasks, keybindings, breakpoints, snippets.
- **Provider:** [BaseKotorEditorProvider.ts](extensions/kotor-forge-vscode/src/providers/BaseKotorEditorProvider.ts) (already has revert); ensure getFileData and save path work when webview is hidden.
- **Webview:** [WebviewApp.tsx](extensions/kotor-forge-vscode/src/webview/WebviewApp.tsx) (undo/redo/runCommand handlers), [WebviewBridge.ts](extensions/kotor-forge-vscode/src/webview/WebviewBridge.ts); Forge tab components (call `bridge.notifyEdit` on edits).
- **Forge (shared):** Only additive changes: ensure TabState/editors can receive revert/undo/redo state and expose Format/Sort where applicable; no removal of standalone Forge behavior.
- **Docs:** [WEBVIEW_VSCODE_SYNC_DESIGN.md](extensions/kotor-forge-vscode/WEBVIEW_VSCODE_SYNC_DESIGN.md), [IMPLEMENTATION.md](extensions/kotor-forge-vscode/IMPLEMENTATION.md); new `docs/plans/` or extension-level doc for “VS Code APIs and contribution points” (this plan’s Section 2 and 5 as living reference).

---

## 8. Success Criteria

- No duplicate editor or resource logic: Forge remains single source; extension hosts it via webview + IForgeHostAdapter.
- Document lifecycle is correct: dirty, save, save as, backup, revert, undo, redo and (where applicable) format/sort work and stay in sync with the webview.
- As many relevant VS Code contribution points and runtime APIs as practical are used to improve discoverability, accessibility, and workflow (walkthroughs, views, status bar, keybindings, breakpoints, snippets, tasks, etc.).
- Plan and API list are documented so future work can extend integrations without re-discovering options.

