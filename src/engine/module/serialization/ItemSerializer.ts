import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFStruct } from '@core/resource/GFFStruct';
import { CExoLocString } from '@core/resource/CExoLocString';
import type { Item } from '@engine/module/Item';
import type { DeserializeContext, GameObjectSerializer, SerializeContext } from '@engine/module/serialization/types';
import { gffRootOf } from '@engine/module/serialization/types';
import {
  addByte,
  addDword,
  addFloat,
  addLocString,
  addString,
  addWord,
  readBoolByte,
  readByte,
  readDword,
  readInt,
  readLocString,
  readObjectId,
  readResRef,
  readString,
  readWord,
} from '@engine/module/serialization/gffHelpers';
import { PositionOrientationTransform } from '@engine/module/serialization/transforms/PositionOrientationTransform';
import { ItemPropertySerializer } from '@engine/module/serialization/ItemPropertySerializer';

/**
 * Item nested GFFStruct serializer (Equip_ItemList / ItemList / Store stock).
 * serialize() returns the nested GFFStruct shape used by Item.save today.
 * BaseItem 2DA lookup and registration stay in the Item facade.
 */
export class ItemSerializer implements GameObjectSerializer<Item, any, GFFStruct> {
  deserialize(target: Item, source: any, context?: DeserializeContext): void {
    if ((target as any).loaded) return;

    const root = gffRootOf(source);
    const needsRegister = !target.initialized;
    (target as any)._bodyVariationFromGff = root.hasField('BodyVariation');

    if (needsRegister) {
      const objectId = readObjectId(root);
      if (objectId !== undefined) target.id = objectId;
    }

    if (root.hasField('AddCost')) target.addCost = readInt(root, 'AddCost');
    if (root.hasField('BaseItem')) target.baseItemId = readInt(root, 'BaseItem');

    if (root.hasField('BodyVariation')) {
      target.bodyVariation = readByte(root, 'BodyVariation');
    }

    if (root.hasField('Charges')) target.charges = readByte(root, 'Charges');
    if (root.hasField('Cost')) target.cost = readDword(root, 'Cost');
    if (root.hasField('DELETING')) target.deleting = readBoolByte(root, 'DELETING');
    if (root.hasField('DescIdentified')) target.descIdentified = readLocString(root, 'DescIdentified') as any;
    if (root.hasField('Description')) target.description = readLocString(root, 'Description') as any;

    if (root.hasField('Dropable')) target.dropable = readByte(root, 'Dropable');
    else if (target.dropable === undefined || target.dropable === null) target.dropable = 0;

    if (root.hasField('EquippedRes')) target.equippedRes = readResRef(root, 'EquippedRes');
    if (root.hasField('Identified')) target.identified = readByte(root, 'Identified');
    if (root.hasField('Infinite')) target.infinite = readByte(root, 'Infinite');
    if (root.hasField('InventoryRes')) target.inventoryRes = readResRef(root, 'InventoryRes');
    if (root.hasField('LocalizedName')) target.localizedName = readLocString(root, 'LocalizedName') as any;
    if (root.hasField('MaxCharges')) target.maxCharges = readByte(root, 'MaxCharges');
    if (root.hasField('ModelVariation')) target.modelVariation = readByte(root, 'ModelVariation');
    if (root.hasField('NewItem')) target.newItem = readByte(root, 'NewItem');
    if (root.hasField('NonEquippable')) target.nonEquippable = readByte(root, 'NonEquippable');
    if (root.hasField('Pickpocketable')) target.pickpocketable = readByte(root, 'Pickpocketable');
    if (root.hasField('Plot')) target.plot = readByte(root, 'Plot');
    if (root.hasField('StackSize')) target.stackSize = readWord(root, 'StackSize');
    if (root.hasField('Stolen')) target.stolen = readByte(root, 'Stolen');
    if (root.hasField('Tag')) target.tag = readString(root, 'Tag').replace(/\0[\s\S]*$/g, '');
    if (root.hasField('TextureVar')) target.textureVariation = readByte(root, 'TextureVar');
    if (root.hasField('Upgrades')) target.upgrades = readDword(root, 'Upgrades');
    if (root.hasField('UpgradeLevel')) target.upgradeLevel = readByte(root, 'UpgradeLevel');

    const readUpgradeSlot = (label: keyof Item & string, field: string) => {
      if (!root.hasField(field)) return;
      const v = readByte(root, field);
      (target as any)[label] = v === 255 ? -1 : v;
    };
    readUpgradeSlot('upgradeSlot0', 'UpgradeSlot0');
    readUpgradeSlot('upgradeSlot1', 'UpgradeSlot1');
    readUpgradeSlot('upgradeSlot2', 'UpgradeSlot2');
    readUpgradeSlot('upgradeSlot3', 'UpgradeSlot3');
    readUpgradeSlot('upgradeSlot4', 'UpgradeSlot4');
    readUpgradeSlot('upgradeSlot5', 'UpgradeSlot5');

    PositionOrientationTransform.deserialize(target, root);

    if (root.hasField('PaletteID')) target.palleteID = readByte(root, 'PaletteID');

    if (root.hasField('PropertiesList')) {
      const properties = root.getFieldByLabel('PropertiesList').getChildStructs?.() || [];
      target.properties = properties.map((property: GFFStruct) =>
        ItemPropertySerializer.deserialize(property, target)
      );
    }

  }

  serialize(source: Item, context?: SerializeContext): GFFStruct {
    const itemStruct = new GFFStruct(0);

    itemStruct.addField(new GFFField(GFFDataType.INT, 'BaseItem')).setValue(source.getBaseItemId());
    addString(itemStruct, 'Tag', source.tag);
    addByte(itemStruct, 'Identified', source.identified);
    addLocString(
      itemStruct,
      'Description',
      source.description instanceof CExoLocString ? source.description : new CExoLocString(),
    );
    addLocString(
      itemStruct,
      'DescIdentified',
      source.descIdentified instanceof CExoLocString ? source.descIdentified : new CExoLocString(),
    );
    addLocString(
      itemStruct,
      'LocalizedName',
      source.localizedName instanceof CExoLocString ? source.localizedName : new CExoLocString(),
    );
    addWord(itemStruct, 'StackSize', source.stackSize);
    addByte(itemStruct, 'Stolen', source.stolen);
    addDword(itemStruct, 'Upgrades', source.upgrades);

    // TSL-only upgrade slots (K1 has no UpgradeLevel / UpgradeSlot* strings).
    // Pass context.gameKey from the Item facade (maps GameState.GameKey).
    if (context?.gameKey === 'k2') {
      addByte(itemStruct, 'UpgradeLevel', source.upgradeLevel);
      addByte(itemStruct, 'UpgradeSlot0', source.upgradeSlot0 === -1 ? 255 : source.upgradeSlot0);
      addByte(itemStruct, 'UpgradeSlot1', source.upgradeSlot1 === -1 ? 255 : source.upgradeSlot1);
      addByte(itemStruct, 'UpgradeSlot2', source.upgradeSlot2 === -1 ? 255 : source.upgradeSlot2);
      addByte(itemStruct, 'UpgradeSlot3', source.upgradeSlot3 === -1 ? 255 : source.upgradeSlot3);
      addByte(itemStruct, 'UpgradeSlot4', source.upgradeSlot4 === -1 ? 255 : source.upgradeSlot4);
      addByte(itemStruct, 'UpgradeSlot5', source.upgradeSlot5 === -1 ? 255 : source.upgradeSlot5);
    }

    addByte(itemStruct, 'Dropable', source.isDropable() ? 1 : 0);
    addByte(itemStruct, 'Pickpocketable', source.pickpocketable ? 1 : 0);
    addByte(itemStruct, 'ModelVariation', source.modelVariation);

    if (source.baseItem?.modelType === 1) {
      addByte(itemStruct, 'BodyVariation', source.getBodyVariationByte());
      addByte(itemStruct, 'TextureVar', source.getTextureVariation());
    }

    addByte(itemStruct, 'Charges', source.charges);
    addByte(itemStruct, 'MaxCharges', source.maxCharges);
    addDword(itemStruct, 'Cost', source.cost);
    addDword(itemStruct, 'AddCost', source.addCost);
    addByte(itemStruct, 'Plot', source.plot);

    const propertiesList = itemStruct.addField(new GFFField(GFFDataType.LIST, 'PropertiesList'));
    for (let i = 0; i < source.properties.length; i++) {
      const propStruct = ItemPropertySerializer.serialize(source.properties[i]);
      propStruct.setType(i);
      propertiesList.addChildStruct(propStruct);
    }

    addFloat(itemStruct, 'XPosition', source.position.x);
    addFloat(itemStruct, 'YPosition', source.position.y);
    addFloat(itemStruct, 'ZPosition', source.position.z);
    addFloat(itemStruct, 'XOrientation', source.xOrientation);
    addFloat(itemStruct, 'YOrientation', source.yOrientation);
    addFloat(itemStruct, 'ZOrientation', source.zOrientation);
    addByte(itemStruct, 'NonEquippable', source.nonEquippable);
    addByte(itemStruct, 'NewItem', source.newItem);
    addByte(itemStruct, 'DELETING', source.deleting ? 1 : 0);

    return itemStruct;
  }
}

export const itemSerializer = new ItemSerializer();
