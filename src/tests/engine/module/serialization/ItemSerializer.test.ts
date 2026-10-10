/**
 * ItemSerializer nested GFFStruct round-trip (duck-typed runtime source).
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFField } from '@core/resource/GFFField';
import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { itemSerializer } from '@engine/module/serialization/ItemSerializer';

describe('ItemSerializer', () => {
  function makeTemplate(): GFFObject {
    const gff = new GFFObject();
    gff.RootNode.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(0x5005);
    gff.RootNode.addField(new GFFField(GFFDataType.INT, 'BaseItem')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.CEXOSTRING, 'Tag')).setValue('item_test');
    gff.RootNode.addField(new GFFField(GFFDataType.RESREF, 'InventoryRes')).setValue('item_test');
    gff.RootNode.addField(new GFFField(GFFDataType.WORD, 'StackSize')).setValue(3);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Identified')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Infinite')).setValue(0);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'XPosition')).setValue(1);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'YPosition')).setValue(2);
    gff.RootNode.addField(new GFFField(GFFDataType.FLOAT, 'ZPosition')).setValue(3);
    return gff;
  }

  function makeRuntimeItem(): any {
    const item: any = {
      initialized: false,
      id: 0,
      tag: '',
      baseItemId: 0,
      baseItem: undefined,
      stackSize: 1,
      identified: 0,
      infinite: 0,
      inventoryRes: '',
      description: undefined,
      descIdentified: undefined,
      localizedName: undefined,
      position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
      properties: [],
      upgrades: 0,
      upgradeLevel: 0,
      upgradeSlot0: -1,
      upgradeSlot1: -1,
      upgradeSlot2: -1,
      upgradeSlot3: -1,
      upgradeSlot4: -1,
      upgradeSlot5: -1,
      xOrientation: 0,
      yOrientation: 0,
      zOrientation: 0,
      dropable: 0,
      pickpocketable: 0,
      plot: 0,
      stolen: 0,
      charges: 0,
      maxCharges: 0,
      modelVariation: 0,
      textureVariation: 0,
      bodyVariation: 0,
      addCost: 0,
      cost: 0,
      newItem: 0,
      nonEquippable: 0,
      deleting: false,
      palleteID: 0,
      getBaseItemId() { return this.baseItemId; },
      isDropable() { return !!this.dropable; },
      getBodyVariationByte() { return this.bodyVariation | 0; },
      getTextureVariation() { return this.textureVariation | 0; },
    };
    return item;
  }

  it('deserializes nested item fields', () => {
    const item = makeRuntimeItem();
    itemSerializer.deserialize(item, makeTemplate());
    expect(item.id).toBe(0x5005);
    expect(item.tag).toBe('item_test');
    expect(item.baseItemId).toBe(1);
    expect(item.stackSize).toBe(3);
    expect(item.identified).toBeTruthy();
    expect(item.position.x).toBeCloseTo(1, 5);
  });

  it('serializes a nested GFFStruct from runtime fields', () => {
    const item = makeRuntimeItem();
    itemSerializer.deserialize(item, makeTemplate());
    item.tag = 'item_mut';
    item.stackSize = 9;
    item.dropable = 1;

    const out = itemSerializer.serialize(item, { gameKey: 'k1' });
    expect(out.getFieldByLabel('Tag').getValue()).toBe('item_mut');
    expect(out.getFieldByLabel('StackSize').getValue()).toBe(9);
    expect(out.getFieldByLabel('Dropable').getValue()).toBe(1);
    expect(out.getFieldByLabel('BaseItem').getValue()).toBe(1);
    // Infinite is contextual Store metadata — not part of the base item struct.
    expect(out.hasField('Infinite')).toBe(false);
  });
});
