import { GameEffectType } from "../enums/effects/GameEffectType";
import { GFFStruct } from "../resource/GFFStruct";
import { EffectACDecrease } from "./EffectACDecrease";
import { EffectACIncrease } from "./EffectACIncrease";
import { EffectAbilityDecrease } from "./EffectAbilityDecrease";
import { EffectAbilityIncrease } from "./EffectAbilityIncrease";
import { EffectAreaOfEffect } from "./EffectAreaOfEffect";
import { EffectAssuredDeflection } from "./EffectAssuredDeflection";
import { EffectAssuredHit } from "./EffectAssuredHit";
import { EffectAttackDecrease } from "./EffectAttackDecrease";
import { EffectAttackIncrease } from "./EffectAttackIncrease";
import { EffectBeam } from "./EffectBeam";
import { EffectBlasterDeflectionDecrease } from "./EffectBlasterDeflectionDecrease";
import { EffectBlasterDeflectionIncrease } from "./EffectBlasterDeflectionIncrease";
import { EffectConcealment } from "./EffectConcealment";
import { EffectDamage } from "./EffectDamage";
import { EffectDamageDecrease } from "./EffectDamageDecrease";
import { EffectDamageForcePoints } from "./EffectDamageForcePoints";
import { EffectDamageImmunityDecrease } from "./EffectDamageImmunityDecrease";
import { EffectDamageImmunityIncrease } from "./EffectDamageImmunityIncrease";
import { EffectDamageIncrease } from "./EffectDamageIncrease";
import { EffectDamageReduction } from "./EffectDamageReduction";
import { EffectDamageResistance } from "./EffectDamageResistance";
import { EffectDeath } from "./EffectDeath";
import { EffectDisease } from "./EffectDisease";
import { EffectDisguise } from "./EffectDisguise";
import { EffectEntangle } from "./EffectEntangle";
import { EffectFeat } from "./EffectFeat";
import { EffectForceFizzle } from "./EffectForceFizzle";
import { EffectForceJump } from "./EffectForceJump";
import { EffectForcePushed } from "./EffectForcePushed";
import { EffectForceResisted } from "./EffectForceResisted";
import { EffectForceShield } from "./EffectForceShield";
import { EffectHaste } from "./EffectHaste";
import { EffectHeal } from "./EffectHeal";
import { EffectHealForcePoints } from "./EffectHealForcePoints";
import { EffectIcon } from "./EffectIcon";
import { EffectImmunity } from "./EffectImmunity";
import { EffectInvisibility } from "./EffectInvisibility";
import { EffectKnockdown } from "./EffectKnockdown";
import { EffectLink } from "./EffectLink";
import { EffectMissChance } from "./EffectMissChance";
import { EffectMovementSpeedDecrease } from "./EffectMovementSpeedDecrease";
import { EffectMovementSpeedIncrease } from "./EffectMovementSpeedIncrease";
import { EffectPoison } from "./EffectPoison";
import { EffectRacialType } from "./EffectRacialType";
import { EffectRegenerate } from "./EffectRegenerate";
import { EffectResurrection } from "./EffectResurrection";
import { EffectSavingThrowDecrease } from "./EffectSavingThrowDecrease";
import { EffectSavingThrowIncrease } from "./EffectSavingThrowIncrease";
import { EffectSetState } from "./EffectSetState";
import { EffectSkillDecrease } from "./EffectSkillDecrease";
import { EffectSkillIncrease } from "./EffectSkillIncrease";
import { EffectSlow } from "./EffectSlow";
import { EffectSpellImmunity } from "./EffectSpellImmunity";
import { EffectTemporaryForce } from "./EffectTemporaryForce";
import { EffectTemporaryHitPoints } from "./EffectTemporaryHitPoints";
import { EffectVisualEffect } from "./EffectVisualEffect";
import { EffectForceResistanceIncrease } from "./EffectForceResistanceIncrease";
import { EffectForceResistanceDecrease } from "./EffectForceResistanceDecrease";
import { GameEffect } from "./GameEffect";

/**
 * GameEffectFactory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEffectFactory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameEffectFactory {

  static EffectHaste: typeof EffectHaste = EffectHaste;
  static EffectDamageResistance: typeof EffectDamageResistance = EffectDamageResistance;
  static EffectSlow: typeof EffectSlow = EffectSlow;
  static EffectResurrection: typeof EffectResurrection = EffectResurrection;
  static EffectDisease: typeof EffectDisease = EffectDisease;
  // static EffectSummonCreature: typeof EffectSummonCreature = EffectSummonCreature;
  static EffectRegenerate: typeof EffectRegenerate = EffectRegenerate;
  static EffectSetState: typeof EffectSetState = EffectSetState;
  // static EffectSetStateInternal: typeof EffectSetStateInternal = EffectSetStateInternal;
  static EffectAttackIncrease: typeof EffectAttackIncrease = EffectAttackIncrease;
  static EffectAttackDecrease: typeof EffectAttackDecrease = EffectAttackDecrease;
  static EffectDamageReduction: typeof EffectDamageReduction = EffectDamageReduction;
  static EffectDamageIncrease: typeof EffectDamageIncrease = EffectDamageIncrease;
  static EffectDamageDecrease: typeof EffectDamageDecrease = EffectDamageDecrease;
  static EffectTemporaryHitPoints: typeof EffectTemporaryHitPoints = EffectTemporaryHitPoints;
  static EffectDamageImmunityIncrease: typeof EffectDamageImmunityIncrease = EffectDamageImmunityIncrease;
  static EffectDamageImmunityDecrease: typeof EffectDamageImmunityDecrease = EffectDamageImmunityDecrease;
  static EffectEntangle: typeof EffectEntangle = EffectEntangle;
  static EffectDeath: typeof EffectDeath = EffectDeath;
  static EffectKnockdown: typeof EffectKnockdown = EffectKnockdown;
  // static EffectDeaf: typeof EffectDeaf = EffectDeaf;
  static EffectImmunity: typeof EffectImmunity = EffectImmunity;
  // static EffectSetAIState: typeof EffectSetAIState = EffectSetAIState;
  // static EffectEnemyAttackBonus: typeof EffectEnemyAttackBonus = EffectEnemyAttackBonus;
  // static EffectArcaneSpellFailure: typeof EffectArcaneSpellFailure = EffectArcaneSpellFailure;
  static EffectSavingThrowIncrease: typeof EffectSavingThrowIncrease = EffectSavingThrowIncrease;
  static EffectSavingThrowDecrease: typeof EffectSavingThrowDecrease = EffectSavingThrowDecrease;
  static EffectMovementSpeedIncrease: typeof EffectMovementSpeedIncrease = EffectMovementSpeedIncrease;
  static EffectMovementSpeedDecrease: typeof EffectMovementSpeedDecrease = EffectMovementSpeedDecrease;
  static EffectVisualEffect: typeof EffectVisualEffect = EffectVisualEffect;
  static EffectAreaOfEffect: typeof EffectAreaOfEffect = EffectAreaOfEffect;
  static EffectBeam: typeof EffectBeam = EffectBeam;
  static EffectForceResistanceIncrease: typeof EffectForceResistanceIncrease = EffectForceResistanceIncrease;
  static EffectForceResistanceDecrease: typeof EffectForceResistanceDecrease = EffectForceResistanceDecrease;
  static EffectPoison: typeof EffectPoison = EffectPoison;
  static EffectAbilityIncrease: typeof EffectAbilityIncrease = EffectAbilityIncrease;
  static EffectAbilityDecrease: typeof EffectAbilityDecrease = EffectAbilityDecrease;
  static EffectDamage: typeof EffectDamage = EffectDamage;
  static EffectHeal: typeof EffectHeal = EffectHeal;
  static EffectLink: typeof EffectLink = EffectLink;
  // static EffectModifyNumAttacks: typeof EffectModifyNumAttacks = EffectModifyNumAttacks;
  // static EffectCurse: typeof EffectCurse = EffectCurse;
  // static EffectSilence: typeof EffectSilence = EffectSilence;
  static EffectInvisibility: typeof EffectInvisibility = EffectInvisibility;
  static EffectACIncrease: typeof EffectACIncrease = EffectACIncrease;
  static EffectACDecrease: typeof EffectACDecrease = EffectACDecrease;
  static EffectSpellImmunity: typeof EffectSpellImmunity = EffectSpellImmunity;
  /*static EffectDispellMagic: typeof EffectDispellMagic = EffectDispellMagic;
  static EffectDispellMagicBest: typeof EffectDispellMagicBest = EffectDispellMagicBest;
  static EffectLight: typeof EffectLight = EffectLight;*/
  static EffectSkillIncrease: typeof EffectSkillIncrease = EffectSkillIncrease;
  static EffectSkillDecrease: typeof EffectSkillDecrease = EffectSkillDecrease;
  // static EffectHitPointChangeWhenDying: typeof EffectHitPointChangeWhenDying = EffectHitPointChangeWhenDying;
  // static EffectSetWalkAnimation: typeof EffectSetWalkAnimation = EffectSetWalkAnimation;
  // static EffectLimitMovementSpeed: typeof EffectLimitMovementSpeed = EffectLimitMovementSpeed;
  static EffectForcePushed: typeof EffectForcePushed = EffectForcePushed;
  // static EffectDamageShield: typeof EffectDamageShield = EffectDamageShield;
  static EffectDisguise: typeof EffectDisguise = EffectDisguise;
  /*static EffectSanctuary: typeof EffectSanctuary = EffectSanctuary;
  static EffectTimeStop: typeof EffectTimeStop = EffectTimeStop;
  static EffectSpellLevelAbsorption: typeof EffectSpellLevelAbsorption = EffectSpellLevelAbsorption;*/
  static EffectIcon: typeof EffectIcon = EffectIcon;
  static EffectRacialType: typeof EffectRacialType = EffectRacialType;
  // static EffectSeeInvisible: typeof EffectSeeInvisible = EffectSeeInvisible;
  // static EffectUltraVision: typeof EffectUltraVision = EffectUltraVision;
  // static EffectTrueseeing: typeof EffectTrueseeing = EffectTrueseeing;
  // static EffectBlindness: typeof EffectBlindness = EffectBlindness;
  // static EffectDarkness: typeof EffectDarkness = EffectDarkness;
  static EffectMissChance: typeof EffectMissChance = EffectMissChance;
  static EffectConcealment: typeof EffectConcealment = EffectConcealment;
  // static EffectAppear: typeof EffectAppear = EffectAppear;
  // static EffectNegativeLevel: typeof EffectNegativeLevel = EffectNegativeLevel;
  // static EffectBonusFeat: typeof EffectBonusFeat = EffectBonusFeat;
  // static EffectSummonParty: typeof EffectSummonParty = EffectSummonParty;
  // static EffectForceDrain: typeof EffectForceDrain = EffectForceDrain;
  static EffectTemporaryForce: typeof EffectTemporaryForce = EffectTemporaryForce;
  static EffectBlasterDeflectionIncrease: typeof EffectBlasterDeflectionIncrease = EffectBlasterDeflectionIncrease;
  static EffectBlasterDeflectionDecrease: typeof EffectBlasterDeflectionDecrease = EffectBlasterDeflectionDecrease;
  static EffectDamageForcePoints: typeof EffectDamageForcePoints = EffectDamageForcePoints;
  static EffectHealForcePoints: typeof EffectHealForcePoints = EffectHealForcePoints;
  // static EffectBodyFuel: typeof EffectBodyFuel = EffectBodyFuel;
  // static EffectPsychicStatic: typeof EffectPsychicStatic = EffectPsychicStatic;
  // static EffectLightSaberThrow: typeof EffectLightSaberThrow = EffectLightSaberThrow;
  static EffectAssuredHit: typeof EffectAssuredHit = EffectAssuredHit;
  static EffectForceJump: typeof EffectForceJump = EffectForceJump;
  static EffectAssuredDeflection: typeof EffectAssuredDeflection = EffectAssuredDeflection;
  static EffectForceResisted: typeof EffectForceResisted = EffectForceResisted;
  static EffectForceFizzle: typeof EffectForceFizzle = EffectForceFizzle;
  static EffectForceShield: typeof EffectForceShield = EffectForceShield;
  // static EffectPureGoodPowers: typeof EffectPureGoodPowers = EffectPureGoodPowers;
  // static EfffectPureEvilPowers: typeof EfffectPureEvilPowers = EfffectPureEvilPowers;
  
  static EffectFromStruct( struct: GFFStruct ): GameEffect {
    if(!struct){ return undefined as any; }

    let effect: GameEffect = undefined as any;

    let eType = struct.getFieldByLabel('Type').getValue();
    let eSubType = struct.getFieldByLabel('SubType').getValue();
    let eCreator = struct.getFieldByLabel('CreatorId').getValue();
    let eSpellId = struct.getFieldByLabel('SpellId').getValue();
    
    let eDuration = struct.getFieldByLabel('Duration').getValue();
    let eExpireDay = struct.getFieldByLabel('ExpireDay').getValue();
    let eExpireTime = struct.getFieldByLabel('ExpireTime').getValue();
    let eNumIntegers = struct.getFieldByLabel('NumIntegers').getValue();

    let intList: number[] = [];
    let floatList: number[] = [];
    let stringList: string[] = [];
    let objectList: number[] = [];

    let tmpList = struct.getFieldByLabel('IntList').getChildStructs();
    for(let i = 0, len = tmpList.length; i < len; i++){
      intList[i] = tmpList[i].getFieldByLabel('Value').getValue();
    }

    tmpList = struct.getFieldByLabel('FloatList').getChildStructs();
    for(let i = 0, len = tmpList.length; i < len; i++){
      floatList[i] = tmpList[i].getFieldByLabel('Value').getValue();
    }

    tmpList = struct.getFieldByLabel('StringList').getChildStructs();
    for(let i = 0, len = tmpList.length; i < len; i++){
      stringList[i] = tmpList[i].getFieldByLabel('Value').getValue();
    }

    tmpList = struct.getFieldByLabel('ObjectList').getChildStructs();
    for(let i = 0, len = tmpList.length; i < len; i++){
      objectList[i] = tmpList[i].getFieldByLabel('Value').getValue();
    }

    //Initialize the effect object based on the type
    switch(eType){
      case GameEffectType.EffectHaste: //Haste
        effect = new EffectHaste();
      break;
      case GameEffectType.EffectDamageResistance: //DamageResistance
        effect = new EffectDamageResistance();
      break;
      case GameEffectType.EffectSlow: //Slow
        effect = new EffectSlow();
      break;
      case GameEffectType.EffectResurrection: //Resurrection
        effect = new EffectResurrection();
      break;
      case GameEffectType.EffectDisease: //Disease
        effect = new EffectDisease();
      break;
      case GameEffectType.EffectRegenerate: //Regenerate
        effect = new EffectRegenerate();
      break;
      case GameEffectType.EffectAttackIncrease: //AttackIncrease
        effect = new EffectAttackIncrease();
      break;
      case GameEffectType.EffectAttackDecrease: //AttackDecrease
        effect = new EffectAttackDecrease();
      break;
      case GameEffectType.EffectDamageReduction: //DamageReduction
        effect = new EffectDamageReduction();
      break;
      case GameEffectType.EffectDamageIncrease: //DamageIncrease
        effect = new EffectDamageIncrease();
      break;
      case GameEffectType.EffectDamageDecrease: //DamageDecrease
        effect = new EffectDamageDecrease();
      break;
      case GameEffectType.EffectTemporaryHitPoints: //TemporaryHitpoints
        effect = new EffectTemporaryHitPoints();
      break;
      case GameEffectType.EffectDamageImmunityIncrease: //DamageImmunityIncrease
        effect = new EffectDamageImmunityIncrease();
      break;
      case GameEffectType.EffectDamageImmunityDecrease: //DamageImmunityDecrease
        effect = new EffectDamageImmunityDecrease();
      break;
      case GameEffectType.EffectEntangle: //Entangle
        effect = new EffectEntangle();
      break;
      case GameEffectType.EffectDeath: //Death
        effect = new EffectDeath();
      break;
      case GameEffectType.EffectKnockdown: //Knockdown

      break;
      case GameEffectType.EffectDeaf: //Deaf

      break;
      case GameEffectType.EffectImmunity: //Immunity
        effect = new EffectImmunity();
      break;
      case GameEffectType.EffectEnemyAttackBonus: //EnemyAttackBonus

      break;
      case GameEffectType.EffectSavingThrowIncrease: //SavingThrowIncrease
        effect = new EffectSavingThrowIncrease();
      break;
      case GameEffectType.EffectSavingThrowDecrease: //SavingThrowDecrease
        effect = new EffectSavingThrowDecrease();
      break;
      case GameEffectType.EffectMovementSpeedIncrease: //MovementSpeedIncrease
        effect = new EffectMovementSpeedIncrease();
      break;
      case GameEffectType.EffectMovementSpeedDecrease: //MovementSpeedDecrease
        effect = new EffectMovementSpeedDecrease();
      break;
      case GameEffectType.EffectVisualEffect: //VisualEffect
        effect = new EffectVisualEffect();
      break;
      case GameEffectType.EffectAreaOfEffect: //AreaOfEffect

      break;
      case GameEffectType.EffectBeam: //Beam
        effect = new EffectBeam();
      break;
      case GameEffectType.EffectForceResistanceIncrease: //ForceResistanceIncrease

      break;
      case GameEffectType.EffectForceResistanceDecrease: //ForceResistanceDecrease

      break;
      case GameEffectType.EffectPoison: //Poison
        effect = new EffectPoison();
      break;
      case GameEffectType.EffectAbilityIncrease: //AbilityIncrease
        effect = new EffectAbilityIncrease();
      break;
      case GameEffectType.EffectAbilityDecrease: //AbilityDecrease
        effect = new EffectAbilityDecrease();
      break;
      case GameEffectType.EffectDamage: //Damage
        effect = new EffectDamage();
      break;
      case GameEffectType.EffectHeal: //Heal
        effect = new EffectHeal();
      break;
      case GameEffectType.EffectLink: //Link
        effect = new EffectLink();
      break;
      case GameEffectType.EffectACIncrease: //ACIncrease
        effect = new EffectACIncrease();
      break;
      case GameEffectType.EffectACDecrease: //ACDecrease
        effect = new EffectACDecrease();
      break;
      case GameEffectType.EffectSpellImmunity: //SpellImmunity
        effect = new EffectSpellImmunity();
      break;
      case GameEffectType.EffectSkillIncrease: //SkillIncrease
        effect = new EffectSkillIncrease();
      break;
      case GameEffectType.EffectSkillDecrease: //SkillDecrease
        effect = new EffectSkillDecrease();
      break;
      case GameEffectType.EffectHitPointChangeWhenDying: //HitPointChangeWhenDying

      break;
      case GameEffectType.EffectLimitMovementSpeed: //LimitMovementSpeed

      break;
      case GameEffectType.EffectForcePushed: //ForcePushed

      break;
      case GameEffectType.EffectDamageShield: //DamageShield

      break;
      case GameEffectType.EffectDisguise: //Disguise
        effect = new EffectDisguise();
      break;
      case GameEffectType.EffectSpellLevelAbsorption: //SpellLevelAbsorption

      break;
      case GameEffectType.EffectIcon: //SetEffectIcon
        effect = new EffectIcon();
      break;
      case GameEffectType.EffectRacialType: //RacialType
        effect = new EffectRacialType();
      break;
      case GameEffectType.EffectBonusFeat: //BonusFeat
        effect = new EffectFeat();
      break;
      case GameEffectType.EffectBlasterDeflectionIncrease: //BlasterDeflectionIncrease
        effect = new EffectBlasterDeflectionIncrease();
      break;
      case GameEffectType.EffectBlasterDeflectionDecrease: //BlasterDeflectionDecrease
        effect = new EffectBlasterDeflectionDecrease();
      break;
      case GameEffectType.EffectDamageForcePoints: //EffectDamageForcePoints
        effect = new EffectDamageForcePoints();
      break;
      case GameEffectType.EffectHealForcePoints: //EffectHealForcePoints
        effect = new EffectHealForcePoints();
      break;
      case GameEffectType.EffectForceResisted:
        effect = new EffectForceResisted();
      break;
      case GameEffectType.EffectForceFizzle:
        effect = new EffectForceFizzle();
      break;
      case GameEffectType.EffectForceShield: //ForceShield
        effect = new EffectForceShield();
      break;
      case GameEffectType.EffectSetState: //EffectSetState
        effect = new EffectSetState();
      break;
    }

    let eSkipOnLoad = struct.getFieldByLabel('SkipOnLoad').getValue();
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
        effect.setObjectList(objectList as any);
        //console.log('Handled Effect', eType, struct.ToJSON());
        //effect.initialize();
      }else{
        console.log('Unhandled Effect', eType, struct.toJSON());
      }
      return effect;
    }else{
      if(typeof effect !== 'undefined'){
        //console.log('Skipped Effect', eType, struct.ToJSON());
      }else{
        console.log('Unhandled Skipped Effect', eType, struct.toJSON());
      }
      return undefined as any;
    }
  }
}