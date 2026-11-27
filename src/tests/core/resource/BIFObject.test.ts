/**
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { BinaryWriter } from '@core/binary/BinaryWriter';

jest.mock('@core/filesystem/GameFileSystem', () => ({
  GameFileSystem: {
    open: jest.fn(),
    read: jest.fn(),
    close: jest.fn(),
  },
}));

import { GameFileSystem } from '@core/filesystem/GameFileSystem';
import { BIFObject } from '@core/resource/BIFObject';

function buildBifWithOneResource(): Uint8Array {
  const headerSize = 20;
  const tableOffset = headerSize;
  const dataOffset = tableOffset + 16;
  const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

  const w = new BinaryWriter();
  w.writeChars('BIFF');
  w.writeChars('V1  ');
  w.writeUInt32(1); // variableResourceCount
  w.writeUInt32(0); // fixedResourceCount
  w.writeUInt32(tableOffset);
  w.writeUInt32(7); // Id
  w.writeUInt32(dataOffset);
  w.writeUInt32(payload.length);
  w.writeUInt32(2025); // resType uti
  w.writeBytes(payload);
  return w.buffer;
}

describe('BIFObject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores an in-memory buffer but does not parse it yet', async () => {
    const buf = buildBifWithOneResource();
    const bif = new BIFObject(buf);
    expect(bif.inMemory).toBe(true);
    expect(bif.buffer).toBe(buf);
    await bif.load();
    expect(bif.resources).toEqual([]);
  });

  it('parses a minimal BIF from a mocked disk read', async () => {
    const buf = buildBifWithOneResource();
    const fd = 1;
    (GameFileSystem.open as jest.Mock).mockResolvedValue(fd);
    (GameFileSystem.close as jest.Mock).mockResolvedValue(undefined);
    (GameFileSystem.read as jest.Mock).mockImplementation(
      async (_fd: number, dest: Uint8Array, _offset: number, length: number, position: number) => {
        dest.set(buf.subarray(position, position + length));
        return { bytesRead: length, buffer: dest };
      }
    );

    const bif = new BIFObject('data/test.bif');
    await bif.load();
    expect(bif.fileType).toBe('BIFF');
    expect(bif.fileVersion).toBe('V1  ');
    expect(bif.variableResourceCount).toBe(1);
    expect(bif.resources[0].Id).toBe(7);
    expect(bif.resources[0].size).toBe(4);
    expect(bif.resources[0].resType).toBe(2025);
    expect(bif.getResourceById(7)?.offset).toBe(36);
    expect(bif.getResourcesByType(2025)).toHaveLength(1);
  });
});
