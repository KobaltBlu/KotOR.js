/**
 * Nested item lists remain data-only until their owning facade realizes Items.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { NestedItemListSerializer } from '@engine/module/serialization/NestedItemListSerializer';

describe('NestedItemListSerializer', () => {
  it('preserves equipment slot type and inventory object id in DTOs', () => {
    const gff = new GFFObject();
    const equipment = gff.RootNode.addField(
      new GFFField(GFFDataType.LIST, 'Equip_ItemList'),
    );
    const equipped = new GFFStruct(0x20);
    equipped.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x1234);
    equipment.addChildStruct(equipped);

    const inventory = gff.RootNode.addField(new GFFField(GFFDataType.LIST, 'ItemList'));
    const carried = new GFFStruct(0);
    carried.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x5678);
    inventory.addChildStruct(carried);

    const equippedDtos = NestedItemListSerializer.readEquipment(gff.RootNode);
    const inventoryDtos = NestedItemListSerializer.readInventory(gff.RootNode);

    expect(equippedDtos).toHaveLength(1);
    expect(equippedDtos[0].slotType).toBe(0x20);
    expect(equippedDtos[0].objectId).toBe(0x1234);
    expect(equippedDtos[0].struct).toBe(equipped);
    expect(inventoryDtos[0].objectId).toBe(0x5678);
    expect(inventoryDtos[0].struct).toBe(carried);
    expect(inventoryDtos[0]).not.toHaveProperty('item');
  });
});
