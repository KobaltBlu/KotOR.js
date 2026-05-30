# Webview ↔ VS Code Sync: Design & Investigation

This document describes how the KotOR Forge extension’s webview editors connect to VS Code’s document model, what is already wired, what is missing, and how to fix it. It also covers TLK editor performance and research notes.

---

## 1. Current Architecture Summary

- **Extension host**: `BaseKotorEditorProvider` implements `CustomEditorProvider<KotorDocument>`. It owns the `KotorDocument` (binary buffer + edit stack), handles save/revert/backup, and talks to the webview via `webview.postMessage` / `onDidReceiveMessage`.
- **Webview**: `WebviewApp` loads one Forge tab per document. `ForgeWebviewAdapter` implements `IForgeHostAdapter`: save is delegated to the host via `requestSave` → `postMessage('requestSave', buffer)` → extension writes file and replies `saveComplete` / `saveError`.
- **Bridge**: `WebviewBridge` (in webview) sends `ready`, `edit`, `requestSave`, `getFileData` (response), and receives `init`, `undo`, `redo`, `saveComplete`, `saveError`, `getFileData` (request).

---

## 2. What’s Already Wired

| Feature | Extension | Webview | Notes |
|--------|-----------|---------|--------|
| **Open** | `openCustomDocument` loads file → `KotorDocument` | `init` with `fileData` → create `EditorFile` + tab | Works. |
| **Save (Ctrl+S / File > Save)** | `saveCustomDocument` → `document.save()` → `getFileData` from webview, then `workspace.fs.writeFile` | `getFileData` handler calls `tab.getExportBuffer()` and `bridge.sendFileData()` | Works. |
| **Save As** | `saveCustomDocumentAs` → `document.saveAs(destination)` → same `getFileData` flow, writes to `destination` | Same as Save. | Works. |
| **Backup (hot exit)** | `backupCustomDocument` → `document.backup()` → `saveAs` to backup URI | Same as Save. | Works. |
| **In-editor Save** | N/A | Tab’s Save uses `hostAdapter.requestSave(this, buffer)` → `requestSave` message | Works. |
| **Dirty state** | Only when an **edit** is pushed (see below) | `file.unsaved_changes` in Forge | VS Code dirty depends on edit stack; see Undo/Redo. |

---

## 3. What’s Missing or Incomplete

### 3.1 Undo / Redo (VS Code ↔ Webview)

**Current state:**

- Extension: On `edit` message it calls `document.makeEdit({ label, data, undo, redo })`, where `undo`/`redo` post `{ type: 'undo', edits: undoData }` / `{ type: 'redo', edits: redoData }` to the webview. So VS Code’s undo/redo **do** trigger messages to the webview.
- Webview: `bridge.on('undo', ...)` and `bridge.on('redo', ...)` in `WebviewApp.tsx` are **no-ops** (log only). They do not call any editor logic to apply undo/redo.
- Forge editors: **None** of them call `bridge.notifyEdit()`. So the extension’s edit stack is never populated; VS Code never becomes dirty from webview edits, and Undo/Redo in the UI have nothing to act on.

**Required design:**

1. **When the user edits in the webview**  
   The active editor (or a shared “document sync” layer) must call:
   - `bridge.notifyEdit(label, newFullBuffer, undoData, redoData)`
   - So the extension can call `document.makeEdit(...)` and VS Code can track the edit and show Undo/Redo correctly.

2. **Undo/redo payload**  
   - `undoData` / `redoData` must be **serializable** (JSON-friendly) and sufficient for the webview to restore state when the extension later sends `undo` or `redo`.
   - Options:
     - **Full buffer**: `undoData` = previous buffer (or base + patch). Simple but heavy for large files.
     - **Editor-specific state**: e.g. for TLK, a list of “before/after” string indices and text/sound; for 2DA, row/column patches. Lighter, but each editor type must implement apply logic.

3. **Webview handler for `undo` / `redo`**  
   - On `undo` (or `redo`), the webview must:
     - Identify the current tab/editor type.
     - Apply the received `edits` (or equivalent state) to the in-memory model (e.g. TLK strings, 2DA rows).
     - Update the view (React state / re-render) so the user sees the undone/redone state.
   - Optionally, the extension could send the **full document content** after undo/redo (like revert), so the webview can “reload” from that; then the webview doesn’t need to interpret editor-specific patches, but you must re-parse and replace the whole document in the webview.

**Recommendation:** Start with “full buffer” for undo/redo: webview sends `edit` with `data` = current buffer and `undoData`/`redoData` = previous/next buffer (or a single “previous” buffer for undo and derive redo from current). On `undo`/`redo`, extension could either (a) send back the resulting buffer and have the webview replace document content (simplest), or (b) have the webview apply stored undo/redo state (more work, less data transfer). Option (a) aligns with how **revert** will work below.

### 3.2 Revert (File > Revert File)

**Current state:**

- Extension: `revertCustomDocument` → `document.revert()`. `KotorDocument.revert()` reads from disk, updates `_documentData` and `_edits`, and fires `_onDidChangeDocument` with `{ content: diskContent, edits }`.
- The provider **does not** subscribe to `document.onDidChangeContent` and does **not** post any message to the webview. So after revert, the webview still shows the old, in-memory state.

**Required design:**

1. In `BaseKotorEditorProvider` (or wherever you hold the document), subscribe to `document.onDidChangeContent` (or the event that fires on revert).
2. When it fires (e.g. after `revert()`), post to **all** webviews for that document something like:
   - `{ type: 'revert', content: Array.from(newContent) }`  
   so the webview can replace its document buffer and re-initialize the editor (e.g. re-parse TLK and set state so the UI reflects the reverted file).

3. In the webview:
   - `bridge.on('revert', (msg) => { ... })`: get current tab, replace `file.buffer` (and any cached parsed state) with `msg.content`, then re-open or refresh the tab (e.g. re-run the same “load” path used after `init`).

This keeps a single source of truth after revert: disk content is sent once to the webview, and the webview shows it.

### 3.3 Format / Sort / Editor-Specific Commands

**Current state:**

- No VS Code commands are registered for “Format” or “Sort” that target the active Forge custom editor. So VS Code’s command palette / keybindings for format/sort don’t drive the webview.

**Required design:**

1. **Register commands** in `package.json` and in the extension, e.g.:
   - `kotorForge.format` / `kotorForge.sort` (or per-editor: `kotorForge.tlk.sort`, etc.).
2. Implementation:
   - When the active editor is a Forge custom editor (check `vscode.window.activeCustomEditor` or similar and that it’s your provider), post a message to the webview for that document, e.g. `{ type: 'runCommand', command: 'format' }` or `{ type: 'runCommand', command: 'sort' }`.
3. Webview:
   - `bridge.on('runCommand', (msg) => { ... })`: get current tab, and depending on editor type (TLK, 2DA, etc.), call the appropriate method (e.g. sort entries, format table). Optionally respond with an `edit` so VS Code’s undo stack and dirty state stay consistent.

You can later add keybindings in `package.json` so that when the focus is in the custom editor, Ctrl+Shift+F (or your chosen key) runs `kotorForge.format`, etc.

---

## 4. TLK Editor Lag – Causes and Fixes

### 4.1 Likely Causes

- **Rendering the entire table**: `TabTLKEditor` uses `filteredEntries.map(...)` to render **every** row. Large TLK files (e.g. 10k+ entries) create thousands of DOM nodes and many React elements, which causes layout and paint lag.
- **Revision churn**: On every text or sound ResRef change, `setRevision(prev => prev + 1)` is called. That invalidates `filteredEntries` (useMemo depends on `revision`) and forces a full re-render of the list even when the filter didn’t change and only one cell was edited.
- **No virtualization**: All rows are mounted; no “window” or virtual list.

### 4.2 Recommendations

1. **Virtualize the table body**  
   Render only a “window” of rows (e.g. 50–100) based on scroll position. Use a library like `react-window` or `@tanstack/react-virtual` so that only visible rows (plus a small overscan) are in the DOM. This directly addresses the “too many DOM nodes” problem.

2. **Decouple “revision” from list display**  
   - Use `revision` only where you need to signal “data changed” (e.g. for export or dirty state), not as a dependency of `filteredEntries`.  
   - Keep `filteredEntries` derived from `tlk` and `filterQuery` (and maybe a stable “version” that only bumps on load or revert), so typing in the text/sound fields doesn’t force the whole table to recompute and re-render.

3. **Debounce text/sound updates**  
   For the textarea and sound ResRef input, debounce (e.g. 150–300 ms) before updating `selectedEntry.Value` / `SoundResRef` and bumping revision. This reduces re-renders and useMemo work during fast typing.

4. **Profile**  
   Use Chrome DevTools (or the webview’s inspector) to confirm that layout/paint and React render time are dominated by the table and by revision updates; then apply the above in order of impact.

---

## 5. Research Summary

### 5.1 VS Code Custom Editor API (official)

- **Edits**: To get VS Code’s Undo/Redo and dirty state, you **must** fire `onDidChangeCustomDocument` with a `CustomDocumentEditEvent` (document, label, undo, redo). The extension’s `undo`/`redo` are invoked by VS Code when the user triggers Undo/Redo.
- **Multiple webviews**: If you support multiple editors per document, all webviews must be updated when the document changes (undo, redo, revert) so they stay in sync.
- **Save**: Implemented via `saveCustomDocument`; data can come from the document model or by asking the webview (e.g. `getFileData`). Your current “getFileData from webview” approach is valid; the docs note that save can run when the webview isn’t visible, so avoid relying on a visible webview if possible (you already use a single document model and request buffer from the tab, which is fine).
- **Revert**: `revertCustomDocument` is called when the user chooses Revert; the implementer must make all editor instances show the reverted state. So the extension must notify the webview(s) with the new content.
- **Reference**: [Custom Editors | VS Code API](https://code.visualstudio.com/api/extension-guides/custom-editors) (edits, undo/redo, save, multiple views).

### 5.2 Webview ↔ Extension Sync (best practices)

- **Single source of truth**: For custom (binary) editors, the extension’s `CustomDocument` is the authority; the webview is a view. For undo/redo/revert, either (1) the extension sends full state (e.g. buffer) to the webview so it can refresh, or (2) the webview maintains state and the extension sends deltas/commands; (1) is simpler and avoids desync.
- **Message protocol**: Use a small set of message types (`init`, `edit`, `undo`, `redo`, `revert`, `getFileData`, `requestSave`, `runCommand`, etc.) and document them in one place (e.g. `WebviewBridge.ts` and this doc).
- **No update loops**: When the webview applies `revert` or `undo`/`redo` from the host, it should update its state without posting another `edit` back, or you’ll mark the document dirty again. Use a “source” flag or avoid calling `notifyEdit` when applying host-driven updates.

---

## 6. Implementation Checklist

- [ ] **Revert**: Subscribe to document change (e.g. `onDidChangeContent`) in the provider; on revert, post `revert` + content to all webviews; in webview, handle `revert` by replacing buffer and re-loading/re-initializing the tab.
- [ ] **Undo/Redo – push edits**: In Forge editors (or a central “sync on change” hook), when the user changes data, call `bridge.notifyEdit(label, currentBuffer, undoData, redoData)`. Start with full-buffer strategy: e.g. undoData = previous buffer, redoData = current buffer (or vice versa depending on how you define the edit).
- [ ] **Undo/Redo – apply in webview**: In `WebviewApp`, implement `bridge.on('undo', ...)` and `bridge.on('redo', ...)` to apply the received state (e.g. replace document buffer and re-load tab, or apply editor-specific patches). Ensure this path does not call `notifyEdit` again.
- [ ] **Format/Sort**: Add commands in `package.json` and extension; when active editor is Forge, post `runCommand` to webview; in webview, handle by editor type (TLK sort, 2DA sort/format, etc.).
- [ ] **TLK performance**: Introduce virtualized list for the TLK table, narrow the use of `revision` so it doesn’t force full list recompute on every keystroke, and optionally debounce text/sound field updates.
- [ ] **Keybindings (optional)**: Add keybindings for Undo/Redo when focus is in the custom editor (VS Code may already route these to the provider once the edit stack is used). Add keybindings for Format/Sort if desired.

---

## 7. Message Protocol Reference (current + proposed)

| Direction | Type | Purpose |
|----------|------|--------|
| Webview → Host | `ready` | Webview loaded; host sends `init`. |
| Host → Webview | `init` | Initial document: `editorType`, `fileData`, `fileName`, optional `fileData2`, `logLevel`. |
| Webview → Host | `edit` | Document edited: `label`, `data` (buffer), `undoData`, `redoData`. |
| Host → Webview | `undo` | Apply undo: `edits` (undo payload). |
| Host → Webview | `redo` | Apply redo: `edits` (redo payload). |
| Host → Webview | **`revert`** (proposed) | Document reverted: `content` (new buffer). Webview should replace buffer and re-load. |
| Webview → Host | `requestSave` | Save request: `buffer`. Host writes file and sends `saveComplete` or `saveError`. |
| Host → Webview | `saveComplete` / `saveError` | Result of `requestSave`. |
| Host → Webview | `getFileData` (requestId) | Request current buffer; webview replies with `response` + requestId + `body: { data }`. |
| Webview → Host | `response` | Response to a request: `requestId`, `body`. |
| Host → Webview | **`runCommand`** (proposed) | Run editor command: `command` (e.g. `'format'`, `'sort'`). |

This gives you a clear path to sync VS Code’s document model with the webview (edits, undo/redo, save, save as, revert) and to add format/sort and fix TLK lag with the proposed changes.
