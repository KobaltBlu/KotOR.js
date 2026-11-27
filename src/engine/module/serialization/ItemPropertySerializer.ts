import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { GFFObject } from '@core/resource/GFFObject';
import { GFFStruct } from '@core/resource/GFFStruct';
import { ItemProperty } from '@engine/items/ItemProperty';
import type { Item } from '@engine/module/Item';

export class ItemPropertySerializer {
  static deserialize(source: GFFObject | GFFStruct, item: Item): ItemProperty {
    const root = source instanceof GFFObject ? source.RootNode : source;
    return new ItemProperty(GFFObject.FromStruct(root), item);
  }

  static serialize(source: ItemProperty): GFFStruct {
    const propStruct = new GFFStruct(0);
    const sentinel = (value: number) => value === -1 ? 255 : value;

    propStruct.addField(new GFFField(GFFDataType.WORD, 'PropertyName')).setValue(sentinel(source.propertyName));
    propStruct.addField(new GFFField(GFFDataType.WORD, 'Subtype')).setValue(sentinel(source.subType));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'CostTable')).setValue(sentinel(source.costTable));
    propStruct.addField(new GFFField(GFFDataType.WORD, 'CostValue')).setValue(sentinel(source.costValue));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Param1')).setValue(sentinel(source.param1));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Param1Value')).setValue(sentinel(source.param1Value));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear')).setValue(sentinel(source.chanceAppear));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'UsesPerDay')).setValue(sentinel(source.usesPerDay));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Useable')).setValue(sentinel(source.useable));
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'UpgradeType')).setValue(sentinel(source.upgradeType));

    return propStruct;
  }
}
