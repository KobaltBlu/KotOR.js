import { GameObject } from "@engine/module/GameObject";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "@engine/render/three/odyssey";
import { GameState } from "@engine/runtime/GameState";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { ModuleTriggerType } from "@core/enums/module/ModuleTriggerType";
import { ConfigClient } from "@core/filesystem/ConfigClient";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { ModuleDoorAnimState, SignalEventType } from "@core/enums";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { NWScriptEvent } from "@engine/nwscript/events";
import type { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { ModuleLoadCoordinator } from '@engine/runtime/ModuleLoadCoordinator';
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { triggerSerializer } from "@engine/module/serialization/TriggerSerializer";
import {
  PersistentZoneOccupancy,
  TriggerPolicy,
  containsXYAabb,
} from "@engine/module/occupancy";


const OBJECTS_INSIDE_UPDATE_THRESHOLD = 15; // 15 frame ticks

/**
* Trigger class.
*
* Class representing a trigger object found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Trigger.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Trigger extends GameObject {
  private occupancy: PersistentZoneOccupancy<GameObject>;
  private occupancyPolicy: TriggerPolicy;
  objectsInsideIdx: number;
  lastObjectEntered: GameObject;
  lastObjectExited: GameObject;
  triggered: boolean;

  trapModel: OdysseyModel3D;
  trapAnimationState: ModuleDoorAnimState = ModuleDoorAnimState.DEFAULT;
  trapName: string = '';

  reticleNode: OdysseyObject3D = new OdysseyObject3D();
  trapModelResRef: string;
  trapExplosionSound: string;
  trapTriggered: boolean;
  trapResRef: string;
  declare type: ModuleTriggerType;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.Trigger;

    this.template = gff;
    this.objectsInside = [];
    this.occupancy = new PersistentZoneOccupancy(this.objectsInside);
    this.occupancyPolicy = new TriggerPolicy(this);
    this.objectsInsideIdx = 0;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;

    this.setByPlayerParty = 0;

    this.tag = '';
    this.vertices = [];
    this.box = new THREE.Box3();

    this.triggered = false;
    this.highlightHeight = 0.10000000149011612;
    // Defer initProperties until loadTriggers → load (Load* + AddToArea).

    this.container.add(this.reticleNode);
    this.reticleNode.position.z = this.highlightHeight;

  }

  getReticleNode(){
    return this.reticleNode;
  }

  getName(){
    if(this.type == ModuleTriggerType.TRAP){
      return this.trapName;
    }
    return '';
  }

  getType(){
    return this.type;
  }

  isDead(){
    return false;
  }

  getCurrentRoom(){
    let _distance = 1000000000;
    const rooms = this.area?.rooms;
    if(!rooms){
      return;
    }
    for(let i = 0; i < rooms.length; i++){
      let room = rooms[i];
      let model = room.model;
      if(model instanceof OdysseyModel3D){
        let pos = this.position.clone();
        if(this.boxContainsPoint(pos)){
          let roomCenter = model.box.getCenter(new THREE.Vector3()).clone();
          let distance = pos.distanceTo(roomCenter);
          if(distance < _distance){
            _distance = distance;
            this.attachToRoom(room);
          }
        }
      }
    }
  }

  getGeometry(){
    const trigGeom = new THREE.BufferGeometry();

    try{
      const vertices = this.vertices.slice();
      const holes: THREE.Vector2[][] = [];
      const triangles = THREE.ShapeUtils.triangulateShape ( vertices, holes );
      trigGeom.setIndex(triangles.flat());
      trigGeom.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.map( (v: THREE.Vector3) => v.toArray() ).flat(), 3 ) );
    }catch(e){
      console.error('Trigger', 'Failed to generate faces', {
        trigger: this,
        error: e
      })
    }

    // trigGeom.computeFaceNormals;
    trigGeom.computeVertexNormals();
    trigGeom.computeBoundingSphere();

    return trigGeom;
  }

  load( onLoad?: Function ){
    // GIT TriggerList entries only carry TemplateResRef + geometry. Seed before
    // choosing the UTT-merge path so new games don't take the savegame branch.
    this.seedResRefsFromTemplate();

    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'utt',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(!merged){
        console.error('Failed to load Trigger template');
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
        this.loadScripts();
        this.buildGeometry();
        this.initObjectsInside();
        this.loadTrap();
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts();
      this.buildGeometry();
      this.initObjectsInside();
      this.loadTrap();
    }
  }

  loadTrap(){
    if(this.type == 2 && this.trapModelResRef && this.trapModelResRef != '***'){
      MDLLoader.loader.load(this.trapModelResRef).then( (trapMDL) => {
        OdysseyModel3D.FromMDL(trapMDL, {
          context: this.context,
          castShadow: false,
          receiveShadow: false,
          mergeStatic: false
        }).then( (model: OdysseyModel3D) => {
          this.trapModel = model;
          this.container.add(model);
          if(this.trapDetected){
            this.model.playAnimation('detect', false);
          }else{
            this.model.playAnimation('default', false);
          }
        });
      });
    }
  }

  buildGeometry(){
    let trigGeom = this.getGeometry();

    let material = new THREE.MeshBasicMaterial({
      color: new THREE.Color( 0xFFFFFF ),
      side: THREE.DoubleSide
    });

    switch(this.getType()){
      case ModuleTriggerType.GENERIC:
        material.color.setHex(0xFF0000)
      break;
      case ModuleTriggerType.TRANSITION:
        material.color.setHex(0x00FF00)
      break;
      case ModuleTriggerType.TRAP:
        material.color.setHex(0xFFEB00)
      break;
    }

    this.mesh = new THREE.Mesh( trigGeom, material );
    this.box.setFromObject(this.mesh);
    this.box.min.z -= 100;
    this.box.max.z += 100;
    //this.box = this.mesh.box;

    /*
     * Orientation values are wrong in savegames. If rotation is not set they are always placed correctly
     * // this.mesh.rotation.set(this.getXOrientation, this.getYOrientation, this.getZOrientation);
     */

    this.mesh.userData.gameObject = this;
    this.mesh.visible = false;
    this.container.add(this.mesh);
    GameState.group.triggers.add(this.container);
  }

  detectTrap(detector?: GameObject){
    if(detector){
      this.setTrapDetectedBy(detector);
    }else if(!this.trapDetected){
      this.trapDetected = true;
    }

    if(this.trapDetected){
      this.model?.playAnimation?.('detect', false);
    }else{
      this.model?.playAnimation?.('default', false);
    }
  }

  //Some modules have exit triggers that are placed in the same location that the player spawns into
  //This is my way of keeping the player from immediately activating the trigger
  //They will be added to the objectsInside array without triggering the onEnter script
  //If they leave the trigger and then return it will then fire normally
  initObjectsInside(){
    //Check to see if this trigger is linked to another module
    if(this.linkedToModule && this.type == 1){
      //Check Party Members
      const party = getDefaultRuntimeContext().getParty?.() ?? [];
      const partyLen = party.length;
      for(let i = 0; i < partyLen; i++){
        const partymember = party[i];
        const pos = partymember.position;
        if(!containsXYAabb(pos, this.box.min, this.box.max)){ continue; }
        const added = this.addObjectInside(partymember);
        if(!added){ continue; }
        
        partymember.lastTriggerEntered = this;
        this.lastObjectEntered = partymember;
      }
    }else{
      //Check Creatures
      const creatures = this.area?.creatures;
      if(creatures){
        const creatureLen = creatures.length;
        for(let i = 0; i < creatureLen; i++){
          const creature = creatures[i];
          const pos = creature.position;
          if(!containsXYAabb(pos, this.box.min, this.box.max)){ continue; }

          const added = this.addObjectInside(creature);
          if(!added){ continue; }
          creature.lastTriggerEntered = this;
          this.lastObjectEntered = creature;
        }
      }
    }
  }

  isInsideBoundingBox(object: GameObject): boolean {
    return containsXYAabb(object.position, this.box.min, this.box.max);
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

  isUseable(): boolean {
    return this.type == ModuleTriggerType.TRAP;
  }

  canTrigger(object: GameObject): boolean {
    return this.isHostile(object) && (!this.triggered || !this.trapOneShot);
  }

  /**
   * AIUpdate — heartbeat/effects + action queue.
   */
  aiUpdate(delta = 0){
    super.aiUpdate(delta);
    if(this.willDestroy || this.destroyed) return;

    this.action = this.actionQueue[0];
    this.actionQueue.process(delta);
  }

  /**
   * Static — skip walkmesh roomCheck (would snap Z). Room via getCurrentRoom.
   */
  protected updateRoomAttachment(_delta: number = 0){}

  update(delta = 0){
    
    super.update(delta);
    
    if(!this.room) this.getCurrentRoom();
    try{
      if(!this.room.model?.userData?.visActive)
        return;
    }catch(e){}

    this.action = this.actionQueue[0];
    // Action queue processed in aiUpdate

    if(this.trapModel){
      this.trapModel.update(delta);
      if(this.trapDetected && this.trapModel.animationManager.currentAnimation?.name != 'detect'){
        this.trapModel.playAnimation('detect', false);
      }else if(!this.trapDetected && this.trapModel.animationManager.currentAnimation?.name != 'default'){
        this.trapModel.playAnimation('default', false);
      }
    }
    
    //Call the function to update the objectsInside array
    //this.autoUpdateObjectsInside;

    if(this.mesh){
      this.mesh.visible = ConfigClient.get('Game.debug.trigger_geometry_show') ? true : false;
    }
  }

  /**
   * Timer for the objectsInside array update
   * If the timer is less than the OBJECTS_INSIDE_UPDATE_THRESHOLD, ignore the update
   */
  #autoObjectsInsideTimer = 0;

  /**
   * Update the objectsInside array
   * @deprecated - use the positionChanged event inside Creature instead
   * @param delta
   * @returns
   */
  autoUpdateObjectsInside(){
    this.#autoObjectsInsideTimer += 1;
    if(this.#autoObjectsInsideTimer < OBJECTS_INSIDE_UPDATE_THRESHOLD){ return; }
    this.#autoObjectsInsideTimer = 0;

    const creaturesToCheck = [
      ...(this.area?.creatures ?? []).filter(object => this.isInsideBoundingBox(object)),
      ...(getDefaultRuntimeContext().getParty?.() ?? [])
        .filter(object => this.isInsideBoundingBox(object))
    ];

    //Check Creatures in Area
    const creatureLen = creaturesToCheck.length;
    for(let i = 0; i < creatureLen; i++){
      const creature = creaturesToCheck[i];
      this.updateObjectInside(creature);
    }
  }

  /**
   * Update the objectsInside array and fire enter/exit for occupancy changes.
   *
   * Generic and transition triggers queue enter behavior for each newly observed
   * occupant. Trap hostility and one-shot checks are applied after membership.
   */
  updateObjectInside(object: GameObject){
    this.occupancy.applyTransition(
      object,
      this.isInsideBoundingBox(object),
      this.occupancyPolicy
    );
  }

  onEnter(object?: GameObject){
    if(!object){ return; }
    console.log('Trigger.onEnter', this.type,  this.getTag());
    const runtime = getDefaultRuntimeContext();
    if(this.type == ModuleTriggerType.TRAP && !this.trapTriggered){
      if(object.isHostile(this)){
        this.trapTriggered = true;
        console.log('Trigger.onEnter', 'Trap Triggered')
        const event = runtime.createSignalEvent();
        if(!event) return;
        event.setCaller(object);
        event.setObject(this);
        event.setDay(runtime.getPauseDay());
        event.setTime(runtime.getPauseTime());
        event.eventType = SignalEventType.OnTrapTriggered;
        runtime.addEvent(event);
      }
    }else if(this.linkedToModule && (runtime.getMode() != EngineMode.DIALOG)){
      if(object == runtime.getCurrentPlayer?.()){
        ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(this.linkedToModule.toLowerCase(), this.linkedTo.toLowerCase());
      }
      return;
    }

    console.log('Trigger', this.getTag(), 'enter 1')
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
    if(!object){ return; }
    console.log('Trigger', this.getTag(), 'exit')
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

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.TriggerOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.TriggerOnUserDefined]);
  }

  override bindTrapTriggeredScript(nwscript: NWScriptInstance): ScriptHook | undefined {
    this.scripts[ScriptHook.TriggerOnTrapTriggered] = nwscript;
    return ScriptHook.TriggerOnTrapTriggered;
  }

  loadScripts(){
    const scriptKeys = [
      ScriptHook.TriggerOnClick,
      ScriptHook.TriggerOnDisarm,
      ScriptHook.TriggerOnTrapTriggered,
      ScriptHook.TriggerOnHeartbeat,
      ScriptHook.TriggerOnEnter,
      ScriptHook.TriggerOnExit,
      ScriptHook.TriggerOnUserDefined,
    ];

    this.hydrateScriptResRefsFromTemplate(scriptKeys);
    this.bindScriptsFromResRefs(scriptKeys);
  }

  initProperties(){
    const needsRegister = !this.initialized;
    triggerSerializer.deserialize(this, this.template, {
      actionFromStruct: (struct) => GameState.ActionFactory.FromStruct(struct),
    });

    this.faction = GameState.FactionManager.factions.get(this.factionId);
    if(this.portraitId){
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }


    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }

    if(this.type == ModuleTriggerType.TRAP){
      const trap = GameState.SWRuleSet.traps[this.trapType];
      if(trap){
        this.trapName = GameState.TLKManager.GetStringById(trap.name).Value;
        this.trapModelResRef = trap.model;
        this.trapExplosionSound = trap.explosionsound;
        this.trapResRef = trap.resref;
      }
    }
    this.initialized = true;
  }

  destroy(): void {
    super.destroy();

    if(this.trapModel){
      this.trapModel.removeFromParent();
      this.trapModel.dispose();
    }

    if(this.area) this.area.detachObject(this);
  }

  save(){
    const gff = triggerSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

}
