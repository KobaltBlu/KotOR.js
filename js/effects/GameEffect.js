class GameEffect {
  constructor(){
    this.creator = undefined;
    this.duration = 0;
    this.expireDay = 0;
    this.expireTime = 0;
    this.spellId = -1;
    this.subType = 0;
    this.skipOnLoad = 0;

    this.applied = false;
    this.initialized = false;
    this.durationEnded = false;

    this.numIntegers = 8;
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];

  }

  initialize(){
    if(this.initialized)
      return this;

    if(!isNaN(this.creator)){
      this.creator = this.object = ModuleObject.GetObjectById(this.creator);
    }

    this.initialized = true;
    return this;
  }

  hasSubType( durationType = -1 ){
    return ((this.subType & durationType) == durationType);
  }

  setCreator(oCreator = undefined){
    this.creator = this.object = oCreator;
  }

  setDuration(duration = 0){
    this.duration = duration;
  }

  setDurationType(durationType = 0){
    this.subType = this.subType | durationType;
  }

  setExpireDay(expireDay = 0){
    this.expireDay = expireDay;
  }

  setExpireTime(expireTime = 0){
    this.expireTime = expireTime;
  }

  setNumIntegers( num = 8 ){
    this.intList = new Array(num);
    this.intList.fill(0);
  }

  setSkipOnLoad( bSkipOnLoad = true ){
    this.skipOnLoad = bSkipOnLoad ? true : false;
  }

  setObject(obj = undefined){
    this.object = obj;
  }

  setSpellId(nSpellId = -1){
    this.spellId = nSpellId;
  }

  setSubType(nSubType = 0){
    this.subType = nSubType;
  }

  setIntList(intList = []){
    if(Array.isArray(intList)){
      this.intList = intList;
    }
  }

  setInt(nOffset = 0, nValue = 0){
    this.intList[nOffset] = nValue;
  }

  setFloatList(floatList = []){
    if(Array.isArray(floatList)){
      this.floatList = floatList;
    }
  }

  setFloat(nOffset = 0, nValue = 0){
    this.floatList[nOffset] = nValue;
  }

  setStringList(stringList = []){
    if(Array.isArray(stringList)){
      this.stringList = stringList;
    }
  }

  setString(nOffset = 0, nValue = ''){
    this.stringList[nOffset] = nValue;
  }

  setObjectList(objectList = []){
    if(Array.isArray(objectList)){
      this.objectList = objectList;
    }
  }

  setObject(nOffset = 0, nValue = ''){
    this.objectList[nOffset] = nValue;
  }

  getCreator(){
    return this.creator;
  }

  getDuration(){
    return this.duration;
  }

  getDurationType(){
    return this.subType;
  }

  getExpireDay(){
    return this.expireDay;
  }

  getExpireTime(){
    return this.expireTime;
  }

  getSpellId(){
    return this.spellId || -1;
  }

  getSubType(){
    return this.subType;
  }

  getInt(nOffset = 0){
    return this.intList[nOffset];
  }

  getFloat(nOffset = 0){
    return this.floatList[nOffset];
  }

  getString(nOffset = 0){
    return this.stringList[nOffset];
  }

  getObject(nOffset = 0){
    return this.objectList[nOffset];
  }

  update(delta){
    if(this.hasSubType(GameEffect.DurationType.TEMPORARY)){
      if(this.duration <= 0){
        this.onDurationEnd();
        return;
      }
      this.duration -= delta;
    }
  }

  dispose(){
    
  }

  ///////////////
  // Effect Events
  ///////////////

  //Called when the effect is applied ingame
  onApply(){
    if(this.applied)
      return;

    this.applied = true;
  }

  //When the effect is removed ingame
  onRemove(){

  }
  
  //When the effect duration has expired
  onDurationEnd(){
    this.durationEnded = true;
    if(this.object instanceof ModuleObject){
      this.object.removeEffect(this);
    }else{
      this.onRemove();
    }
  }

  static EffectFromStruct( struct = undefined ){
    if(struct instanceof Struct){
      let effect = undefined;

      let eType = struct.GetFieldByLabel('Type').GetValue();
      let eSubType = struct.GetFieldByLabel('SubType').GetValue();
      let eCreator = struct.GetFieldByLabel('CreatorId').GetValue();
      let eSpellId = struct.GetFieldByLabel('SpellId').GetValue();
      
      let eDuration = struct.GetFieldByLabel('Duration').GetValue();
      let eExpireDay = struct.GetFieldByLabel('ExpireDay').GetValue();
      let eExpireTime = struct.GetFieldByLabel('ExpireTime').GetValue();
      let eNumIntegers = struct.GetFieldByLabel('NumIntegers').GetValue();

      let intList = [];
      let floatList = [];
      let stringList = [];
      let objectList = [];

      let tmpList = struct.GetFieldByLabel('IntList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('FloatList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('StringList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('ObjectList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        objectList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      //(???) Means i haven't confirmed this type yet
      switch(eType){
        case 1: //Haste

        break;
        case 2: //DamageResistance
          effect = new EffectDamageResistance();
        break;
        case 3: //Slow

        break;
        case 4: //Resurrection

        break;
        case 5: //Disease

        break;
        case 7: //Regenerate
          effect = new EffectRegenerate();
        break;
        case 10: //AttackIncrease
          effect = new EffectAttackIncrease();
        break;
        case 11: //AttackDecrease
          effect = new EffectAttackDecrease();
        break;
        case 12: //DamageReduction

        break;
        case 13: //DamageIncrease
          effect = new EffectDamageIncrease();
        break;
        case 14: //DamageDecrease
          effect = new EffectDamageDecrease();
        break;
        case 15: //TemporaryHitpoints

        break;
        case 16: //DamageImmunityIncrease

        break;
        case 17: //DamageImmunityDecrease

        break;
        case 18: //Entangle

        break;
        case 19: //Death

        break;
        case 20: //Knockdown

        break;
        case 21: //Deaf

        break;
        case 22: //Immunity
          effect = new EffectImmunity();
        break;
        case 24: //EnemyAttackBonus

        break;
        case 26: //SavingThrowIncrease
          effect = new EffectSavingThrowIncrease();
        break;
        case 27: //SavingThrowDecrease
          effect = new EffectSavingThrowDecrease();
        break;
        case 28: //MovementSpeedIncrease
          effect = new EffectMovementSpeedIncrease();
        break;
        case 29: //MovementSpeedDecrease
          effect = new EffectMovementSpeedDecrease();
        break;
        case 30: //VisualEffect
          effect = new EffectVisualEffect();
        break;
        case 31: //AreaOfEffect

        break;
        case 32: //Beam
          effect = new EffectBeam();
        break;
        case 33: //ForceResistanceIncrease

        break;
        case 34: //ForceResistanceDecrease

        break;
        case 35: //Poison
          effect = new EffectPoison();
        break;
        case 36: //AbilityIncrease
          effect = new EffectAbilityIncrease();
        break;
        case 37: //AbilityDecrease
          effect = new EffectAbilityDecrease();
        break;
        case 38: //Damage
          effect = new EffectDamage();
        break;
        case 39: //Heal

        break;
        case 40: //Link

        break;
        case 48: //ACIncrease
          effect = new EffectACIncrease();
        break;
        case 49: //ACDecrease
          effect = new EffectACDecrease();
        break;
        case 50: //SpellImmunity

        break;
        case 55: //SkillIncrease
          effect = new EffectSkillIncrease();
        break;
        case 56: //SkillDecrease
          effect = new EffectSkillDecrease();
        break;
        case 57: //HitPointChangeWhenDying

        break;
        case 59: //LimitMovementSpeed

        break;
        case 60: //ForcePushed

        break;
        case 61: //DamageShield

        break;
        case 62: //Disguise
          effect = new EffectDisguise();
        break;
        case 65: //SpellLevelAbsorption

        break;
        case 67: //SetEffectIcon
          effect = new EffectIcon();
        break;
        case 68: //RacialType

        break;
        case 83: //BonusFeat
          effect = new EffectFeat();
        break;
        case 92: //BlasterDeflectionIncrease
          effect = new EffectBlasterDeflectionIncrease();
        break;
        case 93: //BlasterDeflectionDecrease
          effect = new EffectBlasterDeflectionDecrease();
        break;
        case 107: //ForceShield
          effect = new EffectForceShield();
        break;
      }

      let eSkipOnLoad = struct.GetFieldByLabel('SkipOnLoad').GetValue();
      if(!eSkipOnLoad){

        if(typeof effect !== 'undefined'){
          effect.setDuration(eDuration);
          effect.setExpireDay(eExpireDay);
          effect.setExpireTime(eExpireTime);
          effect.setCreator(eCreator);
          effect.setSpellId(eSpellId == 4294967295 ? -1 : eSpellId);
          effect.setSubType(eSubType);

          effect.setNumIntegers(eNumIntegers);
          effect.setIntList(intList);
          effect.setFloatList(floatList);
          effect.setStringList(stringList);
          effect.setObjectList(objectList);
          //console.log('Handled Effect', eType, struct.ToJSON());
          //effect.initialize();
        }else{
          console.log('Unhandled Effect', eType, struct.ToJSON());
        }
      }else{
        if(typeof effect !== 'undefined'){
          //console.log('Skipped Effect', eType, struct.ToJSON());
        }else{
          console.log('Unhandled Skipped Effect', eType, struct.ToJSON());
        }
      }

      return effect;
    }
    return undefined;
  }

}

GameEffect.DurationType = {
  INSTANT:   0,
  TEMPORARY: 1,
  PERMANENT: 2,
  EQUIPPED:  3,
  INNATE:    4
};

GameEffect.Type = {

  //---------------------------//
  // nwscript.nss Effect Types
  //---------------------------//
  
  EffectInvalidEffect:		undefined,
  EffectDamageResistance:	1,
  //EFFECT_TYPE_ABILITY_BONUS:		2,
  EffectRegenerate:	      3,
  //EFFECT_TYPE_SAVING_THROW_BONUS:		4,
  //EFFECT_TYPE_MODIFY_AC:		5,
  //EFFECT_TYPE_ATTACK_BONUS:		6,
  EffectDamageReduction:		7,
  //EFFECT_TYPE_DAMAGE_BONUS:		8,
  EffectTemporaryHitPoints:		9,
  //EFFECT_TYPE_DAMAGE_IMMUNITY:		10,
  EffectEntangle:		      11,
  EffectInvulnerable:		  12,
  EffectDeaf:		          13,
  EffectRessurection:		  14,
  EffectImmunity:		      15,
  //EFFECT_TYPE_BLIND:		16,
  EffectEnemyAttackBonus:	17,
  EffectArcaneSpellFailure:		18,
  //EFFECT_TYPE_MOVEMENT_SPEED:		19,
  EffectAreaOfEffect:		  20,
  EffectBeam:             21,
  //EFFECT_TYPE_FORCE_RESISTANCE:		22,
  EffectCharmed:	        23,
  EffectConfused:	        24,
  EffectFrightened:	      25,
  EffectDominated:      	26,
  EffectParalyze:	        27,
  EffectDazed:	          28,
  EffectStunned:	        29,
  EffectSleep:	          30,
  EffectPoison:	          31,
  EffectDisease:	        32,
  EffectCurse:	          33,
  EffectSilence:	        34,
  EffectTurned:	          35,
  EffectHaste:	          36,
  EffectSlow:	            37,
  EffectAbilityIncrease:  38,
  EffectAbilityDecrease:  39,
  EffectAttackIncrease:   40,
  EffectAttackDecrease:   41,
  EffectDamageIncrease:   42,
  EffectDamageDecrease:   43,
  EffectDamageImmunityIncrease:   44,
  EffectDamageImmunityDecrease:   45,
  EffectACIncrease:       46,
  EffectACDecrease:       47,
  EffectMovementSpeedIncrease:    48,
  EffectMovementSpeedDecrease:    49,
  EffectSavingThrowIncrease:      50,
  EffectSavingThrowDecrease:      51,
  EffectForceResistanceIncrease:  52,
  EffectForceResistanceDecrease:  53,
  EffectSkillIncrease:		54,
  EffectSkillDecrease:		55,
  EffectInvisibility:			56,
  EffectImprovedInvisibility:			57,
  EffectDarkness:			    58,
  EffectDispellMagic:			59,
  EffectElementalShield:	60,
  EffectNegativeLevel:		61,
  EffectDisguise:			    62,
  EffectSanctuary:			  63,
  EffectTrueseeing:			  64,
  EffectSeeInvisible:			65,
  EffectTimeStop:			    66,
  EffectBlindness:			  67,
  EffectSpellLevelAbsorption:			68,
  EffectDispellMagicBest:	69,
  EffectUltraVision:			70,
  EffectMissChance:			  71,
  EffectConealment:			  72,
  EffectSpellImmunity:		73,
  EffectAssuredHit:       74,
  EffectVisualEffect:     75,
  EffectForcePushed:      80,
  EffectFeat:             83,
  
  //------------------------//
  // Unknown Effect Numbers
  //------------------------//
  EffectDeath:            99999,
  EffectHeal:             99998,
  EffectLink:             99997,
  EffectDamage:           99996,
  EffectForceShield:      99995,
  EffectIcon:             99994,
  EffectDroidStun:        99993,
  EffectChoke:            99992,
  EffectHorrified:        99991
};

module.exports = GameEffect;