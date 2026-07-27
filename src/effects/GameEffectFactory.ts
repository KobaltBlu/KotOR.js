import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GFFStruct } from "@/resource/GFFStruct";
import { EffectACDecrease } from "@/effects/EffectACDecrease";
import { EffectACIncrease } from "@/effects/EffectACIncrease";
import { EffectAbilityDecrease } from "@/effects/EffectAbilityDecrease";
import { EffectAbilityIncrease } from "@/effects/EffectAbilityIncrease";
import { EffectAreaOfEffect } from "@/effects/EffectAreaOfEffect";
import { EffectAssuredDeflection } from "@/effects/EffectAssuredDeflection";
import { EffectAssuredHit } from "@/effects/EffectAssuredHit";
import { EffectHitPointChangeWhenDying } from "@/effects/EffectHitPointChangeWhenDying";
import { EffectTimeStop } from "@/effects/EffectTimeStop";
import { EffectAttackDecrease } from "@/effects/EffectAttackDecrease";
import { EffectAttackIncrease } from "@/effects/EffectAttackIncrease";
import { EffectBeam } from "@/effects/EffectBeam";
import { EffectBlindness } from "@/effects/EffectBlindness";
import { EffectBlasterDeflectionDecrease } from "@/effects/EffectBlasterDeflectionDecrease";
import { EffectBlasterDeflectionIncrease } from "@/effects/EffectBlasterDeflectionIncrease";
import { EffectConcealment } from "@/effects/EffectConcealment";
import { EffectDamage } from "@/effects/EffectDamage";
import { EffectDamageDecrease } from "@/effects/EffectDamageDecrease";
import { EffectDamageForcePoints } from "@/effects/EffectDamageForcePoints";
import { EffectDamageImmunityDecrease } from "@/effects/EffectDamageImmunityDecrease";
import { EffectDamageImmunityIncrease } from "@/effects/EffectDamageImmunityIncrease";
import { EffectDamageIncrease } from "@/effects/EffectDamageIncrease";
import { EffectDamageReduction } from "@/effects/EffectDamageReduction";
import { EffectDamageResistance } from "@/effects/EffectDamageResistance";
import { EffectDamageShield } from "@/effects/EffectDamageShield";
import { EffectDarkness } from "@/effects/EffectDarkness";
import { EffectDeath } from "@/effects/EffectDeath";
import { EffectDisease } from "@/effects/EffectDisease";
import { EffectDisguise } from "@/effects/EffectDisguise";
import { EffectDispelMagicAll } from "@/effects/EffectDispelMagicAll";
import { EffectDispelMagicBest } from "@/effects/EffectDispelMagicBest";
import { EffectEntangle } from "@/effects/EffectEntangle";
import { EffectFeat } from "@/effects/EffectFeat";
import { EffectForceFizzle } from "@/effects/EffectForceFizzle";
import { EffectForceJump } from "@/effects/EffectForceJump";
import { EffectForcePushed } from "@/effects/EffectForcePushed";
import { EffectForceResisted } from "@/effects/EffectForceResisted";
import { EffectForceShield } from "@/effects/EffectForceShield";
import { EffectForceSight } from "@/effects/EffectForceSight";
import { EffectHaste } from "@/effects/EffectHaste";
import { EffectHasteInternal } from "@/effects/EffectHasteInternal";
import { EffectHeal } from "@/effects/EffectHeal";
import { EffectHealForcePoints } from "@/effects/EffectHealForcePoints";
import { EffectIcon } from "@/effects/EffectIcon";
import { EffectImmunity } from "@/effects/EffectImmunity";
import { EffectInvisibility } from "@/effects/EffectInvisibility";
import { EffectKnockdown } from "@/effects/EffectKnockdown";
import { EffectLimitMovementSpeed } from "@/effects/EffectLimitMovementSpeed";
import { EffectLink } from "@/effects/EffectLink";
import { EffectMissChance } from "@/effects/EffectMissChance";
import { EffectModifyNumAttacks } from "@/effects/EffectModifyNumAttacks";
import { EffectMovementSpeedDecrease } from "@/effects/EffectMovementSpeedDecrease";
import { EffectMovementSpeedIncrease } from "@/effects/EffectMovementSpeedIncrease";
import { EffectPoison } from "@/effects/EffectPoison";
import { EffectRacialType } from "@/effects/EffectRacialType";
import { EffectRegenerate } from "@/effects/EffectRegenerate";
import { EffectResurrection } from "@/effects/EffectResurrection";
import { EffectSanctuary } from "@/effects/EffectSanctuary";
import { EffectSavingThrowDecrease } from "@/effects/EffectSavingThrowDecrease";
import { EffectSavingThrowIncrease } from "@/effects/EffectSavingThrowIncrease";
import { EffectSeeInvisible } from "@/effects/EffectSeeInvisible";
import { EffectSetState } from "@/effects/EffectSetState";
import { EffectSetStateInternal } from "@/effects/EffectSetStateInternal";
import { EffectSkillDecrease } from "@/effects/EffectSkillDecrease";
import { EffectSkillIncrease } from "@/effects/EffectSkillIncrease";
import { EffectSlow } from "@/effects/EffectSlow";
import { EffectSlowInternal } from "@/effects/EffectSlowInternal";
import { EffectSpellImmunity } from "@/effects/EffectSpellImmunity";
import { EffectSpellLevelAbsorption } from "@/effects/EffectSpellLevelAbsorption";
import { EffectTemporaryForce } from "@/effects/EffectTemporaryForce";
import { EffectTemporaryHitPoints } from "@/effects/EffectTemporaryHitPoints";
import { EffectUltraVision } from "@/effects/EffectUltraVision";
import { EffectVisualEffect } from "@/effects/EffectVisualEffect";
import { EffectForceResistanceIncrease } from "@/effects/EffectForceResistanceIncrease";
import { EffectForceResistanceDecrease } from "@/effects/EffectForceResistanceDecrease";
import { EffectTrueSeeing } from "@/effects/EffectTrueSeeing";
import { EffectSilence } from "@/effects/EffectSilence";
import { EffectDeaf } from "@/effects/EffectDeaf";
import { EffectArcaneSpellFailure } from "@/effects/EffectArcaneSpellFailure";
import { EffectForceDrain } from "@/effects/EffectForceDrain";
import { EffectBodyFuel } from "@/effects/EffectBodyFuel";
import { EffectPsychicStatic } from "@/effects/EffectPsychicStatic";
import { EffectCurse } from "@/effects/EffectCurse";
import { EffectNegativeLevel } from "@/effects/EffectNegativeLevel";
import { EffectSummonCreature } from "@/effects/EffectSummonCreature";
import { EffectLightsaberThrow } from "@/effects/EffectLightsaberThrow";
import { GameEffect } from "@/effects/GameEffect";

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
  static EffectHasteInternal: typeof EffectHasteInternal = EffectHasteInternal;
  static EffectDamageResistance: typeof EffectDamageResistance = EffectDamageResistance;
  static EffectSlow: typeof EffectSlow = EffectSlow;
  static EffectSlowInternal: typeof EffectSlowInternal = EffectSlowInternal;
  static EffectResurrection: typeof EffectResurrection = EffectResurrection;
  static EffectDisease: typeof EffectDisease = EffectDisease;
  static EffectSummonCreature: typeof EffectSummonCreature = EffectSummonCreature;
  static EffectRegenerate: typeof EffectRegenerate = EffectRegenerate;
  static EffectSetState: typeof EffectSetState = EffectSetState;
  static EffectSetStateInternal: typeof EffectSetStateInternal = EffectSetStateInternal;
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
  static EffectDeaf: typeof EffectDeaf = EffectDeaf;
  static EffectImmunity: typeof EffectImmunity = EffectImmunity;
  // static EffectSetAIState: typeof EffectSetAIState = EffectSetAIState;
  // static EffectEnemyAttackBonus: typeof EffectEnemyAttackBonus = EffectEnemyAttackBonus;
  static EffectArcaneSpellFailure: typeof EffectArcaneSpellFailure = EffectArcaneSpellFailure;
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
  static EffectModifyNumAttacks: typeof EffectModifyNumAttacks = EffectModifyNumAttacks;
  static EffectCurse: typeof EffectCurse = EffectCurse;
  static EffectSilence: typeof EffectSilence = EffectSilence;
  static EffectInvisibility: typeof EffectInvisibility = EffectInvisibility;
  static EffectACIncrease: typeof EffectACIncrease = EffectACIncrease;
  static EffectACDecrease: typeof EffectACDecrease = EffectACDecrease;
  static EffectSpellImmunity: typeof EffectSpellImmunity = EffectSpellImmunity;
  /*static EffectDispellMagic: typeof EffectDispellMagic = EffectDispellMagic;
  static EffectDispellMagicBest: typeof EffectDispellMagicBest = EffectDispellMagicBest;
  static EffectLight: typeof EffectLight = EffectLight;*/
  static EffectSkillIncrease: typeof EffectSkillIncrease = EffectSkillIncrease;
  static EffectSkillDecrease: typeof EffectSkillDecrease = EffectSkillDecrease;
  static EffectHitPointChangeWhenDying: typeof EffectHitPointChangeWhenDying = EffectHitPointChangeWhenDying;
  // static EffectSetWalkAnimation: typeof EffectSetWalkAnimation = EffectSetWalkAnimation;
  static EffectLimitMovementSpeed: typeof EffectLimitMovementSpeed = EffectLimitMovementSpeed;
  static EffectForcePushed: typeof EffectForcePushed = EffectForcePushed;
  static EffectDamageShield: typeof EffectDamageShield = EffectDamageShield;
  static EffectDisguise: typeof EffectDisguise = EffectDisguise;
  static EffectSanctuary: typeof EffectSanctuary = EffectSanctuary;
  static EffectDispellMagic: typeof EffectDispelMagicAll = EffectDispelMagicAll;
  static EffectDispellMagicBest: typeof EffectDispelMagicBest = EffectDispelMagicBest;
  static EffectDispelMagicAll: typeof EffectDispelMagicAll = EffectDispelMagicAll;
  static EffectDispelMagicBest: typeof EffectDispelMagicBest = EffectDispelMagicBest;
  static EffectTimeStop: typeof EffectTimeStop = EffectTimeStop;
  static EffectSpellLevelAbsorption: typeof EffectSpellLevelAbsorption = EffectSpellLevelAbsorption;
  static EffectIcon: typeof EffectIcon = EffectIcon;
  static EffectRacialType: typeof EffectRacialType = EffectRacialType;
  static EffectSeeInvisible: typeof EffectSeeInvisible = EffectSeeInvisible;
  static EffectTrueSeeing: typeof EffectTrueSeeing = EffectTrueSeeing;
  static EffectBlindness: typeof EffectBlindness = EffectBlindness;
  static EffectDarkness: typeof EffectDarkness = EffectDarkness;
  static EffectUltraVision: typeof EffectUltraVision = EffectUltraVision;
  static EffectMissChance: typeof EffectMissChance = EffectMissChance;
  static EffectConcealment: typeof EffectConcealment = EffectConcealment;
  // static EffectAppear: typeof EffectAppear = EffectAppear;
  static EffectNegativeLevel: typeof EffectNegativeLevel = EffectNegativeLevel;
  static EffectBonusFeat: typeof EffectFeat = EffectFeat;
  // static EffectSummonParty: typeof EffectSummonParty = EffectSummonParty;
  static EffectForceDrain: typeof EffectForceDrain = EffectForceDrain;
  static EffectTemporaryForce: typeof EffectTemporaryForce = EffectTemporaryForce;
  static EffectBlasterDeflectionIncrease: typeof EffectBlasterDeflectionIncrease = EffectBlasterDeflectionIncrease;
  static EffectBlasterDeflectionDecrease: typeof EffectBlasterDeflectionDecrease = EffectBlasterDeflectionDecrease;
  static EffectDamageForcePoints: typeof EffectDamageForcePoints = EffectDamageForcePoints;
  static EffectHealForcePoints: typeof EffectHealForcePoints = EffectHealForcePoints;
  static EffectBodyFuel: typeof EffectBodyFuel = EffectBodyFuel;
  static EffectPsychicStatic: typeof EffectPsychicStatic = EffectPsychicStatic;
  static EffectLightSaberThrow: typeof EffectLightsaberThrow = EffectLightsaberThrow;
  static EffectAssuredHit: typeof EffectAssuredHit = EffectAssuredHit;
  static EffectForceJump: typeof EffectForceJump = EffectForceJump;
  static EffectAssuredDeflection: typeof EffectAssuredDeflection = EffectAssuredDeflection;
  static EffectForceResisted: typeof EffectForceResisted = EffectForceResisted;
  static EffectForceFizzle: typeof EffectForceFizzle = EffectForceFizzle;
  static EffectForceShield: typeof EffectForceShield = EffectForceShield;
  static EffectForceSight: typeof EffectForceSight = EffectForceSight;
  // static EffectPureGoodPowers: typeof EffectPureGoodPowers = EffectPureGoodPowers;
  // static EfffectPureEvilPowers: typeof EfffectPureEvilPowers = EfffectPureEvilPowers;
  
  static EffectFromStruct( struct: GFFStruct ): GameEffect {
    if(!struct){ return undefined as any; }

    let effect: GameEffect = undefined as any;

    let eType = struct.getFieldByLabel('Type').getValue();
    let eSubType = struct.getFieldByLabel('SubType').getValue();
    let eCreator = struct.getFieldByLabel('CreatorId').getValue();
    let eSpellId = struct.getFieldByLabel('SpellId').getValue();
    let eId = struct.hasField('Id') ? struct.getFieldByLabel('Id').getValue() : 0;
    let eIsExposed = struct.hasField('IsExposed') ? !!struct.getFieldByLabel('IsExposed').getValue() : true;
    
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
      case GameEffectType.EffectSummonCreature:
        effect = new EffectSummonCreature();
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
        effect = new EffectKnockdown();
      break;
      case GameEffectType.EffectHasteInternal:
        effect = new EffectHasteInternal();
      break;
      case GameEffectType.EffectSlowInternal:
        effect = new EffectSlowInternal();
      break;
      case GameEffectType.EffectDeaf: //Deaf
        effect = new EffectDeaf();
      break;
      case GameEffectType.EffectImmunity: //Immunity
        effect = new EffectImmunity();
      break;
      case GameEffectType.EffectEnemyAttackBonus: //EnemyAttackBonus

      break;
      case GameEffectType.EffectArcaneSpellFailure:
        effect = new EffectArcaneSpellFailure();
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
        effect = new EffectAreaOfEffect();
      break;
      case GameEffectType.EffectBeam: //Beam
        effect = new EffectBeam();
      break;
      case GameEffectType.EffectForceResistanceIncrease: //ForceResistanceIncrease
        effect = new EffectForceResistanceIncrease();
      break;
      case GameEffectType.EffectForceResistanceDecrease: //ForceResistanceDecrease
        effect = new EffectForceResistanceDecrease();
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
      case GameEffectType.EffectModifyNumAttacks:
        effect = new EffectModifyNumAttacks();
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
      case GameEffectType.EffectDispellMagic:
        effect = new EffectDispelMagicAll();
      break;
      case GameEffectType.EffectDispellMagicBest:
        effect = new EffectDispelMagicBest();
      break;
      case GameEffectType.EffectSkillIncrease: //SkillIncrease
        effect = new EffectSkillIncrease();
      break;
      case GameEffectType.EffectSkillDecrease: //SkillDecrease
        effect = new EffectSkillDecrease();
      break;
      case GameEffectType.EffectHitPointChangeWhenDying: //HitPointChangeWhenDying
        effect = new EffectHitPointChangeWhenDying();
      break;
      case GameEffectType.EffectLimitMovementSpeed: //LimitMovementSpeed
        effect = new EffectLimitMovementSpeed();
      break;
      case GameEffectType.EffectForcePushed: //ForcePushed

      break;
      case GameEffectType.EffectDamageShield: //DamageShield
        effect = new EffectDamageShield();
      break;
      case GameEffectType.EffectSanctuary:
        effect = new EffectSanctuary();
      break;
      case GameEffectType.EffectSeeInvisible:
        effect = new EffectSeeInvisible();
      break;
      case GameEffectType.EffectInvisibility:
        effect = new EffectInvisibility();
      break;
      case GameEffectType.EffectMissChance:
        effect = new EffectMissChance();
      break;
      case GameEffectType.EffectConcealment:
        effect = new EffectConcealment();
      break;
      case GameEffectType.EffectAssuredHit:
        effect = new EffectAssuredHit();
      break;
      case GameEffectType.EffectTemporaryForce:
        effect = new EffectTemporaryForce();
      break;
      case GameEffectType.EffectDisguise: //Disguise
        effect = new EffectDisguise();
      break;
      case GameEffectType.EffectSpellLevelAbsorption: //SpellLevelAbsorption
        effect = new EffectSpellLevelAbsorption();
      break;
      case GameEffectType.EffectIcon: //SetEffectIcon
        effect = new EffectIcon();
      break;
      case GameEffectType.EffectRacialType: //RacialType
        effect = new EffectRacialType();
      break;
      case GameEffectType.EffectNegativeLevel:
        effect = new EffectNegativeLevel();
      break;
      case GameEffectType.EffectBonusFeat: //BonusFeat
        effect = new EffectFeat();
      break;
      case GameEffectType.EffectForceDrain:
        effect = new EffectForceDrain();
      break;
      case GameEffectType.EffectBodyFuel:
        effect = new EffectBodyFuel();
      break;
      case GameEffectType.EffectPsychicStatic:
        effect = new EffectPsychicStatic();
      break;
      case GameEffectType.EffectLightSaberThrow:
        effect = new EffectLightsaberThrow();
      break;
      case GameEffectType.EffectSilence:
        effect = new EffectSilence();
      break;
      case GameEffectType.EffectCurse:
        effect = new EffectCurse();
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
      case GameEffectType.EffectForceSight:
        effect = new EffectForceSight();
      break;
      case GameEffectType.EffectSetState: //EffectSetState
        effect = new EffectSetState();
      break;
      case GameEffectType.EffectSetStateInternal:
        effect = new EffectSetStateInternal();
      break;
      case GameEffectType.EffectTrueseeing: //TrueSeeing
        effect = new EffectTrueSeeing();
      break;
      case GameEffectType.EffectBlindness:
        effect = new EffectBlindness();
      break;
      case GameEffectType.EffectDarkness:
        effect = new EffectDarkness();
      break;
      case GameEffectType.EffectUltraVision:
        effect = new EffectUltraVision();
      break;
      case GameEffectType.EffectTimeStop:
        effect = new EffectTimeStop();
      break;
      case GameEffectType.EffectSeeInvisible:
        effect = new EffectSeeInvisible();
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
        effect.setId(typeof eId === 'bigint' ? Number(eId) : (eId || 0));
        effect.setIsExposed(eIsExposed);

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