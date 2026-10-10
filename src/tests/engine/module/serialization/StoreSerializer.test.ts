/**
 * Store inventory hydration remains a pending, data-only operation.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { storeSerializer } from '@engine/module/serialization/StoreSerializer';

describe('StoreSerializer', () => {
  it('captures ItemList Infinite metadata as pending inventory DTOs', () => {
    const gff = new GFFObject();
    const list = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    const item = new GFFStruct(0);
    item.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x6006);
    item.addField(new GFFField(GFFDataType.BYTE, 'Infinite')).setValue(1);
    item.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('stock_item');
    list.addChildStruct(item);

    const target: any = {
      initialized: false,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    };
    storeSerializer.deserialize(target, gff);

    expect(target._pendingInventoryEntries).toHaveLength(1);
    expect(target._pendingInventoryEntries[0].objectId).toBe(0x6006);
    expect(
      target._pendingInventoryEntries[0].struct.getFieldByLabel('Infinite').getValue(),
    ).toBe(1);
    expect(target.inventory).toBeUndefined();
  });
});
