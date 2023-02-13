/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleCreature, ModuleItem, ModuleObject } from ".";
import { AudioEmitter } from "../audio/AudioEmitter";
import { GameState } from "../GameState";
import { SSFObjectType } from "../interface/resource/SSFType";
import { PartyManager } from "../managers/PartyManager";
import { NWScriptInstance } from "../nwscript/NWScriptInstance";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFObject } from "../resource/GFFObject";
import { OdysseyModel3D } from "../three/odyssey";

import * as THREE from "three";
import { TemplateLoader } from "../loaders/TemplateLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { OdysseyModel, OdysseyWalkMesh } from "../odyssey";
import { AsyncLoop } from "../utility/AsyncLoop";
import { NWScript } from "../nwscript/NWScript";
import { BinaryReader } from "../BinaryReader";
import { GameEffect } from "../effects";
import { GFFField } from "../resource/GFFField";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GFFStruct } from "../resource/GFFStruct";
import { ModuleDoorAnimState } from "../enums/module/ModuleDoorAnimState";
import { TwoDAManager } from "../managers/TwoDAManager";
import { InventoryManager } from "../managers/InventoryManager";
import { KEYManager } from "../managers/KEYManager";
import { MenuManager } from "../gui";
import { ResourceLoader } from "../resource/ResourceLoader";
import { EngineMode } from "../enums/engine/EngineMode";
import { DLGObject } from "../resource/DLGObject";

/* @file
 * The ModuleDoor class.
 */

export class ModuleDoor extends ModuleObject {
  openState: boolean;

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
  portraitId: number;
  ref: number;
  static: boolean;
  trapDetectDC: number;
  trapFlag: number;
  will: number;
  x: number;
  y: number;
  z: number;
  declare audioEmitter: AudioEmitter;
  boxHelper: THREE.Box3Helper;
  props: any;
  useable: any;
  bodyBag: any;

  
  transitionLineMin: THREE.Vector3 = new THREE.Vector3(-2.5, 0, 0);
  transitionLineMax: THREE.Vector3 = new THREE.Vector3(2.5, 0, 0);
  transitionLine: THREE.Line3;
  transitionClosestPoint: THREE.Vector3 = new THREE.Vector3();
  transitionDistance: number = Infinity;

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.template = gff;
    this.openState = false;
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
    this.currentHP = 0;
    this.description = new CExoLocString();
    this.disarmDC = 0;
    this.faction = 0;
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

  getName(){
    return this.locName.GetValue();
  }

  getGenericType(){
    return this.genericType;
  }

  getDoorAppearance(){
    const genericdoors2DA = TwoDAManager.datatables.get('genericdoors');
    if(genericdoors2DA){
      return genericdoors2DA.rows[this.getGenericType()];
    }
  }

  getObjectSounds(){
    let door = this.getDoorAppearance();
    let soundIdx = parseInt(door.soundapptype.replace(/\0[\s\S]*$/g,''));
    if(!isNaN(soundIdx)){
      const placeableobjsnds2DA = TwoDAManager.datatables.get('placeableobjsnds');
      if(placeableobjsnds2DA){
        return placeableobjsnds2DA.rows[soundIdx];
      }
    }
    return {"(Row Label)":-1,"label":"","armortype":"","opened":"****","closed":"****","destroyed":"****","used":"****","locked":"****"};
  }

  /*getTemplateResRef(){
    return this.templateResRef;
  }*/

  getModel(){
    return this.model;
  }

  onHover(){

  }

  isUseable(){
    return !this.openState && !this.static;
  }

  isOpen(){
    return this.openState;
  }

  onClick(callee: ModuleObject){

    //You can't interact with yourself
    if((this as any) === GameState.player && GameState.getCurrentPlayer() === (this as any)){
      return;
    }

    GameState.getCurrentPlayer().actionOpenDoor( this );
    
  }

  use(object: ModuleObject){

    this.lastUsedBy = object;

    if(!this.openState){
      
      if(this.isLocked()){
        if(this.keyRequired && this.keyName.length){
          if(InventoryManager.getItem(this.keyName) instanceof ModuleItem){
            this.locked = false;
          }
        }
      }

      if(this.isLocked()){
        if(this.scripts.onFailToOpen instanceof NWScriptInstance){
          this.scripts.onFailToOpen.run(this);
        }

        if(this.getObjectSounds()['locked'] != '****'){
          this.audioEmitter.PlaySound(this.getObjectSounds()['locked'].toLowerCase());
        }
        /*if(this.requiresKey()){
          console.log('key required', this.keyName())
          if(object instanceof ModuleCreature){
            if(object.hasItem(this.keyName())){
              this.openDoor(object);
            }else if(this.scripts.onFailToOpen instanceof NWScriptInstance){
              console.log('Running script')
              this.scripts.onFailToOpen.run(this);
            }
          }
        }else{
          this.openDoor(object);
        }*/
      }else{
        this.openDoor(object);
      }
    }else{
      console.log('already open');
    }

    /*if(this.GetConversation() != ''){
      MenuManager.InGameDialog.StartConversation(this.GetConversation(), object);
    }*/

  }

  attemptUnlock(object: ModuleObject){
    if(object instanceof ModuleObject){
      
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

  openDoor(object: ModuleObject){

    /*
    Door Animations:
      opening1 and opening2 are supposed to be used for swinging doors
      they should play depending on which side the object that opened them was on.
      As far as I know these are not used in KOTOR but they are supported by the original engine
    */

    if(object instanceof ModuleObject){
      this.lastObjectOpened = object;
      //object.lastDoorEntered = this;
    }

    if(this.scripts.onOpen instanceof NWScriptInstance){
      this.scripts.onOpen.run(this);
    }

    if(this.getObjectSounds()['opened'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['opened'].toLowerCase());
    }

    if(GameState.selectedObject == this){
      GameState.selectedObject = GameState.selected = undefined;
    }
    this.openState = true;

    this.model.playAnimation('opening1', false, () => {
      console.log('opening1');
      setTimeout( () => {
        if(this.collisionData.walkmesh && this.collisionData.walkmesh.mesh){
          this.collisionData.walkmesh.mesh.remove(this.collisionData.walkmesh.mesh.parent);
        }
        //this.model.poseAnimation('opened1');
      }, 100);
    });

    if(this.collisionData.walkmesh && this.collisionData.walkmesh.mesh && this.collisionData.walkmesh.mesh.parent){
      GameState.group.room_walkmeshes.remove( this.collisionData.walkmesh.mesh );
    }

    //Notice all creatures within range that someone opened this door
    if(object instanceof ModuleCreature){
      for(let i = 0, len = GameState.module.area.creatures.length; i < len; i++){
        let creature = GameState.module.area.creatures[i];
        let distance = creature.position.distanceTo(this.position);
        if(distance <= creature.getPerceptionRangePrimary()){
          creature.notifyPerceptionHeardObject(object, true);
        }
      }
    }

  }

  closeDoor(object: ModuleObject){

    if(object instanceof ModuleCreature){
      object.lastDoorExited = this;
    }

    if(this.getObjectSounds()['closed'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['closed'].toLowerCase());
    }

    if(this.collisionData.walkmesh && this.collisionData.walkmesh.mesh){
      if(this.collisionData.walkmesh.mesh.parent){
        this.collisionData.walkmesh.mesh.parent.remove(this.collisionData.walkmesh.mesh);
      }
      GameState.group.room_walkmeshes.add( this.collisionData.walkmesh.mesh );
    }

    this.model.playAnimation('closing1', false, () => {
      console.log('closing1');
      this.openState = false;
      this.model.playAnimation('closed', true);
    });

  }

  //Some modules have exit triggers that are placed in the same location that the player spawns into
  //This is my way of keeping the player from immediately activating the trigger
  //They will be added to the objectsInside array without triggering the onEnter script
  //If they leave the trigger and then return it will then fire normally
  initObjectsInside(){
    //Check to see if this trigger is linked to another module
    if(this.linkedToModule && this.type == 1){
      //Check Party Members
      let partyLen = PartyManager.party.length;
      for(let i = 0; i < partyLen; i++){
        let partymember = PartyManager.party[i];
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

  async onSpawn(runScript = true){
    super.onSpawn(runScript);

    if(this.model instanceof OdysseyModel3D){
      this.model.updateMatrix();

      this.box.setFromObject(this.model);

      this.audioEmitter.SetPosition(this.position.x, this.position.y, this.position.z);
      this.boxHelper = new THREE.Box3Helper( this.box, (new THREE.Color()).setHex(0xff0000) );
      GameState.group.light_helpers.add( this.boxHelper );
    }

    if(this.collisionData.walkmesh && this.model){
      this.collisionData.walkmesh.matrixWorld.copy(this.model.matrix);
    }
  }

  onAttacked(){
    if(this.scripts.onAttacked instanceof NWScriptInstance){
      let instance = this.scripts.onAttacked.nwscript.newInstance();
      instance.run(this);
    }
  }

  onDamaged(){
    if(this.scripts.onDamaged instanceof NWScriptInstance){
      let instance = this.scripts.onDamaged.nwscript.newInstance();
      instance.run(this);
    }
  }

  update(delta = 0){
    
    super.update(delta);
    if(this.model instanceof OdysseyModel3D){
      this.model.update(delta);
      //this.box.setFromObject(this.model);
    }

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    if(this.isDead() && !this.isOpen()){
      this.openDoor(this);
    }

    const partymember = PartyManager.party[0];
    if(partymember){
      const outer_distance = partymember.position.distanceTo(this.position);
      if(outer_distance < 10){
        this.testTransitionLine(partymember);
        if(this.transitionDistance < 2){
          if(this.getLinkedToModule() && this.isOpen()){
            MenuManager.InGameAreaTransition.setTransitionObject(this);
          }
        }else{
          if(MenuManager.InGameAreaTransition.transitionObject == this){
            MenuManager.InGameAreaTransition.setTransitionObject(undefined);
          }
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
        if(partymember.lastDoorEntered === this){
          partymember.lastDoorExited = this;
          this.onExit(partymember);
        }
      }
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
        GameState.raycaster.ray.direction.copy(object.AxisFront);
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
        GameState.LoadModule(this.getLinkedToModule().toLowerCase(), this.getLinkedTo().toLowerCase());
      }else{
        object.lastDoorEntered = this;
      }
    }
  }

  onEnter(object: ModuleObject){
    object.lastDoorEntered = this;
    if(this.getLinkedToModule() && this.isOpen()){
      MenuManager.InGameAreaTransition.setTransitionObject(this);
    }
  }

  onExit(object: ModuleObject){
    object.lastDoorEntered = undefined;
    if(this.getLinkedToModule()){
      MenuManager.InGameAreaTransition.setTransitionObject(undefined);
    }
  }

  Load(){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['utd'], this.getTemplateResRef());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        //console.log(this.template, gff, this)
        this.InitProperties();
        this.LoadScripts();
      }else{
        console.error(`Failed to load ${ModuleDoor.name} template`);
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadScripts();
    }
  }

  LoadModel(): Promise<OdysseyModel3D> {
    let modelName = this.getDoorAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      GameState.ModelLoader.load(modelName).then((mdl: OdysseyModel) => {
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

          let trans = this.model.getObjectByName('trans');
          if(trans instanceof THREE.Object3D){
            trans.visible = false;
          }

          this.generateTransitionLine();
          
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

  LoadScripts(){

    this.scripts = {
      onClick: undefined,
      onClosed: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDisarm: undefined,
      onFailToOpen: undefined,
      onHeartbeat: undefined,
      onInvDisturbed: undefined,
      onLock: undefined,
      onMeleeAttacked: undefined,
      onOpen: undefined,
      onSpellCastAt: undefined,
      onTrapTriggered: undefined,
      onUnlock: undefined,
      onUserDefined: undefined
    };

    if(this.template.RootNode.HasField('OnClick'))
      this.scripts.onClick = this.template.GetFieldByLabel('OnClick').GetValue();
    
    if(this.template.RootNode.HasField('OnClosed'))
      this.scripts.onClosed = this.template.GetFieldByLabel('OnClosed').GetValue();

    if(this.template.RootNode.HasField('OnDamaged'))
      this.scripts.onDamaged = this.template.GetFieldByLabel('OnDamaged').GetValue();

    if(this.template.RootNode.HasField('OnDeath'))
      this.scripts.onDeath = this.template.GetFieldByLabel('OnDeath').GetValue();

    if(this.template.RootNode.HasField('OnDisarm'))
      this.scripts.onDisarm = this.template.GetFieldByLabel('OnDisarm').GetValue();

    if(this.template.RootNode.HasField('OnFailToOpen'))
      this.scripts.onFailToOpen = this.template.GetFieldByLabel('OnFailToOpen').GetValue();

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

    if(this.template.RootNode.HasField('OnUserDefined'))
      this.scripts.onUserDefined = this.template.GetFieldByLabel('OnUserDefined').GetValue();
    
    if(this.template.RootNode.HasField('TweakColor'))
      this.tweakColor = this.template.GetFieldByLabel('TweakColor').GetValue();
    
    if(this.template.RootNode.HasField('UseTweakColor'))
      this.useTweakColor = this.template.GetFieldByLabel('UseTweakColor').GetValue() ? true : false;

    let keys = Object.keys(this.scripts);
    for(let i = 0; i < keys.length; i++){
      const key = keys[i];
      let _script = this.scripts[key];
      if( (typeof _script === 'string' && _script != '') ){
        this.scripts[key] = NWScript.Load(_script);
      }
    }

  }

  LoadWalkmesh(ResRef = '', onLoad?: Function ){
    
    let wokKey = KEYManager.Key.GetFileKey(ResRef+'0', ResourceTypes['dwk']);
    if(wokKey){
      KEYManager.Key.GetFileData(wokKey, (buffer: Buffer) => {

        this.collisionData.walkmesh = new OdysseyWalkMesh(new BinaryReader(buffer));
        this.collisionData.walkmesh.mesh.name = this.collisionData.walkmesh.name = ResRef;
        this.collisionData.walkmesh.mesh.userData.moduleObject = this.collisionData.walkmesh.moduleObject = this;

        if(typeof onLoad === 'function')
          onLoad(this.collisionData.walkmesh);

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
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

    if(this.template.RootNode.HasField('AnimationState'))
      this.animationState = this.template.GetFieldByLabel('AnimationState').GetValue();

    if(this.template.RootNode.HasField('Appearance'))
      this.appearance = this.template.GetFieldByLabel('Appearance').GetValue();

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('CloseLockDC'))
      this.closeLockDC = this.template.GetFieldByLabel('CloseLockDC').GetValue();

    if(this.template.RootNode.HasField('Conversation')){
      this.conversation = DLGObject.FromResRef(this.template.GetFieldByLabel('Conversation').GetValue());
    }

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
  
    if(this.template.RootNode.HasField('GenericType'))
      this.genericType = this.template.RootNode.GetFieldByLabel('GenericType').GetValue();
        
    if(this.template.RootNode.HasField('HP'))
      this.hp = this.template.RootNode.GetFieldByLabel('HP').GetValue();

    if(this.template.RootNode.HasField('Hardness'))
      this.hardness = this.template.RootNode.GetFieldByLabel('Hardness').GetValue();
    
    if(this.template.RootNode.HasField('Interruptable'))
      this.interruptable = this.template.RootNode.GetFieldByLabel('Interruptable').GetValue();
        
    if(this.template.RootNode.HasField('KeyName'))
      this.keyName = this.template.RootNode.GetFieldByLabel('KeyName').GetValue();
  
    if(this.template.RootNode.HasField('KeyRequired'))
      this.keyRequired = this.template.RootNode.GetFieldByLabel('KeyRequired').GetValue();
      
    if(this.template.RootNode.HasField('LoadScreenID'))
      this.loadScreenID = this.template.GetFieldByLabel('LoadScreenID').GetValue();

    if(this.template.RootNode.HasField('LocName'))
      this.locName = this.template.GetFieldByLabel('LocName').GetCExoLocString();

    if(this.template.RootNode.HasField('Locked'))
      this.locked = this.template.GetFieldByLabel('Locked').GetValue();

    if(this.template.RootNode.HasField('Min1HP'))
      this.min1HP = this.template.GetFieldByLabel('Min1HP').GetValue();

    if(this.template.RootNode.HasField('OpenLockDC'))
      this.openLockDC = this.template.GetFieldByLabel('OpenLockDC').GetValue();

    if(this.template.RootNode.HasField('OpenState'))
      this.openState = this.template.GetFieldByLabel('OpenState').GetValue();

    if(this.template.RootNode.HasField('PaletteID'))
      this.paletteID = this.template.GetFieldByLabel('PaletteID').GetValue();

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

    if(this.template.RootNode.HasField('Will'))
      this.will = this.template.GetFieldByLabel('Will').GetValue();

    if(this.template.RootNode.HasField('X'))
      this.x = this.position.x = this.template.RootNode.GetFieldByLabel('X').GetValue();

    if(this.template.RootNode.HasField('Y'))
      this.y = this.position.y = this.template.RootNode.GetFieldByLabel('Y').GetValue();

    if(this.template.RootNode.HasField('Z'))
      this.z = this.position.z = this.template.RootNode.GetFieldByLabel('Z').GetValue();

    if(this.template.RootNode.HasField('Bearing'))
      this.bearing = this.rotation.z = this.template.RootNode.GetFieldByLabel('Bearing').GetValue();

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
          effect.loadModel();
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }

    if(this.template.RootNode.HasField('LinkedTo'))
      this.linkedTo = this.template.RootNode.GetFieldByLabel('LinkedTo').GetValue();

    if(this.template.RootNode.HasField('LinkedToFlags'))
      this.linkedToFlags = this.template.RootNode.GetFieldByLabel('LinkedToFlags').GetValue();

    if(this.template.RootNode.HasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.GetFieldByLabel('LinkedToModule').GetValue();

    if(this.template.RootNode.HasField('TransitionDestin'))
      this.transitionDestin = this.template.RootNode.GetFieldByLabel('TransitionDestin').GetCExoLocString();

    this.initialized = true

  }

  save(){
    let gff = new GFFObject();
    gff.FileType = 'UTD ';

    let actionList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'ActionList') );
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Appearance') ).SetValue(this.appearance);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') ).SetValue(this.autoRemoveKey);
    gff.RootNode.AddField( new GFFField(GFFDataType.FLOAT, 'Bearing') ).SetValue(this.bearing);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'BodyBag') ).SetValue(this.bodyBag);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') ).SetValue(this.closeLockDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Commandable') ).SetValue(1);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') ).SetValue(this.conversation ? this.conversation.resref : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHP') ).SetValue(this.currentHP);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue('');
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DisarmDC') ).SetValue(this.disarmDC);

    //Effects
    let effectList = gff.RootNode.AddField( new GFFField(GFFDataType.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.AddChildStruct( this.effects[i].save() );
    }

    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') ).SetValue(this.faction);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Fort') ).SetValue(this.fort);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GenericType') ).SetValue(this.genericType);
    gff.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HP') ).SetValue(this.hp);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Hardness') ).SetValue(this.hardness);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') ).SetValue(this.keyName);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'KeyRequired') ).SetValue(this.keyRequired);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo') ).SetValue(this.linkedTo);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'LinkedToFlags') ).SetValue(this.linkedToFlags);
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'LinkedToModule') ).SetValue(this.linkedToModule);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') ).SetValue(this.locName);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'LoadScreenID') ).SetValue(this.loadScreenID);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Lockable') ).SetValue(this.lockable);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Locked') ).SetValue(this.locked);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') ).SetValue(this.min1HP);
    gff.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);

    //Scripts
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClick') ).SetValue(this.scripts.onClick ? this.scripts.onClick.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClosed') ).SetValue(this.scripts.onClosed ? this.scripts.onClosed.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDamaged') ).SetValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDeath') ).SetValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDialog') ).SetValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDisarm') ).SetValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnFailToOpen') ).SetValue(this.scripts.onFailToOpen ? this.scripts.onFailToOpen.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnLock') ).SetValue(this.scripts.onLock ? this.scripts.onLock.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') ).SetValue(this.scripts.onMeleeAttacked ? this.scripts.onMeleeAttacked.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnOpen') ).SetValue(this.scripts.onOpen ? this.scripts.onOpen.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') ).SetValue(this.scripts.onSpellCastAt ? this.scripts.onSpellCastAt.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') ).SetValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUnlock') ).SetValue(this.scripts.onUnlock ? this.scripts.onUnlock.name : '');
    gff.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');
    
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') ).SetValue(this.openLockDC);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'OpenState') ).SetValue(this.isOpen() ? 1 : 0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Plot') ).SetValue(this.plot);
    gff.RootNode.AddField( new GFFField(GFFDataType.WORD, 'PortraitId') ).SetValue(this.portraidId);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Ref') ).SetValue(this.ref);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new GFFField(GFFDataType.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'SecretDoorDC') ).SetValue(0);
    gff.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Static') ).SetValue(this.static);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'TransitionDestin') ).SetValue(this.transitionDestin);
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

    let instance = new GFFStruct(8);
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'Bearing', this.rotation.z)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.BYTE, 'LinkedToFlags', this.linkedToFlags)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'LinkedToModule', this.linkedToModule)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'Tag', this.tag)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new GFFField(GFFDataType.CEXOSTRING, 'TransitionDestin', this.transitionDestin)
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
        case ModuleDoorAnimState.DEFAULT:       //10000, //327 - 
          return animations2DA.rows[327];
        case ModuleDoorAnimState.CLOSED:        //10022, //333 - 
          return animations2DA.rows[333];
        case ModuleDoorAnimState.OPENED1:       //10050, //331 - 
          return animations2DA.rows[331];
        case ModuleDoorAnimState.OPENED2:       //10051, //332 - 
          return animations2DA.rows[332];
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

    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AnimationState') );
    template.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Appearance') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'AutoRemoveKey') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'CloseLockDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Comment') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'Conversation') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'CurrentHP') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'DisarmDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.DWORD, 'Faction') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Fort') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'GenericType') );
    template.RootNode.AddField( new GFFField(GFFDataType.SHORT, 'HP') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Hardness') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Interruptable') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOSTRING, 'KeyName') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'KeyRequired') );
    template.RootNode.AddField( new GFFField(GFFDataType.WORD, 'LoadScreenID') );
    template.RootNode.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocName') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Lockable') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Locked') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Min1HP') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClick') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnClosed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDamaged') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDeath') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnDisarm') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnHeartbeat') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnLock') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnMeleeAttacked') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnOpen') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnSpellCastAt') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnTrapTriggered') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUnlock') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUsed') );
    template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'OnUserDefined') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'OpenLockDC') );
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'PaletteId') ).SetValue(6);
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
    template.RootNode.AddField( new GFFField(GFFDataType.BYTE, 'Will') );

    return template;
  }

}
