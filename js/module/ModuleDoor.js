/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleDoor class.
 */

class ModuleDoor extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super(gff);
    this.template = gff;
    this.openState = false;
    this.lastObjectEntered = null;
    this.lastObjectExited = null;
    this.lastObjectOpened = null;
    this.lastObjectClosed = null;
    this.model = null;

    this.animationState = 0;
    this.appearance = 0;
    this.autoRemoveKey = false;
    this.closeLockDC = 0;
    this.conversation = '';
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
        engine: Game.audioEngine,
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

      Game.audioEngine.AddEmitter(this.audioEmitter);
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  getX(){
    return this.x;
  }

  getY(){
    return this.y;
  }

  getZ(){
    return this.z;
  }

  getBearing(){
    return this.bearing;
  }

  isLocked(){
    return this.locked;
  }

  setLocked(iValue){
    this.locked = iValue ? true : false;
  }

  requiresKey(){
    return this.keyRequired ? true : false;
  }

  keyName(){
    return this.keyName;
  }

  getName(){
    return this.locName.GetValue();
  }

  getGenericType(){
    return this.genericType;
  }

  getDoorAppearance(){
    return Global.kotor2DA['genericdoors'].rows[this.getGenericType()];
  }

  getObjectSounds(){
    let door = this.getDoorAppearance();
    let soundIdx = parseInt(door.soundapptype.replace(/\0[\s\S]*$/g,''));
    if(!isNaN(soundIdx)){
      return Global.kotor2DA['placeableobjsnds'].rows[soundIdx];
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

  onClick(callee = null){

    //You can't interact with yourself
    if(this === Game.player && Game.getCurrentPlayer() === this){
      return;
    }

    Game.getCurrentPlayer().actionQueue.push({
      object: this,
      goal: ModuleCreature.ACTION.OPENDOOR
    });
    
  }

  use(object = undefined){

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
      Game.InGameDialog.StartConversation(this.GetConversation(), object);
    }*/

  }

  attemptUnlock(object = undefined){
    if(object instanceof ModuleObject){
      
      let d20 = 20;//d20 rolls are auto 20's outside of combat
      let skillCheck = (((object.getWIS()/2) + object.getSkillLevel(6)) + d20) / this.openLockDC;
      if(skillCheck >= 1){
        this.locked = false;
        if(object instanceof ModuleCreature){
          object.PlaySoundSet(SSFObject.TYPES.UNLOCK_SUCCESS);
        }
      }else{
        if(object instanceof ModuleCreature){
          object.PlaySoundSet(SSFObject.TYPES.UNLOCK_FAIL);
        }
      }
         
      this.use(object);
      return true;
    }else{
      return false;
    }
  }

  openDoor(object = undefined){

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

    if(Game.selectedObject == this){
      Game.selectedObject = Game.selected = undefined;
    }
    this.openState = true;

    this.model.playAnimation('opening1', false, () => {
      console.log('opening1');
      setTimeout( () => {
        if(this.walkmesh && this.walkmesh.mesh){
          if(Game.octree_walkmesh.objectsMap[this.walkmesh.mesh.uuid] == this.walkmesh.mesh){
            Game.octree_walkmesh.remove(this.walkmesh.mesh)
          }
        }
        //this.model.poseAnimation('opened1');
      }, 100);
    });

    //Notice all creatures within range that someone opened this door
    if(object instanceof ModuleCreature){
      for(let i = 0, len = Game.module.area.creatures.length; i < len; i++){
        let creature = Game.module.area.creatures[i];
        let distance = creature.position.distanceTo(this.position);
        if(distance <= creature.getPerceptionRangePrimary()){
          creature.notifyPerceptionHeardObject(object, true);
        }
      }
    }

  }

  closeDoor(object = undefined){

    if(object instanceof ModuleCreature){
      object.lastDoorExited = this;
    }

    if(this.getObjectSounds()['closed'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['closed'].toLowerCase());
    }

    if(this.walkmesh && this.walkmesh.mesh){
      if(Game.octree_walkmesh.objectsMap[this.walkmesh.mesh.uuid] == undefined){
        Game.octree_walkmesh.add(this.walkmesh.mesh)
      }
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
      let creatureLen = Game.module.area.creatures.length;
      for(let i = 0; i < creatureLen; i++){
        let creature = Game.module.area.creatures[i];
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

  update(delta = 0){
    
    super.update(delta);

    if(this.walkmesh && this.model){
      this.walkmesh.matrixWorld = this.model.matrix.clone();
    }

    if(this.model instanceof THREE.AuroraModel){
      this.model.rotation.copy(this.rotation);
      //this.model.quaternion = this.quaternion;
      this.model.update(delta);
      this.audioEmitter.SetPosition(this.model.position.x, this.model.position.y, this.model.position.z);
    }

    this.action = this.actionQueue[0];
    if(this.action != null){
          
      //if(this.action){
        let distance = 0;
        switch(this.action.goal){
          case ModuleCreature.ACTION.WAIT:
            this.action.elapsed += delta;
            if(this.action.elapsed > this.action.time){
              this.actionQueue.shift()
            }
          break;
          case ModuleCreature.ACTION.SCRIPT: //run a code block of an NWScriptInstance file
            //console.log('Action Script', this.action);
            if(this.action.script instanceof NWScriptInstance){
              this.action.action.script.caller = this;
              this.action.action.script.beginLoop({
                _instr: null, 
                index: -1, 
                seek: this.action.action.offset, 
                onComplete: () => {
                  //console.log('ACTION.SCRIPT', 'Complete');
                }
              });
            }
            this.actionQueue.shift();
          break;
          default:
            this.actionQueue.shift();
          break;
        }
      //}

    }


    //Check Module Creatures
    /*let creatureLen = Game.module.area.creatures.length;
    for(let i = 0; i < creatureLen; i++){
      let creature = Game.module.area.creatures[i];
      let pos = creature.getModel().position.clone();
      if(this.box.containsPoint(pos)){
        if(creature.lastDoorEntered !== this){
          creature.lastDoorEntered = this;
          this.onEnter(creature);
        }
      }else{
        if(creature.lastDoorEntered === this){
          creature.lastDoorExited = this;
          this.onExit(creature);
        }
      }
    }*/


    //Check Party Members
    if(this.getLinkedToModule()){
      if(this.getLinkedToModule()){
        let partymember = PartyManager.party[0];
        let pos = partymember.getModel().position.clone();
        //if(this.box.containsPoint(pos)){
          let distance = pos.distanceTo(this.getModel().position.clone());
          if(distance < .5){
            if(partymember.lastDoorEntered !== this){
              partymember.lastDoorEntered = this;
              this.onEnter(partymember);
            }
          }
        /*}*/else{
          if(partymember.lastDoorEntered === this){
            partymember.lastDoorExited = this;
            this.onExit(partymember);
          }
        }
      }
    }

  }

  onEnter(object = undefined){
    if(this.getLinkedToModule() && !Game.inDialog && this.isOpen()){
      if(object == Game.getCurrentPlayer() && object.controlled){
        Game.LoadModule(this.getLinkedToModule().toLowerCase(), this.getLinkedTo().toLowerCase(), () => { 
          //console.log('Module Loaded', tthis.getLinkedToModule().toLowerCase());
        });
      }else{
        object.lastDoorEntered = undefined;
      }
    }else{
      object.lastDoorEntered = undefined;
    }
  }

  onExit(object = undefined){
    
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      //console.log('Door', this.template);
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.utd,
        onLoad: (gff) => {

          this.template.Merge(gff);
          //console.log(this.template, gff, this)
          this.InitProperties();
          this.LoadScripts( () => {
            if(onLoad != null)
              onLoad(this);
          });

        },
        onFail: () => {
          console.error('Failed to load door template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      //console.log('Door SAVEGAME');
      this.InitProperties();
      this.LoadScripts( () => {
        if(onLoad != null)
          onLoad(this);
      });
    }
  }

  LoadModel ( onLoad = null ){
    let modelName = this.getDoorAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();

    Game.ModelLoader.load({
      file: modelName,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (door) => {

            if(this.model != null){
              let scene = this.model.parent;
              scene.remove(this.model);
              Game.octree.remove( this.model );
              this.model.dispose();
            }

            this.model = door;
            this.model.moduleObject = this;
            this.model.name = modelName;

            if(typeof scene != 'undefined'){
              scene.add(this.model);
              Game.octree.add( this.model );
              //this.model.translateX(position.x);
              //this.model.translateY(position.y);
              //this.model.translateZ(position.z);
              //this.model.rotation.set(rotation.x, rotation.y, rotation.z);
              for(let i = 0; i < this.model.lights.length; i++){
                //LightManager.addLight(this.model.lights[i]);
              }
            }

            this.position = this.model.position.copy(this.position);
            this.model.rotation.copy(this.rotation);
            this.model.quaternion.copy(this.quaternion);

            //For some TSL doors that have a WHITE mesh called trans that shows when the door it opened
            //Not sure if trans has something to do with area transition or the animation called "trans"
            //that is in every door
            let trans = this.model.getObjectByName('trans');
            if(trans instanceof THREE.Object3D){
              trans.visible = false;
            }
            
            this.model.disableMatrixUpdate();

            TextureLoader.LoadQueue(() => {
              //console.log(this.model);
              if(onLoad != null)
                onLoad(this.model);
            }, (texName) => {
              //loader.SetMessage('Loading Textures: '+texName);
            });
          },
          context: this.context,
          //lighting: false,
          static: this.static,
          useTweakColor: this.useTweakColor,
          tweakColor: this.tweakColor
          //castShadow: true,
          //receiveShadow: true
        });
      }
    });
  }

  LoadScripts( onLoad = null ){

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
      this.useTweakColor = this.template.GetFieldByLabel('UseTweakColor').GetValue();

    let keys = Object.keys(this.scripts);
    let loop = new AsyncLoop({
      array: keys,
      onLoop: async (key, asyncLoop) => {
        let _script = this.scripts[key];
        if(_script != '' && !(_script instanceof NWScriptInstance)){
          //let script = await NWScript.Load(_script);
          this.scripts[key] = await NWScript.Load(_script);
          //this.scripts[key].name = _script;
          asyncLoop.next();
        }else{
          asyncLoop.next();
        }
      }
    });
    loop.iterate(() => {
      if(typeof onLoad === 'function')
        onLoad();
    });

  }

  LoadWalkmesh(ResRef = '', onLoad = null ){
    
    let wokKey = Global.kotorKEY.GetFileKey(ResRef+'0', ResourceTypes['dwk']);
    if(wokKey != null){
      Global.kotorKEY.GetFileData(wokKey, (buffer) => {

        this.walkmesh = new AuroraWalkMesh(new BinaryReader(buffer));
        this.walkmesh.name = ResRef;
        this.walkmesh.moduleObject = this;
        if(this.walkmesh.mesh){
          this.walkmesh.mesh.quaternion.setFromEuler(this.rotation);
        }

        if(typeof onLoad === 'function')
          onLoad(this.walkmesh);

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
    }

  }

  InitProperties(){

    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

    if(this.template.RootNode.HasField('AnimationState'))
      this.animationState = this.template.GetFieldByLabel('AnimationState').GetValue();

    if(this.template.RootNode.HasField('Appearance'))
      this.appearance = this.template.GetFieldByLabel('Appearance').GetValue();

    if(this.template.RootNode.HasField('AutoRemoveKey'))
      this.autoRemoveKey = this.template.GetFieldByLabel('AutoRemoveKey').GetValue();

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
          this.effects.push(effect);
          //this.AddEffect(effect);
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
      this.transitionDestin = this.template.RootNode.GetFieldByLabel('TransitionDestin').GetValue();

    this.initialized = true

  }

  toToolsetInstance(){

    let instance = new Struct(8);
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'Bearing', this.rotation.z)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOSTRING, 'LinkedTo', this.linkedTo)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.BYTE, 'LinkedToFlags', this.linkedToFlags)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'LinkedToModule', this.linkedToModule)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'Tag', this.tag)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new Field(GFFDataTypes.CEXOSTRING, 'TransitionDestin', this.transitionDestin)
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'X', this.position.x)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'Y', this.position.y)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'Z', this.position.z)
    );

    return instance;

  }

}

module.exports = ModuleDoor;
