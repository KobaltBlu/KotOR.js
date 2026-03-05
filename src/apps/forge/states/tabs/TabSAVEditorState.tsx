import React from "react";

import { TabSAVEditor } from "@/apps/forge/components/tabs/tab-sav-editor/TabSAVEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { UndoManager } from "@/apps/forge/managers/UndoManager";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

interface GlobalVariableEntry<T extends boolean | number | string> {
  name: string;
  value: T;
}

export interface GlobalVariableSnapshot {
  resRef: string;
  ext: string;
  booleans: GlobalVariableEntry<boolean>[];
  numbers: GlobalVariableEntry<number>[];
  strings: GlobalVariableEntry<string>[];
}

export class TabSAVEditorState extends TabState {
  tabName: string = 'Save Game Editor';
  erf?: KotOR.ERFObject;
  undoManager: UndoManager = new UndoManager();
  resourceOverrides: Map<string, Uint8Array> = new Map();
  globalVariables?: GlobalVariableSnapshot;
  private globalVariableGff?: KotOR.GFFObject;
  private globalVariableResType?: number;
  saveMeta?: {
    areaName?: string;
    lastModule?: string;
    gameTime?: number;
    resourceCount?: number;
    typeCounts?: Record<string, number>;
    globalVariableCandidates?: Array<{
      resRef: string;
      ext: string;
      boolCount: number;
      numberCount: number;
      stringCount: number;
    }>;
  };

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabSAVEditorState constructor entry");
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug("TabSAVEditorState constructor tabName", this.tabName);
    } else {
      log.trace("TabSAVEditorState constructor no file");
    }

    this.saveTypes = [
      {
        description: 'Save Game File',
        accept: {
          'application/octet-stream': ['.sav']
        }
      }
    ];
    log.trace("TabSAVEditorState constructor saveTypes set");

    this.setContentView(<TabSAVEditor tab={this}></TabSAVEditor>);
    log.trace("TabSAVEditorState constructor setContentView");
    this.openFile();
    log.trace("TabSAVEditorState constructor exit");
  }

  async openFile() {
    log.trace("TabSAVEditorState openFile entry");
    if(this.file){
      log.trace("TabSAVEditorState openFile readFile");
      await this.file.readFile();
      log.debug("TabSAVEditorState openFile path", this.file.path);
      this.erf = new KotOR.ERFObject(this.file.path);
      log.trace("TabSAVEditorState openFile ERFObject created, load");
      await this.erf.load();
      log.trace("TabSAVEditorState openFile erf.load done");

      this.saveMeta = await this.extractSaveMetadata();
      log.debug("TabSAVEditorState openFile saveMeta resourceCount", this.saveMeta?.resourceCount);
      this.undoManager.clear();
      if (this.saveMeta.globalVariableCandidates?.length) {
        const first = this.saveMeta.globalVariableCandidates[0];
        await this.loadGlobalVariables(first.resRef, first.ext);
      }

      this.processEventListener('onEditorFileLoad', [this]);
      log.info("TabSAVEditorState openFile loaded");
    } else {
      log.trace("TabSAVEditorState openFile no file");
    }
    log.trace("TabSAVEditorState openFile exit");
  }

  private async readGffResourceByExt(ext: string): Promise<KotOR.GFFObject | undefined> {
    if (!this.erf) return;
    const key = this.erf.keyList.find((entry) => KotOR.ResourceTypes.getKeyByValue(entry.resType) === ext);
    if (!key) return;
    try {
      const buffer = await this.erf.getResourceBufferByResRef(key.resRef, key.resType);
      if (!buffer?.length) return;
      return new KotOR.GFFObject(buffer);
    } catch (e) {
      log.warn("TabSAVEditorState readGffResourceByExt failed", ext, e);
      return;
    }
  }

  private buildTypeCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    if (!this.erf) return counts;

    for (const key of this.erf.keyList) {
      const ext = KotOR.ResourceTypes.getKeyByValue(key.resType) || 'unknown';
      counts[ext] = (counts[ext] || 0) + 1;
    }

    return counts;
  }

  private resourceOverrideKey(resRef: string, resType: number): string {
    return `${String(resRef).toLowerCase()}:${resType}`;
  }

  private findResourceKey(resRef: string, ext: string): { resRef: string; resType: number } | undefined {
    if (!this.erf) return;
    return this.erf.keyList.find((entry) => entry.resRef === resRef && (KotOR.ResourceTypes.getKeyByValue(entry.resType) || '') === ext);
  }

  async getResourceBufferByEntry(resRef: string, resType: number): Promise<Uint8Array> {
    const key = this.resourceOverrideKey(resRef, resType);
    const override = this.resourceOverrides.get(key);
    if (override) {
      return new Uint8Array(override);
    }
    return await this.erf?.getResourceBufferByResRef(resRef, resType) || new Uint8Array(0);
  }

  private getStructListByLabels(root: KotOR.GFFStruct, labels: string[]): KotOR.GFFStruct[] {
    for (const label of labels) {
      const field = root.getFieldByLabel(label);
      const structs = field?.getChildStructs?.() || [];
      if (structs.length > 0) {
        return structs;
      }
    }
    return [];
  }

  private getVoidValueByLabels(root: KotOR.GFFStruct, labels: string[]): Uint8Array {
    for (const label of labels) {
      const field = root.getFieldByLabel(label);
      const value = field?.getVoid?.();
      if (value instanceof Uint8Array) {
        return new Uint8Array(value);
      }
    }
    return new Uint8Array(0);
  }

  private decodeGlobalVariables(gff: KotOR.GFFObject, resRef: string, ext: string): GlobalVariableSnapshot {
    const root = gff.RootNode;
    const booleanCats = this.getStructListByLabels(root, ['CatBoolean', 'GlobalBooleans', 'Booleans', 'BooleanVars']);
    const numberCats = this.getStructListByLabels(root, ['CatNumber', 'GlobalNumbers', 'Numbers', 'NumberVars']);
    const stringCats = this.getStructListByLabels(root, ['CatString', 'GlobalStrings', 'Strings', 'StringVars']);

    const booleanValues = this.getVoidValueByLabels(root, ['ValBoolean', 'BooleanValues']);
    const numberValues = this.getVoidValueByLabels(root, ['ValNumber', 'NumberValues']);
    const stringValues = this.getStructListByLabels(root, ['ValString', 'StringValues']);

    const booleans: GlobalVariableEntry<boolean>[] = booleanCats.map((cat, index) => {
      const name = String(cat.getFieldByLabel('Name')?.getValue() || `Boolean ${index}`);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      const byte = booleanValues[byteIndex] || 0;
      const value = (byte & (1 << bitIndex)) !== 0;
      return { name, value };
    });

    const numbers: GlobalVariableEntry<number>[] = numberCats.map((cat, index) => {
      const name = String(cat.getFieldByLabel('Name')?.getValue() || `Number ${index}`);
      const value = Number(numberValues[index] || 0);
      return { name, value };
    });

    const strings: GlobalVariableEntry<string>[] = stringCats.map((cat, index) => {
      const name = String(cat.getFieldByLabel('Name')?.getValue() || `String ${index}`);
      const valueStruct = stringValues[index];
      const value = String(valueStruct?.getFieldByLabel('String')?.getValue() || '');
      return { name, value };
    });

    return {
      resRef,
      ext,
      booleans,
      numbers,
      strings,
    };
  }

  async loadGlobalVariables(resRef: string, ext: string): Promise<void> {
    if (!this.erf) return;
    const key = this.findResourceKey(resRef, ext);
    if (!key) return;

    const buffer = await this.getResourceBufferByEntry(key.resRef, key.resType);
    if (!buffer?.length) return;

    this.globalVariableGff = new KotOR.GFFObject(buffer);
    this.globalVariableResType = key.resType;
    this.globalVariables = this.decodeGlobalVariables(this.globalVariableGff, key.resRef, ext);
    this.undoManager.clear();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  private markGlobalVariableChanged(): void {
    if (!this.file || !this.globalVariableGff || !this.globalVariables || this.globalVariableResType == null) return;

    const exportBuffer = this.globalVariableGff.getExportBuffer();
    const overrideKey = this.resourceOverrideKey(this.globalVariables.resRef, this.globalVariableResType);
    this.resourceOverrides.set(overrideKey, exportBuffer);
    this.file.unsaved_changes = true;
    this.processEventListener('onEditorFileLoad', [this]);
  }

  private applyGlobalBoolean(index: number, value: boolean): void {
    if (!this.globalVariables || !this.globalVariableGff) return;

    const boolEntry = this.globalVariables.booleans[index];
    if (!boolEntry) return;
    boolEntry.value = value;

    const field = this.globalVariableGff.RootNode.getFieldByLabel('ValBoolean');
    const sourceBytes = new Uint8Array(field?.getVoid?.() || []);
    const byteIndex = Math.floor(index / 8);
    const bitIndex = index % 8;
    const boolBytes = byteIndex < sourceBytes.length
      ? sourceBytes
      : (() => {
        const grown = new Uint8Array(byteIndex + 1);
        grown.set(sourceBytes);
        return grown;
      })();
    if (value) {
      boolBytes[byteIndex] = (boolBytes[byteIndex] || 0) | (1 << bitIndex);
    } else {
      boolBytes[byteIndex] = (boolBytes[byteIndex] || 0) & ~(1 << bitIndex);
    }
    field?.setData?.(boolBytes);
    this.markGlobalVariableChanged();
  }

  updateGlobalBoolean(index: number, value: boolean): void {
    if (!this.globalVariables) return;
    const boolEntry = this.globalVariables.booleans[index];
    if (!boolEntry) return;
    const previous = boolEntry.value;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-global-bool-edit',
      description: `Set ${boolEntry.name}`,
      redo: () => this.applyGlobalBoolean(index, value),
      undo: () => this.applyGlobalBoolean(index, previous),
    });
  }

  private applyGlobalNumber(index: number, value: number): void {
    if (!this.globalVariables || !this.globalVariableGff) return;
    const numberEntry = this.globalVariables.numbers[index];
    if (!numberEntry) return;
    const next = Math.max(0, Math.min(255, Number.isFinite(value) ? Math.round(value) : 0));
    numberEntry.value = next;

    const field = this.globalVariableGff.RootNode.getFieldByLabel('ValNumber');
    const sourceBytes = new Uint8Array(field?.getVoid?.() || []);
    const numberBytes = index < sourceBytes.length
      ? sourceBytes
      : (() => {
        const grown = new Uint8Array(index + 1);
        grown.set(sourceBytes);
        return grown;
      })();
    numberBytes[index] = next;
    field?.setData?.(numberBytes);
    this.markGlobalVariableChanged();
  }

  updateGlobalNumber(index: number, value: number): void {
    if (!this.globalVariables) return;
    const numberEntry = this.globalVariables.numbers[index];
    if (!numberEntry) return;
    const previous = numberEntry.value;
    const next = Math.max(0, Math.min(255, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-global-number-edit',
      description: `Set ${numberEntry.name}`,
      redo: () => this.applyGlobalNumber(index, next),
      undo: () => this.applyGlobalNumber(index, previous),
    });
  }

  private applyGlobalString(index: number, value: string): void {
    if (!this.globalVariables || !this.globalVariableGff) return;
    const stringEntry = this.globalVariables.strings[index];
    if (!stringEntry) return;
    stringEntry.value = value;

    const valueList = this.globalVariableGff.RootNode.getFieldByLabel('ValString')?.getChildStructs?.() || [];
    valueList[index]?.getFieldByLabel('String')?.setValue(value);
    this.markGlobalVariableChanged();
  }

  updateGlobalString(index: number, value: string): void {
    if (!this.globalVariables) return;
    const stringEntry = this.globalVariables.strings[index];
    if (!stringEntry) return;
    const previous = stringEntry.value;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-global-string-edit',
      description: `Set ${stringEntry.name}`,
      redo: () => this.applyGlobalString(index, value),
      undo: () => this.applyGlobalString(index, previous),
    });
  }

  undo(): void {
    this.undoManager.undo();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  redo(): void {
    this.undoManager.redo();
    this.processEventListener('onEditorFileLoad', [this]);
  }

  private countListEntries(root: KotOR.GFFStruct, labels: string[]): number {
    for (const label of labels) {
      const field = root.getFieldByLabel(label);
      const structs = field?.getChildStructs?.() || [];
      if (structs.length > 0) {
        return structs.length;
      }
    }
    return 0;
  }

  private async extractGlobalVariableCandidates(): Promise<Array<{
    resRef: string;
    ext: string;
    boolCount: number;
    numberCount: number;
    stringCount: number;
  }>> {
    if (!this.erf) return [];

    const candidates = this.erf.keyList
      .filter((entry) => {
        const ext = KotOR.ResourceTypes.getKeyByValue(entry.resType) || '';
        const ref = String(entry.resRef || '').toLowerCase();
        return ext === 'res' || ext === 'gff' || ref.includes('global') || ref.includes('var');
      })
      .slice(0, 64);

    const summaries: Array<{
      resRef: string;
      ext: string;
      boolCount: number;
      numberCount: number;
      stringCount: number;
    }> = [];

    for (const key of candidates) {
      const ext = KotOR.ResourceTypes.getKeyByValue(key.resType) || 'unknown';
      try {
        const buffer = await this.erf.getResourceBufferByResRef(key.resRef, key.resType);
        if (!buffer?.length) continue;

        const gff = new KotOR.GFFObject(buffer);
        const root = gff.RootNode;
        const boolCount = this.countListEntries(root, ['CatBoolean', 'GlobalBooleans', 'Booleans', 'BooleanVars']);
        const numberCount = this.countListEntries(root, ['CatNumber', 'GlobalNumbers', 'Numbers', 'NumberVars']);
        const stringCount = this.countListEntries(root, ['CatString', 'GlobalStrings', 'Strings', 'StringVars']);
        const total = boolCount + numberCount + stringCount;
        if (!total) continue;

        summaries.push({
          resRef: key.resRef,
          ext,
          boolCount,
          numberCount,
          stringCount,
        });
      } catch (e) {
        log.trace("TabSAVEditorState extractGlobalVariableCandidates skip", key.resRef, e);
      }
    }

    return summaries;
  }

  async extractSaveMetadata(): Promise<{ areaName: string; lastModule: string; gameTime: number; resourceCount: number; typeCounts: Record<string, number>; globalVariableCandidates: Array<{ resRef: string; ext: string; boolCount: number; numberCount: number; stringCount: number; }>; }> {
    log.trace("TabSAVEditorState extractSaveMetadata entry");
    let areaName = 'Unknown';
    let lastModule = 'Unknown';
    let gameTime = 0;

    const ifo = await this.readGffResourceByExt('ifo');
    if (ifo) {
      const entryArea = ifo.RootNode.getFieldByLabel('Mod_Entry_Area')?.getValue();
      if (typeof entryArea === 'string' && entryArea.length) {
        lastModule = entryArea;
      }
      const dawnHour = Number(ifo.RootNode.getFieldByLabel('Mod_DawnHour')?.getValue() || 0);
      const duskHour = Number(ifo.RootNode.getFieldByLabel('Mod_DuskHour')?.getValue() || 0);
      if (Number.isFinite(dawnHour) && Number.isFinite(duskHour)) {
        gameTime = Math.max(0, duskHour - dawnHour);
      }
    }

    const are = await this.readGffResourceByExt('are');
    if (are) {
      const nameField = are.RootNode.getFieldByLabel('Name');
      const locString = nameField?.getCExoLocString?.();
      const locValue = locString?.getValue?.();
      if (typeof locValue === 'string' && locValue.length) {
        areaName = locValue;
      }
    }

    const meta = {
      areaName,
      lastModule,
      gameTime,
      resourceCount: this.erf?.keyList.length ?? 0,
      typeCounts: this.buildTypeCounts(),
      globalVariableCandidates: await this.extractGlobalVariableCandidates(),
    };
    log.trace("TabSAVEditorState extractSaveMetadata resourceCount", meta.resourceCount);
    return meta;
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace("TabSAVEditorState getExportBuffer entry");
    if(this.erf){
      const output = new KotOR.ERFObject();
      output.header.fileType = this.erf.header.fileType;
      output.header.fileVersion = this.erf.header.fileVersion;

      for (const key of this.erf.keyList) {
        const buffer = await this.getResourceBufferByEntry(key.resRef, key.resType);
        output.addResource(key.resRef, key.resType, buffer);
      }
      const buf = output.getExportBuffer();
      log.trace("TabSAVEditorState getExportBuffer length", buf?.length);
      return buf;
    }
    log.trace("TabSAVEditorState getExportBuffer no erf return empty");
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace("TabSAVEditorState updateFile (no-op)");
  }

  getResourceID(): string | undefined {
    log.trace("TabSAVEditorState getResourceID");
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace("TabSAVEditorState getResourceID", id);
    return id;
  }
}
