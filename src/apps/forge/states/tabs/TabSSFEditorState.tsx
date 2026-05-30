import React from "react";
import { TabSSFEditor } from "@/apps/forge/components/tabs/tab-ssf-editor/TabSSFEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { SSFType } from "@/enums/resource/SSFType";
import { normalizeSoundResRef } from "@/apps/forge/states/tabs/ssfEditorTlkHelpers";

export { normalizeSoundResRef } from "@/apps/forge/states/tabs/ssfEditorTlkHelpers";

interface SSFUndoSnapshot {
  sound_refs: number[];
  FileType: string;
  FileVersion: string;
  headerPadding: number;
}

export class TabSSFEditorState extends TabState {
  tabName: string = "SSF";
  ssfObject: KotOR.SSFObject;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    this.setContentView(<TabSSFEditor tab={this} />);
    this.openFile();

    this.saveTypes = [
      {
        description: "Sound Set",
        accept: {
          "application/octet-stream": [".ssf"],
        },
      },
    ];
  }

  /** WAV resref from the TLK row for this slot (Forge UI / preview). */
  getSoundResRefDisplay(slot: SSFType): string {
    if (!this.ssfObject || slot < 0 || slot >= KotOR.SSF_SLOT_COUNT) {
      return "";
    }
    const strRef = this.ssfObject.getStrRef(slot);
    const tlk = KotOR.TLKManager.TLKStrings[strRef];
    if (!tlk) return "";
    return normalizeSoundResRef(tlk.SoundResRef);
  }

  /** TLK body text for this slot when the talk table is loaded. */
  getSoundText(slot: SSFType): string {
    if (!this.ssfObject || slot < 0 || slot >= KotOR.SSF_SLOT_COUNT) {
      return "";
    }
    const strRef = this.ssfObject.getStrRef(slot);
    const tlk = KotOR.TLKManager.TLKStrings[strRef];
    return tlk?.Value ?? "";
  }

  protected captureUndoState(): SSFUndoSnapshot | undefined {
    if (!this.ssfObject) return undefined;
    return {
      sound_refs: [...this.ssfObject.sound_refs],
      FileType: this.ssfObject.FileType,
      FileVersion: this.ssfObject.FileVersion,
      headerPadding: this.ssfObject.headerPadding,
    };
  }

  protected applyUndoState(state: SSFUndoSnapshot): void {
    if (!this.ssfObject || !state) return;
    this.ssfObject.sound_refs = [...state.sound_refs];
    this.ssfObject.FileType = state.FileType;
    this.ssfObject.FileVersion = state.FileVersion;
    this.ssfObject.headerPadding = state.headerPadding;
    if (this.file instanceof EditorFile) this.file.unsaved_changes = true;
    this.processEventListener("onEditorFileLoad", [this]);
  }

  openFile(file?: EditorFile): Promise<KotOR.SSFObject> {
    return new Promise<KotOR.SSFObject>((resolve, reject) => {
      if (!file && this.file instanceof EditorFile) {
        file = this.file;
      }

      if (file instanceof EditorFile) {
        if (this.file != file) this.file = file;
        this.tabName = this.file.getFilename();

        file.readFile().then((response) => {
          this.ssfObject = new KotOR.SSFObject(response.buffer);
          this.clearUndoHistory();
          this.processEventListener("onEditorFileLoad", [this]);
          resolve(this.ssfObject);
        });
      } else {
        reject(new Error("TabSSFEditorState.openFile requires an EditorFile"));
      }
    });
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if (!this.ssfObject) {
      return new Uint8Array(0);
    }
    return this.ssfObject.toExportBuffer();
  }
}
