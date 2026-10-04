/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { TLKStringFlags } from '@core/enums/resource/TLKStringFlags';
import { TLKObject } from '@core/resource/TLKObject';
import { TLKString } from '@core/resource/TLKString';

describe('TLKObject', () => {
  it('round-trips a single string entry', () => {
    const tlk = new TLKObject();
    tlk.FileType = 'TLK ';
    tlk.FileVersion = 'V3.0';
    tlk.LanguageID = 0;
    const entry = TLKString.createEmpty();
    entry.Value = 'Hello';
    entry.flags = TLKStringFlags.TEXT_PRESENT;
    tlk.appendString(entry);

    const buf = tlk.toExportBuffer();
    expect(buf.length).toBeGreaterThanOrEqual(20 + 40 + 5);

    const loaded = new TLKObject();
    loaded.loadFromBuffer(buf);
    expect(loaded.FileType).toBe('TLK ');
    expect(loaded.FileVersion).toBe('V3.0');
    expect(loaded.StringCount).toBe(1);
    expect(loaded.GetStringById(0)).toBe('Hello');
  });

  it('exports an empty talk table as a 20-byte header', () => {
    const tlk = new TLKObject();
    tlk.FileType = 'TLK ';
    tlk.FileVersion = 'V3.0';
    tlk.LanguageID = 0;
    tlk.TLKStrings = [];
    const buf = tlk.toExportBuffer();
    expect(buf.length).toBe(20);
  });
});
