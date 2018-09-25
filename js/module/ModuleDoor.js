/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleDoor class.
 */

class ModuleDoor extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();
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
          volume: 100,
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
    let soundIdx = door.soundapptype.replace(/\0[\s\S]*$/g,'');
    if(soundIdx != '****'){
      return Global.kotor2DA['placeableobjsnds'].rows[parseInt(soundIdx)];
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
    return !this.openState;
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

  use(object = null){

    if(!this.openState){
      if(this.isLocked()){
        if(this.scripts.onFailToOpen instanceof NWScript){
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
            }else if(this.scripts.onFailToOpen instanceof NWScript){
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
      console.log('already open')
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
      object.lastDoorEntered = this;
    }

    if(this.scripts.onOpen instanceof NWScript){
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
        if(this.dwk && this.dwk.mesh){
          if(Game.octree_walkmesh.objectsMap[this.dwk.mesh.uuid] == this.dwk.mesh){
            Game.octree_walkmesh.remove(this.dwk.mesh)
          }
        }
        this.model.playAnimation('opened1', true);
      }, 100);
    });
  }

  closeDoor(object = undefined){

    if(object instanceof ModuleCreature){
      object.lastDoorExited = this;
    }

    if(this.getObjectSounds()['closed'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['closed'].toLowerCase());
    }

    if(this.dwk && this.dwk.mesh){
      if(Game.octree_walkmesh.objectsMap[this.dwk.mesh.uuid] == undefined){
        Game.octree_walkmesh.add(this.dwk.mesh)
      }
    }

    this.model.playAnimation('closing1', false, () => {
      console.log('closing1');
      this.openState = false;
      //this.model.playAnimation('trans', false, () => {
        this.model.playAnimation('closed', false);
      //});
    });
  }

  update(delta = 0){
    
    super.update(delta);

    if(this.model instanceof THREE.AuroraModel){
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
          case ModuleCreature.ACTION.SCRIPT: //run a code block of an NWScript file
            //console.log('Action Script', this.action);
            if(this.action.script instanceof NWScript){
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
        if(creature.lastTriggerEntered !== this){
          creature.lastTriggerEntered = this;
          this.onEnter(creature);
        }
      }else{
        if(creature.lastTriggerEntered === this){
          creature.lastTriggerExited = this;
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
            if(partymember.lastTriggerEntered !== this){
              partymember.lastTriggerEntered = this;
              this.onEnter(partymember);
            }
          }
        /*}*/else{
          if(partymember.lastTriggerEntered === this){
            partymember.lastTriggerExited = this;
            this.onExit(partymember);
          }
        }
      }
    }

  }

  onEnter(object = undefined){
    if(this.getLinkedToModule()){
      if(Game.isObjectPC(object)){
        Game.LoadModule(this.getLinkedToModule().toLowerCase(), this.getLinkedTo().toLowerCase(), () => { 
          //console.log('Module Loaded', tthis.getLinkedToModule().toLowerCase());
        });
      }
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
        ResType: UTDObject.ResType,
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
              var scene = this.model.parent;
              var position = this.model.position;
              var rotation = this.model.rotation;
              scene.remove(this.model);
            }

            this.model = door;
            this.model.moduleObject = this;
            this.model.name = modelName;

            if(typeof scene != 'undefined'){
              scene.add(this.model);
              Game.octree.add( this.model );
              this.model.translateX(position.x);
              this.model.translateY(position.y);
              this.model.translateZ(position.z);
              this.model.rotation.set(rotation.x, rotation.y, rotation.z);
              for(let i = 0; i < this.model.lights.length; i++){
                //LightManager.addLight(this.model.lights[i]);
              }
            }

            this.position = this.model.position;
            this.rotation = this.model.rotation;

            //For some TSL doors that have a WHITE mesh called trans that shows when the door it opened
            //Not sure if trans has something to do with area transition or the animation called "trans"
            //that is in every door
            let trans = this.model.getObjectByName('trans');
            if(trans instanceof THREE.Object3D){
              trans.visible = false;
            }

            TextureLoader.LoadQueue(() => {
              //console.log(this.model);
              if(onLoad != null)
                onLoad(this.model);
            }, (texName) => {
              //loader.SetMessage('Loading Textures: '+texName);
            });
          },
          context: this.context
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

    let keys = Object.keys(this.scripts);
    let len = keys.length;

    let loadScript = ( onLoad = null, i = 0 ) => {
      
      if(i < len){
        let script = this.scripts[keys[i]];

        if(script != '' && script != undefined){
          ResourceLoader.loadResource(ResourceTypes['ncs'], script, (buffer) => {
            this.scripts[keys[i]] = new NWScript(buffer);
            this.scripts[keys[i]].name = script;
            i++;
            loadScript( onLoad, i );
          });
        }else{
          i++;
          loadScript( onLoad, i );
        }
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
  
    };

    loadScript(onLoad, 0);

  }

  LoadWalkmesh(ResRef = '', onLoad = null ){
    
    let wokKey = Global.kotorKEY.GetFileKey(ResRef+'0', ResourceTypes['dwk']);
    if(wokKey != null){
      Global.kotorKEY.GetFileData(wokKey, (buffer) => {

        this.dwk = new AuroraWalkMesh(new BinaryReader(buffer));
        if(typeof onLoad === 'function')
          onLoad(this.dwk);

      });

    }else{
      if(typeof onLoad === 'function')
        onLoad(null);
    }

  }

  InitProperties(){

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

    if(this.template.RootNode.HasField('Faction'))
      this.faction = this.template.GetFieldByLabel('Faction').GetValue();

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
      this.x = this.template.RootNode.GetFieldByLabel('X').GetValue();

    if(this.template.RootNode.HasField('Y'))
      this.y = this.template.RootNode.GetFieldByLabel('Y').GetValue();

    if(this.template.RootNode.HasField('Z'))
      this.z = this.template.RootNode.GetFieldByLabel('Z').GetValue();

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

  }

}

module.exports = ModuleDoor;
