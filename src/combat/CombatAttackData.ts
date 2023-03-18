import { CombatAttackDamage } from "./";
import { ModuleObject } from "../module";
import { CExoLocString } from "../resource/CExoLocString";

export class CombatAttackData {
  attackGroup: number = 0;
  animationLength: number = 0;
  missedBy: number = 0;
  attackResult: number = 0;
  reactObject: ModuleObject;
  reaxnDelay: number = 0;
  reaxnAnimation: number = 0;
  reaxnAnimLength: number = 0;
  concealment: number = 0;
  attackType: number = 0;
  attackMode: number = 0;
  rangedAttack: number = 0;
  sneakAttack: number = 0;
  weaponAttackType: number = 0;
  rangedTargetX: number = 0;
  rangedTargetY: number = 0;
  rangedTargetZ: number = 0;
  damageList: CombatAttackDamage[] = [];
  killingBlow: number = 0;
  coupDeGrace: number = 0;
  criticalThreat: number = 0;
  attackDeflected: number = 0;
  ammoItem: ModuleObject;
  attackDebugText: CExoLocString;
  DamageDebugText: CExoLocString;
}