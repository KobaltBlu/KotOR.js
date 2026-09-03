/**
 * Area (ARE) structured editor state.
 *
 * @file TabAREEditorState.tsx
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import React from "react";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState, UpdateFileOptions } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import { TabAREEditor } from "@/apps/forge/components/tabs/tab-are-editor/TabAREEditor";
import { gffFromSnapshot, snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";
import { ForgeState } from "@/apps/forge/states/ForgeState";
import { TabGFFEditorState } from "@/apps/forge/states/tabs/TabGFFEditorState";

export interface AREEditorModel {
  name: string;
  tag: string;
  comments: string;
  envAudio: number;
  grassTexName: string;
  chanceRain: number;
  chanceSnow: number;
  chanceLightning: number;
  fogNear: number;
  fogFar: number;
  sunFogOn: boolean;
  moonFogOn: boolean;
}

function readLocString(field?: KotOR.GFFField): string {
  if (!field) return "";
  try {
    return field.getCExoLocString()?.getValue?.() || field.getValue?.() || "";
  } catch {
    return String(field.getValue?.() || "");
  }
}

export class TabAREEditorState extends TabState {
  tabName = "Area";
  gff: KotOR.GFFObject = new KotOR.GFFObject();
  model: AREEditorModel = {
    name: "",
    tag: "",
    comments: "",
    envAudio: 0,
    grassTexName: "",
    chanceRain: 0,
    chanceSnow: 0,
    chanceLightning: 0,
    fogNear: 0,
    fogFar: 0,
    sunFogOn: false,
    moonFogOn: false,
  };

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabAREEditor tab={this} />);
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
      this.gff.FileType = "ARE ";
    }
    this.loadFromGff();
    this.clearUndoHistory();
    this.processEventListener("onEditorFileLoad", [this]);
  }

  loadFromGff(): void {
    const root = this.gff.RootNode;
    if (!root) return;
    this.model = {
      name: readLocString(root.getFieldByLabel("Name")),
      tag: root.getFieldByLabel("Tag")?.getValue?.() || "",
      comments: root.getFieldByLabel("Comments")?.getValue?.() || "",
      envAudio: root.getFieldByLabel("EnvAudio")?.getValue?.() ?? 0,
      grassTexName: root.getFieldByLabel("Grass_TexName")?.getValue?.() || "",
      chanceRain: root.getFieldByLabel("ChanceRain")?.getValue?.() ?? 0,
      chanceSnow: root.getFieldByLabel("ChanceSnow")?.getValue?.() ?? 0,
      chanceLightning: root.getFieldByLabel("ChanceLightning")?.getValue?.() ?? 0,
      fogNear: root.getFieldByLabel("FogNear")?.getValue?.()
        ?? root.getFieldByLabel("SunFogNear")?.getValue?.()
        ?? 0,
      fogFar: root.getFieldByLabel("FogFar")?.getValue?.()
        ?? root.getFieldByLabel("SunFogFar")?.getValue?.()
        ?? 0,
      sunFogOn: !!root.getFieldByLabel("SunFogOn")?.getValue?.(),
      moonFogOn: !!root.getFieldByLabel("MoonFogOn")?.getValue?.(),
    };
    this.processEventListener("onAREChanged", [this]);
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
    this.gff.FileType = "ARE ";
    this.setOrAddField("Name", KotOR.GFFDataType.CEXOLOCSTRING, this.model.name);
    this.setOrAddField("Tag", KotOR.GFFDataType.CEXOSTRING, this.model.tag);
    this.setOrAddField("Comments", KotOR.GFFDataType.CEXOSTRING, this.model.comments);
    this.setOrAddField("EnvAudio", KotOR.GFFDataType.INT, this.model.envAudio);
    this.setOrAddField("Grass_TexName", KotOR.GFFDataType.RESREF, this.model.grassTexName);
    this.setOrAddField("ChanceRain", KotOR.GFFDataType.INT, this.model.chanceRain);
    this.setOrAddField("ChanceSnow", KotOR.GFFDataType.INT, this.model.chanceSnow);
    this.setOrAddField("ChanceLightning", KotOR.GFFDataType.INT, this.model.chanceLightning);
    this.setOrAddField("SunFogNear", KotOR.GFFDataType.FLOAT, this.model.fogNear);
    this.setOrAddField("SunFogFar", KotOR.GFFDataType.FLOAT, this.model.fogFar);
    this.setOrAddField("SunFogOn", KotOR.GFFDataType.BYTE, this.model.sunFogOn ? 1 : 0);
    this.setOrAddField("MoonFogOn", KotOR.GFFDataType.BYTE, this.model.moonFogOn ? 1 : 0);
    return this.gff;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (ext === "are" || !ext) {
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
    this.processEventListener("onAREChanged", [this]);
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

  patchModel(patch: Partial<AREEditorModel>, coalesceKey?: string): void {
    this.model = { ...this.model, ...patch };
    this.updateFile(coalesceKey ? { coalesceKey } : undefined);
  }

  openAsRawGff(): void {
    if (!this.file) return;
    ForgeState.tabManager.addTab(new TabGFFEditorState({ editorFile: this.file }));
  }
}
