/**
 * AreaMap GIT exploration-data schema.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFStruct } from '@core/resource/GFFStruct';
import { AreaMap } from '@engine/module/area/AreaMap';
import { AreaMapSerializer } from '@engine/module/serialization/AreaMapSerializer';

describe('AreaMapSerializer', () => {
  it('writes the observed AreaMap data fields', () => {
    const root = new GFFStruct();
    const areaMap = new AreaMap();
    areaMap.setResX(10);

    const field = AreaMapSerializer.writeField(root, areaMap);
    const data = field.getChildStructs()[0];

    expect(field.getLabel()).toBe('AreaMap');
    expect(data.getType()).toBe(0x65);
    expect(data.hasField('AreaMapData')).toBe(true);
    expect(data.hasField('AreaMapDataSize')).toBe(true);
    expect(data.hasField('AreaMapResX')).toBe(true);
    expect(data.hasField('AreaMapResY')).toBe(true);
  });

  it('loads GIT exploration data into an existing map', () => {
    const root = new GFFStruct();
    const source = new AreaMap();
    source.setResX(12);
    AreaMapSerializer.writeField(root, source);
    const target = new AreaMap();

    AreaMapSerializer.deserialize(target, root);

    expect(target.mapResX).toBe(source.mapResX);
    expect(target.mapResY).toBe(source.mapResY);
    expect(target.dataSize).toBe(source.dataSize);
  });
});
