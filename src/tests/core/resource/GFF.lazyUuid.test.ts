/**
 * @jest-environment node
 *
 * GFFField / GFFStruct uuids are generated on first read, then stay stable per
 * instance (Forge uses them for React keys, data-uuid and undo coalescing).
 */
import { describe, expect, jest, test } from '@jest/globals';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { GFFDataType } from '@core/enums/resource/GFFDataType';

describe('GFF lazy uuid', () => {
  test('construction does not generate uuids', () => {
    const spy = jest.spyOn(crypto, 'randomUUID');
    const s = new GFFStruct(7);
    s.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag', 'x'));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test('uuid is stable once read and unique per instance', () => {
    const a = new GFFField(GFFDataType.INT, 'A', 1);
    const b = new GFFField(GFFDataType.INT, 'A', 1);
    const sa = new GFFStruct();
    const sb = new GFFStruct();
    expect(a.uuid).toBe(a.uuid);
    expect(sa.uuid).toBe(sa.uuid);
    expect(a.uuid).not.toBe(b.uuid);
    expect(sa.uuid).not.toBe(sb.uuid);
    expect(a.uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('uuid can be assigned', () => {
    const f = new GFFField(GFFDataType.INT, 'A', 1);
    f.uuid = 'fixed';
    expect(f.uuid).toBe('fixed');
    const s = new GFFStruct();
    s.uuid = 'fixed-struct';
    expect(s.uuid).toBe('fixed-struct');
  });
});
