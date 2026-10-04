import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { webcrypto } from 'node:crypto';

jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {
  open: jest.fn(async () => 0),
  close: jest.fn(async () => {}),
  read: jest.fn(async (_fd: unknown, buffer: Uint8Array) => { buffer.fill(0x7f); }),
  writeFile: jest.fn(async (_path: string, _buffer: Uint8Array) => {}),
} }));
jest.mock('@/managers/KEYManager', () => ({ KEYManager: { Key: {
  getFileKey: (resRef: string) => resRef === 'fixture' ? { resId: 42 } : undefined,
} } }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: { TLKStrings: [] as unknown[] } }));
jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));

import { GameFileSystem } from '@/utility/GameFileSystem';
import { GameState } from '@/GameState';
import { NWScriptInstance } from '@/nwscript/NWScriptInstance';
import { BIFObject } from '@/resource/BIFObject';
import { RIMObject } from '@/resource/RIMObject';
import { ERFObject } from '@/resource/ERFObject';
import { GFFObject } from '@/resource/GFFObject';
import { GFFField } from '@/resource/GFFField';
import { GFFStruct } from '@/resource/GFFStruct';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { ActionParameter } from '@/actions/ActionParameter';
import { ActionParameterType } from '@/enums/actions/ActionParameterType';
import { BitWise } from '@/utility/BitWise';

if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

function bifFixture(payload: Uint8Array): Uint8Array {
  const result = new Uint8Array(36 + payload.length);
  result.set(new TextEncoder().encode('BIFFV1  '));
  const header = new DataView(result.buffer);
  header.setUint32(8, 1, true);
  header.setUint32(12, 0, true);
  header.setUint32(16, 20, true);
  header.setUint32(20, 42, true);
  header.setUint32(24, 36, true);
  header.setUint32(28, payload.length, true);
  header.setUint32(32, 10, true);
  result.set(payload, 36);
  return result;
}

function roundTrip(struct: GFFStruct): GFFStruct {
  const file = new GFFObject();
  file.FileType = 'GFF ';
  file.RootNode = struct;
  const decoded = new GFFObject();
  decoded.parse(file.getExportBuffer());
  return decoded.RootNode;
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

describe('BIF in-memory resource loading', () => {
  it.each([[], [0xa5], [0x12, 0x34, 0xfe]])('keeps every payload byte %p', async (...bytes: number[]) => {
    const payload = Uint8Array.from(bytes);
    const archive = await new BIFObject(bifFixture(payload)).load();
    expect(archive.fileType).toBe('BIFF');
    expect(archive.resources).toHaveLength(1);
    expect(await archive.getResourceBufferByResRef('FIXTURE', 10)).toEqual(payload);
    expect(archive.getResourcesByType(10)).toHaveLength(1);
    expect(GameFileSystem.open).not.toHaveBeenCalled();
  });

  it('supports byte-offset views without reading before the archive', async () => {
    const source = bifFixture(Uint8Array.of(0x88, 0x99));
    const larger = new Uint8Array(source.length + 11).fill(0xee);
    larger.set(source, 7);
    const archive = await new BIFObject(larger.subarray(7, 7 + source.length)).load();
    expect(await archive.getResourceBufferByResRef('fixture', 10)).toEqual(Uint8Array.of(0x88, 0x99));
  });

  it('rejects truncated headers and out-of-range tables', async () => {
    await expect(new BIFObject(new Uint8Array(19)).load()).rejects.toThrow('header is truncated');
    const buffer = bifFixture(Uint8Array.of(1));
    new DataView(buffer.buffer).setUint32(8, 100, true);
    await expect(new BIFObject(buffer).load()).rejects.toThrow('table is outside');
  });

  it('returns empty data for absent or out-of-range resource entries', async () => {
    const archive = await new BIFObject(bifFixture(Uint8Array.of(1))).load();
    expect(await archive.getResourceBuffer()).toEqual(new Uint8Array());
    expect(await archive.getResourceBuffer({ ...archive.resources[0], offset: 500 })).toEqual(new Uint8Array());
  });

  it('preserves cached disk reads, including descriptor zero and concurrent callers', async () => {
    const archive = new BIFObject('fixture.bif');
    const entry = { Id: 42, offset: 0, size: 1, resType: 10 };
    const [first, second] = await Promise.all([archive.getResourceBuffer(entry), archive.getResourceBuffer(entry)]);
    expect(first).toEqual(Uint8Array.of(0x7f));
    expect(second).toEqual(first);
    expect(GameFileSystem.open).toHaveBeenCalledTimes(1);
    await archive.dispose();
    await archive.dispose();
    expect(GameFileSystem.close).toHaveBeenCalledTimes(1);
    expect(GameFileSystem.close).toHaveBeenCalledWith(0);
    await archive.getResourceBuffer(entry);
    expect(GameFileSystem.open).toHaveBeenCalledTimes(2);
    await archive.dispose();
  });
});

describe('archive boundary preservation', () => {
  it.each([[], [0xa5], [0x12, 0x34, 0xfe]])('RIM reads and exports full payload %p', async (...bytes: number[]) => {
    const payload = Uint8Array.from(bytes);
    const archive = await new RIMObject(RIMObject.buildFromResourceEntries([
      { resRef: 'fixture', resType: 10, data: payload },
    ])).load();
    expect(await archive.getResourceBufferByResRef('FIXTURE', 10)).toEqual(payload);
    expect(await archive.exportRawResource('export', 'fixture', 10)).toEqual(payload);
    expect(GameFileSystem.writeFile).toHaveBeenCalledWith('export/fixture.txt', payload);
  });

  it('retains upstream ERF in-memory entry and serialized payload support', async () => {
    const payload = Uint8Array.of(0x12, 0xff);
    const original = new ERFObject();
    original.addResource('fixture', 10, payload);
    expect(await original.getResourceBufferByResRef('FIXTURE', 10)).toEqual(payload);
    const restored = await new ERFObject(original.getExportBuffer()).load();
    expect(await restored.getResourceBufferByResRef('fixture', 10)).toEqual(payload);
    expect(await restored.exportRawResource('export', 'fixture', 10)).toEqual(payload);
  });
});

describe('GFF vectors, orientations and action parameters', () => {
  it('serializes updated vectors and orientations rather than constructor defaults', () => {
    const struct = new GFFStruct(7);
    const vector = { x: 1.25, y: -2.5, z: 3.75 };
    const orientation = { x: 0, y: 0.5, z: -0.5, w: 1 };
    struct.addField(new GFFField(GFFDataType.VECTOR, 'Position')).setValue(vector);
    struct.addField(new GFFField(GFFDataType.ORIENTATION, 'Rotation')).setValue(orientation);
    vector.x = 999;
    orientation.w = 999;
    const restored = roundTrip(struct);
    expect(restored.getFieldByLabel('Position').getVector()).toEqual({ x: 1.25, y: -2.5, z: 3.75 });
    expect(restored.getFieldByLabel('Rotation').getOrientation()).toEqual({ x: 0, y: 0.5, z: -0.5, w: 1 });
  });

  it('resets malformed vector and orientation assignments to safe defaults', () => {
    const vector = new GFFField(GFFDataType.VECTOR, 'Position').setValue(null);
    const orientation = new GFFField(GFFDataType.ORIENTATION, 'Rotation').setValue({ x: 1 });
    expect(vector.getVector()).toEqual({ x: 0, y: 0, z: 0 });
    expect(orientation.getOrientation()).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it.each([
    [ActionParameterType.INT, -2147483648],
    [ActionParameterType.FLOAT, 3.125],
    [ActionParameterType.DWORD, 0xffffffff],
    [ActionParameterType.STRING, 'serialized parameter'],
  ])('round trips action parameter type %p through binary GFF', (type, value) => {
    const encoded = new ActionParameter(type as number, value).toStruct();
    expect(encoded.getFieldByLabel('Type').getValue()).toBe(type);
    const restored = ActionParameter.FromStruct(roundTrip(encoded));
    expect(restored.type).toBe(type);
    expect(restored.value).toBe(value);
  });

  it('returns undefined for missing parameter Type and script Value instead of throwing', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(ActionParameter.FromStruct(new GFFStruct())).toBeUndefined();
    const struct = new GFFStruct();
    struct.addField(new GFFField(GFFDataType.INT, 'Type', ActionParameterType.SCRIPT_SITUATION));
    expect(ActionParameter.FromStruct(struct)).toBeUndefined();
  });

  it('retains script situation metadata and routes saved stack restoration', () => {
    const saved = new GFFStruct();
    saved.addField(new GFFField(GFFDataType.CEXOSTRING, 'Name', 'fixture'));
    saved.addField(new GFFField(GFFDataType.VOID, 'Code')).setData(Uint8Array.of(1, 2));
    saved.addField(new GFFField(GFFDataType.INT, 'CodeSize', 2));
    saved.addField(new GFFField(GFFDataType.INT, 'InstructionPtr', 12));
    saved.addField(new GFFField(GFFDataType.STRUCT, 'Stack')).addChildStruct(new GFFStruct());
    const instance = Object.assign(new NWScriptInstance(new Map()), { saveEventSituation: () => saved });
    const init = jest.fn();
    const restoreStack = jest.fn(() => ({ fixtureStack: true }));
    (GameState as any).NWScript = class {
      static NWScriptStack = { FromActionStruct: restoreStack };
      name = '';
      init = init;
      newInstance() { return new NWScriptInstance(new Map()); }
    };
    const restored = ActionParameter.FromStruct(roundTrip(new ActionParameter(ActionParameterType.SCRIPT_SITUATION, instance).toStruct()));
    expect(restored.type).toBe(ActionParameterType.SCRIPT_SITUATION);
    expect(restored.scriptInstance.isStoreState).toBe(true);
    expect(restored.scriptInstance.address).toBe(12);
    expect(restored.scriptInstance.offset).toBe(12);
    expect(init).toHaveBeenCalledWith(Uint8Array.of(1, 2), 2);
    expect(restoreStack).toHaveBeenCalledTimes(1);
    expect(restored.scriptInstance.stack).toEqual({ fixtureStack: true });
  });
});

describe('destroyed-object guards', () => {
  it('returns valid objects but rejects destroyed, null and non-object values', () => {
    const object = { objectType: 3 };
    expect(BitWise.InstanceOfObject(object, 1)).toBe(object);
    expect(BitWise.InstanceOfObject({ ...object, destroyed: true }, 1)).toBeUndefined();
    expect(BitWise.InstanceOfObject(null, 0)).toBeUndefined();
    expect(BitWise.InstanceOfObject(3, 1)).toBeUndefined();
  });
});
