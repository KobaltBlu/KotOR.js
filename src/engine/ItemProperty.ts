import { ModuleItemCostTable } from "../enums/module/ModuleItemCostTable";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import type { ModuleItem } from "../module/ModuleItem";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { TwoDAObject, type ITwoDARowData } from "../resource/TwoDAObject";
import { Dice } from "../utility/Dice";
import { createScopedLogger , LogScope } from "../utility/Logger";

import { SWCostTable } from "./rules/SWCostTable";
import { SWItemPropsDef } from "./rules/SWItemPropsDef";

const log = createScopedLogger(LogScope.Game);

class SWSubTypeBase {
  id: number;
  name: number;
  label: string;

  getName() {
    return this.name != -1 ? GameState.TLKManager.GetStringById(this.name).Value : this.label;
  }

  static From2DA(row: ITwoDARowData = {} as ITwoDARowData) {
    const subType = new SWSubTypeBase();
    subType.id = TwoDAObject.normalizeValue(row.__index, 'number', -1) as number;
    subType.name = TwoDAObject.normalizeValue(row.name, 'number', -1) as number;
    subType.label = TwoDAObject.normalizeValue(row.label, 'string', '') as string;
    return subType;
  }
}

export class ItemProperty {
  template: GFFObject;
  item: ModuleItem;
  propertyName: number;
  subType: number;
  costTable: number;
  costValue: number;
  upgradeType: number;
  param1: number;
  param1Value: number;
  chanceAppear: number;
  usesPerDay: number;
  useable: number;

  propertyDefinition: SWItemPropsDef;
  subTypeDefinition: SWSubTypeBase;
  costTableLookupDefinition: SWCostTable;
  costTableDefinition: TwoDAObject | undefined;

  constructor(template: GFFObject, item: ModuleItem) {
    this.template = template;
    this.item = item;
    this.initProperties();

    //Load the property definition
    this.propertyDefinition = GameState.SWRuleSet.itemPropsDef[this.propertyName];
    if (!this.propertyDefinition) {
      log.error(`Invalid Item Property: ${this.propertyName}`);
    }

    //Load the sub type definition
    if (this.propertyDefinition?.hasSubType()) {
      const subTypeDef = GameState.TwoDAManager.datatables.get(this.propertyDefinition.subtyperesref.toLowerCase());
      if (subTypeDef) {
        const row = subTypeDef.rows[this.subType];
        if (!row) {
          log.error(`Invalid Item Property Sub Type: ${this.subType}`);
        }
        this.subTypeDefinition = SWSubTypeBase.From2DA(row);
      } else {
        log.error(`Invalid Item Property Sub Type: ${this.propertyDefinition.subtyperesref}`);
      }
    }

    //Load the cost table definition
    this.costTableLookupDefinition = GameState.SWRuleSet.costTables[this.costTable];
    if (!this.costTableLookupDefinition && this.costTable > -1) {
      log.error(`Invalid Item Property Cost Table: ${this.costTable}`);
    } else {
      const costTable = GameState.TwoDAManager.datatables.get(this.costTableLookupDefinition.name.toLowerCase());
      this.costTableDefinition = costTable;
    }
  }

  getProperty(): SWItemPropsDef {
    return this.propertyDefinition;
  }

  getPropertyName() {
    const property = this.getProperty();
    if (!property) {
      return new Error(`Invalid Item Property`);
    }
    return property.getName();
  }

  getSubType() {
    return this.subTypeDefinition;
  }

  getSubtypeName() {
    return this.subTypeDefinition?.getName() || '';
  }

  getCostTable() {
    if (this.costTableDefinition) {
      return this.costTableDefinition;
    }
    throw new Error('Unable to locate costTable');
  }

  getCostTableRow() {
    return this.costTableDefinition?.rows[this.costValue];
  }

  //Determine if the property requires an upgrade to use, or if it is always useable
  isUseable() {
    const upgrade_flag = (1 << this.upgradeType);
    //If no upgrade is required or the upgrade is present on the item
    if (this.upgradeType == -1 || ((this.item.upgrades & upgrade_flag) == upgrade_flag)) {
      return true;
    }
    return false;
  }

  is(property: number, subType: number | undefined = undefined) {
    if (typeof property != 'undefined' && typeof subType != 'undefined') {
      return this.propertyName == property && this.subType == subType;
    } else {
      return this.propertyName == property;
    }
  }
  costTableRandomCheck(): ITwoDARowData | undefined {
    const costTable = this.getCostTable();
    //Random Cost Check
    if (this.costValue == 0) {
      const rowCount = costTable.RowCount - 1;
      if (rowCount < 1) return this.getCostTableRow();
      const randomCostValue = (Math.floor(Math.random() * rowCount) + 1);
      return costTable.rows[String(randomCostValue)];
    }
    return this.getCostTableRow();
  }

  getValue() {
    let costTableRow = this.getCostTableRow();
    if (costTableRow) {
      switch (this.costTable) {
        case ModuleItemCostTable.Base1:

          break;
        case ModuleItemCostTable.Bonus:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(String(costTableRow?.value ?? 0), 10);
        case ModuleItemCostTable.Melee:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(String(costTableRow?.value ?? 0), 10);
        case ModuleItemCostTable.SpellUse:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          break;
        case ModuleItemCostTable.Damage:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if (costTableRow && costTableRow.numdice != '****') {

            return Dice.roll(parseInt(String(costTableRow.numdice), 10), Dice.intToDiceType(Number(costTableRow.die)));
          } else if (costTableRow) {
            return parseInt(String(costTableRow.label ?? 0), 10);
          }
          break;
        case ModuleItemCostTable.Immune:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(String(costTableRow?.value ?? 0), 10);
        case ModuleItemCostTable.DamageSoak:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(String(costTableRow?.amount ?? 0), 10);
        case ModuleItemCostTable.DamageResist:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(String(costTableRow?.amount ?? 0), 10);
        case ModuleItemCostTable.DancingScimitar:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          break;
        case ModuleItemCostTable.Slots:

          break;
        case ModuleItemCostTable.Monster_Cost:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if (costTableRow && costTableRow.numdice != '****') {
            return Dice.roll(parseInt(String(costTableRow.numdice), 10), Dice.intToDiceType(Number(costTableRow.die)));
          }
          break;
      }
    }

    return 0;
  }

  initProperties() {
    if (this.template.RootNode.hasField('PropertyName'))
      this.propertyName = this.template.RootNode.getNumberByLabel('PropertyName');

    if (this.template.RootNode.hasField('Subtype'))
      this.subType = this.template.RootNode.getNumberByLabel('Subtype');

    if (this.template.RootNode.hasField('CostTable'))
      this.costTable = this.template.RootNode.getNumberByLabel('CostTable');

    if (this.template.RootNode.hasField('CostValue'))
      this.costValue = this.template.RootNode.getNumberByLabel('CostValue');

    if (this.template.RootNode.hasField('Param1'))
      this.param1 = this.template.RootNode.getNumberByLabel('Param1');

    if (this.template.RootNode.hasField('Param1Value'))
      this.param1Value = this.template.RootNode.getNumberByLabel('Param1Value');

    if (this.template.RootNode.hasField('ChanceAppear'))
      this.chanceAppear = this.template.RootNode.getNumberByLabel('ChanceAppear');

    if (this.template.RootNode.hasField('UsesPerDay'))
      this.usesPerDay = this.template.RootNode.getNumberByLabel('UsesPerDay');

    if (this.template.RootNode.hasField('Useable'))
      this.useable = this.template.RootNode.getNumberByLabel('Useable');

    if (this.template.RootNode.hasField('UpgradeType'))
      this.upgradeType = this.template.RootNode.getNumberByLabel('UpgradeType');
  }

  save() {
    const propStruct = new GFFStruct(0);

    propStruct.addField(new GFFField(GFFDataType.WORD, 'PropertyName'))?.setValue(this.propertyName == -1 ? 255 : this.propertyName);
    propStruct.addField(new GFFField(GFFDataType.WORD, 'SubType'))?.setValue(this.subType == -1 ? 255 : this.subType);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'CostTable'))?.setValue(this.costTable == -1 ? 255 : this.costTable);
    propStruct.addField(new GFFField(GFFDataType.WORD, 'CostValue'))?.setValue(this.costValue == -1 ? 255 : this.costValue);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Param1'))?.setValue(this.param1 == -1 ? 255 : this.param1);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Param1Value'))?.setValue(this.param1Value == -1 ? 255 : this.param1Value);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'ChanceAppear'))?.setValue(this.chanceAppear == -1 ? 255 : this.chanceAppear);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'UsesPerDay'))?.setValue(this.usesPerDay == -1 ? 255 : this.usesPerDay);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'Usable'))?.setValue(this.useable == -1 ? 255 : this.useable);
    propStruct.addField(new GFFField(GFFDataType.BYTE, 'UpgradeType'))?.setValue(this.upgradeType == -1 ? 255 : this.upgradeType);

    return propStruct;
  }

}
