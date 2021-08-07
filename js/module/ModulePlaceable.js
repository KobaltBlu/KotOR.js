/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModulePlaceable class.
 */

class ModulePlaceable extends ModuleObject {

  constructor ( gff = new GFFObject()) {
    super(gff);
    this.template = gff;

    this.openState = false;
    this._state = ModulePlaceable.STATE.NONE;
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

  onClick(callee = null){

    //You can't interact with yourself
    if(this === Game.player && Game.getCurrentPlayer() === this){
      return;
    }

    Game.getCurrentPlayer().actionUseObject( this );
    
  }

  update(delta = 0){
    
    super.update(delta);

    if(this.walkmesh && this.model){
      this.walkmesh.matrixWorld = this.model.matrix.clone();
    }

    if(this.model instanceof THREE.AuroraModel){

      this.model.rotation.copy(this.rotation);
      //this.model.quaternion = this.quaternion;

      if(this.room instanceof ModuleRoom){
        if(this.room.model instanceof THREE.AuroraModel){
          if(this.model){
            this.model.visible = this.room.model.visible;
          }
        }
      }

      if(this.model.visible)
        this.model.update(delta);

      this.audioEmitter.SetPosition(this.model.position.x, this.model.position.y, this.model.position.z);

      /*if(this.model.animations.length){

        let animState = this.getAnimationState();

        if(this.defaultAnimPlayed){

          if(this._state != animState){

            this._state = animState;
            switch(animState){
              case ModulePlaceable.STATE.DEFAULT:
                if(this.model.getAnimationByName('default')){
                  this.model.playAnimation('default', true);
                }
              break;
              case ModulePlaceable.STATE.OPEN:
                if(this.model.getAnimationByName('open')){
                  this.model.playAnimation('open', true);
                }
              break;
              case ModulePlaceable.STATE.CLOSED:
                if(this.model.getAnimationByName('close')){
                  this.model.playAnimation('close', true);
                }
              break;
              case ModulePlaceable.STATE.DEAD:
                if(this.model.getAnimationByName('dead')){
                  this.model.playAnimation('dead', false);
                }
              break;
              case ModulePlaceable.STATE.ON:
                if(this.model.getAnimationByName('on')){
                  this.model.playAnimation('on', false);
                }
              break;
              case ModulePlaceable.STATE.OFF:
                if(this.model.getAnimationByName('off')){
                  this.model.playAnimation('off', false);
                }
              break;
              default:
                this.model.playAnimation(this.model.animations[0], false);
              break;
            }

          }            

        }

      }*/
      
    }

    this.action = this.actionQueue[0];
    this.actionQueue.process( delta );

    if(this.animState == ModulePlaceable.AnimState.DEFAULT){
      if(this.isOpen()){
        this.animState = ModulePlaceable.AnimState.OPEN;
      }else{
        this.animState = ModulePlaceable.AnimState.CLOSE;
      }
    }

    if(!(this.model instanceof THREE.AuroraModel))
      return;

    let currentAnimation = this.model.getAnimationName();

    let animation = this.animationConstantToAnimation(this.animState);
    if(animation){
      if(currentAnimation != animation.name.toLowerCase()){
        let aLooping = (!parseInt(animation.fireforget) && parseInt(animation.looping) == 1);
        this.getModel().playAnimation(animation.name.toLowerCase(), aLooping, () => {
          this.animState = ModulePlaceable.AnimState.DEFAULT;
        });
      }
    }else{
      console.error('Animation Missing', this.getTag(), this.getName(), this.animState);
      this.animState = ModulePlaceable.AnimState.DEFAULT;
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

  setLocked(iValue){
    this.locked = iValue ? true : false;
  }

  requiresKey(){
    return this.keyRequired ? true : false;
  }

  keyName(){
    return this.keyName;
  }

  getAnimationState(){
    return this.animationState;
  }

  setAnimationState(state){
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

  getItem(resRef = ''){
    for(let i = 0; i<this.inventory.length; i++){
      let item = this.inventory[i];
      if(item.getTag().toLowerCase() == resRef.toLowerCase())
        return item;
    }
    return false;
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
    if(GameKey == 'TSL'){
      return Global.kotor2DA['placeables'].getRowByIndex(this.getAppearanceId());
    }else{
      return Global.kotor2DA['placeables'].rows[this.getAppearanceId()];
    }
  }

  getObjectSounds(){
    let plc = this.getAppearance();
    let soundIdx = parseInt(plc.soundapptype.replace(/\0[\s\S]*$/g,''));
    if(!isNaN(soundIdx)){
      return Global.kotor2DA['placeableobjsnds'].rows[soundIdx];
    }
    return {"(Row Label)":-1,"label":"","armortype":"","opened":"****","closed":"****","destroyed":"****","used":"****","locked":"****"};
  }

  retrieveInventory(){
    while(this.inventory.length){
      InventoryManager.addItem(this.inventory.pop())
    }

    if(this.scripts.onInvDisturbed instanceof NWScriptInstance){
      this.scripts.onInvDisturbed.run(Game.player);
    }

  }

  getModel(){
    return this.model;
  }

  use(object = undefined){

    this.lastUsedBy = object;

    if(this.getAnimationState() == ModulePlaceable.STATE.CLOSED){
      this.animState = ModulePlaceable.AnimState.CLOSE_OPEN;
    }else{
      this.animState = ModulePlaceable.AnimState.OPEN;
    }

    this.setAnimationState(ModulePlaceable.STATE.OPEN);

    if(this.getObjectSounds()['opened'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['opened'].toLowerCase());
    }

    if(this.hasInventory){
      Game.MenuContainer.Open(this);
    }else if(this.GetConversation() != ''){
      Game.InGameDialog.StartConversation(this.GetConversation(), object);
    }

    if(this.scripts.onUsed instanceof NWScriptInstance){
      //console.log('Running script', this.scripts.onUsed)
      this.scripts.onUsed.run(this);
    }

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

  close(object = null){
    if(this.scripts.onClosed instanceof NWScriptInstance){
      //console.log('Running script', this.scripts.onUsed)
      this.scripts.onClosed.run(this);
    }

    if(this.getAnimationState() == ModulePlaceable.STATE.OPEN){
      this.animState = ModulePlaceable.AnimState.OPEN_CLOSE;
    }else{
      this.animState = ModulePlaceable.AnimState.CLOSE;
    }

    this.setAnimationState(ModulePlaceable.STATE.CLOSED);

    if(this.getObjectSounds()['closed'] != '****'){
      this.audioEmitter.PlaySound(this.getObjectSounds()['closed'].toLowerCase());
    }
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields

      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.utp,
        onLoad: (gff) => {
          this.template.Merge(gff);
          this.InitProperties();
          this.LoadInventory( () => {
            this.LoadScripts( () => {

              if(onLoad != null)
                onLoad(this.template);
            });
          });          
        },
        onFail: () => {
          console.error('Failed to load placeable template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });

    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      this.LoadInventory( () => {
        this.LoadScripts( () => {
          if(onLoad != null)
            onLoad(this.template);
        });
      });
    }
  }

  LoadModel ( onLoad = null ){
    let modelName = this.getAppearance().modelname.replace(/\0[\s\S]*$/g,'').toLowerCase();
    //console.log('modelName', modelName);

    Game.ModelLoader.load({
      file: modelName,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (plc) => {

            let scene;
            if(this.model != null){
              scene = this.model.parent;
              scene.remove(this.model);
              Game.octree.remove( this.model );
              this.model.dispose();
            }

            this.model = plc;
            this.model.moduleObject = this;
            this.model.name = modelName;

            if(typeof scene != 'undefined'){
              scene.add(this.model);
              Game.octree.add( this.model );
            }

            this.position = this.model.position.copy(this.position);
            this.model.rotation.copy(this.rotation);
            this.model.quaternion.copy(this.quaternion);

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
          castShadow: true,
          //receiveShadow: true,
          //lighting: false,
          static: this.static,
          useTweakColor: this.useTweakColor,
          tweakColor: this.tweakColor
        });
      }
    });
  }

  LoadScripts (onLoad = null){
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

  LoadInventory( onLoad = null ){

    let inventory = this.getItemList();

    let itemLoop = (i = 0) => {
      if(i < inventory.length){
        this.LoadItem(GFFObject.FromStruct(inventory[i]), () => {
          i++
          itemLoop(i);
        });
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
    };
    itemLoop(0);
  }

  LoadItem( template, onLoad = null){

    let item = new ModuleItem(template);
    item.InitProperties();
    item.Load( () => {
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

  }

  LoadWalkmesh(ResRef = '', onLoad = null ){
    
    let wokKey = Global.kotorKEY.GetFileKey(ResRef, ResourceTypes['pwk']);
    if(wokKey != null){
      Global.kotorKEY.GetFileData(wokKey, (buffer) => {

        this.walkmesh = new AuroraWalkMesh(new BinaryReader(buffer));
        this.walkmesh.name = ResRef;
        this.walkmesh.moduleObject = this;
        this.model.add(this.walkmesh.mesh);

        if(typeof onLoad === 'function')
          onLoad(this.walkmesh);

      });

    }else{
      console.warn('ModulePlaceable', 'PWK Missing', ResRef);
      this.walkmesh = new AuroraWalkMesh();
      this.walkmesh.name = ResRef;
      this.walkmesh.moduleObject = this;

      if(typeof onLoad === 'function')
        onLoad(this.walkmesh);
    }

  }

  InitProperties(){
    
    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

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

    let actionList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ActionList') );
    gff.RootNode.AddField( new Field(GFFDataTypes.INT, 'Animation') ).SetValue(this.animState);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Appearance') ).SetValue(this.getAppearanceId());
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'AutoRemoveKey') ).SetValue(this.autoRemoveKey);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Bearing') ).SetValue(this.bearing);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'BodyBag') ).SetValue(this.bodyBag);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'CloseLockDC') ).SetValue(this.closeLockDC);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Commandable') ).SetValue(0);
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'Conversation') ).SetValue(this.conversation);
    gff.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'CurrentHP') ).SetValue(this.currentHP);
    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'Description') ).SetValue();
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'DieWhenEmpty') ).SetValue( this.isBodyBag ? 1 : 0 );
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'DisarmDC') ).SetValue(this.disarmDC);

    //Effects
    let effectList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'EffectList') );
    for(let i = 0; i < this.effects.length; i++){
      effectList.AddChildStruct( this.effects[i].save() );
    }

    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'Faction') ).SetValue(this.faction);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Fort') ).SetValue(this.fort);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'GroundPile') ).SetValue(1);
    gff.RootNode.AddField( new Field(GFFDataTypes.SHORT, 'HP') ).SetValue(this.hp);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Hardness') ).SetValue(this.hardness);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'HasInventory') ).SetValue(this.inventory.length ? 1 : 0);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'IsBodyBag') ).SetValue(this.isBodyBag ? 1 : 0);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'IsBodyBagVisible') ).SetValue(1);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'IsCorpse') ).SetValue(0);

    //Object Inventory
    if(this.inventory.length){
      let itemList = gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'ItemList') );
      for(let i = 0; i < this.inventory.length; i++){
        let itemStruct = this.inventory[i].save();
        itemList.AddChildStruct(itemStruct);
      }
    }

    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'KeyName') ).SetValue(this.keyName);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'KeyRequired') ).SetValue(this.keyRequired);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'LightState') ).SetValue(this.lightState ? 1 : 0);
    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOLOCSTRING, 'LocName') ).SetValue(this.locName);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Lockable') ).SetValue(this.lockable);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Locked') ).SetValue(this.locked);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Min1HP') ).SetValue(this.min1HP);
    gff.RootNode.AddField( new Field(GFFDataTypes.DWORD, 'ObjectId') ).SetValue(this.id);

    //Scripts
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnClosed') ).SetValue(this.scripts.onClosed ? this.scripts.onClosed.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDamaged') ).SetValue(this.scripts.onDamaged ? this.scripts.onDamaged.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDeath') ).SetValue(this.scripts.onDeath ? this.scripts.onDeath.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDialog') ).SetValue(this.scripts.onDialog ? this.scripts.onDialog.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnDisarm') ).SetValue(this.scripts.onDisarm ? this.scripts.onDisarm.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnEndDialogue') ).SetValue(this.scripts.onEndDialogue ? this.scripts.onEndDialogue.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnHeartbeat') ).SetValue(this.scripts.onHeartbeat ? this.scripts.onHeartbeat.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnInvDisturbed') ).SetValue(this.scripts.onInvDisturbed ? this.scripts.onInvDisturbed.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnLock') ).SetValue(this.scripts.onLock ? this.scripts.onLock.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnMeleeAttacked') ).SetValue(this.scripts.onMeleeAttacked ? this.scripts.onMeleeAttacked.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnOpen') ).SetValue(this.scripts.onOpen ? this.scripts.onOpen.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnSpellCastAt') ).SetValue(this.scripts.onSpellCastAt ? this.scripts.onSpellCastAt.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnTrapTriggered') ).SetValue(this.scripts.onTrapTriggered ? this.scripts.onTrapTriggered.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUnlock') ).SetValue(this.scripts.onUnlock ? this.scripts.onUnlock.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUsed') ).SetValue(this.scripts.onUsed ? this.scripts.onUsed.name : '');
    gff.RootNode.AddField( new Field(GFFDataTypes.RESREF, 'OnUserDefined') ).SetValue(this.scripts.onUserDefined ? this.scripts.onUserDefined.name : '');
    
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Open') ).SetValue(this.isOpen() ? 1 : 0);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'OpenLockDC') ).SetValue(this.openLockDC);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'PartyInteract') ).SetValue(this.partyInteract);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Plot') ).SetValue(this.plot);
    gff.RootNode.AddField( new Field(GFFDataTypes.WORD, 'PortraitId') ).SetValue(this.portraidId);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Ref') ).SetValue(this.ref);

    //SWVarTable
    let swVarTable = gff.RootNode.AddField( new Field(GFFDataTypes.STRUCT, 'SWVarTable') );
    swVarTable.AddChildStruct( this.getSWVarTableSaveStruct() );

    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Static') ).SetValue(this.static);
    gff.RootNode.AddField( new Field(GFFDataTypes.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDetectDC') ).SetValue(this.trapDetectDC);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDetectable') ).SetValue(this.trapDetectable);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapDisarmable') ).SetValue(this.trapDisarmable);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapFlag') ).SetValue(this.trapFlag);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapOneShot') ).SetValue(this.trapOneShot);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'TrapType') ).SetValue(this.trapType);
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Useable') ).SetValue(this.useable);
    gff.RootNode.AddField( new Field(GFFDataTypes.LIST, 'VarTable') );
    gff.RootNode.AddField( new Field(GFFDataTypes.BYTE, 'Will') ).SetValue(this.will);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'X') ).SetValue(this.position.x);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Y') ).SetValue(this.position.y);
    gff.RootNode.AddField( new Field(GFFDataTypes.FLOAT, 'Z') ).SetValue(this.position.z);

    this.template = gff;
    return gff;
  }

  toToolsetInstance(){

    let instance = new Struct(9);
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'Bearing', this.rotation.z)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
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

  animationConstantToAnimation( animation_constant = 10000 ){
    switch( animation_constant ){
      case ModulePlaceable.AnimState.DEFAULT:        //10000, //304 - 
        return Global.kotor2DA.animations.rows[304];
      case ModulePlaceable.AnimState.DAMAGE:         //10014, //305 - damage
        return Global.kotor2DA.animations.rows[305];
      case ModulePlaceable.AnimState.DEAD: 	    //10072, //307
        return Global.kotor2DA.animations.rows[307];
      case ModulePlaceable.AnimState.ACTIVATE: 	    //10073, //308 - NWSCRIPT Constant: 200
        return Global.kotor2DA.animations.rows[308];
      case ModulePlaceable.AnimState.DEACTIVATE:     //10074, //309 - NWSCRIPT Constant: 201
        return Global.kotor2DA.animations.rows[309];
      case ModulePlaceable.AnimState.OPEN: 			    //10075, //310 - NWSCRIPT Constant: 202
        return Global.kotor2DA.animations.rows[310];
      case ModulePlaceable.AnimState.CLOSE: 			  //10076, //311 - NWSCRIPT Constant: 203
        return Global.kotor2DA.animations.rows[311];
      case ModulePlaceable.AnimState.CLOSE_OPEN: 	  //10077, //312
        return Global.kotor2DA.animations.rows[312];
      case ModulePlaceable.AnimState.OPEN_CLOSE:    //10078, //313
        return Global.kotor2DA.animations.rows[313];
      case ModulePlaceable.AnimState.ANIMLOOP01:     //10106, //316 - NWSCRIPT Constant: 204
        return Global.kotor2DA.animations.rows[316];
      case ModulePlaceable.AnimState.ANIMLOOP02:     //10107, //317 - NWSCRIPT Constant: 205
        return Global.kotor2DA.animations.rows[317];
      case ModulePlaceable.AnimState.ANIMLOOP03:     //10108, //318 - NWSCRIPT Constant: 206
        return Global.kotor2DA.animations.rows[318];
      case ModulePlaceable.AnimState.ANIMLOOP04:     //10110, //319 - NWSCRIPT Constant: 207
        return Global.kotor2DA.animations.rows[319];
      case ModulePlaceable.AnimState.ANIMLOOP05:     //10111, //320 - NWSCRIPT Constant: 208
        return Global.kotor2DA.animations.rows[320];
      case ModulePlaceable.AnimState.ANIMLOOP06:     //10112, //321 - NWSCRIPT Constant: 209
        return Global.kotor2DA.animations.rows[321];
      case ModulePlaceable.AnimState.ANIMLOOP07:     //10113, //322 - NWSCRIPT Constant: 210
        return Global.kotor2DA.animations.rows[322];
      case ModulePlaceable.AnimState.ANIMLOOP08:     //10114, //323 - NWSCRIPT Constant: 211
        return Global.kotor2DA.animations.rows[323];
      case ModulePlaceable.AnimState.ANIMLOOP09:     //10115, //324 - NWSCRIPT Constant: 212
        return Global.kotor2DA.animations.rows[324];
      case ModulePlaceable.AnimState.ANIMLOOP10:     //10116, //325 - NWSCRIPT Constant: 213 
        return Global.kotor2DA.animations.rows[325];
    }

    return super.animationConstantToAnimation( animation_constant );
  }

}

ModulePlaceable.STATE = {
  NONE:        -1,
  DEFAULT:      0,
  OPEN:         1,
  CLOSED:       2,
  DEAD:         3,
  ON:           4,
  OFF:          5
};

ModulePlaceable.AnimState = {
  DEFAULT:    10000, //304 - 
  DAMAGE:     10014, //305 - damage
  DEAD: 	    10072, //307 - 
  ACTIVATE: 	10073, //308 - NWSCRIPT Constant: 200
  DEACTIVATE: 10074, //309 - NWSCRIPT Constant: 201
  OPEN: 			10075, //310 - NWSCRIPT Constant: 202
  CLOSE: 			10076, //311 - NWSCRIPT Constant: 203
  CLOSE_OPEN: 10077, //312 - 10077 is a guess
  OPEN_CLOSE: 10078, //313 - 10078 is a guess
  ANIMLOOP01: 10106, //316 - NWSCRIPT Constant: 204
  ANIMLOOP02: 10107, //317 - NWSCRIPT Constant: 205
  ANIMLOOP03: 10108, //318 - NWSCRIPT Constant: 206
  ANIMLOOP04: 10110, //319 - NWSCRIPT Constant: 207
  ANIMLOOP05: 10111, //320 - NWSCRIPT Constant: 208
  ANIMLOOP06: 10112, //321 - NWSCRIPT Constant: 209
  ANIMLOOP07: 10113, //322 - NWSCRIPT Constant: 210
  ANIMLOOP08: 10114, //323 - NWSCRIPT Constant: 211
  ANIMLOOP09: 10115, //324 - NWSCRIPT Constant: 212
  ANIMLOOP10: 10116, //325 - NWSCRIPT Constant: 213 
}

module.exports = ModulePlaceable;
