/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleCreature class.
 */

class ModuleCreature extends ModuleCreatureController {

  constructor ( gff = new GFFObject() ) {
    super(gff);

    this.template = gff;

    this.isReady = false;
    this.anim = null;
    this.head = null;
    this.deathAnimationPlayed = false;
    this.aiStyle = 0;

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

    //Last target this creature attempted to attack
    this.lastAttemptedAttackTarget = undefined;
    //Last target attacked by this creature
    this.lastAttackTarget = undefined;
    //Last target attacked with a spell by this creature
    this.lastSpellTarget = undefined;
    //Last attempted target attacked with a spell by this creature
    this.lastAttemptedSpellTarget = undefined;
    //Last creature who damaged this creature
    this.lastDamager = undefined;
    //Last creature who attacked this creature
    this.lastAttacker = undefined;
    //Last creature who attacked this creature with a spell
    this.lastSpellAttacker = undefined;
    //Last Combat Feat Used
    this.lastCombatFeatUsed = undefined;
    //Last Force Power Used
    this.lastForcePowerUsed = undefined;

    this.appearance = 0;
    this.pm_Appearance = 0;
    this.pm_IsDisguised = 0;
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
    this.isHologram = false;
    this.overlayAnimation = undefined;

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
    this.faction = 0;
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
    this.combatActionTimer = 3; 
    this.combatAction = undefined;
    this.combatState = false;
    this.combatQueue = [];
    this.lastAttackAction = -1;
    this.blockingTimer = 0;

    this.groundFace = undefined;
    this.groundTilt = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 0, 1);

    this.lockDialogOrientation = false;
    this.lipObject = undefined;
    this.walk = false;

    this.isListening = false;
    this.listeningPatterns = {};
    this.heardStrings = [];

    this.targetPositions = [];
    let numNodes = 8;
    for (let i = 0; i < numNodes; i++) {
      let angle = (i / (numNodes/2)) * Math.PI; // Calculate the angle at which the element will be placed.
                                            // For a semicircle, we would use (i / numNodes) * Math.PI.
      this.targetPositions.push({
        angle:        angle,
        object:       undefined,
        cos:          Math.cos(angle),
        sin:          Math.sin(angle),
        owner:        this,
        targetVector: new THREE.Vector3()
      });
    }

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
          volume: 127,
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

  getClosesetOpenSpot(oObject = undefined){
    let maxDistance = Infinity;
    let radius = parseInt(this.getAppearance().hitdist);
    let closest = undefined;
    let distance = 0;
    let origin = this.position.clone();

    let alreadyClaimedSpot = false;

    //Check to see if oObject already has claimed a targetPosition around this creature
    for(let i = 0, len = this.targetPositions.length; i < len; i++){
      let targetPosition = this.targetPositions[i];
      if(targetPosition.object == oObject){
        closest = targetPosition;
        alreadyClaimedSpot = true;
        break;
      }
    }

    if(!alreadyClaimedSpot){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        let targetPosition = this.targetPositions[i];
        if(targetPosition.object == undefined){
          //Generate the target vector for the 
          targetPosition.targetVector.x = origin.x + (targetPosition.cos * radius);
          targetPosition.targetVector.y = origin.y + (targetPosition.sin * radius);
          targetPosition.targetVector.z = origin.z;
          distance = targetPosition.targetVector.distanceTo(oObject.position);

          //is this target position is closer to oObject
          if(distance < maxDistance){
            //Set the current targetPosition as the current closest position
            closest = targetPosition;
            //Update the maxDistance
            maxDistance = distance;
          }
        }
      }
      if(typeof closest != 'undefined'){
        for(let i = 0, len = Game.module.area.creatures.length; i < len; i++){
          Game.module.area.creatures[i].removeObjectFromTargetPositions(oObject);
        }

        for(let i = 0, len = PartyManager.party.length; i < len; i++){
          PartyManager.party[i].removeObjectFromTargetPositions(oObject);
        }
        closest.object = oObject;
      }
    }
    return closest;
  }

  removeObjectFromTargetPositions(oObject = undefined){
    if(typeof oObject != 'undefined'){
      for(let i = 0, len = this.targetPositions.length; i < len; i++){
        if(this.targetPositions[i].object == oObject){
          this.targetPositions[i].object = undefined;
        }
      }
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

    if(this.isHostile(callee) && !this.isDead()){
      Game.getCurrentPlayer().attackCreature(this, undefined);
    }else if(this.isHostile(callee) && this.isDead()){
      this.clearAllActions();
      Game.getCurrentPlayer().actionQueue.push({
        object: this,
        goal: ModuleCreature.ACTION.USEOBJECT
      });
    }else if(!this.isDead()){
      this.clearAllActions();
      Game.getCurrentPlayer().actionQueue.push({
        object: this,
        conversation: this.GetConversation(),
        ignoreStartRange: false,
        goal: ModuleCreature.ACTION.DIALOGOBJECT
      });
    }
    
  }

  

  use(object = null){
    if(this.hasInventory()){
      Game.MenuContainer.Open(this);
    }
  }

  hasInventory(){
    return this.inventory.length;
  }

  retrieveInventory(){
    while(this.inventory.length){
      InventoryManager.addItem(this.inventory.pop())
    }
  }

  isUseable(){
    return true;
  }

  isDead(){
    return this.getHP() <= 0 && !this.min1HP;
  }

  isPoisoned(){
    return this.hasEffect(GameEffect.Type.EffectPoison);
  }

  isParalyzed(){
    return this.hasEffect(GameEffect.Type.EffectParalyze);
  }

  isStunned(){
    return this.hasEffect(GameEffect.Type.EffectStunned);
  }

  isDroidStunned(){
    return this.hasEffect(GameEffect.Type.EffectDroidStun);
  }

  isFrightened(){
    return this.hasEffect(GameEffect.Type.EffectFrightened);
  }

  isHorrified(){
    return this.hasEffect(GameEffect.Type.EffectHorrified);
  }

  isChoking(){
    return this.hasEffect(GameEffect.Type.EffectChoke);
  }

  isDebilitated(){
    return this.isStunned() || this.isDroidStunned() || this.isParalyzed() || this.isFrightened() || this.isChoking() || this.isHorrified();
  }

  setCommadable(bCommandable = 0){
    this.isCommandable = bCommandable ? true : false;
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
            if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof THREE.AuroraModel){
              this.model.rhand.add(this.equipment.RIGHTHAND.model);
            }
          }
        }catch(e){
          
        }
      break;
      case UTCObject.SLOT.LEFTHAND:
        try{
          if(this.getAppearance().modeltype != 'S' && this.getAppearance().modeltype != 'L'){
            if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof THREE.AuroraModel){
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
      return Math.floor(this.rotation.z * 180) + 180
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

  setHP(nAmount = 0){
    this.currentHitPoints = nAmount;
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  addHP(nAmount = 0){
    this.currentHitPoints = (this.getHP() + nAmount);
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  subtractHP(nAmount = 0){
    this.setHP(this.getHP() - nAmount);
    if(this.min1HP && this.getHP() < 1)
      this.setHP(1);
  }

  getHP(){
    return this.currentHitPoints;
  }

  getMaxHP(){
    return this.maxHitPoints;
  }

  setMaxHP(nAmount = 0){
    return this.maxHitPoints = nAmount;
  }

  setMinOneHP(bMinOneHP = false){
    this.min1HP = bMinOneHP ? true : false;
  }

  getFP(){
    return this.forcePoints;
  }

  getMaxFP(){
    return this.maxForcePoints;
  }

  getCameraHeight(){
    if(this.model && this.model.camerahook){
      return this.model.camerahook.position.z;
    }else{
      return 1.5;
    }
  }

  getAC(){
    let baseac = 10;
    let classBonus = 0;

    for(let i = 0; i < this.classes.length; i++){
      classBonus += this.classes[i].getACBonus();
    }

    let armorAC = (this.equipment.ARMOR?.getACBonus() || 0);

    let dexBonus = Math.floor((this.getDEX() - 10) / 2);

    return baseac + classBonus + armorAC + dexBonus;
  }

  getSTR(calculateBonuses = true){
    if(!calculateBonuses){
      return this.str;
    }else{
      return this.str +
      (this.equipment.HEAD?.getSTRBonus() || 0) +
      (this.equipment.ARMOR?.getSTRBonus() || 0) +
      (this.equipment.ARMS?.getSTRBonus() || 0) +
      (this.equipment.RIGHTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTHAND?.getSTRBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getSTRBonus() || 0) +
      (this.equipment.IMPLANT?.getSTRBonus() || 0) +
      (this.equipment.BELT?.getSTRBonus() || 0) +
      (this.equipment.CLAW1?.getSTRBonus() || 0) +
      (this.equipment.CLAW2?.getSTRBonus() || 0) +
      (this.equipment.HIDE?.getSTRBonus() || 0);
    }
  }

  getDEX(calculateBonuses = true){
    if(!calculateBonuses){
      return this.dex;
    }else{
      return this.dex +
      (this.equipment.HEAD?.getDEXBonus() || 0) +
      (this.equipment.ARMOR?.getDEXBonus() || 0) +
      (this.equipment.ARMS?.getDEXBonus() || 0) +
      (this.equipment.RIGHTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTHAND?.getDEXBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getDEXBonus() || 0) +
      (this.equipment.IMPLANT?.getDEXBonus() || 0) +
      (this.equipment.BELT?.getDEXBonus() || 0) +
      (this.equipment.CLAW1?.getDEXBonus() || 0) +
      (this.equipment.CLAW2?.getDEXBonus() || 0) +
      (this.equipment.HIDE?.getDEXBonus() || 0);
    }
  }

  getCON(calculateBonuses = true){
    if(!calculateBonuses){
      return this.con;
    }else{
      return this.con +
      (this.equipment.HEAD?.getCONBonus() || 0) +
      (this.equipment.ARMOR?.getCONBonus() || 0) +
      (this.equipment.ARMS?.getCONBonus() || 0) +
      (this.equipment.RIGHTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTHAND?.getCONBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCONBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCONBonus() || 0) +
      (this.equipment.IMPLANT?.getCONBonus() || 0) +
      (this.equipment.BELT?.getCONBonus() || 0) +
      (this.equipment.CLAW1?.getCONBonus() || 0) +
      (this.equipment.CLAW2?.getCONBonus() || 0) +
      (this.equipment.HIDE?.getCONBonus() || 0);
    }
  }

  getCHA(calculateBonuses = true){
    if(!calculateBonuses){
      return this.cha;
    }else{
      return this.cha +
      (this.equipment.HEAD?.getCHABonus() || 0) +
      (this.equipment.ARMOR?.getCHABonus() || 0) +
      (this.equipment.ARMS?.getCHABonus() || 0) +
      (this.equipment.RIGHTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTHAND?.getCHABonus() || 0) +
      (this.equipment.LEFTARMBAND?.getCHABonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getCHABonus() || 0) +
      (this.equipment.IMPLANT?.getCHABonus() || 0) +
      (this.equipment.BELT?.getCHABonus() || 0) +
      (this.equipment.CLAW1?.getCHABonus() || 0) +
      (this.equipment.CLAW2?.getCHABonus() || 0) +
      (this.equipment.HIDE?.getCHABonus() || 0);
    }
  }

  getWIS(calculateBonuses = true){
    if(!calculateBonuses){
      return this.wis;
    }else{
      return this.wis +
      (this.equipment.HEAD?.getWISBonus() || 0) +
      (this.equipment.ARMOR?.getWISBonus() || 0) +
      (this.equipment.ARMS?.getWISBonus() || 0) +
      (this.equipment.RIGHTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTHAND?.getWISBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getWISBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getWISBonus() || 0) +
      (this.equipment.IMPLANT?.getWISBonus() || 0) +
      (this.equipment.BELT?.getWISBonus() || 0) +
      (this.equipment.CLAW1?.getWISBonus() || 0) +
      (this.equipment.CLAW2?.getWISBonus() || 0) +
      (this.equipment.HIDE?.getWISBonus() || 0);
    }
  }

  getINT(calculateBonuses = true){
    if(!calculateBonuses){
      return this.int;
    }else{
      return this.int +
      (this.equipment.HEAD?.getINTBonus() || 0) +
      (this.equipment.ARMOR?.getINTBonus() || 0) +
      (this.equipment.ARMS?.getINTBonus() || 0) +
      (this.equipment.RIGHTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTHAND?.getINTBonus() || 0) +
      (this.equipment.LEFTARMBAND?.getINTBonus() || 0) +
      (this.equipment.RIGHTARMBAND?.getINTBonus() || 0) +
      (this.equipment.IMPLANT?.getINTBonus() || 0) +
      (this.equipment.BELT?.getINTBonus() || 0) +
      (this.equipment.CLAW1?.getINTBonus() || 0) +
      (this.equipment.CLAW2?.getINTBonus() || 0) +
      (this.equipment.HIDE?.getINTBonus() || 0);
    }
  }

  getSpellSaveDC(){
    return 10 + this.getSpellCasterLevel();
  }

  getSpellCasterLevel(){
    let level = 0;
    for(let i = 0; i < this.classes.length; i++){
      if(this.classes[i].spellcaster == 1){
        level += this.classes[i].level;
      }
    }
    return level;
  }

  getIsPC(){
    return this.isPC;
  }

  getPortraitId(){
    return this.portraidId;
  }

  getPortraitResRef(){
    let portrait = Global.kotor2DA.portraits.rows[this.getPortraitId()];
    if(portrait){
      return portrait.baseresref;
    }
    return '';
  }

  getWalkRateId(){

    if(PartyManager.party.indexOf(this) >= 0){
      return 0;
    }

    return this.walkRate;
  }

  getName(){
    return this.firstName;
  }

  getAppearance(){
    let eDisguise = this.getEffect(GameEffect.Type.EffectDisguise);
    if(eDisguise){
      return eDisguise.appearance;
    }else{
      return Global.kotor2DA["appearance"].rows[this.appearance] || Global.kotor2DA["appearance"].rows[0];
    }
  }

  getRunSpeed(){
    if(this.getWalkRateId() == 7){
      return parseFloat(this.getAppearance().rundist)
    }
    return parseFloat(Global.kotor2DA.creaturespeed.rows[this.getWalkRateId()].runrate);
  }

  getWalkSpeed(){
    if(this.getWalkRateId() == 7){
      return parseFloat(this.getAppearance().walkdist)
    }
    return parseFloat(Global.kotor2DA.creaturespeed.rows[this.getWalkRateId()].walkrate);
  }

  getMainClass(){
    if(!this.classes.length)
      return false;

    return this.classes[this.classes.length - 1];
  }

  getTotalClassLevel(){
    let total = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      total += parseInt(this.classes[i].level);
    }
    return total;
  }

  getClassLevel(nClass = 0){
    for(let i = 0, len = this.classes.length; i < len; i++){
      if(this.classes[i].id == nClass){
        return this.classes[i].level;
      }
    }
    return 0;
  }

  getBaseAttackBonus(){
    let bab = 0;
    for(let i = 0, len = this.classes.length; i < len; i++){
      bab += this.classes[i].getBaseAttackBonus();
    }

    let strMod = Math.floor(( this.getSTR() - 10) / 2);
    let dexMod = Math.floor(( this.getSTR() - 10) / 2);

    if(strMod > dexMod){
      bab += strMod;
    }else if(dexMod > strMod){
      bab += dexMod;
    }

    return bab;
  }

  getFeats(){
    return this.feats || [];
  }

  getFeat(id = 0){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return feats[i];
      }
    }
    return null;
  }

  addFeat(nFeat = 0){
    if(!this.getFeat(nFeat)){
      this.feats.push(nFeat);
    }
  }

  getHasFeat(id){
    let feats = this.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return true;
      }
    }
    return false;
  }

  getSkillList(){
    // if(this.template.RootNode.HasField('SkillList')){
    //   return this.template.RootNode.GetFieldByLabel('SkillList').GetChildStructs();
    // }
    return this.skills;
  }

  getHasSkill(iSkill){
    return this.skills[iSkill].rank > 0;
  }

  getSkillLevel(iSkill){
    return this.skills[iSkill].rank;
  }

  getHasSpell(id = 0){
    return (this.getSpell(id) instanceof TalentSpell) ? true : false;
  }

  getSpell(id = 0){
    for(let i = 0; i < this.classes.length; i++){
      let cls = this.classes[i];
      let spells = cls.getSpells();
      for(let j = 0, len = spells.length; j < len; j++){
        let spell = spells[j];
        if(spell.id == id)
          return spell;
      }
    }

    if(typeof this.equipment.RIGHTARMBAND != 'undefined'){
      let spells = this.equipment.RIGHTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    if(typeof this.equipment.LEFTARMBAND != 'undefined'){
      let spells = this.equipment.LEFTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    return undefined;
  }

  hasTalent(talent = undefined){
    //console.log('hasTalent', talent);
    if(typeof talent != 'undefined'){
      switch(talent.type){
        case 0: //Force / Spell
          return this.getHasSpell(talent.id) ? true : false;
        case 1: //Feat
          return this.getHasFeat(talent.id) ? true : false;
        case 2: //Skill
          return this.getHasSkill(talent.id) ? true : false;
      }
    }
    return false;
  }

  getTalents(){

    let talents = [];

    //Merge Spell Talents from all classs
    for(let i = 0; i < this.classes.length; i++){
      talents = talents.concat(this.classes[i].getSpells());
    }

    //Merge Feat Talents
    talents = talents.concat(this.feats);
    //Merge Skill Talents
    talents = talents.concat(this.skills);

    return talents;

  }

  getRandomTalent(category = 0, category2 = 0){

    let talents = this.getTalents().filter( talent => talent.category == category || talent.category == category2 );
    let talent = talents[Math.floor(Math.random()*talents.length)];
    //console.log('getRandomTalent', talent);
    return talent;

  }

  getTalentBest(nCategory = 0, nCRMax = 0, nInclusion = 0, nExcludeType = -1, nExcludeId = -1){
    let talents = this.getTalents().filter( talent => ( talent.category != '****' && ( (talent.category & nCategory) == nCategory ) && talent.maxcr <= nCRMax ) );
    talents.sort((a, b) => (a.maxcr > b.maxcr) ? 1 : -1);
    //console.log('getTalentBest', talents);
    if(talents.length){
      return talents[0];
    }
    return undefined;
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

  setListening(bVal = false){
    this.isListening = bVal ? true : false;
  }

  setListeningPattern(sString = '', iNum = 0){
    this.listeningPatterns[sString] = iNum;
  }

  getPersonalSpace(){
    return parseFloat(this.getAppearance()['perspace']);
  }

  Load( onLoad = null ){
    if(this.getTemplateResRef()){
      //Load template and merge fields
      TemplateLoader.Load({
        ResRef: this.getTemplateResRef(),
        ResType: ResourceTypes.utc,
        onLoad: (gff) => {
          this.template.Merge(gff);
          this.InitProperties( () => {
            //this.LoadEquipment( () => {
              if(onLoad != null)
                onLoad(this.template);
            //});
          });
        },
        onFail: () => {
          console.error('Failed to load character template');
          if(onLoad != null)
            onLoad(undefined);
        }
      });
    }else{
      this.InitProperties( () => {
        //this.LoadEquipment( () => {
          //We already have the template (From SAVEGAME)
          if(onLoad != null)
            onLoad(this.template);
        //});
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

  LoadModel ( onLoad = null ){

    this.isReady = false;

    //this.LoadEquipment( () => {
      this.LoadBody( () => {
        this.LoadHead( () => {
          TextureLoader.LoadQueue(() => {
            this.isReady = true;

            this.invalidateCollision = true;

            if(onLoad != null)
              onLoad(this.model);
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

    //Hack to get bastilla's model working properly
    if(this.bodyModel == 'p_bastilabb'){
      this.bodyModel = 'p_bastilabb02';
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
            isHologram: this.isHologram,
            context: this.context,
            onComplete: (model) => {

              let scene = null, position = null, rotation = null;

              if(this.model instanceof THREE.AuroraModel && this.model.parent){
                scene = this.model.parent;
                //position = this.model.position;
                //rotation = this.model.rotation;

                if(this.head && this.head.parent){
                  this.head.parent.remove(this.head);
                  this.head.dispose();
                }

                //Remove weapons from model before dispose
                try{
                  if(this.model.lhand instanceof THREE.Object3D){
                    if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof THREE.AuroraModel){
                      this.model.lhand.remove(this.equipment.LEFTHAND.model);
                    }
                  }
                }catch(e){}
                
                //Remove weapons from model before dispose
                try{
                  if(this.model.rhand instanceof THREE.Object3D){
                    if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof THREE.AuroraModel){
                      this.model.rhand.remove(this.equipment.RIGHTHAND.model);
                    }
                  }
                }catch(e){}

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
                if(this.model.lhand instanceof THREE.Object3D){
                  if(this.equipment.LEFTHAND instanceof ModuleItem && this.equipment.LEFTHAND.model instanceof THREE.AuroraModel){
                    this.model.lhand.add(this.equipment.LEFTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              try{
                if(this.model.rhand instanceof THREE.Object3D){
                  if(this.equipment.RIGHTHAND instanceof ModuleItem && this.equipment.RIGHTHAND.model instanceof THREE.AuroraModel){
                    this.model.rhand.add(this.equipment.RIGHTHAND.model);
                  }
                }
              }catch(e){
                console.error('ModuleCreature', e);
              }

              if(scene){
                scene.add( this.model );
                try{
                  Game.octree.add( this.model );
                }catch(e){}
                //this.model.position.copy(position);
                //this.model.rotation.set(rotation.x, rotation.y, rotation.z);
              }

              this.position = this.model.position.copy(this.position);
              this.model.rotation.copy(this.rotation);
              this.model.quaternion.copy(this.quaternion);

              if(typeof onLoad === 'function')
                onLoad();

              this.model.disableMatrixUpdate();

            }
          });
        }
      });
    }
  }

  LoadHead( onLoad = null ){
    let appearance = this.getAppearance();
    let headId = appearance.normalhead.replace(/\0[\s\S]*$/g,'').toLowerCase();
    this.headModel = undefined;
    if(headId != '****' && appearance.modeltype == 'B'){
      let head = Global.kotor2DA['heads'].rows[headId];
      this.headModel = head.head.replace(/\0[\s\S]*$/g,'').toLowerCase();
      Game.ModelLoader.load({
        file: this.headModel,
        onLoad: (mdl) => {
          THREE.AuroraModel.FromMDL(mdl, {
            context: this.context,
            castShadow: true,
            receiveShadow: true,
            isHologram: this.isHologram,
            onComplete: (head) => {
              try{

                if(this.head instanceof THREE.AuroraModel && this.head.parent){
                  this.head.parent.remove(this.head);
                  this.head.dispose();
                }

                this.head = head;
                this.head.moduleObject = this;
                this.model.headhook.head = head;
                this.model.headhook.add(head);

                try{
                  if(this.head.gogglehook instanceof THREE.Object3D){
                    if(this.equipment.HEAD instanceof ModuleItem && this.equipment.HEAD.model instanceof THREE.AuroraModel){
                      this.head.gogglehook.add(this.equipment.HEAD.model);
                    }
                  }
                }catch(e){
                  console.error('ModuleCreature', e);
                }
                
                //this.model.nodes = new Map(this.model.nodes, head.nodes);

                if(typeof onLoad === 'function')
                  onLoad();

                this.head.disableMatrixUpdate();
              }catch(e){
                console.error(e);
                if(typeof onLoad === 'function')
                  onLoad();
              }
            }
          });
        }
      });
    }else{
      if(typeof onLoad === 'function')
        onLoad();
    }
  }

  /*getEquip_ItemList(){
    if(this.template.RootNode.HasField('Equip_ItemList')){
      return this.template.GetFieldByLabel('Equip_ItemList').GetChildStructs()
    }
    return [];
  }*/

  equipItem(slot = 0x1, item = '', onLoad = null){

    this.unequipSlot(slot);

    if(item instanceof ModuleItem){
      item.onEquip(this, slot);
      item.LoadModel( () => {
        switch(slot){
          case UTCObject.SLOT.ARMOR:
            this.equipment.ARMOR = item;
            this.LoadModel( () => {
              //this.getModel().buildSkeleton()
              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case UTCObject.SLOT.RIGHTHAND:
            this.equipment.RIGHTHAND = item;
            item.LoadModel( () => {

              if(item.model instanceof THREE.AuroraModel)
                this.model.rhand.add(item.model);

              if(typeof onLoad == 'function')
                onLoad();
            });
          break;
          case UTCObject.SLOT.LEFTHAND:
            this.equipment.LEFTHAND = item;
            item.LoadModel( () => {
              if(item.model instanceof THREE.AuroraModel)
                this.model.lhand.add(item.model);

              if(typeof onLoad == 'function')
                onLoad();
            });
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
            item: new ModuleItem(gff),
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
            this.equipment.ARMOR.onUnEquip(this, slot);
          }

          this.equipment.ARMOR = undefined;
          this.LoadModel( () => {
            this.getModel().buildSkeleton()
          });
        break;
        case UTCObject.SLOT.RIGHTHAND:
          try{
            if(this.equipment.RIGHTHAND instanceof ModuleItem){
              this.equipment.RIGHTHAND.onUnEquip(this, slot);
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
              this.equipment.LEFTHAND.onUnEquip(this, slot);
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
    if(typeof onLoad === 'function')
      onLoad();
    /*this.ParseEquipmentSlots( () => {
      if(typeof onLoad === 'function')
        onLoad();
    });*/
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
      case UTCObject.SLOT.HIDE:
        return this.equipment.HIDE;
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


  //Deprecated
  /*GetEquippedSlot(slot = 0){
    let equipment = this.getEquip_ItemList();
    for(let i = 0; i < equipment.length; i++){
      let equip = equipment[i];
      let type = equip.GetType();
      this.LoadEquipmentItem({
        item: new ModuleItem(GFFObject.FromStruct(equip, equip.GetType())),
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
  }*/

  LoadEquipmentItem(args = {}){

    args = $.extend({
      item: new GFFObject(),
      Slot: 0x01,
      onLoad: null,
      onError: null
    }, args);
    //console.log('LoadEquipmentItem', args);
    let uti = args.item;

    if(uti instanceof GFFObject)
      uti = new ModuleItem(uti);

    switch(args.Slot){
      case UTCObject.SLOT.IMPLANT:
        this.equipment.IMPLANT = uti;
      break;
      case UTCObject.SLOT.HEAD:
        this.equipment.HEAD = uti;
      break;
      case UTCObject.SLOT.ARMS:
        this.equipment.ARMS = uti;
      break;
      case UTCObject.SLOT.ARMOR:
        this.equipment.ARMOR = uti;
      break;
      case UTCObject.SLOT.RIGHTHAND:
        this.equipment.RIGHTHAND = uti;
      break;
      case UTCObject.SLOT.LEFTHAND:
        this.equipment.LEFTHAND = uti;
      break;
      case UTCObject.SLOT.BELT:
        this.equipment.BELT = uti;
      break;
      case UTCObject.SLOT.RIGHTARMBAND:
        this.equipment.RIGHTARMBAND = uti;
      break;
      case UTCObject.SLOT.LEFTARMBAND:
        this.equipment.LEFTARMBAND = uti;
      break;
      case UTCObject.SLOT.HIDE:
        this.equipment.HIDE = uti;
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

    this.classes = [];
    this.feats = [];
    this.skills = [0, 0, 0, 0, 0, 0, 0, 0];

    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

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
        this.classes.push(
          CreatureClass.FromCreatureClassStruct(classes[i])
        );
      }
    }

    if(this.template.RootNode.HasField('Conversation'))
      this.conversation = this.template.GetFieldByLabel('Conversation').GetValue();

    if(this.template.RootNode.HasField('CurrentForce'))
      this.currentForce = this.template.GetFieldByLabel('CurrentForce').GetValue();

    if(this.template.RootNode.HasField('CurrentHitPoints'))
      this.currentHitPoints = this.template.GetFieldByLabel('CurrentHitPoints').GetValue();

    if(this.template.RootNode.HasField('HitPoints'))
      this.hitPoints = this.template.GetFieldByLabel('HitPoints').GetValue();

    if(this.template.RootNode.HasField('Disarmable'))
      this.disarmable = this.template.GetFieldByLabel('Disarmable').GetValue();
  
    if(this.template.RootNode.HasField('Experience'))
      this.experience = this.template.RootNode.GetFieldByLabel('Experience').GetValue();

    if(this.template.RootNode.HasField('Listening')){
      this.setListening(this.template.RootNode.GetFieldByLabel('Listening').GetValue());
    }
    if(this.template.RootNode.HasField('Commandable')){
      this.setCommadable(this.template.RootNode.GetFieldByLabel('Commandable').GetValue());
    }

    if(this.template.RootNode.HasField('ExpressionList')){
      let expressions = this.template.RootNode.GetFieldByLabel('ExpressionList').GetChildStructs();
      for(let i = 0; i < expressions.length; i++){
        this.setListeningPattern(
          expressions[i].GetFieldByLabel('ExpressionString').GetValue(),
          expressions[i].GetFieldByLabel('ExpressionId').GetValue()
        );
      }
    }
        
    if(this.template.RootNode.HasField('FactionID')){
      this.faction = this.template.GetFieldByLabel('FactionID').GetValue();
      if((this.faction & 0xFFFFFFFF) == -1){
        this.faction = 0;
      }
    }

    if(this.template.RootNode.HasField('FeatList')){
      let feats = this.template.RootNode.GetFieldByLabel('FeatList').GetChildStructs();
      for(let i = 0; i < feats.length; i++){
        let feat = {
          type: 1,
          id: feats[i].GetFieldByLabel('Feat').GetValue()
        };

        this.feats.push(
          new TalentFeat(feat)
        );
      }
    }

    if(this.template.RootNode.HasField('FirstName'))
      this.firstName = this.template.RootNode.GetFieldByLabel('FirstName').GetValue();
    
    if(this.template.RootNode.HasField('ForcePoints'))
      this.forcePoints = this.template.RootNode.GetFieldByLabel('ForcePoints').GetValue();
        
    if(this.template.RootNode.HasField('Gender'))
      this.gender = this.template.RootNode.GetFieldByLabel('Gender').GetValue();
  
    if(this.template.RootNode.HasField('GoodEvil'))
      this.goodEvil = this.template.RootNode.GetFieldByLabel('GoodEvil').GetValue();
      
    if(this.template.RootNode.HasField('Hologram'))
      this.isHologram = this.template.GetFieldByLabel('Hologram').GetValue();

    if(this.template.RootNode.HasField('Interruptable'))
      this.interruptable = this.template.GetFieldByLabel('Interruptable').GetValue();

    if(this.template.RootNode.HasField('IsPC'))
      this.isPC = this.template.GetFieldByLabel('IsPC').GetValue();

    if(this.template.RootNode.HasField('LastName'))
      this.lastName = this.template.GetFieldByLabel('LastName').GetValue();

    if(this.template.RootNode.HasField('MaxHitPoints')){
      this.maxHitPoints = this.template.GetFieldByLabel('MaxHitPoints').GetValue();
    }

    if(this.template.RootNode.HasField('MaxForcePoints')){
      this.maxForcePoints = this.template.GetFieldByLabel('MaxForcePoints').GetValue();
    }

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

    if(this.template.RootNode.HasField('PerceptionRange')){
      this.perceptionRange = this.template.GetFieldByLabel('PerceptionRange').GetValue();
    }else{
      //https://forum.neverwintervault.org/t/perception-range/3191/9
      //It appears that PerceptionRange isn't saved inside the GIT file.
      //The original game appears to use PercepRngDefault when a creature is reloaded from a SaveGame
      this.perceptionRange = 11;
    }

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
        let skill = {
          type: 2,
          id: i,
          rank: skills[i].GetFieldByLabel('Rank').GetValue()
        };
        this.skills[i] = new TalentSkill(skill);
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
      let localNumbers = this.template.RootNode.GetFieldByLabel('SWVarTable').GetChildStructs()[0].GetFieldByLabel('ByteArray').GetChildStructs();
      //console.log(localNumbers);
      for(let i = 0; i < localNumbers.length; i++){
        let data = localNumbers[i].GetFieldByLabel('Variable').GetValue();
        this.setLocalNumber(i, data);
      }
    }

    if(this.template.RootNode.HasField('PM_Appearance'))
      this.pm_Appearance = this.template.RootNode.GetFieldByLabel('PM_Appearance').GetValue();

    if(this.template.RootNode.HasField('PM_IsDisguised'))
      this.pm_IsDisguised = this.template.RootNode.GetFieldByLabel('PM_IsDisguised').GetValue();

    if(this.template.RootNode.HasField('EffectList')){
      let effects = this.template.RootNode.GetFieldByLabel('EffectList').GetChildStructs() || [];
      for(let i = 0; i < effects.length; i++){
        let effect = GameEffect.EffectFromStruct(effects[i]);
        if(effect instanceof GameEffect){
          this.effects.push(effect);
          //this.addEffect(effect);
        }
      }
    }

    if(this.template.RootNode.HasField('Equip_ItemList')){
      let equipment = this.template.RootNode.GetFieldByLabel('Equip_ItemList').GetChildStructs() || [];
      for(let i = 0; i < equipment.length; i++){
        let strt = equipment[i];
        let equipped_item = undefined;
        let slot_type = strt.Type;
        if(strt.HasField('EquippedRes')){
          equipped_item = new ModuleItem(strt.GetFieldByLabel('EquippedRes').GetValue());
        }else{
          equipped_item = new ModuleItem(GFFObject.FromStruct(strt));
        }
        
        switch(slot_type){
          case UTCObject.SLOT.HEAD:
            this.equipment.HEAD = equipped_item;
          break;
          case UTCObject.SLOT.ARMS:
            this.equipment.ARMS = equipped_item;
          break;
          case UTCObject.SLOT.ARMOR:
            this.equipment.ARMOR = equipped_item;
          break;
          case UTCObject.SLOT.LEFTHAND:
            this.equipment.LEFTHAND = equipped_item;
          break;
          case UTCObject.SLOT.RIGHTHAND:
            this.equipment.RIGHTHAND = equipped_item;
          break;
          case UTCObject.SLOT.LEFTARMBAND:
            this.equipment.LEFTARMBAND = equipped_item;
          break;
          case UTCObject.SLOT.RIGHTARMBAND:
            this.equipment.RIGHTARMBAND = equipped_item;
          break;
          case UTCObject.SLOT.IMPLANT:
          this.equipment.IMPLANT = equipped_item;
          break;
          case UTCObject.SLOT.BELT:
            this.equipment.BELT = equipped_item;
          break;

          //Simple Creature Slots
          case UTCObject.SLOT.HIDE:
            this.equipment.HIDE = equipped_item;
          break;
          case UTCObject.SLOT.CLAW1:
            this.equipment.CLAW1 = equipped_item;
          break;
          case UTCObject.SLOT.CLAW2:
            this.equipment.CLAW2 = equipped_item;
          break;
          case UTCObject.SLOT.CLAW3:
            this.equipment.CLAW3 = equipped_item;
          break;
        }
      }
    }

    this.ParseEquipmentSlots( () => {

      if(this.template.RootNode.HasField('ItemList')){

        let inventory = this.template.RootNode.GetFieldByLabel('ItemList').GetChildStructs();
        let loop = new AsyncLoop({
          array: inventory,
          onLoop: (item, asyncLoop) => {
            this.LoadItem(GFFObject.FromStruct(item), () => {
              asyncLoop.next();
            });
          }
        });
        loop.iterate(() => {
          this.LoadSoundSet(onLoad);
        });
  
      }else{
        this.LoadSoundSet(onLoad);
      }

    });

    //ActionList
    if(this.template.RootNode.HasField('ActionList')){
      let actions = this.template.RootNode.GetFieldByLabel('ActionList').GetChildStructs();
      for(let i = 0, len = actions.length; i < len; i++){
        let action = actions[i];
        try{
          let actionId = action.GetFieldByLabel('ActionId').GetValue();
          let paramCount = action.GetFieldByLabel('NumParams').GetValue();

          let paramStructs = [];
          if(action.HasField('Paramaters'))
            paramStructs = action.GetFieldByLabel('Paramaters').GetChildStructs();

          if(actionId == 1){ //MoveToPoint ???

            let x = paramStructs[0].GetFieldByLabel('Value').GetValue();
            let y = paramStructs[1].GetFieldByLabel('Value').GetValue();
            let z = paramStructs[2].GetFieldByLabel('Value').GetValue();

            let object = ModuleObject.GetObjectById(paramStructs[4].GetFieldByLabel('Value').GetValue());
            let run = paramStructs[5].GetFieldByLabel('Value').GetValue();
            let distance = paramStructs[6].GetFieldByLabel('Value').GetValue();

            this.moveToObject(object, run, distance);

          }

          if(actionId == 37){ //ActionDoCommand

            let scriptParamStructs = paramStructs[0].GetFieldByLabel('Value').GetChildStructs()[0];
            let script = new NWScript();
            script.name = scriptParamStructs.GetFieldByLabel('Name').GetValue();
            script.init(
              scriptParamStructs.GetFieldByLabel('Code').GetVoid(),
              scriptParamStructs.GetFieldByLabel('CodeSize').GetValue()
            );

            let scriptInstance = script.newInstance();
            scriptInstance.isStoreState = true;
            scriptInstance.setCaller(this);

            let stackStruct = scriptParamStructs.GetFieldByLabel('Stack').GetChildStructs()[0]
            scriptInstance.stack = NWScriptStack.FromActionStruct(stackStruct);
            
            this.actionQueue.push({
              goal: ModuleCreature.ACTION.SCRIPT,
              script: scriptInstance,
              action: { script: scriptInstance, offset: scriptParamStructs.GetFieldByLabel('InstructionPtr').GetValue() },
              clearable: false
            });

            //console.log('ActionDoCommand', script, scriptParamStructs, this);

          }
        }catch(e){
          console.error('ActionList', e, action, this);
        }
      }
    }

    //PerceptionList
    if(this.template.RootNode.HasField('PerceptionList')){
      let perceptionList = this.template.RootNode.GetFieldByLabel('PerceptionList').GetChildStructs();
      for(let i = 0, len = perceptionList.length; i < len; i++){
        let perception = perceptionList[i];

        let objectId = perception.GetFieldByLabel('ObjectId').GetValue();
        let data = perception.GetFieldByLabel('PerceptionData').GetValue();

        let seen = false;
        let heard = false;
        let hasSeen = false;
        let hasHeard = false;
        //https://nwnlexicon.com/index.php?title=Perception
        switch(data){
          case 0:// PERCEPTION_SEEN_AND_HEARD	0	Both seen and heard (Spot beats Hide, Listen beats Move Silently).
            seen = true; heard = true;
          break;
          case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD	1	Neither seen nor heard (Hide beats Spot, Move Silently beats Listen).
            seen = false; heard = false;
          break;
          case 2:// PERCEPTION_HEARD_AND_NOT_SEEN	2	 Heard only (Hide beats Spot, Listen beats Move Silently). Usually arouses suspicion for a creature to take a closer look.
            seen = false; heard = true;
          break;
          case 3:// PERCEPTION_SEEN_AND_NOT_HEARD	3	Seen only (Spot beats Hide, Move Silently beats Listen). Usually causes a creature to take instant notice.
            seen = true; heard = false;
          break;
          case 4:// PERCEPTION_NOT_HEARD 4 Not heard (Move Silently beats Listen), no line of sight.
            seen = false; heard = false;
          break;
          case 5:// PERCEPTION_HEARD 5 Heard (Listen beats Move Silently), no line of sight.
            seen = false; heard = true;
          break;
          case 6:// PERCEPTION_NOT_SEEN	6	Not seen (Hide beats Spot), too far away to heard or magically silcenced.
            seen = false; heard = false;
          break;
          case 7:// PERCEPTION_SEEN	7	Seen (Spot beats Hide), too far away to heard or magically silcenced.
            seen = true; heard = false;
          break;
        }

        this.perceptionList.push({
          objectId: objectId,
          data: data,
          seen: seen,
          heard: heard,
          hasSeen: seen,
          hasHeard: heard
        });

      }
    }

    this.initialized = true;

  }

  ParseEquipmentSlots( onLoad = null ){

    let loop = new AsyncLoop({
      array: Object.keys(this.equipment),
      onLoop: (slot_key, asyncLoop) => {
        let slot = this.equipment[slot_key];
        if(slot instanceof ModuleObject){
          slot.Load( () => {
            slot.LoadModel( () => {
              if(slot_key == 'RIGHTHAND' || slot_key == 'LEFTHAND'){
                slot.model.playAnimation('off', true);
              }
              asyncLoop.next();
            });
          });
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

  LoadSoundSet( onLoad = null ){

    let ss_row = Global.kotor2DA.soundset.rows[this.soundSetFile];

    if(ss_row){
      ResourceLoader.loadResource(ResourceTypes.ssf, ss_row.resref.toLowerCase(), (data) => {
        this.ssf = new SSFObject(data);
        //SSF found
        if(typeof onLoad === 'function')
          onLoad();
      }, (err) => {
        //SSF not found
        if(typeof onLoad === 'function')
          onLoad();
      });
    }else{
      //SSF entry not found
      if(typeof onLoad === 'function')
        onLoad();
    }

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

  PlaySoundSet(type = -1){
    if(this.ssf instanceof SSFObject){
      let resref = this.ssf.GetSoundResRef(type).replace(/\0.*$/g,'');
      if(resref != ''){
        if(this.audioEmitter)
          this.audioEmitter.PlaySound(resref);
      }
    }
  }

  followLeader(){
    //The follow leader action will be controlled by the heartbeat script when it is implemented
    this.actionQueue.push({object: Game.player, goal: ModuleCreature.ACTION.FOLLOWLEADER});
  }

  Save(){
    //TODO

    let gff = new GFFObject();

    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    let actionList = gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'ActionList'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'Age'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AmbientAnimState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'Animation'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'Appearance_Head'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'Appearance_Type'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AreaId'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'ArmorClass'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'BodyBag'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'Cha'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'ChallengeRating'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));
    gff.RootNode.AddField(new Field(GFFDataTypes.INT, 'AIState'));

    return gff;

  }

  toToolsetInstance(){

    let instance = new Struct(4);
    
    instance.AddField(
      new Field(GFFDataTypes.RESREF, 'TemplateResRef', this.getTemplateResRef())
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XOrientation', Math.cos(this.rotation.z + (Math.PI/2)))
    );

    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'XPosition', this.position.x)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YOrientation', Math.sin(this.rotation.z + (Math.PI/2)))
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'YPosition', this.position.y)
    );
    
    instance.AddField(
      new Field(GFFDataTypes.FLOAT, 'ZPosition', this.position.z)
    );

    return instance;

  }

}

ModuleCreature.AnimState = {
  GETINGUP: -3,
  DIEING: -2,
  DEAD: -1,
  IDLE: 0,
  WALKING: 1,
  RUNNING: 2,
  ANIMATING: 4,
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
