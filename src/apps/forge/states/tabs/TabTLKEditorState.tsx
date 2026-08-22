import React from "react";
import { TabTLKEditor } from "@/apps/forge/components/tabs/tab-tlk-editor/TabTLKEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { searchTLKStrings, TLKSearchOptions, TLKSearchResult } from "@/managers/TLKManager";
import { TLKStringUpdate } from "@/resource/TLKObject";
import { TLKString } from "@/resource/TLKString";

const MAX_TLK_UNDO = 25;

type TLKEntryDB = ReturnType<TLKString["ToDB"]>;

/**
 * Compact undo snapshots for talk tables.
 * - `entry`: restore fields at index (field edits)
 * - `remove`: delete the string at index (undo of an insert)
 * - `restore`: insert `data` at index (undo of a delete)
 */
export type TLKUndoSnapshot =
  | { kind: "entry"; index: number; data: TLKEntryDB }
  | { kind: "remove"; index: number }
  | { kind: "restore"; index: number; data: TLKEntryDB };

export class TabTLKEditorState extends TabState {
  tabName: string = "TLK";
  tlkObject: KotOR.TLKObject;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(<TabTLKEditor tab={this} />);
    this.openFile();

    this.saveTypes = [
      {
        description: "Talk Table",
        accept: {
          "application/octet-stream": [".tlk"],
        },
      },
    ];
  }

  search(query: string, options: TLKSearchOptions = {}): TLKSearchResult[] {
    if (!this.tlkObject) return [];
    return searchTLKStrings(this.tlkObject.TLKStrings, query, options);
  }

  updateString(index: number, partial: TLKStringUpdate): void {
    if (!this.tlkObject) return;
    this.tlkObject.updateString(index, partial);
    this.markUnsaved();
  }

  /**
   * Add a string. When `afterIndex` is omitted, appends at the end (safest for STRREFs).
   * Otherwise inserts immediately after that index (shifts later string IDs).
   */
  addString(afterIndex?: number): number {
    if (!this.tlkObject) return -1;
    const newIndex =
      afterIndex === undefined || afterIndex < 0
        ? this.tlkObject.appendString()
        : this.tlkObject.insertStringAt(afterIndex + 1);
    this.markUnsaved();
    return newIndex;
  }

  deleteString(index: number): boolean {
    if (!this.tlkObject) return false;
    const removed = this.tlkObject.deleteStringAt(index);
    if (removed) {
      this.markUnsaved();
    }
    return removed;
  }

  private markUnsaved(): void {
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.editorFileUpdated();
  }

  private pushUndo(snapshot: TLKUndoSnapshot): void {
    this.undoCoalesceKey = null;
    if (this.undoCoalesceTimer !== undefined) {
      clearTimeout(this.undoCoalesceTimer);
      this.undoCoalesceTimer = undefined;
    }
    if (this.suppressUndoCapture) return;
    this.undoStack.push(snapshot);
    while (this.undoStack.length > MAX_TLK_UNDO) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.processEventListener("onHistoryChanged", []);
  }

  /** Snapshot a single entry before field edits. */
  captureEntryUndo(index: number): void {
    if (!this.tlkObject) return;
    const entry = this.tlkObject.TLKStrings[index];
    if (!entry) return;
    this.pushUndo({ kind: "entry", index, data: entry.ToDB() });
  }

  /** Snapshot before inserting at `index` (undo removes that index). */
  captureInsertUndo(index: number): void {
    this.pushUndo({ kind: "remove", index });
  }

  /** Snapshot before deleting at `index` (undo restores the entry). */
  captureDeleteUndo(index: number): void {
    if (!this.tlkObject) return;
    const entry = this.tlkObject.TLKStrings[index];
    if (!entry) return;
    this.pushUndo({ kind: "restore", index, data: entry.ToDB() });
  }

  /** @deprecated Prefer captureEntryUndo / captureInsertUndo / captureDeleteUndo. */
  captureUndoSnapshot(): void {
    // Avoid accidental full-table clones from the base API.
  }

  protected captureUndoState(): TLKUndoSnapshot | undefined {
    return undefined;
  }

  protected shouldHandleUndoKeyboard(_e: KeyboardEvent): boolean {
    return true;
  }

  private restoreEntry(index: number, data: TLKEntryDB): void {
    if (!this.tlkObject) return;
    const entry = this.tlkObject.TLKStrings[index];
    if (!entry) return;
    entry.FromDB(data);
    this.markUnsaved();
  }

  protected applyUndoState(state: TLKUndoSnapshot): void {
    if (!this.tlkObject || !state) return;

    if (state.kind === "entry") {
      this.restoreEntry(state.index, state.data);
      // Lightweight refresh — do not reset search/selection via onEditorFileLoad.
      this.processEventListener("onTLKDataChanged", [state.index]);
      return;
    }

    if (state.kind === "remove") {
      this.tlkObject.deleteStringAt(state.index);
      this.markUnsaved();
      this.processEventListener("onEditorFileLoad", [this]);
      return;
    }

    if (state.kind === "restore") {
      this.tlkObject.insertStringAt(state.index, TLKString.FromDBObj(state.data));
      this.markUnsaved();
      this.processEventListener("onEditorFileLoad", [this]);
    }
  }

  private inverseOf(snapshot: TLKUndoSnapshot): TLKUndoSnapshot | undefined {
    if (!this.tlkObject) return undefined;

    if (snapshot.kind === "entry") {
      const entry = this.tlkObject.TLKStrings[snapshot.index];
      if (!entry) return undefined;
      return { kind: "entry", index: snapshot.index, data: entry.ToDB() };
    }

    if (snapshot.kind === "remove") {
      const entry = this.tlkObject.TLKStrings[snapshot.index];
      if (!entry) return undefined;
      return { kind: "restore", index: snapshot.index, data: entry.ToDB() };
    }

    // restore → remove after re-insert would need the opposite; before apply,
    // redo of a restore means "delete again".
    return { kind: "remove", index: snapshot.index };
  }

  undo(): void {
    if (this.undoStack.length === 0) return;
    const snapshot = this.undoStack.pop()! as TLKUndoSnapshot;
    const inverse = this.inverseOf(snapshot);
    if (inverse !== undefined) {
      this.redoStack.push(inverse);
      while (this.redoStack.length > MAX_TLK_UNDO) {
        this.redoStack.shift();
      }
    }
    this.suppressUndoCapture = true;
    this.applyUndoState(snapshot);
    this.suppressUndoCapture = false;
    this.processEventListener("onUndoApplied", [snapshot]);
    this.processEventListener("onHistoryChanged", []);
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    const snapshot = this.redoStack.pop()! as TLKUndoSnapshot;
    const inverse = this.inverseOf(snapshot);
    if (inverse !== undefined) {
      this.undoStack.push(inverse);
      while (this.undoStack.length > MAX_TLK_UNDO) {
        this.undoStack.shift();
      }
    }
    this.suppressUndoCapture = true;
    this.applyUndoState(snapshot);
    this.suppressUndoCapture = false;
    this.processEventListener("onRedoApplied", [snapshot]);
    this.processEventListener("onHistoryChanged", []);
  }

  openFile(file?: EditorFile): Promise<KotOR.TLKObject> {
    return new Promise<KotOR.TLKObject>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file != file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then((response) => {
          this.tlkObject = new KotOR.TLKObject();
          const emptyNew = !(response.buffer instanceof Uint8Array && response.buffer.length)
            && !file.path
            && !file.archive_path;
          if (emptyNew) {
            this.tlkObject.FileType = "TLK ";
            this.tlkObject.FileVersion = "V3.0";
            this.tlkObject.LanguageID = 0;
            this.tlkObject.StringCount = 0;
            this.tlkObject.StringEntriesOffset = 20;
            this.tlkObject.TLKStrings = [];
          } else {
            this.tlkObject.loadFromBuffer(response.buffer);
          }
          this.clearUndoHistory();
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.tlkObject);
        }).catch(reject);
      } else {
        reject(new Error("TabTLKEditorState.openFile requires an EditorFile"));
      }
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if (!this.tlkObject) {
      return new Uint8Array(0);
    }
    // Yield so the UI can paint a busy state before large talk-table serialization.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return this.tlkObject.toExportBuffer();
  }

  async save(): Promise<boolean> {
    const ok = await super.save();
    if (ok) {
      await this.afterSave();
    }
    return ok;
  }

  async saveAs(): Promise<boolean> {
    const ok = await super.saveAs();
    if (ok) {
      await this.afterSave();
    }
    return ok;
  }

  private afterSave(): void {
    const currentFile = this.getFile();
    if (!(currentFile instanceof EditorFile) || !this.tlkObject) return;
    const filename = currentFile.getFilename()?.toLowerCase();
    if (filename === "dialog.tlk") {
      // Keep the global talk table in sync without re-reading and reparsing the file
      // or resetting the editor UI via onEditorFileLoad.
      KotOR.TLKManager.TLKObject = this.tlkObject;
      KotOR.TLKManager.TLKStrings = this.tlkObject.TLKStrings;
    }
  }
}
