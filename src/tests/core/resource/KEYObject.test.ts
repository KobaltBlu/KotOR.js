/**
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { BinaryWriter } from '@core/binary/BinaryWriter';

jest.mock('@core/filesystem/GameFileSystem', () => ({
  GameFileSystem: {
    readFile: jest.fn(),
  },
}));

import { GameFileSystem } from '@core/filesystem/GameFileSystem';
import { KEYObject } from '@core/resource/KEYObject';

function buildEmptyKey(): Uint8Array {
  const w = new BinaryWriter();
  w.writeChars('KEY ');
  w.writeChars('V1  ');
  w.writeUInt32(0); // bifCount
  w.writeUInt32(0); // keyCount
  w.writeUInt32(64); // offsetToFileTable
  w.writeUInt32(64); // offsetToKeyTable
  w.writeUInt32(0); // buildYear
  w.writeUInt32(0); // buildDay
  w.writeBytes(new Uint8Array(32)); // reserved
  return w.buffer;
}

function buildKeyWithOneEntry(): Uint8Array {
  const filename = 'data\\test.bif';
  const headerSize = 64;
  const bifTableSize = 12;
  const filenameOffset = headerSize + bifTableSize;
  const keyTableOffset = filenameOffset + filename.length;

  const w = new BinaryWriter();
  w.writeChars('KEY ');
  w.writeChars('V1  ');
  w.writeUInt32(1);
  w.writeUInt32(1);
  w.writeUInt32(headerSize);
  w.writeUInt32(keyTableOffset);
  w.writeUInt32(2003);
  w.writeUInt32(100);
  w.writeBytes(new Uint8Array(32));

  w.writeUInt32(20); // fileSize
  w.writeUInt32(filenameOffset);
  w.writeUInt16(filename.length);
  w.writeUInt16(0); // drives
  w.writeChars(filename);

  const resRef = 'sample'.padEnd(16, '\0');
  w.writeChars(resRef);
  w.writeUInt16(2025); // uti
  w.writeUInt32(0); // resId
  return w.buffer;
}

describe('KEYObject', () => {
  beforeEach(() => {
    (GameFileSystem.readFile as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts with an empty key table', () => {
    const key = new KEYObject();
    expect(key.keys).toEqual([]);
  });

  it('loads an empty KEY buffer via GameFileSystem', async () => {
    (GameFileSystem.readFile as jest.Mock).mockResolvedValue(buildEmptyKey());
    const key = new KEYObject();
    await key.loadFile('chitin.key');
    expect(key.fileType).toBe('KEY ');
    expect(key.FileVersion).toBe('V1  ');
    expect(key.bifCount).toBe(0);
    expect(key.keyCount).toBe(0);
    expect(key.keys).toEqual([]);
  });

  it('loads a KEY with one BIF and one resource entry', async () => {
    (GameFileSystem.readFile as jest.Mock).mockResolvedValue(buildKeyWithOneEntry());
    const key = new KEYObject();
    await key.loadFile('chitin.key');
    expect(key.bifCount).toBe(1);
    expect(key.keyCount).toBe(1);
    expect(key.bifs[0].filename.replace(/\\/g, '/')).toMatch(/test\.bif$/);
    expect(key.keys[0].resRef).toBe('sample');
    expect(key.keys[0].resType).toBe(2025);
    expect(key.getFileKey('sample', 2025)?.resId).toBe(0);
  });

  it('decodes ResID bif / resource indices', () => {
    const resId = (3 << 20) | 42;
    expect(KEYObject.getBIFIndex(resId)).toBe(3);
    expect(KEYObject.getBIFResourceIndex(resId)).toBe(42);
  });
});
