import { ModuleObject } from "@/module/ModuleObject";
import type { ModuleRoom } from "@/module/ModuleRoom";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { GameState } from "@/GameState";
import { SSFType } from "@/enums/resource/SSFType";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFObject } from "@/resource/GFFObject";
import { OdysseyModel3D } from "@/three/odyssey";

import * as THREE from "three";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { OdysseyModel, OdysseyWalkMesh } from "@/odyssey";
import { NWScript } from "@/nwscript/NWScript";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFStruct } from "@/resource/GFFStruct";
import { ModuleDoorAnimState } from "@/enums/module/ModuleDoorAnimState";
import { ModuleDoorOpenState } from "@/enums/module/ModuleDoorOpenState";
import { ModuleDoorInteractSide } from "@/enums/module/ModuleDoorInteractSide";
// import { AppearanceManager, InventoryManager, MenuManager, ModuleObjectManager, PartyManager, TwoDAManager, FactionManager } from "@/managers";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { EngineMode } from "@/enums/engine/EngineMode";
import { DLGObject } from "@/resource/DLGObject";
import { ITwoDAAnimation } from "@/interface/twoDA/ITwoDAAnimation";
import { SWDoorAppearance } from "@/engine/rules/SWDoorAppearance";
import { AudioEngine } from "@/audio/AudioEngine";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { GameEffectFactory } from "@/effects/GameEffectFactory";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { CombatActionType, ModulePlaceableObjectSound, SkillType } from "@/enums";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import type { ModuleCreature } from "@/module/ModuleCreature";

interface AnimStateInfo {
  lastAnimState: ModuleDoorAnimState;
  currentAnimState: ModuleDoorAnimState;
  loop: boolean;
  started: boolean;
};

/**
* ModuleDoor class.
* 
* Class representing a door found in module areas.
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleDoor.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleDoor extends ModuleObject {
  openState: ModuleDoorOpenState = ModuleDoorOpenState.DEFAULT;
  objectInteractSide: ModuleDoorInteractSide = ModuleDoorInteractSide.SIDE_1;

  lastObjectEntered: ModuleObject;
  lastObjectExited: ModuleObject;
  lastObjectOpened: ModuleObject;
  lastObjectClosed: ModuleObject;
  lastUsedBy: ModuleObject;

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

  collisionDelay: number = 0;
  doorAppearance: SWDoorAppearance;
  /** Retail door script resrefs (ctor defaults all slots to "default"). */
  scriptResRefs: Partial<Record<string, string>> = {};

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.objectType |= ModuleObjectType.ModuleDoor;
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
    // Retail LoadObjectState Commandable default = 1
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
    // GIT door instances often omit Useable; retail treats those as interactable.
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
      this.audioEmitter.setMaxDistance(50);
      this.audioEmitter.setPriorityGroupId(AudioPriorityGroup.ROOM_SOUNDS);
      this.audioEmitter.load();
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  computeBoundingBox(force?: boolean): void {
    if(this.container){
      this.container.updateMatrixWorld(true);
      this.container.updateMatrix();
      if(force){
        this.container.traverse( n => {
          n.updateMatrixWorld(true);
          n.updateMatrix();
        })
      }
    }

    if(this.model){
      this.model.updateMatrixWorld(true);
      this.model.updateMatrix();
    }
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

  /*getTemplateResRef(){
    return this.templateResRef;
  }*/

  getModel(){
    return this.model;
  }

  onHover(){

  }

  /**
   * Retail CSWCDoor::can_use_actions_ — template Useable flag.
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

  updateCollisionState(): void {
    // if(!this.collisionManager?.walkmesh?.mesh){ return; }

    // Keep DWK WorldToLocal matrix in sync with model (open/close / anim).
    this.syncWalkmeshMatrix();

    let idx = -1;
    switch(this.openState){
      case ModuleDoorOpenState.DESTROYED:
      case ModuleDoorOpenState.OPEN1:
      case ModuleDoorOpenState.OPEN2:
        GameState.group.room_walkmeshes.remove( this.collisionManager.walkmesh.mesh );
        idx = this.area.doorWalkmeshes.indexOf(this.collisionManager.walkmesh);
        if(idx >= 0){ this.area.doorWalkmeshes.splice(idx, 1); }
      break;
      default:
        GameState.group.room_walkmeshes.add( this.collisionManager.walkmesh.mesh );
        idx = this.area.doorWalkmeshes.indexOf(this.collisionManager.walkmesh);
        if(idx == -1){ this.area.doorWalkmeshes.push(this.collisionManager.walkmesh); }
      break;
    }
  }

  /** Copy model transform onto door wok for NoNonWalkPolysInDoor / WorldToLocal. */
  syncWalkmeshMatrix(): void {
    if(this.collisionManager?.walkmesh && this.model){
      this.model.updateMatrix?.();
      this.collisionManager.walkmesh.matrixWorld.copy(this.model.matrix);
    }
  }

  setOpenState(openState: ModuleDoorOpenState = ModuleDoorOpenState.CLOSED){
    const currentOpenState = this.openState;
    this.openState = openState;

    this.updateCollisionState();

    const wasClosed = (currentOpenState == ModuleDoorOpenState.CLOSED);
    const attemptingOpen = (openState == ModuleDoorOpenState.OPEN1 || openState == ModuleDoorOpenState.OPEN2);
    if(attemptingOpen){
      if(wasClosed){
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
      const needsToAnimate = (currentOpenState == ModuleDoorOpenState.OPEN1 || currentOpenState == ModuleDoorOpenState.OPEN2);
      if(needsToAnimate){
        if(currentOpenState == ModuleDoorOpenState.OPEN1){
          this.setAnimationState(ModuleDoorAnimState.CLOSING1);
        }else{
          this.setAnimationState(ModuleDoorAnimState.CLOSING2);
        }
      }
    }else{
      this.setAnimationState(ModuleDoorAnimState.CLOSED);
    }

  }

  onClick(callee: ModuleObject){
    GameState.getCurrentPlayer().actionOpenDoor( this );
  }

  use(object: ModuleObject){

    this.lastUsedBy = object;

    // If the door is already open, do nothing
    if(this.openState){
      console.log('ModuleDoor', this.getTag(), this.getName(), 'already open');
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
        if(keyItem && BitWise.InstanceOf(keyItem?.objectType, ModuleObjectType.ModuleItem)){
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
      const onFailToOpen = this.scripts[ModuleObjectScript.DoorOnFailToOpen];
      if(onFailToOpen){
        onFailToOpen.run(this);
      }

      this.playObjectSound(ModulePlaceableObjectSound.LOCKED);
      return;
    }
    
    this.openDoor(object);

  }

  lock(object: ModuleObject){
    if(this.locked){ return; }
    this.locked = true;
    
    const onLock = this.scripts[ModuleObjectScript.DoorOnLock];
    if(onLock){
      onLock.run(this);
    }
  }

  unlock(object: ModuleObject){
    if(!this.locked){ return; }
    this.locked = false;
    
    const onUnlock = this.scripts[ModuleObjectScript.DoorOnUnlock];
    if(onUnlock){
      onUnlock.run(this);
    }
  }

  attemptUnlock(object: ModuleObject){
    if(!BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleObject)){
      return false;
    }
    
    const nSecuritySkill = object.getSkillLevel(SkillType.SECURITY);
    if(this.isLocked() && !this.keyRequired && nSecuritySkill >= 1){
      let d20 = 20;//d20 rolls are auto 20's outside of combat
      let skillCheck = (((object.getWIS()/2) + nSecuritySkill) + d20) - this.openLockDC;
      if(skillCheck >= 1 && nSecuritySkill >= 1){
        this.unlock(object);
        if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
          object.playSoundSet(SSFType.UNLOCK_SUCCESS);
        }
      }else{
        if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
          object.playSoundSet(SSFType.UNLOCK_FAIL);
        }
      }
    }
        
    this.use(object);
    return true;
  }

  openDoor(object: ModuleObject){

    /*
      Door Animations:
      opening1 and opening2 are supposed to be used for swinging doors
      they should play depending on which side the object that opened them was on.
      an example of this would be the doors found on kashyyyk
    */

    if(object instanceof ModuleObject){
      this.lastObjectOpened = object;
      //object.lastDoorEntered = this;
    }

    const onOpen = this.scripts[ModuleObjectScript.DoorOnOpen];
    if(onOpen){
      onOpen.run(this);
    }

    this.playObjectSound(ModulePlaceableObjectSound.OPENED);

    // if(GameState.selectedObject == this){
    //   GameState.selectedObject = GameState.selected = undefined;
    // }
    
    //TODO: detect the correct side that the creature interacted from
    switch(this.objectInteractSide){
      case ModuleDoorInteractSide.SIDE_1:
        this.setOpenState(ModuleDoorOpenState.OPEN1);
      break;
      default:
        this.setOpenState(ModuleDoorOpenState.OPEN2);
      break;
    }

    if(this.collisionManager.walkmesh && this.collisionManager.walkmesh.mesh){
      this.collisionManager.walkmesh.mesh.removeFromParent();
    }

    //Notice all creatures within range that someone opened this door
    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
        let creature = GameState.module.area.creatures[i];
        let distance = creature.position.distanceTo(this.position);
        if(distance <= creature.getPerceptionRangePrimary()){
          creature.notifyPerceptionHeardObject(object, true);
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

  destroyDoor(object: ModuleObject){

    const onDeath = this.scripts[ModuleObjectScript.DoorOnDeath];
    if(onDeath){
      onDeath.run(this);
    }
    
    //TODO: detect the correct side that the creature interacted from
    switch(this.objectInteractSide){
      case ModuleDoorInteractSide.SIDE_1:
        this.setOpenState(ModuleDoorOpenState.OPEN1);
      break;
      default:
        this.setOpenState(ModuleDoorOpenState.OPEN2);
      break;
    }

    if(this.collisionManager.walkmesh && this.collisionManager.walkmesh.mesh){
      this.collisionManager.walkmesh.mesh.removeFromParent();
    }

  }

  closeDoor(object: ModuleObject){

    if(BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
      object.lastDoorExited = this;
    }

    this.playObjectSound(ModulePlaceableObjectSound.CLOSED);

    if(this.collisionManager.walkmesh && this.collisionManager.walkmesh.mesh){
      this.collisionManager.walkmesh.mesh.removeFromParent();
    }

    this.setOpenState(ModuleDoorOpenState.CLOSED);

  }

  //Some modules have exit triggers that are placed in the same location that the player spawns into
  //This is my way of keeping the player from immediately activating the trigger
  //They will be added to the objectsInside array without triggering the onEnter script
  //If they leave the trigger and then return it will then fire normally
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
      let creatureLen = GameState.module.area.creatures.length;
      for(let i = 0; i < creatureLen; i++){
        let creature = GameState.module.area.creatures[i];
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

  onSpawn(runScript = true){
    super.onSpawn(runScript);

    if(this.model instanceof OdysseyModel3D){
      this.model.updateMatrix();

      this.box.setFromObject(this.model);

      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
      this.boxHelper = new THREE.Box3Helper( this.box, (new THREE.Color()).setHex(0xff0000) );
      GameState.group.light_helpers.add( this.boxHelper );
    }

    if(this.collisionManager.walkmesh && this.model){
      this.syncWalkmeshMatrix();
    }
  }

  onAttacked(attackType: CombatActionType){
    // Retail CSWSDoor::EventHandler 0xf @ 0058ba8c — BroadcastCombatStateToParty(attacker, INVALID)
    const attacker = this.combatData.lastAttacker;
    if(BitWise.InstanceOfObject(attacker, ModuleObjectType.ModuleCreature)){
      const atk = attacker as ModuleCreature;
      atk.broadcastCombatStateToParty();
      atk.removeCombatInvisibilityEffects();
    }

    const isSpellAttack = attackType == CombatActionType.CAST_SPELL || attackType == CombatActionType.ITEM_CAST_SPELL;
    const instance = this.scripts[!isSpellAttack ? ModuleObjectScript.DoorOnMeleeAttacked : ModuleObjectScript.DoorOnSpellCastAt];
    if(!instance){ return; }
    instance.run(this);
  }

  onDamaged(): boolean{
    // Retail OnApplyDamage door/placeable @ 004e055f — BroadcastCombatStateToParty(attacker, INVALID)
    const damager = this.combatData.lastDamager ?? this.combatData.lastAttacker;
    if(BitWise.InstanceOfObject(damager, ModuleObjectType.ModuleCreature)){
      (damager as ModuleCreature).broadcastCombatStateToParty();
    }

    const instance = this.scripts[ModuleObjectScript.DoorOnDamaged];
    if(!instance){ return false; }
    instance.run(this);
    return false;
  }

  update(delta = 0){
    
    super.update(delta);
    if(this.model instanceof OdysseyModel3D){
      this.model.update(delta);
      //this.box.setFromObject(this.model);
    }

    // Placeables refresh wok each tick; doors need the same for animated DWK.
    this.syncWalkmeshMatrix();

    if(this.isDead()){
      if(!this.destroyAnimationPlayed){
        this.destroyAnimationPlayed = true;
        this.destroyDoor(this);
      }
    }else{
      if(this.destroyAnimationPlayed) this.destroyAnimationPlayed = false;
    }

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    this.updateAnimationState(delta);

    if(
      this.animStateInfo.currentAnimState != ModuleDoorAnimState.CLOSING1 &&
      this.animStateInfo.currentAnimState != ModuleDoorAnimState.CLOSING2
    ){
      this.collisionDelay = 0;
    }else{
      this.collisionDelay -= delta;
      if(this.collisionDelay < 0) this.collisionDelay = 0;
    }

    if(this.isDead() && !this.isOpen()){
      this.openDoor(this);
    }

    const partymember = GameState.PartyManager.party[0];
    if(partymember){
      const outer_distance = partymember.position.distanceTo(this.position);
      if(outer_distance < 10){
        this.testTransitionLine(partymember);
        if(this.transitionDistance < 5){
          if(this.getLinkedToModule() && this.isOpen()){
            GameState.MenuManager.InGameAreaTransition.setTransitionObject(this);
          }
        }else{
          GameState.MenuManager.InGameAreaTransition.unsetTransitionObject(this);
        }
        if(this.transitionDistance < 0.5){
          if(partymember.lastDoorEntered !== this){
            partymember.lastDoorEntered = this;
            this.onEnter(partymember);
          }
        } else {
          if(partymember.lastDoorEntered === this){
            partymember.lastDoorExited = this;
            this.onExit(partymember);
          }
        }
      }else{
        GameState.MenuManager.InGameAreaTransition.unsetTransitionObject(this);
        if(partymember.lastDoorEntered === this){
          partymember.lastDoorExited = this;
          this.onExit(partymember);
        }
      }
    }

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
            if(
              this.animStateInfo.currentAnimState == ModuleDoorAnimState.CLOSING1 || 
              this.animStateInfo.currentAnimState == ModuleDoorAnimState.CLOSING2
            ){
              this.collisionDelay = 0.75;
            }
            this.animStateInfo.started = true;
            const aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
            this.getModel().playAnimation(animation.name?.toLowerCase(), aLooping);
          }else{
            //Animation completed
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
                this.setAnimationState(ModuleDoorAnimState.OPENED1);
              break;
              case ModuleDoorAnimState.OPENING2:
                this.setAnimationState(ModuleDoorAnimState.OPENED2);
              break;
              case ModuleDoorAnimState.CLOSING1:
              case ModuleDoorAnimState.CLOSING2:
                this.setAnimationState(ModuleDoorAnimState.CLOSED);
              break;
              default:
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

  detachFromRoom(room: ModuleRoom): void {
    if(!room) return;
    let index = room.doors.indexOf(this);
    if(index >= 0){
      room.doors.splice(index, 1);
    }
  }

  getCurrentRoom(): void {
    this.room = undefined;
    let aabbFaces = [];
    let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );
    let box = this.box.clone();

    this.rooms = [];
    for(let i = 0; i < GameState.module.area.rooms.length; i++){
      let room = GameState.module.area.rooms[i];
      if(room.box.containsPoint(this.position)){
        this.roomIds.push(i);
      }
    }

    if(box){
      for(let j = 0, jl = this.roomIds.length; j < jl; j++){
        let room = GameState.module.area.rooms[this.roomIds[j]];
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
        if(intersects[0].object.userData.moduleObject){
          this.attachToRoom(intersects[0].object.userData.moduleObject);
          return;
        }
      }
    }
    if(this.rooms.length){
      this.attachToRoom(GameState.module.area.rooms[this.roomIds[0]]);
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

  testTransitionLine(object: ModuleObject){
    this.transitionClosestPoint.set(0, 0, 0);
    this.transitionLineMin.z = object.position.z;
    this.transitionLineMax.z = object.position.z;
    this.transitionLine.closestPointToPoint(object.position, true, this.transitionClosestPoint);
    this.transitionDistance = object.position.distanceTo(this.transitionClosestPoint);
  }

  testTransitionLineCrosses(object: ModuleObject){
    if(object == GameState.getCurrentPlayer()){
      const trans = this?.model?.trans;
      if(trans){
        GameState.raycaster.ray.origin.copy(object.position);
        GameState.raycaster.ray.origin.z += 1;
        GameState.raycaster.ray.direction.copy(object.forceVector);
        const intersections: THREE.Intersection[] =[];
        trans.children[0].raycast(GameState.raycaster, intersections);
        if(intersections.length){
          this.transitNPC(object);
        }
      }
    }
  }

  transitNPC(object: ModuleObject){
    if(!(object instanceof ModuleObject)) return;
    if(object != GameState.getCurrentPlayer()) return;
    if(this.getLinkedToModule() && !(GameState.Mode == EngineMode.DIALOG) && this.isOpen()){
      if(object.controlled){
        GameState.LoadModuleWithAreaTransitionFade(this.getLinkedToModule().toLowerCase(), this.getLinkedTo().toLowerCase());
      }else{
        object.lastDoorEntered = this;
      }
    }
  }

  onEnter(object: ModuleObject){
    object.lastDoorEntered = this;
    if(this.getLinkedToModule() && this.isOpen()){
      GameState.MenuManager.InGameAreaTransition.setTransitionObject(this);
    }
  }

  onExit(object: ModuleObject){
    object.lastDoorEntered = undefined;
    if(this.getLinkedToModule()){
      GameState.MenuManager.InGameAreaTransition.setTransitionObject(undefined);
    }
  }

  load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utd'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        //console.log(this.template, gff, this)
        this.initProperties();
        this.loadScripts();
      }else{
        console.error(`Failed to load ${ModuleDoor.name} template`);
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
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
          tweakColor: this.tweakColor
          //castShadow: true,
          //receiveShadow: true
        }).then((door: OdysseyModel3D) => {
          if(this.model instanceof OdysseyModel3D){
            this.model.removeFromParent();
            try{ this.model.dispose(); }catch(e){}
          }

          this.model = door;
          this.model.userData.moduleObject = this;
          this.model.name = modelName;
          this.container.add(this.model);

          this.trans = this.model.trans;
          if(this.trans instanceof THREE.Object3D){
            if(this.trans.children.length){
              this.trans.children[0].userData.ignoreMousePicking = true;
            }
            this.trans.visible = false;
          }

          this.generateTransitionLine();
          
          this.model.disableMatrixUpdate();

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
              this.setOpenState(ModuleDoorOpenState.CLOSED);
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
      ModuleObjectScript.DoorOnClick,
      ModuleObjectScript.DoorOnClosed,
      ModuleObjectScript.DoorOnDamaged,
      ModuleObjectScript.DoorOnDeath,
      ModuleObjectScript.DoorOnDialog,
      ModuleObjectScript.DoorOnDisarm,
      ModuleObjectScript.DoorOnFailToOpen,
      ModuleObjectScript.DoorOnHeartbeat,
      ModuleObjectScript.DoorOnInvDisturbed,
      ModuleObjectScript.DoorOnLock,
      ModuleObjectScript.DoorOnMeleeAttacked,
      ModuleObjectScript.DoorOnOpen,
      ModuleObjectScript.DoorOnSpellCastAt,
      ModuleObjectScript.DoorOnTrapTriggered,
      ModuleObjectScript.DoorOnUnlock,
      ModuleObjectScript.DoorOnUserDefined,
    ];

    const scriptsNode = this.template?.RootNode;
    if(!scriptsNode){ return; }
    for(const scriptKey of scriptKeys){
      // Retail CSWSDoor ctor seeds all slots to "default"; LoadDoor overwrites with the
      // template value including an explicit empty resref (must persist "" on save).
      let resRef = 'default';
      if(scriptsNode.hasField(scriptKey)){
        resRef = String(scriptsNode.getFieldByLabel(scriptKey).getValue() ?? '');
      }
      this.scriptResRefs[scriptKey] = resRef;
      const nwscript = GameState.NWScript.Load(resRef);
      if(!nwscript){ continue; }
      nwscript.caller = this;
      this.scripts[scriptKey] = nwscript;
    }
  }

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes['dwk'], resRef+'0');
      const walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
      walkmesh.mesh.name = walkmesh.name = resRef;
      walkmesh.mesh.userData.moduleObject = walkmesh.moduleObject = this;
      this.collisionManager.setWalkmesh(walkmesh);
  
      this.updateCollisionState();
  
      return this.collisionManager.walkmesh;
    }catch(e){
      console.error(e);
    }
  }

  initProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      GameState.ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('AnimationState'))
      this.animationState = this.template.getFieldByLabel('AnimationState').getValue();

    if(this.template.RootNode.hasField('Appearance'))
      this.appearance = this.template.getFieldByLabel('Appearance').getValue();

    if(this.template.RootNode.hasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.getFieldByLabel('AutoRemoveKey').getValue();

    if(this.template.RootNode.hasField('CloseLockDC'))
      this.closeLockDC = this.template.getFieldByLabel('CloseLockDC').getValue();

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = !!this.template.getFieldByLabel('Commandable').getValue();

    if(this.template.RootNode.hasField('Conversation')){
      this.conversation = DLGObject.FromResRef(this.template.getFieldByLabel('Conversation').getValue());
    }

    if(this.template.RootNode.hasField('CurrentHP'))
      this.currentHP = this.template.getFieldByLabel('CurrentHP').getValue();

    if(this.template.RootNode.hasField('DisarmDC'))
      this.disarmDC = this.template.getFieldByLabel('DisarmDC').getValue();

    if(this.template.RootNode.hasField('Faction')){
      this.factionId = this.template.getFieldByLabel('Faction').getValue();
      if((this.factionId & 0xFFFFFFFF) == -1){
        this.factionId = 0;
      }
    }
    this.faction = GameState.FactionManager.factions.get(this.factionId);

    if(this.template.RootNode.hasField('Fort'))
      this.fort = this.template.getFieldByLabel('Fort').getValue();
  
    if(this.template.RootNode.hasField('GenericType')){
      this.genericType = this.template.RootNode.getFieldByLabel('GenericType').getValue();
      this.doorAppearance = GameState.AppearanceManager.GetDoorAppearanceById(this.genericType);
    }
        
    if(this.template.RootNode.hasField('HP'))
      this.hp = this.template.RootNode.getFieldByLabel('HP').getValue();

    // If CurrentHP was absent, start at max HP so bash is not immediately dead.
    if(!this.template.RootNode.hasField('CurrentHP'))
      this.currentHP = this.hp;

    if(this.template.RootNode.hasField('Hardness'))
      this.hardness = this.template.RootNode.getFieldByLabel('Hardness').getValue();
    
    if(this.template.RootNode.hasField('Interruptable'))
      this.interruptable = this.template.RootNode.getFieldByLabel('Interruptable').getValue();
        
    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.RootNode.getFieldByLabel('KeyName').getValue();
  
    if(this.template.RootNode.hasField('KeyRequired'))
      this.keyRequired = this.template.RootNode.getFieldByLabel('KeyRequired').getValue();
      
    if(this.template.RootNode.hasField('LoadScreenID'))
      this.loadScreenID = this.template.getFieldByLabel('LoadScreenID').getValue();

    if(this.template.RootNode.hasField('LocName'))
      this.locName = this.template.getFieldByLabel('LocName').getCExoLocString();

    if(this.template.RootNode.hasField('Description'))
      this.description = this.template.getFieldByLabel('Description').getCExoLocString();

    if(this.template.RootNode.hasField('Locked'))
      this.locked = this.template.getFieldByLabel('Locked').getValue();

    if(this.template.RootNode.hasField('Min1HP'))
      this.min1HP = this.template.getFieldByLabel('Min1HP').getValue();

    if(this.template.RootNode.hasField('OpenLockDC'))
      this.openLockDC = this.template.getFieldByLabel('OpenLockDC').getValue();

    if(this.template.RootNode.hasField('OpenState'))
      this.openState = this.template.getFieldByLabel('OpenState').getValue();

    if(this.template.RootNode.hasField('PaletteID'))
      this.paletteID = this.template.getFieldByLabel('PaletteID').getValue();

    // Retail LoadDoor: Invulnerable aliases Plot; Static forces plot = 1.
    if(this.template.RootNode.hasField('Invulnerable')){
      this.plot = !!this.template.getFieldByLabel('Invulnerable').getValue();
    }else if(this.template.RootNode.hasField('Plot')){
      this.plot = !!this.template.getFieldByLabel('Plot').getValue();
    }

    if(this.template.RootNode.hasField('PortraitId')){
      this.portraitId = this.template.getFieldByLabel('PortraitId').getValue();
    }else if(this.template.RootNode.hasField('PortraidId')){
      // Legacy typo in some templates
      this.portraitId = this.template.getFieldByLabel('PortraidId').getValue();
    }
    // Retail LoadDoor: PortraitId == 0 → 0x22E (558)
    if((this.portraitId | 0) === 0){
      this.portraitId = 0x22E;
    }
    this.portrait = GameState.SWRuleSet.portraits[this.portraitId];


    if(this.template.RootNode.hasField('Ref'))
      this.ref = this.template.getFieldByLabel('Ref').getValue();

    if(this.template.RootNode.hasField('SecretDoorDC'))
      this.secretDoorDC = this.template.getFieldByLabel('SecretDoorDC').getValue();

    if(this.template.RootNode.hasField('Static'))
      this.static = !!this.template.getFieldByLabel('Static').getValue();
    if(this.static){
      this.plot = true;
    }

    if(this.template.RootNode.hasField('Useable'))
      this.useable = !!this.template.getFieldByLabel('Useable').getValue();

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('TrapDetectDC'))
      this.trapDetectDC = this.template.getFieldByLabel('TrapDetectDC').getValue();
  
    if(this.template.RootNode.hasField('TrapDetectable'))
      this.trapDetectable = !!this.template.RootNode.getFieldByLabel('TrapDetectable').getValue();

    if(this.template.RootNode.hasField('TrapDisarmable'))
      this.trapDisarmable = !!this.template.RootNode.getFieldByLabel('TrapDisarmable').getValue();
  
    if(this.template.RootNode.hasField('TrapFlag'))
      this.trapFlag = !!this.template.RootNode.getFieldByLabel('TrapFlag').getValue();

    if(this.template.RootNode.hasField('TrapOneShot'))
      this.trapOneShot = !!this.template.getFieldByLabel('TrapOneShot').getValue();

    if(this.template.RootNode.hasField('TemplateResRef'))
      this.templateResRef = this.template.getFieldByLabel('TemplateResRef').getValue();

    if(this.template.RootNode.hasField('TrapType'))
      this.trapType = this.template.getFieldByLabel('TrapType').getValue();

    if(this.template.RootNode.hasField('Will'))
      this.will = this.template.getFieldByLabel('Will').getValue();

    if(this.template.RootNode.hasField('X'))
      this.x = this.position.x = this.template.RootNode.getFieldByLabel('X').getValue();

    if(this.template.RootNode.hasField('Y'))
      this.y = this.position.y = this.template.RootNode.getFieldByLabel('Y').getValue();

    if(this.template.RootNode.hasField('Z'))
      this.z = this.position.z = this.template.RootNode.getFieldByLabel('Z').getValue();

    if(this.template.RootNode.hasField('Bearing'))
      this.bearing = this.rotation.z = this.template.RootNode.getFieldByLabel('Bearing').getValue();

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

    if(this.template.RootNode.hasField('EffectList')){
      let effects = this.template.RootNode.getFieldByLabel('EffectList').getChildStructs() || [];
      for(let i = 0; i < effects.length; i++){
        let effect = GameEffectFactory.EffectFromStruct(effects[i]);
        if(effect){
          effect.setAttachedObject(this);
          effect.loadModel();
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }

    // Retail CSWSDoor::PostProcess @ 00589d40 — hardness applies a permanent
    // DamageResistance effect (subtype |= 2, int0 = 0x3FFF, int1 = hardness, is_exposed = 0).
    if((this.hardness | 0) > 0 && !this.effects.some(e => e.type === GameEffectType.EffectDamageResistance)){
      const eDamageResist = new GameEffectFactory.EffectDamageResistance();
      // Retail PostProcess: subtype & 0xfff8 | 2 (PERMANENT only — not MAGICAL|PERMANENT = 10)
      eDamageResist.setSubTypeUnMasked(GameEffectDurationType.PERMANENT);
      // Retail ApplyEffect with field97_0x1ec = 1 during PostProcess → SkipOnLoad = 1
      eDamageResist.setSkipOnLoad(true);
      eDamageResist.setInt(0, 0x3FFF);
      eDamageResist.setInt(1, this.hardness | 0);
      eDamageResist.setIsExposed(false);
      this.addEffect(eDamageResist);
    }

    this.loadActionList();

    if(this.template.RootNode.hasField('LinkedTo'))
      this.linkedTo = this.template.RootNode.getFieldByLabel('LinkedTo').getValue();

    if(this.template.RootNode.hasField('LinkedToFlags'))
      this.linkedToFlags = this.template.RootNode.getFieldByLabel('LinkedToFlags').getValue();

    if(this.template.RootNode.hasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.getFieldByLabel('LinkedToModule').getValue();

    if(this.template.RootNode.hasField('TransitionDestin'))
      this.transitionDestin = this.template.RootNode.getFieldByLabel('TransitionDestin').getCExoLocString();
    
    //BEGIN: TSL Properties
    if(this.template.RootNode.hasField('TweakColor'))
      this.tweakColor = this.template.getFieldByLabel('TweakColor').getValue();
    
    if(this.template.RootNode.hasField('UseTweakColor'))
      this.useTweakColor = !!this.template.getFieldByLabel('UseTweakColor').getValue();

    if(this.template.RootNode.hasField('NotBlastable'))
      this.notBlastable = !!this.template.getFieldByLabel('NotBlastable').getValue();
    //END: TSL Properties

    this.initialized = true

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
    let gff = new GFFObject();
    gff.FileType = 'UTD ';
    gff.RootNode.type = 8;

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Appearance') ).setValue(this.appearance);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).setValue(this.autoRemoveKey);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Bearing') ).setValue(this.bearing);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') ).setValue(this.closeLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') ).setValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHP') ).setValue(this.currentHP);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(
      this.description instanceof CExoLocString ? this.description : new CExoLocString()
    );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DisarmDC') ).setValue(this.disarmDC);

    //Effects
    let effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue(this.faction ? this.faction.id : this.factionId);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Fort') ).setValue(this.fort);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GenericType') ).setValue(this.genericType);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HP') ).setValue(this.hp);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Hardness') ).setValue(this.hardness);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).setValue(this.keyName);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'KeyRequired') ).setValue(this.keyRequired);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).setValue(this.linkedTo);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LinkedToFlags') ).setValue(this.linkedToFlags);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'LinkedToModule') ).setValue(this.linkedToModule);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).setValue(this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'LoadScreenID') ).setValue(this.loadScreenID);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Lockable') ).setValue(this.lockable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Locked') ).setValue(this.locked);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).setValue(this.min1HP);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    // Scripts — retail SaveDoor @ 00588ad0 includes OnDialog; omits non-retail extras
    // Retail ctor defaults all slots to "default"; persist the loaded resref (including "")
    // even if the NCS failed to load. Absent-field slots fall back to "default".
    const scriptResRef = (key: string) => {
      if(typeof this.scriptResRefs[key] === 'string') return this.scriptResRefs[key];
      return this.scripts[key]?.name || 'default';
    };
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnClick) ).setValue(scriptResRef(ModuleObjectScript.DoorOnClick));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnClosed) ).setValue(scriptResRef(ModuleObjectScript.DoorOnClosed));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnDamaged) ).setValue(scriptResRef(ModuleObjectScript.DoorOnDamaged));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnDeath) ).setValue(scriptResRef(ModuleObjectScript.DoorOnDeath));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnDialog) ).setValue(scriptResRef(ModuleObjectScript.DoorOnDialog));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnDisarm) ).setValue(scriptResRef(ModuleObjectScript.DoorOnDisarm));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnFailToOpen) ).setValue(scriptResRef(ModuleObjectScript.DoorOnFailToOpen));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnHeartbeat) ).setValue(scriptResRef(ModuleObjectScript.DoorOnHeartbeat));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnLock) ).setValue(scriptResRef(ModuleObjectScript.DoorOnLock));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnMeleeAttacked) ).setValue(scriptResRef(ModuleObjectScript.DoorOnMeleeAttacked));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnOpen) ).setValue(scriptResRef(ModuleObjectScript.DoorOnOpen));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnSpellCastAt) ).setValue(scriptResRef(ModuleObjectScript.DoorOnSpellCastAt));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnTrapTriggered) ).setValue(scriptResRef(ModuleObjectScript.DoorOnTrapTriggered));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnUnlock) ).setValue(scriptResRef(ModuleObjectScript.DoorOnUnlock));
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.DoorOnUserDefined) ).setValue(scriptResRef(ModuleObjectScript.DoorOnUserDefined));
    
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') ).setValue(this.openLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenState') ).setValue(this.openState);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot);
    // Retail SaveDoor: PortraitId if id != -1, else Portrait RESREF
    if((this.portraitId | 0) !== 0xFFFF && (this.portraitId | 0) !== -1){
      gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraitId);
    }else{
      const portraitResRef = (this.portrait as any)?.resref || (this.portrait as any)?.baseresre || '';
      gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Portrait') ).setValue(portraitResRef || '');
    }
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Ref') ).setValue(this.ref);

    //SWVarTable
    let swVarTable = gff.RootNode.addField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.addChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'SecretDoorDC') ).setValue(this.secretDoorDC | 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Static') ).setValue(this.static);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin') ).setValue(this.transitionDestin);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') ).setValue(this.trapDetectDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).setValue(this.trapDetectable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).setValue(this.trapDisarmable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapFlag') ).setValue(this.trapFlag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).setValue(this.trapOneShot);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapType') ).setValue(this.trapType);
    this.writeNamedVarTable(gff.RootNode);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Will') ).setValue(this.will);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  animationConstantToAnimation( animation_constant = 10000 ): ITwoDAAnimation {
    const animations2DA = GameState.TwoDAManager.datatables.get('animations');
    if(animations2DA){
      switch( animation_constant ){
        case ModuleDoorAnimState.DEFAULT:       //10000, //327 - 
          return animations2DA.rows[327];
        case ModuleDoorAnimState.OPENED1:       //10050, //331 - 
          return animations2DA.rows[331];
        case ModuleDoorAnimState.OPENED2:       //10051, //332 - 
          return animations2DA.rows[332];
        case ModuleDoorAnimState.CLOSED:        //10022, //333 - 
          return animations2DA.rows[333];
        case ModuleDoorAnimState.OPENING1:      //10052, //334 - 
          return animations2DA.rows[334];
        case ModuleDoorAnimState.OPENING2:      //10053, //335 - 
          return animations2DA.rows[335];
        case ModuleDoorAnimState.CLOSING1:      //10054, //336 - 
          return animations2DA.rows[336];
        case ModuleDoorAnimState.CLOSING2:      //10055, //337 - 
          return animations2DA.rows[337];
        case ModuleDoorAnimState.BUSTED:        //10153, //366 - 
          return animations2DA.rows[366];
        case ModuleDoorAnimState.TRANS:         //10269, //344 - 
          return animations2DA.rows[344];
      }

      return super.animationConstantToAnimation( animation_constant );
    }
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
