import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/managers/TLKManager', () => ({
  TLKManager: {
    TLKStrings: Array.from({ length: 1000 }, (_, i) => ({ Value: `TLK_${i}`, SoundResRef: '' })),
    GetStringById: jest.fn((index: number) => ({ Value: `TLK_${index}`, SoundResRef: '' })),
  },
}));

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CExoLocString } from '@/resource/CExoLocString';
import { GFFField } from '@/resource/GFFField';
import { GFFStruct } from '@/resource/GFFStruct';

describe('GFFField', () => {
  describe('constructor defaults', () => {
    it('uses type 0 and empty label by default', () => {
      const f = new GFFField();
      expect(f.getType()).toBe(0);
      expect(f.getLabel()).toBe('');
    });

    it('generates a non-empty uuid', () => {
      const f = new GFFField();
      expect(typeof f.uuid).toBe('string');
      expect(f.uuid.length).toBeGreaterThan(0);
    });

    it('initialises empty data buffer', () => {
      const f = new GFFField();
      expect(f.data).toBeInstanceOf(Uint8Array);
      expect(f.data.length).toBe(0);
    });

    it('stores type, label, and value from constructor args', () => {
      const f = new GFFField(GFFDataType.INT, 'Level', 5);
      expect(f.getType()).toBe(GFFDataType.INT);
      expect(f.getLabel()).toBe('Level');
      expect(f.getValue()).toBe(5);
    });
  });

  describe('string-like types default to empty string', () => {
    it('CEXOSTRING value defaults to empty string', () => {
      const f = new GFFField(GFFDataType.CEXOSTRING, 'Name');
      expect(f.getValue()).toBe('');
    });

    it('RESREF value defaults to empty string', () => {
      const f = new GFFField(GFFDataType.RESREF, 'TemplateRes');
      expect(f.getValue()).toBe('');
    });
  });

  describe('CEXOLOCSTRING construction', () => {
    it('auto-creates a CExoLocString', () => {
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Description');
      expect(f.getCExoLocString()).toBeInstanceOf(CExoLocString);
    });

    it('uses a provided CExoLocString instance', () => {
      const loc = new CExoLocString();
      loc.addSubString('Hello', 0);
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc', loc);
      expect(f.getCExoLocString()).toBe(loc);
    });
  });

  describe('ORIENTATION construction', () => {
    it('defaults orientation to {0, 0, 0, 1}', () => {
      const f = new GFFField(GFFDataType.ORIENTATION, 'Rot');
      expect(f.getOrientation()).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    });

    it('accepts an initial orientation object', () => {
      const f = new GFFField(GFFDataType.ORIENTATION, 'Rot', { x: 0.1, y: 0.2, z: 0.3, w: 0.9 });
      expect(f.getOrientation()).toEqual({ x: 0.1, y: 0.2, z: 0.3, w: 0.9 });
    });
  });

  describe('VECTOR construction', () => {
    it('defaults vector to {0, 0, 0}', () => {
      const f = new GFFField(GFFDataType.VECTOR, 'Pos');
      expect(f.getVector()).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('accepts an initial vector object', () => {
      const f = new GFFField(GFFDataType.VECTOR, 'Pos', { x: 1, y: 2, z: 3 });
      expect(f.getVector()).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('STRUCT construction', () => {
    it('auto-creates childStructs[0] as GFFStruct', () => {
      const f = new GFFField(GFFDataType.STRUCT, 'CreatureData');
      expect(f.getFieldStruct()).toBeInstanceOf(GFFStruct);
    });
  });

  describe('VOID construction', () => {
    it('initialises with an empty data Uint8Array', () => {
      const f = new GFFField(GFFDataType.VOID, 'BinData');
      expect(f.data.length).toBe(0);
    });
  });

  describe('setType / getType', () => {
    it('updates the type and returns this for chaining', () => {
      const f = new GFFField(GFFDataType.INT, 'Label');
      const ret = f.setType(GFFDataType.FLOAT);
      expect(f.getType()).toBe(GFFDataType.FLOAT);
      expect(ret).toBe(f);
    });
  });

  describe('setLabel / getLabel', () => {
    it('updates the label and returns this for chaining', () => {
      const f = new GFFField(GFFDataType.INT, 'OldLabel');
      const ret = f.setLabel('NewLabel');
      expect(f.getLabel()).toBe('NewLabel');
      expect(ret).toBe(f);
    });
  });

  describe('getValue', () => {
    it('returns the raw value for numeric types', () => {
      const f = new GFFField(GFFDataType.INT, 'x', 42);
      expect(f.getValue()).toBe(42);
    });

    it('returns DWORD64 as BigInt from a DataView', () => {
      const f = new GFFField(GFFDataType.DWORD64, 'Big');
      const buf = new ArrayBuffer(8);
      const view = new DataView(buf);
      view.setBigUint64(0, 9999999999999n, true);
      f.setData(new Uint8Array(buf));
      expect(f.getValue()).toBe(9999999999999n);
    });

    it('returns 0n for DWORD64 when dataView has less than 8 bytes', () => {
      const f = new GFFField(GFFDataType.DWORD64, 'Big');
      expect(f.getValue()).toBe(0n);
    });

    it('delegates CEXOLOCSTRING getValue to the inner CExoLocString', () => {
      const loc = new CExoLocString();
      loc.addSubString('Translated', 0);
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc', loc);
      expect(f.getValue()).toBe('Translated');
    });
  });

  describe('setValue', () => {
    it('sets CEXOSTRING value to a string', () => {
      const f = new GFFField(GFFDataType.CEXOSTRING, 'Name');
      f.setValue('Hero');
      expect(f.getValue()).toBe('Hero');
    });

    it('coerces CEXOSTRING non-string to string', () => {
      const f = new GFFField(GFFDataType.CEXOSTRING, 'Name');
      f.setValue(123 as any);
      expect(f.getValue()).toBe('123');
    });

    it('sets RESREF value to a string', () => {
      const f = new GFFField(GFFDataType.RESREF, 'Tmpl');
      f.setValue('my_template');
      expect(f.getValue()).toBe('my_template');
    });

    it('sets BYTE within 0-255', () => {
      const f = new GFFField(GFFDataType.BYTE, 'Level');
      f.setValue(200);
      expect(f.getValue()).toBe(200);
    });

    it('still sets BYTE value when out of range', () => {
      const f = new GFFField(GFFDataType.BYTE, 'Level');
      f.setValue(300);
      expect(f.getValue()).toBe(300);
    });

    it('sets SHORT within range', () => {
      const f = new GFFField(GFFDataType.SHORT, 'Hp');
      f.setValue(-1000);
      expect(f.getValue()).toBe(-1000);
    });

    it('sets INT within range', () => {
      const f = new GFFField(GFFDataType.INT, 'Exp');
      f.setValue(-2147483648);
      expect(f.getValue()).toBe(-2147483648);
    });

    it('sets WORD within 0-65535', () => {
      const f = new GFFField(GFFDataType.WORD, 'Id');
      f.setValue(65535);
      expect(f.getValue()).toBe(65535);
    });

    it('sets DWORD within 0-4294967295', () => {
      const f = new GFFField(GFFDataType.DWORD, 'Flags');
      f.setValue(4294967295);
      expect(f.getValue()).toBe(4294967295);
    });

    it('CEXOLOCSTRING: string → addSubString to cexoLocString', () => {
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc');
      f.setValue('Hello');
      expect(f.getCExoLocString().getValue()).toBe('Hello');
    });

    it('CEXOLOCSTRING: number → setRESREF on cexoLocString', () => {
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc');
      f.setValue(5);
      expect(f.getCExoLocString().getRESREF()).toBe(5);
    });

    it('CEXOLOCSTRING: CExoLocString instance replaces cexoLocString', () => {
      const loc = new CExoLocString();
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc');
      f.setValue(loc);
      expect(f.getCExoLocString()).toBe(loc);
    });

    it('VOID: accepts Uint8Array', () => {
      const f = new GFFField(GFFDataType.VOID, 'Data');
      const bin = Uint8Array.from([1, 2, 3]);
      f.setValue(bin);
      expect(f.value).toBe(bin);
    });

    it('VOID: accepts ArrayBuffer and wraps in Uint8Array', () => {
      const f = new GFFField(GFFDataType.VOID, 'Data');
      const buf = Uint8Array.from([4, 5, 6]).buffer;
      f.setValue(buf);
      expect(f.value).toBeInstanceOf(Uint8Array);
      expect(Array.from(f.value as Uint8Array)).toEqual([4, 5, 6]);
    });

    it('returns this for chaining', () => {
      const f = new GFFField(GFFDataType.INT, 'x');
      expect(f.setValue(1)).toBe(f);
    });
  });

  describe('setData', () => {
    it('updates data and rebuilds dataView', () => {
      const f = new GFFField();
      const buf = new ArrayBuffer(4);
      new DataView(buf).setInt32(0, 42, true);
      f.setData(new Uint8Array(buf));
      expect(f.data.length).toBe(4);
      expect(f.dataView.getInt32(0, true)).toBe(42);
    });

    it('returns this for chaining', () => {
      const f = new GFFField();
      expect(f.setData(new Uint8Array(1))).toBe(f);
    });
  });

  describe('setVector / getVector', () => {
    it('stores and retrieves a vector', () => {
      const f = new GFFField(GFFDataType.VECTOR, 'Pos');
      f.setVector({ x: 10, y: 20, z: 30 });
      expect(f.getVector()).toEqual({ x: 10, y: 20, z: 30 });
    });

    it('returns this for chaining', () => {
      const f = new GFFField(GFFDataType.VECTOR, 'Pos');
      expect(f.setVector({ x: 0, y: 0, z: 0 })).toBe(f);
    });
  });

  describe('setOrientation / getOrientation', () => {
    it('stores and retrieves an orientation', () => {
      const f = new GFFField(GFFDataType.ORIENTATION, 'Rot');
      f.setOrientation({ x: 0, y: 0, z: 1, w: 0 });
      expect(f.getOrientation()).toEqual({ x: 0, y: 0, z: 1, w: 0 });
    });

    it('returns this for chaining', () => {
      const f = new GFFField(GFFDataType.ORIENTATION, 'Rot');
      expect(f.setOrientation({ x: 0, y: 0, z: 0, w: 1 })).toBe(f);
    });
  });

  describe('setCExoLocString / getCExoLocString', () => {
    it('replaces the internal localized string', () => {
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc');
      const loc = new CExoLocString();
      f.setCExoLocString(loc);
      expect(f.getCExoLocString()).toBe(loc);
    });

    it('returns this for chaining', () => {
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc');
      expect(f.setCExoLocString(new CExoLocString())).toBe(f);
    });
  });

  describe('addChildStruct (LIST)', () => {
    it('appends structs for LIST type', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      const s1 = new GFFStruct(1);
      const s2 = new GFFStruct(2);
      f.addChildStruct(s1);
      f.addChildStruct(s2);
      expect(f.getChildStructs()).toHaveLength(2);
      expect(f.getChildStructs()[0]).toBe(s1);
      expect(f.getChildStructs()[1]).toBe(s2);
    });

    it('returns this for chaining on LIST', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      expect(f.addChildStruct(new GFFStruct())).toBe(f);
    });

    it('ignores non-GFFStruct arguments', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      f.addChildStruct({ type: 1 } as any);
      expect(f.getChildStructs()).toHaveLength(0);
    });
  });

  describe('addChildStruct (STRUCT)', () => {
    it('replaces childStructs[0] for STRUCT type', () => {
      const f = new GFFField(GFFDataType.STRUCT, 'Data');
      const original = f.getFieldStruct();
      const replacement = new GFFStruct(7);
      f.addChildStruct(replacement);
      expect(f.getFieldStruct()).toBe(replacement);
      expect(f.getFieldStruct()).not.toBe(original);
    });
  });

  describe('removeChildStruct', () => {
    it('removes by reference', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      const s = new GFFStruct();
      f.addChildStruct(s);
      f.removeChildStruct(s);
      expect(f.getChildStructs()).toHaveLength(0);
    });

    it('does nothing when struct is not present', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      f.addChildStruct(new GFFStruct());
      f.removeChildStruct(new GFFStruct());
      expect(f.getChildStructs()).toHaveLength(1);
    });

    it('returns this for chaining', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      expect(f.removeChildStruct(new GFFStruct())).toBe(f);
    });
  });

  describe('setChildStructs', () => {
    it('replaces the child struct array', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      const structs = [new GFFStruct(1), new GFFStruct(2)];
      f.setChildStructs(structs);
      expect(f.getChildStructs()).toBe(structs);
    });
  });

  describe('getChildStructByType', () => {
    it('returns the first struct with the matching type', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      f.addChildStruct(new GFFStruct(0x0008));
      f.addChildStruct(new GFFStruct(0x0007));
      const found = f.getChildStructByType(0x0007);
      expect(found?.type).toBe(0x0007);
    });

    it('returns null when no struct matches', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      expect(f.getChildStructByType(99)).toBeNull();
    });
  });

  describe('getFieldByLabel', () => {
    it('retrieves a field from the first child struct', () => {
      const f = new GFFField(GFFDataType.STRUCT, 'Data');
      const child = new GFFStruct(0);
      child.addField(new GFFField(GFFDataType.CEXOSTRING, 'Name', 'Hero'));
      f.addChildStruct(child);
      const found = f.getFieldByLabel('Name');
      expect(found?.getValue()).toBe('Hero');
    });

    it('returns null when label is not found', () => {
      const f = new GFFField(GFFDataType.STRUCT, 'Data');
      expect(f.getFieldByLabel('Missing')).toBeNull();
    });
  });

  describe('toJSON', () => {
    it('serialises type and value for a simple numeric field', () => {
      const f = new GFFField(GFFDataType.INT, 'Level', 10);
      const json = f.toJSON();
      expect(json.type).toBe(GFFDataType.INT);
      expect(json.value).toBe(10);
      expect(json.structs).toHaveLength(0);
    });

    it('serialises DWORD64 value as a decimal string', () => {
      const f = new GFFField(GFFDataType.DWORD64, 'Big');
      const buf = new ArrayBuffer(8);
      new DataView(buf).setBigUint64(0, 123456789012345n, true);
      f.setData(new Uint8Array(buf));
      expect(f.toJSON().value).toBe('123456789012345');
    });

    it('serialises VOID value as an Array of bytes', () => {
      const f = new GFFField(GFFDataType.VOID, 'Bin');
      // toJSON() uses getVoid() which returns this.data; use setData to populate it
      f.setData(Uint8Array.from([0xde, 0xad]));
      const json = f.toJSON();
      expect(json.value).toEqual([0xde, 0xad]);
    });

    it('serialises CEXOLOCSTRING with str_ref and substrings', () => {
      const loc = new CExoLocString();
      loc.addSubString('Greetings', 0);
      const f = new GFFField(GFFDataType.CEXOLOCSTRING, 'Desc', loc);
      const json = f.toJSON() as any;
      expect(json.value.str_ref).toBe(-1);
      expect(json.value.substrings[0].string).toBe('Greetings');
    });

    it('serialises STRUCT/LIST value as 0 with structs array', () => {
      const f = new GFFField(GFFDataType.LIST, 'Items');
      f.addChildStruct(new GFFStruct(1));
      const json = f.toJSON();
      expect(json.value).toBe(0);
      expect(json.structs).toHaveLength(1);
    });

    it('serialises ORIENTATION as the orientation object', () => {
      const f = new GFFField(GFFDataType.ORIENTATION, 'Rot', { x: 0, y: 0, z: 1, w: 0 });
      const json = f.toJSON();
      expect(json.value).toEqual({ x: 0, y: 0, z: 1, w: 0 });
    });

    it('serialises VECTOR as the vector object', () => {
      const f = new GFFField(GFFDataType.VECTOR, 'Pos', { x: 1, y: 2, z: 3 });
      const json = f.toJSON();
      expect(json.value).toEqual({ x: 1, y: 2, z: 3 });
    });
  });
});
