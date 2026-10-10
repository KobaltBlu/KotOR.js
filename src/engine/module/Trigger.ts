import { GameObject } from "@engine/module/GameObject";
import { GFFObject } from "@core/resource/GFFObject";
import * as THREE from "three";
import { OdysseyModel3D, OdysseyObject3D } from "@engine/render/three/odyssey";
import { GameState } from "@engine/runtime/GameState";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFStruct } from "@core/resource/GFFStruct";
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

  getTag(){
    return this.tag;
  }

  getTemplateResRef(){
    return this.templateResRef;
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
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
    // GIT TriggerList entries only carry TemplateResRef + geometry. initProperties is
    // deferred until load, so templateResRef is still unset here — read it from the
    // GFF before choosing the UTT-merge path. Skipping this took the savegame branch
    // on new games (no Tag/ScriptOnEnter), so triggers never fired scripts.
    if(!this.templateResRef && this.template?.RootNode?.hasField('TemplateResRef')){
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();
    }

    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utt'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadScripts()
        this.buildGeometry();
        this.initObjectsInside();
        this.loadTrap();
      }else{
        console.error('Failed to load Trigger template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
          this.buildGeometry();
          this.initObjectsInside();
          this.loadTrap();
        }
      }

    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      this.loadScripts()
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
      const partyLen = GameState.PartyManager.party.length;
      for(let i = 0; i < partyLen; i++){
        const partymember = GameState.PartyManager.party[i];
        const pos = partymember.position;
        if(!this.boxContainsPoint(pos)){ continue; }
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
          if(!this.boxContainsPoint(pos)){ continue; }

          const added = this.addObjectInside(creature);
          if(!added){ continue; }
          creature.lastTriggerEntered = this;
          this.lastObjectEntered = creature;
        }
      }
    }
  }

  isInsideBoundingBox(object: GameObject): boolean {
    return this.boxContainsPoint(object.position);
  }

  isInside(object: GameObject): boolean {
    return this.objectsInside.indexOf(object) >= 0;
  }

  addObjectInside(object: GameObject): boolean {
    const isInside = this.isInside(object);
    if(isInside){ return false; }
    this.objectsInside.push(object);
    return true;
  }

  removeObjectInside(object: GameObject): boolean {
    const isInside = this.isInside(object);
    if(!isInside){ return false; }
    this.objectsInside.splice(this.objectsInside.indexOf(object), 1);
    return true;
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
      ...(this.area?.creatures ?? []).filter(object => this.boxContainsPoint(object.position)), 
      ...GameState.PartyManager.party.filter(object => this.boxContainsPoint(object.position))
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
   * HandleSubAreaStateChanges queues OnObjectEnter
   * (0xc) for every newly occupied generic/transition trigger — no hostility or
   * global one-shot gate. A previous `!triggered && isHostile` lock meant the first
   * NPC through a Faction=1 trigger on new-game spawn set `triggered` and blocked
   * the player's later enter (save loads usually skip that NPC traffic).
   *
   * Trap one-shot / hostility stays on {@link canTrigger} only.
   */
  updateObjectInside(object: GameObject){
    const isInside = this.isInsideBoundingBox(object);
    if(isInside){
      const added = this.addObjectInside(object);
      if(!added){ return; }

      if(this.type == ModuleTriggerType.TRAP && !this.canTrigger(object)){
        return;
      }

      object.lastTriggerEntered = this;
      this.lastObjectEntered = object;
      this.onEnter(object);
      if(this.type == ModuleTriggerType.TRAP){
        this.triggered = true;
      }
      return;
    }

    const removed = this.removeObjectInside(object);
    if(!removed){ return; }
    object.lastTriggerExited = this;
    this.lastObjectExited = object;
    this.onExit(object);
  }

  onEnter(object?: GameObject){
    if(!object){ return; }
    console.log('Trigger.onEnter', this.type,  this.getTag());
    if(this.type == ModuleTriggerType.TRAP && !this.trapTriggered){
      if(object.isHostile(this)){
        this.trapTriggered = true;
        console.log('Trigger.onEnter', 'Trap Triggered')
        const event = new GameState.GameEventFactory.EventSignalEvent();
        event.setCaller(object);
        event.setObject(this);
        event.setDay(GameState.module.timeManager.pauseDay);
        event.setTime(GameState.module.timeManager.pauseTime);
        event.eventType = SignalEventType.OnTrapTriggered;
        GameState.module.addEvent(event);
      }
    }else if(this.linkedToModule && (GameState.Mode != EngineMode.DIALOG)){
      if(object == GameState.PartyManager.getCurrentPlayer()){
        ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(this.linkedToModule.toLowerCase(), this.linkedTo.toLowerCase());
      }
      return;
    }

    console.log('Trigger', this.getTag(), 'enter 1')
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectEnter;
    GameState.module.addEvent(event);
  }

  onExit(object?: GameObject){
    if(!object){ return; }
    console.log('Trigger', this.getTag(), 'exit')
    const event = new GameState.GameEventFactory.EventSignalEvent();
    event.setCaller(object);
    event.setObject(this);
    event.setDay(GameState.module.timeManager.pauseDay);
    event.setTime(GameState.module.timeManager.pauseTime);
    event.eventType = SignalEventType.OnObjectExit;
    GameState.module.addEvent(event);
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

    const scriptsNode = this.template?.RootNode;
    if(!scriptsNode){ return; }
    
    for(const scriptKey of scriptKeys){
      if(scriptsNode.hasField(scriptKey)){
        const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
        if(!resRef){ continue; }
        const nwscript = GameState.NWScript.Load(resRef);
        if(!nwscript){ continue; }
        nwscript.bindOwner(this, scriptKey);
        this.scripts[scriptKey] = nwscript;
      }
    }
  }

  initProperties(){
    
    const needsRegister = !this.initialized;
    if(needsRegister){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
    }

    if(this.template.RootNode.hasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.getFieldByLabel('AutoRemoveKey').getValue();

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = this.template.getFieldByLabel('Commandable').getValue();

    if(this.template.RootNode.hasField('Cursor'))
      this.cursor = this.template.getFieldByLabel('Cursor').getValue();

    if(this.template.RootNode.hasField('Faction')){
      this.factionId = this.template.getFieldByLabel('Faction').getValue();
      if((this.factionId & 0xFFFFFFFF) == -1){
        this.factionId = 0;
      }
    }
    this.faction = GameState.FactionManager.factions.get(this.factionId);

    if(this.template.RootNode.hasField('Geometry')){
      this.geometry = this.template.getFieldByLabel('Geometry').getChildStructs();

      //Push verticies
      for(let i = 0; i < this.geometry.length; i++){
        let tgv = this.geometry[i];
        this.vertices[i] = new THREE.Vector3( 
          tgv.getFieldByLabel('PointX').getValue(),
          tgv.getFieldByLabel('PointY').getValue(),
          tgv.getFieldByLabel('PointZ').getValue()
        );
      }
    }

    if(this.template.RootNode.hasField('HighlightHeight'))
      this.highlightHeight = this.template.getFieldByLabel('HighlightHeight').getValue();

    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.getFieldByLabel('KeyName').getValue();

    if(this.template.RootNode.hasField('LinkedTo'))
      this.linkedTo = this.template.getFieldByLabel('LinkedTo').getValue();

    if(this.template.RootNode.hasField('LinkedToFlags'))
      this.linkedToFlags = this.template.getFieldByLabel('LinkedToFlags').getValue();
  
    if(this.template.RootNode.hasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.getFieldByLabel('LinkedToModule').getValue();
        
    if(this.template.RootNode.hasField('LoadScreenID'))
      this.loadScreenID = this.template.getFieldByLabel('LoadScreenID').getValue();
    else if(this.template.RootNode.hasField('LoadscreenID'))
      this.loadScreenID = this.template.getFieldByLabel('LoadscreenID').getValue();

    if(this.template.RootNode.hasField('LocalizedName'))
      this.localizedName = this.template.getFieldByLabel('LocalizedName').getCExoLocString();
    else if(this.template.RootNode.hasField('LocName'))
      this.localizedName = this.template.getFieldByLabel('LocName').getCExoLocString();

    if(this.template.RootNode.hasField('PortraidId')){
      this.portraitId = this.template.getFieldByLabel('PortraidId').getValue();
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }

    if(this.template.RootNode.hasField('SetByPlayerParty'))
      this.setByPlayerParty = this.template.getFieldByLabel('SetByPlayerParty').getValue();
    else if(this.template.RootNode.hasField('SetByPartyPlayer'))
      this.setByPlayerParty = this.template.getFieldByLabel('SetByPartyPlayer').getValue();

    if(this.setByPlayerParty){
      this.trapFlag = this.setByPlayerParty;
    }

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('TransitionDestin'))
      this.transitionDestin = this.template.getFieldByLabel('TransitionDestin').getCExoLocString();

    if(this.template.RootNode.hasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.getFieldByLabel('TrapDetectable').getValue();

    if(this.template.RootNode.hasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.getFieldByLabel('TrapDisarmable').getValue();

    if(this.template.RootNode.hasField('TrapOneShot'))
      this.trapOneShot = this.template.getFieldByLabel('TrapOneShot').getValue();

    if(this.template.RootNode.hasField('TrapDetectDC'))
      this.trapDetectDC = this.template.getFieldByLabel('TrapDetectDC').getValue();

    if(this.template.RootNode.hasField('TrapDisarmDC'))
      this.trapDisarmDC = this.template.getFieldByLabel('TrapDisarmDC').getValue();

    if(this.template.RootNode.hasField('TrapFlag'))
      this.trapFlag = this.template.getFieldByLabel('TrapFlag').getValue();

    if(this.template.RootNode.hasField('TrapType'))
      this.trapType = this.template.getFieldByLabel('TrapType').getValue();

    if(this.template.RootNode.hasField('Type'))
      this.type = this.template.getFieldByLabel('Type').getValue();

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('XOrientation'))
      this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();

    if(this.template.RootNode.hasField('SWVarTable')){
      let localBools = this.template.RootNode.getFieldByLabel('SWVarTable').getChildStructs()[0].getFieldByLabel('BitArray').getChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].getFieldByLabel('Variable').getValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }
    
    this.loadActionList();

    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }

    this.initialized = true;

    if(this.type == ModuleTriggerType.TRAP){
      const trap = GameState.SWRuleSet.traps[this.trapType];
      if(trap){
        this.trapName = GameState.TLKManager.GetStringById(trap.name).Value;
        this.trapModelResRef = trap.model;
        this.trapExplosionSound = trap.explosionsound;
        this.trapResRef = trap.resref;
      }
    }

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
    let gff = new GFFObject();
    gff.FileType = 'UTT ';
    gff.RootNode.type = 1;

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).setValue(this.autoRemoveKey);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue( this.commandable );
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).setValue(2130706432);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Cursor') ).setValue(this.cursor);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue(this.faction ? this.faction.id : this.factionId);

    let geometry = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'Geometry') );
    for(let i = 0; i < this.vertices.length; i++){
      let vertStruct = new GFFStruct(3);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointX') ).setValue(this.vertices[i].x);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointY') ).setValue(this.vertices[i].y);
      vertStruct.addField( new GFFField(GFFDataType.FLOAT, 'PointZ') ).setValue(this.vertices[i].z);
      geometry.addChildStruct(vertStruct);
    }

    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'HighlightHeight') ).setValue(this.highlightHeight);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).setValue(this.keyName);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).setValue(this.linkedTo);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LinkedToFlags') ).setValue(this.linkedToFlags);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'LinkedToModule') ).setValue(this.linkedToModule);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'LoadScreenID') ).setValue(this.loadScreenID);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(this.localizedName || this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnClick) ).setValue(this.scripts[ScriptHook.TriggerOnClick]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnDisarm) ).setValue(this.scripts[ScriptHook.TriggerOnDisarm]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnTrapTriggered) ).setValue(this.scripts[ScriptHook.TriggerOnTrapTriggered]?.name || '');
    
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraitId);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnHeartbeat) ).setValue(this.scripts[ScriptHook.TriggerOnHeartbeat]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnEnter) ).setValue(this.scripts[ScriptHook.TriggerOnEnter]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnExit) ).setValue(this.scripts[ScriptHook.TriggerOnExit]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ScriptHook.TriggerOnUserDefined) ).setValue(this.scripts[ScriptHook.TriggerOnUserDefined]?.name || '');

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SetByPlayerParty') ).setValue(this.setByPlayerParty);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin') ).setValue(this.transitionDestin);
    // SaveTrigger omits TrapDetectDC / TrapDisarmDC / TrapFlag (UTT-only)
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).setValue(this.trapDetectable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).setValue(this.trapDisarmable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).setValue(this.trapOneShot);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapType') ).setValue(this.trapType);
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Type') ).setValue(this.type);
    this.writeNamedVarTable(gff.RootNode);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.template.RootNode.getFieldByLabel('XOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.template.RootNode.getFieldByLabel('YOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.template.RootNode.getFieldByLabel('ZOrientation').getValue());
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

}
