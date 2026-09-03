import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EditorFile } from "@/apps/forge/EditorFile";
import { TabSaveGameEditor } from "@/apps/forge/components/tabs/tab-savegame-editor/TabSaveGameEditor";
import {
  SaveGameDocument,
  SaveGameDocumentSnapshot,
} from "@/apps/forge/savegame/saveGameDocument";
import { ResourceTypes } from "@/resource/ResourceTypes";

export class TabSaveGameEditorState extends TabState {
  tabName: string = "Save Game";
  document: SaveGameDocument;
  generation: number = 0;
  loaded = false;
  loadError = "";

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabSaveGameEditor tab={this} />);
    this.openFile();
    this.saveTypes = [
      {
        description: "Save Game Archive",
        accept: {
          "application/octet-stream": [".sav"],
        },
      },
    ];
  }

  notifyView(): void {
    this.generation += 1;
    this.processEventListener("onEditorFileLoad", [this]);
  }

  protected captureUndoState(): SaveGameDocumentSnapshot | undefined {
    if (!this.document) {
      return undefined;
    }
    return this.document.snapshot();
  }

  protected applyUndoState(state: SaveGameDocumentSnapshot): void {
    if (!this.document || !state) {
      return;
    }
    this.document.restore(state);
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.notifyView();
  }

  markDirty(coalesceKey?: string): void {
    if (coalesceKey) {
      this.captureCoalescedUndo(coalesceKey);
    } else {
      this.captureUndoSnapshot();
    }
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
  }

  public async openFile(file?: EditorFile): Promise<SaveGameDocument | undefined> {
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }
    if (!(file instanceof EditorFile)) {
      return undefined;
    }
    if (this.file != file) {
      this.file = file;
    }

    this.loaded = false;
    this.loadError = "";
    try {
      this.document = await SaveGameDocument.loadFromEditorFile(file);
      this.tabName = this.document.nfoFields.saveGameName
        || this.document.folderName
        || file.getFilename();
      this.loaded = true;
    } catch (e) {
      console.error("TabSaveGameEditorState.openFile", e);
      this.loadError = e instanceof Error ? e.message : String(e);
      this.loaded = true;
    }
    this.clearUndoHistory();
    this.notifyView();
    return this.document;
  }

  async openPackedModuleGff(moduleResRef: string, resRef: string, ext: string): Promise<void> {
    if (!this.document) {
      return;
    }
    const buffer = await this.document.getPackedResourceBuffer(moduleResRef, resRef, ext);
    if (!buffer?.length) {
      console.warn("TabSaveGameEditorState.openPackedModuleGff: empty buffer", moduleResRef, resRef, ext);
      return;
    }
    const [{ TabGFFEditorState }, { ForgeState }] = await Promise.all([
      import("@/apps/forge/states/tabs/TabGFFEditorState"),
      import("@/apps/forge/states/ForgeState"),
    ]);
    const editorFile = new EditorFile({
      buffer,
      resref: resRef,
      ext,
      reskey: ResourceTypes[ext],
    });
    const writeBack = async (exported: Uint8Array) => {
      const ok = await this.document.replacePackedResource(moduleResRef, resRef, ext, exported);
      if (ok) {
        this.notifyView();
      }
      return ok;
    };
    class TabPackedModuleGffEditorState extends TabGFFEditorState {
      async save(): Promise<boolean> {
        const exported = await this.getExportBuffer();
        const ok = await writeBack(exported);
        if (ok && this.file instanceof EditorFile) {
          this.file.buffer = exported;
          this.file.unsaved_changes = false;
        }
        return ok;
      }
    }
    ForgeState.tabManager.addTab(new TabPackedModuleGffEditorState({ editorFile }));
  }

  async save(): Promise<boolean> {
    if (!this.document) {
      return false;
    }
    const ok = await this.document.write();
    if (ok && this.file instanceof EditorFile) {
      this.file.unsaved_changes = false;
    }
    if (!ok) {
      console.error("TabSaveGameEditorState.save: failed to write save folder files");
    }
    return ok;
  }

  async getExportBuffer(): Promise<Uint8Array> {
    if (!this.document?.erf) {
      return this.file?.buffer || new Uint8Array(0);
    }
    this.document.applyDecodedToGff();
    await this.document.erf.ensureResourceDataLoaded();
    return this.document.erf.getExportBuffer();
  }
}
