import { GameState } from "../GameState";
import { ModuleItemCostTable } from "../enums/module/ModuleItemCostTable";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { TLKManager, TwoDAManager } from "../managers";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { Dice } from "../utility/Dice";

export class ItemProperty {
  template: any;
  item: any;
  propertyName: any;
  subType: any;
  costTable: any;
  costValue: any;
  upgradeType: number;
  param1: any;
  param1Value: any;
  chanceAppear: any;
  usesPerDay: any;
  useable: any;

  constructor(template: any, item: any){
    this.template = template;
    this.item = item;
    this.initProperties();
  }

  getProperty(){
    const _2DA = GameState.TwoDAManager.datatables.get('itempropdef');
    if(_2DA){
      return _2DA.rows[this.propertyName];
    }
  }

  getPropertyName(){
    const property = this.getProperty();
    if(property){
      if(property.name != '****'){
        return GameState.TLKManager.GetStringById(property.name).Value;
      }else{
        return GameState.TLKManager.GetStringById(0).Value;
      }
    }
    return new Error(`Invalid Item Property`);
  }

  getSubType(){
    const property = this.getProperty();
    if(property && property.subtyperesref != '****'){
      const _2DA = GameState.TwoDAManager.datatables.get(property.subtyperesref.toLowerCase());
      if(_2DA){
        return _2DA.rows[this.subType];
      }
    }
  }

  getSubtypeName(){
    const subType = this.getSubType();
    if(subType){
      if(subType.name != '****'){
        return GameState.TLKManager.GetStringById(subType.name).Value;
      }else{
        return GameState.TLKManager.GetStringById(0).Value;
      }
    }
    return new Error(`Invalid Item Property Sub Type`);
  }

  getCostTable() {
    const iprp_costtable2DA = GameState.TwoDAManager.datatables.get('iprp_costtable');
    if(iprp_costtable2DA){
      const costTableName = iprp_costtable2DA.rows[this.costTable].name.toLowerCase();
      if(costTableName){
        const costtable2DA = GameState.TwoDAManager.datatables.get(costTableName);
        if(costtable2DA){
          return costtable2DA;
        }
      }
    }
    throw new Error('Unable to locate costTable');
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

  initProperties(){
    if(this.template.RootNode.hasField('PropertyName'))
      this.propertyName = this.template.RootNode.getFieldByLabel('PropertyName').getValue();
    
    if(this.template.RootNode.hasField('Subtype'))
      this.subType = this.template.RootNode.getFieldByLabel('Subtype').getValue();

    if(this.template.RootNode.hasField('CostTable'))
      this.costTable = this.template.RootNode.getFieldByLabel('CostTable').getValue();

    if(this.template.RootNode.hasField('CostValue'))
      this.costValue = this.template.RootNode.getFieldByLabel('CostValue').getValue();

    if(this.template.RootNode.hasField('Param1'))
      this.param1 = this.template.RootNode.getFieldByLabel('Param1').getValue();

    if(this.template.RootNode.hasField('Param1Value'))
      this.param1Value = this.template.RootNode.getFieldByLabel('Param1Value').getValue();

    if(this.template.RootNode.hasField('ChanceAppear'))
      this.chanceAppear = this.template.RootNode.getFieldByLabel('ChanceAppear').getValue();

    if(this.template.RootNode.hasField('UsesPerDay'))
      this.usesPerDay = this.template.RootNode.getFieldByLabel('UsesPerDay').getValue();

    if(this.template.RootNode.hasField('Useable'))
      this.useable = this.template.RootNode.getFieldByLabel('Useable').getValue();

    if(this.template.RootNode.hasField('UpgradeType'))
      this.upgradeType = this.template.RootNode.getFieldByLabel('UpgradeType').getValue();
  }

  save(){
    let propStruct = new GFFStruct(0);

    propStruct.addField( new GFFField(GFFDataType.WORD, 'PropertyName') )?.setValue( this.propertyName == -1 ? 255 : this.propertyName);
    propStruct.addField( new GFFField(GFFDataType.WORD, 'SubType') )?.setValue( this.subType == -1 ? 255 : this.subType);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'CostTable') )?.setValue( this.costTable == -1 ? 255 : this.costTable);
    propStruct.addField( new GFFField(GFFDataType.WORD, 'CostValue') )?.setValue( this.costValue == -1 ? 255 : this.costValue);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1') )?.setValue( this.param1 == -1 ? 255 : this.param1);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1Value') )?.setValue( this.param1Value == -1 ? 255 : this.param1Value);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'ChanceAppear') )?.setValue( this.chanceAppear == -1 ? 255 : this.chanceAppear);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UsesPerDay') )?.setValue( this.usesPerDay == -1 ? 255 : this.usesPerDay);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Usable') )?.setValue( this.useable == -1 ? 255 : this.useable);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeType') )?.setValue( this.upgradeType == -1 ? 255 : this.upgradeType);

    return propStruct;
  }

}