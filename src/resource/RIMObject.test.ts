import { BinaryWriter } from '@/utility/binary/BinaryWriter';
import { RIMObject } from '@/resource/RIMObject';
import { ResourceTypes } from '@/resource/ResourceTypes';

describe('RIMObject', () => {
  function makeRimBuffer(): Uint8Array {
    const writer = new BinaryWriter();
    const entryCount = 3;
    const resourcesOffset = 120;
    const entrySize = 32;
    const dataOffset = resourcesOffset + entryCount * entrySize;
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
    writer.writeBytes(new Uint8Array(resourcesOffset - writer.tell()));

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

  it('fromBufferSync parses header without async load', () => {
    const rim = RIMObject.fromBufferSync(makeRimBuffer());
    expect(rim.header.fileType).toBe('RIM ');
    expect(rim.header.fileVersion).toBe('V1.0');
    expect(rim.resources).toHaveLength(3);
  });
});
