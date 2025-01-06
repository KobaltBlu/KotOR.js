import type { ModuleRoom } from "./ModuleRoom";
import { AudioEmitter } from "../audio/AudioEmitter";
import { BinaryReader } from "../BinaryReader";
import { ModulePlaceableAnimState } from "../enums/module/ModulePlaceableAnimState";
import { ModulePlaceableState } from "../enums/module/ModulePlaceableState";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { SSFType } from "../enums/resource/SSFType";
import { ITwoDAAnimation } from "../interface/twoDA/ITwoDAAnimation";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { OdysseyModel, OdysseyWalkMesh } from "../odyssey";
import { CExoLocString } from "../resource/CExoLocString";
import { DLGObject } from "../resource/DLGObject";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { OdysseyModel3D } from "../three/odyssey";
import { PlaceableAppearance } from "../engine/PlaceableAppearance";
// import { TwoDAManager, InventoryManager, AppearanceManager, MenuManager, ModuleObjectManager, FactionManager } from "../managers";
import { AudioEngine } from "../audio/AudioEngine";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { BitWise } from "../utility/BitWise";
import { GameEffectFactory } from "../effects/GameEffectFactory";
import { ModuleObject } from "./ModuleObject";
import type { ModuleItem } from "./ModuleItem";
import { DLGConversationType } from "../enums/dialog/DLGConversationType";
import { SkillType } from "../enums/nwscript/SkillType";
import { ModulePlaceableObjectSound } from "../enums/module/ModulePlaceableObjectSound";

interface AnimStateInfo {
  lastAnimState: ModulePlaceableAnimState;
  currentAnimState: ModulePlaceableAnimState;
  loop: boolean;
  started: boolean;
};

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
  portraitId: number;
  ref: number;
  static: boolean;
  will: number;
  x: number;
  y: number;
  z: number;
  defaultAnimPlayed: boolean;
  useable: any;
  isBodyBag: any;
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
  placeableAppearance: PlaceableAppearance;

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
    this.portraitId = 0;
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
      this.audioEmitter.maxDistance = 50;
      this.audioEmitter.load();
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  onClick(callee: ModuleObject){
    GameState.getCurrentPlayer().actionUseObject( this );
  }

  detachFromRoom(room: ModuleRoom): void {
    if(!room) return;
    const index = room.placeables.indexOf(this);
    if(index >= 0){
      room.placeables.splice(index, 1);
    }
  }

  update(delta = 0){
    
    super.update(delta);

    if(this.collisionData.walkmesh && this.model){
      this.collisionData.walkmesh.matrixWorld.copy(this.model.matrix);
    }

    if(this.model instanceof OdysseyModel3D){
      if(this.room){
        if(this.room.model instanceof OdysseyModel3D){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }

      if(this.model.visible)
        this.model.update(delta);

      this.audioEmitter.setPosition(this.position.x, this.position.y, this.position.z);
    }

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    // if(this.animState == ModulePlaceableAnimState.DEFAULT){
    //   if(this.isOpen()){
    //     this.setAnimationState(ModulePlaceableAnimState.OPEN);
    //   }else{
    //     this.setAnimationState(ModulePlaceableAnimState.CLOSE);
    //   }
    // }

    if(this.locked && this.getHP() <= 0){
      this.locked = false;
      this.setAnimationState(ModulePlaceableAnimState.CLOSE_OPEN);
    }

    if(!(this.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.model.getAnimationName();
    if(!this.animStateInfo.currentAnimState) this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
    if(this.animStateInfo.currentAnimState){
      let animation = this.animationConstantToAnimation(this.animStateInfo.currentAnimState);
      if(animation){
        if(currentAnimation != animation.name?.toLowerCase()){
          if(!this.animStateInfo.started){
            this.animStateInfo.started = true;
            const aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
            this.getModel().playAnimation(animation.name?.toLowerCase(), aLooping);
          }else{
            //Animation completed
            switch(this.animStateInfo.currentAnimState){
              case ModulePlaceableAnimState.OPEN_CLOSE:
                this.setAnimationState(ModulePlaceableAnimState.DEFAULT);
              break;
              case ModulePlaceableAnimState.CLOSE_OPEN:
                this.setAnimationState(ModulePlaceableAnimState.OPEN);
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
    if(this.state == ModulePlaceableState.OPEN) this.openState = true;
    else this.openState = false
  }

  getOnClosed(){
    if(this.template.RootNode.hasField('OnClosed')){
      return this.template.RootNode.getFieldByLabel('OnClosed').getValue();
    }
    return 0;
  }

  getOnDamaged(){
    if(this.template.RootNode.hasField('OnDamaged')){
      return this.template.RootNode.getFieldByLabel('OnDamaged').getValue();
    }
    return 0;
  }
  
  getOnDeath(){
    if(this.template.RootNode.hasField('OnDeath')){
      return this.template.RootNode.getFieldByLabel('OnDeath').getValue();
    }
    return 0;
  }
  
  getOnDialog(){
    if(this.template.RootNode.hasField('OnDialog')){
      return this.template.RootNode.getFieldByLabel('OnDialog').getValue();
    }
    return 0;
  }

  getOnUsed(){
    if(this.template.RootNode.hasField('OnUsed')){
      return this.template.RootNode.getFieldByLabel('OnUsed').getValue();
    }
    return 0;
  }

  isStatic(){
    return this.static;
  }

  isUseable(){
    return this.useable;
  }

  isOpen(){
    return this.openState;
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

  getAppearance(): PlaceableAppearance {
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
      GameState.InventoryManager.addItem(this.inventory.pop())
    }

    if(this.scripts.onInvDisturbed instanceof NWScriptInstance){
      this.scripts.onInvDisturbed.run(GameState.PartyManager.party[0]);
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
    if(this.model) this.model.stopAnimation();
  }

  use(object: ModuleObject){

    this.lastUsedBy = object;

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

    if(this.isLocked()){
      this.playObjectSound(ModulePlaceableObjectSound.LOCKED);
    }else{
      if(!this.isOpen()){
        this.setAnimationState(ModulePlaceableAnimState.CLOSE_OPEN);
      }else{
        this.setAnimationState(ModulePlaceableAnimState.OPEN);
      }
  
      this.setOpenState(ModulePlaceableState.OPEN);
  
      this.playObjectSound(ModulePlaceableObjectSound.OPENED);
  
      if(this.hasInventory){
        GameState.MenuManager.MenuContainer.AttachContainer(this);
        GameState.MenuManager.MenuContainer.open();
      }
  
      if(this.scripts.onOpen instanceof NWScriptInstance){
        this.scripts.onOpen.run(this);
      }
    }
  
    if(this.scripts.onUsed instanceof NWScriptInstance){
      this.scripts.onUsed.run(this);
    }

  }

  lock(object: ModuleObject){
    if(!this.locked){ return; }
    this.locked = true;
    
    if(this.scripts.onLock instanceof NWScriptInstance){
      this.scripts.onLock.run(this);
    }
  }

  unlock(object: ModuleObject){
    if(!this.locked){ return; }
    this.locked = false;
    
    if(this.scripts.onUnlock instanceof NWScriptInstance){
      this.scripts.onUnlock.run(this);
    }
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
    if(this.scripts.onClosed instanceof NWScriptInstance){
      //console.log('Running script', this.scripts.onUsed)
      this.scripts.onClosed.run(this);
    }

    if(this.isOpen()){
      this.setAnimationState(ModulePlaceableAnimState.OPEN_CLOSE);
    }else{
      this.setAnimationState(ModulePlaceableAnimState.CLOSE);
    }

    this.setOpenState(ModulePlaceableState.CLOSED);

    this.playObjectSound(ModulePlaceableObjectSound.CLOSED);
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

  loadModel(): Promise<OdysseyModel3D> {
    let modelName = this.getAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      MDLLoader.loader.load(modelName)
      .then( (mdl: OdysseyModel) => {
        OdysseyModel3D.FromMDL(mdl, {
          context: this.context,
          castShadow: true,
          //receiveShadow: true,
          //lighting: false,
          static: this.static,
          useTweakColor: this.useTweakColor,
          tweakColor: this.tweakColor
        }).then((plc: OdysseyModel3D) => {

          if(this.model instanceof OdysseyModel3D){
            this.model.removeFromParent();
            try{ this.model.dispose(); }catch(e){}
          }

          this.model = plc;
          this.model.userData.moduleObject = this;
          this.model.name = modelName;

          this.container.add(this.model);

          this.model.disableMatrixUpdate();

          resolve(this.model);
        }).catch(() => {
          resolve(this.model);
        });
      }).catch(() => {
        resolve(this.model);
      });
    });
  }

  loadScripts (){
    this.scripts = {
      onClosed: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDisarm: undefined,
      onEndDialogue: undefined,
      onHeartbeat: undefined,
      onInvDisturbed: undefined,
      onLock: undefined,
      onMeleeAttacked: undefined,
      onOpen: undefined,
      onSpellCastAt: undefined,
      onTrapTriggered: undefined,
      onUnlock: undefined,
      onUsed: undefined,
      onUserDefined: undefined
    };

    if(this.template.RootNode.hasField('OnClosed'))
      this.scripts.onClosed = this.template.getFieldByLabel('OnClosed').getValue();
    
    if(this.template.RootNode.hasField('OnDamaged'))
      this.scripts.onDamaged = this.template.getFieldByLabel('OnDamaged').getValue();

    if(this.template.RootNode.hasField('OnDeath'))
      this.scripts.onDeath = this.template.getFieldByLabel('OnDeath').getValue();

    if(this.template.RootNode.hasField('OnDisarm'))
      this.scripts.onDisarm = this.template.getFieldByLabel('OnDisarm').getValue();

    if(this.template.RootNode.hasField('OnEndDialogue'))
      this.scripts.onEndDialogue = this.template.getFieldByLabel('OnEndDialogue').getValue();

    if(this.template.RootNode.hasField('OnHeartbeat'))
      this.scripts.onHeartbeat = this.template.getFieldByLabel('OnHeartbeat').getValue();

    if(this.template.RootNode.hasField('OnInvDisturbed'))
      this.scripts.onInvDisturbed = this.template.getFieldByLabel('OnInvDisturbed').getValue();

    if(this.template.RootNode.hasField('OnLock'))
      this.scripts.onLock = this.template.getFieldByLabel('OnLock').getValue();
    
    if(this.template.RootNode.hasField('OnMeleeAttacked'))
      this.scripts.onMeleeAttacked = this.template.getFieldByLabel('OnMeleeAttacked').getValue();

    if(this.template.RootNode.hasField('OnOpen'))
      this.scripts.onOpen = this.template.getFieldByLabel('OnOpen').getValue();

    if(this.template.RootNode.hasField('OnSpellCastAt'))
      this.scripts.onSpellCastAt = this.template.getFieldByLabel('OnSpellCastAt').getValue();

    if(this.template.RootNode.hasField('OnTrapTriggered'))
      this.scripts.onTrapTriggered = this.template.getFieldByLabel('OnTrapTriggered').getValue();

    if(this.template.RootNode.hasField('OnUnlock'))
      this.scripts.onUnlock = this.template.getFieldByLabel('OnUnlock').getValue();

    if(this.template.RootNode.hasField('OnUsed'))
      this.scripts.onUsed = this.template.getFieldByLabel('OnUsed').getValue();

    if(this.template.RootNode.hasField('OnUserDefined'))
      this.scripts.onUserDefined = this.template.getFieldByLabel('OnUserDefined').getValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
        this.scripts[key].caller = this;
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
      return hasItem;
    }else{
      this.inventory.push(item);
      return item;
    }
  }

  async loadWalkmesh(resRef = ''): Promise<OdysseyWalkMesh> {
    try{
      const buffer = await ResourceLoader.loadResource(ResourceTypes['pwk'], resRef);
      this.collisionData.walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
      this.collisionData.walkmesh.name = resRef;
      this.collisionData.walkmesh.moduleObject = this;
      this.model.add(this.collisionData.walkmesh.mesh);

      return this.collisionData.walkmesh;
    }catch(e){
      console.error(e);
      this.collisionData.walkmesh = new OdysseyWalkMesh();
      this.collisionData.walkmesh.name = resRef;
      this.collisionData.walkmesh.moduleObject = this;

      return this.collisionData.walkmesh;
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

    if(this.template.RootNode.hasField('Hardness'))
      this.hardness = this.template.RootNode.getFieldByLabel('Hardness').getValue();
    
    if(this.template.RootNode.hasField('HasInventory'))
      this.hasInventory = this.template.RootNode.getFieldByLabel('HasInventory').getValue();

    if(this.template.RootNode.hasField('Interruptable'))
      this.interruptable = this.template.RootNode.getFieldByLabel('Interruptable').getValue();
        
    if(this.template.RootNode.hasField('KeyName'))
      this.keyName = this.template.RootNode.getFieldByLabel('KeyName').getValue();
  
    if(this.template.RootNode.hasField('KeyRequired'))
      this.keyRequired = this.template.RootNode.getFieldByLabel('KeyRequired').getValue();

    if(this.template.RootNode.hasField('LocName'))
      this.locName = this.template.getFieldByLabel('LocName').getCExoLocString();

    if(this.template.RootNode.hasField('Locked'))
      this.locked = this.template.getFieldByLabel('Locked').getValue();

    if(this.template.RootNode.hasField('Min1HP'))
      this.min1HP = this.template.getFieldByLabel('Min1HP').getValue();

    if(this.template.RootNode.hasField('OpenLockDC'))
      this.openLockDC = this.template.getFieldByLabel('OpenLockDC').getValue();

    if(this.template.RootNode.hasField('PaletteID'))
      this.paletteID = this.template.getFieldByLabel('PaletteID').getValue();

    if(this.template.RootNode.hasField('Plot'))
      this.plot = this.template.getFieldByLabel('Plot').getValue();

    if(this.template.RootNode.hasField('PartyInteract'))
      this.partyInteract = this.template.getFieldByLabel('PartyInteract').getValue();

    if(this.template.RootNode.hasField('Plot'))
      this.plot = this.template.getFieldByLabel('Plot').getValue();

    if(this.template.RootNode.hasField('PortraidId'))
      this.portraidId = this.template.getFieldByLabel('PortraidId').getValue();

    if(this.template.RootNode.hasField('Ref'))
      this.ref = this.template.getFieldByLabel('Ref').getValue();

    if(this.template.RootNode.hasField('Static'))
      this.static = this.template.getFieldByLabel('Static').getValue();

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

    if(this.template.RootNode.hasField('Useable'))
      this.useable = this.template.getFieldByLabel('Useable').getValue();

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
    
    this.initialized = true;

  }

  destroy(): void {
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
      const wmIdx = GameState.walkmeshList.indexOf(this.collisionData.walkmesh.mesh);
      if(wmIdx >= 0) GameState.walkmeshList.splice(wmIdx, 1);
    }catch(e){}
  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTP ';

    let actionList = gff.RootNode.addField( this.actionQueueToActionList() );
    gff.RootNode.addField( new GFFField(GFFDataType.INT, 'Animation') ).setValue(this.animState);
    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Appearance') ).setValue(this.appearance);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).setValue(this.autoRemoveKey);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Bearing') ).setValue(this.bearing);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).setValue(this.bodyBag);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') ).setValue(this.closeLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Commandable') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'Conversation') ).setValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'CurrentHP') ).setValue(this.currentHP);
    gff.RootNode.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue('');
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DieWhenEmpty') ).setValue( this.isBodyBag ? 1 : 0 );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'DisarmDC') ).setValue(this.disarmDC);

    //Effects
    let effectList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.addChildStruct( this.effects[i].save() );
    }

    gff.RootNode.addField( new GFFField(GFFDataType.DWORD, 'Faction') ).setValue(this.faction ? this.faction.id : this.factionId);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Fort') ).setValue(this.fort);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'GroundPile') ).setValue(0);
    gff.RootNode.addField( new GFFField(GFFDataType.SHORT, 'HP') ).setValue(this.hp);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Hardness') ).setValue(this.hardness);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'HasInventory') ).setValue(this.hasInventory ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsBodyBag') ).setValue(this.isBodyBag ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsBodyBagVisible') ).setValue(1);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'IsCorpse') ).setValue(0);

    //Object Inventory
    if(this.inventory.length){
      let itemList = gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'ItemList') );
      for(let i = 0; i < this.inventory.length; i++){
        let itemStruct = this.inventory[i].save();
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

    //Scripts
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnClosed') ).setValue(this.scripts.onClosed ? this.scripts.onClosed.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDamaged') ).setValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDeath') ).setValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDialog') ).setValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnDisarm') ).setValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnEndDialogue') ).setValue(this.scripts.onEndDialogue ? this.scripts.onEndDialogue.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') ).setValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnInvDisturbed') ).setValue(this.scripts.onInvDisturbed ? this.scripts.onInvDisturbed.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnLock') ).setValue(this.scripts.onLock ? this.scripts.onLock.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') ).setValue(this.scripts.onMeleeAttacked ? this.scripts.onMeleeAttacked.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnOpen') ).setValue(this.scripts.onOpen ? this.scripts.onOpen.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') ).setValue(this.scripts.onSpellCastAt ? this.scripts.onSpellCastAt.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') ).setValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUnlock') ).setValue(this.scripts.onUnlock ? this.scripts.onUnlock.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUsed') ).setValue(this.scripts.onUsed ? this.scripts.onUsed.name : '');
    gff.RootNode.addField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') ).setValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');
    
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Open') ).setValue(this.isOpen() ? 1 : 0);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') ).setValue(this.openLockDC);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).setValue(this.partyInteract);
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot);
    gff.RootNode.addField( new GFFField(GFFDataType.WORD, 'PortraitId') ).setValue(this.portraidId);
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
    gff.RootNode.addField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.addField( new GFFField(GFFDataType.BYTE, 'Will') ).setValue(this.will);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'X') ).setValue(this.position.x);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Y') ).setValue(this.position.y);
    gff.RootNode.addField( new GFFField(GFFDataType.FLOAT, 'Z') ).setValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct(9);
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'Bearing', this.rotation.z)
    );
    
    instance.addField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'X', this.position.x)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'Y', this.position.y)
    );
    
    instance.addField(
      new GFFField(GFFDataType.FLOAT, 'Z', this.position.z)
    );

    return instance;

  }

  animationConstantToAnimation( animation_constant = 10000 ): ITwoDAAnimation {
    const animations2DA = GameState.TwoDAManager.datatables.get('animations');
    if(animations2DA){
      switch( animation_constant ){
        case ModulePlaceableAnimState.DEFAULT:        //10000, //304 - 
          return animations2DA.rows[304];
        case ModulePlaceableAnimState.DAMAGE:         //10014, //305 - damage
          return animations2DA.rows[305];
        case ModulePlaceableAnimState.DEAD: 	    //10072, //307
          return animations2DA.rows[307];
        case ModulePlaceableAnimState.ACTIVATE: 	    //10073, //308 - NWSCRIPT Constant: 200
          return animations2DA.rows[308];
        case ModulePlaceableAnimState.DEACTIVATE:     //10074, //309 - NWSCRIPT Constant: 201
          return animations2DA.rows[309];
        case ModulePlaceableAnimState.OPEN: 			    //10075, //310 - NWSCRIPT Constant: 202
          return animations2DA.rows[310];
        case ModulePlaceableAnimState.CLOSE: 			  //10076, //311 - NWSCRIPT Constant: 203
          return animations2DA.rows[311];
        case ModulePlaceableAnimState.CLOSE_OPEN: 	  //10077, //312
          return animations2DA.rows[312];
        case ModulePlaceableAnimState.OPEN_CLOSE:    //10078, //313
          return animations2DA.rows[313];
        case ModulePlaceableAnimState.ANIMLOOP01:     //10106, //316 - NWSCRIPT Constant: 204
          return animations2DA.rows[316];
        case ModulePlaceableAnimState.ANIMLOOP02:     //10107, //317 - NWSCRIPT Constant: 205
          return animations2DA.rows[317];
        case ModulePlaceableAnimState.ANIMLOOP03:     //10108, //318 - NWSCRIPT Constant: 206
          return animations2DA.rows[318];
        case ModulePlaceableAnimState.ANIMLOOP04:     //10110, //319 - NWSCRIPT Constant: 207
          return animations2DA.rows[319];
        case ModulePlaceableAnimState.ANIMLOOP05:     //10111, //320 - NWSCRIPT Constant: 208
          return animations2DA.rows[320];
        case ModulePlaceableAnimState.ANIMLOOP06:     //10112, //321 - NWSCRIPT Constant: 209
          return animations2DA.rows[321];
        case ModulePlaceableAnimState.ANIMLOOP07:     //10113, //322 - NWSCRIPT Constant: 210
          return animations2DA.rows[322];
        case ModulePlaceableAnimState.ANIMLOOP08:     //10114, //323 - NWSCRIPT Constant: 211
          return animations2DA.rows[323];
        case ModulePlaceableAnimState.ANIMLOOP09:     //10115, //324 - NWSCRIPT Constant: 212
          return animations2DA.rows[324];
        case ModulePlaceableAnimState.ANIMLOOP10:     //10116, //325 - NWSCRIPT Constant: 213 
          return animations2DA.rows[325];
      }

      return super.animationConstantToAnimation( animation_constant );
    }
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

}
