/**
 * Placeable inventory hydration remains pending until the facade realizes Items.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { placeableSerializer } from '@engine/module/serialization/PlaceableSerializer';

describe('PlaceableSerializer', () => {
  it('captures ItemList as pending inventory entries', () => {
    const gff = new GFFObject();
    const list = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    const item = new GFFStruct(0);
    item.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x7007);
    list.addChildStruct(item);

    const target: any = {
      initialized: false,
      animState: 1,
      isOpen: () => true,
      setAnimationState: jest.fn(),
      setOpenState: jest.fn(),
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      rotation: { z: 0 },
      scriptResRefs: {},
      effects: [],
    };
    placeableSerializer.deserialize(target, gff);

    expect(target._pendingInventoryEntries).toHaveLength(1);
    expect(target._pendingInventoryEntries[0].objectId).toBe(0x7007);
    expect(target._pendingInventoryEntries[0].struct).toBe(item);
    expect(target.inventory).toBeUndefined();
  });
});
