import { CombatAttackDamage } from "./";
import { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFStruct } from "../resource/GFFStruct";
import { DamageType } from "../enums/combat/DamageType";
import { EffectDamage } from "../effects";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { AttackResult } from "../enums/combat/AttackResult";
import { TalentFeat } from "../talents";
import { CombatFeatType } from "../enums/combat/CombatFeatType";

export class CombatAttackData {
  attackGroup: number = 0;
  animationLength: number = 1500;
  missedBy: ModuleObject;
  attackResult: AttackResult = AttackResult.MISS;
  reactObject: ModuleObject;
  reaxnDelay: number = 0;
  reaxnAnimation: number = 10001;
  reaxnAnimLength: number = 0;
  concealment: boolean = false;
  attackType: boolean = false;
  attackMode: number = 0;
  rangedAttack: boolean = false;
  sneakAttack: boolean = false;
  weaponAttackType: number = 0;
  rangedTargetX: number = 0;
  rangedTargetY: number = 0;
  rangedTargetZ: number = 0;
  damageList: CombatAttackDamage[] = new Array(15);
  killingBlow: number = 0;
  coupDeGrace: boolean = false;
  criticalThreat: number = 0;
  attackDeflected: number = 0;
  ammoItem: ModuleObject;
  attackDebugText: CExoLocString;
  DamageDebugText: CExoLocString;

  attackWeapon: ModuleItem;

  constructor(){
    this.damageList = new Array(15);
    for(let i = 0; i < 15; i++){
      this.damageList[i] = new CombatAttackDamage();
    }
  }

  calculateDamage(creature: ModuleCreature, isCritial: boolean = false, feat?: TalentFeat){
    if(!this.attackWeapon) return;

    let damageMultiplier = isCritial ? this.attackWeapon._baseItem.criticalHitMultiplier : 1.0;

    if(!creature.isSimpleCreature()){
      this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getBaseDamage() * damageMultiplier);
      if(this.attackWeapon.hasDamageBonus()){
        this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus() * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.POWER_BLAST)
       ){
        this.damageList[DamageType.BASE].addDamage(5 * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.IMPROVED_POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.IMPROVED_POWER_BLAST)
      ){
        this.damageList[DamageType.BASE].addDamage(8 * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.MASTER_POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.MASTER_POWER_BLAST) 
      ){
        this.damageList[DamageType.BASE].addDamage(10 * damageMultiplier);
      }

    }else{
      this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getMonsterDamage() * damageMultiplier);
      if(this.attackWeapon.hasDamageBonus()){
        this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus() * damageMultiplier);
      }
    }

    //Add strength MOD to melee damage
    if(this.attackWeapon.getWeaponType() == 1){
      this.damageList[DamageType.PHYSICAL].addDamage( Math.floor(( creature.getSTR() - 10) / 2) );
    }
  }

  applyDamageEffectToCreature(owner: ModuleCreature, target: ModuleCreature){
    if(!target) return;
    const damageEffect = new EffectDamage();
    damageEffect.setCreator(owner);

    for(let i = 0; i < 15; i++){
      const damage = this.damageList[i];
      damageEffect.setInt(i, damage.damageValue);
    }

    target.addEffect(damageEffect, GameEffectDurationType.INSTANT);
  }

  reset(){
    this.attackWeapon = undefined;
    for(let i = 0; i < this.damageList.length; i++){
      this.damageList[i].reset();
    }
  }

  toStruct(structIdx: number = -1){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

}