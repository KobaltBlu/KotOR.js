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
import { GameState } from "@engine/runtime/GameState";
import { areaEffectSerializer } from "@engine/module/serialization/AreaEffectSerializer";
import { GameObjectInitFinalizer } from "@engine/module/serialization/GameObjectInitFinalizer";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { SignalEventType } from "@core/enums/events/SignalEventType";
import { getDefaultRuntimeContext } from "@engine/runtime/context";

import { isCreature } from "@engine/module/guards/isCreature";
import {
  AreaEffectPolicy,
  PersistentZoneOccupancy,
  containsXYCircle,
  containsXYRect,
} from "@engine/module/occupancy";

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
  private occupancy: PersistentZoneOccupancy<GameObject>;
  private occupancyPolicy: AreaEffectPolicy;

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
    this.occupancy = new PersistentZoneOccupancy(this.objectsInside);
    this.occupancyPolicy = new AreaEffectPolicy(this);
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
    if(this.shape === AreaOfEffectShape.RECTANGLE){
      return containsXYRect(
        object.position,
        this.position,
        this.length || 0,
        this.width || 0
      );
    }
    return containsXYCircle(object.position, this.position, this.radius || 0);
  }

  isInside(object: GameObject): boolean {
    return this.occupancy.contains(object);
  }

  addObjectInside(object: GameObject): boolean {
    return this.occupancy.add(object);
  }

  removeObjectInside(object: GameObject): boolean {
    return this.occupancy.remove(object);
  }

  updateObjectInside(object: GameObject){
    if(!object || this.destroyRequested) return;
    if(isCreature(object) && (object as any).isDead?.()){
      // still allow exit when dying
    }
    this.occupancy.applyTransition(
      object,
      this.isInsideBoundingBox(object),
      this.occupancyPolicy
    );
  }

  onEnter(object?: GameObject){
    if(!object) return;
    const runtime = getDefaultRuntimeContext();
    const event = runtime.createSignalEvent();
    if(!event) return;
    event.setCaller(object);
    event.setObject(this);
    event.setDay(runtime.getPauseDay());
    event.setTime(runtime.getPauseTime());
    event.eventType = SignalEventType.OnObjectEnter;
    runtime.addEvent(event);
  }

  onExit(object?: GameObject){
    if(!object) return;
    const runtime = getDefaultRuntimeContext();
    const event = runtime.createSignalEvent();
    if(!event) return;
    event.setCaller(object);
    event.setObject(this);
    event.setDay(runtime.getPauseDay());
    event.setTime(runtime.getPauseTime());
    event.eventType = SignalEventType.OnObjectExit;
    runtime.addEvent(event);
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
    const runtime = getDefaultRuntimeContext();

    if(
      !this.linkedToObject &&
      Number.isFinite(this.linkedToObjectId) &&
      this.linkedToObjectId !== GameObjectConstant.OBJECT_INVALID
    ){
      this.linkedToObject = runtime.getById(this.linkedToObjectId);
    }

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
    const party = runtime.getParty?.() ?? [];
    for(let i = 0; i < party.length; i++){
      if(party[i]) this.updateObjectInside(party[i]);
    }

    // Heartbeat ~6s (AIUpdate > 5999ms); skip first tick
    if(this.lastHeartBeatDay === 0 && this.lastHeartbeatTime === 0){
      this.lastHeartBeatDay = runtime.getPauseDay();
      this.lastHeartbeatTime = runtime.getPauseTime();
      this.heartbeatMsAccum = 0;
      return;
    }
    this.heartbeatMsAccum += delta * 1000;
    if(this.heartbeatMsAccum > 5999){
      this.heartbeatMsAccum = 0;
      this.lastHeartBeatDay = runtime.getPauseDay();
      this.lastHeartbeatTime = runtime.getPauseTime();
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
    areaEffectSerializer.deserialize(this, this.template, {
      actionFromStruct: (struct) => GameState.ActionFactory.FromStruct(struct),
      effectFromStruct: (struct) => GameState.GameEffectFactory.EffectFromStruct(struct),
    });


    for(let i = 0; i < this.effects.length; i++){
      const effect = this.effects[i];
      effect.setAttachedObject(this);
      effect.loadModel();
    }

    GameObjectInitFinalizer.finalize(this, {
      needsRegister,
      register: () => GameState.GameObjectManager.RegisterObject(this),
    });

    if(
      Number.isFinite(this.linkedToObjectId) &&
      this.linkedToObjectId !== GameObjectConstant.OBJECT_INVALID
    ){
      this.linkedToObject = GameState.GameObjectManager.GetObjectById(this.linkedToObjectId);
    }
  }

  save(): GFFObject {
    const gff = areaEffectSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

}