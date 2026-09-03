/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { ResourceTypes } from '@/resource/ResourceTypes';
import { RIMObject } from '@/resource/RIMObject';

describe('RIMObject', () => {
  it('builds an empty RIM as a 160-byte header', () => {
    const buf = RIMObject.buildFromResourceEntries([]);
    expect(buf.length).toBe(160);
  });

  it('round-trips resource metadata from buildFromResourceEntries', async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const buf = RIMObject.buildFromResourceEntries([
      { resRef: 'foo', resType: ResourceTypes.nss, data: payload },
    ]);

    const rim = new RIMObject(buf);
    await rim.load();

    expect(rim.header.fileType).toBe('RIM ');
    expect(rim.header.fileVersion).toBe('V1.0');
    expect(rim.header.resourceCount).toBe(1);
    const info = rim.getResourceInfo('foo', ResourceTypes.nss);
    expect(info).toBeTruthy();
    expect(info?.size).toBe(4);
    expect(rim.hasResource('foo', ResourceTypes.nss)).toBe(true);
  });
});
