import { GFFDataType } from "../enums/resource/GFFDataType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { ModuleObject } from "./ModuleObject";
import { AreaOfEffectShape } from "../enums/module/AreaOfEffectShape";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { GameEffectFactory } from "../effects/GameEffectFactory";
import { GameState } from "../GameState";

/**
 * ModuleAreaOfEffect class.
 * 
 * Class representing an area of effect.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleAreaOfEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ModuleAreaOfEffect extends ModuleObject {

  areaEffectId: any;
  duration: number;
  durationType: number;

  creator: ModuleObject;
  creatorId: any;

  linkedToObjectId: number;

  lastEnteredId: number;
  lastEntered: ModuleObject;

  lastLeftId: number;
  lastLeft: ModuleObject;

  radius: any;
  shape: any;
  length: any;
  width: any;

  spellId: any;
  metaMagicType: any;
  spellSaveDC: any;
  spellLevel: any;

  onHeartbeat: NWScriptInstance;
  onUserDefined: NWScriptInstance;
  onObjectEnter: NWScriptInstance;
  onObjectExit: NWScriptInstance;

  //modulecalendar time
  lastHeartBeatDay: number;
  lastHeartbeatTime: number;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleAreaOfEffect;
  }

  load(){
    //We already have the template (From SAVEGAME)
    this.initProperties();
  }

  initProperties(): void {
    if(this.template.RootNode.hasField('AreaEffectId'))
      this.areaEffectId = this.template.getFieldByLabel('AreaEffectId').getValue();

    if(this.template.RootNode.hasField('CreatorId'))
      this.creatorId = this.template.getFieldByLabel('CreatorId').getValue();

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getFieldByLabel('Commandable').getValue();

    if(this.template.RootNode.hasField('Duration'))
      this.duration = this.template.getFieldByLabel('Duration').getValue();

    if(this.template.RootNode.hasField('DurationType'))
      this.durationType = this.template.getFieldByLabel('DurationType').getValue();
  
    if(this.template.RootNode.hasField('LastEntered'))
      this.lastEnteredId = this.template.getFieldByLabel('LastEntered').getValue();

    if(this.template.RootNode.hasField('LastLeft'))
      this.lastLeftId = this.template.getFieldByLabel('LastLeft').getValue();

    if(this.template.RootNode.hasField('LastHrtbtDay'))
      this.lastHeartBeatDay = this.template.getFieldByLabel('LastHrtbtDay').getValue();

    if(this.template.RootNode.hasField('LastHrtbtTime'))
      this.lastHeartbeatTime = this.template.getFieldByLabel('LastHrtbtTime').getValue();

    if(this.template.RootNode.hasField('LinkedToObject'))
      this.linkedToObjectId = this.template.getFieldByLabel('LinkedToObject').getValue();
  
    if(this.template.RootNode.hasField('MetaMagicType'))
      this.metaMagicType = this.template.getFieldByLabel('MetaMagicType').getValue();

    if(this.template.RootNode.hasField('Shape'))
      this.shape = this.template.getFieldByLabel('Shape').getValue();

    if(this.shape == AreaOfEffectShape.RECTANGLE){ //RECT
      if(this.template.RootNode.hasField('Length'))
      this.length = this.template.getFieldByLabel('Length').getValue();

      if(this.template.RootNode.hasField('Width'))
        this.width = this.template.getFieldByLabel('Width').getValue();
    }else{
      if(this.template.RootNode.hasField('Radius'))
        this.radius = this.template.getFieldByLabel('Radius').getValue();
    }
  
    if(this.template.RootNode.hasField('SpellId'))
      this.spellId = this.template.getFieldByLabel('SpellId').getValue();
  
    if(this.template.RootNode.hasField('SpellLevel'))
      this.spellLevel = this.template.getFieldByLabel('SpellLevel').getValue();
  
    if(this.template.RootNode.hasField('SpellSaveDC'))
      this.spellSaveDC = this.template.getFieldByLabel('SpellSaveDC').getValue();

    if(this.template.RootNode.hasField('OrientationX'))
    this.xOrientation = this.template.getFieldByLabel('OrientationX').getValue();
    
    if(this.template.RootNode.hasField('OrientationY'))
    this.yOrientation = this.template.getFieldByLabel('OrientationY').getValue();
    
    if(this.template.RootNode.hasField('OrientationZ'))
      this.zOrientation = this.template.getFieldByLabel('OrientationZ').getValue();
      
    if(this.template.RootNode.hasField('PositionX'))
      this.position.x = this.template.getFieldByLabel('PositionX').getValue();
    
    if(this.template.RootNode.hasField('PositionY'))
    this.position.y = this.template.getFieldByLabel('PositionY').getValue();
    
    if(this.template.RootNode.hasField('PositionZ'))
      this.position.z = this.template.getFieldByLabel('PositionZ').getValue();

    //ActionList
    try{
      if(this.template.RootNode.hasField('ActionList')){
        let actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
        for(let i = 0, len = actionStructs.length; i < len; i++){
          let action = GameState.ActionFactory.FromStruct(actionStructs[i]);
          if(action){
            this.actionQueue.add(action);
          }
        }
      }
    }catch(e: any){
      console.error(e);
    }

    //SWVarTable
    if(this.template.RootNode.hasField('SWVarTable')){
      let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      for(let i = 0, len = localBools.length; i < len; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
      let localNumbers = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('ByteArray').getChildStructs();
      for(let i = 0, len = localNumbers.length; i < len; i++){
        let data = localNumbers[i].getFieldByLabel('Variable').getValue();
        this.setLocalNumber(i, data);
      }
    }
    
    if(this.template.RootNode.hasField('EffectList')){
      let effects = this.template.RootNode.getFieldByLabel('EffectList').getChildStructs() || [];
      for(let i = 0, len = effects.length; i < len; i++){
        let effect = GameEffectFactory.EffectFromStruct(effects[i]);
        if(effect){
          effect.setAttachedObject(this);
          effect.loadModel();
          this.effects.push(effect);
        }
      }
    }
  }

  save(): GFFObject {
    let gff = new GFFObject();
    gff.FileType = 'AOE ';

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AreaEffectId') ).setValue(this.areaEffectId); // vfx_persist id

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LinkedToObject') ).setValue( this.linkedToObject instanceof ModuleObject ? this.linkedToObject.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).setValue( this.creator instanceof ModuleObject ? this.creator.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).setValue( this.lastEntered instanceof ModuleObject ? this.lastEntered.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).setValue( this.lastLeft instanceof ModuleObject ? this.lastLeft.id : ModuleObjectConstant.OBJECT_INVALID );

    
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Duration') ).setValue(this.duration);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'DurationType') ).setValue(this.durationType);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastHrtbtDay') ).setValue(this.lastHeartBeatDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastHrtbtTime') ).setValue(this.lastHeartBeatDay);

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).setValue(this.onHeartbeat.name);

    if(this.onHeartbeat instanceof NWScriptInstance){
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).setValue(this.onHeartbeat.name);
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).setValue('');
    }

    if(this.onUserDefined instanceof NWScriptInstance){
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnUserDefined') ).setValue(this.onUserDefined.name);
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnUserDefined') ).setValue('');
    }

    if(this.onObjectEnter instanceof NWScriptInstance){
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjEnter') ).setValue(this.onObjectEnter.name);
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjEnter') ).setValue('');
    }

    if(this.onObjectExit instanceof NWScriptInstance){
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjExit') ).setValue(this.onObjectExit.name);
    }else{
      gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjExit') ).setValue('');
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag); // vfx_persist label

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'SpellId') ).setValue(this.spellId);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Shape') ).setValue(this.shape);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'MetaMagicType') ).setValue(this.metaMagicType);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'SpellSaveDC') ).setValue(this.spellSaveDC);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'SpellLevel') ).setValue(this.spellLevel);

    if(this.shape == AreaOfEffectShape.RECTANGLE){ //RECT
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Length') ).setValue(this.length);
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Width') ).setValue(this.width);
    }else{ // Cricle
      gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Radius') ).setValue(this.radius);
    }
    
    gff.RootNode.addField( this.actionQueueToActionList() );

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );
    
    //Effects
    let effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue( this.position.x );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue( this.position.y );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue( this.position.z );

    let theta = this.rotation.z * Math.PI;

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue( 1 * Math.cos(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue( 1 * Math.sin(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue( 0 );
    
    return gff;
  }

}