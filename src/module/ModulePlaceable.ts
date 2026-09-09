import type { ModuleRoom } from "@/module/ModuleRoom";
import { AudioEmitter } from "@/audio/AudioEmitter";
import { BinaryReader } from "@/utility/binary/BinaryReader";
import { ModulePlaceableAnimState } from "@/enums/module/ModulePlaceableAnimState";
import { ModulePlaceableState } from "@/enums/module/ModulePlaceableState";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import { SSFType } from "@/enums/resource/SSFType";
import type { SWAnimation } from "@/engine/rules/SWAnimation";
import { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { OdysseyModel, OdysseyWalkMesh } from "@/odyssey";
import { CExoLocString } from "@/resource/CExoLocString";
import { DLGObject } from "@/resource/DLGObject";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "@/loaders";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { OdysseyModel3D } from "@/three/odyssey";
import { SWPlaceableAppearance } from "@/engine/rules/SWPlaceableAppearance";
// import { TwoDAManager, InventoryManager, AppearanceManager, MenuManager, ModuleObjectManager, FactionManager } from "@/managers";
import { AudioEngine } from "@/audio/AudioEngine";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { GameEffectFactory } from "@/effects/GameEffectFactory";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { ModuleObject } from "@/module/ModuleObject";
import { ModuleItem } from "@/module/ModuleItem";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { PlaceableLightmapBaker } from "@/managers/PlaceableLightmapBaker";
import { DLGConversationType } from "@/enums/dialog/DLGConversationType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { ModulePlaceableObjectSound } from "@/enums/module/ModulePlaceableObjectSound";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { SWBodyBag } from "@/engine/rules/SWBodyBag";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import * as THREE from "three";

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
* ModulePlaceable class.
*
* Class representing placeable objects found in modules areas.
*
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*
* @file ModulePlaceable.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModulePlaceable extends ModuleObject {
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

  lastObjectOpened: ModuleObject;
  lastObjectClosed: ModuleObject;

  animStateInfo: AnimStateInfo = {
    lastAnimState: ModulePlaceableAnimState.DEFAULT,
    currentAnimState: ModulePlaceableAnimState.DEFAULT,
    loop: false,
    started: false
  };
  placeableAppearance: SWPlaceableAppearance;

  constructor ( gff = new GFFObject()) {
    super(gff);
    this.objectType |= ModuleObjectType.ModulePlaceable;
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

  onClick(callee: ModuleObject){
    GameState.getCurrentPlayer().actionUseObject( this );
  }

  /**
   * EventHandler script case 7 (OnDialog).
   * Empty or "default" OnDialog → k_hen_dialogue01.
   */
  onDialog(oSpeaker: ModuleObject, listenPatternNumber = -1, conversation: DLGObject = undefined, matchedSubstrings: string[] = []): boolean {
    this.setMatchedSubstrings(matchedSubstrings || []);

    let nwscript = this.scripts[ModuleObjectScript.PlaceableOnDialog];
    const resRef = nwscript?.name || '';
    if(!nwscript || !resRef || resRef.toLowerCase() === 'default'){
      const fallback = GameState.NWScript.Load('k_hen_dialogue01');
      if(fallback){
        this.scripts[ModuleObjectScript.PlaceableOnDialog] = fallback;
        fallback.bindOwner(this, ModuleObjectScript.PlaceableOnDialog);
        nwscript = fallback;
      }
    }
    if(!nwscript){ return false; }
    const instance = nwscript.newInstance();
    instance.listenPatternNumber = listenPatternNumber;
    instance.listenPatternSpeaker = oSpeaker;
    instance.conversation = conversation;
    instance.run(this, 0);
    return true;
  }

  detachFromRoom(room: ModuleRoom): void {
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

    if(this.collisionManager.walkmesh && this.container){
      if(!this.isStatic() || this.collisionMatrixDirty){
        this.container.updateMatrix();
        this.container.updateMatrixWorld(!this.isStatic());
        this.collisionManager.walkmesh.matrixWorld.copy(this.container.matrixWorld);
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
    if(this.template.RootNode.hasField('X')){
      return this.template.RootNode.getFieldByLabel('X').getValue();
    }
    return 0;
  }

  getY(){
    if(this.template.RootNode.hasField('Y')){
      return this.template.RootNode.getFieldByLabel('Y').getValue();
    }
    return 0;
  }

  getZ(){
    if(this.template.RootNode.hasField('Z')){
      return this.template.RootNode.getFieldByLabel('Z').getValue();
    }
    return 0;
  }

  getBearing(){
    if(this.template.RootNode.hasField('Bearing')){
      return this.template.RootNode.getFieldByLabel('Bearing').getValue();
    }
    return 0;
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

  getItemList(){
    if(this.template.RootNode.hasField('ItemList')){
      return this.template.RootNode.getFieldByLabel('ItemList').getChildStructs();
    }
    return [];
  }

  getItemByTag(sTag = ''): ModuleItem {
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
    const instance = this.scripts[ModuleObjectScript.PlaceableOnInvDisturbed];
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

        this.scripts[ModuleObjectScript.PlaceableOnOpen]?.run(this)
        // Settle pose: deferred static-chart rebake (animated parts stay nearest-lit).
        PlaceableLightmapBaker.noteActivity(this);
        PlaceableLightmapBaker.invalidate(this);
      break;
      case ModulePlaceableEvent.CLOSE_START:
        this.setOpenState(ModulePlaceableState.CLOSED);
        this.playObjectSound(ModulePlaceableObjectSound.CLOSED);
      break;
      case ModulePlaceableEvent.CLOSE_END:
        this.scripts[ModuleObjectScript.PlaceableOnClosed]?.run(this)
        PlaceableLightmapBaker.noteActivity(this);
        PlaceableLightmapBaker.invalidate(this);
      break;
    }
  }

  use(object: ModuleObject){

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

    const instance = this.scripts[ModuleObjectScript.PlaceableOnUsed];
    if(!instance){ return; }
    instance.run(this);
  }

  attemptUnlockWithKey(object: ModuleObject){
    if(this.keyRequired){
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
  }

  lock(object: ModuleObject){
    if(this.locked){ return; }
    this.locked = true;
    this.lastLockedBy = object;

    const instance = this.scripts[ModuleObjectScript.PlaceableOnLock];
    if(!instance){ return; }
    instance.run(this);
  }

  unlock(object: ModuleObject){
    if(!this.locked){ return; }
    this.locked = false;
    this.lastUnlockedBy = object;

    const instance = this.scripts[ModuleObjectScript.PlaceableOnUnlock];
    if(!instance){ return; }
    instance.run(this);
  }

  attemptUnlock(object: ModuleObject){
    if(!BitWise.InstanceOf(object?.objectType, ModuleObjectType.ModuleCreature)){
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

  close(object: ModuleObject){
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
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        this.loadInventory();
        this.loadScripts();
      }else{
        console.error('Failed to load ModulePlaceable template');
        if(this.template instanceof GFFObject){
          this.initProperties();
          this.loadInventory();
          this.loadScripts();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
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
        //receiveShadow: true,
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
      this.model.userData.moduleObject = this;
      this.model.name = modelName;

      this.container.add(this.model);
      this.markCollisionBoundsDirty('model');

      this.model.disableMatrixUpdate();
      const shadowSize = this.getAppearance()?.shadowsize ?? 1;
      void this.applyShadowBlob(ModuleObject.shadowBlobResRefFromPlaceableShadowSize(shadowSize));

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
      ModuleObjectScript.PlaceableOnClosed,
      ModuleObjectScript.PlaceableOnDamaged,
      ModuleObjectScript.PlaceableOnDeath,
      ModuleObjectScript.PlaceableOnDialog,
      ModuleObjectScript.PlaceableOnDisarm,
      ModuleObjectScript.PlaceableOnEndDialogue,
      ModuleObjectScript.PlaceableOnHeartbeat,
      ModuleObjectScript.PlaceableOnInvDisturbed,
      ModuleObjectScript.PlaceableOnLock,
      ModuleObjectScript.PlaceableOnMeleeAttacked,
      ModuleObjectScript.PlaceableOnOpen,
      ModuleObjectScript.PlaceableOnSpellCastAt,
      ModuleObjectScript.PlaceableOnTrapTriggered,
      ModuleObjectScript.PlaceableOnUnlock,
      ModuleObjectScript.PlaceableOnUsed,
      ModuleObjectScript.PlaceableOnUserDefined,
    ];

    const scriptsNode = this.template?.RootNode;
    if(!scriptsNode){ return; }

    for(const scriptKey of scriptKeys){
      if(scriptsNode.hasField(scriptKey)){
        const resRef = scriptsNode.getFieldByLabel(scriptKey).getValue();
        if(!resRef){ continue; }
        const nwscript = GameState.NWScript.Load(resRef);
        if(!nwscript){
          console.warn(`ModulePlaceable.loadScripts: Failed to load script [${scriptKey}]:${resRef} for object ${this.name}`);
          continue;
        }
        nwscript.bindOwner(this, scriptKey);
        this.scripts[scriptKey] = nwscript;
      }
    }
  }

  loadInventory(){
    let inventory = this.getItemList();
    for(let i = 0; i < inventory.length; i++){
      this.loadItem( GFFObject.FromStruct( inventory[i] ) );
    }
  }

  loadItem( template: GFFObject){
    let item = new GameState.Module.ModuleArea.ModuleItem(template);
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

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes['pwk'], resRef);
      const walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
      walkmesh.name = resRef;
      walkmesh.moduleObject = this;
      this.collisionManager.setWalkmesh(walkmesh);
      this.model.add(walkmesh.mesh);
      if(this.isStatic() && walkmesh.mesh){
        walkmesh.mesh.matrixAutoUpdate = false;
        walkmesh.mesh.updateMatrix();
        walkmesh.mesh.updateMatrixWorld(true);
      }
      this.markCollisionBoundsDirty('walkmesh');

      return walkmesh;
    }catch(e){
      // Many placeables (incl. body bags) have no.pwk — empty mesh is fine
      const walkmesh = new OdysseyWalkMesh();
      walkmesh.name = resRef;
      walkmesh.moduleObject = this;
      this.collisionManager.setWalkmesh(walkmesh);
      this.markCollisionBoundsDirty('walkmesh');

      return this.collisionManager.walkmesh;
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

    if(this.template.RootNode.hasField('LocName'))
      this.name = this.template.getFieldByLabel('LocName').getCExoLocString().getValue()

    if(this.template.RootNode.hasField('Animation')){
      this.setAnimationState(this.template.getFieldByLabel('Animation').getValue());
    }

    if(this.template.RootNode.hasField('AnimationState')){
      const animState = this.template.getFieldByLabel('AnimationState').getValue();
      switch(animState){
        case 1:
          this.setAnimationState(ModulePlaceableAnimState.OPEN);
        break;
        case 2:
          this.setAnimationState(ModulePlaceableAnimState.CLOSE);
          this.setOpenState(ModulePlaceableState.CLOSED);
        break;
        case 3:
          this.setAnimationState(ModulePlaceableAnimState.DEAD);
        break;
        case 4:
          this.setAnimationState(ModulePlaceableAnimState.ACTIVATE);
        break;
        case 5:
          this.setAnimationState(ModulePlaceableAnimState.DEACTIVATE);
        break;
        default:
          this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
        break;
      }
    }

    if(this.template.RootNode.hasField('Appearance')){
      this.appearance = this.template.getFieldByLabel('Appearance').getValue();
      try{
        this.placeableAppearance = GameState.AppearanceManager.GetPlaceableAppearanceById(this.appearance);
      }catch(e){
        console.error(e);
      }
    }

    if(this.template.RootNode.hasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.getFieldByLabel('AutoRemoveKey').getValue();

    if(this.template.RootNode.hasField('BodyBag'))
      this.bodyBag = this.template.getFieldByLabel('BodyBag').getValue();

    if(this.template.RootNode.hasField('CloseLockDC'))
      this.closeLockDC = this.template.getFieldByLabel('CloseLockDC').getValue();

    if(this.template.RootNode.hasField('Conversation')){
      this.conversation = DLGObject.FromResRef(this.template.getFieldByLabel('Conversation').getValue());
    }

    if(this.template.RootNode.hasField('Commandable'))
      this.commandable = !!this.template.getFieldByLabel('Commandable').getValue();

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

    if(this.template.RootNode.hasField('HP'))
      this.hp = this.template.RootNode.getFieldByLabel('HP').getValue();

    // If CurrentHP was absent, start at max HP so bash is not immediately dead.
    if(!this.template.RootNode.hasField('CurrentHP'))
      this.currentHP = this.hp;

    if(this.template.RootNode.hasField('Hardness'))
      this.hardness = this.template.RootNode.getFieldByLabel('Hardness').getValue();

    if(this.template.RootNode.hasField('HasInventory'))
      this.hasInventory = this.template.RootNode.getFieldByLabel('HasInventory').getValue();

    if(this.template.RootNode.hasField('IsBodyBag'))
      this.isBodyBag = !!this.template.RootNode.getFieldByLabel('IsBodyBag').getValue();

    if(this.template.RootNode.hasField('IsBodyBagVisible'))
      this.isBodyBagVisible = !!this.template.RootNode.getFieldByLabel('IsBodyBagVisible').getValue();

    if(this.template.RootNode.hasField('DieWhenEmpty'))
      this.dieWhenEmpty = !!this.template.RootNode.getFieldByLabel('DieWhenEmpty').getValue();

    if(this.template.RootNode.hasField('IsCorpse'))
      this.isCorpse = !!this.template.RootNode.getFieldByLabel('IsCorpse').getValue();

    if(this.template.RootNode.hasField('GroundPile'))
      this.groundPile = !!this.template.RootNode.getFieldByLabel('GroundPile').getValue();

    if(this.template.RootNode.hasField('IsDestroyable'))
      this.isDestroyable = !!this.template.RootNode.getFieldByLabel('IsDestroyable').getValue();

    if(this.template.RootNode.hasField('Interruptable'))
      this.interruptable = this.template.RootNode.getFieldByLabel('Interruptable').getValue();

    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.RootNode.getFieldByLabel('KeyName').getValue();

    if(this.template.RootNode.hasField('KeyRequired'))
      this.keyRequired = this.template.RootNode.getFieldByLabel('KeyRequired').getValue();

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

    if(this.template.RootNode.hasField('PaletteID'))
      this.paletteID = this.template.getFieldByLabel('PaletteID').getValue();

    // LoadPlaceable: Invulnerable aliases Plot; missing Static → !Useable;
    // Static forces plot = 1.
    if(this.template.RootNode.hasField('Invulnerable')){
      this.plot = !!this.template.getFieldByLabel('Invulnerable').getValue();
    }else if(this.template.RootNode.hasField('Plot')){
      this.plot = !!this.template.getFieldByLabel('Plot').getValue();
    }

    if(this.template.RootNode.hasField('PartyInteract'))
      this.partyInteract = this.template.getFieldByLabel('PartyInteract').getValue();

    if(this.template.RootNode.hasField('PortraitId')){
      this.portraitId = this.template.getFieldByLabel('PortraitId').getValue();
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }else if(this.template.RootNode.hasField('PortraidId')){
      // Legacy typo in some templates
      this.portraitId = this.template.getFieldByLabel('PortraidId').getValue();
      this.portrait = GameState.SWRuleSet.portraits[this.portraitId];
    }

    if(this.template.RootNode.hasField('Ref'))
      this.ref = this.template.getFieldByLabel('Ref').getValue();

    if(this.template.RootNode.hasField('Useable'))
      this.useable = this.template.getFieldByLabel('Useable').getValue();

    if(this.template.RootNode.hasField('Static')){
      this.static = !!this.template.getFieldByLabel('Static').getValue();
    }else{
      this.static = !this.useable;
    }
    if(this.static){
      this.plot = true;
    }

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
      this.position.x = this.template.RootNode.getFieldByLabel('X').getValue();

    if(this.template.RootNode.hasField('Y'))
      this.position.y = this.template.RootNode.getFieldByLabel('Y').getValue();

    if(this.template.RootNode.hasField('Z'))
      this.position.z = this.template.RootNode.getFieldByLabel('Z').getValue();

    if(this.template.RootNode.hasField('Bearing'))
      this.bearing = this.template.RootNode.getFieldByLabel('Bearing').getValue();

    if(this.template.RootNode.hasField('TweakColor'))
      this.tweakColor = this.template.getFieldByLabel('TweakColor').getValue();

    if(this.template.RootNode.hasField('UseTweakColor'))
      this.useTweakColor = this.template.getFieldByLabel('UseTweakColor').getValue();

    if(this.template.RootNode.hasField('NotBlastable'))
      this.notBlastable = !!this.template.getFieldByLabel('NotBlastable').getValue();

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
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }

    // LoadPlaceable: closed placeables settle on CLOSE (10076) rather than DEFAULT
    if(this.animState === ModulePlaceableAnimState.DEFAULT && !this.isOpen()){
      this.setAnimationState(ModulePlaceableAnimState.CLOSE);
    }

    // PostProcess — hardness applies a permanent
    // DamageResistance effect (subtype |= 2, int0 = 0x3FFF, int1 = hardness, is_exposed = 0).
    if((this.hardness | 0) > 0 && !this.effects.some(e => e.type === GameEffectType.EffectDamageResistance)){
      const eDamageResist = new GameEffectFactory.EffectDamageResistance();
      // PostProcess: subtype & 0xfff8 | 2 (PERMANENT only — not MAGICAL|PERMANENT = 10)
      eDamageResist.setSubTypeUnMasked(GameEffectDurationType.PERMANENT);
      // ApplyEffect with = 1 during PostProcess → SkipOnLoad = 1
      eDamageResist.setSkipOnLoad(true);
      eDamageResist.setInt(0, 0x3FFF);
      eDamageResist.setInt(1, this.hardness | 0);
      eDamageResist.setIsExposed(false);
      this.addEffect(eDamageResist);
    }

    this.loadActionList();

    if(needsRegister){
      GameState.ModuleObjectManager.RegisterObject(this);
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
      const source = GameState.ModuleObjectManager.GetObjectById(this.sourceCreatureId);
      if(BitWise.InstanceOfObject(source, ModuleObjectType.ModuleCreature)){
        const creature = source as ModuleCreature;
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
    if(this.isBodyBag) return ModuleObjectConstant.OBJECT_INVALID;
    if(!this.isDestroyable) return ModuleObjectConstant.OBJECT_INVALID;
    if(!this.inventory.length) return ModuleObjectConstant.OBJECT_INVALID;
    return ModulePlaceable.spawnBodyBagFrom(this, this.bodyBag || 0);
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTP ';
    // Placeable List element struct type
    gff.RootNode.type = 9;

    const actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Animation') ).setValue(this.animState);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Appearance') ).setValue(this.appearance);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).setValue(this.autoRemoveKey);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Bearing') ).setValue(this.bearing);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(this.bodyBag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') ).setValue(this.closeLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(this.commandable ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') ).setValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHP') ).setValue(this.currentHP);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(
      this.description instanceof CExoLocString ? this.description : new CExoLocString()
    );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DieWhenEmpty') ).setValue( this.dieWhenEmpty ? 1 : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DisarmDC') ).setValue(this.disarmDC);

    //Effects
    const effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue(this.faction ? this.faction.id : this.factionId);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Fort') ).setValue(this.fort);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GroundPile') ).setValue(this.groundPile ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HP') ).setValue(this.hp);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Hardness') ).setValue(this.hardness);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'HasInventory') ).setValue(this.hasInventory ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsBodyBag') ).setValue(this.isBodyBag ? 1 : 0);
    // Shells are never saved — persist visible so reload shows the bag
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsBodyBagVisible') ).setValue(this.isBodyBagVisible ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsCorpse') ).setValue(this.isCorpse ? 1 : 0);

    // SavePlaceable: ItemList only when inventory non-empty
    if(this.inventory.length){
      const itemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ItemList') );
      for(let i = 0; i < this.inventory.length; i++){
        const invItem = this.inventory[i];
        const itemStruct = invItem.save();
        // SavePlaceable writes ObjectId before SaveItem
        itemStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(invItem.id >>> 0);
        itemList.addChildStruct(itemStruct);
      }
    }

    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).setValue(this.keyName);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'KeyRequired') ).setValue(this.keyRequired);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'LightState') ).setValue(this.lightState ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).setValue(this.locName);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Lockable') ).setValue(this.lockable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Locked') ).setValue(this.locked);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).setValue(this.min1HP);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);

    //Scripts — SavePlaceable field order includes OnDialog
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnClosed) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnClosed]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnDamaged) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnDamaged]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnDeath) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnDeath]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnDisarm) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnDisarm]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnHeartbeat) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnHeartbeat]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnInvDisturbed) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnInvDisturbed]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnLock) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnLock]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnMeleeAttacked) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnMeleeAttacked]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnOpen) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnOpen]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnSpellCastAt) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnSpellCastAt]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnUnlock) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnUnlock]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnUsed) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnUsed]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnUserDefined) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnUserDefined]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnDialog) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnDialog]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnEndDialogue) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnEndDialogue]?.name || '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, ModuleObjectScript.PlaceableOnTrapTriggered) ).setValue(this.scripts[ModuleObjectScript.PlaceableOnTrapTriggered]?.name || '');

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Open') ).setValue(this.isOpen() ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') ).setValue(this.openLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).setValue(this.partyInteract);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot);
    // SavePlaceable: PortraitId if id != -1, else Portrait RESREF
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

    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Static') ).setValue(this.static);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') ).setValue(this.trapDetectDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).setValue(this.trapDetectable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).setValue(this.trapDisarmable);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapFlag') ).setValue(this.trapFlag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).setValue(this.trapOneShot);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'TrapType') ).setValue(this.trapType);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Useable') ).setValue(this.useable);
    this.writeNamedVarTable(gff.RootNode);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Will') ).setValue(this.will);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  animationConstantToAnimation( animation_constant = 10000 ): SWAnimation {
    switch( animation_constant ){
      case ModulePlaceableAnimState.DEFAULT:        //10000, //304 -
        return GameState.SWRuleSet.animationIdMap.get(304);
      case ModulePlaceableAnimState.DAMAGE:         //10014, //305 - damage
        return GameState.SWRuleSet.animationIdMap.get(305);
      case ModulePlaceableAnimState.DEAD: 	        //10072, //307
        return GameState.SWRuleSet.animationIdMap.get(307);
      case ModulePlaceableAnimState.ACTIVATE: 	    //10073, //308 - NWSCRIPT Constant: 200
        return GameState.SWRuleSet.animationIdMap.get(308);
      case ModulePlaceableAnimState.DEACTIVATE:     //10074, //309 - NWSCRIPT Constant: 201
        return GameState.SWRuleSet.animationIdMap.get(309);
      case ModulePlaceableAnimState.OPEN: 			    //10075, //310 - NWSCRIPT Constant: 202
        return GameState.SWRuleSet.animationIdMap.get(310);
      case ModulePlaceableAnimState.CLOSE:          //10076, //311 - NWSCRIPT Constant: 203
        return GameState.SWRuleSet.animationIdMap.get(311);
      case ModulePlaceableAnimState.CLOSE_OPEN: 	  //10077, //312
        return GameState.SWRuleSet.animationIdMap.get(312);
      case ModulePlaceableAnimState.OPEN_CLOSE:     //10078, //313
        return GameState.SWRuleSet.animationIdMap.get(313);
      case ModulePlaceableAnimState.ANIMLOOP01:     //10106, //316 - NWSCRIPT Constant: 204
        return GameState.SWRuleSet.animationIdMap.get(316);
      case ModulePlaceableAnimState.ANIMLOOP02:     //10107, //317 - NWSCRIPT Constant: 205
        return GameState.SWRuleSet.animationIdMap.get(317);
      case ModulePlaceableAnimState.ANIMLOOP03:     //10108, //318 - NWSCRIPT Constant: 206
        return GameState.SWRuleSet.animationIdMap.get(318);
      case ModulePlaceableAnimState.ANIMLOOP04:     //10110, //319 - NWSCRIPT Constant: 207
        return GameState.SWRuleSet.animationIdMap.get(319);
      case ModulePlaceableAnimState.ANIMLOOP05:     //10111, //320 - NWSCRIPT Constant: 208
        return GameState.SWRuleSet.animationIdMap.get(320);
      case ModulePlaceableAnimState.ANIMLOOP06:     //10112, //321 - NWSCRIPT Constant: 209
        return GameState.SWRuleSet.animationIdMap.get(321);
      case ModulePlaceableAnimState.ANIMLOOP07:     //10113, //322 - NWSCRIPT Constant: 210
        return GameState.SWRuleSet.animationIdMap.get(322);
      case ModulePlaceableAnimState.ANIMLOOP08:     //10114, //323 - NWSCRIPT Constant: 211
        return GameState.SWRuleSet.animationIdMap.get(323);
      case ModulePlaceableAnimState.ANIMLOOP09:     //10115, //324 - NWSCRIPT Constant: 212
        return GameState.SWRuleSet.animationIdMap.get(324);
      case ModulePlaceableAnimState.ANIMLOOP10:     //10116, //325 - NWSCRIPT Constant: 213
        return GameState.SWRuleSet.animationIdMap.get(325);
    }

    return super.animationConstantToAnimation( animation_constant );
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
    const placeable = new ModulePlaceable();
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
    source: ModuleObject,
    bodyBagRowId: number = 0,
    rule?: SWBodyBag,
    placeableAppearance?: number
  ): number {
    if(!source || !GameState.module) return ModuleObjectConstant.OBJECT_INVALID;
    const area = source.area || GameState.module.area;
    if(!area) return ModuleObjectConstant.OBJECT_INVALID;

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

    const placeable = ModulePlaceable.FromBodyBag(bagRule, bodyBagRowId);
    placeable.position.copy(source.position);
    placeable.rotation.copy(source.rotation);
    placeable.bearing = source.getFacing?.() ?? source.rotation.z;
    if(BitWise.InstanceOfObject(source, ModuleObjectType.ModuleCreature)){
      placeable.sourceCreatureId = source.id;
    }
    // Visible by default; KeepCorpse shells hide ordinary bags after spawn
    placeable.isBodyBagVisible = true;
    GameState.ModuleObjectManager.RegisterObject(placeable);
    placeable.acquireItemsFromObject(source, true);

    // : corpse bags with no items clear useable; keep has_inventory = !corpse
    if(bagRule.corpse){
      placeable.useable = placeable.inventory.length > 0;
    }

    if(!placeable.inventory.length && !bagRule.corpse){
      GameState.ModuleObjectManager.RemoveObject(placeable);
      return ModuleObjectConstant.OBJECT_INVALID;
    }

    // Attach to area immediately so save/reload always has the authoritative bag
    placeable.area = area;
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
  acquireItemsFromObject(source: ModuleObject, droppableOnly: boolean = true){
    if(!source) return 0;
    let transferred = 0;

    if(BitWise.InstanceOfObject(source, ModuleObjectType.ModuleCreature)){
      const creature = source as ModuleCreature;
      const slots = Object.keys(creature.equipment) as (keyof typeof creature.equipment)[];
      for(let i = 0; i < slots.length; i++){
        const key = slots[i];
        const item = creature.equipment[key] as ModuleItem;
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
      const item = inv[i] as ModuleItem;
      if(!item) continue;
      if(droppableOnly && !item.isDropable()) continue;
      const idx = source.inventory.indexOf(item);
      if(idx >= 0) source.inventory.splice(idx, 1);
      this.addItem(item);
      transferred++;
    }

    const gold = typeof (source as any).gold === 'number' ? (source as any).gold : 0;
    if(gold > 0){
      const credits = ModuleItem.FromResRef('g_i_credits001');
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
   * Matches ModuleArea.loadPlaceables — add `container` (not bare model) so
   * the model stays parented with the correct world transform.
   */
  /**
   * Attach/load model into the area. Idempotent — safe after immediate attachObject
   * and on EventSpawnBodyBag / reload.
   */
  async placeInArea(area: ModuleArea){
    if(!area || this.destroyed) return;
    this.area = area;
    area.attachObject(this);
    GameState.ModuleObjectManager.RegisterObject(this);

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

    model.userData.moduleObject = this;
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
