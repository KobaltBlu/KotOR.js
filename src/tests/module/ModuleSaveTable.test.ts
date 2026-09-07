/**
 * modulesave.2da helpers — IncludeModuleInSave / AutoSaveOnEnteringModule / cleanup.
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: new Map() },
    TLKManager: { GetStringById: () => ({ Value: 'Test Area' }) },
    iniConfig: { getProperty: () => '1' },
    module: undefined,
  },
}));

jest.mock('@/utility/GameFileSystem', () => ({
  GameFileSystem: {
    exists: jest.fn(async () => false),
    unlink: jest.fn(async () => undefined),
  },
}));

import { GameState } from '@/GameState';
import { GameFileSystem } from '@/utility/GameFileSystem';
import { ModuleSaveTable, ModuleAutoSaveOnEnter } from '@/engine/ModuleSaveTable';

function makeTable(rows: Record<string, any>) {
  return { rows } as any;
}

describe('ModuleSaveTable', () => {
  beforeEach(() => {
    ModuleSaveTable.clearAutoSaveTimer();
    GameState.TwoDAManager.datatables = new Map();
    GameState.iniConfig = { getProperty: () => '1' } as any;
    (GameFileSystem.exists as any).mockResolvedValue(false);
    (GameFileSystem.unlink as any).mockClear();
  });

  it('includeInSave defaults true when table or row missing', () => {
    expect(ModuleSaveTable.includeInSave('missing')).toBe(true);
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({}));
    expect(ModuleSaveTable.includeInSave('missing')).toBe(true);
  });

  it('includeInSave respects IncludeInSave column (case-insensitive)', () => {
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { ModuleName: 'manm26mg', IncludeInSave: '0', AutoSaveOnEnter: 'no' },
      1: { modulename: 'end_m01aa', includeinsave: '1', autosaveonenter: 'force' },
    }));
    expect(ModuleSaveTable.includeInSave('manm26mg')).toBe(false);
    expect(ModuleSaveTable.includeInSave('END_M01AA')).toBe(true);
  });

  it('shouldAutoSaveOnEnteringModule: force / no / yes+timer / missing', () => {
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { modulename: 'a', includeinsave: '1', autosaveonenter: 'force' },
      1: { modulename: 'b', includeinsave: '1', autosaveonenter: 'no' },
      2: { modulename: 'c', includeinsave: '1', autosaveonenter: 'yes' },
    }));

    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('a')).toBe(true);
    expect(ModuleSaveTable.autoSaveDue).toBe(false);

    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('b')).toBe(false);

    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('c')).toBe(false);
    ModuleSaveTable.autoSaveDue = true;
    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('c')).toBe(true);
    expect(ModuleSaveTable.autoSaveDue).toBe(false);

    ModuleSaveTable.autoSaveDue = true;
    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('unknown')).toBe(true);
    expect(ModuleSaveTable.autoSaveDue).toBe(false);
  });

  it('shouldAutoSaveOnEnteringModule yes honors INI AutoSave off', () => {
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { modulename: 'c', includeinsave: '1', autosaveonenter: 'yes' },
    }));
    GameState.iniConfig = { getProperty: () => '0' } as any;
    ModuleSaveTable.autoSaveDue = true;
    expect(ModuleSaveTable.shouldAutoSaveOnEnteringModule('c')).toBe(false);
    expect(ModuleSaveTable.autoSaveDue).toBe(true);
  });

  it('updateAutoSaveTimer marks due after interval', () => {
    expect(ModuleSaveTable.updateAutoSaveTimer(0)).toBe(false);
    expect(ModuleSaveTable.updateAutoSaveTimer(ModuleSaveTable.AUTO_SAVE_INTERVAL_MS / 1000)).toBe(true);
    expect(ModuleSaveTable.autoSaveDue).toBe(true);
  });

  it('getAutoSaveOnEnter parses engine values', () => {
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { modulename: 'x', autosaveonenter: 'FORCE' },
    }));
    expect(ModuleSaveTable.getAutoSaveOnEnter('x')).toBe(ModuleAutoSaveOnEnter.Force);
  });

  it('getAreaNameForModule uses TLK from areaname STRREF', () => {
    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { modulename: 'end_m01aa', areaname: '10221' },
    }));
    expect(ModuleSaveTable.getAreaNameForModule('end_m01aa')).toBe('Test Area');
  });

  it('doModuleEnterSaveCleanup unlinks matching SaveGroup modules', async () => {
    (GameFileSystem.exists as any).mockResolvedValue(true);

    GameState.TwoDAManager.datatables.set('modulesave', makeTable({
      0: { modulename: 'dest', deletesavegrouponenter: '3', savegroup: '1' },
      1: { modulename: 'old_a', savegroup: '3' },
      2: { modulename: 'old_b', savegroup: '3' },
      3: { modulename: 'keep', savegroup: '2' },
    }));

    await ModuleSaveTable.doModuleEnterSaveCleanup('dest');
    expect(GameFileSystem.unlink).toHaveBeenCalledTimes(2);
    const paths = (GameFileSystem.unlink as any).mock.calls.map((c: any[]) => String(c[0]).replace(/\\/g, '/'));
    expect(paths.some((p: string) => p.endsWith('gameinprogress/old_a.sav'))).toBe(true);
    expect(paths.some((p: string) => p.endsWith('gameinprogress/old_b.sav'))).toBe(true);
  });
});
