import { describe, expect, it } from '@jest/globals';

import { GFFDataType } from '@/enums/resource/GFFDataType';
import { CExoLocString } from '@/resource/CExoLocString';
import { CExoLocSubString } from '@/resource/CExoLocSubString';
import { GFFField } from '@/resource/GFFField';
import { GFFObject } from '@/resource/GFFObject';
import { GFFStruct } from '@/resource/GFFStruct';

function buildVendorStyleGff(): GFFObject {
  const gff = new GFFObject();
  gff.FileType = 'GFF ';

  gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'uint8').setValue(255));
  gff.RootNode.addField(new GFFField(GFFDataType.CHAR, 'int8').setValue(-127));
  gff.RootNode.addField(new GFFField(GFFDataType.WORD, 'uint16').setValue(65535));
  gff.RootNode.addField(new GFFField(GFFDataType.SHORT, 'int16').setValue(-32768));
  gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'uint32').setValue(4294967295));
  gff.RootNode.addField(new GFFField(GFFDataType.INT, 'int32').setValue(-2147483648));

  const uint64 = new GFFField(GFFDataType.DWORD64, 'uint64');
  uint64.setData(Uint8Array.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]));
  gff.RootNode.addField(uint64);

  gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'single').setValue(12.34567));
  gff.RootNode.addField(new GFFField(GFFDataType.DOUBLE, 'double').setValue(12.345678901234));
  gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'string').setValue('abcdefghij123456789'));
  gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'resref').setValue('resref01'));

  const locString = new CExoLocString(-1)
    .addSubString(new CExoLocSubString(0, 'male_eng'))
    .addSubString(new CExoLocSubString(5, 'fem_german'));
  gff.RootNode.addField(new GFFField(GFFDataType.CEXOLOCSTRING, 'locstring').setCExoLocString(locString));

  const binary = new GFFField(GFFDataType.VOID, 'binary');
  binary.setData(Uint8Array.from(Buffer.from('binarydata', 'latin1')));
  gff.RootNode.addField(binary);

  gff.RootNode.addField(new GFFField(GFFDataType.ORIENTATION, 'orientation').setOrientation({ x: 1, y: 2, z: 3, w: 4 }));
  gff.RootNode.addField(new GFFField(GFFDataType.VECTOR, 'position').setVector({ x: 11, y: 22, z: 33 }));

  const childStruct = new GFFStruct(0);
  childStruct.addField(new GFFField(GFFDataType.BYTE, 'child_uint8').setValue(4));
  gff.RootNode.addField(new GFFField(GFFDataType.STRUCT, 'child_struct').addChildStruct(childStruct));

  const listField = new GFFField(GFFDataType.LIST, 'list');
  listField.addChildStruct(new GFFStruct(1));
  listField.addChildStruct(new GFFStruct(2));
  gff.RootNode.addField(listField);

  return gff;
}

function expectVendorStyleValues(gff: GFFObject): void {
  const root = gff.RootNode;
  expect(root.getFieldByLabel('uint8')?.getValue()).toBe(255);
  expect(root.getFieldByLabel('int8')?.getValue()).toBe(-127);
  expect(root.getFieldByLabel('uint16')?.getValue()).toBe(65535);
  expect(root.getFieldByLabel('int16')?.getValue()).toBe(-32768);
  expect(root.getFieldByLabel('uint32')?.getValue()).toBe(4294967295);
  expect(root.getFieldByLabel('int32')?.getValue()).toBe(-2147483648);
  expect(root.getFieldByLabel('uint64')?.getValue()).toBe(4294967296n);
  expect(root.getFieldByLabel('single')?.getValue()).toBeCloseTo(12.34567, 5);
  expect(root.getFieldByLabel('double')?.getValue()).toBeCloseTo(12.345678901234, 12);
  expect(root.getFieldByLabel('string')?.getValue()).toBe('abcdefghij123456789');
  expect(root.getFieldByLabel('resref')?.getValue()).toBe('resref01');

  const locString = root.getFieldByLabel('locstring')?.getCExoLocString();
  expect(locString?.getRESREF()).toBe(-1);
  expect(locString?.getStrings()).toHaveLength(2);
  expect(locString?.getString(0).GetStringID()).toBe(0);
  expect(locString?.getString(0).getString()).toBe('male_eng');
  expect(locString?.getString(1).GetStringID()).toBe(5);
  expect(locString?.getString(1).getString()).toBe('fem_german');

  expect(Buffer.from(root.getFieldByLabel('binary')?.getVoid() ?? []).toString('latin1')).toBe('binarydata');
  expect(root.getFieldByLabel('orientation')?.getOrientation()).toEqual({ x: 1, y: 2, z: 3, w: 4 });
  expect(root.getFieldByLabel('position')?.getVector()).toEqual({ x: 11, y: 22, z: 33 });

  const childStruct = root.getFieldByLabel('child_struct')?.getChildStructs()[0];
  expect(childStruct?.getFieldByLabel('child_uint8')?.getValue()).toBe(4);

  const list = root.getFieldByLabel('list')?.getChildStructs() ?? [];
  expect(list.map((entry) => entry.getType())).toEqual([1, 2]);
}

describe('GFFObject', () => {
  it('round-trips vendor-style binary field coverage through production export and parse paths', () => {
    const original = buildVendorStyleGff();

    const buffer = original.getExportBuffer();
    const parsed = new GFFObject(buffer);

    expectVendorStyleValues(parsed);
    expect(parsed.getFieldByLabel('child_uint8')?.getValue()).toBe(4);
  });

  it('round-trips through JSON, XML, YAML, and TOML metadata serializers', () => {
    const original = buildVendorStyleGff();

    const jsonRoundTrip = new GFFObject();
    jsonRoundTrip.fromJSON(original.toJSON());
    expectVendorStyleValues(jsonRoundTrip);

    const xmlRoundTrip = new GFFObject();
    xmlRoundTrip.fromXML(original.toXML());
    expectVendorStyleValues(xmlRoundTrip);

    const yamlRoundTrip = new GFFObject();
    yamlRoundTrip.fromYAML(original.toYAML());
    expectVendorStyleValues(yamlRoundTrip);

    const tomlRoundTrip = new GFFObject();
    tomlRoundTrip.fromTOML(original.toTOML());
    expectVendorStyleValues(tomlRoundTrip);
  });

  it('preserves list structs containing vector fields without throwing on nested access', () => {
    const gff = new GFFObject();
    gff.FileType = 'UTC ';

    const classList = new GFFField(GFFDataType.LIST, 'ClassList');

    const existingClass = new GFFStruct(2);
    existingClass.addField(new GFFField(GFFDataType.INT, 'Class').setValue(3));
    existingClass.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel').setValue(8));
    existingClass.addField(new GFFField(GFFDataType.VECTOR, 'Facing').setVector({ x: 1, y: 2, z: 3 }));

    const knownList = new GFFField(GFFDataType.LIST, 'KnownList0');
    const knownEntry = new GFFStruct(3);
    knownEntry.addField(new GFFField(GFFDataType.INT, 'Spell').setValue(4));
    knownEntry.addField(new GFFField(GFFDataType.SHORT, 'SpellMetaMagic').setValue(0));
    knownEntry.addField(new GFFField(GFFDataType.SHORT, 'SpellFlags').setValue(1));
    knownList.addChildStruct(knownEntry);
    existingClass.addField(knownList);

    const addedClass = new GFFStruct(5);
    addedClass.addField(new GFFField(GFFDataType.INT, 'Class').setValue(3));
    addedClass.addField(new GFFField(GFFDataType.SHORT, 'ClassLevel').setValue(9));
    addedClass.addField(new GFFField(GFFDataType.VECTOR, 'Facing').setVector({ x: 4, y: 5, z: 6 }));

    const addedKnownList = new GFFField(GFFDataType.LIST, 'KnownList0');
    const addedKnownEntry = new GFFStruct(7);
    addedKnownEntry.addField(new GFFField(GFFDataType.INT, 'Spell').setValue(53));
    addedKnownEntry.addField(new GFFField(GFFDataType.SHORT, 'SpellMetaMagic').setValue(0));
    addedKnownEntry.addField(new GFFField(GFFDataType.SHORT, 'SpellFlags').setValue(1));
    addedKnownList.addChildStruct(addedKnownEntry);
    addedClass.addField(addedKnownList);

    classList.addChildStruct(existingClass);
    classList.addChildStruct(addedClass);
    gff.RootNode.addField(classList);

    const parsed = new GFFObject(gff.getExportBuffer());
    const parsedList = parsed.RootNode.getFieldByLabel('ClassList')?.getChildStructs() ?? [];

    expect(parsedList).toHaveLength(2);
    expect(() => parsedList[0].getFieldByLabel('Facing')?.getVector()).not.toThrow();
    expect(parsedList[0].getFieldByLabel('Facing')?.getVector()).toEqual({ x: 1, y: 2, z: 3 });
    expect(parsedList[1].getFieldByLabel('Facing')?.getVector()).toEqual({ x: 4, y: 5, z: 6 });

    const nestedKnownList = parsedList[0].getFieldByLabel('KnownList0')?.getChildStructs() ?? [];
    expect(nestedKnownList).toHaveLength(1);
    expect(nestedKnownList[0].getFieldByLabel('Spell')?.getValue()).toBe(4);

    const jsonRoundTrip = new GFFObject();
    jsonRoundTrip.fromJSON(parsed.toJSON());
    const jsonList = jsonRoundTrip.RootNode.getFieldByLabel('ClassList')?.getChildStructs() ?? [];
    expect(jsonList).toHaveLength(2);
    expect(jsonList[1].getFieldByLabel('Facing')?.getVector()).toEqual({ x: 4, y: 5, z: 6 });
  });

  it('rejects truncated or invalid binary headers', () => {
    // parse() is called directly because the constructor swallows errors (uses callbacks).
    const a = new GFFObject();
    expect(() => a.parse(new Uint8Array(12))).toThrow('Invalid GFF header');

    const valid = buildVendorStyleGff().getExportBuffer();
    const invalidVersion = valid.slice();
    invalidVersion.set(Uint8Array.from(Buffer.from('V9.9', 'latin1')), 4);
    const b = new GFFObject();
    expect(() => b.parse(invalidVersion)).toThrow('Unsupported GFF version: V9.9');

    const truncated = valid.slice(0, valid.length - 1);
    const c = new GFFObject();
    expect(() => c.parse(truncated)).toThrow('Invalid GFF');
  });
});
