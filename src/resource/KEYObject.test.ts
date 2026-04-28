import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApplicationEnvironment } from '@/enums/ApplicationEnvironment';
import { BIFManager } from '@/managers/BIFManager';
import { BIFObject } from '@/resource/BIFObject';
import { KEYObject } from '@/resource/KEYObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { ApplicationProfile } from '@/utility/ApplicationProfile';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';

describe('KEYObject', () => {
  function makeKeyBuffer(): Uint8Array {
    const bifNames = ['data\\test1.bif', 'data\\test2.bif'];
    const writer = new BinaryWriter();

    const headerSize = 8 + 4 + 4 + 4 + 4 + 4 + 4 + 32;
    const bifTableOffset = headerSize;
    const bifTableSize = bifNames.length * 12;
    const keyTableOffset = bifTableOffset + bifTableSize;
    const keyCount = 3;
    const keyTableSize = keyCount * 22;
    const namesOffset = keyTableOffset + keyTableSize;

    const nameBytes = bifNames.map((name) => new TextEncoder().encode(name));
    let currentNameOffset = namesOffset;

    writer.writeChars('KEY ');
    writer.writeChars('V1  ');
    writer.writeUInt32(bifNames.length);
    writer.writeUInt32(keyCount);
    writer.writeUInt32(bifTableOffset);
    writer.writeUInt32(keyTableOffset);
    writer.writeUInt32(2026);
    writer.writeUInt32(68);
    writer.writeBytes(new Uint8Array(32));

    const bifEntries = [
      { fileSize: 30, filenameOffset: currentNameOffset, filenameSize: nameBytes[0].length, drives: 0 },
      {
        fileSize: 20,
        filenameOffset: currentNameOffset + nameBytes[0].length,
        filenameSize: nameBytes[1].length,
        drives: 0,
      },
    ];
    currentNameOffset += nameBytes[0].length + nameBytes[1].length;

    for (const bif of bifEntries) {
      writer.writeUInt32(bif.fileSize);
      writer.writeUInt32(bif.filenameOffset);
      writer.writeUInt16(bif.filenameSize);
      writer.writeUInt16(bif.drives);
    }

    const keyEntries = [
      { resRef: 'test1', resType: ResourceTypes.txt, resId: 0 },
      { resRef: 'test2', resType: ResourceTypes.txt, resId: 1 },
      { resRef: 'test3', resType: ResourceTypes.txt, resId: (1 << 20) | 2 },
    ];

    for (const key of keyEntries) {
      const resrefBytes = new Uint8Array(16);
      new TextEncoder().encodeInto(key.resRef, resrefBytes);
      writer.writeBytes(resrefBytes);
      writer.writeUInt16(key.resType);
      writer.writeUInt32(key.resId);
    }

    for (const bytes of nameBytes) {
      writer.writeBytes(bytes);
    }

    return writer.buffer;
  }

  function makeBifBuffer(entries: { id: number; resType: number; payload: Uint8Array }[]): Uint8Array {
    const headerSize = 20;
    const tableSize = entries.length * 16;
    const totalDataSize = entries.reduce((sum, entry) => sum + entry.payload.length, 0);
    const buffer = new Uint8Array(headerSize + tableSize + totalDataSize);
    const view = new DataView(buffer.buffer);

    new TextEncoder().encodeInto('BIFF', new Uint8Array(buffer.buffer, 0, 4));
    new TextEncoder().encodeInto('V1  ', new Uint8Array(buffer.buffer, 4, 4));
    view.setUint32(8, entries.length, true);
    view.setUint32(12, 0, true);
    view.setUint32(16, headerSize, true);

    let payloadOffset = headerSize + tableSize;
    for (let index = 0; index < entries.length; index++) {
      const tableOffset = headerSize + index * 16;
      view.setUint32(tableOffset, entries[index].id, true);
      view.setUint32(tableOffset + 4, payloadOffset, true);
      view.setUint32(tableOffset + 8, entries[index].payload.length, true);
      view.setUint32(tableOffset + 12, entries[index].resType, true);
      buffer.set(entries[index].payload, payloadOffset);
      payloadOffset += entries[index].payload.length;
    }

    return buffer;
  }

  it('loadBuffer parses bif entries and key entries', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    expect(key.fileType).toBe('KEY ');
    expect(key.FileVersion).toBe('V1  ');
    expect(key.bifs).toHaveLength(2);
    expect(key.keys).toHaveLength(3);
    expect(key.bifs[0].filename.endsWith('test1.bif')).toBe(true);
    expect(key.bifs[1].filename.endsWith('test2.bif')).toBe(true);
    expect(key.keys[0].resRef).toBe('test1');
    expect(key.keys[2].resRef).toBe('test3');
  });

  it('getFileKey and getFileLabel resolve entries by id and type', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    expect(key.getFileKey('test2', ResourceTypes.txt)?.resId).toBe(1);
    expect(key.getFileLabel((1 << 20) | 2)).toBe('test3');
    expect(key.getFileKey('missing', ResourceTypes.txt)).toBeNull();
    expect(key.getFileLabel(999999)).toBeNull();
  });

  it('toJSON and fromJSON round-trip key metadata', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const json = key.toJSON();
    const reloaded = new KEYObject();
    reloaded.fromJSON(json);

    expect(reloaded.fileType).toBe('KEY ');
    expect(reloaded.FileVersion).toBe('V1  ');
    expect(reloaded.bifs).toHaveLength(2);
    expect(reloaded.keys).toHaveLength(3);
    expect(reloaded.getFileKey('test1', ResourceTypes.txt)?.resId).toBe(0);
  });

  it('loadFile reads a KEY from disk using the configured filesystem profile', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-key-'));
    const previousEnv = ApplicationProfile.ENV;
    const previousDirectory = ApplicationProfile.directory;
    const fileName = 'test.key';

    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = tempDir;
      fs.writeFileSync(path.join(tempDir, fileName), makeKeyBuffer());

      const key = new KEYObject();
      await key.loadFile(fileName);

      expect(key.bifs).toHaveLength(2);
      expect(key.keys).toHaveLength(3);
      expect(key.getFileKey('test2', ResourceTypes.txt)?.resId).toBe(1);
    } finally {
      ApplicationProfile.ENV = previousEnv;
      ApplicationProfile.directory = previousDirectory;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('exposes bif and resource index helpers', () => {
    const resId = (5 << 20) | 123;
    expect(KEYObject.getBIFIndex(resId)).toBe(5);
    expect(KEYObject.getBIFResourceIndex(resId)).toBe(123);
  });

  it('throws on invalid file type or version', () => {
    const badType = new Uint8Array(makeKeyBuffer());
    badType.set(new TextEncoder().encode('INV '), 0);
    expect(() => new KEYObject().loadBuffer(badType)).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );

    const badVersion = new Uint8Array(makeKeyBuffer());
    badVersion.set(new TextEncoder().encode('V2  '), 4);
    expect(() => new KEYObject().loadBuffer(badVersion)).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
  });

  it('rejects file shorter than the KEY header or with tables outside the buffer', () => {
    expect(() => new KEYObject().loadBuffer(new Uint8Array(32))).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
    const b = new Uint8Array(64);
    b.set(new TextEncoder().encode('KEY '), 0);
    b.set(new TextEncoder().encode('V1  '), 4);
    const v = new DataView(b.buffer);
    v.setUint32(8, 1, true);
    v.setUint32(12, 0, true);
    v.setUint32(16, 100, true);
    v.setUint32(20, 0, true);
    expect(() => new KEYObject().loadBuffer(b)).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('parses a minimal KEY V1 byte fixture (one BIF, one key entry)', () => {
    // 1 BIF (data\xoreos.bif, file size 76), 1 resource (ozymandias, TXT, resId 1)
    const keyData = new Uint8Array([
      // Header: "KEY " + "V1  "
      0x4b, 0x45, 0x59, 0x20, 0x56, 0x31, 0x20, 0x20,
      // bifCount=1, keyCount=1
      0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
      // offsetToFileTable=64, offsetToKeyTable=91
      0x40, 0x00, 0x00, 0x00, 0x5b, 0x00, 0x00, 0x00,
      // buildYear=0, buildDay=0
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // 32 bytes reserved
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // BIF entry: fileSize=76, filenameOffset=76, filenameSize=15, drives=0
      0x4c, 0x00, 0x00, 0x00, 0x4c, 0x00, 0x00, 0x00, 0x0f, 0x00, 0x00, 0x00,
      // Filename: "data\\xoreos.bif"
      0x64, 0x61, 0x74, 0x61, 0x5c, 0x78, 0x6f, 0x72, 0x65, 0x6f, 0x73, 0x2e, 0x62, 0x69, 0x66,
      // Key entry: resRef "ozymandias" (16 bytes padded), resType=0x000A (TXT), resId=1
      0x6f, 0x7a, 0x79, 0x6d, 0x61, 0x6e, 0x64, 0x69, 0x61, 0x73, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x01,
      0x00, 0x00, 0x00,
    ]);

    const key = new KEYObject();
    key.loadBuffer(keyData);

    expect(key.fileType).toBe('KEY ');
    expect(key.FileVersion).toBe('V1  ');
    expect(key.bifs).toHaveLength(1);
    expect(key.bifs[0].filename).toContain('xoreos.bif');
    expect(key.bifs[0].fileSize).toBe(76);
    expect(key.keys).toHaveLength(1);
    expect(key.keys[0].resRef).toBe('ozymandias');
    expect(key.keys[0].resType).toBe(ResourceTypes.txt);
    expect(key.keys[0].resId).toBe(1);
  });

  it('getFileKeyByRes returns matching key entry', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const res = { Id: 0, offset: 0, size: 0, resType: ResourceTypes.txt };
    const found = key.getFileKeyByRes(res);
    expect(found).toBeDefined();
    expect(found?.resRef).toBe('test1');
  });

  it('getFileKeyByRes returns undefined for unmatched resource', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const res = { Id: 9999, offset: 0, size: 0, resType: ResourceTypes.txt };
    expect(key.getFileKeyByRes(res)).toBeUndefined();
  });

  it('getFilesByResType returns matching resources across mapped BIF archives', () => {
    const key = new KEYObject();
    const previousBifs = BIFManager.bifs;

    key.loadBuffer(makeKeyBuffer());

    const bif0 = new BIFObject(
      makeBifBuffer([
        { id: 0, resType: ResourceTypes.txt, payload: new TextEncoder().encode('alpha') },
        { id: 1, resType: ResourceTypes.tga, payload: new TextEncoder().encode('skip') },
      ])
    );
    bif0.readFromMemory();

    const bif1 = new BIFObject(
      makeBifBuffer([{ id: (1 << 20) | 2, resType: ResourceTypes.txt, payload: new TextEncoder().encode('beta') }])
    );
    bif1.readFromMemory();

    BIFManager.bifs = new Map<number, BIFObject>([
      [0, bif0],
      [1, bif1],
    ]);

    try {
      const txtResources = key.getFilesByResType(ResourceTypes.txt);
      expect(txtResources).toHaveLength(2);
      expect(txtResources.map((resource) => resource.Id)).toEqual([0, (1 << 20) | 2]);
    } finally {
      BIFManager.bifs = previousBifs;
    }
  });

  it('getFileBuffer resolves key entries through BIFManager-backed archives', async () => {
    const key = new KEYObject();
    const previousBifs = BIFManager.bifs;

    key.loadBuffer(makeKeyBuffer());

    const bif0 = new BIFObject(
      makeBifBuffer([
        { id: 0, resType: ResourceTypes.txt, payload: new TextEncoder().encode('abc') },
        { id: 1, resType: ResourceTypes.txt, payload: new TextEncoder().encode('def') },
      ])
    );
    bif0.readFromMemory();

    const bif1 = new BIFObject(
      makeBifBuffer([{ id: (1 << 20) | 2, resType: ResourceTypes.txt, payload: new TextEncoder().encode('ghi') }])
    );
    bif1.readFromMemory();

    BIFManager.bifs = new Map<number, BIFObject>([
      [0, bif0],
      [1, bif1],
    ]);

    try {
      expect(new TextDecoder().decode(await key.getFileBuffer(key.getFileKey('test1', ResourceTypes.txt)!))).toBe(
        'abc'
      );
      expect(new TextDecoder().decode(await key.getFileBuffer(key.getFileKey('test2', ResourceTypes.txt)!))).toBe(
        'def'
      );
      expect(new TextDecoder().decode(await key.getFileBuffer(key.getFileKey('test3', ResourceTypes.txt)!))).toBe(
        'ghi'
      );
      expect(await key.getFileBuffer(null as any)).toEqual(new Uint8Array(0));
    } finally {
      BIFManager.bifs = previousBifs;
    }
  });

  // --- Serializer round-trips ---

  it('toXML and fromXML round-trip key metadata', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const xml = key.toXML();
    const reloaded = new KEYObject();
    reloaded.fromXML(xml);

    expect(reloaded.fileType).toBe('KEY ');
    expect(reloaded.bifs).toHaveLength(2);
    expect(reloaded.keys).toHaveLength(3);
  });

  it('toYAML and fromYAML round-trip key metadata', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const yaml = key.toYAML();
    const reloaded = new KEYObject();
    reloaded.fromYAML(yaml);

    expect(reloaded.fileType).toBe('KEY ');
    expect(reloaded.bifs).toHaveLength(2);
    expect(reloaded.keys).toHaveLength(3);
  });

  it('toTOML and fromTOML round-trip key metadata', () => {
    const key = new KEYObject();
    key.loadBuffer(makeKeyBuffer());

    const toml = key.toTOML();
    const reloaded = new KEYObject();
    reloaded.fromTOML(toml);

    expect(reloaded.fileType).toBe('KEY ');
    expect(reloaded.bifs).toHaveLength(2);
    expect(reloaded.keys).toHaveLength(3);
  });

  // --- BIF/resource index helpers with edge values ---

  it('strips the two high bits of key entry resId (30-bit value)', () => {
    const writer = new BinaryWriter();
    // Header: 4×8 uint32s + 32 bytes reserved = 64 bytes, then 0 BIF entries → key table.
    const bifTableOff = 64;
    const keyCount = 1;
    const keyTableOff = bifTableOff;
    const rawResId = 0xc0000003;
    const masked = rawResId & 0x3fffffff;

    writer.writeChars('KEY ');
    writer.writeChars('V1  ');
    writer.writeUInt32(0);
    writer.writeUInt32(keyCount);
    writer.writeUInt32(bifTableOff);
    writer.writeUInt32(keyTableOff);
    writer.writeUInt32(2020);
    writer.writeUInt32(1);
    writer.writeBytes(new Uint8Array(32));
    const resrefBytes = new Uint8Array(16);
    new TextEncoder().encodeInto('n', resrefBytes);
    writer.writeBytes(resrefBytes);
    writer.writeUInt16(ResourceTypes.mdl);
    writer.writeUInt32(rawResId);

    const key = new KEYObject();
    key.loadBuffer(writer.buffer);
    expect(key.keys[0].resId).toBe(masked);
  });

  it('getBIFIndex and getBIFResourceIndex handle zero and max values', () => {
    expect(KEYObject.getBIFIndex(0)).toBe(0);
    expect(KEYObject.getBIFResourceIndex(0)).toBe(0);
    // Typical multi-BIF id: BIF index 3, resource index 5
    const typicalId = (3 << 20) | 5;
    expect(KEYObject.getBIFIndex(typicalId)).toBe(3);
    expect(KEYObject.getBIFResourceIndex(typicalId)).toBe(5);
    // Max resource index (14 bits): 0x3FFF
    expect(KEYObject.getBIFResourceIndex(0x3fff)).toBe(0x3fff);
  });
});
