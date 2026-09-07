import { GFFDataType } from "@/enums/resource/GFFDataType";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { ModuleObject } from "@/module/ModuleObject";
import { AreaOfEffectShape } from "@/enums/module/AreaOfEffectShape";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { GameEffectFactory } from "@/effects/GameEffectFactory";
import { GameState } from "@/GameState";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { SignalEventType } from "@/enums/events/SignalEventType";
import { BitWise } from "@/utility/BitWise";

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

  /** Script resrefs before NWScript.Load (from vfx_persistent / effect overrides). */
  scriptResRefs: {
    onEnter: string;
    heartbeat: string;
    onExit: string;
    onUserDefined: string;
  } = { onEnter: '', heartbeat: '', onExit: '', onUserDefined: '' };

  heartbeatMsAccum: number = 0;
  durationMsRemaining: number = 0;
  destroyRequested: boolean = false;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleAreaOfEffect;
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
    const map: [ModuleObjectScript, string][] = [
      [ModuleObjectScript.AoEOnEnter, this.scriptResRefs.onEnter],
      [ModuleObjectScript.AoEOnHeartbeat, this.scriptResRefs.heartbeat],
      [ModuleObjectScript.AoEOnExit, this.scriptResRefs.onExit],
      [ModuleObjectScript.AoEOnUserDefined, this.scriptResRefs.onUserDefined],
    ];
    // Also load from GFF template fields if present
    const node = this.template?.RootNode;
    const gffKeys: [ModuleObjectScript, string][] = [
      [ModuleObjectScript.AoEOnEnter, 'OnObjEnter'],
      [ModuleObjectScript.AoEOnHeartbeat, 'OnHeartbeat'],
      [ModuleObjectScript.AoEOnExit, 'OnObjExit'],
      [ModuleObjectScript.AoEOnUserDefined, 'OnUserDefined'],
    ];
    for(const [key, field] of gffKeys){
      if(node?.hasField(field)){
        const resRef = node.getFieldByLabel(field).getValue();
        if(resRef) this.scriptResRefs[
          key === ModuleObjectScript.AoEOnEnter ? 'onEnter'
            : key === ModuleObjectScript.AoEOnHeartbeat ? 'heartbeat'
            : key === ModuleObjectScript.AoEOnExit ? 'onExit'
            : 'onUserDefined'
        ] = resRef;
      }
    }
    for(const [scriptKey, resRef] of map){
      const ref = scriptKey === ModuleObjectScript.AoEOnEnter ? this.scriptResRefs.onEnter
        : scriptKey === ModuleObjectScript.AoEOnHeartbeat ? this.scriptResRefs.heartbeat
        : scriptKey === ModuleObjectScript.AoEOnExit ? this.scriptResRefs.onExit
        : this.scriptResRefs.onUserDefined;
      if(!ref) continue;
      const nwscript = GameState.NWScript.Load(ref);
      if(!nwscript) continue;
      nwscript.caller = this;
      this.scripts[scriptKey] = nwscript;
      if(scriptKey === ModuleObjectScript.AoEOnHeartbeat) this.onHeartbeat = nwscript;
      if(scriptKey === ModuleObjectScript.AoEOnEnter) this.onObjectEnter = nwscript;
      if(scriptKey === ModuleObjectScript.AoEOnExit) this.onObjectExit = nwscript;
      if(scriptKey === ModuleObjectScript.AoEOnUserDefined) this.onUserDefined = nwscript;
    }
  }

  isInsideBoundingBox(object: ModuleObject): boolean {
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

  isInside(object: ModuleObject): boolean {
    return this.objectsInside.indexOf(object) >= 0;
  }

  addObjectInside(object: ModuleObject): boolean {
    if(this.isInside(object)) return false;
    this.objectsInside.push(object);
    return true;
  }

  removeObjectInside(object: ModuleObject): boolean {
    const idx = this.objectsInside.indexOf(object);
    if(idx < 0) return false;
    this.objectsInside.splice(idx, 1);
    return true;
  }

  updateObjectInside(object: ModuleObject){
    if(!object || this.destroyRequested) return;
    if(BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature) && (object as any).isDead?.()){
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

  onEnter(object?: ModuleObject){
    if(!object) return;
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectEnter;
    GameState.module.addEvent(event);
  }

  onExit(object?: ModuleObject){
    if(!object) return;
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectExit;
    GameState.module.addEvent(event);
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
      BitWise.InstanceOfObject(this.linkedToObject, ModuleObjectType.ModuleCreature)
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
      const hb = this.getScriptInstance(ModuleObjectScript.AoEOnHeartbeat) || this.onHeartbeat;
      if(hb){
        hb.caller = this;
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

    if(needsRegister){
      GameState.ModuleObjectManager.RegisterObject(this);
    }
    this.initialized = true;
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