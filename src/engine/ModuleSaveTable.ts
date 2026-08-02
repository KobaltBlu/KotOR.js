import * as path from 'path';
import { GameState } from '@/GameState';
import { CurrentGame } from '@/engine/CurrentGame';
import { GameFileSystem } from '@/utility/GameFileSystem';
import type { TwoDAObject } from '@/resource/TwoDAObject';

/**
 * Retail modulesave.2da AutoSaveOnEnter column values.
 * TSL AutoSaveOnEnteringModule @ 007bdf50 / K1 StartNewModule path.
 */
export enum ModuleAutoSaveOnEnter {
  No = 'no',
  Yes = 'yes',
  Force = 'force',
}

/**
 * modulesave.2da helpers — IncludeModuleInSave, AutoSaveOnEnteringModule,
 * DoModuleEnterSaveCleanup (TSL @ 007bddb0 / 007bdf50 / 007bfb10).
 */
export class ModuleSaveTable {

  /** Retail UpdateAutoSaveTimer threshold 0xdbba1 ms (~15 min). */
  static readonly AUTO_SAVE_INTERVAL_MS = 0xdbba1;

  /** Accumulated play time toward next timed autosave (ms). */
  static autoSaveAccumMs = 0;
  /** Set when the 15-minute timer elapses; consumed by AutoSaveOnEnter=yes. */
  static autoSaveDue = false;

  static getTable(): TwoDAObject | undefined {
    return GameState.TwoDAManager?.datatables?.get('modulesave');
  }

  /** Case-insensitive cell read (binary 2DA columns may be mixed-case). */
  static cell(row: any, column: string): any {
    if(!row || !column) return undefined;
    if(Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const lower = column.toLowerCase();
    for(const key of Object.keys(row)){
      if(key.toLowerCase() === lower) return row[key];
    }
    return undefined;
  }

  static isBlank(value: any): boolean {
    return value === null || value === undefined || value === '' || value === '****';
  }

  static getRow(moduleName: string): any | undefined {
    const table = ModuleSaveTable.getTable();
    if(!table) return undefined;
    const name = (moduleName || '').toLowerCase();
    if(!name) return undefined;
    for(const key of Object.keys(table.rows)){
      const row = table.rows[key];
      const modName = ModuleSaveTable.cell(row, 'modulename');
      if(!ModuleSaveTable.isBlank(modName) && String(modName).toLowerCase() === name){
        return row;
      }
    }
    return undefined;
  }

  /**
   * Retail IncludeModuleInSave — default true when table/row missing.
   */
  static includeInSave(moduleName: string): boolean {
    const table = ModuleSaveTable.getTable();
    if(!table) return true;
    const row = ModuleSaveTable.getRow(moduleName);
    if(!row) return true;
    const raw = ModuleSaveTable.cell(row, 'includeinsave');
    if(ModuleSaveTable.isBlank(raw)) return true;
    const n = parseInt(String(raw), 10);
    if(Number.isNaN(n)) return true;
    return n !== 0;
  }

  static getAutoSaveOnEnter(moduleName: string): ModuleAutoSaveOnEnter | undefined {
    const row = ModuleSaveTable.getRow(moduleName);
    if(!row) return undefined;
    const raw = ModuleSaveTable.cell(row, 'autosaveonenter');
    if(ModuleSaveTable.isBlank(raw)) return undefined;
    const s = String(raw).toLowerCase();
    if(s === ModuleAutoSaveOnEnter.Force) return ModuleAutoSaveOnEnter.Force;
    if(s === ModuleAutoSaveOnEnter.No) return ModuleAutoSaveOnEnter.No;
    if(s === ModuleAutoSaveOnEnter.Yes) return ModuleAutoSaveOnEnter.Yes;
    return undefined;
  }

  /** AreaName STRREF for PC autosave NFO (DoPCAutosave). -1 if unset. */
  static getAreaNameStrRef(moduleName: string): number {
    const row = ModuleSaveTable.getRow(moduleName);
    if(!row) return -1;
    const raw = ModuleSaveTable.cell(row, 'areaname');
    if(ModuleSaveTable.isBlank(raw)) return -1;
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? -1 : n;
  }

  static getDeleteSaveGroupOnEnter(moduleName: string): number | null {
    const row = ModuleSaveTable.getRow(moduleName);
    if(!row) return null;
    const raw = ModuleSaveTable.cell(row, 'deletesavegrouponenter');
    if(ModuleSaveTable.isBlank(raw)) return null;
    const n = parseInt(String(raw), 10);
    return Number.isNaN(n) ? null : n;
  }

  static isIniAutoSaveEnabled(): boolean {
    if(!GameState.iniConfig) return true;
    const raw = GameState.iniConfig.getProperty('Game Options.AutoSave');
    if(raw === undefined || raw === null || raw === '') return true;
    return parseInt(String(raw), 10) !== 0;
  }

  static clearAutoSaveTimer(): void {
    ModuleSaveTable.autoSaveAccumMs = 0;
    ModuleSaveTable.autoSaveDue = false;
  }

  /**
   * Retail UpdateAutoSaveTimer @ 007bce70 — accumulate wall time; mark due at ~15 min.
   * @param deltaSeconds THREE.Clock delta in seconds
   */
  static updateAutoSaveTimer(deltaSeconds: number): boolean {
    if(ModuleSaveTable.autoSaveDue) return true;
    if(!(deltaSeconds > 0)) return false;
    ModuleSaveTable.autoSaveAccumMs += deltaSeconds * 1000;
    if(ModuleSaveTable.autoSaveAccumMs >= ModuleSaveTable.AUTO_SAVE_INTERVAL_MS){
      ModuleSaveTable.autoSaveAccumMs = 0;
      ModuleSaveTable.autoSaveDue = true;
      return true;
    }
    return false;
  }

  /**
   * Retail AutoSaveOnEnteringModule @ 007bdf50.
   * force → always; no → never; yes → only if timer due and INI AutoSave on;
   * missing table/row/column → autosave (and clear timer).
   */
  static shouldAutoSaveOnEnteringModule(moduleName: string): boolean {
    const table = ModuleSaveTable.getTable();
    if(!table){
      ModuleSaveTable.clearAutoSaveTimer();
      return true;
    }

    const mode = ModuleSaveTable.getAutoSaveOnEnter(moduleName);
    if(mode === undefined){
      // GetCExoStringEntry failed / blank → clear timer, autosave
      ModuleSaveTable.clearAutoSaveTimer();
      return true;
    }

    let should = false;
    if(mode === ModuleAutoSaveOnEnter.Force){
      should = true;
    }else if(mode === ModuleAutoSaveOnEnter.No){
      should = false;
    }else{
      // yes — require pending timer, then honor INI AutoSave bit
      if(!ModuleSaveTable.autoSaveDue) return false;
      should = ModuleSaveTable.isIniAutoSaveEnabled();
    }

    if(should){
      ModuleSaveTable.clearAutoSaveTimer();
    }
    return should;
  }

  /**
   * Retail DoModuleEnterSaveCleanup @ 007bfb10 —
   * delete GAMEINPROGRESS .sav for every module whose SaveGroup matches
   * the destination's DeleteSaveGroupOnEnter.
   */
  static async doModuleEnterSaveCleanup(moduleName: string): Promise<void> {
    const deleteGroup = ModuleSaveTable.getDeleteSaveGroupOnEnter(moduleName);
    if(deleteGroup === null) return;

    const table = ModuleSaveTable.getTable();
    if(!table) return;

    for(const key of Object.keys(table.rows)){
      const row = table.rows[key];
      const sgRaw = ModuleSaveTable.cell(row, 'savegroup');
      if(ModuleSaveTable.isBlank(sgRaw)) continue;
      const sg = parseInt(String(sgRaw), 10);
      if(Number.isNaN(sg) || sg !== deleteGroup) continue;

      const otherName = ModuleSaveTable.cell(row, 'modulename');
      if(ModuleSaveTable.isBlank(otherName)) continue;

      const savPath = path.join(
        CurrentGame.gameinprogress_dir,
        String(otherName).toLowerCase() + '.sav'
      );
      try{
        if(await GameFileSystem.exists(savPath)){
          await GameFileSystem.unlink(savPath);
        }
      }catch(e){
        console.warn('ModuleSaveTable.doModuleEnterSaveCleanup', savPath, e);
      }
    }
  }

  /** Resolve display AREANAME for a module (modulesave STRREF, else live area). */
  static getAreaNameForModule(moduleName: string): string {
    const strRef = ModuleSaveTable.getAreaNameStrRef(moduleName);
    if(strRef >= 0){
      const tlk = GameState.TLKManager?.GetStringById?.(strRef);
      if(tlk?.Value) return tlk.Value;
    }
    if(GameState.module && (GameState.module.filename || '').toLowerCase() === (moduleName || '').toLowerCase()){
      try{
        return GameState.module.area?.areaName?.getValue?.() || '';
      }catch(e){
        return '';
      }
    }
    return '';
  }

}
