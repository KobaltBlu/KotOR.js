import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabDLGEditor } from "@/apps/forge/components/tabs/tab-dlg-editor/TabDLGEditor";
import { ForgeDLG } from "@/apps/forge/dlg/ForgeDLG";
import { prefetchDlgNodeTexts } from "@/apps/forge/dlg/dlgLocString";
import { forgeDlgSettings } from "@/apps/forge/settings/forgeEditorsSettings";

/**
 * Conversation editor tab for .dlg GFF files.
 *
 * @file TabDLGEditorState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export class TabDLGEditorState extends TabState {
  tabName: string = "DLG";
  dlg: ForgeDLG = ForgeDLG.createUntitled();
  selectedId: string | undefined;
  viewMode: "graph" | "tree" | "catalog" = "graph";
  graphLayout: "horizontal" | "vertical" = forgeDlgSettings.get().graphLayout;
  walkthrough = false;
  textByNodeId: Map<string, string> = new Map();

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabDLGEditor tab={this} />);
    this.openFile();
    this.saveTypes = [
      {
        description: "Odyssey Dialog File",
        accept: {
          "application/octet-stream": [".dlg"],
        },
      },
    ];
  }

  protected captureUndoState(): ForgeDLG | undefined {
    if (!this.dlg) {
      return undefined;
    }
    return this.dlg.clone();
  }

  protected applyUndoState(state: ForgeDLG): void {
    if (!state) {
      return;
    }
    this.dlg = state.clone();
    this.refreshTexts();
    if (this.selectedId && !this.dlg.getNode(this.selectedId) && this.selectedId !== "root") {
      this.selectedId = this.dlg.startingLinks[0]?.targetId || this.dlg.entries[0]?.id;
    }
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener("onEditorFileChange", [this]);
    this.editorFileUpdated();
  }

  openFile(file?: EditorFile): Promise<ForgeDLG> {
    return new Promise<ForgeDLG>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }
      if (file instanceof EditorFile) {
        if (this.file != file) {
          this.file = file;
        }
        this.tabName = this.file.getFilename();
        const emptyNew = !(file.buffer instanceof Uint8Array && file.buffer.length)
          && !file.path
          && !file.archive_path;
        if (emptyNew) {
          this.dlg = ForgeDLG.createUntitled();
          this.refreshTexts();
          this.selectedId = this.dlg.startingLinks[0]?.targetId || this.dlg.entries[0]?.id;
          this.clearUndoHistory();
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.dlg);
          return;
        }
        file.readFile().then((response) => {
          this.dlg = ForgeDLG.fromBuffer(response.buffer);
          this.refreshTexts();
          this.selectedId = this.dlg.startingLinks[0]?.targetId || this.dlg.entries[0]?.id;
          this.clearUndoHistory();
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.dlg);
        }).catch(reject);
      } else {
        this.dlg = ForgeDLG.createUntitled();
        this.refreshTexts();
        this.selectedId = this.dlg.startingLinks[0]?.targetId;
        resolve(this.dlg);
      }
    });
  }

  mutate(fn: (dlg: ForgeDLG) => void): void {
    this.captureUndoSnapshot();
    fn(this.dlg);
    this.dlg.rebuildIndex();
    this.refreshTexts();
    if (this.file instanceof EditorFile) {
      this.file.unsaved_changes = true;
    }
    this.processEventListener("onEditorFileChange", [this]);
    this.editorFileUpdated();
  }

  refreshTexts(): void {
    this.textByNodeId = prefetchDlgNodeTexts(this.dlg);
  }

  select(id: string | undefined): void {
    this.selectedId = id;
    this.processEventListener("onEditorFileChange", [this]);
  }

  updateFile(): void {
    // Export happens through getExportBuffer.
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.dlg && (!ext || ext === "dlg")) {
      return this.dlg.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
}
