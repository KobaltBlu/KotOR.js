/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { ActionQueue } from "../actions/ActionQueue";
import { GameState } from "../GameState";
import { GFFObject } from "../resource/GFFObject";

/* @file
 * The ModuleObject class.
 */

export class ModuleObject {

  constructor (gff = new GFFObject) {

    this.initialized = false;

    //this.moduleObject = null;
    this.AxisFront = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();
    this._triangle = new THREE.Triangle();
    this.wm_c_point = new THREE.Vector3();

    this.rotation._onChange( () => { this.onRotationChange } );
	  this.quaternion._onChange( () => { this.onQuaternionChange } );

    this.box = new THREE.Box3();
    this.sphere = new THREE.Sphere();
    this.sphere.moduleObject = this;
    this.facing = 0;
    this.wasFacing = 0;
    this.facingTweenTime = 0;
    this.force = 0;
    this.speed = 0;
    this.movementSpeed = 1;
    this.room = undefined;
    this.rooms = [];
    this.roomSize = new THREE.Vector3();
    this.model = null;
    this.dialogAnimation = null;
    this.template = undefined;
    this.plot = 0;
    this.inventory = [];
    this.scripts = {
      onAttacked: undefined,
      onDamaged: undefined,
      onDeath: undefined,
      onDialog: undefined,
      onDisturbed: undefined,
      onEndDialog: undefined,
      onEndRound: undefined,
      onHeartbeat: undefined,
      onBlocked: undefined,
      onNotice: undefined,
      onRested: undefined,
      onSpawn: undefined,
      onSpellAt: undefined,
      onUserDefined: undefined
    };

    this.tag = '';
    this.templateResRef = '';

    this.xPosition = 0;
    this.yPosition = 0;
    this.zPosition = 0;
    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;
    this.bearing = 0;
    this.collisionTimer = 0;
    this.perceptionTimer = 0;

    this.tweakColor = 0;
    this.useTweakColor = 0;

    this.hp = 0;
    this.currentHP = 0;
    this.faction = 0;

    this.actionQueue = new ActionQueue();
    this.actionQueue.setOwner( this );
    this.effects = [];
    this.casting = [];
    this.damageList = [];

    this._locals = {
      Booleans: [],
      Numbers: {}
    };

    this.objectsInside = [];
    this.lockDialogOrientation = false;

    this.context = Game;
    this.heartbeatTimer = null;
    this._heartbeatTimerOffset = Math.floor(Math.random() * 600) + 100;
    this._heartbeatTimeout = GameState.HeartbeatTimer + this._heartbeatTimerOffset;

    //Combat Info
    this._lastAttackObject = undefined;
    this._lastAttackAction = -1;
    this._lastForcePowerUsed = -1;
    this._lastForcePowerSuccess = 0;

    this._healTarget = undefined;

    this.perceptionList = [];
    this.isListening = false;
    this.listeningPatterns = {};
    this.initiative = 0;

    this.spawned = false;

    //Pointers
    this._inventoryPointer = 0;

    this.v20 = new THREE.Vector2();
    this.v21 = new THREE.Vector2();

    this.fortitudeSaveThrow = 0;
    this.reflexSaveThrow = 0;
    this.willSaveThrow = 0;

  }

  onRotationChange() {
    if(this.quaternion){
      this.quaternion.setFromEuler( this.rotation, false );
      if(this.model instanceof THREE.Object3D)
        this.model.quaternion.setFromEuler( this.rotation, false );
    }else{
      console.error('Missing quaternion', this);
    }
	}

	onQuaternionChange() {
    if(this.rotation){
      this.rotation.setFromQuaternion( this.quaternion, undefined, false );
      if(this.model instanceof THREE.Object3D)
        this.model.rotation.setFromQuaternion( this.quaternion, undefined, false );
    }else{
      console.error('Missing rotation', this);
    }
	}

  attachToRoom(room){
    if(room instanceof ModuleRoom){
      this.detachFromRoom(this.room);
      this.room = room;
      if(this instanceof ModuleCreature){
        this.room.creatures.push(this);
      }else if (this instanceof ModulePlaceable){
        this.room.placeables.push(this);
      }else if(this instanceof ModuleDoor){
        this.room.doors.push(this);
      }
    }
  }

  detachFromRoom(room){
    if(!room) room = this.room;
    if(room instanceof ModuleRoom){
      let index = -1;
      if(this instanceof ModuleCreature){
        index = room.creatures.indexOf(this);
        if(index >= 0){
          room.creatures.splice(index, 1);
        }
      }else if (this instanceof ModulePlaceable){
        index = room.placeables.indexOf(this);
        if(index >= 0){
          room.placeables.splice(index, 1);
        }
      }else if(this instanceof ModuleDoor){
        index = room.doors.indexOf(this);
        if(index >= 0){
          room.doors.splice(index, 1);
        }
      }
    }
  }

  setContext(ctx = Game){
    this.context = ctx;
  }

  //Reload the template
  Invalidate(){



  }

  getModel(){
    if(this.model instanceof THREE.Object3D)
      return this.model;
    else
      return this.model = new THREE.Object3D()
  }

  isVisible(){
    return this.getModel().visible;
  }

  getHitDistance(){
    return 1;
  }

  updateMovementSpeed(){
    let movementSpeed = 1.0;

    for(let i = 0, len = this.effects.length; i < len; i++){
      const effect = this.effects[i];
      let rate = 0;
      if(effect.type == GameEffectType.EffectMovementSpeedIncrease){
        rate = (effect.getInt(0) / 100);
      }else if(effect.type == GameEffectType.EffectMovementSpeedDecrease){
        rate = (effect.getInt(0) / -100);
      }
      movementSpeed += rate;
    }

    this.movementSpeed = movementSpeed;
  }

  update(delta = 0){
    
    //Process the heartbeat timer
    if(this._heartbeatTimeout <= 0){
      if(GameState.module){
        this.triggerHeartbeat();
      }
      this._heartbeatTimeout = GameState.HeartbeatTimer + this._heartbeatTimerOffset;
    }else{
      this._heartbeatTimeout -= 1000*delta;
    }

    //Loop through and update the effects
    if(!this.deferEventUpdate){
      for(let i = 0, len = this.effects.length; i < len; i++){
        this.effects[i].update(delta);
      }
    }

    if(GameState.currentCamera){
      this.distanceToCamera = this.position.distanceTo(GameState.currentCamera.position);
    }

    if(this.spawned){
      if(!this.room){
        if(!this.roomCheckTimer || this.roomCheckTimer <= 0){
          this.roomCheckTimer = 1;
          this.findWalkableFace();
        }
        this.roomCheckTimer -= delta;
      }
      this.setModelVisibility();
    }


    this.sphere.center.copy(this.position);
    this.sphere.radius = this.getHitDistance() * 2;

  }

  updatePaused(delta){
    if(this.spawned){
      this.setModelVisibility();
    }
  }

  setModelVisibility(){
    if(this.model){
      this.model.wasOffscreen = !this.model.visible;
      if(!this.room || (this.room && !this.room.model.visible)){
        this.model.visible = false;
      }else{
        this.model.visible = true;
      }

      //Check to see if the model is inside the current camera's frustum
      if(!this.isOnScreen()){
        this.model.visible = false;
      }

      if(GameState.inDialog){
        this.model.visible = true;
      }

    }
  }

  clearAllActions(skipUnclearable = false){
    this.combatQueue = [];
    //Reset the anim state
    //this.animState = 0;
    //this.actionQueue.clear();
    if(skipUnclearable){
      let i = this.actionQueue.length;
      while(i--){
        let action = this.actionQueue[i];
        if(typeof action.clearable !== 'undefined'){
          if(action.clearable){
            this.actionQueue.splice(i , 1);
          }
        }else{
          this.actionQueue.splice(i , 1);
        }
      }
    }else{
      this.actionQueue.clear();
    }

    this.combatAction = undefined;
    //this.clearTarget();
  }

  //Queue an animation to the actionQueue array
  actionPlayAnimation(anim = 0, speed = 1, time = 1){
    if(typeof anim === 'string')
      throw 'anim cannot be a string!';

    let animConstant = this.getAnimationNameById(anim);
    if(animConstant >= 10000){
      let action = new ActionPlayAnimation();
      action.setParameter(0, ActionParameterType.INT, animConstant);
      action.setParameter(1, ActionParameterType.FLOAT, speed || 1);
      action.setParameter(2, ActionParameterType.FLOAT, time);
      this.actionQueue.add(action);
    }else{
      console.error('actionPlayAnimation', animConstant, anim);
    }
  }

  actionDialogObject( target = undefined, dialogResRef = '', ignoreStartRange = true, unk1 = 0, unk2 = 1, clearable = false ){
    let action = new ActionDialogObject();
    action.setParameter(0, ActionParameterType.DWORD, target.id);
    action.setParameter(1, ActionParameterType.STRING, dialogResRef);
    action.setParameter(2, ActionParameterType.INT, unk1);
    action.setParameter(3, ActionParameterType.INT, unk2);
    action.setParameter(4, ActionParameterType.INT, ignoreStartRange ? 1 : 0);
    action.setParameter(5, ActionParameterType.DWORD, ModuleObject.OBJECT_INVALID);
    action.clearable = clearable;
    this.actionQueue.add(action);
  }

  actionUseObject( object = undefined ){
    if(object instanceof ModuleObject){
      let action = new ActionUseObject();
      action.setParameter(0, ActionParameterType.DWORD, object.id);
      this.actionQueue.add(action);
    }
  }

  actionOpenDoor( door = undefined ){
    if(door instanceof ModuleDoor){
      let action = new ActionOpenDoor();
      action.setParameter(0, ActionParameterType.DWORD, door.id);
      action.setParameter(1, ActionParameterType.INT, 0);
      this.actionQueue.add(action);
    }
  }

  actionCloseDoor( door = undefined ){
    if(door instanceof ModuleDoor){
      let action = new ActionCloseDoor();
      action.setParameter(0, ActionParameterType.DWORD, door.id);
      action.setParameter(1, ActionParameterType.INT, 0);
      this.actionQueue.add(action);
    }
  }

  actionWait( time = 0 ){
    let action = new ActionWait();
    action.setParameter(0, ActionParameterType.FLOAT, time);
    this.actionQueue.add(action);
  }

  isSimpleCreature(){
    return false;
  }

  getAnimationNameById(id = -1){

    if(typeof id === 'string')
      throw 'getAnimation id cannot be a string';

    if(id >= 10000)
      return id;

    switch(id){
      case 0:  //PAUSE
        return ModuleCreatureAnimState.PAUSE;
      case 1:  //PAUSE2
        return ModuleCreatureAnimState.PAUSE2;
      case 2:  //LISTEN
        return ModuleCreatureAnimState.LISTEN;
      case 3:  //MEDITATE
        return ModuleCreatureAnimState.MEDITATE;
      case 4:  //WORSHIP
        return ModuleCreatureAnimState.WORSHIP;
      case 5:  //TALK_NORMAL
        return ModuleCreatureAnimState.TALK_NORMAL;
      case 6:  //TALK_PLEADING
        return ModuleCreatureAnimState.TALK_PLEADING;
      case 7:  //TALK_FORCEFUL
        return ModuleCreatureAnimState.TALK_FORCEFUL;
      case 8:  //TALK_LAUGHING
        return ModuleCreatureAnimState.TALK_LAUGHING;
      case 9:  //TALK_SAD
        return ModuleCreatureAnimState.TALK_SAD;
      case 10: //GET_LOW
        return ModuleCreatureAnimState.GET_LOW;
      case 11: //GET_MID
        return ModuleCreatureAnimState.GET_MID;
      case 12: //PAUSE_TIRED
        return ModuleCreatureAnimState.PAUSE_TIRED;
      case 13: //PAUSE_DRUNK
        return ModuleCreatureAnimState.PAUSE_DRUNK;
      case 14: //FLIRT
        return ModuleCreatureAnimState.FLIRT;
      case 15: //USE_COMPUTER
        return ModuleCreatureAnimState.USE_COMPUTER;
      case 16: //DANCE
        return ModuleCreatureAnimState.DANCE;
      case 17: //DANCE1
        return ModuleCreatureAnimState.DANCE1;
      case 18: //HORROR
        return ModuleCreatureAnimState.HORROR;
      case 19: //READY
        return ModuleCreatureAnimState.READY;
      case 20: //DEACTIVATE
        return ModuleCreatureAnimState.DEACTIVATE;
      case 21: //SPASM
        return ModuleCreatureAnimState.SPASM;
      case 22: //SLEEP
        return ModuleCreatureAnimState.SLEEP;
      case 23: //PRONE
        return ModuleCreatureAnimState.PRONE;
      case 24: //PAUSE3
        return ModuleCreatureAnimState.PAUSE3;
      case 25: //WELD
        return ModuleCreatureAnimState.WELD;
      case 26: //DEAD
        return ModuleCreatureAnimState.DEAD;
      case 27: //TALK_INJURED
        return ModuleCreatureAnimState.TALK_INJURED;
      case 28: //LISTEN_INJURED
        return ModuleCreatureAnimState.LISTEN_INJURED;
      case 29: //TREAT_INJURED
        return ModuleCreatureAnimState.TREAT_INJURED_LP;
      case 30: //DEAD_PRONE
        return ModuleCreatureAnimState.DEAD_PRONE;
      case 31: //KNEEL_TALK_ANGRY
        return ModuleCreatureAnimState.KNEEL_TALK_ANGRY;
      case 32: //KNEEL_TALK_SAD
        return ModuleCreatureAnimState.KNEEL_TALK_SAD;
      case 35: //MEDITATE LOOP
        return ModuleCreatureAnimState.MEDITATE;
      case 100: //HEAD_TURN_LEFT
        return ModuleCreatureAnimState.HEAD_TURN_LEFT;
      case 101: //HEAD_TURN_RIGHT
        return ModuleCreatureAnimState.HEAD_TURN_RIGHT;
      case 102: //PAUSE_SCRATCH_HEAD
        return ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD;
      case 103: //PAUSE_BORED
        return ModuleCreatureAnimState.PAUSE_BORED;
      case 104: //SALUTE
        return ModuleCreatureAnimState.SALUTE;
      case 105: //BOW
        return ModuleCreatureAnimState.BOW;
      case 106: //GREETING
        return ModuleCreatureAnimState.GREETING;
      case 107: //TAUNT
        return ModuleCreatureAnimState.TAUNT;
      case 108: //VICTORY1
        return ModuleCreatureAnimState.VICTORY;
      case 109: //VICTORY2
        return ModuleCreatureAnimState.VICTORY;
      case 110: //VICTORY3
        return ModuleCreatureAnimState.VICTORY;
      case 112: //INJECT
        return ModuleCreatureAnimState.INJECT;
      case 113: //USE_COMPUTER
        return ModuleCreatureAnimState.USE_COMPUTER;
      case 114: //PERSUADE
        return ModuleCreatureAnimState.PERSUADE;
      case 115: //ACTIVATE
        return ModuleCreatureAnimState.ACTIVATE_ITEM;
      case 116: //CHOKE
        return ModuleCreatureAnimState.CHOKE;
      case 117: //THROW_HIGH
        return ModuleCreatureAnimState.THROW_HIGH;
      case 118: //THROW_LOW
        return ModuleCreatureAnimState.THROW_LOW;
      case 119: //CUSTOM01
        return ModuleCreatureAnimState.CUSTOM01;
      case 120: //TREAT_INJURED
        return ModuleCreatureAnimState.TREAT_INJURED;

      // Placeable animation constants
      case 200: 
        return ModulePlaceable.AnimState.ACTIVATE;
      case 201: 
        return ModulePlaceable.AnimState.DEACTIVATE;
      case 202: 
        return ModulePlaceable.AnimState.OPEN;
      case 203: 
        return ModulePlaceable.AnimState.CLOSE;
      case 204: 
        return ModulePlaceable.AnimState.ANIMLOOP01;
      case 205: 
        return ModulePlaceable.AnimState.ANIMLOOP02;
      case 206: 
        return ModulePlaceable.AnimState.ANIMLOOP03;
      case 207: 
        return ModulePlaceable.AnimState.ANIMLOOP04;
      case 208: 
        return ModulePlaceable.AnimState.ANIMLOOP05;
      case 209: 
        return ModulePlaceable.AnimState.ANIMLOOP06;
      case 210: 
        return ModulePlaceable.AnimState.ANIMLOOP07;
      case 211: 
        return ModulePlaceable.AnimState.ANIMLOOP08;
      case 212: 
        return ModulePlaceable.AnimState.ANIMLOOP09;
      case 213: 
        return ModulePlaceable.AnimState.ANIMLOOP10;

    }

    //console.error('Animation case missing', id);
    return ModuleCreatureAnimState.PAUSE;
  }

  setFacing(facing = 0, instant = false){
    let diff = this.rotation.z - facing;
    this.wasFacing = Utility.NormalizeRadian(this.rotation.z);
    this.facing = Utility.NormalizeRadian(facing);//Utility.NormalizeRadian(this.rotation.z - diff);
    this.facingTweenTime = 0;
    this.facingAnim = true;

    if(instant){
      this.rotation.z = this.wasFacing = Utility.NormalizeRadian(this.facing);
      this.facingAnim = false;
    }
  }

  onHover(){
    
  }

  onClick(){

  }

  triggerUserDefinedEvent( event = undefined ){
    if(this instanceof ModuleArea || this instanceof Module){
      //return;
    }

    if(event instanceof NWScriptEvent){
      if(this.scripts.onUserDefined instanceof NWScriptInstance){
        //console.log('triggerUserDefinedEvent', this.getTag(), this.scripts.onUserDefined.name, nValue, this);
        let instance = this.scripts.onUserDefined.nwscript.newInstance();
        instance.run(this, parseInt(event.getInt(0)));
      }
    }
  }

  triggerSpellCastAtEvent( event = undefined ){
    if(this instanceof ModuleArea || this instanceof Module){
      //return;
    }

    if(event instanceof NWScriptEvent){
      if(this.scripts.onSpellAt instanceof NWScriptInstance){
        let instance = this.scripts.onSpellAt.nwscript.newInstance();
        instance.lastSpellCaster = event.getObject(0);
        instance.lastSpell = event.getInt(0);
        instance.lastSpellHarmful = event.getInt(1) ? 1 : 0;
        instance.run(this);
      }
    }
  }

  scriptEventHandler( event = undefined ){
    if(event instanceof NWScriptEvent){
      switch(event.type){
        case NWScriptEventType.EventUserDefined:
          this.triggerUserDefinedEvent( event );
        break;
        case NWScriptEventType.EventSpellCastAt:
          this.triggerSpellCastAtEvent( event );
        break;
        default:
          console.error('scriptEventHandler', 'Unhandled Event', event, this);
        break;
      }
    }
  }

  triggerHeartbeat(){
    //Only allow the heartbeat script to run after the onspawn is called
    if(this.spawned === true && GameState.module.readyToProcessEvents){
      //if(this.getLocalBoolean(28) == true){
        if(this.scripts.onHeartbeat instanceof NWScriptInstance){
          //console.log('heartbeat', this.getName());
          let instance = this.scripts.onHeartbeat.nwscript.newInstance();
          if(PartyManager.party.indexOf(this) > -1){
            instance.run(this, 2001);
          }else{
            instance.run(this, 1001);
          }
        }
      //}
    }
  }

  initEffects(){
    for(let i = 0, len = this.effects.length; i < len; i++){
      let effect = this.effects[i];
      if(effect instanceof GameEffect){
        effect.initialize();
        //effect.setCreator(this);
        effect.setAttachedObject(this);
        effect.onApply(this);
      }
    }
  }

  async onSpawn(runScript = true){
    if(runScript && this.scripts.onSpawn instanceof NWScriptInstance){
      await this.scripts.onSpawn.run(this, 0);
      console.log('spawned', this.getName());
    }
    
    this.spawned = true;

    if(this instanceof ModuleCreature){
      const eRacialType = new EffectRacialType();
      eRacialType.setSubType(GameEffectDurationType.INNATE);
      eRacialType.setSkipOnLoad(true);
      eRacialType.setInt(0, this.getRace());
      this.addEffect(eRacialType);
      
      this.initPerceptionList();
      this.updateCollision();
    }
    
    this.initEffects();

    if(!(this instanceof ModuleDoor)){
      if(this.model instanceof THREE.Object3D)
        this.box.setFromObject(this.model);
    }

  }

  addItem(template = new GFFObject(), onLoad = null){
    let item = undefined;
    if(template instanceof GFFObject){
      item = new ModuleItem(template);
    }else if(template instanceof ModuleItem){
      item = template;
    }

    if(item instanceof ModuleItem){
      item.Load( () => {
        //console.log('LOADED')
        let hasItem = this.getItem(item.getTag());
        if(hasItem){
          hasItem.setStackSize(hasItem.getStackSize() + 1);
          if(typeof onLoad === 'function')
            onLoad(hasItem);
        }else{
          this.inventory.push(item);
          if(typeof onLoad === 'function')
            onLoad(item);
        }
      });
    }else{
      throw 'You can only add an item of type ModuleItem to an inventory';
    }
  }

  removeItem(resRef = '', nCount = 1){
    let item = this.getItem(resRef);
    let idx = this.inventory.indexOf(item);
    if(item){
      if(nCount < item.getStackSize()){
        item.setStackSize(item.getStackSize() - nCount);
      }else{
        this.inventory.splice(idx, 1);
      }
    }
  }

  getItem(resRef = ''){
    for(let i = 0; i<this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag() == resRef)
        return item;
    }
    return false;
  }

  updateCollision(delta=0){
    //START Gravity

    /*let playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( new THREE.Vector3(0, 0, 0.25) ) ) );
    GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    
    //this.position.z += (-10 * delta);
    playerFeetRay.z += 10;
    
    GameState.raycaster.ray.direction.set(0, 0,-1);
    
    let intersects = GameState.raycaster.intersectObjects( GameState.walkmeshList );
    if ( intersects.length > 0 ) {
      if(intersects[ 0 ].distance < 0.5) {
        let faceIdx = intersects[0].faceIndex;
        let walkableType = intersects[0].object.wok.walkTypes[faceIdx];
        let pDistance = 0.25 - intersects[ 0 ].distance;
        this.position.z = intersects[ 0 ].point.z;
      }
    }

    //START: PLAYER WORLD COLLISION

    playerFeetRay = new THREE.Vector3().copy( this.position.clone().add( ( new THREE.Vector3(0, 0, 0.25) ) ) );

    for(let i = 0; i < 360; i += 36) {
      GameState.raycaster.ray.direction.set(Math.cos(i), Math.sin(i),-1);
      GameState.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      let intersects = GameState.raycaster.intersectObjects( GameState.walkmeshList );
      if ( intersects.length > 0 ) {
        if(intersects[ 0 ].distance < 0.5){
          let faceIdx = intersects[0].faceIndex;
          if(intersects[0].object.wok.walkTypes[faceIdx] == 7){
            let pDistance = 0.5 - intersects[ 0 ].distance;
            this.position.sub( new THREE.Vector3( pDistance * Math.cos(i), pDistance * Math.sin(i), 0 ) );
          }
        }
      }
    }
    
    //END: PLAYER WORLD COLLISION

    //END Gravity
    */
  }

  doCommand(script){
    //console.log('doCommand', this.getTag(), script, action, instruction);
    let action = new ActionDoCommand();
    action.setParameter(0, ActionParameterType.SCRIPT_SITUATION, script);
    this.actionQueue.add(action);
  }

  isDead(){
    return this.getHP() <= 0;
  }

  damage(amount = 0, oAttacker = undefined){
    this.subtractHP(amount);
    this.lastDamager = oAttacker;
    this.lastAttacker = oAttacker;
    this.onDamage();
  }

  onDamage(){
    if(this.isDead())
      return true;

    if(this.scripts.onDamaged instanceof NWScriptInstance){
      this.scripts.onDamaged.run(this);
    }
  }

  getCurrentRoom(){
    if(this instanceof ModuleDoor){
      this.room = undefined;
      let aabbFaces = [];
      let meshesSearch;// = GameState.octree_walkmesh.search( GameState.raycaster.ray.origin, 10, true, GameState.raycaster.ray.direction );
      let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );
      let box = this.model.box.clone();

      this.rooms = [];
      for(let i = 0; i < GameState.module.area.rooms.length; i++){
        let room = GameState.module.area.rooms[i];
        let model = room.model;
        if(model instanceof OdysseyModel3D){
          let pos = this.position.clone();
          if(model.box.containsPoint(pos)){
            this.rooms.push(i);
          }
        }
      }

      if(box){
        for(let j = 0, jl = this.rooms.length; j < jl; j++){
          let room = GameState.module.area.rooms[this.rooms[j]];
          if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
            aabbFaces.push({
              object: room, 
              faces: room.walkmesh.getAABBCollisionFaces(box)
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
        intersects = castableFaces.object.walkmesh.raycast(GameState.raycaster, castableFaces.faces) || [];
        
        if(intersects.length){
          if(this == GameState.player){
            //console.log(intersects);
          }
          if(intersects[0].object.moduleObject){
            this.attachToRoom(intersects[0].object.moduleObject);
            return;
          }
        }
      }
      if(this.rooms.length){
        this.attachToRoom(GameState.module.area.rooms[this.rooms[0]]);
        return;
      }
    }else{
      this.findWalkableFace();
    }
  }

  findWalkableFace(){
    let face;
    let room;
    for(let i = 0, il = GameState.module.area.rooms.length; i < il; i++){
      room = GameState.module.area.rooms[i];
      if(room.walkmesh){
        for(let j = 0, jl = room.walkmesh.walkableFaces.length; j < jl; j++){
          face = room.walkmesh.walkableFaces[j];
          if(face.triangle.containsPoint(this.position)){
            this.groundFace = face;
            this.lastGroundFace = this.groundFace;
            this.surfaceId = this.groundFace.walkIndex;
            this.attachToRoom(room);
            face.triangle.closestPointToPoint(this.position, this.wm_c_point);
            this.position.z = this.wm_c_point.z + .005;
          }
        }
      }
    }
    return face;
  }

  getCameraHeight(){
    return 1.5;
  }

  isInConversation(){
    return GameState.inDialog && (GameState.InGameDialog.owner == this || GameState.InGameDialog.listener == this);
  }

  applyVisualEffect(resref = 'v_light'){
    if(this.model instanceof OdysseyModel3D){
      GameState.ModelLoader.load({
        file: resref,
        onLoad: (mdl) => {
          OdysseyModel3D.FromMDL(mdl, { 
            onComplete: (effectMDL) => {
              this.model.effects.push(effectMDL);
              this.model.add(effectMDL);
              //TextureLoader.LoadQueue();
              effectMDL.playAnimation(0, false, () => {
                effectMDL.stopAnimation();
                this.model.remove(effectMDL);
                effectMDL.disableEmitters();
                setTimeout( () => {
                  let index = this.model.effects.indexOf(effectMDL);
                  effectMDL.dispose();
                  this.model.effects.splice(index, 1);
                }, 5000);
              })
            },
            manageLighting: false
          });
        }
      });
    }
  }

  destroy(){
    try{
      //console.log('ModuleObject.destory', this)

      if(this.model instanceof OdysseyModel3D){
        if(this.model.parent instanceof THREE.Object3D){
          this.model.parent.remove(this.model);
        }
        this.model.dispose();
        this.model = undefined;
      }

      if(this.mesh instanceof THREE.Mesh){

        if(this.mesh.parent instanceof THREE.Object3D){
          this.mesh.parent.remove(this.mesh);
        }

        this.mesh.material.dispose();
        this.mesh.geometry.dispose();

        this.mesh.material = undefined;
        this.mesh.geometry = undefined;
        this.mesh = undefined;
      }

      if(GameState.module){
        if(this instanceof ModuleCreature){
          let cIdx = GameState.module.area.creatures.indexOf(this);
          //console.log('ModuleObject.destory', 'creature', cIdx)
          if(cIdx > -1){
            GameState.module.area.creatures.splice(cIdx, 1);
          }
          FactionManager.RemoveCreatureFromFaction(this);
        }else if(this instanceof ModulePlaceable){
          let pIdx = GameState.module.area.placeables.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            GameState.module.area.placeables.splice(pIdx, 1);

            try{
              let wmIdx = GameState.walkmeshList.indexOf(this.walkmesh.mesh);
              GameState.walkmeshList.splice(wmIdx, 1);
              GameState.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleRoom){
          let pIdx = GameState.module.area.rooms.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            let room = GameState.module.area.rooms.splice(pIdx, 1)[0];
            
            if(room.walkmesh)
              room.walkmesh.dispose();

            try{
              let wmIdx = GameState.walkmeshList.indexOf(this.walkmesh.mesh);
              GameState.walkmeshList.splice(wmIdx, 1);
              GameState.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleDoor){
          let pIdx = GameState.module.area.doors.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            GameState.module.area.doors.splice(pIdx, 1);

            try{
              let wmIdx = GameState.walkmeshList.indexOf(this.walkmesh.mesh);
              GameState.walkmeshList.splice(wmIdx, 1);
              GameState.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}
            
          }
        }else if(this instanceof ModuleTrigger){
          let pIdx = GameState.module.area.triggers.indexOf(this);
          //console.log('ModuleObject.destory', 'trigger', pIdx)
          if(pIdx > -1){
            GameState.module.area.triggers.splice(pIdx, 1);            
          }
        }else if(this instanceof ModuleEncounter){
          let pIdx = GameState.module.area.encounters.indexOf(this);
          //console.log('ModuleObject.destory', 'trigger', pIdx)
          if(pIdx > -1){
            GameState.module.area.encounters.splice(pIdx, 1);            
          }
        }else if(this instanceof ModuleItem){
          if(this.placedInWorld){
            let pIdx = GameState.module.area.items.indexOf(this);
            if(pIdx > -1){
              GameState.module.area.items.splice(pIdx, 1);            
            }
          }
        }else{
          console.log('ModuleObject.destory', 'not supported '+this.constructor.name)
        }
      }else{
        console.log('ModuleObject.destory', 'No module')
      }

      clearTimeout(this.heartbeatTimer);

      //Remove the object from the global list of objects
      if(this.id >= 1 && ModuleObject.List.has(this.id)){
        ModuleObject.List.delete(this.id);
      }

    }catch(e){
      console.error('ModuleObject.destory', e);
    }
  }

  setPosition(x = 0, y = 0, z = 0){

    if(x instanceof THREE.Vector3){
      z = x.z;
      y = x.y;
      x = x.x;
    }

    try{
      if(this.model instanceof OdysseyModel3D){
        this.model.position.set(x, y, z);
        this.computeBoundingBox();
      }

      this.position.set(x, y, z);

      if(this instanceof ModuleCreature)
        this.updateCollision();
    }catch(e){
      console.error('ModuleObject.setPosition failed ');
    }
  }

  getPosition(){
    try{
      return this.position.clone();
    }catch(e){
      console.error('ModuleObject', e);
      return new THREE.Vector3(0);
    }
  }

  GetOrientation(){
    try{
      return this.rotation.clone();
    }catch(e){
      return new THREE.Euler();
    }
  }

  GetFacing(){
    try{
      return this.rotation.z;
    }catch(e){
      return 0;
    }
  }

  setFacingObject( target = undefined ){

  }

  GetRotation(){
    return Math.floor(this.GetFacing() * 180) + 180;
  }

  GetLocation(){
    let rotation = this.GetRotationFromBearing();

    let location = new GameState.Location(
      this.position.x, this.position.y, this.position.z,
      rotation.x, rotation.y, rotation.z,
      Game?.module?.area
    );

    return location;
  }

  GetRotationFromBearing( bearing = undefined ){
    let theta = this.rotation.z * Math.PI;

    if(typeof bearing == 'number')
      theta = bearing * Math.PI;

    return new THREE.Vector3(
      1 * Math.cos(theta),
      1 * Math.sin(theta),
      0
    );
  }

  lookAt(){
    return false;
  }

  isStatic(){
    return false;
  }

  isUseable(){
    return false;
  }

  HasTemplate(){
    return (typeof this.template !== 'undefined');
  }

  GetConversation(){
    if(this.template.RootNode.HasField('Conversation')){
      return this.template.RootNode.GetFieldByLabel('Conversation').GetValue();
    }

    return '';
  }

  GetObjectTag(){
    if(this.HasTemplate()){
      if(typeof this.template.json.fields.Tag !== 'undefined')
        return this.template.json.fields.Tag.value;

    }

    return '';
  }

  getFortitudeSave(){
    return this.fortitudeSaveThrow;
  }

  getReflexSave(){
    return this.reflexSaveThrow;
  }

  getWillSave(){
    return this.willSaveThrow;
  }

  fortitudeSave(nDC = 0, nSaveType = 0, oVersus = undefined){
    let roll = CombatEngine.DiceRoll(1, 'd20');
    let bonus = CombatEngine.GetMod(this.getCON());
    
    if((roll + this.getFortitudeSave() + bonus) > nDC){
      return 1
    }

    return 0;
  }

  reflexSave(nDC = 0, nSaveType = 0, oVersus = undefined){
    let roll = CombatEngine.DiceRoll(1, 'd20');
    let bonus = CombatEngine.GetMod(this.getDEX());
    
    if((roll + this.getReflexSave() + bonus) > nDC){
      return 1
    }

    return 0;
  }

  willSave(nDC = 0, nSaveType = 0, oVersus = undefined){
    let roll = CombatEngine.DiceRoll(1, 'd20');
    let bonus = CombatEngine.GetMod(this.getWIS());

    if((roll + this.getWillSave() + bonus) > nDC){
      return 1
    }

    return 0;
  }

  addEffect(effect, type = 0, duration = 0){
    if(effect instanceof GameEffect){
      if(effect instanceof EffectLink){
        //EFFECT LEFT
        //console.log('addEffect', 'LinkEffect->Left', effect.effect1, this);
        if(effect.effect1 instanceof GameEffect){
          effect.effect1.setDurationType(type);
          effect.effect1.setDuration(duration);
          this.addEffect(effect.effect1, type, duration);
        }

        //EFFECT RIGHT
        //console.log('addEffect', 'LinkEffect->Right', effect.effect2, this);
        if(effect.effect2 instanceof GameEffect){
          effect.effect2.setDurationType(type);
          effect.effect2.setDuration(duration);
          this.addEffect(effect.effect2, type, duration);
        }
      }else{
        //console.log('AddEffect', 'GameEffect', effect, this);
        //effect.setDurationType(type);
        //effect.setDuration(duration);
        //effect.setCreator(this); //Setting creator here causes Item effects to reference the wrong object
        effect.setAttachedObject(this);
        effect.onApply(this);
        this.effects.push(effect);
      }
    }else{
      console.warn('AddEffect', 'Invalid GameEffect', effect);
    }
  }

  getEffect(type = -1){
    for(let i = 0; i < this.effects.length; i++){
      if(this.effects[i].type == type){
        return this.effects[i];
      }
    }
    return undefined;
  }

  hasEffect(type = -1){
    return this.getEffect(type) ? true : false;
  }

  removeEffectsByCreator( oCreator = undefined ){
    if(oCreator instanceof ModuleObject){
      let eIndex = this.effects.length - 1;
      let effect = this.effects[eIndex];
      while(effect){
        if(effect.getCreator() == oCreator){
          let index = this.effects.indexOf(effect);
          if(index >= 0){
            this.effects.splice(index, 1)[0].onRemove();
          }
        }
        effect = this.effects[--eIndex];
      }
    }
  }

  removeEffectsByType(type = -1){
    let effect = this.getEffect(type);
    while(effect){
      let index = this.effects.indexOf(effect);
      if(index >= 0){
        this.effects.splice(index, 1)[0].onRemove();
      }
      effect = this.getEffect(type);
    }
  }

  removeEffect(type = -1){
    if(type instanceof GameEffect){
      let arrIdx = this.effects.indexOf(type);
      if(arrIdx >= 0){
        this.effects.splice(arrIdx, 1)[0].onRemove();
      }
    }else{
      this.removeEffectsByType(type);
    }
  }

  JumpToLocation(lLocation){
    console.log('JumpToLocation', lLocation, this);
    if(typeof lLocation === 'object'){
      if(this.model instanceof OdysseyModel3D){
        this.model.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );
        this.computeBoundingBox();
      }

      this.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );
      this.groundFace = undefined;
      this.lastGroundFace = undefined;

      if(this instanceof ModuleCreature)
        this.updateCollision();
    }
  }

  FacePoint(vPoint=new THREE.Vector3){
    let tangent = vPoint.clone().sub(this.position.clone());
    let atan = Math.atan2(-tangent.y, -tangent.x);
    this.setFacing(atan + Math.PI/2, true);
  }

  getXPosition(){
    if(this.template.RootNode.HasField('XPosition')){
      return this.template.RootNode.GetFieldByLabel('XPosition').GetValue();
    }
    return 0;
  }

  getYPosition(){
    if(this.template.RootNode.HasField('YPosition')){
      return this.template.RootNode.GetFieldByLabel('YPosition').GetValue();
    }
    return 0;
  }

  getZPosition(){
    if(this.template.RootNode.HasField('ZPosition')){
      return this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();
    }
    return 0;
  }

  getXOrientation(){
    if(this.template.RootNode.HasField('XOrientation')){
      return this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();
    }
    return 0;
  }

  getYOrientation(){
    if(this.template.RootNode.HasField('XOrientation')){
      return this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();
    }
    return 0;
  }

  getZOrientation(){
    if(this.template.RootNode.HasField('ZOrientation')){
      return this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();
    }
    return 0;
  }

  GetRotation(){
    if(this.model){
      return Math.floor(this.model.rotation.z * 180) + 180
    }
    return 0;
  }

  getLinkedToModule(){
    return this.linkedToModule;
  }

  getLinkedToFlags(){
    return this.linkedToFlags;
  }

  getLinkedTo(){
    return this.linkedTo;
  }

  getTransitionDestin(){
    if(this.transitionDestin instanceof CEXoLocString){
      return this.transitionDestin.GetValue();
    }
    return '';
  }

  getPortraitId(){
    if(this.template.RootNode.HasField('PortraitId')){
      return this.template.RootNode.GetFieldByLabel('PortraitId').GetValue();
    }
    return 0;
  }

  getKeyName(){
    if(this.template.RootNode.HasField('KeyName')){
      return this.template.RootNode.RootNode.GetFieldByLabel('KeyName').GetValue();
    }
    return null;
  }

  getTag(){

    if(this.tag){
      return this.tag
    }else if(this.template.RootNode.HasField('Tag')){
      return this.template.RootNode.GetFieldByLabel('Tag').GetValue()
    }
    return '';
  }

  getTemplateResRef(){
    if(this.template.RootNode.HasField('TemplateResRef')){
      return this.template.RootNode.GetFieldByLabel('TemplateResRef').GetValue()
    }
    return null;
  }

  getResRef(){
    if(this.template.RootNode.HasField('ResRef')){
      return this.template.RootNode.GetFieldByLabel('ResRef').GetValue()
    }
    return null;
  }

  setTemplateResRef(sRef=''){
    if(this.template.RootNode.HasField('TemplateResRef')){
      this.template.RootNode.GetFieldByLabel('TemplateResRef').SetValue(sRef)
    }else{
      this.template.RootNode.AddField( new GFFField(GFFDataType.RESREF, 'TemplateResRef') ).SetValue(sRef)
    }
    
  }

  setHP(nVal = 0){
    this.currentHP = nVal;
  }

  addHP(nVal = 0){
    this.currentHP = (this.getHP() + nVal);
  }

  subtractHP(nVal = 0){
    this.setHP(this.getHP() - nVal);
  }

  getHP(){
    return this.currentHP;
  }

  getMaxHP(){
    return this.hp;
  }

  setMaxHP(nVal = 0){
    return this.hp = nVal;
  }

  setMinOneHP(iVal){
    this.min1HP = iVal ? true : false;
  }

  isPartyMember(){
    return PartyManager.party.indexOf(this) >= 0;
  }

  hasItem(sTag=''){
    sTag = sTag.toLowerCase();
    if(this.isPartyMember()){
      return InventoryManager.getItem(sTag);
    }else{
      return undefined;
    }

  }

  getGold(){
    return 0;
  }

  computeBoundingBox(){
    if(this.model){
      if(!this.model.box){
        this.model.box = new THREE.Box3();
      }

      if(!(this instanceof ModuleDoor)){
        this.box = this.box.setFromObject(this.model);
        //this.sphere = this.box.getBoundingSphere(this.sphere);
      }
    }
  }

  isOnScreen(frustum = GameState.viewportFrustum){
    if(!(this instanceof ModuleTrigger) && !(this instanceof ModuleDoor)){
      if(this.model && this.model.box != this.box){
        this.box = this.model.box;
      }
    }

    if(GameState.scene.fog && !(this instanceof ModuleDoor)){
      if(this.distanceToCamera >= GameState.scene.fog.far){
        return false;
      }
    }

    if(APP_MODE == 'FORGE'){
      if(tabManager.currentTab instanceof ModuleEditorTab){
        frustum = tabManager.currentTab.viewportFrustum;
        this.box.getBoundingSphere(this.sphere);
        return frustum.intersectsSphere(this.sphere);
      }
      return false;
    }else{
      this.box.getBoundingSphere(this.sphere);
      return frustum.intersectsSphere(this.sphere);
    }
  }





  setListening(bListenting = false){
    this.isListening = bListenting ? true : false;;
  }

  setListeningPattern(sString = '', iNum = 0){
    this.listeningPatterns[sString] = iNum;
  }

  getIsListening(){
    return this.isListening ? true : false;
  }






  getLocalBoolean(iNum){
    return this._locals.Booleans[iNum] ? 1 : 0;
  }

  getLocalNumber(iNum){
    return this._locals.Numbers[iNum] ? this._locals.Numbers[iNum] : 0;
  }

  setLocalBoolean(iNum, bVal){
    this._locals.Booleans[iNum] = bVal ? 1 : 0;
  }

  setLocalNumber(iNum, iVal){
    this._locals.Numbers[iNum] = iVal;
  }

  AssignCommand(command = 0){

  }

  isHostile(target = undefined){
    return FactionManager.IsHostile(this, target);
  }

  isNeutral(target = undefined){
    return FactionManager.IsNeutral(this, target);
  }

  isFriendly(target = undefined){
    return FactionManager.IsFriendly(this, target);
  }

  getReputation(target){
    return FactionManager.GetReputation(this, target);
  }

  getPerceptionRangePrimary(){
    let range = Global.kotor2DA.ranges.rows[this.perceptionRange];
    if(range){
      return parseInt(range.primaryrange);
    }
    return 1;
  }

  getPerceptionRangeSecondary(){
    let range = Global.kotor2DA.ranges.rows[this.perceptionRange];
    if(range){
      return parseInt(range.secondaryrange);
    }
    return 1;
  }

  initPerceptionList(){
    let length = this.perceptionList.length;
    while(length--){
      let perceptionObject = this.perceptionList[length];
      if(perceptionObject){
        if(typeof perceptionObject.object == 'undefined' && perceptionObject.objectId){
          perceptionObject.object = ModuleObject.GetObjectById(perceptionObject.objectId);
          if(!(perceptionObject.object instanceof ModuleObject)){
            this.perceptionList.splice(length, 1);
          }
        }
      }
    }
  }

  notifyPerceptionHeardObject(object = undefined, heard = false){
    if(object instanceof ModuleCreature){
      let triggerOnNotice = false;
      let perceptionObject;
      let exists = this.perceptionList.filter( (o) => o.object == object );
      if(exists.length){
        let existingObject = exists[0];
        triggerOnNotice = (existingObject.heard != heard);
        existingObject.hasHeard = existingObject.hasHeard ? true : (existingObject.heard == heard ? true : false);
        existingObject.heard = heard;
        perceptionObject = existingObject;
      }else{
        if(heard){
          let newObject = {
            object: object,
            heard: heard,
            seen: false,
            hasSeen: false,
            hasHeard: false
          };
          this.perceptionList.push(newObject);
          perceptionObject = newObject;
          triggerOnNotice = true;
        }
      }

      if(triggerOnNotice && this.scripts.onNotice instanceof NWScriptInstance){
        //console.log('notifyPerceptionHeardObject', heard, this, object);
        let instance = this.scripts.onNotice.nwscript.newInstance();
        instance.lastPerceived = perceptionObject;
        instance.run(this);
        return true;
      }
      
    }
  }

  notifyPerceptionSeenObject(object = undefined, seen = false){
    if(object instanceof ModuleCreature){
      let triggerOnNotice = false;
      let perceptionObject;
      let exists = this.perceptionList.filter( (o) => o.object == object );
      if(exists.length){
        let existingObject = exists[0];
        triggerOnNotice = (existingObject.seen != seen);
        existingObject.hasSeen = existingObject.seen == seen;
        existingObject.seen = seen;
        perceptionObject = existingObject;
      }else{
        if(seen){
          let newObject = {
            object: object,
            heard: false,
            seen: seen,
            hasSeen: false,
            hasHeard: false
          };
          this.perceptionList.push(newObject);
          perceptionObject = newObject;
          triggerOnNotice = true;
        }
      }

      if(triggerOnNotice && this.scripts.onNotice instanceof NWScriptInstance){
        //console.log('notifyPerceptionSeenObject', seen, this.getName(), object.getName());
        let instance = this.scripts.onNotice.nwscript.newInstance();
        instance.lastPerceived = perceptionObject;
        instance.run(this);
        return true;
      }

    }
  }

  hasLineOfSight(oTarget = null, max_distance = 30){
    if(!this.spawned || !GameState.module.readyToProcessEvents)
      return false;
    //return false;
    if(oTarget instanceof ModuleObject){
      let position_a = this.position.clone();
      let position_b = oTarget.position.clone();
      position_a.z += 1;
      position_b.z += 1;
      let direction = position_b.clone().sub(position_a).normalize();
      let distance = position_a.distanceTo(position_b);

      if(this.perceptionRange){
        if(distance > this.getPerceptionRangePrimary()){
          return;
        }
        max_distance = this.getPerceptionRangePrimary();
      }else{
        if(distance > 50)
          return;
      }

      GameState.raycaster.ray.origin.copy(position_a);
      GameState.raycaster.ray.direction.copy(direction);
      GameState.raycaster.far = max_distance;

      let aabbFaces = [];
      let meshesSearch;// = GameState.octree_walkmesh.search( GameState.raycaster.ray.origin, 10, true, GameState.raycaster.ray.direction );
      let intersects;// = GameState.raycaster.intersectOctreeObjects( meshesSearch );

      let doors = [];

      for(let j = 0, jl = GameState.module.area.rooms.length; j < jl; j++){
        let room = GameState.module.area.rooms[j];
        if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
          aabbFaces.push({
            object: room, 
            faces: room.walkmesh.faces
          });
        }
      }

      for(let j = 0, jl = GameState.module.area.doors.length; j < jl; j++){
        let door = GameState.module.area.doors[j];
        if(door && door != this && !door.isOpen()){
          let box3 = door.box;
          if(box3){
            if(GameState.raycaster.ray.intersectsBox(box3) || box3.containsPoint(position_a)){
              return false;
            }
          }
        }
      }


      for(let i = 0, il = aabbFaces.length; i < il; i++){
        let castableFaces = aabbFaces[i];
        intersects = castableFaces.object.walkmesh.raycast(GameState.raycaster, castableFaces.faces);
        if (intersects && intersects.length > 0 ) {
          for(let j = 0; j < intersects.length; j++){
            if(intersects[j].distance < distance){
              return false;
            }
          }
        }
      }

      return true;
    }else{
      return false;
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
    
    if(this.template.RootNode.HasField('Animation'))
      this.animState = this.template.GetFieldByLabel('Animation').GetValue();
    
    if(this.template.RootNode.HasField('Appearance'))
      this.appearance = this.template.GetFieldByLabel('Appearance').GetValue();
    
    if(this.template.RootNode.HasField('Description'))
      this.description = this.template.GetFieldByLabel('Description').GetCExoLocString();
    
    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

    if(this.template.RootNode.HasField('Commandable'))
      this.commandable = this.template.GetFieldByLabel('Commandable').GetValue();

    if(this.template.RootNode.HasField('Cursor'))
      this.cursor = this.template.GetFieldByLabel('Cursor').GetValue();

    if(this.template.RootNode.HasField('Faction')){
      this.faction = this.template.GetFieldByLabel('Faction').GetValue();
      if((this.faction & 0xFFFFFFFF) == -1){
        this.faction = 0;
      }
    }

    if(this.template.RootNode.HasField('Geometry')){
      this.geometry = this.template.GetFieldByLabel('Geometry').GetChildStructs();

      //Push verticies
      for(let i = 0; i < this.geometry.length; i++){
        let tgv = this.geometry[i];
        this.vertices[i] = new THREE.Vector3( 
          tgv.GetFieldByLabel('PointX').GetValue(),
          tgv.GetFieldByLabel('PointY').GetValue(),
          tgv.GetFieldByLabel('PointZ').GetValue()
        );
      }
    }

    if(this.template.RootNode.HasField('HasMapNote'))
      this.hasMapNote = this.template.GetFieldByLabel('HasMapNote').GetValue();

    if(this.template.RootNode.HasField('HighlightHeight'))
      this.highlightHeight = this.template.GetFieldByLabel('HighlightHeight').GetValue();

    if(this.template.RootNode.HasField('KeyName'))
      this.keyName = this.template.GetFieldByLabel('KeyName').GetValue();

    if(this.template.RootNode.HasField('LinkedTo'))
      this.linkedTo = this.template.GetFieldByLabel('LinkedTo').GetValue();

    if(this.template.RootNode.HasField('LinkedToFlags'))
      this.linkedToFlags = this.template.GetFieldByLabel('LinkedToFlags').GetValue();
  
    if(this.template.RootNode.HasField('LinkedToModule'))
      this.linkedToModule = this.template.RootNode.GetFieldByLabel('LinkedToModule').GetValue();
        
    if(this.template.RootNode.HasField('LoadScreenID'))
      this.loadScreenID = this.template.GetFieldByLabel('LoadScreenID').GetValue();

    if(this.template.RootNode.HasField('LocName'))
      this.locName = this.template.GetFieldByLabel('LocName').GetCExoLocString();

    if(this.template.RootNode.HasField('LocalizedName'))
      this.localizedName = this.template.GetFieldByLabel('LocalizedName').GetCExoLocString();

    if(this.template.RootNode.HasField('MapNote'))
      this.mapNote = this.template.GetFieldByLabel('MapNote').GetCExoLocString();

    if(this.template.RootNode.HasField('MapNoteEnabled'))
      this.mapNoteEnabled = this.template.GetFieldByLabel('MapNoteEnabled').GetValue();

    if(this.template.RootNode.HasField('PortraidId'))
      this.portraidId = this.template.GetFieldByLabel('PortraidId').GetValue();

    if(this.template.RootNode.HasField('SetByPlayerParty'))
      this.setByPlayerParty = this.template.GetFieldByLabel('SetByPlayerParty').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('TransitionDestin'))
      this.transitionDestin = this.template.GetFieldByLabel('TransitionDestin').GetCExoLocString();

    if(this.template.RootNode.HasField('TrapDetectable'))
      this.trapDetectable = this.template.RootNode.GetFieldByLabel('TrapDetectable').GetValue();

    if(this.template.RootNode.HasField('TrapDisarmable'))
      this.trapDisarmable = this.template.RootNode.GetFieldByLabel('TrapDisarmable').GetValue();

    if(this.template.RootNode.HasField('TrapOneShot'))
      this.trapOneShot = this.template.GetFieldByLabel('TrapOneShot').GetValue();

    if(this.template.RootNode.HasField('TrapType'))
      this.trapType = this.template.GetFieldByLabel('TrapType').GetValue();

    if(this.template.RootNode.HasField('Type'))
      this.type = this.template.GetFieldByLabel('Type').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.xPosition = this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.yPosition = this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.zPosition = this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('XOrientation'))
      this.xOrientation = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

    if(this.template.RootNode.HasField('YOrientation'))
      this.yOrientation = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

    if(this.template.RootNode.HasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();
      
    if(this.template.RootNode.HasField('FortSaveThrow'))
      this.fortitudeSaveThrow = this.template.RootNode.GetFieldByLabel('FortSaveThrow').GetValue();

    if(this.template.RootNode.HasField('RefSaveThrow'))
      this.reflexSaveThrow = this.template.RootNode.GetFieldByLabel('RefSaveThrow').GetValue();

    if(this.template.RootNode.HasField('WillSaveThrow'))
      this.willSaveThrow = this.template.RootNode.GetFieldByLabel('WillSaveThrow').GetValue();

    if(this.template.RootNode.HasField('SWVarTable')){
      let swVarTableStruct = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0];
      if(swVarTableStruct){
        if(swVarTableStruct.HasField('BitArray')){
          let localBools = swVarTableStruct.GetFieldByLabel('BitArray').GetChildStructs();
          for(let i = 0; i < localBools.length; i++){
            let data = localBools[i].GetFieldByLabel('Variable').GetValue();
            for(let bit = 0; bit < 32; bit++){
              this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
            }
          }
        }

        if(swVarTableStruct.HasField('ByteArray')){
          let localNumbers = swVarTableStruct.GetFieldByLabel('ByteArray').GetChildStructs();
          for(let i = 0; i < localNumbers.length; i++){
            let data = localNumbers[i].GetFieldByLabel('Variable').GetValue();
            this.setLocalNumber(i, data);
          }
        }
      }
    }

    this.initialized = true;

  }

  Save(){
    //TODO

    let gff = new GFFObject();

    return gff;

  }

  getSWVarTableSaveStruct(){
    let swVarTableStruct = new GFFStruct();

    let swVarTableBitArray = swVarTableStruct.AddField( new GFFField(GFFDataType.LIST, 'BitArray') );

    for(let i = 0; i < 3; i++){
      let varStruct = new GFFStruct();
      let value = 0;
      let offset = 32 * i;
      for(let j = 0; j < 32; j++){
        if(this.getLocalBoolean(offset + j) == true){
          value |= 1 << j;
        }
      }
      value = value >>> 0;
      varStruct.AddField( new GFFField(GFFDataType.DWORD, 'Variable') ).SetValue( value );
      swVarTableBitArray.AddChildStruct(varStruct);
    }

    let swVarTableByteArray = swVarTableStruct.AddField( new GFFField(GFFDataType.LIST, 'ByteArray') );

    for(let i = 0; i < 8; i++){
      let varStruct = new GFFStruct();
      varStruct.AddField( new GFFField(GFFDataType.BYTE, 'Variable') ).SetValue( Number(this.getLocalNumber(i)) );
      swVarTableByteArray.AddChildStruct(varStruct);
    }
    return swVarTableStruct;
  }

  static TemplateFromJSON(json={}){
    let gff = new GFFObject();
    for(let key in json){
      let field = json[key];
      if(field instanceof Array){
        //TODO
      }else if(typeof field === 'string'){
        gff.RootNode.AddField(
          new GFFField(GFFDataType.RESREF, key, field)
        )
      }else if(typeof field === 'number'){
        gff.RootNode.AddField(
          new GFFField(GFFDataType.INT, key, field)
        )
      }
    }

    return gff;
  }

  toToolsetInstance(){

    let instance = new GFFStruct();
    
    instance.AddField(
      new GFFField(GFFDataType.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XPosition', this.position.x)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'ZPosition', this.position.z)
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'XOrientation', Math.cos(this.rotation.z + (Math.PI/2)))
    );
    
    instance.AddField(
      new GFFField(GFFDataType.FLOAT, 'YOrientation', Math.sin(this.rotation.z + (Math.PI/2)))
    );

    return instance;

  }

  animationConstantToAnimation( animation_constant = 10000 ){

    const debilitatedEffect = this.effects.find( e => e.type == GameEffectType.EffectSetState );
    if(debilitatedEffect){
      switch(debilitatedEffect.getInt(0)){
        case 1: //Confused
          return Global.kotor2DA.animations.rows[15];
        case 2: //Frightened
          return Global.kotor2DA.animations.rows[73];
        case 3: //Droid Stun
          return Global.kotor2DA.animations.rows[270];
        case 4: //Stunned
          return Global.kotor2DA.animations.rows[78];
        case 5: //Paralyzed
          return Global.kotor2DA.animations.rows[78];
        case 6: //Sleep
          return Global.kotor2DA.animations.rows[76];
        case 7: //Choke
          if(this.isSimpleCreature()){
            return Global.kotor2DA.animations.rows[264];
          }else{
            return Global.kotor2DA.animations.rows[72];
          }
        break;
        case 8: //Horrified
          return Global.kotor2DA.animations.rows[74];
        case 9: //Force Pushed
          if(!this.fp_push_played)
            return Global.kotor2DA.animations.rows[84];
          if(!this.fp_land_played)
            return Global.kotor2DA.animations.rows[85];
          if(!this.fp_getup_played)
            return Global.kotor2DA.animations.rows[86];
        break;
        case 10: //Whirlwind
          return Global.kotor2DA.animations.rows[75];
      }
    }
    
    switch( animation_constant ){
      case ModuleCreatureAnimState.PAUSE:
      case ModuleCreatureAnimState.PAUSE_ALT:
        if(this.isPoisoned() || this.isDiseased()) return Global.kotor2DA.animations.rows[15];
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[256];
        }else{
          return Global.kotor2DA.animations.rows[6];
        }
      break;
      case ModuleCreatureAnimState.PAUSE2:
        if(this.isPoisoned() || this.isDiseased()) return Global.kotor2DA.animations.rows[15];
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[257];
        }else{
          return Global.kotor2DA.animations.rows[7];
        }
      break;
      case ModuleCreatureAnimState.PAUSE3:
        if(this.isPoisoned() || this.isDiseased()) return Global.kotor2DA.animations.rows[15];
        return Global.kotor2DA.animations.rows[359];
      break;
      case ModuleCreatureAnimState.PAUSE4:
        if(this.isPoisoned() || this.isDiseased()) return Global.kotor2DA.animations.rows[15];
        return Global.kotor2DA.animations.rows[357];
      break;
      case ModuleCreatureAnimState.PAUSE_SCRATCH_HEAD:
        if(this.isPoisoned()) return Global.kotor2DA.animations.rows[15];
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[12];
        }else{
          return Global.kotor2DA.animations.rows[7];
        }
      break;
      case ModuleCreatureAnimState.PAUSE_BORED:
        return Global.kotor2DA.animations.rows[13];
      break;
      case ModuleCreatureAnimState.PAUSE_TIRED:
        return Global.kotor2DA.animations.rows[14];
      break;
      case ModuleCreatureAnimState.PAUSE_DRUNK:
        return Global.kotor2DA.animations.rows[15];
      break;
      case ModuleCreatureAnimState.PAUSE_INJ:
        return Global.kotor2DA.animations.rows[8];
      break;
      case ModuleCreatureAnimState.DEAD:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[275];
        }else{
          return Global.kotor2DA.animations.rows[81];
        }
      break;
      case ModuleCreatureAnimState.DEAD1:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[275];
        }else{
          return Global.kotor2DA.animations.rows[83];
        }
      break;
      case ModuleCreatureAnimState.DIE:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[274];
        }else{
          return Global.kotor2DA.animations.rows[80];
        }
      break;
      case ModuleCreatureAnimState.DIE1:
        return Global.kotor2DA.animations.rows[82];
      break;
      case ModuleCreatureAnimState.GET_UP_DEAD:
        return Global.kotor2DA.animations.rows[381];
      break;
      case ModuleCreatureAnimState.GET_UP_DEAD1:
        return Global.kotor2DA.animations.rows[382];
      break;
      case ModuleCreatureAnimState.WALK_INJ:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[254];
        }else{
          return Global.kotor2DA.animations.rows[1];
        }
      break;
      case ModuleCreatureAnimState.WALKING:
        if(this.isSimpleCreature()){
          if(this.getHP()/this.getMaxHP() > .15){
            return Global.kotor2DA.animations.rows[253];
          }else{
            return Global.kotor2DA.animations.rows[254];
          }
        }else{
          if(this.getHP()/this.getMaxHP() > .15){
            switch(this.getCombatAnimationWeaponType()){
              case 2:
                return Global.kotor2DA.animations.rows[338];
              case 3:
                return Global.kotor2DA.animations.rows[341];
              case 4:
                return Global.kotor2DA.animations.rows[339];
              case 7:
                return Global.kotor2DA.animations.rows[340];
              case 9:
                return Global.kotor2DA.animations.rows[340];
              default:
                return Global.kotor2DA.animations.rows[0];
            }
          }else{
            return Global.kotor2DA.animations.rows[1];
          }
        }
      break;
      case ModuleCreatureAnimState.RUNNING:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[255];
        }else{
          if(this.getHP()/this.getMaxHP() > .15){
            switch(this.getCombatAnimationWeaponType()){
              case 1:
                return Global.kotor2DA.animations.rows[343];
              case 2:
                return Global.kotor2DA.animations.rows[345];
              case 3:
                return Global.kotor2DA.animations.rows[345];
              case 4:
                return Global.kotor2DA.animations.rows[3];
              case 7:
                return Global.kotor2DA.animations.rows[340];
              case 9:
                return Global.kotor2DA.animations.rows[340];
              default:
                return Global.kotor2DA.animations.rows[2];
            }
          }else{
            return Global.kotor2DA.animations.rows[4];
          }
        }
      break;
      case ModuleCreatureAnimState.RUN_INJ:
        return Global.kotor2DA.animations.rows[4];
      break;
      //COMBAT READY
      case ModuleCreatureAnimState.READY:
      case ModuleCreatureAnimState.READY_ALT:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[278];
        }else{
          switch(this.getCombatAnimationWeaponType()){
            case 1:
              return Global.kotor2DA.animations.rows[92];
            case 2:
              return Global.kotor2DA.animations.rows[133];
            case 3:
              return Global.kotor2DA.animations.rows[174];
            case 4:
              return Global.kotor2DA.animations.rows[215];
            case 5:
              return Global.kotor2DA.animations.rows[223];
            case 6:
              return Global.kotor2DA.animations.rows[237];
            case 7:
              return Global.kotor2DA.animations.rows[245];
            case 9:
              return Global.kotor2DA.animations.rows[84]; //84 == pushed | 85 == hit ground prone back | 86 == get up from ground prone
            default:
              return Global.kotor2DA.animations.rows[249];
          }
        }
      break;
      case ModuleCreatureAnimState.DODGE:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[281];
        }else{
          return Global.kotor2DA.animations.rows[302];
        }
      break;
      case ModuleCreatureAnimState.SPASM:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[268];
        }else{
          return Global.kotor2DA.animations.rows[77];
        }
      break;
      case ModuleCreatureAnimState.TAUNT:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[263];
        }else{
          return Global.kotor2DA.animations.rows[33];
        }
      break;
      case ModuleCreatureAnimState.GREETING:
        return Global.kotor2DA.animations.rows[31];
      break;
      case ModuleCreatureAnimState.LISTEN:
        return Global.kotor2DA.animations.rows[18];
      break;
      case ModuleCreatureAnimState.LISTEN_INJURED:
        return Global.kotor2DA.animations.rows[371];
      break;
      case ModuleCreatureAnimState.TALK_NORMAL:
        return Global.kotor2DA.animations.rows[25];
      break;
      case ModuleCreatureAnimState.TALK_PLEADING:
        return Global.kotor2DA.animations.rows[27];
      break;
      case ModuleCreatureAnimState.TALK_FORCEFUL:
        return Global.kotor2DA.animations.rows[26];
      break;
      case ModuleCreatureAnimState.TALK_LAUGHING:
        return Global.kotor2DA.animations.rows[29];
      break;
      case ModuleCreatureAnimState.TALK_SAD:
        return Global.kotor2DA.animations.rows[28];
      break;
      case ModuleCreatureAnimState.TALK_INJURED:
        return Global.kotor2DA.animations.rows[370];
      break;
      case ModuleCreatureAnimState.SALUTE:
        return Global.kotor2DA.animations.rows[16];
      break;
      case ModuleCreatureAnimState.BOW:
        return Global.kotor2DA.animations.rows[19];
      break;
      case ModuleCreatureAnimState.VICTORY:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[260];
        }else{
          return Global.kotor2DA.animations.rows[17];
        }
      break;
      case ModuleCreatureAnimState.HEAD_TURN_LEFT:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[258];
        }else{
          return Global.kotor2DA.animations.rows[11];
        }
      break;
      case ModuleCreatureAnimState.HEAD_TURN_RIGHT:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[259];
        }else{
          return Global.kotor2DA.animations.rows[10];
        }
      break;
      case ModuleCreatureAnimState.GET_LOW:
        return Global.kotor2DA.animations.rows[40];
      break;
      case ModuleCreatureAnimState.GET_MID:
        return Global.kotor2DA.animations.rows[41];
      break;
      case ModuleCreatureAnimState.INJECT:
        return Global.kotor2DA.animations.rows[37];
      break;
      case ModuleCreatureAnimState.DAMAGE:
        return Global.kotor2DA.animations.rows[303];
      break;
      case ModuleCreatureAnimState.USE_COMPUTER_LP:
        return Global.kotor2DA.animations.rows[44];
      break;
      case ModuleCreatureAnimState.WHIRLWIND:
        return Global.kotor2DA.animations.rows[75];
      break;
      case ModuleCreatureAnimState.DEACTIVATE:
        return Global.kotor2DA.animations.rows[270];
      break;
      case ModuleCreatureAnimState.FLIRT:
        return Global.kotor2DA.animations.rows[32];
      break;
      case ModuleCreatureAnimState.USE_COMPUTER:
        return Global.kotor2DA.animations.rows[43];
      break;
      case ModuleCreatureAnimState.DANCE:
        return Global.kotor2DA.animations.rows[53];
      break;
      case ModuleCreatureAnimState.DANCE1:
        return Global.kotor2DA.animations.rows[54];
      break;
      case ModuleCreatureAnimState.HORROR:
        return Global.kotor2DA.animations.rows[74];
      break;
      case ModuleCreatureAnimState.USE_COMPUTER1:
        return Global.kotor2DA.animations.rows[43];
      break;
      case ModuleCreatureAnimState.PERSUADE:
        return Global.kotor2DA.animations.rows[68];
      break;
      case ModuleCreatureAnimState.ACTIVATE_ITEM:
        return Global.kotor2DA.animations.rows[38];
      break;
      case ModuleCreatureAnimState.UNLOCK_DOOR:
        return Global.kotor2DA.animations.rows[47];
      break;
      case ModuleCreatureAnimState.THROW_HIGH:
        return Global.kotor2DA.animations.rows[57];
      break;
      case ModuleCreatureAnimState.THROW_LOW:
        return Global.kotor2DA.animations.rows[58];
      break;
      case ModuleCreatureAnimState.UNLOCK_CONTAINER:
        return Global.kotor2DA.animations.rows[48];
      break;
      case ModuleCreatureAnimState.DISABLE_MINE:
        return Global.kotor2DA.animations.rows[51];
      break;
      case ModuleCreatureAnimState.WALK_STEALTH:
        return Global.kotor2DA.animations.rows[5];
      break;
      case ModuleCreatureAnimState.UNLOCK_DOOR2:
        return Global.kotor2DA.animations.rows[47];
      break;
      case ModuleCreatureAnimState.UNLOCK_CONTAINER2:
        return Global.kotor2DA.animations.rows[48];
      break;
      case ModuleCreatureAnimState.ACTIVATE_ITEM2:
        return Global.kotor2DA.animations.rows[38];
      break;
      case ModuleCreatureAnimState.SLEEP:
        return Global.kotor2DA.animations.rows[76];
      break;
      case ModuleCreatureAnimState.PARALYZED:
        return Global.kotor2DA.animations.rows[78];
      break;
      case ModuleCreatureAnimState.PRONE:
        return Global.kotor2DA.animations.rows[79];
      break;
      case ModuleCreatureAnimState.SET_MINE:
        return Global.kotor2DA.animations.rows[52];
      break;
      case ModuleCreatureAnimState.DISABLE_MINE2:
        return Global.kotor2DA.animations.rows[51];
      break;
      case ModuleCreatureAnimState.CUSTOM01:
        return Global.kotor2DA.animations.rows[346];
      break;
      case ModuleCreatureAnimState.FBLOCK:
        return Global.kotor2DA.animations.rows[355];
      break;
      case ModuleCreatureAnimState.CHOKE:
        if(this.isSimpleCreature()){
          return Global.kotor2DA.animations.rows[264];
        }else{
          return Global.kotor2DA.animations.rows[72];
        }
      break;
      case ModuleCreatureAnimState.WELD:
        return Global.kotor2DA.animations.rows[360];
      break;
      case ModuleCreatureAnimState.TREAT_INJURED:
        return Global.kotor2DA.animations.rows[34];
      break;
      case ModuleCreatureAnimState.TREAT_INJURED_LP:
        return Global.kotor2DA.animations.rows[35];
      break;
      case ModuleCreatureAnimState.CATCH_SABER:
        return Global.kotor2DA.animations.rows[71];
      break;
      case ModuleCreatureAnimState.THROW_SABER_LP:
        return Global.kotor2DA.animations.rows[70];
      break;
      case ModuleCreatureAnimState.THROW_SABER:
        return Global.kotor2DA.animations.rows[69];
      break;
      case ModuleCreatureAnimState.KNEEL_TALK_ANGRY:
        return Global.kotor2DA.animations.rows[384];
      break;
      case ModuleCreatureAnimState.KNEEL_TALK_SAD:
        return Global.kotor2DA.animations.rows[385];
      break;
      case ModuleCreatureAnimState.KNOCKED_DOWN:
        return Global.kotor2DA.animations.rows[85];
      break;
      case ModuleCreatureAnimState.KNOCKED_DOWN2:
        return Global.kotor2DA.animations.rows[85];
      break;
      case ModuleCreatureAnimState.DEAD_PRONE:
        return Global.kotor2DA.animations.rows[375];
      break;
      case ModuleCreatureAnimState.KNEEL:
        return Global.kotor2DA.animations.rows[23];
      break;
      case ModuleCreatureAnimState.KNEEL1:
        return Global.kotor2DA.animations.rows[23];
      break;
      case ModuleCreatureAnimState.FLOURISH:
        switch( this.getCombatAnimationWeaponType() ){
          case 1:
            return Global.kotor2DA.animations.rows[91];
          case 2:
            return Global.kotor2DA.animations.rows[132];
          case 3:
            return Global.kotor2DA.animations.rows[173];
          case 4:
            return Global.kotor2DA.animations.rows[214];
          case 5:
            return Global.kotor2DA.animations.rows[222];
          case 6:
            return Global.kotor2DA.animations.rows[136];
          case 7:
            return Global.kotor2DA.animations.rows[244];
          case 8:
            return Global.kotor2DA.animations.rows[373];
          case 9:
            return Global.kotor2DA.animations.rows[244];
          default:
            return Global.kotor2DA.animations.rows[373];
        }
      break;
      
      //BEGIN TSL ANIMATIONS
      case ModuleCreatureAnimState.TOUCH_HEART:
        return Global.kotor2DA.animations.rows[462];
      break;
      case ModuleCreatureAnimState.ROLL_EYES:
        return Global.kotor2DA.animations.rows[463];
      break;
      case ModuleCreatureAnimState.USE_ITEM_ON_OTHER:
        return Global.kotor2DA.animations.rows[464];
      break;
      case ModuleCreatureAnimState.STAND_ATTENTION:
        return Global.kotor2DA.animations.rows[465];
      break;
      case ModuleCreatureAnimState.NOD_YES:
        return Global.kotor2DA.animations.rows[466];
      break;
      case ModuleCreatureAnimState.NOD_NO:
        return Global.kotor2DA.animations.rows[467];
      break;
      case ModuleCreatureAnimState.POINT:
        return Global.kotor2DA.animations.rows[468];
      break;
      case ModuleCreatureAnimState.POINT_LP:
        return Global.kotor2DA.animations.rows[469];
      break;
      case ModuleCreatureAnimState.POINT_DOWN:
        return Global.kotor2DA.animations.rows[470];
      break;
      case ModuleCreatureAnimState.SCANNING:
        return Global.kotor2DA.animations.rows[471];
      break;
      case ModuleCreatureAnimState.SHRUG:
        return Global.kotor2DA.animations.rows[472];
      break;
      case ModuleCreatureAnimState.SIT_CHAIR:
        return Global.kotor2DA.animations.rows[316];
      break;
      case ModuleCreatureAnimState.SIT_CHAIR_DRUNK:
        return Global.kotor2DA.animations.rows[317];
      break;
      case ModuleCreatureAnimState.SIT_CHAIR_PAZAAK:
        return Global.kotor2DA.animations.rows[318];
      break;
      case ModuleCreatureAnimState.SIT_CHAIR_COMP1:
        return Global.kotor2DA.animations.rows[316];
      break;
      case ModuleCreatureAnimState.SIT_CHAIR_COMP2:
        return Global.kotor2DA.animations.rows[316];
      break;
      case ModuleCreatureAnimState.CUT_HANDS:
        return Global.kotor2DA.animations.rows[557];
      break;
      case ModuleCreatureAnimState.L_HAND_CHOP:
        return Global.kotor2DA.animations.rows[558];
      break;
      case ModuleCreatureAnimState.COLLAPSE:
        return Global.kotor2DA.animations.rows[559];
      break;
      case ModuleCreatureAnimState.COLLAPSE_LP:
        return Global.kotor2DA.animations.rows[560];
      break;
      case ModuleCreatureAnimState.COLLAPSE_STAND:
        return Global.kotor2DA.animations.rows[561];
      break;
      case ModuleCreatureAnimState.BAO_DUR_POWER_PUNCH:
        return Global.kotor2DA.animations.rows[562];
      break;
      case ModuleCreatureAnimState.POINT_UP:
        return Global.kotor2DA.animations.rows[563];
      break;
      case ModuleCreatureAnimState.POINT_UP_LOWER:
        return Global.kotor2DA.animations.rows[564];
      break;
      case ModuleCreatureAnimState.HOOD_OFF:
        return Global.kotor2DA.animations.rows[565];
      break;
      case ModuleCreatureAnimState.HOOD_ON:
        return Global.kotor2DA.animations.rows[566];
      break;
      case ModuleCreatureAnimState.DIVE_ROLL:
        return Global.kotor2DA.animations.rows[567];
      break;
      //END TSL ANIMATIONS

    }

  }

}

ModuleObject.List = new Map();

ModuleObject.GetObjectById = function(id = -1){

  if(id == ModuleObject.OBJECT_INVALID)
    return undefined;

  if(id instanceof ModuleObject){
    if(id.id >= 1){
      return id;
    }
  }

  if(ModuleObject.List.has(id)){
    return ModuleObject.List.get(id);
  }
  return undefined;

}

ModuleObject.COUNT = 1;
ModuleObject.PLAYER_ID = 0x7fffffff;
ModuleObject.OBJECT_INVALID = 0x7f000000;

ModuleObject.ResetPlayerId = function(){
  ModuleObject.PLAYER_ID = 0x7fffffff;
};

ModuleObject.GetNextPlayerId = function(){
  console.log('GetNextPlayerId', ModuleObject.PLAYER_ID);
  return ModuleObject.PLAYER_ID--;
}

ModuleObject.DX_LIST = [1, 0.15425144988758405, -0.9524129804151563, -0.4480736161291702, 0.8141809705265618, 0.6992508064783751, -0.5984600690578581, -0.8838774731823718, 0.32578130553514806, 0.9843819506325049, -0.022096619278683942, -0.9911988217552068];
ModuleObject.DY_LIST = [0, -0.9880316240928618, -0.3048106211022167, 0.8939966636005579, 0.5806111842123143, -0.7148764296291646, -0.8011526357338304, 0.46771851834275896, 0.9454451549211168, -0.1760459464712114, -0.9997558399011495, -0.13238162920545193];