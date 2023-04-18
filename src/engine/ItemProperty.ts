import { ModuleItemCostTable } from "../enums/module/ModuleItemCostTable";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TLKManager } from "../managers/TLKManager";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleItem } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { Dice } from "../utility/Dice";
import { SWItemPropsDef } from "./rules/SWItemPropsDef";
import { SWRuleSet } from "./rules/SWRuleSet";

export class ItemProperty {
  item: ModuleItem;
  propertyName: number = 0;
  subType: number = 0;
  costTable: number = 0;
  costValue: number = 0;
  upgradeType: number = 0;
  param1: number = 0;
  param1Value: number = 0;
  chanceAppear: number = 0;
  usesPerDay: number = 0;
  useable: number = -1;

  itemPropertyDefinition: SWItemPropsDef;

  setItem(item: ModuleItem){
    this.item = item;
  }

  getProperty(): SWItemPropsDef {
    return this.itemPropertyDefinition;
  }

  getPropertyName(){
    const property = this.getProperty();
    if(property){
      return property.getName();
    }
    return new Error(`Invalid Item Property`);
  }

  getSubType(){
    const property = this.getProperty();
    if(!property) return;
    if(!property.hasSubType()) return;
    const _2DA = TwoDAManager.datatables.get(property.subtyperesref.toLowerCase());
    if(_2DA){
      return _2DA.rows[this.subType];
    }
  }

  getSubtypeName(){
    const subType = this.getSubType();
    if(subType){
      if(subType.name != '****'){
        return TLKManager.GetStringById(subType.name).Value;
      }else{
        return TLKManager.GetStringById(0).Value;
      }
    }
    return new Error(`Invalid Item Property Sub Type`);
  }

  getCostTable(){
    const iprp_costtable2DA = TwoDAManager.datatables.get('iprp_costtable');
    if(iprp_costtable2DA){
      const costTableName = iprp_costtable2DA.rows[this.costTable].name.toLowerCase();
      if(costTableName){
        const costtable2DA = TwoDAManager.datatables.get(costTableName);
        if(costtable2DA){
          return costtable2DA;
        }
      }
    }
  }

  getCostTableRow(){
    const costTable = this.getCostTable();
    if(costTable){
      return costTable.rows[this.costValue];
    }
    return undefined;
  }

  //Determine if the property requires an upgrade to use, or if it is always useable
  isUseable(){
    const upgrade_flag = (1 << this.upgradeType);
    //If no upgrade is required or the upgrade is present on the item
    if(this.upgradeType == -1 || ((this.item.upgrades & upgrade_flag) == upgrade_flag)){
      return true;
    }
    return false;
  }

  is(property: any, subType: any = ''){
    if(typeof property != 'undefined' && typeof subType != 'undefined'){
      return this.propertyName == property && this.subType == subType;
    }else{
      return this.propertyName == property;
    }
  }

  costTableRandomCheck(){
    let costTable = this.getCostTable();
    //Random Cost Check
    if(this.costValue == 0){
      let rowCount = costTable.rows.length - 1;
      let randomCostValue = (Math.floor(Math.random() * rowCount) + 1); 
      return costTable.rows[randomCostValue];
    }
    return this.getCostTableRow();
  }

  getValue(){
    let costTable = this.getCostTable();
    let costTableRow = this.getCostTableRow();
    if(costTableRow){
      switch(this.costTable){
        case ModuleItemCostTable.Base1:

        break;
        case ModuleItemCostTable.Bonus:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.Melee:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.SpellUse:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItemCostTable.Damage:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if(costTableRow.numdice != '****'){

            return Dice.roll(parseInt(costTableRow.numdice), Dice.intToDiceType(costTableRow.die) );
          }else{
            return parseInt(costTableRow.label);
          }
        break;
        case ModuleItemCostTable.Immune:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.DamageSoak:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItemCostTable.DamageResist:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItemCostTable.DancingScimitar:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItemCostTable.Slots:
          
        break;
        case ModuleItemCostTable.Monster_Cost:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if(costTableRow.numdice != '****'){
            return Dice.roll(parseInt(costTableRow.numdice), Dice.intToDiceType(costTableRow.die) );
          }
        break;

      }
    }

    return 0;
  }

  static FromStruct(struct: GFFStruct){
    const itemProp = new ItemProperty();
    if(struct.HasField('PropertyName')){
      itemProp.propertyName = struct.GetFieldByLabel('PropertyName').GetValue();
      itemProp.itemPropertyDefinition = SWRuleSet.itemPropsDef[itemProp.propertyName];
    }
    
    if(struct.HasField('Subtype'))
      itemProp.subType = struct.GetFieldByLabel('Subtype').GetValue();

    if(struct.HasField('CostTable'))
      itemProp.costTable = struct.GetFieldByLabel('CostTable').GetValue();

    if(struct.HasField('CostValue'))
      itemProp.costValue = struct.GetFieldByLabel('CostValue').GetValue();

    if(struct.HasField('Param1'))
      itemProp.param1 = struct.GetFieldByLabel('Param1').GetValue();

    if(struct.HasField('Param1Value'))
      itemProp.param1Value = struct.GetFieldByLabel('Param1Value').GetValue();

    if(struct.HasField('ChanceAppear'))
      itemProp.chanceAppear = struct.GetFieldByLabel('ChanceAppear').GetValue();

    if(struct.HasField('UsesPerDay'))
      itemProp.usesPerDay = struct.GetFieldByLabel('UsesPerDay').GetValue();

    if(struct.HasField('Useable'))
      itemProp.useable = struct.GetFieldByLabel('Useable').GetValue();

    if(struct.HasField('UpgradeType'))
      itemProp.upgradeType = struct.GetFieldByLabel('UpgradeType').GetValue();
    
    return itemProp;
  }

  save(){
    let propStruct = new GFFStruct(0);

    propStruct.AddField( new GFFField(GFFDataType.WORD, 'PropertyName') ).SetValue( this.propertyName == -1 ? 255 : this.propertyName);
    propStruct.AddField( new GFFField(GFFDataType.WORD, 'SubType') ).SetValue( this.subType == -1 ? 255 : this.subType);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'CostTable') ).SetValue( this.costTable == -1 ? 255 : this.costTable);
    propStruct.AddField( new GFFField(GFFDataType.WORD, 'CostValue') ).SetValue( this.costValue == -1 ? 255 : this.costValue);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Param1') ).SetValue( this.param1 == -1 ? 255 : this.param1);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Param1Value') ).SetValue( this.param1Value == -1 ? 255 : this.param1Value);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'ChanceAppear') ).SetValue( this.chanceAppear == -1 ? 255 : this.chanceAppear);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'UsesPerDay') ).SetValue( this.usesPerDay == -1 ? 255 : this.usesPerDay);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Usable') ).SetValue( this.useable == -1 ? 255 : this.useable);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'UpgradeType') ).SetValue( this.upgradeType == -1 ? 255 : this.upgradeType);

    return propStruct;
  }

}
