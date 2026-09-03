/**
 * Module Info (IFO) structured editor state.
 *
 * @file TabIFOEditorState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, UpdateFileOptions } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabGFFEditorState } from "@/apps/forge/states/tabs/TabGFFEditorState";
import { TabIFOEditor } from "@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor";
import { gffFromSnapshot, snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";

export interface IFOEditorModel {
  modName: string;
  modTag: string;
  entryArea: string;
  entryX: number;
  entryY: number;
  entryZ: number;
  entryDirX: number;
  entryDirY: number;
  dawnHour: number;
  duskHour: number;
  xpScale: number;
  startMovie: string;
  voId: string;
  description: string;
}

function readLocString(field?: KotOR.GFFField): string {
  if (!field) return "";
  try {
    return field.getCExoLocString()?.getValue?.() || field.getValue?.() || "";
  } catch {
    return String(field.getValue?.() || "");
  }
}

export class TabIFOEditorState extends TabState {
  tabName = "Module Info";
  gff: KotOR.GFFObject = new KotOR.GFFObject();
  model: IFOEditorModel = {
    modName: "",
    modTag: "",
    entryArea: "",
    entryX: 0,
    entryY: 0,
    entryZ: 0,
    entryDirX: 0,
    entryDirY: 1,
    dawnHour: 6,
    duskHour: 18,
    xpScale: 10,
    startMovie: "",
    voId: "",
    description: "",
  };

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabIFOEditor tab={this} />);
    void this.openFile();
  }

  async openFile(file?: EditorFile): Promise<void> {
    if (!file && this.file instanceof EditorFile) {
      file = this.file;
    }
    if (!(file instanceof EditorFile)) {
      return;
    }
    this.file = file;
    this.tabName = file.getFilename();
    const response = await file.readFile();
    this.gff = new KotOR.GFFObject(response.buffer || new Uint8Array());
    if (!String(this.gff.FileType || "").trim()) {
      this.gff.FileType = "IFO ";
    }
    this.loadFromGff();
    this.clearUndoHistory();
    this.processEventListener("onEditorFileLoad", [this]);
  }

  loadFromGff(): void {
    const root = this.gff.RootNode;
    if (!root) return;
    this.model = {
      modName: readLocString(root.getFieldByLabel("Mod_Name")),
      modTag: root.getFieldByLabel("Mod_Tag")?.getValue?.() || "",
      entryArea: root.getFieldByLabel("Mod_Entry_Area")?.getValue?.() || "",
      entryX: root.getFieldByLabel("Mod_Entry_X")?.getValue?.() ?? 0,
      entryY: root.getFieldByLabel("Mod_Entry_Y")?.getValue?.() ?? 0,
      entryZ: root.getFieldByLabel("Mod_Entry_Z")?.getValue?.() ?? 0,
      entryDirX: root.getFieldByLabel("Mod_Entry_Dir_X")?.getValue?.() ?? 0,
      entryDirY: root.getFieldByLabel("Mod_Entry_Dir_Y")?.getValue?.() ?? 1,
      dawnHour: root.getFieldByLabel("Mod_DawnHour")?.getValue?.() ?? 6,
      duskHour: root.getFieldByLabel("Mod_DuskHour")?.getValue?.() ?? 18,
      xpScale: root.getFieldByLabel("Mod_XPScale")?.getValue?.() ?? 10,
      startMovie: root.getFieldByLabel("Mod_StartMovie")?.getValue?.() || "",
      voId: root.getFieldByLabel("Mod_VO_ID")?.getValue?.() || "",
      description: readLocString(root.getFieldByLabel("Mod_Description")),
    };
    this.processEventListener("onIFOChanged", [this]);
  }

  private setOrAddField(label: string, type: KotOR.GFFDataType, value: any): void {
    const root = this.gff.RootNode;
    if (!root) return;
    if (root.hasField(label)) {
      const field = root.getFieldByLabel(label);
      if (type === KotOR.GFFDataType.CEXOLOCSTRING) {
        const loc = new KotOR.CExoLocString();
        loc.addSubString(String(value || ""), 0);
        field.setValue(loc);
      } else {
        field.setValue(value);
      }
      return;
    }
    if (type === KotOR.GFFDataType.CEXOLOCSTRING) {
      const loc = new KotOR.CExoLocString();
      loc.addSubString(String(value || ""), 0);
      root.addField(new KotOR.GFFField(type, label, loc));
    } else {
      root.addField(new KotOR.GFFField(type, label, value));
    }
  }

  exportToGff(): KotOR.GFFObject {
    if (!this.gff.RootNode) {
      this.gff.RootNode = new KotOR.GFFStruct(0xffff);
    }
    this.gff.FileType = "IFO ";
    this.setOrAddField("Mod_Name", KotOR.GFFDataType.CEXOLOCSTRING, this.model.modName);
    this.setOrAddField("Mod_Tag", KotOR.GFFDataType.CEXOSTRING, this.model.modTag);
    this.setOrAddField("Mod_Entry_Area", KotOR.GFFDataType.RESREF, this.model.entryArea);
    this.setOrAddField("Mod_Entry_X", KotOR.GFFDataType.FLOAT, this.model.entryX);
    this.setOrAddField("Mod_Entry_Y", KotOR.GFFDataType.FLOAT, this.model.entryY);
    this.setOrAddField("Mod_Entry_Z", KotOR.GFFDataType.FLOAT, this.model.entryZ);
    this.setOrAddField("Mod_Entry_Dir_X", KotOR.GFFDataType.FLOAT, this.model.entryDirX);
    this.setOrAddField("Mod_Entry_Dir_Y", KotOR.GFFDataType.FLOAT, this.model.entryDirY);
    this.setOrAddField("Mod_DawnHour", KotOR.GFFDataType.BYTE, this.model.dawnHour);
    this.setOrAddField("Mod_DuskHour", KotOR.GFFDataType.BYTE, this.model.duskHour);
    this.setOrAddField("Mod_XPScale", KotOR.GFFDataType.BYTE, this.model.xpScale);
    this.setOrAddField("Mod_StartMovie", KotOR.GFFDataType.RESREF, this.model.startMovie);
    this.setOrAddField("Mod_VO_ID", KotOR.GFFDataType.CEXOSTRING, this.model.voId);
    this.setOrAddField("Mod_Description", KotOR.GFFDataType.CEXOLOCSTRING, this.model.description);
    return this.gff;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (ext === "ifo" || !ext) {
      return this.exportToGff().getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(options?: UpdateFileOptions): void {
    if (!options?.skipHistory) {
      if (options?.coalesceKey) {
        this.captureCoalescedUndo(options.coalesceKey);
      } else {
        this.captureUndoSnapshot();
      }
    }
    this.exportToGff();
    if (this.file) {
      this.file.unsaved_changes = true;
      this.file.buffer = this.gff.getExportBuffer();
    }
    this.editorFileUpdated();
    this.processEventListener("onIFOChanged", [this]);
  }

  protected captureUndoState(): any {
    return snapshotGff(this.exportToGff());
  }

  protected applyUndoState(state: any): void {
    this.gff = gffFromSnapshot(state);
    this.loadFromGff();
    if (this.file) {
      this.file.unsaved_changes = true;
      this.file.buffer = this.gff.getExportBuffer();
    }
    this.editorFileUpdated();
  }

  patchModel(patch: Partial<IFOEditorModel>, coalesceKey?: string): void {
    this.model = { ...this.model, ...patch };
    this.updateFile(coalesceKey ? { coalesceKey } : undefined);
  }

  openAsRawGff(): void {
    if (!this.file) return;
    ForgeState.tabManager.addTab(new TabGFFEditorState({ editorFile: this.file }));
  }
}
