/**
 * Round-trip tests for toJSON/fromJSON, toXML/fromXML, toYAML/fromYAML, toTOML/fromTOML
 * across all *Object classes in src/resource.
 */

import * as THREE from 'three';

import { BIFObject } from '@/resource/BIFObject';
// BIKObject excluded: pre-existing TS errors (THREE.LuminanceFormat, etc.)
// LIPObject excluded: circular dep (Logger_1 before init) via MDLLoader/OdysseyModel
import { ERFObject } from '@/resource/ERFObject';
import { GFFObject } from '@/resource/GFFObject';
import { KEYObject } from '@/resource/KEYObject';
import { LTRObject } from '@/resource/LTRObject';
import { LYTObject } from '@/resource/LYTObject';
import { RIMObject } from '@/resource/RIMObject';
import { SSFObject } from '@/resource/SSFObject';
import { TGAObject } from '@/resource/TGAObject';
import { TLKObject } from '@/resource/TLKObject';
import { TwoDAObject } from '@/resource/TwoDAObject';
import { VISObject } from '@/resource/VISObject';
import { WAVObject } from '@/resource/WAVObject';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

function expectJSONEqual(a: unknown, b: unknown): void {
  expect(JSON.stringify(a)).toBe(JSON.stringify(b));
}

describe('ResourceFormatRoundtrip', () => {
  describe('TwoDAObject', () => {
    it('JSON round-trip', () => {
      const data = { headers: ['c1'], rows: [{ label: '0', cells: ['a'] }] };
      const a = TwoDAObject.fromJSON(data);
      const b = new TwoDAObject(undefined);
      b.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const data = { headers: ['c1'], rows: [{ label: '0', cells: ['a'] }] };
      const a = TwoDAObject.fromJSON(data);
      const b = TwoDAObject.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const data = { headers: ['c1'], rows: [{ label: '0', cells: ['a'] }] };
      const a = TwoDAObject.fromJSON(data);
      const b = TwoDAObject.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const data = { headers: ['c1'], rows: [{ label: '0', cells: ['a'] }] };
      const a = TwoDAObject.fromJSON(data);
      const b = TwoDAObject.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('SSFObject', () => {
    it('JSON round-trip', () => {
      const data = { fileType: 'SSF ', fileVersion: 'V1.1', sound_refs: [0, 1, -1, -1] };
      const a = SSFObject.fromJSON(data);
      const b = SSFObject.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const data = { fileType: 'SSF ', fileVersion: 'V1.1', sound_refs: [0, 1, -1] };
      const a = SSFObject.fromJSON(data);
      const b = SSFObject.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const data = { fileType: 'SSF ', fileVersion: 'V1.1', sound_refs: [0, 1] };
      const a = SSFObject.fromJSON(data);
      const b = SSFObject.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const data = { fileType: 'SSF ', fileVersion: 'V1.1', sound_refs: [0, 1] };
      const a = SSFObject.fromJSON(data);
      const b = SSFObject.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('TLKObject', () => {
    it('JSON round-trip', () => {
      const data = {
        fileType: 'TLK ',
        fileVersion: 'V3.0',
        languageId: 0,
        stringCount: 1,
        entries: [{ index: 0, flags: 0, value: 'hello', soundResRef: '', volumeVariance: 0, pitchVariance: 0, soundLength: 0 }]
      };
      const a = TLKObject.fromJSON(data);
      const b = TLKObject.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const data = { fileType: 'TLK ', fileVersion: 'V3.0', languageId: 0, stringCount: 1, entries: [{ index: 0, flags: 0, value: 'hi', soundResRef: '', volumeVariance: 0, pitchVariance: 0, soundLength: 0 }] };
      const a = TLKObject.fromJSON(data);
      const b = TLKObject.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const data = { fileType: 'TLK ', fileVersion: 'V3.0', languageId: 0, stringCount: 1, entries: [{ index: 0, flags: 0, value: 'hi', soundResRef: '', volumeVariance: 0, pitchVariance: 0, soundLength: 0 }] };
      const a = TLKObject.fromJSON(data);
      const b = TLKObject.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const data = { fileType: 'TLK ', fileVersion: 'V3.0', languageId: 0, stringCount: 1, entries: [{ index: 0, flags: 0, value: 'hi', soundResRef: '', volumeVariance: 0, pitchVariance: 0, soundLength: 0 }] };
      const a = TLKObject.fromJSON(data);
      const b = TLKObject.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('VISObject', () => {
    const sampleVIS = ['room001 2', '  room002', '  room003', 'room002 1', '  room001'].join('\n');
    it('JSON round-trip', () => {
      const a = new VISObject(new TextEncoder().encode(sampleVIS));
      const b = new VISObject();
      b.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const a = new VISObject(new TextEncoder().encode(sampleVIS));
      const b = new VISObject();
      b.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const a = new VISObject(new TextEncoder().encode(sampleVIS));
      const b = new VISObject();
      b.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const a = new VISObject(new TextEncoder().encode(sampleVIS));
      const b = new VISObject();
      b.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('LTRObject', () => {
    it('JSON round-trip', () => {
      const buf = makeMinimalLTR();
      const a = new LTRObject(buf);
      const b = new LTRObject(new Uint8Array(0));
      b.fromJSON(a.toJSON());
      expect(a.charCount).toBe(b.charCount);
      expect(a.singleArray?.length).toBe(b.singleArray?.length);
    });
    it('XML round-trip', () => {
      const buf = makeMinimalLTR();
      const a = new LTRObject(buf);
      const b = new LTRObject(new Uint8Array(0));
      b.fromXML(a.toXML());
      expect(a.charCount).toBe(b.charCount);
    });
    it('YAML round-trip', () => {
      const buf = makeMinimalLTR();
      const a = new LTRObject(buf);
      const b = new LTRObject(new Uint8Array(0));
      b.fromYAML(a.toYAML());
      expect(a.charCount).toBe(b.charCount);
    });
    it('TOML round-trip', () => {
      const buf = makeMinimalLTR();
      const a = new LTRObject(buf);
      const b = new LTRObject(new Uint8Array(0));
      b.fromTOML(a.toTOML());
      expect(a.charCount).toBe(b.charCount);
    });
  });

  describe('BIFObject', () => {
    it('JSON round-trip', () => {
      const buf = makeMinimalBIF();
      const a = new BIFObject(buf);
      a.readFromMemory();
      const b = new BIFObject(new Uint8Array(0));
      b.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const buf = makeMinimalBIF();
      const a = new BIFObject(buf);
      a.readFromMemory();
      const b = new BIFObject(new Uint8Array(0));
      b.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const buf = makeMinimalBIF();
      const a = new BIFObject(buf);
      a.readFromMemory();
      const b = new BIFObject(new Uint8Array(0));
      b.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const buf = makeMinimalBIF();
      const a = new BIFObject(buf);
      a.readFromMemory();
      const b = new BIFObject(new Uint8Array(0));
      b.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('WAVObject', () => {
    it('JSON round-trip', () => {
      const a = new WAVObject();
      a.channels = 1;
      a.sampleRate = 44100;
      a.data = new Uint8Array([0, 0]);
      const b = new WAVObject();
      b.fromJSON(a.toJSON());
      expect(a.channels).toBe(b.channels);
      expect(a.sampleRate).toBe(b.sampleRate);
      expect(a.data.length).toBe(b.data.length);
    });
    it('XML round-trip', () => {
      const a = new WAVObject();
      a.data = new Uint8Array([1, 2, 3]);
      const b = new WAVObject();
      b.fromXML(a.toXML());
      expect(a.data.length).toBe(b.data.length);
    });
    it('YAML round-trip', () => {
      const a = new WAVObject();
      a.data = new Uint8Array([1, 2]);
      const b = new WAVObject();
      b.fromYAML(a.toYAML());
      expect(a.data.length).toBe(b.data.length);
    });
    it('TOML round-trip', () => {
      const a = new WAVObject();
      a.data = new Uint8Array([1, 2]);
      const b = new WAVObject();
      b.fromTOML(a.toTOML());
      expect(a.data.length).toBe(b.data.length);
    });
  });

  describe('LYTObject', () => {
    it('JSON round-trip', () => {
      const a = new LYTObject(new Uint8Array(0));
      a.filedependancy = 'test.lyt';
      a.rooms = [{ name: 'r1', position: new THREE.Vector3(0, 0, 0) }];
      const b = new LYTObject(new Uint8Array(0));
      b.fromJSON(a.toJSON());
      expect(a.rooms.length).toBe(b.rooms.length);
      expect(a.rooms[0].name).toBe(b.rooms[0].name);
    });
    it('XML round-trip', () => {
      const a = new LYTObject(new Uint8Array(0));
      a.rooms = [{ name: 'r1', position: new THREE.Vector3(0, 0, 0) }];
      const b = new LYTObject(new Uint8Array(0));
      b.fromXML(a.toXML());
      expect(a.rooms.length).toBe(b.rooms.length);
    });
    it('YAML round-trip', () => {
      const a = new LYTObject(new Uint8Array(0));
      a.rooms = [{ name: 'r1', position: new THREE.Vector3(0, 0, 0) }];
      const b = new LYTObject(new Uint8Array(0));
      b.fromYAML(a.toYAML());
      expect(a.rooms.length).toBe(b.rooms.length);
    });
    it('TOML round-trip', () => {
      const a = new LYTObject(new Uint8Array(0));
      a.rooms = [{ name: 'r1', position: new THREE.Vector3(0, 0, 0) }];
      const b = new LYTObject(new Uint8Array(0));
      b.fromTOML(a.toTOML());
      expect(a.rooms.length).toBe(b.rooms.length);
    });
  });

  describe('RIMObject', () => {
    it('JSON round-trip', () => {
      const buf = makeMinimalRIM();
      const a = RIMObject.fromBufferSync(buf);
      const b = new RIMObject(new Uint8Array(0));
      b.fromJSON(a.toJSON());
      expect(a.resources.length).toBe(b.resources.length);
      if (a.resources.length > 0) expect(a.resources[0].resRef).toBe(b.resources[0].resRef);
    });
    it('XML round-trip', () => {
      const buf = makeMinimalRIM();
      const a = RIMObject.fromBufferSync(buf);
      const b = new RIMObject(new Uint8Array(0));
      b.fromXML(a.toXML());
      expect(a.resources.length).toBe(b.resources.length);
    });
    it('YAML round-trip', () => {
      const buf = makeMinimalRIM();
      const a = RIMObject.fromBufferSync(buf);
      const b = new RIMObject(new Uint8Array(0));
      b.fromYAML(a.toYAML());
      expect(a.resources.length).toBe(b.resources.length);
    });
    it('TOML round-trip', () => {
      const buf = makeMinimalRIM();
      const a = RIMObject.fromBufferSync(buf);
      const b = new RIMObject(new Uint8Array(0));
      b.fromTOML(a.toTOML());
      expect(a.resources.length).toBe(b.resources.length);
    });
  });

  describe('GFFObject', () => {
    it('JSON round-trip', () => {
      const gff = new GFFObject();
      const j = gff.toJSON();
      const b = new GFFObject();
      b.fromJSON(j);
      expectJSONEqual(gff.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const gff = new GFFObject();
      const b = new GFFObject();
      b.fromXML(gff.toXML());
      expectJSONEqual(gff.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const gff = new GFFObject();
      const b = new GFFObject();
      b.fromYAML(gff.toYAML());
      expectJSONEqual(gff.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const gff = new GFFObject();
      const b = new GFFObject();
      b.fromTOML(gff.toTOML());
      expectJSONEqual(gff.toJSON(), b.toJSON());
    });
  });

  describe('ERFObject', () => {
    const minimalERF: ReturnType<ERFObject['toJSON']> = {
      header: { fileType: 'MOD ', fileVersion: 'V1.0', languageCount: 0, localizedStringSize: 0, entryCount: 0, offsetToLocalizedString: 0, offsetToKeyList: 0, offsetToResourceList: 0, buildYear: 0, buildDay: 0, DescriptionStrRef: 0, reserved: new Uint8Array(116) } as ReturnType<ERFObject['toJSON']>['header'],
      localizedStrings: [],
      keyList: [],
      resources: []
    };
    it('JSON round-trip', () => {
      const a = new ERFObject();
      a.fromJSON(minimalERF);
      const b = new ERFObject();
      b.fromJSON(a.toJSON());
      expect(a.header.fileType).toBe(b.header.fileType);
      expect(a.keyList.length).toBe(b.keyList.length);
      expect(a.resources.length).toBe(b.resources.length);
    });
    it('XML round-trip', () => {
      const a = new ERFObject();
      a.fromJSON(minimalERF);
      const b = new ERFObject();
      b.fromXML(a.toXML());
      expect(a.header.fileType).toBe(b.header.fileType);
      expect(a.resources.length).toBe(b.resources.length);
    });
    it('YAML round-trip', () => {
      const a = new ERFObject();
      a.fromJSON(minimalERF);
      const b = new ERFObject();
      b.fromYAML(a.toYAML());
      expect(a.resources.length).toBe(b.resources.length);
    });
    it('TOML round-trip', () => {
      const a = new ERFObject();
      a.fromJSON(minimalERF);
      const b = new ERFObject();
      b.fromTOML(a.toTOML());
      expect(a.resources.length).toBe(b.resources.length);
    });
  });

  describe('KEYObject', () => {
    const minimalKEY: ReturnType<KEYObject['toJSON']> = { fileType: 'KEY ', FileVersion: 'V1  ', bifCount: 0, keyCount: 0, bifs: [], keys: [] };
    it('JSON round-trip', () => {
      const a = new KEYObject();
      a.fromJSON(minimalKEY);
      const b = new KEYObject();
      b.fromJSON(a.toJSON());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('XML round-trip', () => {
      const a = new KEYObject();
      a.fromJSON(minimalKEY);
      const b = new KEYObject();
      b.fromXML(a.toXML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('YAML round-trip', () => {
      const a = new KEYObject();
      a.fromJSON(minimalKEY);
      const b = new KEYObject();
      b.fromYAML(a.toYAML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
    it('TOML round-trip', () => {
      const a = new KEYObject();
      a.fromJSON(minimalKEY);
      const b = new KEYObject();
      b.fromTOML(a.toTOML());
      expectJSONEqual(a.toJSON(), b.toJSON());
    });
  });

  describe('TGAObject', () => {
    it('JSON round-trip', () => {
      const a = new TGAObject({ file: new Uint8Array(0), filename: '' });
      a.pixelData = new Uint8Array([255, 0, 0, 255]);
      const b = new TGAObject({ file: new Uint8Array(0), filename: '' });
      b.fromJSON(a.toJSON());
      expect(a.pixelData.length).toBe(b.pixelData.length);
      expect(a.filename).toBe(b.filename);
    });
    it('XML round-trip', () => {
      const a = new TGAObject({ file: new Uint8Array(0), filename: '' });
      a.pixelData = new Uint8Array([1, 2, 3, 4]);
      const b = new TGAObject({ file: new Uint8Array(0), filename: '' });
      b.fromXML(a.toXML());
      expect(a.pixelData.length).toBe(b.pixelData.length);
    });
    it('YAML round-trip', () => {
      const a = new TGAObject({ file: new Uint8Array(0), filename: '' });
      a.pixelData = new Uint8Array([1, 2]);
      const b = new TGAObject({ file: new Uint8Array(0), filename: '' });
      b.fromYAML(a.toYAML());
      expect(a.pixelData.length).toBe(b.pixelData.length);
    });
    it('TOML round-trip', () => {
      const a = new TGAObject({ file: new Uint8Array(0), filename: '' });
      a.pixelData = new Uint8Array([1, 2]);
      const b = new TGAObject({ file: new Uint8Array(0), filename: '' });
      b.fromTOML(a.toTOML());
      expect(a.pixelData.length).toBe(b.pixelData.length);
    });
  });
});

function makeMinimalLTR(): Uint8Array {
  const cc = 26;
  const bw = new BinaryWriter();
  bw.writeChars('LTR ');
  bw.writeChars('V1.0');
  bw.writeByte(cc);
  for (let i = 0; i < cc; i++) bw.writeSingle(1 / cc);
  for (let i = 0; i < cc; i++) bw.writeSingle(1 / cc);
  for (let i = 0; i < cc; i++) bw.writeSingle(1 / cc);
  for (let i = 0; i < cc; i++) {
    for (let j = 0; j < cc; j++) bw.writeSingle(1 / cc);
    for (let j = 0; j < cc; j++) bw.writeSingle(1 / cc);
    for (let j = 0; j < cc; j++) bw.writeSingle(1 / cc);
  }
  for (let i = 0; i < cc; i++) {
    for (let j = 0; j < cc; j++) {
      for (let k = 0; k < cc; k++) bw.writeSingle(1 / cc);
      for (let k = 0; k < cc; k++) bw.writeSingle(1 / cc);
      for (let k = 0; k < cc; k++) bw.writeSingle(1 / cc);
    }
  }
  return bw.buffer;
}

function makeMinimalBIF(): Uint8Array {
  const bw = new BinaryWriter(new Uint8Array(20 + 16));
  bw.writeChars('BIFF');
  bw.writeChars('V1  ');
  bw.writeUInt32(1);
  bw.writeUInt32(0);
  bw.writeUInt32(20);
  bw.writeUInt32(0);
  bw.writeUInt32(0);
  bw.writeUInt32(0);
  bw.writeUInt32(0);
  return bw.buffer;
}

function makeMinimalRIM(): Uint8Array {
  const RIM_HEADER = 160;
  const ENTRY = 34;
  const count = 1;
  const dataStart = RIM_HEADER + count * ENTRY;
  const resSize = 4;
  const total = dataStart + resSize;
  const bw = new BinaryWriter(new Uint8Array(Math.max(total, 512)));
  bw.writeString('RIM ');
  bw.writeString('V1.0');
  bw.writeBytes(new Uint8Array(4));
  bw.writeUInt32(count);
  bw.writeUInt32(RIM_HEADER);
  bw.writeBytes(new Uint8Array(RIM_HEADER - 20));
  bw.writeString('test'.padEnd(16, '\0').slice(0, 16));
  bw.writeUInt16(15);
  bw.writeUInt16(0);
  bw.writeUInt32(0);
  bw.writeUInt32(dataStart);
  bw.writeUInt32(resSize);
  bw.writeBytes(new Uint8Array(resSize));
  return bw.buffer.slice(0, total);
}
