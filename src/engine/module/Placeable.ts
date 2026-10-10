import type { AreaRoom } from "@engine/module/AreaRoom";
import { AudioEmitter } from "@engine/audio/AudioEmitter";
import { BinaryReader } from "@core/binary/BinaryReader";
import { ModulePlaceableAnimState } from "@core/enums/module/ModulePlaceableAnimState";
import { ModulePlaceableState } from "@core/enums/module/ModulePlaceableState";
import { resolvePlaceableAnimation } from "@engine/module/animation/resolvePlaceableAnimation";
import { resolveCreatureAnimation } from "@engine/module/animation/resolveCreatureAnimation";
import type { CreatureAnimationContext } from "@engine/module/animation/CreatureAnimationContext";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GameState } from "@engine/runtime/GameState";
import { SSFType } from "@core/enums/resource/SSFType";
import type { SWAnimation } from "@engine/rules/SWAnimation";
import { NWScript } from "@engine/nwscript/NWScript";
import { NWScriptInstance } from "@engine/nwscript/NWScriptInstance";
import { NWScriptEvent } from "@engine/nwscript/events";
import { ExcitedDurationRow } from "@engine/combat/combat-engagement";
import { OdysseyModel, OdysseyWalkMesh } from "@engine/odyssey";
import { CExoLocString } from "@core/resource/CExoLocString";
import { DLGObject } from "@engine/dialog/DLGObject";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import { GFFStruct } from "@core/resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { OdysseyModel3D } from "@engine/render/three/odyssey";
import { SWPlaceableAppearance } from "@engine/rules/SWPlaceableAppearance";
import { composeObjectWalkmeshLocalToWorld } from "@engine/pathfinding/door-walkmesh-matrix";
// import { TwoDAManager, InventoryManager, AppearanceManager, MenuManager, GameObjectManager, FactionManager } from "@engine/managers";
import { AudioEngine } from "@engine/audio/AudioEngine";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { BitWise } from "@core/utility/BitWise";
import { GameEffectFactory } from "@engine/effects/GameEffectFactory";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameObject } from "@engine/module/GameObject";
import { GameObjectLoadPipeline } from "@engine/module/serialization/GameObjectLoadPipeline";
import { placeableSerializer } from "@engine/module/serialization/PlaceableSerializer";
import type { NestedItemEntry } from "@engine/module/serialization/NestedItemListSerializer";
import { Item } from "@engine/module/Item";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import { PlaceableLightmapBaker } from "@engine/managers/PlaceableLightmapBaker";
import { DLGConversationType } from "@core/enums/dialog/DLGConversationType";
import { SkillType } from "@core/enums/nwscript/SkillType";
import { ModulePlaceableObjectSound } from "@core/enums/module/ModulePlaceableObjectSound";
import { AudioPriorityGroup } from "@core/enums/audio/AudioPriorityGroup";
import { AudioEmitterType } from "@core/enums/audio/AudioEmitterType";
import { SWBodyBag } from "@engine/rules/SWBodyBag";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { CombatActionType } from "@core/enums/combat/CombatActionType";
import * as THREE from "three";

import { isCreature } from "@engine/module/guards/isCreature";
import { getSavingThrowEffectBonus } from "@engine/effects/effect-bonuses";
import { Dice } from "@core/utility/Dice";
import { DiceType } from "@core/enums/combat/DiceType";
import {
  combineSavingThrow,
  rollSavingThrow,
} from "@engine/module/savingThrow/savingThrowMath";

interface AnimStateInfo {
  lastAnimState: ModulePlaceableAnimState;
  currentAnimState: ModulePlaceableAnimState;
  loop: boolean;
  started: boolean;
};

enum ModulePlaceableEvent {
  OPEN_START,
  OPEN_END,
  CLOSE_START,
  CLOSE_END,
}

/**
* Placeable class.
*
* Class representing placeable objects found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file Placeable.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class Placeable extends GameObject {
  openState: boolean;
  _state: ModulePlaceableState;
  lastUsedBy: any;
  state: ModulePlaceableState;
  bodyBag: number;
  closeLockDC: number;
  disarmDC: number;
  fort: number;
  genericType: number;
  hasInventory: boolean;
  hardness: number;
  interruptable: boolean;
  keyRequired: boolean;
  lockable: boolean;
  locked: boolean;
  openLockDC: number;
  paletteID: number;
  partyInteract: boolean;
  ref: number;
  static: boolean;
  will: number;
  x: number;
  y: number;
  z: number;
  defaultAnimPlayed: boolean;
  useable: any;
  isBodyBag: boolean = false;
  dieWhenEmpty: boolean = false;
  isCorpse: boolean = false;
  /**
   * IsBodyBagVisible — ordinary bags start hidden under a KeepCorpse shell.
   * Persisted as 1 on save (shells are never serialized); runtime may hide.
   */
  isBodyBagVisible: boolean = true;
  /** Creature/object id that spawned this body bag. */
  sourceCreatureId: number = 0;
  groundPile: boolean = false;
  lightState: any;
  props: any;

  lastObjectOpened: GameObject;
  lastObjectClosed: GameObject;

  animStateInfo: AnimStateInfo = {
    lastAnimState: ModulePlaceableAnimState.DEFAULT,
    currentAnimState: ModulePlaceableAnimState.DEFAULT,
    loop: false,
    started: false
  };
  placeableAppearance: SWPlaceableAppearance;

  constructor ( gff = new GFFObject()) {
    super(gff);
    this.objectType |= GameObjectType.Placeable;
    this.template = gff;

    this.openState = false;
    this._state = ModulePlaceableState.NONE;
    this.lastUsedBy = undefined;

    this.state = ModulePlaceableState.DEFAULT;
    this.appearance = 0;
    this.autoRemoveKey = false;
    this.bodyBag = 0;
    this.closeLockDC = 0;
    // LoadObjectState Commandable default = 1
    this.commandable = true;
    this.currentHP = 0;
    this.description = new CExoLocString();
    this.disarmDC = 0;
    this.fort = 0;
    this.genericType = 0;
    this.hp = 0;
    this.hasInventory = false;
    this.hardness = 0;
    this.interruptable = false;
    this.keyName = '';
    this.keyRequired = false;
    this.loadScreenID = 0;
    this.locName = new CExoLocString();
    this.lockable = false;
    this.locked = false;
    this.min1HP = false;
    this.name = '';
    this.openLockDC = 100;
    this.paletteID = 0;
    this.partyInteract = false;
    this.plot = false;
    // ctor portrait_id = 0xFFFF (save writes empty Portrait when unset)
    this.portraitId = 0xFFFF;
    this.ref = 0;
    this.static = false;
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

    this.defaultAnimPlayed = false;

    this.inventory = [];

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

  onClick(callee: GameObject){
    GameState.PartyManager.getCurrentPlayer().actionUseObject( this );
  }

  //---------------//
  // SCRIPT EVENTS
  //---------------//

  /**
   * EventHandler script case 7 (OnDialog).
   * Empty or "default" OnDialog → k_hen_dialogue01.
   */
  override onDialog(oSpeaker: GameObject, listenPatternNumber = -1, conversation: DLGObject = undefined, matchedSubstrings: string[] = []): boolean {
    this.setMatchedSubstrings(matchedSubstrings || []);

    let nwscript = this.scripts[ScriptHook.PlaceableOnDialog];
    const resRef = nwscript?.name || '';
    if(!nwscript || !resRef || resRef.toLowerCase() === 'default'){
      const fallback = GameState.NWScript.Load('k_hen_dialogue01');
      if(fallback){
        this.scripts[ScriptHook.PlaceableOnDialog] = fallback;
        fallback.bindOwner(this, ScriptHook.PlaceableOnDialog);
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

  /**
   * On damaged — effect apply door/placeable BroadcastCombatStateToParty(attacker, INVALID).
   */
  override onDamaged(){
    if(this.isDead())
      return true;

    const damager = this.combatData.lastDamager ?? this.combatData.lastAttacker;
    if(isCreature(damager)){
      damager.broadcastCombatStateToParty();
    }

    const onDamaged = this.scripts[ScriptHook.PlaceableOnDamaged];
    if(onDamaged){
      onDamaged.run(this);
    }
  }

  /**
   * On attacked — EventHandler 0xf attacker broadcast.
   */
  override onAttacked(attackType: CombatActionType){
    const attacker = this.combatData.lastAttacker;
    if(isCreature(attacker)){
      attacker.broadcastCombatStateToParty();
      attacker.removeCombatInvisibilityEffects();
    }
    const isSpell = attackType == CombatActionType.CAST_SPELL || attackType == CombatActionType.ITEM_CAST_SPELL;
    const onAttacked = this.scripts[
      isSpell ? ScriptHook.PlaceableOnSpellCastAt : ScriptHook.PlaceableOnMeleeAttacked
    ];
    if(onAttacked){
      onAttacked.run(this);
    }
  }

  override triggerHeartbeat(){
    if(!this.canProcessHeartbeat()){ return; }
    const onHeartbeat = this.scripts[ScriptHook.PlaceableOnHeartbeat];
    if(!onHeartbeat){ return; }
    onHeartbeat.run(this);
  }

  override triggerUserDefinedEvent(event: NWScriptEvent){
    this.runUserDefinedScript(event, this.scripts[ScriptHook.PlaceableOnUserDefined]);
  }

  /**
   * placeable EventHandler OnSpellCastAt — harmful engages caster only.
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

    this.runSpellCastAtScript(event, this.scripts[ScriptHook.PlaceableOnSpellCastAt]);
  }

  override bindTrapTriggeredScript(nwscript: NWScriptInstance): ScriptHook | undefined {
    this.scripts[ScriptHook.PlaceableOnTrapTriggered] = nwscript;
    return ScriptHook.PlaceableOnTrapTriggered;
  }

  detachFromRoom(room: AreaRoom): void {
    if(!room) return;
    const index = room.placeables.indexOf(this);
    if(index >= 0){
      room.placeables.splice(index, 1);
      this.markCollisionBoundsDirty('room');
    }
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

  update(delta = 0){

    super.update(delta);

    if(this.collisionManager.walkmesh){
      if(!this.isStatic() || this.collisionMatrixDirty){
        this.container?.updateMatrix();
        this.container?.updateMatrixWorld(!this.isStatic());
        this.syncWalkmeshMatrix();
        this.collisionMatrixDirty = false;
      }
    }

    if(this.model instanceof OdysseyModel3D){
      if(this.room){
        if(this.room.model instanceof OdysseyModel3D){
          if(this.model){
            const visible = !!this.room.model.userData?.visActive;
            if(this.model.visible !== visible){
              this.model.visible = visible;
              this.markCollisionBoundsDirty('visibility');
            }
          }
        }
      }

      if(this.model.visible && !this.static){
        this.model.update(delta);
      }

      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    }

    this.action = this.actionQueue[0];
    // Action queue processed in aiUpdate

    // if(this.animState == ModulePlaceableAnimState.DEFAULT){
    // if(this.isOpen){
    // this.setAnimationState(ModulePlaceableAnimState.OPEN);
    // }else{
    // this.setAnimationState(ModulePlaceableAnimState.CLOSE);
    // }
    // }

    if(this.locked && this.getHP() <= 0){
      this.locked = false;
      this.setAnimationState(ModulePlaceableAnimState.CLOSE_OPEN);
    }

    if(!(this.model instanceof OdysseyModel3D))
      return;

    const transitioning = this.animStateInfo.currentAnimState === ModulePlaceableAnimState.OPEN_CLOSE
      || this.animStateInfo.currentAnimState === ModulePlaceableAnimState.CLOSE_OPEN;
    if(transitioning){
      PlaceableLightmapBaker.noteActivity(this);
    }

    let currentAnimation = this.model.getAnimationName();
    if(!this.animStateInfo.currentAnimState) this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
    if(this.animStateInfo.currentAnimState){
      let animation = this.animationConstantToAnimation(this.animStateInfo.currentAnimState);
      if(animation){
        if(currentAnimation != animation.name?.toLowerCase()){
          if(!this.animStateInfo.started){
            this.animStateInfo.started = true;
            const aLooping = (!animation.fireforget && animation.looping);
            this.getModel().playAnimation(animation.name?.toLowerCase(), aLooping);
          }else{
            //Animation completed
            switch(this.animStateInfo.currentAnimState){
              case ModulePlaceableAnimState.OPEN_CLOSE:
                this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
                this.triggerEvent(ModulePlaceableEvent.CLOSE_END);
              break;
              case ModulePlaceableAnimState.CLOSE_OPEN:
                this.setAnimationState(ModulePlaceableAnimState.OPEN);
                this.triggerEvent(ModulePlaceableEvent.OPEN_END);
              break;
              default:
                this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
              break;
            }
          }
        }
      }else{
        console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
        this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
      }
    }

  }

  getName(){
    return this.hasInventory && !this.getInventory().length ? this.name + ' (Empty)' : this.name;
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
    return this.keyRequired ? true : false;
  }

  getOpenState(){
    return this.state;
  }

  setOpenState(state: ModulePlaceableState){
    this.state = state;
    this.markCollisionBoundsDirty('state');
    if(this.state == ModulePlaceableState.OPEN || this.state == ModulePlaceableState.DEAD){
      this.openState = true;
    }else{
      this.openState = false;
    }
  }

  isStatic(){
    return this.static;
  }

  isUseable(){
    // Hidden bags are looted via the retained corpse shell, not direct select
    if(this.isBodyBag && !this.isBodyBagVisible) return false;
    // Static placeables are non-interactable (Bash / selection).
    return !!this.useable && !this.static;
  }

  setBodyBagVisible(visible: boolean){
    this.isBodyBagVisible = !!visible;
    if(this.container){
      this.container.visible = this.isBodyBagVisible;
    }
    if(this.model){
      this.model.visible = this.isBodyBagVisible;
    }
    this.markCollisionBoundsDirty('visibility');
  }

  /**
   * GetReticlePoint
   * corpses use rootdummy; others fall back to lookathook.
   */
  getReticleNode(){
    if(this.isCorpse && this.model?.rootdummy){
      return this.model.rootdummy;
    }
    return super.getReticleNode();
  }

  isOpen(){
    // : open or destroyed — Bash is suppressed for both.
    return this.openState || this.state == ModulePlaceableState.DEAD;
  }

  GetConversation(){
    return this.conversation;
  }

  getItemByTag(sTag = ''): Item {
    for(let i = 0; i < this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag().toLowerCase() == sTag.toLowerCase()){
        return item;
      }
    }
    return undefined;
  }

  getInventory(){
    return this.inventory;
  }

  getAppearance(): SWPlaceableAppearance {
    return this.placeableAppearance;
  }

  getObjectSounds(){
    let result = {"__rowlabel":-1,"label":"","armortype":"","opened":"****","closed":"****","destroyed":"****","used":"****","locked":"****"};
    const apppearance = this.getAppearance();
    if(!apppearance) return result;

    const soundIdx = apppearance.soundapptype;
    if(!isNaN(soundIdx) && soundIdx >= 0){
      const table = GameState.TwoDAManager.datatables.get('placeableobjsnds');
      if(table && typeof table.rows[soundIdx] !== 'undefined'){
        result = table.rows[soundIdx];
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

  retrieveInventory(){
    while(this.inventory.length){
      const item = this.inventory.pop();
      const stackSize = item.getStackSize();
      for(let i = 0; i < stackSize; i++){
        GameState.InventoryManager.addItem(item);
      }
    }
    const instance = this.scripts[ScriptHook.PlaceableOnInvDisturbed];
    if(instance){
      instance.lastDisturbed = GameState.PartyManager.party[0];
      instance.run(this);
    }
    if(this.isCorpse && !this.inventory.length){
      this.useable = false;
    }
    if(this.dieWhenEmpty && !this.inventory.length){
      this.destroy();
    }
  }

  getModel(){
    return this.model;
  }

  setAnimationState(animState: ModulePlaceableAnimState = ModulePlaceableAnimState.DEFAULT){
    this.animStateInfo.currentAnimState = animState;
    this.animState = animState;
    this.animStateInfo.lastAnimState = this.animState;
    this.animStateInfo.loop = false;
    this.animStateInfo.started = false;
    if(animState == ModulePlaceableAnimState.OPEN) this.animStateInfo.loop = true;
    if(animState == ModulePlaceableAnimState.DEFAULT) this.animStateInfo.loop = true;
    // Resting OPEN / DEAD sync openState for Bash gates.
    if(animState == ModulePlaceableAnimState.OPEN){
      this.setOpenState(ModulePlaceableState.OPEN);
    }else if(animState == ModulePlaceableAnimState.DEAD){
      this.setOpenState(ModulePlaceableState.DEAD);
    }
    if(this.model) this.model.stopAnimation();
  }

  triggerEvent(state: ModulePlaceableEvent){
    switch(state){
      case ModulePlaceableEvent.OPEN_START:
        this.setOpenState(ModulePlaceableState.OPEN);
        this.playObjectSound(ModulePlaceableObjectSound.OPENED);
      break;
      case ModulePlaceableEvent.OPEN_END:
        // : has_inventory = !corpse, but corpse bags with items remain useable
        if(this.hasInventory || (this.isCorpse && this.inventory.length > 0)){
          GameState.MenuManager.MenuContainer.AttachContainer(this);
          GameState.MenuManager.MenuContainer.open();
        }

        this.scripts[ScriptHook.PlaceableOnOpen]?.run(this)
        // Settle pose: deferred static-chart rebake (animated parts stay nearest-lit).
        PlaceableLightmapBaker.noteActivity(this);
        PlaceableLightmapBaker.invalidate(this);
      break;
      case ModulePlaceableEvent.CLOSE_START:
        this.setOpenState(ModulePlaceableState.CLOSED);
        this.playObjectSound(ModulePlaceableObjectSound.CLOSED);
      break;
      case ModulePlaceableEvent.CLOSE_END:
        this.scripts[ScriptHook.PlaceableOnClosed]?.run(this)
        PlaceableLightmapBaker.noteActivity(this);
        PlaceableLightmapBaker.invalidate(this);
      break;
    }
  }

  use(object: GameObject){

    this.lastUsedBy = object;

    this.attemptUnlockWithKey(object);

    if(this.isLocked()){
      this.playObjectSound(ModulePlaceableObjectSound.LOCKED);
    }else if(this.isBodyBag){
      // Body bags (often hidden under KeepCorpse, or used before EventSpawnBodyBag
      // loads the model) skip open anim — open inventory immediately.
      this.setOpenState(ModulePlaceableState.OPEN);
      this.triggerEvent(ModulePlaceableEvent.OPEN_END);
    }else{
      if(!this.isOpen() && (this.state == ModulePlaceableState.CLOSED || this.state == ModulePlaceableState.DEFAULT)){
        this.setAnimationState(ModulePlaceableAnimState.CLOSE_OPEN);
        this.triggerEvent(ModulePlaceableEvent.OPEN_START);
      }else{
        this.setAnimationState(ModulePlaceableAnimState.OPEN);
        this.triggerEvent(ModulePlaceableEvent.OPEN_END);
      }
    }

    const instance = this.scripts[ScriptHook.PlaceableOnUsed];
    if(!instance){ return; }
    instance.run(this);
  }

  attemptUnlockWithKey(object: GameObject){
    if(this.keyRequired){
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
  }

  lock(object: GameObject){
    if(this.locked){ return; }
    this.locked = true;
    this.lastLockedBy = object;

    const instance = this.scripts[ScriptHook.PlaceableOnLock];
    if(!instance){ return; }
    instance.run(this);
  }

  unlock(object: GameObject){
    if(!this.locked){ return; }
    this.locked = false;
    this.lastUnlockedBy = object;

    const instance = this.scripts[ScriptHook.PlaceableOnUnlock];
    if(!instance){ return; }
    instance.run(this);
  }

  attemptUnlock(object: GameObject){
    if(!BitWise.InstanceOf(object?.objectType, GameObjectType.Creature)){
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

  close(object: GameObject){
    this.lastObjectClosed = object;
    if(this.isOpen() && this.state == ModulePlaceableState.OPEN){
      this.setAnimationState(ModulePlaceableAnimState.OPEN_CLOSE);
      this.triggerEvent(ModulePlaceableEvent.CLOSE_START);
    }else{
      this.setAnimationState(ModulePlaceableAnimState.CLOSE);
      this.triggerEvent(ModulePlaceableEvent.CLOSE_END);
    }
  }

  load(){
    this.seedResRefsFromTemplate();
    if(this.getTemplateResRef()){
      const merged = GameObjectLoadPipeline.mergeBlueprint(this.template, {
        refField: 'TemplateResRef',
        resourceKey: 'utp',
        runtimeResRef: this.getTemplateResRef(),
      });
      if(!merged){
        console.error('Failed to load Placeable template');
      }
      if(this.template instanceof GFFObject){
        this.initProperties();
        this.loadInventory();
        this.loadScripts();
      }
    }else{
      this.initProperties();
      this.loadInventory();
      this.loadScripts();
    }
  }

  async loadModel(): Promise<OdysseyModel3D> {
    const modelName = this.getAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    try {
      const mdl = await MDLLoader.loader.load(modelName);
      const plc = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        castShadow: true,
        receiveShadow: false,
        // Keep lit until runtime lightmap bake applies USE_LIGHTMAP — options.static
        // alone would stamp IGNORE_LIGHTING (flat albedo) on unusable placeables.
        lighting: true,
        static: this.static,
        // Merge non-anim-dummy leaves (exclusions match rooms). Animated / AABB /
        // emitter nodes stay live so containers and scripted props keep working.
        mergeStatic: true,
        useTweakColor: this.useTweakColor,
        tweakColor: this.tweakColor
      });

      if(this.model instanceof OdysseyModel3D){
        this.model.removeFromParent();
        try{ this.model.dispose(); }catch(e){}
      }

      this.model = plc;
      this.model.userData.gameObject = this;
      this.model.name = modelName;

      this.container.add(this.model);
      this.markCollisionBoundsDirty('model');

      this.model.disableMatrixUpdate();
      const shadowSize = this.getAppearance()?.shadowsize ?? 1;
      void this.applyShadowBlob(GameObject.shadowBlobResRefFromPlaceableShadowSize(shadowSize));

      // Queue bake for late spawns; area load finishes with bakeArea.
      PlaceableLightmapBaker.noteActivity(this);
      PlaceableLightmapBaker.invalidate(this);
    }catch(e){
      console.error(e);
    }

    return this.model;
  }

  loadScripts (){
    const scriptKeys = [
      ScriptHook.PlaceableOnClosed,
      ScriptHook.PlaceableOnDamaged,
      ScriptHook.PlaceableOnDeath,
      ScriptHook.PlaceableOnDialog,
      ScriptHook.PlaceableOnDisarm,
      ScriptHook.PlaceableOnEndDialogue,
      ScriptHook.PlaceableOnHeartbeat,
      ScriptHook.PlaceableOnInvDisturbed,
      ScriptHook.PlaceableOnLock,
      ScriptHook.PlaceableOnMeleeAttacked,
      ScriptHook.PlaceableOnOpen,
      ScriptHook.PlaceableOnSpellCastAt,
      ScriptHook.PlaceableOnTrapTriggered,
      ScriptHook.PlaceableOnUnlock,
      ScriptHook.PlaceableOnUsed,
      ScriptHook.PlaceableOnUserDefined,
    ];

    this.hydrateScriptResRefsFromTemplate(scriptKeys);
    this.bindScriptsFromResRefs(scriptKeys, 'Placeable.loadScripts');
  }

  loadInventory(){
    const inventory = (this as any)._pendingInventoryEntries as NestedItemEntry[] | undefined;
    (this as any)._pendingInventoryEntries = undefined;
    if(!inventory){ return; }
    for(let i = 0; i < inventory.length; i++){
      this.loadItem(GFFObject.FromStruct(inventory[i].struct));
    }
  }

  loadItem( template: GFFObject){
    let item = new GameState.Module.Area.Item(template);
    item.initProperties();
    item.load();
    let hasItem = this.getItemByTag(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      hasItem.setPossessor(this);
      return hasItem;
    }else{
      this.inventory.push(item);
      item.setPossessor(this);
      return item;
    }
  }

  /**
   * PWK LocalToWorld: T(pos) * R * T(header.position). Verts stay file-local.
   */
  syncWalkmeshMatrix(): void {
    const wok = this.collisionManager?.walkmesh;
    if(!wok){ return; }
    composeObjectWalkmeshLocalToWorld(
      wok.matrixWorld,
      this.position,
      this.rotation,
      wok.header?.position,
    );
    wok.mat4.copy(wok.matrixWorld);
    if(wok.mesh){
      wok.mesh.matrixAutoUpdate = false;
      wok.mesh.matrix.copy(wok.matrixWorld);
      wok.mesh.matrixWorld.copy(wok.matrixWorld);
    }
  }

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes['pwk'], resRef);
      const walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
      walkmesh.name = resRef;
      walkmesh.gameObject = this;
      this.collisionManager.setWalkmesh(walkmesh);
      // Keep verts in BWM local space; syncWalkmeshMatrix applies pose + header.position.
      if(this.model){
        this.model.add(walkmesh.mesh);
      }
      this.syncWalkmeshMatrix();
      this.markCollisionBoundsDirty('walkmesh');

      return walkmesh;
    }catch(e){
      // Many placeables (incl. body bags) have no.pwk — empty mesh is fine
      const walkmesh = new OdysseyWalkMesh();
      walkmesh.name = resRef;
      walkmesh.gameObject = this;
      this.collisionManager.setWalkmesh(walkmesh);
      this.markCollisionBoundsDirty('walkmesh');

      return this.collisionManager.walkmesh;
    }
  }

  initProperties(){
    const needsRegister = !this.initialized;
    placeableSerializer.deserialize(this, this.template, {
      actionFromStruct: (struct) => GameState.ActionFactory.FromStruct(struct),
      effectFromStruct: (struct) => GameState.GameEffectFactory.EffectFromStruct(struct),
    });

    const conversationResRef = (this as any)._conversationResRef;
    if(conversationResRef){
      this.conversation = DLGObject.FromResRef(conversationResRef);
    }

    this.faction = GameState.FactionManager.factions.get(this.factionId);
    try{
      this.placeableAppearance = GameState.AppearanceManager.GetPlaceableAppearanceById(this.appearance);
    }catch(e){
      console.error(e);
    }
    if(this.portraitId){
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }

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


    if(needsRegister){
      GameState.GameObjectManager.RegisterObject(this);
    }
    this.initialized = true;
  }

  /**
   * Set the facing
   * @param facing
   * @param instant
   */
  setFacing(facing = 0, instant = false, speed?: number){
    super.setFacing(facing, instant, speed as any);
    PlaceableLightmapBaker.noteActivity(this);
    PlaceableLightmapBaker.invalidate(this);
  }

  /**
   * Set the position
   */
  setPosition(x: THREE.Vector3|number = 0, y = 0, z = 0){
    super.setPosition(x as any, y, z);
    PlaceableLightmapBaker.noteActivity(this);
    PlaceableLightmapBaker.invalidate(this);
  }

  destroy(): void {
    PlaceableLightmapBaker.dispose(this);
    // SpawnBodyBag accepts placeables with items when destroyable
    if(!this.isBodyBag && this.isDestroyable){
      this.spawnBodyBag();
    }
    // Unlink KeepCorpse shell → bag (does not evict the shell from the cache)
    if(this.isBodyBag && this.sourceCreatureId){
      const source = GameState.GameObjectManager.GetObjectById(this.sourceCreatureId);
      if(isCreature(source)){
        const creature = source as Creature;
        if(creature.bodyBagObjectId === this.id){
          creature.bodyBagObjectId = 0;
        }
      }
    }
    super.destroy();
    if(this.area) this.area.detachObject(this);

    while(this.inventory.length){
      const item = this.inventory[0];
      if(item){
        item.destroy();
      }
      this.inventory.splice(0, 1);
    }

    try{
      const wmIdx = GameState.walkmeshList.indexOf(this.collisionManager.walkmesh.mesh);
      if(wmIdx >= 0) GameState.walkmeshList.splice(wmIdx, 1);
    }catch(e){}
  }

  /**
   * Spawn a body bag from this placeable's inventory (placeable SpawnBodyBag).
   */
  spawnBodyBag(): number {
    if(this.isBodyBag) return GameObjectConstant.OBJECT_INVALID;
    if(!this.isDestroyable) return GameObjectConstant.OBJECT_INVALID;
    if(!this.inventory.length) return GameObjectConstant.OBJECT_INVALID;
    return Placeable.spawnBodyBagFrom(this, this.bodyBag || 0);
  }

  save(){
    const gff = placeableSerializer.serialize(this);
    this.template = gff;
    return gff;
  }

  /**
   * Placeables resolve their own anim-state map first, then fall through to
   * creature ServerToClientAnimation (placeables can play creature clips).
   */
  animationConstantToAnimation( animation_constant = 10000 ): SWAnimation | undefined {
    return resolvePlaceableAnimation(animation_constant, GameState.SWRuleSet.animationIdMap)
      ?? resolveCreatureAnimation(
        animation_constant,
        this.getAnimationResolveContext(),
        GameState.SWRuleSet.animations,
      );
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

  private getAnimationResolveContext(): CreatureAnimationContext {
    return {
      simple: this.isSimpleCreature(),
      injured: this.isInjured(),
      poisoned: this.isPoisoned(),
      diseased: this.isDiseased(),
      weaponType: this.getCombatAnimationWeaponType(),
      gameKey: GameState.GameKey,
    };
  }

  static GenerateTemplate(){
    let template = new GFFObject();
    template.FileType = 'UTP ';

    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AnimationState') );
    template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Appearance') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHP') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DisarmDC') );
    template.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Fort') );
    template.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HP') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Hardness') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'HasInventory') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'KeyRequired') );
    template.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Lockable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Locked') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnClosed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDamaged') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDeath') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDisarm') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnEndDialogue') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnInvDisturbed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnLock') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnOpen') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUnlock') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUsed') );
    template.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PaletteId') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraidId') );
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
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Useable') );
    template.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Will') );

    return template;
  }

  static FromBodyBag(bodyBag: SWBodyBag, bodyBagRowId: number = 0){
    const placeable = new Placeable();
    placeable.bodyBag = bodyBagRowId;
    placeable.appearance = bodyBag.appearance >= 0 ? bodyBag.appearance : 0;
    placeable.locName = new CExoLocString(bodyBag.name);
    placeable.name = placeable.locName.getValue() || 'Body Bag';
    placeable.tag = 'Body Bag';
    placeable.hp = 15;
    placeable.currentHP = 15;
    placeable.hardness = 5;
    placeable.fort = 16;
    // : has_inventory = !is_corpse; plot = !is_corpse; dieWhenEmpty for non-corpse bags
    placeable.hasInventory = !bodyBag.corpse;
    placeable.isCorpse = !!bodyBag.corpse;
    placeable.min1HP = true;
    placeable.partyInteract = true;
    placeable.isBodyBag = true;
    placeable.dieWhenEmpty = !bodyBag.corpse;
    placeable.plot = !bodyBag.corpse;
    placeable.useable = true;
    placeable.locked = false;
    placeable.lockable = false;
    try{
      placeable.placeableAppearance = GameState.AppearanceManager.GetPlaceableAppearanceById(placeable.appearance);
    }catch(e){}
    return placeable;
  }

  /**
   * Create a body-bag placeable from a creature or placeable, move droppable loot,
   * and schedule EventSpawnBodyBag (~500ms) to place it in the area.
   * @param placeableAppearance Optional GetBodyBagAppearance override.
   */
  static spawnBodyBagFrom(
    source: GameObject,
    bodyBagRowId: number = 0,
    rule?: SWBodyBag,
    placeableAppearance?: number
  ): number {
    if(!source || !GameState.module) return GameObjectConstant.OBJECT_INVALID;
    const area = source.area;
    if(!area) return GameObjectConstant.OBJECT_INVALID;

    let bagRule = rule || GameState.SWRuleSet?.bodyBags?.[bodyBagRowId];
    if(!bagRule){
      bagRule = new SWBodyBag();
      bagRule.id = bodyBagRowId;
      bagRule.appearance = 3;
      bagRule.name = 38151;
      bagRule.corpse = 0;
    }
    // GetBodyBagAppearance: **** / missing → backpack placeable (3)
    const appearanceId = (placeableAppearance != null && placeableAppearance > 0)
      ? placeableAppearance
      : (bagRule.appearance > 0 ? bagRule.appearance : 3);
    if(bagRule.appearance !== appearanceId){
      bagRule = Object.assign(new SWBodyBag(), bagRule, { appearance: appearanceId });
    }

    const placeable = Placeable.FromBodyBag(bagRule, bodyBagRowId);
    placeable.position.copy(source.position);
    placeable.rotation.copy(source.rotation);
    placeable.bearing = source.getFacing?.() ?? source.rotation.z;
    if(isCreature(source)){
      placeable.sourceCreatureId = source.id;
    }
    // Visible by default; KeepCorpse shells hide ordinary bags after spawn
    placeable.isBodyBagVisible = true;
    GameState.GameObjectManager.RegisterObject(placeable);
    placeable.acquireItemsFromObject(source, true);

    // : corpse bags with no items clear useable; keep has_inventory = !corpse
    if(bagRule.corpse){
      placeable.useable = placeable.inventory.length > 0;
    }

    if(!placeable.inventory.length && !bagRule.corpse){
      GameState.GameObjectManager.RemoveObject(placeable);
      return GameObjectConstant.OBJECT_INVALID;
    }

    // Attach to area immediately so save/reload always has the authoritative bag
    area.attachObject(placeable);

    const future = GameState.module.timeManager.getFutureTimeFromSeconds(0.5);
    const event = new GameState.GameEventFactory.EventSpawnBodyBag();
    event.bodyBagId = placeable.id;
    event.position.copy(placeable.position);
    event.setCaller(source);
    event.setObject(area as any);
    event.setDay(future.pauseDay);
    event.setTime(future.pauseTime);
    GameState.module.addEvent(event);

    return placeable.id;
  }

  /**
   * Transfer droppable inventory/equipment (and gold) from a creature or placeable.
   */
  acquireItemsFromObject(source: GameObject, droppableOnly: boolean = true){
    if(!source) return 0;
    let transferred = 0;

    if(isCreature(source)){
      const creature = source as Creature;
      const slots = Object.keys(creature.equipment) as (keyof typeof creature.equipment)[];
      for(let i = 0; i < slots.length; i++){
        const key = slots[i];
        const item = creature.equipment[key] as Item;
        if(!item) continue;
        if(droppableOnly && !item.isDropable()) continue;
        try{ item.onUnEquip?.(creature); }catch(e){}
        try{
          item.model?.parent?.remove(item.model);
        }catch(e){}
        (creature.equipment as any)[key] = undefined;
        this.addItem(item);
        transferred++;
      }
    }

    const inv = source.inventory ? source.inventory.slice() : [];
    for(let i = 0; i < inv.length; i++){
      const item = inv[i] as Item;
      if(!item) continue;
      if(droppableOnly && !item.isDropable()) continue;
      const idx = source.inventory.indexOf(item);
      if(idx >= 0) source.inventory.splice(idx, 1);
      this.addItem(item);
      transferred++;
    }

    const gold = typeof (source as any).gold === 'number' ? (source as any).gold : 0;
    if(gold > 0){
      const credits = Item.FromResRef('g_i_credits001');
      if(credits){
        credits.setStackSize(gold);
        this.addItem(credits);
        (source as any).gold = 0;
        transferred++;
      }
    }

    return transferred;
  }

  /**
   * Attach this placeable into the given area and load its model / walkmesh.
   * Matches Area.loadPlaceables — add `container` (not bare model) so
   * the model stays parented with the correct world transform.
   */
  /**
   * Attach/load model into the area. Idempotent — safe after immediate attachObject
   * and on EventSpawnBodyBag / reload.
   */
  async placeInArea(area: Area){
    if(!area || this.destroyed) return;
    area.attachObject(this);
    GameState.GameObjectManager.RegisterObject(this);

    // After reload there is never a KeepCorpse shell — show the bag
    if(this.isBodyBag && !this.isBodyBagVisible){
      const hasShell = area.corpseCache?.hasSourceCreatureId(this.sourceCreatureId);
      if(!hasShell){
        this.isBodyBagVisible = true;
      }
    }

    // Ensure appearance resolved (bodybag **** → backpack fallback already applied)
    if(!this.placeableAppearance){
      try{
        this.placeableAppearance = GameState.AppearanceManager.GetPlaceableAppearanceById(
          this.appearance || 3
        );
      }catch(e){
        console.error('Body bag appearance resolve failed', this.appearance, e);
        return;
      }
    }
    if(!this.placeableAppearance?.modelname){
      console.error('Body bag missing placeable appearance', this.appearance);
      return;
    }

    // Already loaded into the scene
    if(this.model && this.container.parent === GameState.group.placeables){
      this.setBodyBagVisible(this.isBodyBagVisible);
      return;
    }

    const model = await this.loadModel();
    if(!model || this.destroyed){
      if(!model) console.error('Body bag loadModel failed', this.appearance, this.tag);
      return;
    }

    model.userData.gameObject = this;
    model.hasCollision = true;
    model.userData.tag = this.getTag();
    // /area load path: container carries world transform (position === container.position)
    if(this.container.parent !== GameState.group.placeables){
      GameState.group.placeables.add(this.container);
    }
    this.setBodyBagVisible(this.isBodyBagVisible);

    try{
      const pwk = await this.loadWalkmesh(model.name);
      if(pwk?.mesh instanceof THREE.Object3D){
        model.add(pwk.mesh);
      }
      model.userData.walkmesh = pwk;
      if(pwk?.mesh) GameState.walkmeshList.push(pwk.mesh);
    }catch(e){}

    this.getCurrentRoom();
    this.markCollisionBoundsDirty('placement');
    this.computeBoundingBox?.();
    this.room?.markCollisionPlaceablesDirty?.();
    this.onSpawn(false);
  }
}
