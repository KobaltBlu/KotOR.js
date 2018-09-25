/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCreature class.
 */

class ModuleCreature extends ModuleCreatureController {

  constructor ( gff = new GFFObject() ) {
    super();

    this.template = gff;

    this.isReady = false;
    this.anim = null;
    this.head = null;

    this.surfaceId = 0;
    this.isCommandable = true;

    this.lastTriggerEntered = null;
    this.lastTriggerExited = null;
    this.lastAreaEntered = null;
    this.lastAreaExited = null;
    this.lastModuleEntered = null;
    this.lastModuleExited = null;
    this.lastDoorEntered = null;
    this.lastDoorExited = null;
    this.lastPlaceableEntered = null;
    this.lastPlaceableExited = null;
    this.lastAoeEntered = null;
    this.lastAoeExited = null;

    this.appearance = 0;
    this.bodyBag = 0;
    this.bodyVariation = 0;
    this.cha = 0;
    this.challengeRating = 0;
    this.classes = [];
    this.comment = '';
    this.con = 0;
    this.conversation = '';
    this.currentForce = 0;
    this.currentHitPoints = 0;
    this.deity = '';
    this.description = '';
    this.dec = 0;
    this.disarmable = 0;

    this.equipment = {
      HEAD: undefined,
      ARMOR: undefined,
      ARMS: undefined,
      RIGHTHAND: undefined,
      LEFTHAND: undefined,
      LEFTARMBAND: undefined,
      RIGHTARMBAND: undefined,
      IMPLANT: undefined,
      BELT: undefined,
    
      CLAW1: undefined,
      CLAW2: undefined,
      CLAW3: undefined,
      HIDE:  undefined,
    };

    this.experience = 0;
    this.factionID = 0;
    this.feats = [];
    this.firstName = '';
    this.forcePoints = 0;
    this.gender = 0;
    this.goodEvil = 50;
    this.hitPoints = 0;
    this.int = 0;
    this.interruptable = 1;
    this.isPC = 0;
    this.lastName = '';
    this.maxHitPoints = 0;
    this.min1HP = 0;
    this.naturalAC = 0;
    this.noPermDeath = 0;
    this.notReorienting = 0;
    this.palletID = 0; //for use in biowares editor
    this.partyInteract = 0;
    this.perceptionRange = 0;
    this.phenotype = 0;
    this.plot = 0;
    this.portraidId = 0;
    this.race = 0;

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

    this.skills = [0, 0, 0, 0, 0, 0, 0, 0];

    this.soundSetFile = 0;
    this.specialAbilities = [];
    this.str = 0;
    this.subrace = 0;
    this.subraceIndex = 0;
    this.tag = '';
    this.templateList = [];
    this.templateResRef = '';
    this.textureVar = 1;
    this.walkRate = 7;
    this.wis = 0;
    this.fortbonus = 0;
    this.refbonus = 0;
    this.willbonus = 0;

    this.xPosition = 0;
    this.yPosition = 0;
    this.zPosition = 0;
    this.xOrientation = 0;
    this.yOrientation = 0;
    this.zOrientation = 0;

    this.perceptionList = [];

    this.animState = ModuleCreature.AnimState.IDLE;
    this.actionQueue = [];
    this.combatActionTimer = 6; 
    this.combatAction = undefined;
    this.combatState = false;
    this.combatQueue = [];

    this.lockDialogOrientation = false;

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

      this.footstepEmitter = new AudioEmitter({
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
      Game.audioEngine.AddEmitter(this.footstepEmitter);
    }catch(e){
      console.error('AudioEmitter failed to create on object', e);
    }

  }

  SetFacingVector( facing = new THREE.Vector3() ){

    this.props['XOrientation'] = facing.x;
    this.props['YOrientation'] = facing.y;

      if(this.model != THREE.AuroraModel)
        this.model.quaternion.setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.atan2(this.props['XOrientation'], this.props['YOrientation']));

  }

  GetFacingVector(){
      if(this.model != THREE.AuroraModel){
        let facing = new THREE.Vector3(0, 1, 0);
        facing.applyQuaternion(this.model.quaternion);
        return facing;
      }
    return new THREE.Vector3(0, 0, 0);
  }

  GetPosition(){
    return this.position.clone();
  }

  GetFacing(){
    return this.rotation.z;
  }

  onClick(callee = null){

    //You can't interact with yourself
    if(this === Game.player && Game.getCurrentPlayer() === this){
      return;
    }

    if(this.isHostile(callee)){
      Game.getCurrentPlayer().attackCreature(this, 0);
    }else{
      Game.getCurrentPlayer().actionQueue.push({
        object: this,
        conversation: this.GetConversation(),
        ignoreStartRange: false,
        goal: ModuleCreature.ACTION.DIALOGOBJECT
      });
    }
    
  }

  isUseable(){
    return true;
  }

  isDead(){
    return this.getHP() <= 0 && !this.min1HP;
  }

  isHostile(target = undefined){

    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget

    if(!(target instanceof ModuleCreature))
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

    if(!(target instanceof ModuleCreature))
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

    if(!(target instanceof ModuleCreature))
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];

    if(targetFaction.label.toLowerCase() == 'player'){
      return targetFaction[faction.label.toLowerCase()] >= 90;
    }else{
      return faction[targetFaction.label.toLowerCase()] >= 90;
    }

  }

  getReputation(target){
    // -> 0-10 means oSource is hostile to oTarget
    // -> 11-89 means oSource is neutral to oTarget
    // -> 90-100 means oSource is friendly to oTarget
    if(!(target instanceof ModuleCreature))
      return false;

    let targetFaction = Global.kotor2DA["repute"].rows[target.getFactionID()];
    let faction = Global.kotor2DA["repute"].rows[this.getFactionID()];

    if(targetFaction.label.toLowerCase() == 'player'){
      return targetFaction[faction.label.toLowerCase()];
    }else{
      return faction[targetFaction.label.toLowerCase()];
    }
  }

  setCommadable(bCommandable = 0){
    this.isCommandable = bCommandable;
  }

  getCommadable(){
    return this.isCommandable;
  }

  getItemInSlot(slot = 0){
    switch(slot){
      case UTCObject.SLOT.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case UTCObject.SLOT.HEAD:
        return this.equipment.HEAD;
      break;
      case UTCObject.SLOT.ARMS:
        return this.equipment.ARMS;
      break;
      case UTCObject.SLOT.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case UTCObject.SLOT.ARMOR:
        return this.equipment.ARMOR;
      break;
      case UTCObject.SLOT.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case UTCObject.SLOT.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case UTCObject.SLOT.BELT:
        return this.equipment.BELT;
      break;
      case UTCObject.SLOT.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case UTCObject.SLOT.CLAW1:
        return this.equipment.CLAW1;
      break;
      case UTCObject.SLOT.CLAW2:
        return this.equipment.CLAW2;
      break;
      case UTCObject.SLOT.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }
  }

  hasItemInSlot(sTag='', slot = 0, ){
    switch(slot){
      case UTCObject.SLOT.ARMOR:
        if(this.equipment.ARMOR){

        }
      break;
      case UTCObject.SLOT.RIGHTHAND:
        try{
          if(this.getAppearance().modeltype != 'S'){
            if(this.equipment.RIGHTHAND instanceof ModuleItem){
              this.model.rhand.add(this.equipment.RIGHTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
      case UTCObject.SLOT.LEFTHAND:
        try{
          if(this.getAppearance().modeltype != 'S' && this.getAppearance().modeltype != 'L'){
            if(this.equipment.LEFTHAND instanceof ModuleItem){
              this.model.lhand.add(this.equipment.LEFTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
    }
  }

  getInventory(){
    if(this.isPartyMember()){
      return InventoryManager.getInventory();
    }else{
      return this.inventory;
    }
    /*if(this.template.RootNode.HasField('ItemList')){
      return this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
    }
    return [];*/
  }

  getXPosition(){
    return this.xPosition;
  }

  getYPosition(){
    return this.yPosition;
  }

  getZPosition(){
    return this.zPosition;
  }

  getXOrientation(){
    return this.xOrientation;
  }

  getYOrientation(){
    return this.yOrientation;
  }

  getZOrientation(){
    return this.zOrientation;
  }

  GetRotation(){
    if(this.model){
      return Math.floor(this.model.rotation.z * 180) + 180
    }
    return 0;
  }

  getRace(){
    return this.race;
  }

  getSubRace(){
    return this.subrace;
  }

  getGender(){
    return this.gender;
  }

  getFactionID(){
    return this.factionID;
  }

  getXP(){
    return this.experience;
  }

  setXP(iValue = 0){
    this.experience = iValue;
  }

  addXP(iValue = 0){
    this.experience += parseInt(iValue);
  }

  getGoodEvil(){
    return this.goodEvil;
  }

  setHP(nVal = 0){
    this.currentHitPoints = nVal;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  addHP(nVal = 0){
    this.currentHitPoints = (this.getHP() + nVal);
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  subtractHP(nVal = 0){
    this.setHP(this.getHP() - nVal);
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  getHP(){
    return this.currentHitPoints;
  }

  getMaxHP(){
    return this.maxHitPoints;
  }

  setMaxHP(nVal = 0){
    return this.maxHitPoints = nVal;
  }

  setMinOneHP(iVal){
    this.min1HP = iVal ? true : false;
  }

  getSTR(){
    return this.str;
  }

  getDEX(){
    return this.dex;
  }

  getCON(){
    return this.con;
  }

  getCHA(){
    return this.cha;
  }

  getWIS(){
    return this.wis;
  }

  getINT(){
    return this.int;
  }

  getIsPC(){
    return this.isPC;
  }

  getPortraitId(){
    return this.portraidId;
  }

  getWalkRateId(){
    return this.walkRate;
  }

  getName(){
    return this.firstName;
  }

  getAppearance(){
    if(this.GetEffect(62)){
      return Global.kotor2DA["appearance"].rows[this.GetEffect(62).appearance];
    }else{
      return Global.kotor2DA["appearance"].rows[this.appearance];
    }
  }

  getClassList(){
    if(this.template.RootNode.HasField('ClassList')){
      return this.template.RootNode.GetFieldByLabel('ClassList').GetChildStructs();
    }
    return [];
  }

  getTotalClassLevel(){
    let total = 0;
    for(let i = 0; i < this.classes.length; i++){
      total += parseInt(this.classes[i].level);
    }
    return total;
  }

  getClassLevel(iClass){
    for(let i = 0; i < this.classes.length; i++){
      if(this.classes[i].class_id == iClass){
        return this.classes[i].level;
      }
    }
    return 0;
  }

  getSkillList(){
    if(this.template.RootNode.HasField('SkillList')){
      return this.template.RootNode.GetFieldByLabel('SkillList').GetChildStructs();
    }
    return [];
  }

  getHasSkill(iSkill){
    return this.skills[iSkill] > 0;
  }

  getSkillLevel(iSkill){
    return this.skills[iSkill];
  }

  getPerceptionRange(){
    return parseInt(Global.kotor2DA['ranges'].rows[this.perceptionRange].primaryrange);
  }

  getPerceptionRangeSecondary(){
    return parseInt(Global.kotor2DA['ranges'].rows[this.perceptionRange].secondaryrange);
  }


  isSimpleCreature(){
    return this.getAppearance().modeltype === 'S' || this.getAppearance().modeltype === 'L';
  }

  hasPerceived(creature = null){
    if(creature == null)
      return false;


    
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: UTCObject.ResType,
        onLoad: (gff) => {

          this.template.Merge(gff);
          this.InitProperties();
          this.LoadEquipment( () => {
            if(onLoad != null)
              onLoad(this.template);
          });
        },
        onFail: () => {
          console.error('Failed to load character template');
        }
      });
    }else{
      this.InitProperties();
      this.LoadEquipment( () => {
        //We already have the template (From SAVEGAME)
        if(onLoad != null)
          onLoad(this.template);
      });
    }
  }

  LoadScripts (onLoad = null){

    this.scripts.onAttacked = this.template.GetFieldByLabel('ScriptAttacked').GetValue();
    this.scripts.onDamaged = this.template.GetFieldByLabel('ScriptDamaged').GetValue();
    this.scripts.onDeath = this.template.GetFieldByLabel('ScriptDeath').GetValue();
    this.scripts.onDialog = this.template.GetFieldByLabel('ScriptDialogue').GetValue();
    this.scripts.onDisturbed = this.template.GetFieldByLabel('ScriptDisturbed').GetValue();
    this.scripts.onEndDialog = this.template.GetFieldByLabel('ScriptEndDialogu').GetValue();
    this.scripts.onEndRound = this.template.GetFieldByLabel('ScriptEndRound').GetValue();
    this.scripts.onHeartbeat = this.template.GetFieldByLabel('ScriptHeartbeat').GetValue();
    this.scripts.onBlocked = this.template.GetFieldByLabel('ScriptOnBlocked').GetValue();
    this.scripts.onNotice = this.template.GetFieldByLabel('ScriptOnNotice').GetValue();
    this.scripts.onRested = this.template.GetFieldByLabel('ScriptRested').GetValue();
    this.scripts.onSpawn = this.template.GetFieldByLabel('ScriptSpawn').GetValue();
    this.scripts.onSpellAt = this.template.GetFieldByLabel('ScriptSpellAt').GetValue();
    this.scripts.onUserDefined = this.template.GetFieldByLabel('ScriptUserDefine').GetValue();

    let len = 14;
    let keys = Object.keys(this.scripts);

    let loadScript = ( onLoad = null, i = 0 ) => {
      
      if(i < len){
        let script = this.scripts[keys[i]];

        if(script != '' && !(script instanceof NWScript)){
          ResourceLoader.loadResource(ResourceTypes['ncs'], script, (buffer) => {
            this.scripts[keys[i]] = new NWScript(buffer);
            this.scripts[keys[i]].name = script;
            loadScript( onLoad, ++i );
          }, () => {
            loadScript( onLoad, ++i );
          });
        }else{
          loadScript( onLoad, ++i );
        }
      }else{
        if(typeof onLoad === 'function')
          onLoad();
      }
  
    };

    loadScript(onLoad, 0);

  }

  LoadModel ( onLoad = null ){

    this.isReady = false;

    //this.LoadEquipment( () => {
      this.LoadBody( () => {
        this.LoadHead( () => {
          TextureLoader.LoadQueue(() => {
            this.isReady = true;

            //if(this.head)
              //this.head.buildSkeleton();

            if(onLoad != null)
              onLoad(this.model);
          }, (texName) => {
            //loader.SetMessage('Loading Textures: '+texName);
          });
        });
      });
    //});

  }

  LoadBody( onLoad = null ){
    let appearance = this.getAppearance();
    this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.textureVar = 1;
    if(this.equipment.ARMOR instanceof ModuleItem){
      this.textureVar = this.equipment.ARMOR.getTextureVariation() || 1;
      //console.log('ModuleCreature', this, this.textureVar);
      if(appearance.modeltype != 'B'){

        let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'');
        this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();
        let match = raceTex.match(/\d+/);

        this.bodyTexture = raceTex;
        
        /*if(match && this.textureVar){

          match = match[0];
          this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? pad( this.textureVar, match.length ) : '' );
          //console.log('ModuleCreature', this, this.bodyTexture, this.textureVar);
        }else{

          this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)
          //console.log('ModuleCreature', this, raceTex);
        }*/

        //console.log('ModuleCreature', 'body 1', this, this.bodyTexture, raceTex, this.textureVar, appearance);
        
      }else{
        switch(this.equipment.ARMOR.getBodyVariation().toLowerCase()){
          case 'a':
            this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'b':
            this.bodyModel = appearance.modelb.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texb.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'c':
            this.bodyModel = appearance.modelc.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texc.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'd':
            this.bodyModel = appearance.modeld.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texd.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'e':
            this.bodyModel = appearance.modele.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texe.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'f':
            this.bodyModel = appearance.modelf.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texf.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'g':
            this.bodyModel = appearance.modelg.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texg.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'h':
            this.bodyModel = appearance.modelh.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texh.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          case 'i':
            this.bodyModel = appearance.modeli.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texi.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
          default:
            this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
            this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase();// + pad( this.textureVar, 2);
          break;
        }

        if(this.bodyTexture != '****'){
          this.bodyTexture += pad( this.textureVar, 2);
        }

        //console.log('ModuleCreature', 'body 1B', this, this.bodyTexture, this.bodyModel, this.textureVar, appearance);
      }
      
    }else{
      if(appearance.modeltype != 'B'){
        let raceTex = appearance.racetex.replace(/\0[\s\S]*$/g,'').toLowerCase();
        this.bodyModel = appearance.race.replace(/\0[\s\S]*$/g,'').toLowerCase();

        let match = raceTex.match(/\d+/);
        if(match && this.textureVar > 1){
          match = match[0];
          this.bodyTexture = raceTex.replace( new RegExp("[0-9]+", "g"), this.textureVar ? pad( this.textureVar, match.length ) : '' );
        }else{
          this.bodyTexture = raceTex; //(raceTex != '****' ? raceTex : 0) + ((this.textureVar < 10) ? (this.textureVar) : this.textureVar)
        }

        //console.log('ModuleCreature', 'body 2', this, this.bodyTexture, raceTex, this.textureVar, appearance);
      }else{
        this.bodyModel = appearance.modela.replace(/\0[\s\S]*$/g,'').toLowerCase();
        this.bodyTexture = appearance.texa.replace(/\0[\s\S]*$/g,'').toLowerCase() + pad( this.textureVar, 2);

        //console.log('ModuleCreature', 'body 2B', this, this.bodyTexture, this.bodyModel, this.textureVar, appearance);
      }
    }

    if(this.bodyModel == '****'){
      this.model = new THREE.Object3D();
      if(typeof onLoad === 'function')
        onLoad();
    }else{
      Game.ModelLoader.load({
        file: this.bodyModel,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            castShadow: true,
            receiveShadow: true,
            textureVar: this.bodyTexture,
            context: this.context,
            onComplete: (model) => {

              if(this.model instanceof THREE.AuroraModel && this.model.parent){
                var scene = this.model.parent;
                var position = this.model.position;
                var rotation = this.model.rotation;

                if(this.head && this.head.parent){
                  this.head.parent.remove(this.head);
                }
                try{
                  this.model.dispose();
                }catch(e){}
                try{
                  if(scene)
                    scene.remove(this.model);
                }catch(e){}
              }

              this.model = model;
              this.model.moduleObject = this;

              try{
                if(this.equipment.LEFTHAND instanceof ModuleItem){
                  this.model.lhand.add(this.equipment.LEFTHAND.model);
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              try{
                if(this.equipment.RIGHTHAND instanceof ModuleItem){
                  this.model.rhand.add(this.equipment.RIGHTHAND.model);
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              if(scene){
                scene.add( this.model );
                Game.octree.add( this.model );
                this.model.position.copy(position);
                this.model.rotation.set(rotation.x, rotation.y, rotation.z);
              }

              this.position = this.model.position;
              this.rotation = this.model.rotation;
              this.quaternion = this.model.quaternion;

              if(typeof onLoad === 'function')
                onLoad();

            }
          });
        }
      });
    }
  }

  LoadHead( onLoad = null ){
    let appearance = this.getAppearance();
    let headId = appearance.normalhead.replace(/\0[\s\S]*$/g,'').toLowerCase();

    if(headId != '****'){
      let head = Global.kotor2DA['heads'].rows[headId];
      Game.ModelLoader.load({
        file: head.head.replace(/\0[\s\S]*$/g,'').toLowerCase(),
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            onComplete: (head) => {
              try{
                this.head = head;
                this.model.headhook.add(head);
                //head.buildSkeleton();

                if(typeof onLoad === 'function')
                  onLoad();
              }catch(e){
                console.error(e);
                if(typeof onLoad === 'function')
                  onLoad();
              }
            },
            context: this.context,
            castShadow: true,
            receiveShadow: true
          });
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  getEquip_ItemList(){
    if(this.template.RootNode.HasField('Equip_ItemList')){
      return this.template.GetFieldByLabel('Equip_ItemList').GetChildStructs()
    }
    return [];
  }

  equipItem(slot = 0x1, item = '', onLoad = null){

    this.unequipSlot(slot);

    if(item instanceof ModuleItem){
      item.LoadModel( () => {
        switch(slot){
          case UTCObject.SLOT.ARMOR:
            this.equipment.ARMOR = item;

            if(this.equipment.ARMOR.isDisguise()){
              this.RemoveEffect(62); //EFFECT_DISGUISE
              this.AddEffect({type: 62, appearance: this.equipment.ARMOR.getDisguiseAppearance()})
            }

            this.LoadModel( () => {
              //this.getModel().buildSkeleton()
              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case UTCObject.SLOT.RIGHTHAND:
            this.equipment.RIGHTHAND = item;
            item.LoadModel( () => {
              this.model.rhand.add(item.model);
              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case UTCObject.SLOT.LEFTHAND:
            this.equipment.LEFTHAND = item;
            this.model.lhand.add(item.model);
          break;
          case UTCObject.SLOT.CLAW1:
            this.equipment.CLAW1 = item;
          break;
          case UTCObject.SLOT.CLAW2:
            this.equipment.CLAW2 = item;
          break;
          case UTCObject.SLOT.CLAW3:
            this.equipment.CLAW3 = item;
          break;
        }
      });
    }else{

      TemplateLoader.Load({
        ResRef: item,
        ResType: ResourceTypes.uti,
        onLoad: (gff) => {
          this.LoadEquipmentItem({
            gff: gff,
            Slot: slot,
            onLoad: () => {
              if(typeof onLoad == 'function')
                onLoad();
            }
          });
        },
        onFail: () => {
          console.error('Failed to load item template');
        }
      });

    }
  }

  unequipSlot(slot = 0x1){
    try{
      switch(slot){
        case UTCObject.SLOT.ARMOR:

          if(this.equipment.ARMOR instanceof ModuleItem){
            if(this.equipment.ARMOR.isDisguise()){
              this.RemoveEffect(62); //EFFECT_DISGUISE
            }
          }

          this.equipment.ARMOR = undefined;
          this.LoadModel( () => {
            this.getModel().buildSkeleton()
          });
        break;
        case UTCObject.SLOT.RIGHTHAND:
          try{
            if(this.equipment.RIGHTHAND instanceof ModuleItem){
              this.model.rhand.remove(this.equipment.RIGHTHAND.model);
              this.equipment.RIGHTHAND.destroy();
              this.equipment.RIGHTHAND = undefined;
            }
          }catch(e){
            
          }
        break;
        case UTCObject.SLOT.LEFTHAND:
          try{
            if(this.equipment.LEFTHAND instanceof ModuleItem){
              this.model.lhand.remove(this.equipment.LEFTHAND.model);
              this.equipment.LEFTHAND.destroy();
              this.equipment.LEFTHAND = null;
            }
          }catch(e){
            
          }
        break;
      }
    }catch(e){
      console.error('unequipItem', e);
    }
  }

  LoadEquipment( onLoad = null){
    this.ParseEquipmentSlots( () => {
      if(typeof onLoad === 'function')
        onLoad();
    });
  }

  ParseEquipmentSlots( onLoad = null, cEquip = 0){
    let equipment = this.getEquip_ItemList();
    if(cEquip < equipment.length){
      let equip = equipment[cEquip];
      let type = equip.GetType();
      this.LoadEquipmentItem({
        gff: GFFObject.FromStruct(equip, equip.GetType()),
        Slot: type,
        onLoad: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        },
        onError: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }

  }

  UnequipItems(){
    //this.unequipSlot(UTCObject.SLOT.ARMOR);
    this.unequipSlot(UTCObject.SLOT.LEFTHAND);
    this.unequipSlot(UTCObject.SLOT.RIGHTHAND);
  }

  UnequipHeadItem(){
    this.unequipSlot(UTCObject.SLOT.HEAD);
  }

  GetItemInSlot(slot = 0){

    switch(slot){
      case UTCObject.SLOT.IMPLANT:
        return this.equipment.IMPLANT;
      break;
      case UTCObject.SLOT.HEAD:
        return this.equipment.HEAD;
      break;
      case UTCObject.SLOT.ARMS:
        return this.equipment.ARMS;
      break;
      case UTCObject.SLOT.LEFTARMBAND:
        return this.equipment.LEFTARMBAND;
      break;
      case UTCObject.SLOT.ARMOR:
        return this.equipment.ARMOR;
      break;
      case UTCObject.SLOT.RIGHTARMBAND:
        return this.equipment.RIGHTARMBAND;
      break;
      case UTCObject.SLOT.LEFTHAND:
        return this.equipment.LEFTHAND;
      break;
      case UTCObject.SLOT.BELT:
        return this.equipment.BELT;
      break;
      case UTCObject.SLOT.RIGHTHAND:
        return this.equipment.RIGHTHAND;
      break;
      case UTCObject.SLOT.CLAW1:
        return this.equipment.CLAW1;
      break;
      case UTCObject.SLOT.CLAW2:
        return this.equipment.CLAW2;
      break;
      case UTCObject.SLOT.CLAW3:
        return this.equipment.CLAW3;
      break;
      default:
        return null;
      break;
    }

  }

  GetEquippedSlot(slot = 0){
    let equipment = this.getEquip_ItemList();
    for(let i = 0; i < equipment.length; i++){
      let equip = equipment[i];
      let type = equip.GetType();
      this.LoadEquipmentItem({
        gff: GFFObject.FromStruct(equip, equip.GetType()),
        Slot: type,
        onLoad: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        },
        onError: () => {
          cEquip++;
          this.ParseEquipmentSlots( onLoad, cEquip );
        }
      });
    }
  }



  LoadEquipmentItem(args = {}){

    args = $.extend({
      gff: new GFFObject(),
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);
    //console.log('LoadEquipmentItem', args);
    let uti = new ModuleItem(args.gff);
    switch(args.Slot){
      case UTCObject.SLOT.ARMOR:
        this.equipment.ARMOR = uti;
      break;
      case UTCObject.SLOT.RIGHTHAND:
        this.equipment.RIGHTHAND = uti;
      break;
      case UTCObject.SLOT.LEFTHAND:
        this.equipment.LEFTHAND = uti;
      break;
      case UTCObject.SLOT.CLAW1:
        this.equipment.CLAW1 = uti;
      break;
      case UTCObject.SLOT.CLAW2:
        this.equipment.CLAW2 = uti;
      break;
      case UTCObject.SLOT.CLAW3:
        this.equipment.CLAW3 = uti;
      break;
    }
    
    uti.Load( () => {
      uti.LoadModel( () => {
        if(args.Slot == UTCObject.SLOT.RIGHTHAND || args.Slot == UTCObject.SLOT.LEFTHAND){
          uti.model.playAnimation('off', true);
        }
        if(typeof args.onLoad == 'function')
          args.onLoad();
      });
    });

  }

  InitProperties( onLoad = null ){

    if(this.template.RootNode.HasField('Appearance_Type'))
      this.appearance = this.template.GetFieldByLabel('Appearance_Type').GetValue();

    if(this.template.RootNode.HasField('BodyBag'))
      this.bodyBag = this.template.GetFieldByLabel('BodyBag').GetValue();

    if(this.template.RootNode.HasField('BodyVariation'))
      this.bodyBag = this.template.GetFieldByLabel('BodyVariation').GetValue();

    if(this.template.RootNode.HasField('ChallengeRating'))
      this.challengeRating = this.template.GetFieldByLabel('ChallengeRating').GetValue();

    if(this.template.RootNode.HasField('ClassList')){
      let classes = this.template.RootNode.GetFieldByLabel('ClassList').GetChildStructs();
      for(let i = 0; i < classes.length; i++){
        let cls = classes[i];
        //cls.GetFieldByLabel('KnownList').GetChildStructs()
        this.classes.push({
          class_id: cls.GetFieldByLabel('Class').GetValue(),
          level: cls.GetFieldByLabel('ClassLevel').GetValue(),
          known: []
        });
      }
    }

    if(this.template.RootNode.HasField('Conversation'))
      this.conversation = this.template.GetFieldByLabel('Conversation').GetValue();

    if(this.template.RootNode.HasField('CurrentForce'))
      this.currentForce = this.template.GetFieldByLabel('CurrentForce').GetValue();

    if(this.template.RootNode.HasField('CurrentHitPoints'))
      this.currentHitPoints = this.template.GetFieldByLabel('CurrentHitPoints').GetValue();

    if(this.template.RootNode.HasField('Disarmable'))
      this.disarmable = this.template.GetFieldByLabel('Disarmable').GetValue();
  
    if(this.template.RootNode.HasField('Experience'))
      this.experience = this.template.RootNode.GetFieldByLabel('Experience').GetValue();
        
    if(this.template.RootNode.HasField('FactionID'))
      this.factionID = this.template.RootNode.GetFieldByLabel('FactionID').GetValue();

    if(this.template.RootNode.HasField('FeatList')){
      let feats = this.template.RootNode.GetFieldByLabel('FeatList').GetChildStructs();
      for(let i = 0; i < feats.length; i++){
        this.feats.push(
          feats[i].GetFieldByLabel('Feat').GetValue()
        );
      }
    }

    if(this.template.RootNode.HasField('FirstName'))
      this.firstName = this.template.RootNode.GetFieldByLabel('FirstName').GetCExoLocString().GetValue();
    
    if(this.template.RootNode.HasField('ForcePoints'))
      this.forcePoints = this.template.RootNode.GetFieldByLabel('ForcePoints').GetValue();
        
    if(this.template.RootNode.HasField('Gender'))
      this.gender = this.template.RootNode.GetFieldByLabel('Gender').GetValue();
  
    if(this.template.RootNode.HasField('GoodEvil'))
      this.goodEvil = this.template.RootNode.GetFieldByLabel('GoodEvil').GetValue();
      
    if(this.template.RootNode.HasField('HitPoints'))
      this.hitPoints = this.template.GetFieldByLabel('HitPoints').GetValue();

    if(this.template.RootNode.HasField('Interruptable'))
      this.interruptable = this.template.GetFieldByLabel('Interruptable').GetValue();

    if(this.template.RootNode.HasField('IsPC'))
      this.isPC = this.template.GetFieldByLabel('IsPC').GetValue();

    if(this.template.RootNode.HasField('LastName'))
      this.lastName = this.template.GetFieldByLabel('LastName').GetValue();

    if(this.template.RootNode.HasField('MaxHitPoints'))
      this.maxHitPoints = this.template.GetFieldByLabel('MaxHitPoints').GetValue();

    if(this.template.RootNode.HasField('Min1HP'))
      this.min1HP = this.template.GetFieldByLabel('Min1HP').GetValue();

    if(this.template.RootNode.HasField('NaturalAC'))
      this.naturalAC = this.template.GetFieldByLabel('NaturalAC').GetValue();

    if(this.template.RootNode.HasField('NoPermDeath'))
      this.noPermDeath = this.template.GetFieldByLabel('NoPermDeath').GetValue();

    if(this.template.RootNode.HasField('NotReorienting'))
      this.notReorienting = this.template.GetFieldByLabel('NotReorienting').GetValue();

    if(this.template.RootNode.HasField('PartyInteract'))
      this.partyInteract = this.template.GetFieldByLabel('PartyInteract').GetValue();

    if(this.template.RootNode.HasField('PerceptionRange'))
      this.perceptionRange = this.template.GetFieldByLabel('PerceptionRange').GetValue();

    if(this.template.RootNode.HasField('Phenotype'))
      this.phenotype = this.template.GetFieldByLabel('Phenotype').GetValue();

    if(this.template.RootNode.HasField('Plot'))
      this.plot = this.template.GetFieldByLabel('Plot').GetValue();

    if(this.template.RootNode.HasField('PortraitId'))
      this.portraidId = this.template.GetFieldByLabel('PortraitId').GetValue();
  
    if(this.template.RootNode.HasField('Race'))
      this.race = this.template.RootNode.GetFieldByLabel('Race').GetValue();

    if(this.template.RootNode.HasField('SkillList')){
      let skills = this.template.RootNode.GetFieldByLabel('SkillList').GetChildStructs();
      for(let i = 0; i < skills.length; i++){
        this.skills[i] = skills[i].GetFieldByLabel('Rank').GetValue()
      }
    }

    if(this.template.RootNode.HasField('SoundSetFile'))
      this.soundSetFile = this.template.RootNode.GetFieldByLabel('SoundSetFile').GetValue();
  
    if(this.template.RootNode.HasField('SubRace'))
      this.subrace = this.template.RootNode.GetFieldByLabel('SubRace').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue();

    if(this.template.RootNode.HasField('TemplateResRef'))
      this.templateResRef = this.template.GetFieldByLabel('TemplateResRef').GetValue();

    if(this.template.RootNode.HasField('TextureVar'))
      this.textureVar = this.template.GetFieldByLabel('TextureVar').GetValue();

    if(this.template.RootNode.HasField('WalkRate'))
      this.walkRate = this.template.GetFieldByLabel('WalkRate').GetValue();

    if(this.template.RootNode.HasField('Str'))
      this.str = this.template.GetFieldByLabel('Str').GetValue();
  
    if(this.template.RootNode.HasField('Dex'))
      this.dex = this.template.GetFieldByLabel('Dex').GetValue();
  
    if(this.template.RootNode.HasField('Con'))
      this.con = this.template.GetFieldByLabel('Con').GetValue();
  
    if(this.template.RootNode.HasField('Cha'))
      this.cha = this.template.GetFieldByLabel('Cha').GetValue();
  
    if(this.template.RootNode.HasField('Wis'))
      this.wis = this.template.GetFieldByLabel('Wis').GetValue();
  
    if(this.template.RootNode.HasField('Int'))
      this.int = this.template.GetFieldByLabel('Int').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.xPosition = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.yPosition = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.zPosition = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('XOrientation'))
      this.xOrientation = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

    if(this.template.RootNode.HasField('YOrientation'))
      this.yOrientation = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

    if(this.template.RootNode.HasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();


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

  followLeader(){
    //The follow leader action will be controlled by the heartbeat script when it is implemented
    this.actionQueue.push({object: Game.player, goal: ModuleCreature.ACTION.FOLLOWLEADER});
  }

}

ModuleCreature.AnimState = {
  DIEING: -2,
  DEAD: -1,
  IDLE: 0,
  WALKING: 1,
  RUNNING: 2
};

ModuleCreature.ACTION = {
  MOVETOPOINT: 0,
  PICKUPITEM: 1,
  DROPITEM: 2,
  ATTACKOBJECT: 3,
  CASTSPELL: 4,
  OPENDOOR: 5,
  CLOSEDOOR: 6,
  DIALOGOBJECT: 7,
  DISABLETRAP: 8,
  RECOVERTRAP: 9,
  FLAGTRAP: 10,
  EXAMINETRAP: 11,
  SETTRAP: 12,
  OPENLOCK: 13,
  LOCK: 14,
  USEOBJECT: 15,
  ANIMALEMPATHY: 16,
  REST: 17,
  TAUNT: 18,
  ITEMCASTSPELL: 19,
  COUNTERSPELL: 31,
  HEAL: 33,
  PICKPOCKET: 34,
  FOLLOW: 35,
  WAIT: 36,
  SIT: 37,
  FOLLOWLEADER: 38,
  ANIMATE: 65532,
  SCRIPT: 65533,
  INVALID: 65535,
  QUEUEEMPTY: 65534,
};

module.exports = ModuleCreature;
