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
      this.creator = ModuleObject.GetObjectById(this.creator);
    }

    this.initialized = true;
    return this;
  }

  setCreator(oCreator = undefined){
    this.creator = oCreator;
  }

  setDuration(duration = 0){
    this.duration = duration;
  }

  getSubType(){
    return this.subType & GameEffect.SubType.MASK;
  }

  setSubType(subType = 0){
    if(subType >= 8 && subType <= GameEffect.SubType.MASK){
      this.subType = (this.subType & ~GameEffect.SubType.MASK | subType);
    }
  }

  getDurationType(){
    return this.subType & GameEffect.DurationType.MASK;
  }

  setDurationType(durationType = 0){
    if(durationType >= 0 && durationType <= GameEffect.DurationType.MASK){
      this.subType = (this.subType & ~GameEffect.DurationType.MASK | durationType);
    }
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

  setSpellId(nSpellId = -1){
    this.spellId = nSpellId;
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

  setAttachedObject( oObject = undefined){
    this.object = oObject;
  }

  getCreator(){
    return this.creator;
  }

  getDuration(){
    return this.duration;
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

  getSubTypeUnMasked(){
    return this.subType;
  }

  setSubTypeUnMasked( subType = 0){
    this.subType = subType;
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
    if(this.getDurationType() == GameEffect.DurationType.TEMPORARY && (this.expireDay || this.expireTime)){
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

      //Initialize the effect object based on the type
      switch(eType){
        case GameEffect.Type.EffectHaste: //Haste
          effect = new EffectHaste();
        break;
        case GameEffect.Type.EffectDamageResistance: //DamageResistance
          effect = new EffectDamageResistance();
        break;
        case GameEffect.Type.EffectSlow: //Slow
          effect = new EffectSlow();
        break;
        case GameEffect.Type.EffectRessurection: //Resurrection
          effect = new EffectRessurection();
        break;
        case GameEffect.Type.EffectDisease: //Disease
          effect = new EffectDisease();
        break;
        case GameEffect.Type.EffectRegenerate: //Regenerate
          effect = new EffectRegenerate();
        break;
        case GameEffect.Type.EffectAttackIncrease: //AttackIncrease
          effect = new EffectAttackIncrease();
        break;
        case GameEffect.Type.EffectAttackDecrease: //AttackDecrease
          effect = new EffectAttackDecrease();
        break;
        case GameEffect.Type.EffectDamageReduction: //DamageReduction
          effect = new EffectDamageReduction();
        break;
        case GameEffect.Type.EffectDamageIncrease: //DamageIncrease
          effect = new EffectDamageIncrease();
        break;
        case GameEffect.Type.EffectDamageDecrease: //DamageDecrease
          effect = new EffectDamageDecrease();
        break;
        case GameEffect.Type.EffectTemporaryHitPoints: //TemporaryHitpoints
          effect = new EffectTemporaryHitPoints();
        break;
        case GameEffect.Type.EffectDamageImmunityIncrease: //DamageImmunityIncrease
          effect = new EffectDamageImmunityIncrease();
        break;
        case GameEffect.Type.EffectDamageImmunityDecrease: //DamageImmunityDecrease
          effect = new EffectDamageImmunityDecrease();
        break;
        case GameEffect.Type.EffectEntangle: //Entangle
          effect = new EffectEntangle();
        break;
        case GameEffect.Type.EffectDeath: //Death
          effect = new EffectDeath();
        break;
        case GameEffect.Type.EffectKnockdown: //Knockdown

        break;
        case GameEffect.Type.EffectDeaf: //Deaf

        break;
        case GameEffect.Type.EffectImmunity: //Immunity
          effect = new EffectImmunity();
        break;
        case GameEffect.Type.EffectEnemyAttackBonus: //EnemyAttackBonus

        break;
        case GameEffect.Type.EffectSavingThrowIncrease: //SavingThrowIncrease
          effect = new EffectSavingThrowIncrease();
        break;
        case GameEffect.Type.EffectSavingThrowDecrease: //SavingThrowDecrease
          effect = new EffectSavingThrowDecrease();
        break;
        case GameEffect.Type.EffectMovementSpeedIncrease: //MovementSpeedIncrease
          effect = new EffectMovementSpeedIncrease();
        break;
        case GameEffect.Type.EffectMovementSpeedDecrease: //MovementSpeedDecrease
          effect = new EffectMovementSpeedDecrease();
        break;
        case GameEffect.Type.EffectVisualEffect: //VisualEffect
          effect = new EffectVisualEffect();
        break;
        case GameEffect.Type.EffectAreaOfEffect: //AreaOfEffect

        break;
        case GameEffect.Type.EffectBeam: //Beam
          effect = new EffectBeam();
        break;
        case GameEffect.Type.EffectForceResistanceIncrease: //ForceResistanceIncrease

        break;
        case GameEffect.Type.EffectForceResistanceDecrease: //ForceResistanceDecrease

        break;
        case GameEffect.Type.EffectPoison: //Poison
          effect = new EffectPoison();
        break;
        case GameEffect.Type.EffectAbilityIncrease: //AbilityIncrease
          effect = new EffectAbilityIncrease();
        break;
        case GameEffect.Type.EffectAbilityDecrease: //AbilityDecrease
          effect = new EffectAbilityDecrease();
        break;
        case GameEffect.Type.EffectDamage: //Damage
          effect = new EffectDamage();
        break;
        case GameEffect.Type.EffectHeal: //Heal
          effect = new EffectHeal();
        break;
        case GameEffect.Type.EffectLink: //Link
          effect = new EffectLink();
        break;
        case GameEffect.Type.EffectACIncrease: //ACIncrease
          effect = new EffectACIncrease();
        break;
        case GameEffect.Type.EffectACDecrease: //ACDecrease
          effect = new EffectACDecrease();
        break;
        case GameEffect.Type.EffectSpellImmunity: //SpellImmunity
          effect = new EffectSpellImmunity();
        break;
        case GameEffect.Type.EffectSkillIncrease: //SkillIncrease
          effect = new EffectSkillIncrease();
        break;
        case GameEffect.Type.EffectSkillDecrease: //SkillDecrease
          effect = new EffectSkillDecrease();
        break;
        case GameEffect.Type.EffectHitPointChangeWhenDying: //HitPointChangeWhenDying

        break;
        case GameEffect.Type.EffectLimitMovementSpeed: //LimitMovementSpeed

        break;
        case GameEffect.Type.EffectForcePushed: //ForcePushed

        break;
        case GameEffect.Type.EffectDamageShield: //DamageShield

        break;
        case GameEffect.Type.EffectDisguise: //Disguise
          effect = new EffectDisguise();
        break;
        case GameEffect.Type.EffectSpellLevelAbsorption: //SpellLevelAbsorption

        break;
        case GameEffect.Type.EffectIcon: //SetEffectIcon
          effect = new EffectIcon();
        break;
        case GameEffect.Type.EffectRacialType: //RacialType
          effect = new EffectRacialType();
        break;
        case GameEffect.Type.EffectBonusFeat: //BonusFeat
          effect = new EffectFeat();
        break;
        case GameEffect.Type.EffectBlasterDeflectionIncrease: //BlasterDeflectionIncrease
          effect = new EffectBlasterDeflectionIncrease();
        break;
        case GameEffect.Type.EffectBlasterDeflectionDecrease: //BlasterDeflectionDecrease
          effect = new EffectBlasterDeflectionDecrease();
        break;
        case GameEffect.Type.EffectDamageForcePoints: //EffectDamageForcePoints
          effect = new EffectDamageForcePoints();
        break;
        case GameEffect.Type.EffectHealForcePoints: //EffectHealForcePoints
          effect = new EffectHealForcePoints();
        break;
        case GameEffect.Type.EffectForceResisted:
          effect = new EffectForceResisted();
        break;
        case GameEffect.Type.EffectForceFizzle:
          effect = new EffectForceFizzle();
        break;
        case GameEffect.Type.EffectForceShield: //ForceShield
          effect = new EffectForceShield();
        break;
        case GameEffect.Type.EffectSetState: //EffectSetState
          effect = new EffectSetState();
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
          effect.setSubTypeUnMasked(eSubType);

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
        effect = undefined;
      }

      return effect;
    }
    return undefined;
  }

  getSaveType(){
    return this.type;
  }

  save(){

    let effectStruct = new Struct(2);
    effectStruct.AddField( new Field(GFFDataTypes.DWORD64, 'Id') ).SetValue(0);
    effectStruct.AddField( new Field(GFFDataTypes.WORD, 'Type') ).SetValue(this.getSaveType());
    effectStruct.AddField( new Field(GFFDataTypes.WORD, 'SubType') ).SetValue(this.getSubTypeUnMasked());
    effectStruct.AddField( new Field(GFFDataTypes.FLOAT, 'Duration') ).SetValue(this.getDuration());
    effectStruct.AddField( new Field(GFFDataTypes.BYTE, 'SkipOnLoad') ).SetValue(this.skipOnLoad ? 1 : 0);
    effectStruct.AddField( new Field(GFFDataTypes.DWORD, 'ExpireDay') ).SetValue(this.getExpireDay());
    effectStruct.AddField( new Field(GFFDataTypes.DWORD, 'ExpireTime') ).SetValue(this.getExpireTime());
    effectStruct.AddField( new Field(GFFDataTypes.DWORD, 'CreatorId') ).SetValue( this.creator instanceof ModuleObject ? this.creator.id : 2130706432 );
    effectStruct.AddField( new Field(GFFDataTypes.DWORD, 'SpellId') ).SetValue(this.getSpellId() >= 0 ? this.getSpellId() : 4294967295);
    effectStruct.AddField( new Field(GFFDataTypes.INT, 'IsExposed') ).SetValue(1);
    effectStruct.AddField( new Field(GFFDataTypes.INT, 'NumIntegers') ).SetValue(8);

    let intList = effectStruct.AddField( new Field(GFFDataTypes.LIST, 'IntList') );
    for(let i = 0; i < 8; i++){
      let intStruct = new Struct(3);
      intStruct.AddField( new Field(GFFDataTypes.INT, "Value").SetValue(this.getInt(i) || 0));
      intList.AddChildStruct(intStruct);
    }

    let floatList = effectStruct.AddField( new Field(GFFDataTypes.LIST, 'FloatList') );
    for(let i = 0; i < 4; i++){
      let floatStruct = new Struct(4);
      floatStruct.AddField( new Field(GFFDataTypes.FLOAT, "Value").SetValue(this.getFloat(i) || 0.0));
      floatList.AddChildStruct(floatStruct);
    }

    let stringList = effectStruct.AddField( new Field(GFFDataTypes.LIST, 'StringList') );
    for(let i = 0; i < 6; i++){
      let stringStruct = new Struct(5);
      stringStruct.AddField( new Field(GFFDataTypes.CEXOSTRING, "Value").SetValue(this.getString(i) || ''));
      stringList.AddChildStruct(stringStruct);
    }

    let objectList = effectStruct.AddField( new Field(GFFDataTypes.LIST, 'ObjectList') );
    for(let i = 0; i < 6; i++){
      let objectStruct = new Struct(5);
      objectStruct.AddField( new Field(GFFDataTypes.DWORD, "Value").SetValue( this.getObject(i) instanceof ModuleObject ? this.getObject(i).id : 2130706432 ));
      objectList.AddChildStruct(objectStruct);
    }

    return effectStruct;

  }

}

//https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp

//--------------------------//
// GameEffect DurationTypes
//--------------------------//

GameEffect.DurationType = {
  INSTANT:   0,
  TEMPORARY: 1,
  PERMANENT: 2,
  EQUIPPED:  3,
  INNATE:    4,

  MASK: 0x07
};

//---------------------//
// GameEffect SubTypes
//---------------------//

GameEffect.SubType = {
  MAGICAL:       8,
  SUPERNATURAL:  16,
  EXTRAORDINARY: 24,

  MASK: 0x18
};

//------------------//
// GameEffect Types
//------------------//

GameEffect.Type = {
  EffectHaste:                      0x01,
  EffectDamageResistance:           0x02,
  EffectSlow:                       0x03,
  EffectRessurection:               0x04,
  EffectDisease:                    0x05,
  EffectSummonCreature:             0x06,
  EffectRegenerate:                 0x07,
  EffectSetState:                   0x08,
  EffectSetStateInternal:           0x09,
  EffectAttackIncrease:             0x0A,
  EffectAttackDecrease:             0x0B,
  EffectDamageReduction:            0x0C,
  EffectDamageIncrease:             0x0D,
  EffectDamageDecrease:             0x0E,
  EffectTemporaryHitPoints:         0x0F,
  EffectDamageImmunityIncrease:     0x10,
  EffectDamageImmunityDecrease:     0x11,
  EffectEntangle:                   0x12,
  EffectDeath:                      0x13,
  EffectKnockdown:                  0x14,
  EffectDeaf:                       0x15,
  EffectImmunity:                   0x16,
  EffectSetAIState:                 0x17,
  EffectEnemyAttackBonus:           0x18,
  EffectArcaneSpellFailure:         0x19,
  EffectSavingThrowIncrease:        0x1A,
  EffectSavingThrowDecrease:        0x1B,
  EffectMovementSpeedIncrease:      0x1C,
  EffectMovementSpeedDecrease:      0x1D,
  EffectVisualEffect:               0x1E,
  EffectAreaOfEffect:               0x1F,
  EffectBeam:                       0x20,
  EffectForceResistanceIncrease:    0x21,
  EffectForceResistanceDecrease:    0x22,
  EffectPoison:                     0x23,
  EffectAbilityIncrease:            0x24,
  EffectAbilityDecrease:            0x25,
  EffectDamage:                     0x26,
  EffectHeal:                       0x27,
  EffectLink:                       0x28,
  EffectModifyNumAttacks:           0x2C,
  EffectCurse:                      0x2D,
  EffectSilence:                    0x2E,
  EffectInvisibility:               0x2F,
  EffectACIncrease:                 0x30,
  EffectACDecrease:                 0x31,
  EffectSpellImmunity:              0x32,
  EffectDispellMagic:               0x33,
  EffectDispellMagicBest:           0x34,
  EffectLight:                      0x36,
  EffectSkillIncrease:              0x37,
  EffectSkillDecrease:              0x38,
  EffectHitPointChangeWhenDying:    0x39,
  EffectSetWalkAnimation:           0x3A,
  EffectLimitMovementSpeed:         0x3B,
  EffectForcePushed:                0x3C,
  EffectDamageShield:               0x3D,
  EffectDisguise:                   0x3E,
  EffectSanctuary:                  0x3F,
  EffectTimeStop:                   0x40,
  EffectSpellLevelAbsorption:       0x41,
  EffectIcon:                       0x43,
  EffectRacialType:                 0x44,
  EffectSeeInvisible:               0x46,
  EffectUltraVision:                0x47,
  EffectTrueseeing:                 0x48,
  EffectBlindness:                  0x49,
  EffectDarkness:                   0x4A,
  EffectMissChance:                 0x4B,
  EffectConcealment:                0x4C,
  EffectAppear:                     0x51,
  EffectNegativeLevel:              0x52,
  EffectBonusFeat:                  0x53,
  EffectSummonParty:                0x59,
  EffectForceDrain:                 0x5A,
  EffectTemporaryForce:             0x5B,
  EffectBlasterDeflectionIncrease:  0x5C,
  EffectBlasterDeflectionDecrease:  0x5D,
  EffectDamageForcePoints:          0x5F,
  EffectHealForcePoints:            0x60,
  EffectBodyFuel:                   0x62,
  EffectPsychicStatic:              0x63,
  EffectLightSaberThrow:            0x64,
  EffectAssuredHit:                 0x65,
  EffectForceJump:                  0x66,
  EffectAssuredDeflection:          0x68,
  EffectForceResisted:              0x69,
  EffectForceFizzle:                0x6A,
  EffectForceShield:                0x6B,
  EffectPureGoodPowers:             0x6C,
  EfffectPureEvilPowers:            0x6D,
};

GameEffect.NWScriptEffectType = {
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
}

module.exports = GameEffect;