import { GameObject } from "@engine/module/GameObject";
import type { AreaRoom } from "@engine/module/area/AreaRoom";
import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { GameState } from "@engine/runtime/GameState";
import { getDefaultRuntimeContext } from "@engine/runtime/context";
import { SSFType } from "@core/enums/resource/SSFType";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@engine/nwscript/events";
import { ExcitedDurationRow } from "@engine/combat/combat-engagement";
import { CExoLocString } from "@core/resource/CExoLocString";
import { GFFObject } from "@core/resource/GFFObject";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { freezeWorldContainer } from "@engine/render/worldMatrix";

import * as THREE from "three";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { OdysseyModel, OdysseyWalkMesh } from "@engine/odyssey";
import { NWScript } from "@engine/nwscript/NWScript";
import { BinaryReader } from "@core/binary/BinaryReader";
import { GFFField } from "@core/resource/GFFField";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFStruct } from "@core/resource/GFFStruct";
import { ModuleDoorAnimState } from "@core/enums/module/ModuleDoorAnimState";
import { ModuleDoorOpenState } from "@core/enums/module/ModuleDoorOpenState";
import { ModuleDoorInteractSide } from "@core/enums/module/ModuleDoorInteractSide";
import { resolveDoorAnimation } from "@engine/module/animation/resolveDoorAnimation";
// import { AppearanceManager, InventoryManager, MenuManager, GameObjectManager, PartyManager, TwoDAManager, FactionManager } from "@engine/managers";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { EngineMode } from "@engine/enums/engine/EngineMode";
import { DLGObject } from "@engine/dialog/DLGObject";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import { SWDoorAppearance } from "@engine/rules/SWDoorAppearance";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { BitWise } from "@core/utility/BitWise";
import { Utility } from "@core/utility/Utility";
import { AudioEmitterType } from "@core/enums/audio/AudioEmitterType";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";
import { GameEffectFactory } from "@engine/effects/GameEffectFactory";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { ModulePlaceableObjectSound, SkillType } from "@core/enums";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { doorSerializer } from "@engine/module/serialization/DoorSerializer";
import { GameObjectInitFinalizer } from "@engine/module/serialization/GameObjectInitFinalizer";
import { composeDoorWalkmeshLocalToWorld } from "@engine/pathfinding/door-walkmesh-matrix";
import { invalidateStaticBlockerGrid } from "@engine/pathfinding/static-blocker-grid";
import type { Creature } from "@engine/module/Creature";

import { isCreature } from "@engine/module/guards/isCreature";
import { getSavingThrowEffectBonus } from "@engine/effects/effect-bonuses";
import { Dice } from "@core/utility/Dice";
import { DiceType } from "@core/enums/combat/DiceType";
import {
  combineSavingThrow,
  rollSavingThrow,
} from "@engine/module/savingThrow/savingThrowMath";
import {
  logAlertzelkOnOpen,
  shouldLogAlertzelkOnOpen,
} from "@engine/module/door/door-onopen-diagnostics";
import { ModuleLoadCoordinator } from '@engine/runtime/ModuleLoadCoordinator';
import { DoorTransitionProximity } from "@engine/module/occupancy";

interface AnimStateInfo {
  lastAnimState: ModuleDoorAnimState;
  currentAnimState: ModuleDoorAnimState;
  loop: boolean;
  started: boolean;
};

/**
* Door class.
*
* Class representing a door found in module areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Door.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Door extends GameObject {
  /** Collision / GetIsOpen state — deferred until open/close anim completes (open_state). */
  openState: ModuleDoorOpenState = ModuleDoorOpenState.DEFAULT;
  /** Target open state set when open/close begins (also_open_state_). */
  alsoOpenState: ModuleDoorOpenState = ModuleDoorOpenState.DEFAULT;
  objectInteractSide: ModuleDoorInteractSide = ModuleDoorInteractSide.SIDE_1;

  lastObjectEntered: GameObject;
  lastObjectExited: GameObject;
  lastObjectOpened: GameObject;
  lastObjectClosed: GameObject;
  lastUsedBy: GameObject;

  animationState: number;
  closeLockDC: number;
  disarmDC: number;
  fort: number;
  genericType: number;
  hardness: number;
  interruptable: boolean;
  keyRequired: boolean;
  lockable: boolean;
  locked: boolean;
  openLockDC: number;
  paletteID: number;
  ref: number;
  secretDoorDC: number;
  static: boolean;
  will: number;
  x: number;
  y: number;
  z: number;
  declare audioEmitter: AudioEmitter;
  boxHelper: THREE.Box3Helper;
  props: any;
  useable: any;
  bodyBag: any;

  trans: THREE.Object3D;
  transitionLineMin: THREE.Vector3 = new THREE.Vector3(-2.5, 0, 0);
  transitionLineMax: THREE.Vector3 = new THREE.Vector3(2.5, 0, 0);
  transitionLine: THREE.Line3;
  transitionClosestPoint: THREE.Vector3 = new THREE.Vector3();
  transitionDistance: number = Infinity;

  animStateInfo: AnimStateInfo = {
    lastAnimState: ModuleDoorAnimState.DEFAULT,
    currentAnimState: ModuleDoorAnimState.DEFAULT,
    loop: false,
    started: false
  };
  destroyAnimationPlayed: boolean = false;

  /** Closed-state DWK (model0.dwk). */
  walkmeshClosed: OdysseyWalkMesh;
  /** Open side-1 DWK (model1.dwk). */
  walkmeshOpen1: OdysseyWalkMesh;
  /** Open side-2 DWK (model2.dwk). */
  walkmeshOpen2: OdysseyWalkMesh;

  doorAppearance: SWDoorAppearance;

  /** MoveNextDoorState — "door" or doneopening / doneclosing events. */
  private static readonly _doorAnimDoneRe = /^done(opening|closing)/i;
  private doorAnimPlayEventHandler = (event: THREE.Event & { event?: string }) => {
    const name = String(event?.event ?? '');
    if(name === 'door' || Door._doorAnimDoneRe.test(name)){
      this.moveToNextOpenState();
    }
  };

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= GameObjectType.Door;
    this.template = gff;
    this.lastObjectEntered = undefined;
    this.lastObjectExited = undefined;
    this.lastObjectOpened = undefined;
    this.lastObjectClosed = undefined;
    this.lastUsedBy = undefined;
    this.model = undefined;

    this.animationState = 0;
    this.appearance = 0;
    this.autoRemoveKey = false;
    this.closeLockDC = 0;
    // LoadObjectState Commandable default = 1
    this.commandable = true;
    this.currentHP = 0;
    this.description = new CExoLocString();
    this.disarmDC = 0;
    this.fort = 0;
    this.genericType = 0;
    this.hp = 0;
    this.hardness = 0;
    this.interruptable = false;
    this.keyName = '';
    this.keyRequired = false;
    this.loadScreenID = 0;
    this.locName = new CExoLocString();
    this.lockable = false;
    this.locked = false;
    this.min1HP = false;
    this.openLockDC = 0;
    this.paletteID = 0;
    this.plot = false;
    this.portraitId = 0;
    this.ref = 0;
    this.secretDoorDC = 0;
    this.static = false;
    // GIT door instances often omit Useable; treats those as interactable.
    this.useable = true;
    this.tag = '';
    this.templateResRef = '';
    this.trapDetectDC = 0;
    this.trapDetectable = false;
    this.trapDisarmable = false;
    this.trapFlag = false;
    this.trapOneShot = false;
    this.trapType = 0;
    this.will = 0;

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.bearing = 0;

    try{
      this.audioEmitter = new AudioEmitter(AudioEngine.GetAudioEngine());
      this.audioEmitter.type = AudioEmitterType.POSITIONAL;
      // this.audioEmitter.setMaxDistance(50);
      this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.ROOM_SOUNDS);
      this.audioEmitter.load();
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  computeBoundingBox(force: boolean = false){
    return super.computeBoundingBox(force);
  }

  isOnScreen(frustum: THREE.Frustum = GameState.viewportFrustum): boolean {
    this.box.getBoundingSphere(this.sphere);
    return frustum.intersectsSphere(this.sphere);
  }

  getX(){
    return this.position.x;
  }

  getY(){
    return this.position.y;
  }

  getZ(){
    return this.position.z;
  }

  getBearing(){
    return this.bearing;
  }

  isLocked(){
    return this.locked;
  }

  setLocked(value: boolean){
    this.locked = value ? true : false;
  }

  requiresKey(){
    return this.keyRequired && this.keyName.length ? true : false;
  }

  getName(){
    return this.locName.getValue();
  }

  getGenericType(){
    return this.genericType;
  }

  getDoorAppearance(){
    return this.doorAppearance;
  }

  getObjectSounds(){
    let result = {"__rowlabel":-1,"label":"","armortype":"","opened":"****","closed":"****","destroyed":"****","used":"****","locked":"****"};
    const appearance = this.getDoorAppearance();
    if(!appearance) return result;

    const soundIdx = appearance.soundapptype;
    if(!isNaN(soundIdx) && soundIdx >= 0){
      const table = GameState.TwoDAManager.datatables.get('placeableobjsnds');
      if(table && typeof table.rows[soundIdx] !== 'undefined'){
        return table.rows[soundIdx];
      }
    }
    return result;
  }

  playObjectSound(type: ModulePlaceableObjectSound){
    const objSounds = this.getObjectSounds();

    if(!this.audioEmitter){
      return;
    }

    switch(type){
      case ModulePlaceableObjectSound.OPENED:
        if(objSounds?.opened != '****'){
          this.audioEmitter.playSound(objSounds?.opened);
        }
      break;
      case ModulePlaceableObjectSound.CLOSED:
        if(objSounds?.closed != '****'){
          this.audioEmitter.playSound(objSounds?.closed);
        }
      break;
      case ModulePlaceableObjectSound.DESTROYED:
        if(objSounds?.destroyed != '****'){
          this.audioEmitter.playSound(objSounds?.destroyed);
        }
      break;
      case ModulePlaceableObjectSound.USED:
        if(objSounds?.used != '****'){
          this.audioEmitter.playSound(objSounds?.used);
        }
      break;
      case ModulePlaceableObjectSound.LOCKED:
        if(objSounds?.locked != '****'){
          this.audioEmitter.playSound(objSounds?.locked);
        }
      break;
    }
  }

  /*getTemplateResRef{
    return this.templateResRef;
  }*/

  getModel(){
    return this.model;
  }

  onHover(){

  }

  /**
   * can_use_actions_ — template Useable flag.
   * Static doors are never interactable. Open / NotBlastable are gated
   * separately by callers (selection, Bash menu).
   * When Useable is absent from the template, default is true (common on GIT doors).
   */
  isUseable(){
    return !!this.useable && !this.static;
  }

  isOpen(){
    return (this.openState == ModuleDoorOpenState.OPEN1 || this.openState == ModuleDoorOpenState.OPEN2);
  }

  /**
   * Door open-state walkmesh for static walk blockers.
   * Missing open1/open2 BWM must NOT fall back to closed — LoadMesh leaves
   * an empty mesh for that slot, and static walk blockers with no faces returns clear.
   */
  getWalkmeshForOpenState(openState: ModuleDoorOpenState = this.openState): OdysseyWalkMesh | undefined {
    switch(openState){
      case ModuleDoorOpenState.OPEN1:
        return this.walkmeshOpen1;
      case ModuleDoorOpenState.OPEN2:
        return this.walkmeshOpen2;
      case ModuleDoorOpenState.DESTROYED:
        return undefined;
      default:
        return this.walkmeshClosed;
    }
  }

  updateCollisionState(): void {
    const prev = this.collisionManager?.walkmesh;
    const next = this.getWalkmeshForOpenState(this.openState);

    if(prev && prev !== next){
      if(prev.mesh){
        GameState.group.room_walkmeshes.remove(prev.mesh);
      }
      if(this.area?.doorWalkmeshes){
        const idx = this.area.doorWalkmeshes.indexOf(prev);
        if(idx >= 0){ this.area.doorWalkmeshes.splice(idx, 1); }
      }
    }

    if(next){
      this.collisionManager.setWalkmesh(next);
      this.markCollisionBoundsDirty('walkmesh');
      this.syncWalkmeshMatrix();
      if(next.mesh){
        GameState.group.room_walkmeshes.add(next.mesh);
      }
      if(this.area?.doorWalkmeshes){
        const idx = this.area.doorWalkmeshes.indexOf(next);
        if(idx == -1){ this.area.doorWalkmeshes.push(next); }
      }
    }else{
      // OPEN1/OPEN2 with missing DWK, or DESTROYED — no blocking geo (empty mesh)
      this.collisionManager.setWalkmesh(undefined);
      this.markCollisionBoundsDirty('walkmesh');
    }

    // DWK volume moves with open-state; refresh spatial prune cells.
    invalidateStaticBlockerGrid(this.area);
  }

  /**
   * Door DWK LocalToWorld for static walk blockers:
   * T(door.pos) * R(door) * T(BWM header.position). Verts stay file-local.
   */
  syncWalkmeshMatrix(): void {
    const wok = this.collisionManager?.walkmesh;
    if(!wok){ return; }
    this.model?.updateMatrix?.();
    composeDoorWalkmeshLocalToWorld(
      wok.matrixWorld,
      this.position,
      this.rotation,
      wok.header?.position,
    );
    // Use-position LocalToWorld shares the same matrix; keep mat4 in sync but
    // do not bake into vertices (updateMatrix would destroy local space).
    wok.mat4.copy(wok.matrixWorld);
    this.walkmeshMatrixDirty = false;
    if(wok.mesh){
      wok.mesh.matrixAutoUpdate = false;
      wok.mesh.matrix.copy(wok.matrixWorld);
      wok.mesh.matrixWorld.copy(wok.matrixWorld);
    }
  }

  /**
   * MoveToNextOpenState
   * commit also_open_state_ → open_state when open/close anim finishes.
   */
  moveToNextOpenState(): void {
    const prev = this.openState;
    this.openState = this.alsoOpenState;
    if(prev !== this.openState){
      this.updateCollisionState();
    }
  }

  /**
   * SetOpenState
   * always sets also_open_state_; open_state only when animate == false.
   */
  setOpenState(openState: ModuleDoorOpenState = ModuleDoorOpenState.CLOSED, animate: boolean = true){
    const currentOpenState = this.openState;
    this.alsoOpenState = openState;

    if(!animate){
      this.openState = openState;
      this.updateCollisionState();
    }

    const wasClosed = (currentOpenState == ModuleDoorOpenState.CLOSED);
    const attemptingOpen = (openState == ModuleDoorOpenState.OPEN1 || openState == ModuleDoorOpenState.OPEN2);
    if(attemptingOpen){
      if(animate && wasClosed){
        if(openState == ModuleDoorOpenState.OPEN1){
          this.setAnimationState(ModuleDoorAnimState.OPENING1);
        }else if(openState == ModuleDoorOpenState.OPEN2){
          this.setAnimationState(ModuleDoorAnimState.OPENING2);
        }
      }else{
        if(openState == ModuleDoorOpenState.OPEN1){
          this.setAnimationState(ModuleDoorAnimState.OPENED1);
        }else if(openState == ModuleDoorOpenState.OPEN2){
          this.setAnimationState(ModuleDoorAnimState.OPENED2);
        }
      }
      return;
    }

    const attemptingClose = (openState == ModuleDoorOpenState.CLOSED);
    if(attemptingClose){
      const needsToAnimate = animate && (currentOpenState == ModuleDoorOpenState.OPEN1 || currentOpenState == ModuleDoorOpenState.OPEN2);
      if(needsToAnimate){
        if(currentOpenState == ModuleDoorOpenState.OPEN1){
          this.setAnimationState(ModuleDoorAnimState.CLOSING1);
        }else{
          this.setAnimationState(ModuleDoorAnimState.CLOSING2);
        }
      }else{
        this.setAnimationState(ModuleDoorAnimState.CLOSED);
      }
      return;
    }

    // DESTROYED / other
    this.setAnimationState(ModuleDoorAnimState.DEFAULT);
  }

  /**
   * OpenDoor — side from facing-plane dot product.
   */
  detectInteractSide(object: GameObject): ModuleDoorInteractSide {
    let side = ModuleDoorInteractSide.SIDE_2;
    if(object){
      const ox = Math.cos(this.bearing);
      const oy = Math.sin(this.bearing);
      const dx = object.position.x - this.position.x;
      const dy = object.position.y - this.position.y;
      if(dx * ox + dy * oy > 0){
        side = ModuleDoorInteractSide.SIDE_1;
      }
    }
    return side;
  }

  onClick(callee: GameObject){
    GameState.PartyManager.getCurrentPlayer().actionOpenDoor( this );
  }

  /**
   * EventHandler script case 7 (OnDialog).
   * OnDialog "default" → k_hen_dialogue01 (doors do not treat empty like creatures).
   */
  override onDialog(oSpeaker: GameObject, listenPatternNumber = -1, conversation: DLGObject = undefined, matchedSubstrings: string[] = []): boolean {
    this.setMatchedSubstrings(matchedSubstrings || []);

    let nwscript = this.scripts[ScriptHook.DoorOnDialog];
    const resRef = nwscript?.name || '';
    if(!nwscript || resRef.toLowerCase() === 'default'){
      const fallback = GameState.NWScript.Load('k_hen_dialogue01');
      if(fallback){
        this.scripts[ScriptHook.DoorOnDialog] = fallback;
        fallback.bindOwner(this, ScriptHook.DoorOnDialog);
        nwscript = fallback;
      }
    }
    if(!nwscript){ return false; }
    nwscript.listenPatternNumber = listenPatternNumber;
    nwscript.listenPatternSpeaker = oSpeaker;
    nwscript.conversation = conversation;
    nwscript.run(this, 0);
    return true;
  }

  use(object: GameObject){

    this.lastUsedBy = object;

    // open_state or in-flight also_open_state (deferred open still counts as opening)
    if(this.openState || this.alsoOpenState){
      return;
    }

    // If the caller is the door itself and the door is closed, open it
    const isCallerSelf = object === this;
    if(isCallerSelf){
      this.openDoor(this);
      return;
    }

    // If the door is locked and a key is required, try to unlock it
    if(this.isLocked() && this.keyRequired){
      if(this.keyName.length){
        const keyItem = GameState.InventoryManager.getItemByTag(this.keyName);
        if(keyItem && BitWise.InstanceOf(keyItem?.objectType, GameObjectType.Item)){
          this.unlock(object);
          if(this.autoRemoveKey){
            object.removeItem(keyItem);
          }
          object.playSoundSet(SSFType.UNLOCK_SUCCESS);
        }
      }

      object.playSoundSet(SSFType.UNLOCK_FAIL);
    }

    // If the door is still locked, run the on fail to open script
    if(this.isLocked()){
      const onFailToOpen = this.scripts[ScriptHook.DoorOnFailToOpen];
      if(onFailToOpen){
        onFailToOpen.run(this);
      }

      this.playObjectSound(ModulePlaceableObjectSound.LOCKED);
      return;
    }
    
    this.openDoor(object);

  }

  lock(object: GameObject){
    if(this.locked){ return; }
    this.locked = true;
    this.lastLockedBy = object;
    
    const onLock = this.scripts[ScriptHook.DoorOnLock];
    if(onLock){
      onLock.run(this);
    }
  }

  unlock(object: GameObject){
    if(!this.locked){ return; }
    this.locked = false;
    this.lastUnlockedBy = object;
    
    const onUnlock = this.scripts[ScriptHook.DoorOnUnlock];
    if(onUnlock){
      onUnlock.run(this);
    }
  }

  attemptUnlock(object: GameObject){
    if(!BitWise.InstanceOf(object?.objectType, GameObjectType.GameObject)){
      return false;
    }
    
    const nSecuritySkill = object.getSkillLevel(SkillType.SECURITY);
    if(this.isLocked() && !this.keyRequired && nSecuritySkill >= 1){
      let d20 = 20;//d20 rolls are auto 20's outside of combat
      let skillCheck = (((object.getWIS()/2) + nSecuritySkill) + d20) - this.openLockDC;
      if(skillCheck >= 1 && nSecuritySkill >= 1){
        this.unlock(object);
        if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
          object.playSoundSet(SSFType.UNLOCK_SUCCESS);
        }
      }else{
        if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
          object.playSoundSet(SSFType.UNLOCK_FAIL);
        }
      }
    }
        
    this.use(object);
    return true;
  }

  openDoor(object: GameObject){

    /*
      Door Animations:
      opening1 and opening2 are supposed to be used for swinging doors
      they should play depending on which side the object that opened them was on.
      an example of this would be the doors found on kashyyyk
    */

    if(object instanceof GameObject){
      this.lastObjectOpened = object;
      //object.lastDoorEntered = this;
    }

    const onOpen = this.scripts[ScriptHook.DoorOnOpen];
    // Zelka lab-door OnOpen (k_ptar_alertzelk): log party leader vs GetFirstPC
    // so JumpToObject gather can be confirmed when a CNPC is party[0].
    if(onOpen && shouldLogAlertzelkOnOpen(onOpen.name)){
      logAlertzelkOnOpen(this, object);
    }
    if(onOpen){
      onOpen.run(this);
    }

    this.playObjectSound(ModulePlaceableObjectSound.OPENED);

    // OpenDoor — orientation-plane side detection
    this.objectInteractSide = this.detectInteractSide(object);
    switch(this.objectInteractSide){
      case ModuleDoorInteractSide.SIDE_1:
        this.setOpenState(ModuleDoorOpenState.OPEN1, true);
      break;
      default:
        this.setOpenState(ModuleDoorOpenState.OPEN2, true);
      break;
    }

    //Notice all creatures within range that someone opened this door
    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
      const creatures = this.area?.creatures;
      if(creatures){
        for(let i = 0, len = creatures.length; i < len; i++){
          let creature = creatures[i];
          let distance = creature.position.distanceTo(this.position);
          if(distance <= creature.getPerceptionRangePrimary()){
            creature.notifyPerceptionHeardObject(object, true);
          }
        }
      }
    }

    if(GameState.CursorManager.selectedObject == this){
      GameState.CursorManager.selected = undefined;
      GameState.CursorManager.selectedObject = undefined;
    }

    if(GameState.CursorManager.hoveredObject == this){
      GameState.CursorManager.hovered = undefined;
      GameState.CursorManager.hoveredObject = undefined;
    }

  }

  destroyDoor(object: GameObject){

    const onDeath = this.scripts[ScriptHook.DoorOnDeath];
    if(onDeath){
      onDeath.run(this);
    }

    // EventHandler death — SetOpenState(3)
    this.setOpenState(ModuleDoorOpenState.DESTROYED, true);

  }

  closeDoor(object: GameObject){

    if(BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
      object.lastDoorExited = this;
    }

    this.lastObjectClosed = object;
    this.playObjectSound(ModulePlaceableObjectSound.CLOSED);

    this.setOpenState(ModuleDoorOpenState.CLOSED, true);

  }

  /**
   * Legacy door occupancy seeding. Door transition checks use proximity instead.
   * @deprecated No active load path calls this method.
   */
  initObjectsInside(){
    //Check to see if this trigger is linked to another module
    if(this.linkedToModule && this.type == 1){
      //Check Party Members
      let partyLen = GameState.PartyManager.party.length;
      for(let i = 0; i < partyLen; i++){
        let partymember = GameState.PartyManager.party[i];
        if(this.box.containsPoint(partymember.position)){
          if(this.objectsInside.indexOf(partymember) == -1){
            this.objectsInside.push(partymember);

            partymember.lastDoorEntered = this;
            this.lastObjectEntered = partymember;
          }
        }
      }
    }else{
      //Check Creatures
      const creatures = this.area?.creatures;
      if(creatures){
        const creatureLen = creatures.length;
        for(let i = 0; i < creatureLen; i++){
          const creature = creatures[i];
          if(this.box.containsPoint(creature.position)){
            if(this.objectsInside.indexOf(creature) == -1){
              this.objectsInside.push(creature);

              creature.lastDoorEntered = this;
              this.lastObjectEntered = creature;
            }
          }
        }
      }
    }
  }

  override onSpawn(runScript = true){
    super.onSpawn(runScript);

    if(this.model instanceof OdysseyModel3D){
      this.model.updateMatrix();

      this.box.setFromObject(this.model);

      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
      this.boxHelper = new THREE.Box3Helper( this.box, (new THREE.Color()).setHex(0xff0000) );
      GameState.group.collision_helpers.add( this.boxHelper );
    }

    if(this.collisionManager.walkmesh && this.model){
      this.syncWalkmeshMatrix();
    }
  }

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.DoorOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.DoorOnUserDefined]);
  }

  /**
   * door EventHandler OnSpellCastAt — harmful engages caster only.
   */
  override triggerSpellCastAtEvent(event: NWScriptEvent){
    if(!(event instanceof NWScriptEvent)){ return; }

    const caster = event.getObject(0);
    const harmful = !!event.getInt(1);

    if(harmful && isCreature(caster)){
      this.assignHostileActor(caster);
      caster.broadcastCombatStateToParty();
      caster.setExcitedState(ExcitedDurationRow.SpellCast);
      caster.removeCombatInvisibilityEffects();
    }

    this.runSpellCastAtScript(event, this.scripts[ScriptHook.DoorOnSpellCastAt]);
  }

  override bindTrapTriggeredScript(nwscript: NWScriptInstance): ScriptHook | undefined {
    this.scripts[ScriptHook.DoorOnTrapTriggered] = nwscript;
    return ScriptHook.DoorOnTrapTriggered;
  }

  override onAttacked(attackType: CombatActionType){
    // EventHandler 0xf — BroadcastCombatStateToParty(attacker, INVALID)
    const attacker = this.combatData.lastAttacker;
    if(isCreature(attacker)){
      attacker.broadcastCombatStateToParty();
      attacker.removeCombatInvisibilityEffects();
    }

    const isSpellAttack = attackType == CombatActionType.CAST_SPELL || attackType == CombatActionType.ITEM_CAST_SPELL;
    const instance = this.scripts[!isSpellAttack ? ScriptHook.DoorOnMeleeAttacked : ScriptHook.DoorOnSpellCastAt];
    if(!instance){ return; }
    instance.run(this);
  }

  override onDamaged(): boolean{
    // effect apply door/placeable — BroadcastCombatStateToParty(attacker, INVALID)
    const damager = this.combatData.lastDamager ?? this.combatData.lastAttacker;
    if(isCreature(damager)){
      damager.broadcastCombatStateToParty();
    }

    const instance = this.scripts[ScriptHook.DoorOnDamaged];
    if(!instance){ return false; }
    instance.run(this);
    return false;
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

  /** Open/close/damage transitions that still need model + DWK matrix work. */
  private isTransitioningAnimState(): boolean {
    switch(this.animStateInfo?.currentAnimState){
      case ModuleDoorAnimState.OPENING1:
      case ModuleDoorAnimState.OPENING2:
      case ModuleDoorAnimState.CLOSING1:
      case ModuleDoorAnimState.CLOSING2:
      case ModuleDoorAnimState.DAMAGE:
      case ModuleDoorAnimState.BUSTED:
      case ModuleDoorAnimState.TRANS:
        return true;
      default:
        return false;
    }
  }

  update(delta = 0){
    
    super.update(delta);
    const transitioning = this.isTransitioningAnimState();
    const needsModelUpdate =
      transitioning ||
      this.forceAlwaysUpdate ||
      this.isDead() ||
      !!(this.model?.visible);
    if(this.model instanceof OdysseyModel3D && needsModelUpdate){
      this.model.update(delta);
      //this.box.setFromObject(this.model);
    }

    // Idle doors keep DWK until open-state swap or matrix dirty (placeable pattern).
    if(this.walkmeshMatrixDirty || transitioning){
      this.syncWalkmeshMatrix();
    }

    if(this.isDead()){
      if(!this.destroyAnimationPlayed){
        this.destroyAnimationPlayed = true;
        this.destroyDoor(this);
      }
    }else{
      if(this.destroyAnimationPlayed) this.destroyAnimationPlayed = false;
    }

    this.action = this.actionQueue[0];
    // Action queue processed in aiUpdate

    this.updateAnimationState(delta);

    if(this.isDead() && !this.isOpen() && this.alsoOpenState !== ModuleDoorOpenState.DESTROYED && this.openState !== ModuleDoorOpenState.DESTROYED){
      this.openDoor(this);
    }

    DoorTransitionProximity.update(this);

  }

  updateAnimationState(delta: number = 0){
    if(!(this.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.model.getAnimationName();
    if(!this.animStateInfo.currentAnimState) this.setAnimationState(ModuleDoorAnimState.DEFAULT);
    if(this.animStateInfo.currentAnimState){
      let animation = this.animationConstantToAnimation(this.animStateInfo.currentAnimState);
      if(animation){
        if(currentAnimation != animation.name?.toLowerCase()){
          if(!this.animStateInfo.started){
            this.animStateInfo.started = true;
            const aLooping = (!animation.fireforget && animation.looping);
            this.getModel().playAnimation(animation.name?.toLowerCase(), aLooping);
          }else{
            // Animation completed — MoveNextDoorState fires doneopening*/doneclosing*
            switch(this.animStateInfo.currentAnimState){
              //loop default animations
              case ModuleDoorAnimState.OPENED1:
                this.setAnimationState(ModuleDoorAnimState.OPENED1);
              break;
              case ModuleDoorAnimState.OPENED2:
                this.setAnimationState(ModuleDoorAnimState.OPENED2);
              break;
              case ModuleDoorAnimState.CLOSED:
                this.setAnimationState(ModuleDoorAnimState.CLOSED);
              break;

              //transition animations
              case ModuleDoorAnimState.OPENING1:
                this.moveToNextOpenState();
                this.setAnimationState(ModuleDoorAnimState.OPENED1);
              break;
              case ModuleDoorAnimState.OPENING2:
                this.moveToNextOpenState();
                this.setAnimationState(ModuleDoorAnimState.OPENED2);
              break;
              case ModuleDoorAnimState.CLOSING1:
              case ModuleDoorAnimState.CLOSING2:
                this.moveToNextOpenState();
                this.setAnimationState(ModuleDoorAnimState.CLOSED);
              break;
              default:
                if(this.alsoOpenState === ModuleDoorOpenState.DESTROYED){
                  this.moveToNextOpenState();
                }
                this.setAnimationState(ModuleDoorAnimState.DEFAULT);
              break;
            }
          }
        }
      }else{
        console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
        this.setAnimationState(ModuleDoorAnimState.DEFAULT);
      }
    }
  }

  setAnimationState(animState: ModuleDoorAnimState = ModuleDoorAnimState.DEFAULT){
    this.animStateInfo.currentAnimState = animState;
    this.animState = animState;
    this.animStateInfo.lastAnimState = this.animState;
    this.animStateInfo.loop = false;
    this.animStateInfo.started = false;
    if(animState == ModuleDoorAnimState.CLOSED) this.animStateInfo.loop = true;
    if(animState == ModuleDoorAnimState.DEFAULT) this.animStateInfo.loop = true;
    if(this.model) this.model.stopAnimation();
  }

  detachFromRoom(room: AreaRoom): void {
    if(!room) return;
    let index = room.doors.indexOf(this);
    if(index >= 0){
      room.doors.splice(index, 1);
    }
  }

  getCurrentRoom(): void {
    this.room = undefined;
    let aabbFaces = [];
    let intersects;// = GameState.raycaster.intersectOctreeObjects(meshesSearch);
    let box = this.box.clone();
    const rooms = this.area?.rooms;
    if(!rooms){
      return;
    }

    this.rooms = [];
    for(let i = 0; i < rooms.length; i++){
      let room = rooms[i];
      if(room.box.containsPoint(this.position)){
        this.roomIds.push(i);
      }
    }

    if(box){
      for(let j = 0, jl = this.roomIds.length; j < jl; j++){
        let room = rooms[this.roomIds[j]];
        if(room && room.collisionManager.walkmesh && room.collisionManager.walkmesh.aabbNodes.length){
          aabbFaces.push({
            object: room, 
            faces: room.collisionManager.walkmesh.getAABBCollisionFaces(box)
          });
        }
      }
    }
    
    let scratchVec3 = new THREE.Vector3(0, 0, 2);
    let playerFeetRay = this.position.clone().add(scratchVec3);
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    GameState.raycaster.ray.direction.set(0, 0,-1);
    
    for(let j = 0, jl = aabbFaces.length; j < jl; j++){
      let castableFaces = aabbFaces[j];
      intersects = castableFaces.object.collisionManager.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
      
      if(intersects.length){
        if(intersects[0].object.userData.gameObject){
          this.attachToRoom(intersects[0].object.userData.gameObject);
          return;
        }
      }
    }
    if(this.rooms.length){
      this.attachToRoom(rooms[this.roomIds[0]]);
      return;
    }
  }

  generateTransitionLine(){
    this.transitionLineMin.set(-5, 0, 0);
    this.transitionLineMax.set(5, 0, 0)
    this.transitionLine = new THREE.Line3(this.transitionLineMin, this.transitionLineMax);
    this.container.updateMatrix();
    this.transitionLine.applyMatrix4(this.container.matrix);
  }

  testTransitionLine(object: GameObject){
    this.transitionClosestPoint.set(0, 0, 0);
    this.transitionLineMin.z = object.position.z;
    this.transitionLineMax.z = object.position.z;
    this.transitionLine.closestPointToPoint(object.position, true, this.transitionClosestPoint);
    this.transitionDistance = object.position.distanceTo(this.transitionClosestPoint);
  }

  /**
   * True when the XY segment flips sides of the doorway plane.
   * Plane normal is perpendicular to `transitionLine` (doorway width), not
   * door facing — Endar Spire-style doors face along the wall while the
   * walkthrough axis is across the threshold.
   */
  segmentCrossesTransitionPlane(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    if(!this.transitionLine){
      this.generateTransitionLine();
    }
    if(!this.transitionLine) return false;

    const lx = this.transitionLine.end.x - this.transitionLine.start.x;
    const ly = this.transitionLine.end.y - this.transitionLine.start.y;
    const llen = Math.hypot(lx, ly);
    if(llen <= 0) return false;
    const nx = -ly / llen;
    const ny = lx / llen;

    const d0 =
      (fromX - this.position.x) * nx + (fromY - this.position.y) * ny;
    const d1 =
      (toX - this.position.x) * nx + (toY - this.position.y) * ny;
    return (d0 > 0) !== (d1 > 0);
  }

  /**
   * GetDoorCrossed: plane through door origin with transition-line normal;
   * sign flip of Dot(p - doorPos, n) along the move. Probe length is at
   * least hitDistance so a capsule pinned short of the plane still warps
   * when pushing into the doorway wall behind it.
   */
  testTransitionLineCrosses(
    object: GameObject,
    move: THREE.Vector3 = object.forceVector,
    hitDistance: number = 0.4
  ){
    if(object != GameState.PartyManager.getCurrentPlayer()) return;
    const moveLen = Math.hypot(move.x, move.y);
    if(moveLen <= 0) return;

    const probeLen = Math.max(moveLen, hitDistance);
    const ux = move.x / moveLen;
    const uy = move.y / moveLen;
    const sx = object.position.x;
    const sy = object.position.y;
    const ex = sx + ux * probeLen;
    const ey = sy + uy * probeLen;

    if(this.segmentCrossesTransitionPlane(sx, sy, ex, ey)){
      this.transitNPC(object);
    }
  }

  transitNPC(object: GameObject){
    if(!(object instanceof GameObject)) return;
    if(object != GameState.PartyManager.getCurrentPlayer()) return;
    if(this.getLinkedToModule() && !(GameState.Mode == EngineMode.DIALOG) && this.isOpen()){
      // Align with Trigger / tryUseInterAreaTransition: party leader loads
      // even when click-to-move left `controlled` unset for the frame.
      ModuleLoadCoordinator.LoadModuleWithAreaTransitionFade(this.getLinkedToModule().toLowerCase(), this.getLinkedTo().toLowerCase());
    }
  }

  onEnter(object: GameObject){
    object.lastDoorEntered = this;
    if(this.getLinkedToModule() && this.isOpen()){
      GameState.MenuManager.InGameAreaTransition.setTransitionObject(this);
    }
  }

  onExit(object: GameObject){
    object.lastDoorEntered = undefined;
    if(this.getLinkedToModule()){
      GameState.MenuManager.InGameAreaTransition.unsetTransitionObject(this);
    }
  }

  load(){
    this.seedResRefsFromTemplate();
    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'utd',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(!merged){
        console.error('Failed to load Door template');
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
        this.loadScripts();
      }
    }else{
      this.initProperties();
      this.loadScripts();
    }
  }

  loadModel(): Promise<OdysseyModel3D> {
    let modelName = this.getDoorAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      MDLLoader.loader.load(modelName).then((mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.context,
          //lighting: false,
          static: this.static,
          useTweakColor: this.useTweakColor,
          tweakColor: this.tweakColor,
          castShadow: false,
          receiveShadow: true,
          shadowsEnabled: false,
          // Door panels/dummies are almost all clip-driven; mergeStatic left little
          // static geo and caused closed-pose leftovers. Rooms/placeables keep it.
          mergeStatic: false,
        }).then((door: OdysseyModel3D) => {
          if(this.model instanceof OdysseyModel3D){
            this.model.removeFromParent();
            try{ this.model.dispose(); }catch(e){}
          }

          this.model = door;
          this.model.userData.gameObject = this;
          this.model.name = modelName;
          this.container.add(this.model);
          this.markCollisionBoundsDirty('model');
          this.model.removeEventListener?.('playEvent', this.doorAnimPlayEventHandler);
          this.model.addEventListener('playEvent', this.doorAnimPlayEventHandler);

          this.trans = this.model.trans;
          if(this.trans instanceof THREE.Object3D){
            if(this.trans.children.length){
              this.trans.children[0].userData.ignoreMousePicking = true;
            }
            this.trans.visible = false;
          }

          this.generateTransitionLine();
          
          this.model.disableMatrixUpdate();
          // Door container stays put; only the model animates open/close.
          freezeWorldContainer(this.container);

          switch(this.openState){
            case ModuleDoorOpenState.CLOSED:
              this.setAnimationState(ModuleDoorAnimState.CLOSED);
            break;
            case ModuleDoorOpenState.OPEN1:
              this.setAnimationState(ModuleDoorAnimState.OPENED1);
            break;
            case ModuleDoorOpenState.OPEN2:
              this.setAnimationState(ModuleDoorAnimState.OPENED2);
            break;
            default:
              this.setOpenState(ModuleDoorOpenState.CLOSED, false);
            break;
          }

          resolve(this.model);
        }).catch(() => {
          resolve(this.model);
        });
      }).catch(() => {
        resolve(this.model);
      });
    });
  }

  loadScripts(){
    const scriptKeys = [
      ScriptHook.DoorOnClick,
      ScriptHook.DoorOnClosed,
      ScriptHook.DoorOnDamaged,
      ScriptHook.DoorOnDeath,
      ScriptHook.DoorOnDialog,
      ScriptHook.DoorOnDisarm,
      ScriptHook.DoorOnFailToOpen,
      ScriptHook.DoorOnHeartbeat,
      ScriptHook.DoorOnInvDisturbed,
      ScriptHook.DoorOnLock,
      ScriptHook.DoorOnMeleeAttacked,
      ScriptHook.DoorOnOpen,
      ScriptHook.DoorOnSpellCastAt,
      ScriptHook.DoorOnTrapTriggered,
      ScriptHook.DoorOnUnlock,
      ScriptHook.DoorOnUserDefined,
    ];

    // Absent fields default to "default"; explicit empty resrefs must persist "".
    this.hydrateScriptResRefsFromTemplate(scriptKeys, 'default');
    this.bindScriptsFromResRefs(scriptKeys);
  }

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    const loadSlot = async (suffix: string): Promise<OdysseyWalkMesh | undefined> => {
      try{
        const buffer = await ResourceLoader.loadResource(ResourceTypes['dwk'], resRef + suffix);
        const walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
        walkmesh.mesh.name = walkmesh.name = resRef + suffix;
        walkmesh.mesh.userData.gameObject = walkmesh.gameObject = this;
        // Keep verts in BWM local space; syncWalkmeshMatrix applies door pose +
        // header.position (open jamb offset) at test / open-state switch time.
        return walkmesh;
      }catch(e){
        if(suffix === '0'){
          console.error(e);
        }
        return undefined;
      }
    };

    this.walkmeshClosed = await loadSlot('0');
    this.walkmeshOpen1 = await loadSlot('1');
    this.walkmeshOpen2 = await loadSlot('2');

    if(this.walkmeshClosed){
      GameState.walkmeshList.push(this.walkmeshClosed.mesh);
    }
    if(this.walkmeshOpen1){
      GameState.walkmeshList.push(this.walkmeshOpen1.mesh);
    }
    if(this.walkmeshOpen2){
      GameState.walkmeshList.push(this.walkmeshOpen2.mesh);
    }

    this.updateCollisionState();
    this.markCollisionBoundsDirty('walkmesh');
    return this.collisionManager.walkmesh || this.walkmeshClosed;
  }

  /**
   * @deprecated World-bake dropped — open DWKs need BWM header.position in
   * LocalToWorld. Use syncWalkmeshMatrix instead.
   */
  bakeWalkmeshTransform(dwk: OdysseyWalkMesh): void {
    if(!dwk){ return; }
    composeDoorWalkmeshLocalToWorld(
      dwk.matrixWorld,
      this.position,
      this.rotation,
      dwk.header?.position,
    );
    dwk.mat4.copy(dwk.matrixWorld);
  }

  initProperties(){
    const needsRegister = !this.initialized;
    const runtime = getDefaultRuntimeContext();
    doorSerializer.deserialize(this, this.template, runtime.toDeserializeContext());

    const conversationResRef = (this as any)._conversationResRef;
    if(conversationResRef){
      this.conversation = DLGObject.FromResRef(conversationResRef);
    }

    this.faction = GameState.FactionManager.factions.get(this.factionId);
    this.doorAppearance = GameState.AppearanceManager.GetDoorAppearanceById(this.genericType);
    this.portrait = runtime.getSWRuleSet?.()?.portraits?.[this.portraitId];

    for(let i = 0; i < this.effects.length; i++){
      const effect = this.effects[i];
      effect.setAttachedObject(this);
      effect.loadModel();
    }

    if((this.hardness | 0) > 0 && !this.effects.some(e => e.type === GameEffectType.EffectDamageResistance)){
      const eDamageResist = new GameEffectFactory.EffectDamageResistance();
      eDamageResist.setSubTypeUnMasked(GameEffectDurationType.PERMANENT);
      eDamageResist.setSkipOnLoad(true);
      eDamageResist.setInt(0, 0x3FFF);
      eDamageResist.setInt(1, this.hardness | 0);
      eDamageResist.setIsExposed(false);
      this.addEffect(eDamageResist);
    }


    GameObjectInitFinalizer.finalize(this, {
      needsRegister,
      register: () => runtime.register(this),
    });
  }

  destroy(): void {
    super.destroy();
    GameState.MenuManager.InGameAreaTransition.unsetTransitionObject(this);
    try{
      const wmIdx = GameState.walkmeshList.indexOf(this.collisionManager.walkmesh.mesh);
      if(wmIdx >= 0) GameState.walkmeshList.splice(wmIdx, 1);
    }catch(e){}
  }

  save(){
    const gff = doorSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

  animationConstantToAnimation( animation_constant = 10000 ): SWAnimation | undefined {
    return resolveDoorAnimation(animation_constant, GameState.SWRuleSet.animationIdMap);
  }

  getFortitudeSave(){
    return combineSavingThrow(this.fort, getSavingThrowEffectBonus(this, 1));
  }

  getReflexSave(){
    return combineSavingThrow(this.ref, getSavingThrowEffectBonus(this, 2));
  }

  getWillSave(){
    return combineSavingThrow(this.will, getSavingThrowEffectBonus(this, 3));
  }

  fortitudeSave(nDC = 0, _nSaveType = 0, _oVersus: GameObject = undefined){
    return rollSavingThrow(this.fort, nDC, Dice.roll(1, DiceType.d20));
  }

  reflexSave(nDC = 0, _nSaveType = 0, _oVersus: GameObject = undefined){
    return rollSavingThrow(this.ref, nDC, Dice.roll(1, DiceType.d20));
  }

  willSave(nDC = 0, _nSaveType = 0, _oVersus: GameObject = undefined){
    return rollSavingThrow(this.will, nDC, Dice.roll(1, DiceType.d20));
  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTD ';

    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AnimationState') );
    template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Appearance') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHP') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DisarmDC') );
    template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Fort') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GenericType') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HP') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Hardness') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'KeyRequired') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'LoadScreenID') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Lockable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Locked') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnClick') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnClosed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDamaged') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDisarm') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnLock') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnOpen') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUnlock') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUsed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PaletteId') ).setValue(6);
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Ref') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Static') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetactable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapFlag') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapType') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Type') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Will') );

    return template;
  }

}
