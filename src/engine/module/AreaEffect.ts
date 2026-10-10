import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@engine/nwscript/events";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import { GameObject } from "@engine/module/GameObject";
import { AreaOfEffectShape } from "@core/enums/module/AreaOfEffectShape";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { GameEffectFactory } from "@engine/effects/GameEffectFactory";
import { GameState } from "@engine/runtime/GameState";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { SignalEventType } from "@core/enums/events/SignalEventType";

import { isCreature } from "@engine/module/guards/isCreature";

/**
 * AreaEffect class.
 *
 * Class representing an area of effect.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AreaEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AreaEffect extends GameObject {

  areaEffectId: number;
  duration: number;
  durationType: number;

  creator: GameObject;
  creatorId: number;

  linkedToObjectId: number;

  lastEnteredId: number;
  lastEntered: GameObject;

  lastLeftId: number;
  lastLeft: GameObject;

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

  /** Script resrefs before NWScript.Load (from vfx_persistent / effect overrides). */
  override scriptResRefs: Partial<Record<string, string>> & {
    onEnter?: string;
    heartbeat?: string;
    onExit?: string;
    onUserDefined?: string;
  } = { onEnter: '', heartbeat: '', onExit: '', onUserDefined: '' };

  heartbeatMsAccum: number = 0;
  durationMsRemaining: number = 0;
  destroyRequested: boolean = false;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.AreaEffect;
    this.radius = 5;
    this.shape = AreaOfEffectShape.CIRCLE;
    this.length = 0;
    this.width = 0;
    this.spellSaveDC = 14;
    this.lastHeartBeatDay = 0;
    this.lastHeartbeatTime = 0;
  }

  load(){
    //We already have the template (From SAVEGAME)
    this.initProperties();
    this.loadScripts();
  }

  /**
   * Load shape/scripts from vfx_persistent.2da (LoadAreaEffect).
   */
  loadFromPersistentRow(
    rowId: number,
    overrides?: { onEnter?: string; heartbeat?: string; onExit?: string }
  ){
    this.areaEffectId = rowId;
    const table = GameState.TwoDAManager.datatables.get('vfx_persistent')
      || GameState.TwoDAManager.datatables.get('vfx_persist');
    const row = table?.rows?.[rowId];
    if(row){
      this.tag = String(row.label || row.Label || `aoe_${rowId}`);
      const shape = String(row.shape || row.SHAPE || 'C').toUpperCase();
      if(shape.startsWith('R')){
        this.shape = AreaOfEffectShape.RECTANGLE;
        this.length = parseFloat(row.length || row.LENGTH || 0) || 0;
        this.width = parseFloat(row.width || row.WIDTH || 0) || 0;
        this.radius = Math.sqrt(
          Math.pow(this.length / 2, 2) + Math.pow(this.width / 2, 2)
        );
      }else{
        this.shape = AreaOfEffectShape.CIRCLE;
        this.radius = parseFloat(row.radius || row.RADIUS || 5) || 5;
      }
      this.scriptResRefs.onEnter = String(row.onenter || row.ONENTER || '');
      this.scriptResRefs.heartbeat = String(row.heartbeat || row.HEARTBEAT || '');
      this.scriptResRefs.onExit = String(row.onexit || row.ONEXIT || '');
    }else{
      this.tag = `aoe_${rowId}`;
      this.shape = AreaOfEffectShape.CIRCLE;
      this.radius = 5;
    }
    if(overrides?.onEnter) this.scriptResRefs.onEnter = overrides.onEnter;
    if(overrides?.heartbeat) this.scriptResRefs.heartbeat = overrides.heartbeat;
    if(overrides?.onExit) this.scriptResRefs.onExit = overrides.onExit;
  }

  loadScripts(){
    const map: [ScriptHook, keyof typeof this.scriptResRefs][] = [
      [ScriptHook.AoEOnEnter, 'onEnter'],
      [ScriptHook.AoEOnHeartbeat, 'heartbeat'],
      [ScriptHook.AoEOnExit, 'onExit'],
      [ScriptHook.AoEOnUserDefined, 'onUserDefined'],
    ];
    for(const [scriptKey, refKey] of map){
      const ref = this.scriptResRefs[refKey];
      if(!ref) continue;
      const nwscript = GameState.NWScript.Load(ref);
      if(!nwscript) continue;
      nwscript.bindOwner(this, scriptKey);
      this.scripts[scriptKey] = nwscript;
      if(scriptKey === ScriptHook.AoEOnHeartbeat) this.onHeartbeat = nwscript;
      if(scriptKey === ScriptHook.AoEOnEnter) this.onObjectEnter = nwscript;
      if(scriptKey === ScriptHook.AoEOnExit) this.onObjectExit = nwscript;
      if(scriptKey === ScriptHook.AoEOnUserDefined) this.onUserDefined = nwscript;
    }
  }

  isInsideBoundingBox(object: GameObject): boolean {
    if(!object) return false;
    const dx = object.position.x - this.position.x;
    const dy = object.position.y - this.position.y;
    if(this.shape === AreaOfEffectShape.RECTANGLE){
      const halfL = (this.length || 0) / 2;
      const halfW = (this.width || 0) / 2;
      return Math.abs(dx) <= halfL && Math.abs(dy) <= halfW;
    }
    const r = this.radius || 0;
    return (dx * dx + dy * dy) <= (r * r);
  }

  isInside(object: GameObject): boolean {
    return this.objectsInside.indexOf(object) >= 0;
  }

  addObjectInside(object: GameObject): boolean {
    if(this.isInside(object)) return false;
    this.objectsInside.push(object);
    return true;
  }

  removeObjectInside(object: GameObject): boolean {
    const idx = this.objectsInside.indexOf(object);
    if(idx < 0) return false;
    this.objectsInside.splice(idx, 1);
    return true;
  }

  updateObjectInside(object: GameObject){
    if(!object || this.destroyRequested) return;
    if(isCreature(object) && (object as any).isDead?.()){
      // still allow exit when dying
    }
    const inside = this.isInsideBoundingBox(object);
    if(inside){
      const added = this.addObjectInside(object);
      if(added){
        this.lastEntered = object;
        this.lastEnteredId = object.id;
        this.onEnter(object);
      }
      return;
    }
    const removed = this.removeObjectInside(object);
    if(removed){
      this.lastLeft = object;
      this.lastLeftId = object.id;
      this.onExit(object);
    }
  }

  onEnter(object?: GameObject){
    if(!object) return;
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectEnter;
    GameState.module.addEvent(event);
  }

  onExit(object?: GameObject){
    if(!object) return;
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectExit;
    GameState.module.addEvent(event);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.AoEOnUserDefined]);
  }

  /**
   * AIUpdate — follow, occupants, 6s AoE heartbeat.
   */
  aiUpdate(delta = 0){
    if(this.destroyRequested || this.destroyed) return;

    super.aiUpdate(delta);

    // Follow linked creature (circle + linked_to_object)
    if(
      this.shape !== AreaOfEffectShape.RECTANGLE &&
      this.linkedToObject &&
      isCreature(this.linkedToObject)
    ){
      if((this.linkedToObject as any).isDead?.() || !this.linkedToObject.area){
        this.requestDestroy();
        return;
      }
      this.position.copy(this.linkedToObject.position);
    }

    // Temporary duration countdown (seconds → ms)
    if(this.durationType === GameEffectDurationType.TEMPORARY && this.duration > 0){
      if(this.durationMsRemaining <= 0){
        this.durationMsRemaining = this.duration * 1000;
      }
      this.durationMsRemaining -= delta * 1000;
      if(this.durationMsRemaining <= 0){
        this.requestDestroy();
        return;
      }
    }

    // Refresh occupants
    const creatures = this.area?.creatures || [];
    for(let i = 0; i < creatures.length; i++){
      this.updateObjectInside(creatures[i]);
    }
    const party = GameState.PartyManager?.party || [];
    for(let i = 0; i < party.length; i++){
      if(party[i]) this.updateObjectInside(party[i]);
    }

    // Heartbeat ~6s (AIUpdate > 5999ms); skip first tick
    if(this.lastHeartBeatDay === 0 && this.lastHeartbeatTime === 0){
      this.lastHeartBeatDay = GameState.module.timeManager.pauseDay;
      this.lastHeartbeatTime = GameState.module.timeManager.pauseTime;
      this.heartbeatMsAccum = 0;
      return;
    }
    this.heartbeatMsAccum += delta * 1000;
    if(this.heartbeatMsAccum > 5999){
      this.heartbeatMsAccum = 0;
      this.lastHeartBeatDay = GameState.module.timeManager.pauseDay;
      this.lastHeartbeatTime = GameState.module.timeManager.pauseTime;
      const hb = this.getScriptInstance(ScriptHook.AoEOnHeartbeat) || this.onHeartbeat;
      if(hb){
        hb.run(this);
      }
    }
  }

  update(delta = 0){
    // Visual/client pass — AoE work lives in aiUpdate
    super.update(delta);
  }

  updatePaused(delta = 0){
    // AoEs freeze with world pause
  }

  requestDestroy(){
    if(this.destroyRequested) return;
    this.destroyRequested = true;
    // Exit everyone still inside
    const inside = this.objectsInside.slice();
    for(let i = 0; i < inside.length; i++){
      this.removeObjectInside(inside[i]);
      this.onExit(inside[i]);
    }
    this.destroy();
  }

  destroy(){
    if(this.area){
      this.area.detachObject(this);
    }
    super.destroy();
  }

  initProperties(): void {
    const needsRegister = !this.initialized;
    if(needsRegister){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
    }

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

    //RECT
    if(this.shape == AreaOfEffectShape.RECTANGLE){
      if(this.template.RootNode.hasField('Length'))
        this.length = this.template.getFieldByLabel('Length').getValue();

      if(this.template.RootNode.hasField('Width'))
        this.width = this.template.getFieldByLabel('Width').getValue();
    }
    //CIRCLE
    else
    {
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

    this.loadActionList();

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

    if(this.template.RootNode.hasField('Tag')){
      this.tag = this.template.getFieldByLabel('Tag').getValue();
    }

    // Script resrefs from GFF override 2DA defaults when present.
    if(this.template.RootNode.hasField('OnObjEnter')){
      const resRef = this.template.getFieldByLabel('OnObjEnter').getValue();
      if(resRef) this.scriptResRefs.onEnter = resRef;
    }
    if(this.template.RootNode.hasField('OnHeartbeat')){
      const resRef = this.template.getFieldByLabel('OnHeartbeat').getValue();
      if(resRef) this.scriptResRefs.heartbeat = resRef;
    }
    if(this.template.RootNode.hasField('OnObjExit')){
      const resRef = this.template.getFieldByLabel('OnObjExit').getValue();
      if(resRef) this.scriptResRefs.onExit = resRef;
    }
    if(this.template.RootNode.hasField('OnUserDefined')){
      const resRef = this.template.getFieldByLabel('OnUserDefined').getValue();
      if(resRef) this.scriptResRefs.onUserDefined = resRef;
    }

    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }
    this.initialized = true;
  }

  save(): GFFObject {
    let gff = new GFFObject();
    gff.FileType = 'AOE ';

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'AreaEffectId') ).setValue(this.areaEffectId); // vfx_persist id

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LinkedToObject') ).setValue( this.linkedToObject instanceof GameObject ? this.linkedToObject.id : GameObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).setValue( this.creator instanceof GameObject ? this.creator.id : GameObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastEntered') ).setValue( this.lastEntered instanceof GameObject ? this.lastEntered.id : GameObjectConstant.OBJECT_INVALID );

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastLeft') ).setValue( this.lastLeft instanceof GameObject ? this.lastLeft.id : GameObjectConstant.OBJECT_INVALID );

    
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Duration') ).setValue(this.duration);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE,  'DurationType') ).setValue(this.durationType);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastHrtbtDay') ).setValue(this.lastHeartBeatDay);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'LastHrtbtTime') ).setValue(this.lastHeartbeatTime);

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