import { Action } from "../actions";
import { GameEffect } from "../effects";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { ModuleObject } from ".";
import { AreaOfEffectShape } from "../enums/module/AreaOfEffectShape";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";

/* @file
 * The ModuleCreature class.
 */

export class ModuleAreaOfEffect extends ModuleObject {

  areaEffectId: any;
  duration: number;
  durationType: number;

  creator: ModuleObject;
  creatorId: any;

  linkedToObjectId: number;
  linkedToObject: ModuleObject;

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
    if(this.template.RootNode.HasField('AreaEffectId'))
      this.areaEffectId = this.template.GetFieldByLabel('AreaEffectId').GetValue();

    if(this.template.RootNode.HasField('CreatorId'))
      this.creatorId = this.template.GetFieldByLabel('CreatorId').GetValue();

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

    if(this.template.RootNode.HasField('Duration'))
      this.duration = this.template.GetFieldByLabel('Duration').GetValue();

    if(this.template.RootNode.HasField('DurationType'))
      this.durationType = this.template.GetFieldByLabel('DurationType').GetValue();
  
    if(this.template.RootNode.HasField('LastEntered'))
      this.lastEnteredId = this.template.GetFieldByLabel('LastEntered').GetValue();

    if(this.template.RootNode.HasField('LastLeft'))
      this.lastLeftId = this.template.GetFieldByLabel('LastLeft').GetValue();

    if(this.template.RootNode.HasField('LastHrtbtDay'))
      this.lastHeartBeatDay = this.template.GetFieldByLabel('LastHrtbtDay').GetValue();

    if(this.template.RootNode.HasField('LastHrtbtTime'))
      this.lastHeartbeatTime = this.template.GetFieldByLabel('LastHrtbtTime').GetValue();

    if(this.template.RootNode.HasField('LinkedToObject'))
      this.linkedToObjectId = this.template.GetFieldByLabel('LinkedToObject').GetValue();
  
    if(this.template.RootNode.HasField('MetaMagicType'))
      this.metaMagicType = this.template.GetFieldByLabel('MetaMagicType').GetValue();

    if(this.template.RootNode.HasField('Shape'))
      this.shape = this.template.GetFieldByLabel('Shape').GetValue();

    if(this.shape == AreaOfEffectShape.RECTANGLE){ //RECT
      if(this.template.RootNode.HasField('Length'))
      this.length = this.template.GetFieldByLabel('Length').GetValue();

      if(this.template.RootNode.HasField('Width'))
        this.width = this.template.GetFieldByLabel('Width').GetValue();
    }else{
      if(this.template.RootNode.HasField('Radius'))
        this.radius = this.template.GetFieldByLabel('Radius').GetValue();
    }
  
    if(this.template.RootNode.HasField('SpellId'))
      this.spellId = this.template.GetFieldByLabel('SpellId').GetValue();
  
    if(this.template.RootNode.HasField('SpellLevel'))
      this.spellLevel = this.template.GetFieldByLabel('SpellLevel').GetValue();
  
    if(this.template.RootNode.HasField('SpellSaveDC'))
      this.spellSaveDC = this.template.GetFieldByLabel('SpellSaveDC').GetValue();

    if(this.template.RootNode.HasField('OrientationX'))
    this.xOrientation = this.template.GetFieldByLabel('OrientationX').GetValue();
    
    if(this.template.RootNode.HasField('OrientationY'))
    this.yOrientation = this.template.GetFieldByLabel('OrientationY').GetValue();
    
    if(this.template.RootNode.HasField('OrientationZ'))
      this.zOrientation = this.template.GetFieldByLabel('OrientationZ').GetValue();
      
    if(this.template.RootNode.HasField('PositionX'))
      this.position.x = this.template.GetFieldByLabel('PositionX').GetValue();
    
    if(this.template.RootNode.HasField('PositionY'))
    this.position.y = this.template.GetFieldByLabel('PositionY').GetValue();
    
    if(this.template.RootNode.HasField('PositionZ'))
      this.position.z = this.template.GetFieldByLabel('PositionZ').GetValue();

    //ActionList
    try{
      if(this.template.RootNode.HasField('ActionList')){
        let actionStructs = this.template.RootNode.GetFieldByLabel('ActionList').GetChildStructs();
        for(let i = 0, len = actionStructs.length; i < len; i++){
          let action = Action.FromStruct(actionStructs[i]);
          if(action){
            this.actionQueue.add(action);
          }
        }
      }
    }catch(e: any){
      console.error(e);
    }

    //SWVarTable
    if(this.template.RootNode.HasField('SWVarTable')){
      let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      for(let i = 0, len = localBools.length; i < len; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
      let localNumbers = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('ByteArray').GetChildStructs();
      for(let i = 0, len = localNumbers.length; i < len; i++){
        let data = localNumbers[i].GetFieldByLabel('Variable').GetValue();
        this.setLocalNumber(i, data);
      }
    }
    
    if(this.template.RootNode.HasField('EffectList')){
      let effects = this.template.RootNode.GetFieldByLabel('EffectList').GetChildStructs() || [];
      for(let i = 0, len = effects.length; i < len; i++){
        let effect = GameEffect.EffectFromStruct(effects[i]);
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

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);

    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'AreaEffectId') ).SetValue(this.areaEffectId); // vfx_persist id

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LinkedToObject') ).SetValue( this.linkedToObject instanceof ModuleObject ? this.linkedToObject.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).SetValue( this.creator instanceof ModuleObject ? this.creator.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).SetValue( this.lastEntered instanceof ModuleObject ? this.lastEntered.id : ModuleObjectConstant.OBJECT_INVALID );

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).SetValue( this.lastLeft instanceof ModuleObject ? this.lastLeft.id : ModuleObjectConstant.OBJECT_INVALID );

    
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Duration') ).SetValue(this.duration);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE,  'DurationType') ).SetValue(this.durationType);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastHrtbtDay') ).SetValue(this.lastHeartBeatDay);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'LastHrtbtTime') ).SetValue(this.lastHeartBeatDay);

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).SetValue(this.onHeartbeat.name);

    if(this.onHeartbeat instanceof NWScriptInstance){
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).SetValue(this.onHeartbeat.name);
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnHeartbeat') ).SetValue('');
    }

    if(this.onUserDefined instanceof NWScriptInstance){
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnUserDefined') ).SetValue(this.onUserDefined.name);
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnUserDefined') ).SetValue('');
    }

    if(this.onObjectEnter instanceof NWScriptInstance){
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjEnter') ).SetValue(this.onObjectEnter.name);
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjEnter') ).SetValue('');
    }

    if(this.onObjectExit instanceof NWScriptInstance){
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjExit') ).SetValue(this.onObjectExit.name);
    }else{
      gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'OnObjExit') ).SetValue('');
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag); // vfx_persist label

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'SpellId') ).SetValue(this.spellId);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Shape') ).SetValue(this.shape);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'MetaMagicType') ).SetValue(this.metaMagicType);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'SpellSaveDC') ).SetValue(this.spellSaveDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'SpellLevel') ).SetValue(this.spellLevel);

    if(this.shape == AreaOfEffectShape.RECTANGLE){ //RECT
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Length') ).SetValue(this.length);
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Width') ).SetValue(this.width);
    }else{ // Cricle
      gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Radius') ).SetValue(this.radius);
    }
    
    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );
    
    //Effects
    let effectList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.AddChildStruct( this.effects[i].save() );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue( this.position.x );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue( this.position.y );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue( this.position.z );

    let theta = this.rotation.z * Math.PI;

    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue( 1 * Math.cos(theta) );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue( 1 * Math.sin(theta) );
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue( 0 );
    
    return gff;
  }

}