/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { ERFObject } from '@/resource/ERFObject';
import { ResourceTypes } from '@/resource/ResourceTypes';

describe('ERFObject', () => {
  it('exports an empty MOD archive as a 160-byte header', () => {
    const erf = new ERFObject();
    erf.header.fileType = 'MOD ';
    erf.header.fileVersion = 'V1.0';
    const buf = erf.getExportBuffer();
    expect(buf.length).toBe(160);
  });

  it('round-trips a single resource entry', async () => {
    const erf = new ERFObject();
    erf.header.fileType = 'MOD ';
    erf.header.fileVersion = 'V1.0';
    const payload = new TextEncoder().encode('hi');
    erf.addResource('test', ResourceTypes.uti, payload);

    const buf = erf.getExportBuffer();
    const loaded = new ERFObject(buf);
    await loaded.load();

    expect(loaded.header.fileType).toBe('MOD ');
    expect(loaded.header.entryCount).toBe(1);
    expect(loaded.keyList[0].resRef).toBe('test');
    expect(loaded.keyList[0].resType).toBe(ResourceTypes.uti);
    expect(loaded.resources[0].size).toBe(payload.length);

    const data = await loaded.getResourceBuffer(loaded.resources[0]);
    expect(Array.from(data)).toEqual(Array.from(payload));
  });
});
