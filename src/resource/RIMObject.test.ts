import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApplicationEnvironment } from '@/enums/ApplicationEnvironment';
import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { RIMObject } from '@/resource/RIMObject';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { ApplicationProfile } from '@/utility/ApplicationProfile';

describe('RIMObject', () => {
  function makeRimBuffer(options: { resourcesOffset?: number } = {}): Uint8Array {
    const writer = new BinaryWriter();
    const entryCount = 3;
    const resourcesOffset = options.resourcesOffset ?? 120;
    const entrySize = 32;
    const dataOffset = 120 + entryCount * entrySize;
    const payloads = [
      new TextEncoder().encode('abc'),
      new TextEncoder().encode('def'),
      new TextEncoder().encode('ghi'),
    ];

    writer.writeChars('RIM ');
    writer.writeChars('V1.0');
    writer.writeUInt32(0);
    writer.writeUInt32(entryCount);
    writer.writeUInt32(resourcesOffset);
    writer.writeBytes(new Uint8Array(120 - writer.tell()));

    let currentOffset = dataOffset;
    ['1', '2', '3'].forEach((resref, index) => {
      writer.writeString(resref.padEnd(16, '\0').slice(0, 16));
      writer.writeUInt16(ResourceTypes.txt);
      writer.writeUInt16(0);
      writer.writeUInt32(index);
      writer.writeUInt32(currentOffset);
      writer.writeUInt32(payloads[index].length);
      currentOffset += payloads[index].length;
    });

    payloads.forEach((payload) => writer.writeBytes(payload));
    return writer.buffer;
  }

  it('loads a synthetic RIM buffer and resolves resources by resref', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    expect(rim.header.fileType).toBe('RIM ');
    expect(rim.header.fileVersion).toBe('V1.0');
    expect(rim.resources).toHaveLength(3);

    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
  });

  it('loads vanilla-style RIMs with an implicit resource table offset of 0', async () => {
    const rim = new RIMObject(makeRimBuffer({ resourcesOffset: 0 }));
    await rim.load();

    expect(rim.header.resourcesOffset).toBe(120);
    expect(rim.resources).toHaveLength(3);
    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
    expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
  });

  it('loads a RIM from disk and preserves resource lookups', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-rim-'));
    const previousEnv = ApplicationProfile.ENV;
    const previousDirectory = ApplicationProfile.directory;
    const fileName = 'test.rim';

    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = tempDir;
      fs.writeFileSync(path.join(tempDir, fileName), makeRimBuffer());

      const rim = new RIMObject(fileName);
      await rim.load();

      expect(rim.header.fileType).toBe('RIM ');
      expect(rim.header.fileVersion).toBe('V1.0');
      expect(rim.resources).toHaveLength(3);
      expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
      expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
      expect(new TextDecoder().decode(await rim.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
    } finally {
      ApplicationProfile.ENV = previousEnv;
      ApplicationProfile.directory = previousDirectory;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('toJSON and fromJSON round-trip resource metadata', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    const reloaded = new RIMObject(makeRimBuffer());
    reloaded.fromJSON(rim.toJSON());

    expect(reloaded.header.fileType).toBe('RIM ');
    expect(reloaded.resources).toHaveLength(3);
    expect(reloaded.getResource('2', ResourceTypes.txt)?.size).toBe(3);
  });

  it('returns undefined for missing resources', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    expect(await rim.getResourceBufferByResRef('missing', ResourceTypes.txt)).toBeUndefined();
  });

  it('rejects invalid type, version, and malformed offsets', async () => {
    const badType = new Uint8Array(makeRimBuffer());
    badType.set(new TextEncoder().encode('BAD '), 0);
    await expect(new RIMObject(badType).load()).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');

    const badVersion = new Uint8Array(makeRimBuffer());
    badVersion.set(new TextEncoder().encode('V2.0'), 4);
    await expect(new RIMObject(badVersion).load()).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');

    const badOffset = new Uint8Array(makeRimBuffer());
    new DataView(badOffset.buffer).setUint32(16, 1000, true);
    await expect(new RIMObject(badOffset).load()).rejects.toThrow('Tried to save or load an unsupported or corrupted file.');
  });

  it('getResource returns undefined for non-existent resref', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    expect(rim.getResource('nonexistent', ResourceTypes.txt)).toBeUndefined();
  });

  it('hasResource reflects whether a resource exists', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    expect(rim.hasResource('1', ResourceTypes.txt)).toBe(true);
    expect(rim.hasResource('missing', ResourceTypes.txt)).toBe(false);
  });

  it('XML round-trip preserves RIM structure', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    const xml = rim.toXML();
    expect(xml.length).toBeGreaterThan(0);
    const reloaded = new RIMObject(makeRimBuffer());
    reloaded.fromXML(xml);
    expect(reloaded.header.fileType).toBe('RIM ');
    expect(reloaded.resources).toHaveLength(3);
  });

  it('YAML round-trip preserves RIM structure', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    const yaml = rim.toYAML();
    expect(yaml.length).toBeGreaterThan(0);
    const reloaded = new RIMObject(makeRimBuffer());
    reloaded.fromYAML(yaml);
    expect(reloaded.header.fileType).toBe('RIM ');
    expect(reloaded.resources).toHaveLength(3);
  });

  it('TOML round-trip preserves RIM structure', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    const toml = rim.toTOML();
    expect(toml.length).toBeGreaterThan(0);
    const reloaded = new RIMObject(makeRimBuffer());
    reloaded.fromTOML(toml);
    expect(reloaded.header.fileType).toBe('RIM ');
    expect(reloaded.resources).toHaveLength(3);
  });

  it('exportRawResource writes the selected payload to disk', async () => {
    const rim = new RIMObject(makeRimBuffer());
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-rim-export-'));

    try {
      await rim.load();

      const exported = await rim.exportRawResource(tempDir, '2', ResourceTypes.txt);
      const exportedPath = path.join(tempDir, '2.txt');

      expect(new TextDecoder().decode(exported)).toBe('def');
      expect(fs.existsSync(exportedPath)).toBe(true);
      expect(fs.readFileSync(exportedPath, 'utf8')).toBe('def');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fromBufferSync parses header without async load', () => {
    const rim = RIMObject.fromBufferSync(makeRimBuffer());
    expect(rim.header.fileType).toBe('RIM ');
    expect(rim.header.fileVersion).toBe('V1.0');
    expect(rim.resources).toHaveLength(3);
  });

  it('addResource increments resources and exports a reloadable mutated RIM buffer', async () => {
    const rim = new RIMObject(makeRimBuffer());
    await rim.load();

    rim.addResource('image', ResourceTypes.txt, new TextEncoder().encode('image data'));

    const reloaded = new RIMObject(rim.getExportBuffer());
    await reloaded.load();

    expect(reloaded.resources).toHaveLength(4);
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
    expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('image', ResourceTypes.txt))).toBe('image data');
  });

  it('export writes a mutated disk-backed RIM that can be reloaded with original and appended resources', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kotor-rim-mutate-'));
    const previousEnv = ApplicationProfile.ENV;
    const previousDirectory = ApplicationProfile.directory;
    const fileName = 'capsule.rim';

    try {
      ApplicationProfile.ENV = ApplicationEnvironment.ELECTRON;
      ApplicationProfile.directory = tempDir;
      fs.writeFileSync(path.join(tempDir, fileName), makeRimBuffer());

      const rim = new RIMObject(fileName);
      await rim.load();
      rim.addResource('image', ResourceTypes.txt, new TextEncoder().encode('image data'));
      await rim.export(fileName);

      const reloaded = new RIMObject(fileName);
      await reloaded.load();

      expect(reloaded.resources).toHaveLength(4);
      expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('1', ResourceTypes.txt))).toBe('abc');
      expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('2', ResourceTypes.txt))).toBe('def');
      expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('3', ResourceTypes.txt))).toBe('ghi');
      expect(new TextDecoder().decode(await reloaded.getResourceBufferByResRef('image', ResourceTypes.txt))).toBe('image data');
    } finally {
      ApplicationProfile.ENV = previousEnv;
      ApplicationProfile.directory = previousDirectory;
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
