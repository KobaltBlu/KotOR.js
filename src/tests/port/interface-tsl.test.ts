import { describe, expect, test, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import * as THREE from 'three';

/**
 * Evaluate the actual class with isolated engine dependencies. These tests use no
 * game assets, WebGL context, or application singleton initialization. They test
 * class methods rather than a duplicated implementation of the ported behavior.
 */
function loadClass(path: string, name: string, dependencies: Record<string, any> = {}): any {
  const filename = resolve(__dirname, '../../', path);
  const source = readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  expect((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
  const exports: Record<string, any> = {};
  const requireDependency = (id: string) => {
    if(id === 'three') return THREE;
    return dependencies[id] || {};
  };
  new Function('require', 'exports', result.outputText)(requireDependency, exports);
  return exports[name];
}

test('all ported TSL and shared GUI files parse without merge markers', () => {
  const paths = [
    'game/tsl/gui/GUIJournalItem.ts', 'game/tsl/gui/GUISaveGameItem.ts',
    'game/tsl/menu/InGameDialog.ts', 'game/tsl/menu/MainMusic.ts',
    'game/tsl/menu/MenuEquipment.ts', 'game/tsl/menu/MenuJournal.ts',
    'game/tsl/menu/MenuPartySelection.ts', 'game/tsl/menu/MenuQuestItem.ts',
    'game/tsl/menu/MenuSaveLoad.ts', 'game/tsl/menu/MenuSaveName.ts',
    'game/tsl/menu/MenuStore.ts', 'game/tsl/menu/MenuTop.ts', 'gui/GUICheckBox.ts',
  ];
  for(const path of paths){
    const source = readFileSync(resolve(__dirname, '../../', path), 'utf8');
    expect(source).not.toMatch(/^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)/m);
    const result = ts.transpileModule(source, {
      fileName: path,
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    expect((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)).toEqual([]);
  }
});

class Save {
  static saves: Save[] = [];
  isNewSave = false;
  constructor(public PCNAME = '', private kind = 'manual') {}
  getIsQuickSave(){ return this.kind === 'quick'; }
  getIsAutoSave(){ return this.kind === 'auto'; }
}
class NewSave extends Save {
  constructor(){ super(); this.isNewSave = true; }
}

function saveMenu(){
  const Menu = loadClass('game/tsl/menu/MenuSaveLoad.ts', 'MenuSaveLoad', {
    '@/game/kotor/KOTOR': { MenuSaveLoad: class {}, NewSaveItem: NewSave },
    '@/engine/SaveGame': { SaveGame: Save },
    '@/enums/gui/MenuSaveLoadMode': { MenuSaveLoadMode: { SAVEGAME: 0, LOADGAME: 1 } },
  });
  return new Menu();
}

describe('TSL save filtering', () => {
  test('keeps the new-save slot while filtering manual saves by character', () => {
    const alice = new Save('Alice');
    const bob = new Save('Bob');
    Save.saves = [alice, bob, new Save('Alice', 'quick')];
    const originalOrder = Save.saves.slice();
    const menu = saveMenu();
    menu.mode = 0;
    const saves = menu.getSaveGames();
    expect(saves[0]).toBeInstanceOf(NewSave);
    expect(saves.slice(1)).toEqual([bob]);
    expect(Save.saves).toEqual(originalOrder);
    expect(menu.filters).toEqual(['Bob', 'Alice']);
  });

  test('keeps quicksave and autosave visible across character filters', () => {
    const auto = new Save('Other', 'auto');
    const quick = new Save('Other', 'quick');
    const alice = new Save('Alice');
    const bob = new Save('Bob');
    Save.saves = [alice, auto, bob, quick];
    const menu = saveMenu();
    menu.mode = 1;
    menu.cFilterIndex = 1;
    expect(menu.getSaveGames()).toEqual([auto, quick, alice]);
  });

  test('clamps stale filter indices and supports an empty save collection', () => {
    Save.saves = [new Save('Alice')];
    const menu = saveMenu();
    menu.mode = 1;
    menu.cFilterIndex = 50;
    expect(menu.getSaveGames()).toEqual(Save.saves);
    expect(menu.cFilterIndex).toBe(0);
    Save.saves = [];
    expect(menu.getSaveGames()).toEqual([]);
    expect(menu.filters).toEqual([]);
  });
});

describe('TSL save row titles', () => {
  const Row = loadClass('game/tsl/gui/GUISaveGameItem.ts', 'GUISaveGameItem', {
    '@/gui': { GUIProtoItem: class {} },
    '@/GameState': { GameState: { TLKManager: { GetStringById: (id: number) => ({ Value: `localized-${id}` }) } } },
  });
  const title = (node: any) => Row.prototype.getNodeName.call({ node });
  const manual = (timestamp: any) => ({
    TIMESTAMP: timestamp, getFullName: () => '004: Test save',
    getIsAutoSave: () => false, getIsQuickSave: () => false,
  });

  test('does not read a timestamp on the new-save placeholder', () => {
    expect(title({ isNewSave: true, getFullName: () => 'New save' })).toBe('New save');
  });
  test('handles absent and invalid timestamps', () => {
    expect(title(manual(undefined))).toBe('004: Test save');
    expect(title(manual(new Date(NaN)))).toBe('004: Test save');
  });
  test('preserves localized special names and pads valid timestamps', () => {
    expect(title({ ...manual(undefined), getIsAutoSave: () => true })).toBe('localized-1593');
    expect(title({ ...manual(undefined), getIsQuickSave: () => true })).toBe('localized-47991');
    expect(title(manual(new Date(2026, 0, 2, 3, 4, 5)))).toBe('004: Test save\n03:04:05 - 02, 01, 2026');
  });
});

describe('shared GUI invariants retained from upstream', () => {
  test('custom row body height is not halved or padded twice', () => {
    const Row = loadClass('gui/GUIProtoItem.ts', 'GUIProtoItem', {
      '@/gui/GUIControl': { GUIControl: class {} },
      '@/enums/gui/GUIControlTypeMask': { GUIControlTypeMask: { GUIButton: 1 } },
    });
    const row = {
      extent: { height: 20 }, objectType: 0, list: { padding: 7 },
      text: { geometry: { computeBoundingBox(){}, boundingBox: { getSize(v: any){ v.y = 80; } } } },
    };
    expect(Row.prototype.getItemHeight.call(row)).toBe(80);
  });

  test('variable-height list content adds padding once per pitch', () => {
    const List = loadClass('gui/GUIListBox.ts', 'GUIListBox', {
      '@/gui/GUIControl': { GUIControl: class {} },
    });
    const list = { children: [20, 80, 30], padding: 4, getItemHeight: (h: number) => h };
    expect(List.prototype.getContentHeight.call(list)).toBe(146);
  });

  test('selected checkboxes retain highlight and pulse after mouse-out', () => {
    const CheckBox = loadClass('gui/GUICheckBox.ts', 'GUICheckBox', {
      '@/gui/GUIControl': { GUIControl: class {} },
    });
    const fill = () => ({ fill: { mesh: { visible: true, scale: { set(){} } } } });
    const checkbox: any = {
      selected: true, hover: true, value: 1, pulsing: false,
      border: fill(), borderSelected: fill(), highlight: fill(), highlightSelected: fill(),
      getCBScale: () => 24, text: { material: { uniforms: { diffuse: { value: { set(){} } } } } },
      defaultColor: {}, processEventListener(){},
    };
    checkbox.updateCBVisualState = () => CheckBox.prototype.updateCBVisualState.call(checkbox);
    CheckBox.prototype.onHoverOut.call(checkbox);
    expect(checkbox.hover).toBe(false);
    expect(checkbox.pulsing).toBe(true);
    expect(checkbox.highlightSelected.fill.mesh.visible).toBe(true);
    expect(checkbox.borderSelected.fill.mesh.visible).toBe(false);
  });
});

describe('TSL party preview asynchronous lifetime', () => {
  function setup(){
    class Creature {
      destroy = jest.fn();
      position = { set(){} };
      model = { rotation: { z: 0 } };
    }
    const callbacks: Array<(creature: Creature) => void> = [];
    class Parent {
      selectedNPC = 2;
      bVisible = true;
      updateSelection(){}
      isAvailable(){ return true; }
      hide(){ this.bVisible = false; }
    }
    const Menu = loadClass('game/tsl/menu/MenuPartySelection.ts', 'MenuPartySelection', {
      '@/game/kotor/KOTOR': { MenuPartySelection: Parent },
      '@/module': { ModuleCreature: Creature },
      '@/GameState': { GameState: { PartyManager: { LoadPartyMemberCreature: (_id: number, callback: (c: Creature) => void) => callbacks.push(callback) } } },
    });
    const menu = new Menu();
    menu.LBL_3D_VIEW = { group: { creatures: { add: jest.fn() } } };
    return { menu, Creature, callbacks };
  }

  test('rejects an older response even when both requests target the same NPC', () => {
    const { menu, Creature, callbacks } = setup();
    menu.updateSelection();
    menu.updateSelection();
    const stale = new Creature();
    const current = new Creature();
    callbacks[1](current);
    callbacks[0](stale);
    expect(menu.char).toBe(current);
    expect(stale.destroy).toHaveBeenCalledTimes(1);
    expect(current.destroy).not.toHaveBeenCalled();
  });

  test('hiding invalidates pending loads and disposes the current preview', () => {
    const { menu, Creature, callbacks } = setup();
    menu.updateSelection();
    menu.hide();
    const stale = new Creature();
    callbacks[0](stale);
    expect(stale.destroy).toHaveBeenCalledTimes(1);
    expect(menu.char).toBeUndefined();
  });
});
