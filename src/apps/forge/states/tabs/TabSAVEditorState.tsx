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
  private moduleInfoGff?: KotOR.GFFObject;
  private moduleInfoResRef?: string;
  private moduleInfoResType?: number;
  private areaInfoGff?: KotOR.GFFObject;
  private areaInfoResRef?: string;
  private areaInfoResType?: number;
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

      await this.loadModuleInfoForEditing();
      await this.loadAreaInfoForEditing();
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

  private async loadModuleInfoForEditing(): Promise<void> {
    this.moduleInfoGff = undefined;
    this.moduleInfoResRef = undefined;
    this.moduleInfoResType = undefined;
    if (!this.erf) return;

    const key = this.erf.keyList.find((entry) => KotOR.ResourceTypes.getKeyByValue(entry.resType) === 'ifo');
    if (!key) return;

    const buffer = await this.getResourceBufferByEntry(key.resRef, key.resType);
    if (!buffer?.length) return;

    this.moduleInfoGff = new KotOR.GFFObject(buffer);
    this.moduleInfoResRef = key.resRef;
    this.moduleInfoResType = key.resType;
  }

  private async loadAreaInfoForEditing(): Promise<void> {
    this.areaInfoGff = undefined;
    this.areaInfoResRef = undefined;
    this.areaInfoResType = undefined;
    if (!this.erf) return;

    const key = this.erf.keyList.find((entry) => KotOR.ResourceTypes.getKeyByValue(entry.resType) === 'are');
    if (!key) return;

    const buffer = await this.getResourceBufferByEntry(key.resRef, key.resType);
    if (!buffer?.length) return;

    this.areaInfoGff = new KotOR.GFFObject(buffer);
    this.areaInfoResRef = key.resRef;
    this.areaInfoResType = key.resType;
  }

  private markModuleInfoChanged(): void {
    if (!this.file || !this.moduleInfoGff || !this.moduleInfoResRef || this.moduleInfoResType == null) return;

    const exportBuffer = this.moduleInfoGff.getExportBuffer();
    const overrideKey = this.resourceOverrideKey(this.moduleInfoResRef, this.moduleInfoResType);
    this.resourceOverrides.set(overrideKey, exportBuffer);

    const moduleName = String(this.moduleInfoGff.RootNode.getFieldByLabel('Mod_Entry_Area')?.getValue() || 'Unknown');
    const dawnHour = Number(this.moduleInfoGff.RootNode.getFieldByLabel('Mod_DawnHour')?.getValue() || 0);
    const duskHour = Number(this.moduleInfoGff.RootNode.getFieldByLabel('Mod_DuskHour')?.getValue() || 0);
    if (this.saveMeta) {
      this.saveMeta.lastModule = moduleName;
      this.saveMeta.gameTime = Math.max(0, duskHour - dawnHour);
    }

    this.file.unsaved_changes = true;
    this.processEventListener('onEditorFileLoad', [this]);
  }

  private applyModuleInfoField(label: string, value: string | number): void {
    if (!this.moduleInfoGff) return;
    const field = this.moduleInfoGff.RootNode.getFieldByLabel(label);
    if (!field) return;
    field.setValue(value);
    this.markModuleInfoChanged();
  }

  private markAreaInfoChanged(): void {
    if (!this.file || !this.areaInfoGff || !this.areaInfoResRef || this.areaInfoResType == null) return;

    const exportBuffer = this.areaInfoGff.getExportBuffer();
    const overrideKey = this.resourceOverrideKey(this.areaInfoResRef, this.areaInfoResType);
    this.resourceOverrides.set(overrideKey, exportBuffer);

    const areaName = String(this.areaInfoGff.RootNode.getFieldByLabel('Name')?.getCExoLocString?.()?.getValue?.() || 'Unknown');
    if (this.saveMeta) {
      this.saveMeta.areaName = areaName;
    }

    this.file.unsaved_changes = true;
    this.processEventListener('onEditorFileLoad', [this]);
  }

  private applyAreaName(value: string): void {
    if (!this.areaInfoGff) return;
    const field = this.areaInfoGff.RootNode.getFieldByLabel('Name');
    if (!field) return;
    field.setValue(value);
    this.markAreaInfoChanged();
  }

  private applyAreaField(label: string, value: string): void {
    if (!this.areaInfoGff) return;
    const field = this.areaInfoGff.RootNode.getFieldByLabel(label);
    if (!field) return;
    field.setValue(value);
    this.markAreaInfoChanged();
  }

  private applyAreaNumberField(label: string, value: number, min: number, max: number): void {
    if (!this.areaInfoGff) return;
    const field = this.areaInfoGff.RootNode.getFieldByLabel(label);
    if (!field) return;
    const next = Math.max(min, Math.min(max, Number.isFinite(value) ? Math.round(value) : min));
    field.setValue(next);
    this.markAreaInfoChanged();
  }

  private applyAreaFloatField(label: string, value: number, min: number, max: number): void {
    if (!this.areaInfoGff) return;
    const field = this.areaInfoGff.RootNode.getFieldByLabel(label);
    if (!field) return;
    const next = Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
    field.setValue(next);
    this.markAreaInfoChanged();
  }

  private applyAreaBooleanField(label: string, value: boolean): void {
    if (!this.areaInfoGff) return;
    const field = this.areaInfoGff.RootNode.getFieldByLabel(label);
    if (!field) return;
    field.setValue(value ? 1 : 0);
    this.markAreaInfoChanged();
  }

  private hasAreaField(label: string): boolean {
    return !!this.areaInfoGff?.RootNode.getFieldByLabel(label);
  }

  updateAreaName(value: string): void {
    if (!this.areaInfoGff) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('Name')?.getCExoLocString?.()?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-name-edit',
      description: 'Edit area display name',
      redo: () => this.applyAreaName(value),
      undo: () => this.applyAreaName(previous),
    });
  }

  updateAreaTag(value: string): void {
    if (!this.areaInfoGff) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('Tag')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-tag-edit',
      description: 'Edit area tag',
      redo: () => this.applyAreaField('Tag', value),
      undo: () => this.applyAreaField('Tag', previous),
    });
  }

  updateAreaComments(value: string): void {
    if (!this.areaInfoGff) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('Comments')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-comments-edit',
      description: 'Edit area comments',
      redo: () => this.applyAreaField('Comments', value),
      undo: () => this.applyAreaField('Comments', previous),
    });
  }

  updateAreaAmbientSndDay(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('AmbientSndDay')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('AmbientSndDay')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-ambient-day-edit',
      description: 'Edit area ambient day sound',
      redo: () => this.applyAreaField('AmbientSndDay', value),
      undo: () => this.applyAreaField('AmbientSndDay', previous),
    });
  }

  updateAreaAmbientSndNight(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('AmbientSndNight')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('AmbientSndNight')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-ambient-night-edit',
      description: 'Edit area ambient night sound',
      redo: () => this.applyAreaField('AmbientSndNight', value),
      undo: () => this.applyAreaField('AmbientSndNight', previous),
    });
  }

  updateAreaMusicDay(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('MusicDay')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('MusicDay')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-music-day-edit',
      description: 'Edit area day music',
      redo: () => this.applyAreaField('MusicDay', value),
      undo: () => this.applyAreaField('MusicDay', previous),
    });
  }

  updateAreaMusicNight(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('MusicNight')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('MusicNight')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-music-night-edit',
      description: 'Edit area night music',
      redo: () => this.applyAreaField('MusicNight', value),
      undo: () => this.applyAreaField('MusicNight', previous),
    });
  }

  updateAreaMusicBattle(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('MusicBattle')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('MusicBattle')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-music-battle-edit',
      description: 'Edit area battle music',
      redo: () => this.applyAreaField('MusicBattle', value),
      undo: () => this.applyAreaField('MusicBattle', previous),
    });
  }

  updateAreaOnEnterScript(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('OnEnter')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('OnEnter')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-script-on-enter-edit',
      description: 'Edit area OnEnter script',
      redo: () => this.applyAreaField('OnEnter', value),
      undo: () => this.applyAreaField('OnEnter', previous),
    });
  }

  updateAreaOnExitScript(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('OnExit')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('OnExit')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-script-on-exit-edit',
      description: 'Edit area OnExit script',
      redo: () => this.applyAreaField('OnExit', value),
      undo: () => this.applyAreaField('OnExit', previous),
    });
  }

  updateAreaOnHeartbeatScript(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('OnHeartbeat')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('OnHeartbeat')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-script-on-heartbeat-edit',
      description: 'Edit area OnHeartbeat script',
      redo: () => this.applyAreaField('OnHeartbeat', value),
      undo: () => this.applyAreaField('OnHeartbeat', previous),
    });
  }

  updateAreaOnUserDefinedScript(value: string): void {
    if (!this.areaInfoGff || !this.hasAreaField('OnUserDefined')) return;
    const previous = String(this.areaInfoGff.RootNode.getFieldByLabel('OnUserDefined')?.getValue?.() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-script-on-user-defined-edit',
      description: 'Edit area OnUserDefined script',
      redo: () => this.applyAreaField('OnUserDefined', value),
      undo: () => this.applyAreaField('OnUserDefined', previous),
    });
  }

  updateAreaChanceRain(value: number): void {
    if (!this.areaInfoGff) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('ChanceRain')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-chance-rain-edit',
      description: 'Edit area rain chance',
      redo: () => this.applyAreaNumberField('ChanceRain', next, 0, 100),
      undo: () => this.applyAreaNumberField('ChanceRain', previous, 0, 100),
    });
  }

  updateAreaChanceSnow(value: number): void {
    if (!this.areaInfoGff) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('ChanceSnow')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-chance-snow-edit',
      description: 'Edit area snow chance',
      redo: () => this.applyAreaNumberField('ChanceSnow', next, 0, 100),
      undo: () => this.applyAreaNumberField('ChanceSnow', previous, 0, 100),
    });
  }

  updateAreaChanceLightning(value: number): void {
    if (!this.areaInfoGff) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('ChanceLightning')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-chance-lightning-edit',
      description: 'Edit area lightning chance',
      redo: () => this.applyAreaNumberField('ChanceLightning', next, 0, 100),
      undo: () => this.applyAreaNumberField('ChanceLightning', previous, 0, 100),
    });
  }

  updateAreaNoRest(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('NoRest')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('NoRest')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-no-rest-edit',
      description: 'Edit area no-rest flag',
      redo: () => this.applyAreaBooleanField('NoRest', value),
      undo: () => this.applyAreaBooleanField('NoRest', previous),
    });
  }

  updateAreaNoHangBack(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('NoHangBack')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('NoHangBack')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-no-hang-back-edit',
      description: 'Edit area no-hang-back flag',
      redo: () => this.applyAreaBooleanField('NoHangBack', value),
      undo: () => this.applyAreaBooleanField('NoHangBack', previous),
    });
  }

  updateAreaPlayerOnly(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('PlayerOnly')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('PlayerOnly')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-player-only-edit',
      description: 'Edit area player-only flag',
      redo: () => this.applyAreaBooleanField('PlayerOnly', value),
      undo: () => this.applyAreaBooleanField('PlayerOnly', previous),
    });
  }

  updateAreaUnescapable(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('Unescapable')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('Unescapable')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-unescapable-edit',
      description: 'Edit area unescapable flag',
      redo: () => this.applyAreaBooleanField('Unescapable', value),
      undo: () => this.applyAreaBooleanField('Unescapable', previous),
    });
  }

  updateAreaDayNightCycle(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('DayNightCycle')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('DayNightCycle')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-day-night-cycle-edit',
      description: 'Edit area day/night cycle flag',
      redo: () => this.applyAreaBooleanField('DayNightCycle', value),
      undo: () => this.applyAreaBooleanField('DayNightCycle', previous),
    });
  }

  updateAreaIsNight(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('IsNight')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('IsNight')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-is-night-edit',
      description: 'Edit area is-night flag',
      redo: () => this.applyAreaBooleanField('IsNight', value),
      undo: () => this.applyAreaBooleanField('IsNight', previous),
    });
  }

  updateAreaStealthXPEnabled(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('StealthXPEnabled')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('StealthXPEnabled')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-stealth-xp-enabled-edit',
      description: 'Edit area stealth XP enabled flag',
      redo: () => this.applyAreaBooleanField('StealthXPEnabled', value),
      undo: () => this.applyAreaBooleanField('StealthXPEnabled', previous),
    });
  }

  updateAreaStealthXPMax(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('StealthXPMax')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('StealthXPMax')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(65535, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-stealth-xp-max-edit',
      description: 'Edit area stealth XP max',
      redo: () => this.applyAreaNumberField('StealthXPMax', next, 0, 65535),
      undo: () => this.applyAreaNumberField('StealthXPMax', previous, 0, 65535),
    });
  }

  updateAreaStealthXPLoss(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('StealthXPLoss')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('StealthXPLoss')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(65535, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-stealth-xp-loss-edit',
      description: 'Edit area stealth XP loss',
      redo: () => this.applyAreaNumberField('StealthXPLoss', next, 0, 65535),
      undo: () => this.applyAreaNumberField('StealthXPLoss', previous, 0, 65535),
    });
  }

  updateAreaWindPower(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('WindPower')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('WindPower')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(3, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-wind-power-edit',
      description: 'Edit area wind power',
      redo: () => this.applyAreaNumberField('WindPower', next, 0, 3),
      undo: () => this.applyAreaNumberField('WindPower', previous, 0, 3),
    });
  }

  updateAreaShadowOpacity(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('ShadowOpacity')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('ShadowOpacity')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(100, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-shadow-opacity-edit',
      description: 'Edit area shadow opacity',
      redo: () => this.applyAreaNumberField('ShadowOpacity', next, 0, 100),
      undo: () => this.applyAreaNumberField('ShadowOpacity', previous, 0, 100),
    });
  }

  updateAreaSunFogOn(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunFogOn')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunFogOn')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-sun-fog-on-edit',
      description: 'Edit area sun fog enabled',
      redo: () => this.applyAreaBooleanField('SunFogOn', value),
      undo: () => this.applyAreaBooleanField('SunFogOn', previous),
    });
  }

  updateAreaMoonFogOn(value: boolean): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonFogOn')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonFogOn')?.getValue?.() || 0) > 0;
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-area-moon-fog-on-edit',
      description: 'Edit area moon fog enabled',
      redo: () => this.applyAreaBooleanField('MoonFogOn', value),
      undo: () => this.applyAreaBooleanField('MoonFogOn', previous),
    });
  }

  updateAreaSunFogNear(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunFogNear')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunFogNear')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(1000000, Number.isFinite(value) ? value : 0));
    if (Math.abs(previous - next) < 0.00001) return;

    this.undoManager.execute({
      type: 'sav-area-sun-fog-near-edit',
      description: 'Edit area sun fog near',
      redo: () => this.applyAreaFloatField('SunFogNear', next, 0, 1000000),
      undo: () => this.applyAreaFloatField('SunFogNear', previous, 0, 1000000),
    });
  }

  updateAreaSunFogFar(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunFogFar')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunFogFar')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(1000000, Number.isFinite(value) ? value : 0));
    if (Math.abs(previous - next) < 0.00001) return;

    this.undoManager.execute({
      type: 'sav-area-sun-fog-far-edit',
      description: 'Edit area sun fog far',
      redo: () => this.applyAreaFloatField('SunFogFar', next, 0, 1000000),
      undo: () => this.applyAreaFloatField('SunFogFar', previous, 0, 1000000),
    });
  }

  updateAreaMoonFogNear(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonFogNear')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonFogNear')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(1000000, Number.isFinite(value) ? value : 0));
    if (Math.abs(previous - next) < 0.00001) return;

    this.undoManager.execute({
      type: 'sav-area-moon-fog-near-edit',
      description: 'Edit area moon fog near',
      redo: () => this.applyAreaFloatField('MoonFogNear', next, 0, 1000000),
      undo: () => this.applyAreaFloatField('MoonFogNear', previous, 0, 1000000),
    });
  }

  updateAreaMoonFogFar(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonFogFar')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonFogFar')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(1000000, Number.isFinite(value) ? value : 0));
    if (Math.abs(previous - next) < 0.00001) return;

    this.undoManager.execute({
      type: 'sav-area-moon-fog-far-edit',
      description: 'Edit area moon fog far',
      redo: () => this.applyAreaFloatField('MoonFogFar', next, 0, 1000000),
      undo: () => this.applyAreaFloatField('MoonFogFar', previous, 0, 1000000),
    });
  }

  updateAreaSunFogColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunFogColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunFogColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-sun-fog-color-edit',
      description: 'Edit area sun fog color',
      redo: () => this.applyAreaNumberField('SunFogColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('SunFogColor', previous, 0, 4294967295),
    });
  }

  updateAreaMoonFogColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonFogColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonFogColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-moon-fog-color-edit',
      description: 'Edit area moon fog color',
      redo: () => this.applyAreaNumberField('MoonFogColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('MoonFogColor', previous, 0, 4294967295),
    });
  }

  updateAreaSunAmbientColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunAmbientColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunAmbientColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-sun-ambient-color-edit',
      description: 'Edit area sun ambient color',
      redo: () => this.applyAreaNumberField('SunAmbientColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('SunAmbientColor', previous, 0, 4294967295),
    });
  }

  updateAreaSunDiffuseColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('SunDiffuseColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('SunDiffuseColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-sun-diffuse-color-edit',
      description: 'Edit area sun diffuse color',
      redo: () => this.applyAreaNumberField('SunDiffuseColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('SunDiffuseColor', previous, 0, 4294967295),
    });
  }

  updateAreaMoonAmbientColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonAmbientColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonAmbientColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-moon-ambient-color-edit',
      description: 'Edit area moon ambient color',
      redo: () => this.applyAreaNumberField('MoonAmbientColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('MoonAmbientColor', previous, 0, 4294967295),
    });
  }

  updateAreaMoonDiffuseColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('MoonDiffuseColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('MoonDiffuseColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-moon-diffuse-color-edit',
      description: 'Edit area moon diffuse color',
      redo: () => this.applyAreaNumberField('MoonDiffuseColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('MoonDiffuseColor', previous, 0, 4294967295),
    });
  }

  updateAreaDynAmbientColor(value: number): void {
    if (!this.areaInfoGff || !this.hasAreaField('DynAmbientColor')) return;
    const previous = Number(this.areaInfoGff.RootNode.getFieldByLabel('DynAmbientColor')?.getValue?.() || 0);
    const next = Math.max(0, Math.min(4294967295, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-area-dyn-ambient-color-edit',
      description: 'Edit area dynamic ambient color',
      redo: () => this.applyAreaNumberField('DynAmbientColor', next, 0, 4294967295),
      undo: () => this.applyAreaNumberField('DynAmbientColor', previous, 0, 4294967295),
    });
  }

  updateModuleEntryArea(value: string): void {
    if (!this.moduleInfoGff) return;
    const field = this.moduleInfoGff.RootNode.getFieldByLabel('Mod_Entry_Area');
    if (!field) return;
    const previous = String(field.getValue() || '');
    if (previous === value) return;

    this.undoManager.execute({
      type: 'sav-module-entry-edit',
      description: 'Edit module entry area',
      redo: () => this.applyModuleInfoField('Mod_Entry_Area', value),
      undo: () => this.applyModuleInfoField('Mod_Entry_Area', previous),
    });
  }

  updateModuleDawnHour(value: number): void {
    if (!this.moduleInfoGff) return;
    const field = this.moduleInfoGff.RootNode.getFieldByLabel('Mod_DawnHour');
    if (!field) return;
    const previous = Number(field.getValue() || 0);
    const next = Math.max(0, Math.min(23, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-module-dawn-edit',
      description: 'Edit dawn hour',
      redo: () => this.applyModuleInfoField('Mod_DawnHour', next),
      undo: () => this.applyModuleInfoField('Mod_DawnHour', previous),
    });
  }

  updateModuleDuskHour(value: number): void {
    if (!this.moduleInfoGff) return;
    const field = this.moduleInfoGff.RootNode.getFieldByLabel('Mod_DuskHour');
    if (!field) return;
    const previous = Number(field.getValue() || 0);
    const next = Math.max(0, Math.min(23, Number.isFinite(value) ? Math.round(value) : 0));
    if (previous === next) return;

    this.undoManager.execute({
      type: 'sav-module-dusk-edit',
      description: 'Edit dusk hour',
      redo: () => this.applyModuleInfoField('Mod_DuskHour', next),
      undo: () => this.applyModuleInfoField('Mod_DuskHour', previous),
    });
  }

  getModuleDawnHour(): number {
    return Number(this.moduleInfoGff?.RootNode.getFieldByLabel('Mod_DawnHour')?.getValue() || 0);
  }

  getModuleDuskHour(): number {
    return Number(this.moduleInfoGff?.RootNode.getFieldByLabel('Mod_DuskHour')?.getValue() || 0);
  }

  getAreaName(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('Name')?.getCExoLocString?.()?.getValue?.() || this.saveMeta?.areaName || '');
  }

  getAreaTag(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('Tag')?.getValue?.() || '');
  }

  getAreaComments(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('Comments')?.getValue?.() || '');
  }

  getAreaAmbientSndDay(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('AmbientSndDay')?.getValue?.() || '');
  }

  getAreaAmbientSndNight(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('AmbientSndNight')?.getValue?.() || '');
  }

  getAreaMusicDay(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('MusicDay')?.getValue?.() || '');
  }

  getAreaMusicNight(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('MusicNight')?.getValue?.() || '');
  }

  getAreaMusicBattle(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('MusicBattle')?.getValue?.() || '');
  }

  getAreaOnEnterScript(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('OnEnter')?.getValue?.() || '');
  }

  getAreaOnExitScript(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('OnExit')?.getValue?.() || '');
  }

  getAreaOnHeartbeatScript(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('OnHeartbeat')?.getValue?.() || '');
  }

  getAreaOnUserDefinedScript(): string {
    return String(this.areaInfoGff?.RootNode.getFieldByLabel('OnUserDefined')?.getValue?.() || '');
  }

  getAreaChanceRain(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('ChanceRain')?.getValue?.() || 0);
  }

  getAreaChanceSnow(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('ChanceSnow')?.getValue?.() || 0);
  }

  getAreaChanceLightning(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('ChanceLightning')?.getValue?.() || 0);
  }

  getAreaNoRest(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('NoRest')?.getValue?.() || 0) > 0;
  }

  getAreaNoHangBack(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('NoHangBack')?.getValue?.() || 0) > 0;
  }

  getAreaPlayerOnly(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('PlayerOnly')?.getValue?.() || 0) > 0;
  }

  getAreaUnescapable(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('Unescapable')?.getValue?.() || 0) > 0;
  }

  getAreaDayNightCycle(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('DayNightCycle')?.getValue?.() || 0) > 0;
  }

  getAreaIsNight(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('IsNight')?.getValue?.() || 0) > 0;
  }

  getAreaStealthXPEnabled(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('StealthXPEnabled')?.getValue?.() || 0) > 0;
  }

  getAreaStealthXPMax(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('StealthXPMax')?.getValue?.() || 0);
  }

  getAreaStealthXPLoss(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('StealthXPLoss')?.getValue?.() || 0);
  }

  getAreaWindPower(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('WindPower')?.getValue?.() || 0);
  }

  getAreaShadowOpacity(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('ShadowOpacity')?.getValue?.() || 0);
  }

  getAreaSunFogOn(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunFogOn')?.getValue?.() || 0) > 0;
  }

  getAreaMoonFogOn(): boolean {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonFogOn')?.getValue?.() || 0) > 0;
  }

  getAreaSunFogNear(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunFogNear')?.getValue?.() || 0);
  }

  getAreaSunFogFar(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunFogFar')?.getValue?.() || 0);
  }

  getAreaMoonFogNear(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonFogNear')?.getValue?.() || 0);
  }

  getAreaMoonFogFar(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonFogFar')?.getValue?.() || 0);
  }

  getAreaSunFogColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunFogColor')?.getValue?.() || 0);
  }

  getAreaMoonFogColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonFogColor')?.getValue?.() || 0);
  }

  getAreaSunAmbientColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunAmbientColor')?.getValue?.() || 0);
  }

  getAreaSunDiffuseColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('SunDiffuseColor')?.getValue?.() || 0);
  }

  getAreaMoonAmbientColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonAmbientColor')?.getValue?.() || 0);
  }

  getAreaMoonDiffuseColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('MoonDiffuseColor')?.getValue?.() || 0);
  }

  getAreaDynAmbientColor(): number {
    return Number(this.areaInfoGff?.RootNode.getFieldByLabel('DynAmbientColor')?.getValue?.() || 0);
  }

  canEditAreaName(): boolean {
    return !!this.areaInfoGff;
  }

  canEditModuleSettings(): boolean {
    return !!this.moduleInfoGff;
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

  private applyGlobalName(kind: 'boolean' | 'number' | 'string', index: number, value: string): void {
    if (!this.globalVariables || !this.globalVariableGff) return;

    const root = this.globalVariableGff.RootNode;
    const labels = kind === 'boolean'
      ? ['CatBoolean', 'GlobalBooleans', 'Booleans', 'BooleanVars']
      : kind === 'number'
        ? ['CatNumber', 'GlobalNumbers', 'Numbers', 'NumberVars']
        : ['CatString', 'GlobalStrings', 'Strings', 'StringVars'];
    const categories = this.getStructListByLabels(root, labels);
    categories[index]?.getFieldByLabel('Name')?.setValue(value);

    if (kind === 'boolean' && this.globalVariables.booleans[index]) {
      this.globalVariables.booleans[index].name = value;
    }
    if (kind === 'number' && this.globalVariables.numbers[index]) {
      this.globalVariables.numbers[index].name = value;
    }
    if (kind === 'string' && this.globalVariables.strings[index]) {
      this.globalVariables.strings[index].name = value;
    }

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

  updateGlobalBooleanName(index: number, value: string): void {
    if (!this.globalVariables) return;
    const entry = this.globalVariables.booleans[index];
    if (!entry) return;
    const previous = entry.name;
    if (previous === value) return;
    this.undoManager.execute({
      type: 'sav-global-bool-name-edit',
      description: `Rename ${previous || 'Boolean'}`,
      redo: () => this.applyGlobalName('boolean', index, value),
      undo: () => this.applyGlobalName('boolean', index, previous),
    });
  }

  updateGlobalNumberName(index: number, value: string): void {
    if (!this.globalVariables) return;
    const entry = this.globalVariables.numbers[index];
    if (!entry) return;
    const previous = entry.name;
    if (previous === value) return;
    this.undoManager.execute({
      type: 'sav-global-number-name-edit',
      description: `Rename ${previous || 'Number'}`,
      redo: () => this.applyGlobalName('number', index, value),
      undo: () => this.applyGlobalName('number', index, previous),
    });
  }

  updateGlobalStringName(index: number, value: string): void {
    if (!this.globalVariables) return;
    const entry = this.globalVariables.strings[index];
    if (!entry) return;
    const previous = entry.name;
    if (previous === value) return;
    this.undoManager.execute({
      type: 'sav-global-string-name-edit',
      description: `Rename ${previous || 'String'}`,
      redo: () => this.applyGlobalName('string', index, value),
      undo: () => this.applyGlobalName('string', index, previous),
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
