import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApplicationEnvironment } from '@/enums/ApplicationEnvironment';
import { KEYManager } from '@/managers/KEYManager';
import { BIFObject } from '@/resource/BIFObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { ApplicationProfile } from '@/utility/ApplicationProfile';

describe('BIFObject', () => {
  /**
   * Build a minimal BIF buffer with a configurable number of resources.
   * When `resources` is omitted, falls back to the original single-resource builder.
   */
  function makeBifBuffer(
    options: {
      fileType?: string;
      fileVersion?: string;
      resourceSize?: number;
      resourceType?: number;
      resources?: { id: number; size: number; resType: number; data: Uint8Array }[];
    } = {}
  ): Uint8Array {
    const { fileType = 'BIFF', fileVersion = 'V1  ', resourceSize = 4, resourceType = 0x0f } = options;

    const bifBuf = new Uint8Array(20 + 16 + resourceSize);
    const view = new DataView(bifBuf.buffer);
    new TextEncoder().encodeInto(fileType, new Uint8Array(bifBuf.buffer, 0, 4));
    new TextEncoder().encodeInto(fileVersion, new Uint8Array(bifBuf.buffer, 4, 4));
    view.setUint32(8, 1, true);
    view.setUint32(12, 0, true);
    view.setUint32(16, 20, true);
    view.setUint32(20, 20971520, true);
    view.setUint32(24, 36, true);
    view.setUint32(28, resourceSize, true);
    view.setUint32(32, resourceType, true);

    for (let index = 0; index < resourceSize; index++) {
      bifBuf[36 + index] = 0x61 + index;
    }

    return bifBuf;
  }

  /** Build a BIF with multiple index rows and matching payload blocks. */
  function makeMultiResourceBif(entries: { id: number; resType: number; payload: Uint8Array }[]): Uint8Array {
    const headerSize = 20;
    const tableSize = entries.length * 16;
    let dataOffset = headerSize + tableSize;
    const totalDataSize = entries.reduce((sum, e) => sum + e.payload.length, 0);
    const buf = new Uint8Array(headerSize + tableSize + totalDataSize);
    const view = new DataView(buf.buffer);

    new TextEncoder().encodeInto('BIFF', new Uint8Array(buf.buffer, 0, 4));
    new TextEncoder().encodeInto('V1  ', new Uint8Array(buf.buffer, 4, 4));
    view.setUint32(8, entries.length, true); // variableResourceCount
    view.setUint32(12, 0, true); // fixedResourceCount
    view.setUint32(16, headerSize, true); // variableTableOffset

    let payloadCursor = headerSize + tableSize;
    for (let i = 0; i < entries.length; i++) {
      const off = headerSize + i * 16;
      view.setUint32(off, entries[i].id, true);
      view.setUint32(off + 4, payloadCursor, true);
      view.setUint32(off + 8, entries[i].payload.length, true);
      view.setUint32(off + 12, entries[i].resType, true);
      buf.set(entries[i].payload, payloadCursor);
      payloadCursor += entries[i].payload.length;
    }
    return buf;
  }

  it('readFromMemory parses minimal BIF buffer and getResourceBuffer returns slice', async () => {
    const bifBuf = makeBifBuffer();

    const bif = new BIFObject(bifBuf);
    bif.readFromMemory();
    expect(bif.fileType).toBe('BIFF');
    expect(bif.variableResourceCount).toBe(1);
    expect(bif.resources.length).toBe(1);
    expect(bif.resources[0].Id).toBe(20971520);
    expect(bif.resources[0].offset).toBe(36);
    expect(bif.resources[0].size).toBe(4);
    expect(bif.resources[0].resType).toBe(0x0f);

    const chunk = await bif.getResourceBuffer(bif.resources[0]);
    expect(chunk.length).toBe(4);
    expect(chunk[0]).toBe(0x61);
    expect(chunk[1]).toBe(0x62);
    expect(chunk[2]).toBe(0x63);
    expect(chunk[3]).toBe(0x64);
  });

  it('getResourceById and getResourcesByType resolve parsed entries', () => {
    const bif = new BIFObject(makeBifBuffer({ resourceType: 2017 }));
    bif.readFromMemory();

    expect(bif.getResourceById(20971520)).toEqual(bif.resources[0]);
    expect(bif.getResourceById(123)).toBeNull();
    expect(bif.getResourcesByType(2017)).toEqual([bif.resources[0]]);
    expect(bif.getResourcesByType(9999)).toEqual([]);
  });

  it('readFromMemory throws when buffer too short for header', () => {
    const bif = new BIFObject(new Uint8Array(10));
    expect(() => bif.readFromMemory()).toThrow('BIF buffer too short for header');
  });

  it('readFromMemory throws when not in memory', () => {
    const bif = new BIFObject('/some/path.bif');
    expect(() => bif.readFromMemory()).toThrow('in-memory buffer');
  });

  it('load() populates from buffer when in memory', async () => {
    const bif = new BIFObject(makeBifBuffer({ resourceSize: 0 }));
    await bif.load();
    expect(bif.fileType).toBe('BIFF');
    expect(bif.resources.length).toBe(1);
    expect(await bif.getResourceBuffer(bif.resources[0])).toEqual(new Uint8Array(0));
  });

  it('load() reads a BIF from disk and exposes the same resource slices', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-bif-'));
    const previousEnv = ApplicationProfile.ENV;
    const previousDirectory = ApplicationProfile.directory;
    const fileName = 'test.bif';
    const entries = [
      { id: 0, resType: ResourceTypes.txt, payload: new TextEncoder().encode('disk one') },
      { id: 1, resType: ResourceTypes.txt, payload: new TextEncoder().encode('disk two') },
    ];

    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = tempDir;
      fs.writeFileSync(path.join(tempDir, fileName), makeMultiResourceBif(entries));
      const bif = new BIFObject(fileName);
      await bif.load();

      expect(bif.fileType).toBe('BIFF');
      expect(bif.variableResourceCount).toBe(2);
      expect(new TextDecoder().decode(await bif.getResourceBuffer(bif.resources[0]))).toBe('disk one');
      expect(new TextDecoder().decode(await bif.getResourceBuffer(bif.resources[1]))).toBe('disk two');
    } finally {
      ApplicationProfile.ENV = previousEnv;
      ApplicationProfile.directory = previousDirectory;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('toJSON and fromJSON round-trip parsed metadata', () => {
    const bif = new BIFObject(makeBifBuffer());
    bif.readFromMemory();

    const reloaded = new BIFObject(new Uint8Array(0));
    reloaded.fromJSON(bif.toJSON());

    expect(reloaded.fileType).toBe('BIFF');
    expect(reloaded.fileVersion).toBe('V1  ');
    expect(reloaded.variableResourceCount).toBe(1);
    expect(reloaded.resources).toEqual(bif.resources);
  });

  it('rejects invalid type and version headers', () => {
    expect(() => new BIFObject(makeBifBuffer({ fileType: 'BZF ' })).readFromMemory()).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
    expect(() => new BIFObject(makeBifBuffer({ fileVersion: 'V2  ' })).readFromMemory()).toThrow(
      'Tried to save or load an unsupported or corrupted file.'
    );
  });

  // --- Vendor-derived: multi-resource parsing (mirrors test_bif_write / test_bif_real_file) ---

  it('readFromMemory parses multiple resources and getResourceBuffer returns correct slices', async () => {
    const entries = [
      { id: 0, resType: 0x0a, payload: new TextEncoder().encode('Hello World 1') },
      { id: 1, resType: 0x0a, payload: new TextEncoder().encode('Hello World 2') },
      { id: 2, resType: 0x0a, payload: new TextEncoder().encode('Hello World 3') },
    ];
    const buf = makeMultiResourceBif(entries);
    const bif = new BIFObject(buf);
    bif.readFromMemory();

    expect(bif.variableResourceCount).toBe(3);
    expect(bif.resources).toHaveLength(3);

    for (let i = 0; i < 3; i++) {
      expect(bif.resources[i].Id).toBe(entries[i].id);
      expect(bif.resources[i].resType).toBe(entries[i].resType);
      expect(bif.resources[i].size).toBe(entries[i].payload.length);
      const data = await bif.getResourceBuffer(bif.resources[i]);
      expect(new TextDecoder().decode(data)).toBe(`Hello World ${i + 1}`);
    }
  });

  it('getResourcesByType filters correctly across multiple resources', () => {
    const entries = [
      { id: 0, resType: 0x0a, payload: new Uint8Array([1]) },
      { id: 1, resType: 0x0f, payload: new Uint8Array([2]) },
      { id: 2, resType: 0x0a, payload: new Uint8Array([3]) },
    ];
    const bif = new BIFObject(makeMultiResourceBif(entries));
    bif.readFromMemory();

    expect(bif.getResourcesByType(0x0a)).toHaveLength(2);
    expect(bif.getResourcesByType(0x0f)).toHaveLength(1);
    expect(bif.getResourcesByType(0xff)).toHaveLength(0);
  });

  it('getResourceBuffer returns empty Uint8Array for undefined or zero-size resource', async () => {
    const bif = new BIFObject(makeBifBuffer());
    bif.readFromMemory();

    expect(await bif.getResourceBuffer(undefined as any)).toEqual(new Uint8Array(0));
    expect(await bif.getResourceBuffer({ Id: 0, offset: 0, size: 0, resType: 0 })).toEqual(new Uint8Array(0));
  });

  it('getResource and getResourceBufferByResRef resolve through KEYManager mappings', async () => {
    const previousKey = KEYManager.Key;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const bif = new BIFObject(
      makeMultiResourceBif([
        { id: 0, resType: ResourceTypes.txt, payload: new TextEncoder().encode('alpha') },
        { id: 1, resType: ResourceTypes.txt, payload: new TextEncoder().encode('beta') },
      ])
    );
    bif.readFromMemory();

    KEYManager.Key = {
      keys: [
        { resRef: 'alpha_ref', resType: ResourceTypes.txt, resId: 0 },
        { resRef: 'beta_ref', resType: ResourceTypes.txt, resId: 1 },
      ],
    } as any;

    try {
      expect(bif.getResource('alpha_ref', ResourceTypes.txt)?.Id).toBe(0);
      expect(bif.getResource('missing', ResourceTypes.txt)).toBeUndefined();
      expect(new TextDecoder().decode(await bif.getResourceBufferByResRef('beta_ref', ResourceTypes.txt))).toBe('beta');
      expect(await bif.getResourceBufferByResRef('missing', ResourceTypes.txt)).toEqual(new Uint8Array(0));
    } finally {
      errorSpy.mockRestore();
      KEYManager.Key = previousKey;
    }
  });

  // --- Serializer round-trips (XML, YAML, TOML) ---

  it('toXML and fromXML round-trip parsed metadata', () => {
    const bif = new BIFObject(makeBifBuffer());
    bif.readFromMemory();

    const xml = bif.toXML();
    const reloaded = new BIFObject(new Uint8Array(0));
    reloaded.fromXML(xml);

    expect(reloaded.fileType).toBe('BIFF');
    expect(reloaded.variableResourceCount).toBe(1);
    expect(reloaded.resources).toEqual(bif.resources);
  });

  it('toYAML and fromYAML round-trip parsed metadata', () => {
    const bif = new BIFObject(makeBifBuffer());
    bif.readFromMemory();

    const yaml = bif.toYAML();
    const reloaded = new BIFObject(new Uint8Array(0));
    reloaded.fromYAML(yaml);

    expect(reloaded.fileType).toBe('BIFF');
    expect(reloaded.variableResourceCount).toBe(1);
    expect(reloaded.resources).toEqual(bif.resources);
  });

  it('toTOML and fromTOML round-trip parsed metadata', () => {
    const bif = new BIFObject(makeBifBuffer());
    bif.readFromMemory();

    const toml = bif.toTOML();
    const reloaded = new BIFObject(new Uint8Array(0));
    reloaded.fromTOML(toml);

    expect(reloaded.fileType).toBe('BIFF');
    expect(reloaded.variableResourceCount).toBe(1);
    expect(reloaded.resources).toEqual(bif.resources);
  });

  // --- Write-path round-trip: build ↔ re-parse preserves byte size ---

  it('round-trip via buffer preserves resource count and payload sizes', async () => {
    const entries = [
      { id: 100, resType: 0x0a, payload: new TextEncoder().encode('alpha') },
      { id: 101, resType: 0x0f, payload: new TextEncoder().encode('bravo') },
    ];
    const buf = makeMultiResourceBif(entries);
    const bif1 = new BIFObject(buf);
    bif1.readFromMemory();

    // Re-parse the same buffer
    const bif2 = new BIFObject(buf);
    bif2.readFromMemory();

    expect(bif2.variableResourceCount).toBe(bif1.variableResourceCount);
    for (let i = 0; i < bif1.resources.length; i++) {
      expect(bif2.resources[i].size).toBe(bif1.resources[i].size);
      const d1 = await bif1.getResourceBuffer(bif1.resources[i]);
      const d2 = await bif2.getResourceBuffer(bif2.resources[i]);
      expect(d2).toEqual(d1);
    }
  });
});
