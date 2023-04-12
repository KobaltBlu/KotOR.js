import { CombatAttackDamage } from "./";
import { ModuleObject } from "../module";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFStruct } from "../resource/GFFStruct";

export class CombatAttackData {
  attackGroup: number = 0;
  animationLength: number = 1500;
  missedBy: ModuleObject;
  attackResult: number = 0;
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

  constructor(){
    this.damageList = new Array(15);
    for(let i = 0; i < 15; i++){
      this.damageList[i] = new CombatAttackDamage();
    }
  }

  reset(){
    for(let i = 0; i < this.damageList.length; i++){
      this.damageList[i].reset();
    }
  }

  toStruct(structIdx: number = -1){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

}