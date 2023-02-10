/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleCreature, ModuleItem, ModuleObject, ModuleRoom } from ".";
import { AudioEmitter } from "../audio/AudioEmitter";
import { BinaryReader } from "../BinaryReader";
import { GameEffect } from "../effects";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { ModulePlaceableAnimState } from "../enums/module/ModulePlaceableAnimState";
import { ModulePlaceableState } from "../enums/module/ModulePlaceableState";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { MenuManager } from "../gui";
import { SSFObjectType } from "../interface/resource/SSFType";
import { TemplateLoader } from "../loaders/TemplateLoader";
import { InventoryManager } from "../managers/InventoryManager";
import { KEYManager } from "../managers/KEYManager";
import { TwoDAManager } from "../managers/TwoDAManager";
import { NWScript } from "../nwscript/NWScript";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { OdysseyModel, OdysseyWalkMesh } from "../odyssey";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { OdysseyModel3D } from "../three/odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";

/* @file
 * The ModulePlaceable class.
 */

export class ModulePlaceable extends ModuleObject {
  openState: boolean;
  _state: ModulePlaceableState;
  lastUsedBy: any;
  animationState: number;
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
  trapDetectDC: number;
  trapFlag: number;
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

  constructor ( gff = new GFFObject()) {
    super(gff);
    this.template = gff;

    this.openState = false;
    this._state = ModulePlaceableState.NONE;
    this.lastUsedBy = undefined;

    this.animationState = 0;
    this.appearance = 0;
    this.autoRemoveKey = false;
    this.bodyBag = 0;
    this.closeLockDC = 0;
    this.conversation = '';
    this.currentHP = 0;
    this.description = new CExoLocString();
    this.disarmDC = 0;
    this.faction = 0;
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
    this.trapFlag = 0;
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
      this.audioEmitter = new AudioEmitter({
        engine: GameState.audioEngine,
        props: this,
        template: {
          sounds: [],
          isActive: true,
          isLooping: false,
          isRandom: false,
          isRandomPosition: false,
          interval: 0,
          intervalVariation: 0,
          maxDistance: 50,
          volume: 127,
          positional: 1
        },
        onLoad: () => {
        },
        onError: () => {
        }
      });

      GameState.audioEngine.AddEmitter(this.audioEmitter);
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  onClick(callee: ModuleObject){

    //You can't interact with yourself
    if((this as any) === GameState.player && GameState.getCurrentPlayer() === (this as any)){
      return;
    }

    GameState.getCurrentPlayer().actionUseObject( this );
    
  }

  update(delta = 0){
    
    super.update(delta);

    if(this.collisionData.walkmesh && this.model){
      this.collisionData.walkmesh.matrixWorld = this.model.matrix.clone();
    }

    if(this.model instanceof OdysseyModel3D){
      if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof OdysseyModel3D){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }

      if(this.model.visible)
        this.model.update(delta);

      this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z);

      /*if(this.model.odysseyAnimations.length){

        let animState = this.getAnimationState();

        if(this.defaultAnimPlayed){

          if(this._state != animState){

            this._state = animState;
            switch(animState){
              case ModulePlaceableState.DEFAULT:
                if(this.model.getAnimationByName('default')){
                  this.model.playAnimation('default', true);
                }
              break;
              case ModulePlaceableState.OPEN:
                if(this.model.getAnimationByName('open')){
                  this.model.playAnimation('open', true);
                }
              break;
              case ModulePlaceableState.CLOSED:
                if(this.model.getAnimationByName('close')){
                  this.model.playAnimation('close', true);
                }
              break;
              case ModulePlaceableState.DEAD:
                if(this.model.getAnimationByName('dead')){
                  this.model.playAnimation('dead', false);
                }
              break;
              case ModulePlaceableState.ON:
                if(this.model.getAnimationByName('on')){
                  this.model.playAnimation('on', false);
                }
              break;
              case ModulePlaceableState.OFF:
                if(this.model.getAnimationByName('off')){
                  this.model.playAnimation('off', false);
                }
              break;
              default:
                this.model.playAnimation(this.model.odysseyAnimations[0], false);
              break;
            }

          }            

        }

      }*/
      
    }

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    if(this.animState == ModulePlaceableAnimState.DEFAULT){
      if(this.isOpen()){
        this.animState = ModulePlaceableAnimState.OPEN;
      }else{
        this.animState = ModulePlaceableAnimState.CLOSE;
      }
    }

    if(!(this.model instanceof OdysseyModel3D))
      return;

    let currentAnimation = this.model.getAnimationName();

    let animation = this.animationConstantToAnimation(this.animState);
    if(animation){
      if(currentAnimation != animation.name.toLowerCase()){
        let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
        this.getModel().playAnimation(animation.name.toLowerCase(), aLooping, () => {
          this.animState = ModulePlaceableAnimState.DEFAULT;
        });
      }
    }else{
      console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
      this.animState = ModulePlaceableAnimState.DEFAULT;
    }

  }

  getName(){
    return this.hasInventory && !this.getInventory().length ? this.name + ' (Empty)' : this.name;
  }

  getX(){
    if(this.template.RootNode.HasField('X')){
      return this.template.RootNode.GetFieldByLabel('X').GetValue();
    }
    return 0;
  }

  getY(){
    if(this.template.RootNode.HasField('Y')){
      return this.template.RootNode.GetFieldByLabel('Y').GetValue();
    }
    return 0;
  }

  getZ(){
    if(this.template.RootNode.HasField('Z')){
      return this.template.RootNode.GetFieldByLabel('Z').GetValue();
    }
    return 0;
  }

  getBearing(){
    if(this.template.RootNode.HasField('Bearing')){
      return this.template.RootNode.GetFieldByLabel('Bearing').GetValue();
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

  getAnimationState(){
    return this.animationState;
  }

  setAnimationState(state: ModulePlaceableState){
    this.animationState = state;
  }

  getOnClosed(){
    if(this.template.RootNode.HasField('OnClosed')){
      return this.template.RootNode.GetFieldByLabel('OnClosed').GetValue();
    }
    return 0;
  }

  getOnDamaged(){
    if(this.template.RootNode.HasField('OnDamaged')){
      return this.template.RootNode.GetFieldByLabel('OnDamaged').GetValue();
    }
    return 0;
  }
  
  getOnDeath(){
    if(this.template.RootNode.HasField('OnDeath')){
      return this.template.RootNode.GetFieldByLabel('OnDeath').GetValue();
    }
    return 0;
  }
  
  getOnDialog(){
    if(this.template.RootNode.HasField('OnDialog')){
      return this.template.RootNode.GetFieldByLabel('OnDialog').GetValue();
    }
    return 0;
  }

  getOnUsed(){
    if(this.template.RootNode.HasField('OnUsed')){
      return this.template.RootNode.GetFieldByLabel('OnUsed').GetValue();
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
    if(this.template.RootNode.HasField('ItemList')){
      return this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
    }
    return [];
  }

  getItem(resRef = ''): ModuleItem {
    for(let i = 0; i<this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag().toLowerCase() == resRef.toLowerCase()){
        return item;
      }
    }
    return;
  }

  getInventory(){
    return this.inventory;
  }

  getAppearanceId(){
    if(this.appearance){
      return this.appearance;
    }
    return 0;
  }

  getAppearance(){
    const plc2DA = TwoDAManager.datatables.get('placeables');
    if(plc2DA){
      if(GameState.GameKey == GameEngineType.TSL){
        return plc2DA.getRowByIndex(this.getAppearanceId());
      }else{
        return plc2DA.rows[this.getAppearanceId()];
      }
    }
  }

  getObjectSounds(){
    let plc = this.getAppearance();
    let soundIdx = parseInt(plc.soundapptype.replace(/\0[\s\S]*$/g,''));
    if(!isNaN(soundIdx)){
      const plcSnd2DA = TwoDAManager.datatables.get('placeableobjsnds');
      if(plcSnd2DA){
        return plcSnd2DA.rows[soundIdx];
      }
    }
    return {"(Row Label)":-1,"label":"","armortype":"","opened":"****","closed":"****","destroyed":"****","used":"****","locked":"****"};
  }

  retrieveInventory(){
    while(this.inventory.length){
      InventoryManager.addItem(this.inventory.pop())
    }

    if(this.scripts.onInvDisturbed instanceof NWScriptInstance){
      this.scripts.onInvDisturbed.run(GameState.player);
    }

  }

  getModel(){
    return this.model;
  }

  use(object: ModuleObject){

    this.lastUsedBy = object;

    if(this.getAnimationState() == ModulePlaceableState.CLOSED){
      this.animState = ModulePlaceableAnimState.CLOSE_OPEN;
    }else{
      this.animState = ModulePlaceableAnimState.OPEN;
    }

    this.setAnimationState(ModulePlaceableState.OPEN);

    if(this.getObjectSounds()['opened'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['opened'].toLowerCase());
    }

    if(this.hasInventory){
      MenuManager.MenuContainer.AttachContainer(this);
      MenuManager.MenuContainer.Open();
    }else if(this.GetConversation() != ''){
      MenuManager.InGameDialog.StartConversation(this.GetConversation(), object);
    }

    if(this.scripts.onUsed instanceof NWScriptInstance){
      //console.log('Running script', this.scripts.onUsed)
      this.scripts.onUsed.run(this);
    }

  }

  attemptUnlock(object: ModuleObject){
    if(object instanceof ModuleCreature){
      let d20 = 20;//d20 rolls are auto 20's outside of combat
      let skillCheck = (((object.getWIS()/2) + object.getSkillLevel(6)) + d20) / this.openLockDC;
      if(skillCheck >= 1){
        this.locked = false;
        if(object instanceof ModuleCreature){
          object.PlaySoundSet(SSFObjectType.UNLOCK_SUCCESS);
        }
      }else{
        if(object instanceof ModuleCreature){
          object.PlaySoundSet(SSFObjectType.UNLOCK_FAIL);
        }
      }
      this.use(object);
      return true;
    }else{
      return false;
    }
  }

  close(object: ModuleObject){
    if(this.scripts.onClosed instanceof NWScriptInstance){
      //console.log('Running script', this.scripts.onUsed)
      this.scripts.onClosed.run(this);
    }

    if(this.getAnimationState() == ModulePlaceableState.OPEN){
      this.animState = ModulePlaceableAnimState.OPEN_CLOSE;
    }else{
      this.animState = ModulePlaceableAnimState.CLOSE;
    }

    this.setAnimationState(ModulePlaceableState.CLOSED);

    if(this.getObjectSounds()['closed'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['closed'].toLowerCase());
    }
  }

  Load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utp'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
        this.LoadInventory();
        this.LoadScripts();
      }else{
        console.error('Failed to load ModulePlaceable template');
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadInventory();
      this.LoadScripts();
    }
  }

  LoadModel(): Promise<OdysseyModel3D> {
    let modelName = this.getAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      GameState.ModelLoader.load(modelName)
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

  LoadScripts (){
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

    if(this.template.RootNode.HasField('OnClosed'))
      this.scripts.onClosed = this.template.GetFieldByLabel('OnClosed').GetValue();
    
    if(this.template.RootNode.HasField('OnDamaged'))
      this.scripts.onDamaged = this.template.GetFieldByLabel('OnDamaged').GetValue();

    if(this.template.RootNode.HasField('OnDeath'))
      this.scripts.onDeath = this.template.GetFieldByLabel('OnDeath').GetValue();

    if(this.template.RootNode.HasField('OnDisarm'))
      this.scripts.onDisarm = this.template.GetFieldByLabel('OnDisarm').GetValue();

    if(this.template.RootNode.HasField('OnEndDialogue'))
      this.scripts.onEndDialogue = this.template.GetFieldByLabel('OnEndDialogue').GetValue();

    if(this.template.RootNode.HasField('OnHeartbeat'))
      this.scripts.onHeartbeat = this.template.GetFieldByLabel('OnHeartbeat').GetValue();

    if(this.template.RootNode.HasField('OnInvDisturbed'))
      this.scripts.onInvDisturbed = this.template.GetFieldByLabel('OnInvDisturbed').GetValue();

    if(this.template.RootNode.HasField('OnLock'))
      this.scripts.onLock = this.template.GetFieldByLabel('OnLock').GetValue();
    
    if(this.template.RootNode.HasField('OnMeleeAttacked'))
      this.scripts.onMeleeAttacked = this.template.GetFieldByLabel('OnMeleeAttacked').GetValue();

    if(this.template.RootNode.HasField('OnOpen'))
      this.scripts.onOpen = this.template.GetFieldByLabel('OnOpen').GetValue();

    if(this.template.RootNode.HasField('OnSpellCastAt'))
      this.scripts.onSpellCastAt = this.template.GetFieldByLabel('OnSpellCastAt').GetValue();

    if(this.template.RootNode.HasField('OnTrapTriggered'))
      this.scripts.onTrapTriggered = this.template.GetFieldByLabel('OnTrapTriggered').GetValue();

    if(this.template.RootNode.HasField('OnUnlock'))
      this.scripts.onUnlock = this.template.GetFieldByLabel('OnUnlock').GetValue();

    if(this.template.RootNode.HasField('OnUsed'))
      this.scripts.onUsed = this.template.GetFieldByLabel('OnUsed').GetValue();

    if(this.template.RootNode.HasField('OnUserDefined'))
      this.scripts.onUserDefined = this.template.GetFieldByLabel('OnUserDefined').GetValue();
    
    if(this.template.RootNode.HasField('TweakColor'))
      this.tweakColor = this.template.GetFieldByLabel('TweakColor').GetValue();
    
    if(this.template.RootNode.HasField('UseTweakColor'))
      this.useTweakColor = this.template.GetFieldByLabel('UseTweakColor').GetValue();

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }

  }

  LoadInventory(){
    let inventory = this.getItemList();
    for(let i = 0; i < inventory.length; i++){
      this.LoadItem( GFFObject.FromStruct( inventory[i] ) );
    }
  }

  LoadItem( template: GFFObject){
    let item = new ModuleItem(template);
    item.InitProperties();
    item.Load();
    let hasItem = this.getItem(item.getTag());
    if(hasItem){
      hasItem.setStackSize(hasItem.getStackSize() + 1);
      return hasItem;
    }else{
      this.inventory.push(item);
      return item;
    }
  }

  LoadWalkmesh(ResRef = '', onLoad?: Function){
    let wokKey = KEYManager.Key.GetFileKey(ResRef, ResourceTypes['pwk']);
    if(wokKey != null){
      KEYManager.Key.GetFileData(wokKey, (buffer: Buffer) => {

        this.collisionData.walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
        this.collisionData.walkmesh.name = ResRef;
        this.collisionData.walkmesh.moduleObject = this;
        this.model.add(this.collisionData.walkmesh.mesh);

        if(typeof onLoad === 'function')
          onLoad(this.collisionData.walkmesh);

      });

    }else{
      console.warn('ModulePlaceable', 'PWK Missing', ResRef);
      this.collisionData.walkmesh = new OdysseyWalkMesh();
      this.collisionData.walkmesh.name = ResRef;
      this.collisionData.walkmesh.moduleObject = this;

      if(typeof onLoad === 'function')
        onLoad(this.collisionData.walkmesh);
    }

  }

  InitProperties(){
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }else{
        this.id = ModuleObject.COUNT++;
      }
      
      ModuleObject.List.set(this.id, this);
    }

    if(this.template.RootNode.HasField('LocName'))
      this.name = this.template.GetFieldByLabel('LocName').GetCExoLocString().GetValue()

    if(this.template.RootNode.HasField('Animation'))
      this.animState = this.template.GetFieldByLabel('Animation').GetValue();

    if(this.template.RootNode.HasField('Appearance'))
      this.appearance = this.template.GetFieldByLabel('Appearance').GetValue();

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('BodyBag'))
      this.bodyBag = this.template.GetFieldByLabel('BodyBag').GetValue();

    if(this.template.RootNode.HasField('CloseLockDC'))
      this.closeLockDC = this.template.GetFieldByLabel('CloseLockDC').GetValue();

    if(this.template.RootNode.HasField('Conversation'))
      this.conversation = this.template.GetFieldByLabel('Conversation').GetValue();

    if(this.template.RootNode.HasField('CurrentHP'))
      this.currentHP = this.template.GetFieldByLabel('CurrentHP').GetValue();

    if(this.template.RootNode.HasField('DisarmDC'))
      this.disarmDC = this.template.GetFieldByLabel('DisarmDC').GetValue();

    if(this.template.RootNode.HasField('Faction')){
      this.faction = this.template.GetFieldByLabel('Faction').GetValue();
      if((this.faction & 0xFFFFFFFF) == -1){
        this.faction = 0;
      }
    }

    if(this.template.RootNode.HasField('Fort'))
      this.fort = this.template.GetFieldByLabel('Fort').GetValue();
        
    if(this.template.RootNode.HasField('HP'))
      this.hp = this.template.RootNode.GetFieldByLabel('HP').GetValue();

    if(this.template.RootNode.HasField('Hardness'))
      this.hardness = this.template.RootNode.GetFieldByLabel('Hardness').GetValue();
    
    if(this.template.RootNode.HasField('HasInventory'))
      this.hasInventory = this.template.RootNode.GetFieldByLabel('HasInventory').GetValue();

    if(this.template.RootNode.HasField('Interruptable'))
      this.interruptable = this.template.RootNode.GetFieldByLabel('Interruptable').GetValue();
        
    if(this.template.RootNode.HasField('KeyName'))
      this.keyName = this.template.RootNode.GetFieldByLabel('KeyName').GetValue();
  
    if(this.template.RootNode.HasField('KeyRequired'))
      this.keyRequired = this.template.RootNode.GetFieldByLabel('KeyRequired').GetValue();

    if(this.template.RootNode.HasField('LocName'))
      this.locName = this.template.GetFieldByLabel('LocName').GetCExoLocString();

    if(this.template.RootNode.HasField('Locked'))
      this.locked = this.template.GetFieldByLabel('Locked').GetValue();

    if(this.template.RootNode.HasField('Min1HP'))
      this.min1HP = this.template.GetFieldByLabel('Min1HP').GetValue();

    if(this.template.RootNode.HasField('OpenLockDC'))
      this.openLockDC = this.template.GetFieldByLabel('OpenLockDC').GetValue();

    if(this.template.RootNode.HasField('PaletteID'))
      this.paletteID = this.template.GetFieldByLabel('PaletteID').GetValue();

    if(this.template.RootNode.HasField('Plot'))
      this.plot = this.template.GetFieldByLabel('Plot').GetValue();

    if(this.template.RootNode.HasField('PartyInteract'))
      this.partyInteract = this.template.GetFieldByLabel('PartyInteract').GetValue();

    if(this.template.RootNode.HasField('Plot'))
      this.plot = this.template.GetFieldByLabel('Plot').GetValue();

    if(this.template.RootNode.HasField('PortraidId'))
      this.portraidId = this.template.GetFieldByLabel('PortraidId').GetValue();

    if(this.template.RootNode.HasField('Ref'))
      this.ref = this.template.GetFieldByLabel('Ref').GetValue();

    if(this.template.RootNode.HasField('Static'))
      this.static = this.template.GetFieldByLabel('Static').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('TrapDetectDC'))
      this.trapDetectDC = this.template.GetFieldByLabel('TrapDetectDC').GetValue();
  
    if(this.template.RootNode.HasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.GetFieldByLabel('TrapDetectable').GetValue();

    if(this.template.RootNode.HasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.GetFieldByLabel('TrapDisarmable').GetValue();
  
    if(this.template.RootNode.HasField('TrapFlag'))
      this.trapFlag = this.template.RootNode.GetFieldByLabel('TrapFlag').GetValue();

    if(this.template.RootNode.HasField('TrapOneShot'))
      this.trapOneShot = this.template.GetFieldByLabel('TrapOneShot').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('TrapType'))
      this.trapType = this.template.GetFieldByLabel('TrapType').GetValue();

    if(this.template.RootNode.HasField('Useable'))
      this.useable = this.template.GetFieldByLabel('Useable').GetValue();

    if(this.template.RootNode.HasField('Will'))
      this.will = this.template.GetFieldByLabel('Will').GetValue();

    if(this.template.RootNode.HasField('X'))
      this.position.x = this.template.RootNode.GetFieldByLabel('X').GetValue();

    if(this.template.RootNode.HasField('Y'))
      this.position.y = this.template.RootNode.GetFieldByLabel('Y').GetValue();

    if(this.template.RootNode.HasField('Z'))
      this.position.z = this.template.RootNode.GetFieldByLabel('Z').GetValue();

    if(this.template.RootNode.HasField('Bearing'))
      this.bearing = this.template.RootNode.GetFieldByLabel('Bearing').GetValue();

    if(this.template.RootNode.HasField('SWVarTable')){
      let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
        }
      }
    }

    if(this.template.RootNode.HasField('EffectList')){
      let effects = this.template.RootNode.GetFieldByLabel('EffectList').GetChildStructs() || [];
      for(let i = 0; i < effects.length; i++){
        let effect = GameEffect.EffectFromStruct(effects[i]);
        if(effect instanceof GameEffect){
          effect.setAttachedObject(this);
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }
    
    this.initialized = true;

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTP ';

    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.INT, 'Animation') ).SetValue(this.animState);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Appearance') ).SetValue(this.getAppearanceId());
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).SetValue(this.autoRemoveKey);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Bearing') ).SetValue(this.bearing);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).SetValue(this.bodyBag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') ).SetValue(this.closeLockDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') ).SetValue(this.conversation);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHP') ).SetValue(this.currentHP);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue('');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DieWhenEmpty') ).SetValue( this.isBodyBag ? 1 : 0 );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DisarmDC') ).SetValue(this.disarmDC);

    //Effects
    let effectList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.AddChildStruct( this.effects[i].save() );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') ).SetValue(this.faction);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Fort') ).SetValue(this.fort);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GroundPile') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HP') ).SetValue(this.hp);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Hardness') ).SetValue(this.hardness);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'HasInventory') ).SetValue(this.inventory.length ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsBodyBag') ).SetValue(this.isBodyBag ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsBodyBagVisible') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'IsCorpse') ).SetValue(0);

    //Object Inventory
    if(this.inventory.length){
      let itemList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ItemList') );
      for(let i = 0; i < this.inventory.length; i++){
        let itemStruct = this.inventory[i].save();
        itemList.AddChildStruct(itemStruct);
      }
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).SetValue(this.keyName);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'KeyRequired') ).SetValue(this.keyRequired);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'LightState') ).SetValue(this.lightState ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).SetValue(this.locName);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Lockable') ).SetValue(this.lockable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Locked') ).SetValue(this.locked);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).SetValue(this.min1HP);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClosed') ).SetValue(this.scripts.onClosed ? this.scripts.onClosed.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDamaged') ).SetValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDeath') ).SetValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDialog') ).SetValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDisarm') ).SetValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnEndDialogue') ).SetValue(this.scripts.onEndDialogue ? this.scripts.onEndDialogue.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnInvDisturbed') ).SetValue(this.scripts.onInvDisturbed ? this.scripts.onInvDisturbed.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnLock') ).SetValue(this.scripts.onLock ? this.scripts.onLock.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') ).SetValue(this.scripts.onMeleeAttacked ? this.scripts.onMeleeAttacked.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnOpen') ).SetValue(this.scripts.onOpen ? this.scripts.onOpen.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') ).SetValue(this.scripts.onSpellCastAt ? this.scripts.onSpellCastAt.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') ).SetValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUnlock') ).SetValue(this.scripts.onUnlock ? this.scripts.onUnlock.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUsed') ).SetValue(this.scripts.onUsed ? this.scripts.onUsed.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');
    
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Open') ).SetValue(this.isOpen() ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') ).SetValue(this.openLockDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PartyInteract') ).SetValue(this.partyInteract);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Plot') ).SetValue(this.plot);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(this.portraidId);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Ref') ).SetValue(this.ref);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Static') ).SetValue(this.static);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') ).SetValue(this.trapDetectDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetectable') ).SetValue(this.trapDetectable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') ).SetValue(this.trapDisarmable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapFlag') ).SetValue(this.trapFlag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') ).SetValue(this.trapOneShot);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapType') ).SetValue(this.trapType);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Useable') ).SetValue(this.useable);
    gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'VarTable') );
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Will') ).SetValue(this.will);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'X') ).SetValue(this.position.x);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Y') ).SetValue(this.position.y);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Z') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct(9);
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Bearing', this.rotation.z)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );

    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'X', this.position.x)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Y', this.position.y)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Z', this.position.z)
    );

    return instance;

  }

  animationConstantToAnimation( animation_constant = 10000 ){
    const animations2DA = TwoDAManager.datatables.get('animations');
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

    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AnimationState') );
    template.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Appearance') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHP') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DisarmDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Fort') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HP') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Hardness') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'HasInventory') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'KeyRequired') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Lockable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Locked') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClosed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDamaged') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDeath') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDisarm') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnEndDialogue') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnInvDisturbed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnLock') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnOpen') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUnlock') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUsed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PaletteId') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PartyInteract') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Plot') );
    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraidId') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Ref') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Static') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetectDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDetactable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapDisarmable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapFlag') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapOneShot') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'TrapType') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Type') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Useable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Will') );

    return template;
  }

}
