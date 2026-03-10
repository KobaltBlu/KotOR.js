import { KEYObject } from '@/resource/KEYObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
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
      { fileSize: 20, filenameOffset: currentNameOffset + nameBytes[0].length, filenameSize: nameBytes[1].length, drives: 0 },
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

  it('exposes bif and resource index helpers', () => {
    const resId = (5 << 20) | 123;
    expect(KEYObject.getBIFIndex(resId)).toBe(5);
    expect(KEYObject.getBIFResourceIndex(resId)).toBe(123);
  });

  it('throws on invalid file type or version', () => {
    const badType = new Uint8Array(makeKeyBuffer());
    badType.set(new TextEncoder().encode('INV '), 0);
    expect(() => new KEYObject().loadBuffer(badType)).toThrow('Tried to save or load an unsupported or corrupted file.');

    const badVersion = new Uint8Array(makeKeyBuffer());
    badVersion.set(new TextEncoder().encode('V2  '), 4);
    expect(() => new KEYObject().loadBuffer(badVersion)).toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  // --- Vendor-derived: xoreos reference data (byte-exact golden blob) ---

  it('parses xoreos-style KEY V1 reference binary', () => {
    // Exact byte sequence from xoreos-tools keyfile.cpp test reference:
    // 1 BIF ("data\\xoreos.bif", filesize=76), 1 resource ("ozymandias", TXT, resId=1)
    const keyData = new Uint8Array([
      // Header: "KEY " + "V1  "
      0x4B, 0x45, 0x59, 0x20, 0x56, 0x31, 0x20, 0x20,
      // bifCount=1, keyCount=1
      0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
      // offsetToFileTable=64, offsetToKeyTable=91
      0x40, 0x00, 0x00, 0x00, 0x5B, 0x00, 0x00, 0x00,
      // buildYear=0, buildDay=0
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // 32 bytes reserved
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      // BIF entry: fileSize=76, filenameOffset=76, filenameSize=15, drives=0
      0x4C, 0x00, 0x00, 0x00, 0x4C, 0x00, 0x00, 0x00,
      0x0F, 0x00, 0x00, 0x00,
      // Filename: "data\\xoreos.bif"
      0x64, 0x61, 0x74, 0x61, 0x5C, 0x78, 0x6F, 0x72,
      0x65, 0x6F, 0x73, 0x2E, 0x62, 0x69, 0x66,
      // Key entry: resRef "ozymandias" (16 bytes padded), resType=0x000A (TXT), resId=1
      0x6F, 0x7A, 0x79, 0x6D, 0x61, 0x6E, 0x64, 0x69,
      0x61, 0x73, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x0A, 0x00,
      0x01, 0x00, 0x00, 0x00,
    ]);

    const key = new KEYObject();
    key.loadBuffer(keyData);

    expect(key.fileType).toBe('KEY ');
    expect(key.FileVersion).toBe('V1  ');
    expect(key.bifs).toHaveLength(1);
    // KEYObject normalises path separators; on Windows it becomes data\xoreos.bif
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

  it('getBIFIndex and getBIFResourceIndex handle zero and max values', () => {
    expect(KEYObject.getBIFIndex(0)).toBe(0);
    expect(KEYObject.getBIFResourceIndex(0)).toBe(0);
    // Typical multi-BIF id: BIF index 3, resource index 5
    const typicalId = (3 << 20) | 5;
    expect(KEYObject.getBIFIndex(typicalId)).toBe(3);
    expect(KEYObject.getBIFResourceIndex(typicalId)).toBe(5);
    // Max resource index (14 bits): 0x3FFF
    expect(KEYObject.getBIFResourceIndex(0x3FFF)).toBe(0x3FFF);
  });
});

