import React from "react";
import { TabHexEditor } from "@/apps/forge/components/tabs/tab-hex-editor/TabHexEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";

export class TabHexEditorState extends TabState {
  tabName: string = "Hex";
  bytes: Uint8Array = new Uint8Array(0);

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(<TabHexEditor tab={this} />);
    this.refreshSaveTypes();
    this.openFile();
  }

  private refreshSaveTypes(): void {
    const ext = (this.file instanceof EditorFile && this.file.ext) ? String(this.file.ext).toLowerCase() : "bin";
    const dotExt = `.${ext}`;
    this.saveTypes = [
      {
        description: "Binary",
        accept: {
          "application/octet-stream": [dotExt],
        },
      },
    ];
  }

  openFile(file?: EditorFile): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file !== file) this.file = file;
        this.tabName = this.file.getFilename();
        this.refreshSaveTypes();

        file
          .readFile()
          .then((response) => {
            this.bytes = new Uint8Array(response.buffer);
            this.clearUndoHistory();
            this.processEventListener("onEditorFileLoad", [this]);
            resolve(this.bytes);
          })
          .catch(reject);
      } else {
        reject(new Error("TabHexEditorState.openFile requires an EditorFile"));
      }
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    return this.bytes.length ? this.bytes : new Uint8Array(0);
  }
}
