import { GameState } from "@/GameState";
import { ModuleItemCostTable } from "@/enums/module/ModuleItemCostTable";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import { Dice } from "@/utility/Dice";
import { SWItemPropsDef } from "@/engine/rules/SWItemPropsDef";
import { SWCostTable } from "@/engine/rules/SWCostTable";
import { TwoDAObject } from "@/resource/TwoDAObject";

class SWSubTypeBase {
  id: number;
  name: number;
  label: string;

  getName(){
    return this.name != -1 ? GameState.TLKManager.GetStringById(this.name).Value : this.label;
  }

  static From2DA(row: any = {}){
    const subType = new SWSubTypeBase();
    subType.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    subType.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    subType.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    return subType;
  }
}

export class ItemProperty {
  template: any;
  item: any;
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
  costTableDefinition: any;

  constructor(template: any, item: any){
    this.template = template;
    this.item = item;
    this.initProperties();

    //Load the property definition
    this.propertyDefinition = GameState.SWRuleSet.itemPropsDef[this.propertyName];
    if(!this.propertyDefinition){
      console.error(`Invalid Item Property: ${this.propertyName}`);
    }

    //Load the sub type definition
    if(this.propertyDefinition?.hasSubType()){
      const subTypeDef = GameState.TwoDAManager.datatables.get(this.propertyDefinition.subtyperesref.toLowerCase());
      if(subTypeDef){
        const row = subTypeDef.rows[this.subType];
        if(!row){
          console.error(`Invalid Item Property Sub Type: ${this.subType}`);
        }
        this.subTypeDefinition = SWSubTypeBase.From2DA(row);
      }else{
        console.error(`Invalid Item Property Sub Type: ${this.propertyDefinition.subtyperesref}`);
      }
    }

    //Load the cost table definition
    this.costTableLookupDefinition = GameState.SWRuleSet.costTables[this.costTable];
    if(!this.costTableLookupDefinition && this.costTable > -1){
      console.error(`Invalid Item Property Cost Table: ${this.costTable}`);
    }else if(this.costTableLookupDefinition){
      const costTable = GameState.TwoDAManager.datatables.get(this.costTableLookupDefinition.name.toLowerCase());
      this.costTableDefinition = costTable;
    }
  }

  getProperty():SWItemPropsDef{
    return this.propertyDefinition;
  }

  getPropertyName(){
    const property = this.getProperty();
    if(!property){
      return new Error(`Invalid Item Property`);
    }
    return property.getName();
  }

  getSubType(){
    return this.subTypeDefinition;
  }

  getSubtypeName(){
    return this.subTypeDefinition?.getName() || '';
  }

  getCostTable() {
    if(this.costTableDefinition){
      return this.costTableDefinition;
    }
    throw new Error('Unable to locate costTable');
  }

  getCostTableRow(){
    return this.costTableDefinition?.rows[this.costValue];
  }

  getTemplateFieldValue(labels: string[] = []){
    for(let i = 0; i < labels.length; i++){
      if(this.template.RootNode.hasField(labels[i])){
        return this.template.RootNode.getFieldByLabel(labels[i]).getValue();
      }
    }
    return undefined;
  }

  normalizeSerializedValue(value: any){
    const numericValue = Number(value);
    if(Number.isFinite(numericValue) && numericValue == 255){
      return -1;
    }
    return value;
  }

  getSaveValue(value: any){
    const numericValue = Number(value);
    if(!Number.isFinite(numericValue) || numericValue == -1){
      return 255;
    }
    return numericValue;
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

  is(property: any, subType: any = undefined){
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

            return Dice.roll(parseInt(costTableRow.numdice), Dice.intToDiceType(parseInt(costTableRow.die)) );
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
            return Dice.roll(parseInt(costTableRow.numdice), Dice.intToDiceType(parseInt(costTableRow.die)) );
          }
        break;

      }
    }

    return 0;
  }

  initProperties(){
    const propertyName = this.getTemplateFieldValue(['PropertyName']);
    if(typeof propertyName !== 'undefined')
      this.propertyName = this.normalizeSerializedValue(propertyName);
    
    const subType = this.getTemplateFieldValue(['Subtype', 'SubType']);
    if(typeof subType !== 'undefined')
      this.subType = this.normalizeSerializedValue(subType);

    const costTable = this.getTemplateFieldValue(['CostTable']);
    if(typeof costTable !== 'undefined')
      this.costTable = this.normalizeSerializedValue(costTable);

    const costValue = this.getTemplateFieldValue(['CostValue']);
    if(typeof costValue !== 'undefined')
      this.costValue = this.normalizeSerializedValue(costValue);

    const param1 = this.getTemplateFieldValue(['Param1']);
    if(typeof param1 !== 'undefined')
      this.param1 = this.normalizeSerializedValue(param1);

    const param1Value = this.getTemplateFieldValue(['Param1Value']);
    if(typeof param1Value !== 'undefined')
      this.param1Value = this.normalizeSerializedValue(param1Value);

    const chanceAppear = this.getTemplateFieldValue(['ChanceAppear']);
    if(typeof chanceAppear !== 'undefined')
      this.chanceAppear = this.normalizeSerializedValue(chanceAppear);

    const usesPerDay = this.getTemplateFieldValue(['UsesPerDay']);
    if(typeof usesPerDay !== 'undefined')
      this.usesPerDay = this.normalizeSerializedValue(usesPerDay);

    const useable = this.getTemplateFieldValue(['Useable', 'Usable']);
    if(typeof useable !== 'undefined')
      this.useable = this.normalizeSerializedValue(useable);

    const upgradeType = this.getTemplateFieldValue(['UpgradeType']);
    if(typeof upgradeType !== 'undefined')
      this.upgradeType = this.normalizeSerializedValue(upgradeType);
  }

  save(){
    let propStruct = new GFFStruct(0);

    propStruct.addField( new GFFField(GFFDataType.WORD, 'PropertyName') )?.setValue( this.getSaveValue(this.propertyName));
    propStruct.addField( new GFFField(GFFDataType.WORD, 'Subtype') )?.setValue( this.getSaveValue(this.subType));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'CostTable') )?.setValue( this.getSaveValue(this.costTable));
    propStruct.addField( new GFFField(GFFDataType.WORD, 'CostValue') )?.setValue( this.getSaveValue(this.costValue));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1') )?.setValue( this.getSaveValue(this.param1));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1Value') )?.setValue( this.getSaveValue(this.param1Value));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'ChanceAppear') )?.setValue( this.getSaveValue(this.chanceAppear));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UsesPerDay') )?.setValue( this.getSaveValue(this.usesPerDay));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Useable') )?.setValue( this.getSaveValue(this.useable));
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeType') )?.setValue( this.getSaveValue(this.upgradeType));

    return propStruct;
  }

}
