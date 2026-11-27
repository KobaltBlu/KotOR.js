import { describe, expect, test, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import * as THREE from 'three';

// Load the actual implementation with small engine-boundary doubles. Importing the
// full GameState graph would initialize browser, renderer and game-data services.
// This tests behavior, not type compatibility; the port also runs project tsc.
class Field {
  children: Struct[] = [];
  value: any;
  constructor(public type: any, public label: string, value?: any) { this.value = value; }
  setValue(value: any) { this.value = value; return this; }
  setData(value: any) { this.value = value; return this; }
  setOrientation(value: any) { this.value = value; return this; }
  setVector(value: any) { this.value = value; return this; }
  getValue() { return this.value; }
  getVoid() { return this.value; }
  addChildStruct(child: Struct) { this.children.push(child); return child; }
}
class Struct {
  fields = new Map<string, Field>();
  constructor(public type = 0) {}
  addField(field: Field) { this.fields.set(field.label, field); return field; }
  getFieldByLabel(label: string) { return this.fields.get(label); }
}
class GFF {
  RootNode = new Struct();
  FileType = '';
}
class LocString {
  strings: string[] = [];
  constructor(public resref = -1) {
    if (typeof resref !== 'number') throw new TypeError('String reference must be numeric');
  }
  addSubString(value: string) { this.strings.push(value); return this; }
}
const triggerTypes = { GENERIC: 0, TRANSITION: 1, TRAP: 2 };
const dataTypes = { BYTE: 0, DWORD: 4, INT: 5, FLOAT: 8, CEXOLOCSTRING: 12, VOID: 13, STRUCT: 14, LIST: 15 };

function loadWorldClass(name: string, gameState: any = {}): any {
  const source = readFileSync(join(__dirname, '..', 'module', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: `${name}.ts`,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  expect(errors).toEqual([]);
  const boundaries: Record<string, any> = {
    three: THREE,
    '@/GameState': { GameState: gameState },
    '@/module/ModuleObject': { ModuleObject: class {} },
    '@/module/ModuleItem': { ModuleItem: class {} },
    '@/resource/GFFField': { GFFField: Field },
    '@/resource/GFFStruct': { GFFStruct: Struct },
    '@/resource/GFFObject': { GFFObject: GFF },
    '@/resource/CExoLocString': { CExoLocString: LocString },
    '@/nwscript/NWScriptInstance': { NWScriptInstance: class {} },
    '@/enums/module/ModuleTriggerType': { ModuleTriggerType: triggerTypes },
    '@/enums/resource/GFFDataType': { GFFDataType: dataTypes },
  };
  const module = { exports: {} as Record<string, any> };
  runInNewContext(compiled.outputText, {
    module,
    exports: module.exports,
    require: (specifier: string) => boundaries[specifier] ?? {},
    console,
    Uint8Array,
  }, { filename: `${name}.js` });
  return module.exports[name];
}

describe('ported world behavior', () => {
  test('map export encodes explored pixels only, including a partial byte', () => {
    const AreaMap = loadWorldClass('AreaMap');
    const map = new AreaMap();
    map.dataSize = 2;
    map.data = new Uint8Array([255, 255]);
    map.mapResX = 4;
    map.mapResY = 1;
    map.fogAlphaPixelData = new Uint8Array([0, 255, 0, 255, 255, 255, 255, 0, 255, 0]);
    const saved = map.exportData();
    expect(Array.from(saved.getFieldByLabel('AreaMapData').getVoid())).toEqual([133, 2]);
    const restored = new AreaMap();
    restored.loadDataStruct(saved);
    expect(Array.from(restored.fogAlphaPixelData)).toEqual(Array.from(map.fogAlphaPixelData));
    map.fogAlphaPixelData.fill(255);
    expect(Array.from(map.exportData().getFieldByLabel('AreaMapData').getVoid())).toEqual([0, 0]);
    restored.fogAlphaTexture.dispose();
  });

  test.each([
    [1, true, false],
    [2, false, true],
    [3, true, true],
    [-1, true, true],
  ])('merchant buy/sell flag %s gates each direction independently', (flag, sells, buys) => {
    const Store = loadWorldClass('ModuleStore');
    const store = Object.assign(Object.create(Store.prototype), { buySellFlag: flag });
    expect(store.canSellToCustomer()).toBe(sells);
    expect(store.canBuyFromCustomer()).toBe(buys);
  });

  test('opening a store supplies the customer context to a fresh script instance', () => {
    const run = jest.fn();
    const instance: any = { run };
    const newInstance = jest.fn(() => instance);
    const Store = loadWorldClass('ModuleStore');
    const store = Object.assign(Object.create(Store.prototype), {
      scripts: { OnOpenStore: { nwscript: { newInstance } } },
    });
    const customer = { id: 42 };
    store.runOnOpenStore(customer);
    expect(newInstance).toHaveBeenCalledTimes(1);
    expect(instance.enteringObject).toBe(customer);
    expect(instance.lastSpeaker).toBe(customer);
    expect(instance.listenPatternSpeaker).toBe(customer);
    expect(run).toHaveBeenCalledWith(store);
  });

  test('friendly generic triggers fire on each entry and exit, without duplicate enter events', () => {
    const Trigger = loadWorldClass('ModuleTrigger');
    let inside = true;
    const onEnter = jest.fn();
    const onExit = jest.fn();
    const object: any = { id: 1 };
    const trigger = Object.assign(Object.create(Trigger.prototype), {
      type: triggerTypes.GENERIC,
      objectsInside: [],
      isInsideBoundingBox: () => inside,
      isHostile: () => false,
      onEnter,
      onExit,
    });
    trigger.updateObjectInside(object);
    trigger.updateObjectInside(object);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(object.lastTriggerEntered).toBe(trigger);
    inside = false;
    trigger.updateObjectInside(object);
    expect(onExit).toHaveBeenCalledWith(object);
    expect(object.lastTriggerExited).toBe(trigger);
    inside = true;
    trigger.updateObjectInside(object);
    expect(onEnter).toHaveBeenCalledTimes(2);
  });

  test('trap triggers still require hostility and respect one-shot state', () => {
    const Trigger = loadWorldClass('ModuleTrigger');
    const trigger = Object.assign(Object.create(Trigger.prototype), {
      type: triggerTypes.TRAP, triggered: false, trapOneShot: true,
      objectsInside: [], isInsideBoundingBox: () => true,
      isHostile: () => false, onEnter: jest.fn(),
    });
    trigger.updateObjectInside({ id: 1 });
    expect(trigger.onEnter).not.toHaveBeenCalled();
    trigger.isHostile = () => true;
    trigger.updateObjectInside({ id: 2 });
    expect(trigger.onEnter).toHaveBeenCalledTimes(1);
    trigger.updateObjectInside({ id: 3 });
    expect(trigger.onEnter).toHaveBeenCalledTimes(1);
  });

  test('only transition triggers suppress an initial overlapping party entry', () => {
    const member: any = { position: new THREE.Vector3() };
    const Trigger = loadWorldClass('ModuleTrigger', { PartyManager: { party: [member] } });
    const trigger = Object.assign(Object.create(Trigger.prototype), {
      type: triggerTypes.GENERIC, linkedToModule: 'next', objectsInside: [],
      box: { containsPoint: () => true },
    });
    trigger.initObjectsInside();
    expect(trigger.objectsInside).toHaveLength(0);
    trigger.type = triggerTypes.TRANSITION;
    trigger.initObjectsInside();
    expect(trigger.objectsInside).toEqual([member]);
  });

  test('sound persistence creates a localized literal rather than a string TLK reference', () => {
    const Sound = loadWorldClass('ModuleSound');
    const sound = Object.assign(Object.create(Sound.prototype), {
      name: 'Ambient machinery', soundResRefs: [], position: new THREE.Vector3(),
      actionQueueToActionList: () => new Field(dataTypes.LIST, 'ActionList'),
      getSWVarTableSaveStruct: () => new Struct(),
    });
    const saved = sound.save();
    const name = saved.RootNode.getFieldByLabel('LocName').getValue();
    expect(name.resref).toBe(-1);
    expect(name.strings).toEqual(['Ambient machinery']);
  });
});
