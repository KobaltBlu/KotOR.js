/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

const EffectLink = require("../effects/EffectLink");

/* @file
 * The ModuleObject class.
 */

class ModuleObject {

  constructor (gff = new GFFObject) {

    ModuleObject.List.push(this);

    if(gff instanceof GFFObject && gff.RootNode.HasField('ObjectId')){
      this.id = gff.GetFieldByLabel('ObjectId').GetValue();
    }else{
      this.id = ModuleObject.COUNT++;
    }

    this.initialized = false;

    //this.moduleObject = null;
    this.AxisFront = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.quaternion = new THREE.Quaternion();

    this.rotation._onChange( () => { this.onRotationChange } );
	  this.quaternion._onChange( () => { this.onQuaternionChange } );

    this.box = new THREE.Box3();
    this.sphere = new THREE.Sphere();
    this.facing = 0;
    this.wasFacing = 0;
    this.facingTweenTime = 0;
    this.force = 0;
    this.invalidateCollision = false;
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

    this.actionQueue = [];
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
    this._heartbeatTimeout = Game.HeartbeatTimer + this._heartbeatTimerOffset;
    //this._heartbeat();

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

  _heartbeat(){
    /*this.heartbeatTimer = setTimeout( () => {
      process.nextTick( ()=> {
        this._heartbeat();
      });
      if(Game.module){
        try{
          this.triggerHeartbeat();
        }catch(e){}
      }
    }, Game.HeartbeatTimer + this._heartbeatTimerOffset);*/
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

  update(delta = 0){
    
    //Process the heartbeat timer
    if(this._heartbeatTimeout <= 0){
      if(Game.module){
        this.triggerHeartbeat();
      }
      this._heartbeatTimeout = Game.HeartbeatTimer + this._heartbeatTimerOffset;
    }else{
      this._heartbeatTimeout -= 1000*delta;
    }

    //Loop through and update the effects
    if(!this.deferEventUpdate){
      for(let i = 0, len = this.effects.length; i < len; i++){
        this.effects[i].update(delta);
      }
    }

    if(Game.currentCamera){
      this.distanceToCamera = this.position.distanceTo(Game.currentCamera.position);
    }

    if(this.spawned){
      if(!this.room){
        if(!this.roomCheckTimer || this.roomCheckTimer <= 0){
          this.roomCheckTimer = 1;
          this.getCurrentRoom();
        }
        this.roomCheckTimer -= delta;
      }

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

        if(Game.inDialog){
          this.model.visible = true;
        }

      }
    }

  }

  //Queue an animation to the actionQueue array
  actionPlayAnimation(anim = '', loop = false, speed = 1){
    
    let _anim = typeof anim === 'string' ? anim : this.getAnimationNameById(anim).toLowerCase();
    let animation = this.model.getAnimationByName(_anim);
    if(animation){
      this.actionQueue.push({ 
        goal: ModuleCreature.ACTION.ANIMATE,
        animation: animation,
        speed: speed || 1,
        time: loop ? -1 : animation.length
      });
    }else{
      console.warn('actionPlayAnimation', animation);
    }
  }

  isSimpleCreature(){
    return false;
  }

  getAnimationNameById(id = -1){
    if(typeof id === 'string'){
      return id;
    }else{
      switch(id){
        case 0:  //PAUSE
          return (this.isSimpleCreature() ? 'cpause1' : 'pause1');
        case 1:  //PAUSE2
          return (this.isSimpleCreature() ? 'cpause2' : 'pause2');
        case 2:  //LISTEN
          return 'listen';
        case 3:  //MEDITATE
          return 'meditate';
        case 4:  //WORSHIP
          return 'kneel';//['kneel', 'meditate'];
        case 5:  //TALK_NORMAL
          return 'tlknorm';
        case 6:  //TALK_PLEADING
          return 'tlkplead';
        case 7:  //TALK_FORCEFUL
          return 'tlkforce';
        case 8:  //TALK_LAUGHING
          return 'tlklaugh';
        case 9:  //TALK_SAD
          return 'tlksad';
        case 10: //GET_LOW
          return 'getfromgnd';
        case 11: //GET_MID
          return 'getfromcntr';
        //case 12: //PAUSE_TIRED
        //case 13: //PAUSE_DRUNK
        case 14: //FLIRT
          return 'flirt';
        case 15: //USE_COMPUTER
          return 'usecomplp';
        case 16: //DANCE
          return 'dance';
        case 17: //DANCE1
          return 'dance1';
        case 18: //HORROR
          return 'horror';
        //case 19: //READY
        //case 20: //DEACTIVATE
        //case 21: //SPASM
        case 22: //SLEEP
          return 'sleep';
        case 23: //PRONE
          return 'prone';
        case 24: //PAUSE3
          return (this.isSimpleCreature() ? 'cpause1' : 'pause3');
        case 25: //WELD
          return 'weld';
        case 26: //DEAD
          return (this.isSimpleCreature() ? 'cdead' : 'dead');
        case 27: //TALK_INJURED
          return 'talkinj';
        case 28: //LISTEN_INJURED
          return 'listeninj';
        case 29: //TREAT_INJURED
          return 'treatinj';
        case 30: //DEAD_PRONE
          return (this.isSimpleCreature() ? 'cdead' : 'dead');
        //case 31: //KNEEL_TALK_ANGRY
        //case 32: //KNEEL_TALK_SAD
        case 35: //MEDITATE LOOP
          return 'meditate';
        case 100: //HEAD_TURN_LEFT
          return 'hturnl';
        case 101: //HEAD_TURN_RIGHT
          return 'hturnr';
        case 102: //PAUSE_SCRATCH_HEAD
          return (this.isSimpleCreature() ? 'cpause1' : 'pause3');
        case 103: //PAUSE_BORED
          return (this.isSimpleCreature() ? 'cpause2' : 'pause2');
        case 104: //SALUTE
          return 'salute';
        case 105: //BOW
          return 'bow';
        case 106: //GREETING
          return 'greeting';
        case 107: //TAUNT
          return (this.isSimpleCreature() ? 'ctaunt' : 'taunt');
        case 108: //VICTORY1
          return (this.isSimpleCreature() ? 'cvictory' : 'victory');
        case 109: //VICTORY2
          return (this.isSimpleCreature() ? 'cvictory' : 'victory');
        case 110: //VICTORY3
          return (this.isSimpleCreature() ? 'cvictory' : 'victory');
        //case 111: //READ
        //  return 'salute';
        case 112: //INJECT
          return 'inject';
        case 113: //USE_COMPUTER
          return 'usecomp';
        case 114: //PERSUADE
          return 'persuade';
        case 115: //ACTIVATE
          return 'activate';
        case 116: //CHOKE
          return 'choke';
        case 117: //THROW_HIGH
          return 'throwgren';
        case 118: //THROW_LOW
          return 'throwsab';
        case 119: //CUSTOM01
          return 'dunno???';
        case 120: //TREAT_INJURED
          return 'treatinj';

        // Placeable animation constants
        case 200: return 'activate';
        case 201: return 'deactivate';
        case 202: return 'open';
        case 203: return 'close';
        case 204: return 'animloop01';
        case 205: return 'animloop02';
        case 206: return 'animloop03';
        case 207: return 'animloop04';
        case 208: return 'animloop05';
        case 209: return 'animloop06';
        case 210: return 'animloop07';
        case 211: return 'animloop08';
        case 212: return 'animloop09';
        case 213: return 'animloop10';

      }
      //console.error('Animation case missing', id);
      return (this.isSimpleCreature() ? 'cpause1' : 'pause1');
    }
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

  triggerUserDefinedEvent(caller = this, nValue = 0, onComplete = null ){
    if(this instanceof ModuleArea || this instanceof Module){
      //return;
    }

    if(this.scripts.onUserDefined instanceof NWScriptInstance){
      let instance = this.scripts.onUserDefined.nwscript.newInstance();
      instance.run(caller, parseInt(nValue));
    }
  }

  triggerSpellCastAtEvent(oCaster = undefined, nSpell = 0, bHarmful = 0){
    if(this instanceof ModuleArea || this instanceof Module){
      //return;
    }

    if(this.scripts.onSpellAt instanceof NWScriptInstance){
      let instance = this.scripts.onSpellAt.nwscript.newInstance();
      instance.lastSpellCaster = oCaster;
      instance.lastSpell = nSpell;
      instance.lastSpellHarmful = bHarmful;
      instance.run(this);
    }
  }

  triggerHeartbeat(){
    //Only allow the heartbeat script to run after the onspawn is called
    if(this.spawned === true){
      if(this.scripts.onHeartbeat instanceof NWScriptInstance){// && this._locals.Booleans[28]){
        if(PartyManager.party.indexOf(this) > -1){
          //process.nextTick(() => {
            this.scripts.onHeartbeat.run(this, 2001);
          //});
        }else{
          //process.nextTick(() => {
            this.scripts.onHeartbeat.run(this, 1001);
          //});
        }
      }
    }
  }

  onSpawn(runScript = true){
    if(runScript && this.scripts.onSpawn instanceof NWScriptInstance){
      this.scripts.onSpawn.run(this, 0, () => {
        this.spawned = true;
      });
    }else{
      this.spawned = true;
    }

    if(this instanceof ModuleCreature){
      this.initPerceptionList();
      this.updateCollision();
    }

    for(let i = 0, len = this.effects.length; i < len; i++){
      let effect = this.effects[i];
      if(effect instanceof GameEffect){
        effect.initialize();
        effect.setObject(this);
        effect.onApply(this);
      }
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
    Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
    
    //this.position.z += (-10 * delta);
    playerFeetRay.z += 10;
    
    Game.raycaster.ray.direction.set(0, 0,-1);
    
    let intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
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
      Game.raycaster.ray.direction.set(Math.cos(i), Math.sin(i),-1);
      Game.raycaster.ray.origin.set(playerFeetRay.x,playerFeetRay.y,playerFeetRay.z);
      let intersects = Game.raycaster.intersectObjects( Game.walkmeshList );
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
    this.invalidateCollision = false;*/
  }

  doCommand(script, action, instruction){
    this.actionQueue.push({
      goal: ModuleCreature.ACTION.SCRIPT,
      script: script,
      action, action,
      instruction, instruction,
      clearable: false
    });
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
    this.room = undefined;
    let smallest = Infinity;

    this.rooms = [];
    for(let i = 0; i < Game.module.area.rooms.length; i++){
      let room = Game.module.area.rooms[i];
      let model = room.model;
      if(model instanceof THREE.AuroraModel){
        let pos = this.position.clone();
        if(model.box.containsPoint(pos)){
          this.rooms.push(i);

          room.model.box.getSize(this.roomSize);
          if(this.roomSize.length() < smallest){
            this.room = room;
            smallest = this.roomSize.length();
          }
        }
      }
    }
    
  }

  getCameraHeight(){
    return 1.5;
  }

  isInConversation(){
    return Game.inDialog && (Game.InGameDialog.owner == this || Game.InGameDialog.listener == this);
  }

  applyVisualEffect(resref = 'v_light'){
    if(this.model instanceof THREE.AuroraModel){
      Game.ModelLoader.load({
        file: resref,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, { 
            onComplete: (effectMDL) => {
              this.model.effects.push(effectMDL);
              this.model.add(effectMDL);
              TextureLoader.LoadQueue();
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

      if(this.model instanceof THREE.AuroraModel){
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

      if(Game.module){
        if(this instanceof ModuleCreature){
          let cIdx = Game.module.area.creatures.indexOf(this);
          //console.log('ModuleObject.destory', 'creature', cIdx)
          if(cIdx > -1){
            Game.module.area.creatures.splice(cIdx, 1);
          }
        }else if(this instanceof ModulePlaceable){
          let pIdx = Game.module.area.placeables.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            Game.module.area.placeables.splice(pIdx, 1);

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.walkmesh.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleRoom){
          let pIdx = Game.module.area.rooms.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            let room = Game.module.area.rooms.splice(pIdx, 1)[0];
            
            if(room.walkmesh)
              room.walkmesh.dispose();

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.walkmesh.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}

          }
        }else if(this instanceof ModuleDoor){
          let pIdx = Game.module.area.doors.indexOf(this);
          //console.log('ModuleObject.destory', 'placeable', pIdx)
          if(pIdx > -1){
            Game.module.area.doors.splice(pIdx, 1);

            try{
              let wmIdx = Game.walkmeshList.indexOf(this.walkmesh.mesh);
              Game.walkmeshList.splice(wmIdx, 1);
              Game.octree_walkmesh.remove(this.walkmesh.mesh);
            }catch(e){}
            
          }
        }else if(this instanceof ModuleTrigger){
          let pIdx = Game.module.area.triggers.indexOf(this);
          //console.log('ModuleObject.destory', 'trigger', pIdx)
          if(pIdx > -1){
            Game.module.area.triggers.splice(pIdx, 1);            
          }
        }else{
          console.log('ModuleObject.destory', 'not supported '+this.constructor.name)
        }
      }else{
        console.log('ModuleObject.destory', 'No module')
      }

      clearTimeout(this.heartbeatTimer);

      //Remove the object from the global list of objects
      let listIdx = ModuleObject.List.indexOf(this);
      if(listIdx >= 0)
        ModuleObject.List.splice(listIdx, 1);

    }catch(e){
      console.error('ModuleObject.destory', e);
    }
  }

  SetPosition(x = 0, y = 0, z = 0){
    try{
      if(this.model instanceof THREE.AuroraModel){
        this.model.position.set(x, y, z);
        this.model.box.setFromObject(this.model);
        this.model.sphere = this.model.box.getBoundingSphere(this.model.sphere);
      }

      this.position.set(x, y, z);

      if(this instanceof ModuleCreature)
        this.updateCollision();
    }catch(e){
      console.error('ModuleObject.SetPosition failed ');
    }
  }

  GetPosition(){
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

  GetRotation(){
    return Math.floor(this.GetFacing() * 180) + 180;
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

  /*GetPosition(){
    try{
      return this.model.position.clone();
    }catch(e){
      console.error('ModuleObject', e);
      return new THREE.Vector3(0);
    }
  }*/

  /*GetFacing(){
    return 0;
  }*/

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
        effect.setObject(this);
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
      if(this.model instanceof THREE.AuroraModel){
        this.model.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );
        this.model.box.setFromObject(this.model);
        this.model.sphere = this.model.box.getBoundingSphere(this.model.sphere);
      }

      this.position.set( lLocation.position.x, lLocation.position.y, lLocation.position.z );

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
    return this.transitionDestin;
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
      this.template.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'TemplateResRef') ).SetValue(sRef)
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




  computeBoundingBox(){
    if(this.model){
      this.model.box = this.box.setFromObject(this.model);
      this.model.sphere = this.box.getBoundingSphere(this.model.sphere);
    }
  }

  isOnScreen(frustum = Game.viewportFrustum){
    if(!(this instanceof ModuleTrigger)){
      if(this.model && this.model.box != this.box){
        this.box = this.model.box;
      }
    }

    if(Game.scene.fog){
      if(this.distanceToCamera >= Game.scene.fog.far){
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
    //console.log('getLocalBoolean', iNum, this);
    return this._locals.Booleans[iNum] ? 1 : 0;
  }

  getLocalNumber(iNum){
    //console.log('getLocalNumber', iNum, this);
    return this._locals.Numbers[iNum] ? this._locals.Numbers[iNum] : 0;
  }

  setLocalBoolean(iNum, bVal){
    //console.log('setLocalBoolean', iNum, bVal, this);
    this._locals.Booleans[iNum] = bVal ? 1 : 0;
  }

  setLocalNumber(iNum, iVal){
    //console.log('setLocalNumber', iNum, iVal, this);
    this._locals.Numbers[iNum] = iVal;
  }

  AssignCommand(command = 0){

  }

  getFactionID(){
    return this.faction;
  }

  isHostile(target = undefined){

    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(target instanceof ModuleObject))
      return false;

    if(target.isDead() || this.isDead())
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];

    if(targetFaction.label.toLowerCase() == 'player'){
      return targetFaction[faction.label.toLowerCase()] <= 10;
    }else{
      return faction[targetFaction.label.toLowerCase()] <= 10;
    }

  }

  isNeutral(target = undefined){

    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(target instanceof ModuleObject))
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];

    if(targetFaction.label.toLowerCase() == 'player'){
      return targetFaction[faction.label.toLowerCase()] >= 11;
    }else{
      return faction[targetFaction.label.toLowerCase()] <= 89;
    }

  }

  isFriendly(target = undefined){

    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(target instanceof ModuleObject))
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];

    if(typeof targetFaction != 'undefined' && typeof faction != 'undefined'){
      if(targetFaction.label.toLowerCase() == 'player'){
        return targetFaction[faction.label.toLowerCase()] >= 11;
      }else{
        return faction[targetFaction.label.toLowerCase()] >= 11;
      }
    }else{
      console.log('isFriendly', target, this);
      return undefined;
    }

  }

  getReputation(target){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget
    if(!(target instanceof ModuleObject))
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];
    if(typeof targetFaction != 'undefined' && typeof faction != 'undefined'){
      if(targetFaction.label.toLowerCase() == 'player'){
        return targetFaction[faction.label.toLowerCase()];
      }else{
        return faction[targetFaction.label.toLowerCase()];
      }
    }else{
      console.log('getReputation', target, this);
      return undefined;
    }
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

      Game.raycaster.ray.origin.copy(position_a);
      Game.raycaster.ray.direction.copy(direction);
      Game.raycaster.far = max_distance;

      let aabbFaces = [];
      let meshesSearch;// = Game.octree_walkmesh.search( Game.raycaster.ray.origin, 10, true, Game.raycaster.ray.direction );
      let intersects;// = Game.raycaster.intersectOctreeObjects( meshesSearch );

      let doors = [];

      for(let j = 0, jl = this.rooms.length; j < jl; j++){
        let room = Game.module.area.rooms[this.rooms[j]];
        if(room && room.walkmesh && room.walkmesh.aabbNodes.length){
          aabbFaces.push({
            object: room, 
            faces: room.walkmesh.faces
          });
        }
      }

      for(let j = 0, jl = Game.module.area.doors.length; j < jl; j++){
        let door = Game.module.area.doors[j];
        if(door && !door.isOpen()){
          let box3 = door.box;
          if(box3){
            if(Game.raycaster.ray.intersectsBox(box3)){
              return false;
            }
          }
        }
      }


      for(let i = 0, il = aabbFaces.length; i < il; i++){
        let castableFaces = aabbFaces[i];
        intersects = castableFaces.object.walkmesh.raycast(Game.raycaster, castableFaces.faces);
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
      this.transitionDestin = this.template.GetFieldByLabel('TransitionDestin').GetValue();

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
      let localBools = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('BitArray').GetChildStructs();
      //console.log(localBools);
      for(let i = 0; i < localBools.length; i++){
        let data = localBools[i].GetFieldByLabel('Variable').GetValue();
        for(let bit = 0; bit < 32; bit++){
          this._locals.Booleans[bit + (i*32)] = ( (data>>bit) % 2 != 0);
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

  static TemplateFromJSON(json={}){
    let gff = new GFFObject();
    for(let key in json){
      let field = json[key];
      if(field instanceof Array){
        //TODO
      }else if(typeof field === 'string'){
        gff.RootNode.AddField(
          new Field(GFFDataTypes.RESREF, key, field)
        )
      }else if(typeof field === 'number'){
        gff.RootNode.AddField(
          new Field(GFFDataTypes.INT, key, field)
        )
      }
    }

    return gff;
  }

  toToolsetInstance(){

    let instance = new Struct();
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XOrientation', Math.cos(this.rotation.z + (Math.PI/2)))
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YOrientation', Math.sin(this.rotation.z + (Math.PI/2)))
    );

    return instance;

  }

}

ModuleObject.List = [];

ModuleObject.GetObjectById = function(id = -1){

  if(id == ModuleObject.OBJECT_INVALID)
    return undefined;

  for(let i = 0, len = ModuleObject.List.length; i < len; i++){
    if(ModuleObject.List[i].id == id)
      return ModuleObject.List[i];
  }
}

ModuleObject.COUNT = 0;
ModuleObject.PLAYER_ID = 0x7fffffff;
ModuleObject.OBJECT_INVALID = 0x7f000000;

ModuleObject.ResetPlayerId = function(){
  ModuleObject.PLAYER_ID = 0x7fffffff;
};

ModuleObject.GetNextPlayerId = function(){
  console.log('GetNextPlayerId', ModuleObject.PLAYER_ID);
  return ModuleObject.PLAYER_ID--;
}

module.exports = ModuleObject;
