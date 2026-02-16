import { GameEffectFactory } from "@/effects/GameEffectFactory";
import { AreaOfEffectShape } from "@/enums/module/AreaOfEffectShape";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { ModuleObject } from "@/module/ModuleObject";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.Game);

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

  areaEffectId: number;
  duration: number;
  durationType: number;

  creator: ModuleObject;
  creatorId: number;

  linkedToObjectId: number;

  lastEnteredId: number;
  lastEntered: ModuleObject;

  lastLeftId: number;
  lastLeft: ModuleObject;

  radius: number;
  shape: AreaOfEffectShape;
  length: number;
  width: number;

  spellId: number;
  metaMagicType: number;
  spellSaveDC: number;
  spellLevel: number;

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
      this.areaEffectId = this.template.getNumberByLabel('AreaEffectId');

    if(this.template.RootNode.hasField('CreatorId'))
      this.creatorId = this.template.getNumberByLabel('CreatorId');

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getBooleanByLabel('Commandable');

    if(this.template.RootNode.hasField('Duration'))
      this.duration = this.template.getNumberByLabel('Duration');

    if(this.template.RootNode.hasField('DurationType'))
      this.durationType = this.template.getNumberByLabel('DurationType');

    if(this.template.RootNode.hasField('LastEntered'))
      this.lastEnteredId = this.template.getNumberByLabel('LastEntered');

    if(this.template.RootNode.hasField('LastLeft'))
      this.lastLeftId = this.template.getNumberByLabel('LastLeft');

    if(this.template.RootNode.hasField('LastHrtbtDay'))
      this.lastHeartBeatDay = this.template.getNumberByLabel('LastHrtbtDay');

    if(this.template.RootNode.hasField('LastHrtbtTime'))
      this.lastHeartbeatTime = this.template.getNumberByLabel('LastHrtbtTime');

    if(this.template.RootNode.hasField('LinkedToObject'))
      this.linkedToObjectId = this.template.getNumberByLabel('LinkedToObject');

    if(this.template.RootNode.hasField('MetaMagicType'))
      this.metaMagicType = this.template.getNumberByLabel('MetaMagicType');

    if(this.template.RootNode.hasField('Shape'))
      this.shape = this.template.getNumberByLabel('Shape');

    //RECT
    if(this.shape == AreaOfEffectShape.RECTANGLE){
      if(this.template.RootNode.hasField('Length'))
        this.length = this.template.getNumberByLabel('Length');

      if(this.template.RootNode.hasField('Width'))
        this.width = this.template.getNumberByLabel('Width');
    }
    //CIRCLE
    else
    {
      if(this.template.RootNode.hasField('Radius'))
        this.radius = this.template.getNumberByLabel('Radius');
    }

    if(this.template.RootNode.hasField('SpellId'))
      this.spellId = this.template.getNumberByLabel('SpellId');

    if(this.template.RootNode.hasField('SpellLevel'))
      this.spellLevel = this.template.getNumberByLabel('SpellLevel');

    if(this.template.RootNode.hasField('SpellSaveDC'))
      this.spellSaveDC = this.template.getNumberByLabel('SpellSaveDC');

    if(this.template.RootNode.hasField('OrientationX'))
      this.xOrientation = this.template.getNumberByLabel('OrientationX');

    if(this.template.RootNode.hasField('OrientationY'))
      this.yOrientation = this.template.getNumberByLabel('OrientationY');

    if(this.template.RootNode.hasField('OrientationZ'))
      this.zOrientation = this.template.getNumberByLabel('OrientationZ');

    if(this.template.RootNode.hasField('PositionX'))
      this.position.x = this.template.getNumberByLabel('PositionX');

    if(this.template.RootNode.hasField('PositionY'))
      this.position.y = this.template.getNumberByLabel('PositionY');

    if(this.template.RootNode.hasField('PositionZ'))
      this.position.z = this.template.getNumberByLabel('PositionZ');

    //ActionList
    try{
      if(this.template.RootNode.hasField('ActionList')){
        const actionStructs = this.template.RootNode.getFieldByLabel('ActionList').getChildStructs();
        for(let i = 0, len = actionStructs.length; i < len; i++){
          const action = GameState.ActionFactory.FromStruct(actionStructs[i]);
          if(action){
            this.actionQueue.add(action);
          }
        }
      }
    } catch (e: unknown) {
      log.error(e instanceof Error ? e : String(e));
    }

    //SWVarTable
    if(this.template.RootNode.hasField('SWVarTable')){
      const localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      for(let i = 0, len = localBools.length; i < len; i++){
        const data = localBools[i].getNumberByLabel('Variable');
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
      const localNumbers = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('ByteArray').getChildStructs();
      for(let i = 0, len = localNumbers.length; i < len; i++){
        const data = localNumbers[i].getNumberByLabel('Variable');
        this.setLocalNumber(i, data);
      }
    }
    
    if(this.template.RootNode.hasField('EffectList')){
      const effects = this.template.RootNode.getFieldByLabel('EffectList').getChildStructs() || [];
      for(let i = 0, len = effects.length; i < len; i++){
        const effect = GameEffectFactory.EffectFromStruct(effects[i]);
        if(effect){
          effect.setAttachedObject(this);
          effect.loadModel();
          this.effects.push(effect);
        }
      }
    }
  }

  save(): GFFObject {
    const gff = new GFFObject();
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
    const swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );
    
    //Effects
    const effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue( this.position.x );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue( this.position.y );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue( this.position.z );

    const theta = this.rotation.z * Math.PI;

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue( 1 * Math.cos(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue( 1 * Math.sin(theta) );
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue( 0 );
    
    return gff;
  }

}