import { EffectACDecrease, EffectAttackDecrease } from "../effects";
import { ModuleObjectType, TalentObjectType } from "../enums";
import { GameEffectDurationType } from "../enums/effects";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager } from "../managers/TwoDAManager";
import type { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { BitWise } from "../utility/BitWise";
import { TalentObject } from "./TalentObject";

/**
 * TalentFeat class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TalentFeat.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TalentFeat extends TalentObject {
  label: string;
  name: string; //TLK
  description: string; //TLK
  icon: string;
  mincharlevel: number;
  minattackbonus: number;
  minstr: number;
  mindex: number;
  minint: number;
  minwis: number;
  minspelllvl: number;
  prereqfeat1: number;
  prereqfeat2: number;
  
  gainmultiple: number;
  effectstack: number;
  allclassescanuse: number;
  maxcr: number;
  spellid: number;
  successor: number;
  crvalue: number;
  usesperday: number;
  masterfeat: number;
  targetself: number;
  onreqfeat0: number;
  onreqfeat1: number;
  onreqfeat2: number;
  onreqfeat3: number;
  onreqfeat4: number;
  reqskill: number;
  constant: string;
  toolcategories: number;
  hostilefeat: number;
  scd_list: number;
  scd_granted: number;
  scd_recom: number;
  sol_list: number;
  sol_granted: number;
  sol_recom: number;
  sct_list: number;
  sct_granted: number;
  sct_recom: number;
  jcn_list: number;
  jcn_granted: number;
  jcn_recom: number;
  jgd_list: number;
  jgd_granted: number;
  jgd_recom: number;
  jsn_list: number;
  jsn_granted: number;
  jsn_recom: number;
  drx_list: number;
  drx_granted: number;
  drx_recom: number;
  drc_list: number;
  drc_granted: number;
  drc_recom: number;
  exclusion: number;
  usetype: number;
  pips: number;

  constructor( id = 0){
    super(id);
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentFeat;

    //Merge the feat properties from the feat.2da row with this feat
    if(TwoDAManager.datatables.get('feat').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('feat').rows[this.id]);
    }

  }

  setId( value = 0 ){
    this.id = value;
    //Merge the feat properties from the feat.2da row with this feat
    if(TwoDAManager.datatables.get('feat').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('feat').rows[this.id]);
    }
  }

  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    super.useTalentOnObject(oTarget, oCaster);

    //MELEE
    if(this.category == 0x1104){
      oCaster.attackCreature(oTarget, this);
      return;
      // oCaster.actionQueue.add({
      //   type: ActionType.ActionPhysicalAttacks,
      //   object: oTarget,
      //   feat: this.id
      // });
      // oCaster.combatData.lastCombatFeatUsed = this;
    }

    //RANGED
    if(this.category == 0x1111){
      oCaster.attackCreature(oTarget, this);
      return;
      // oCaster.actionQueue.add({
      //   type: ActionType.ActionPhysicalAttacks,
      //   object: oTarget,
      //   feat: this.id
      // });
      // oCaster.combatData.lastCombatFeatUsed = this;
    }

  }

  inRange(oTarget: ModuleObject, oCaster: ModuleObject){
    if(oTarget == oCaster){
      return true;
    }
    let distance = oCaster.position.distanceTo(oTarget.position);
    let rangeTolerance = 0.25;

    //MELEE
    if(this.category == 0x1104){
      return distance <= 2.0 + rangeTolerance;
    }

    //RANGED
    if(this.category == 0x1111){
      return distance <= 15.0 + rangeTolerance;
    }

    return true;
  }

  getCastRange(){
    //MELEE
    if(this.category == 0x1104){
      return 2.0;
    }

    //RANGED
    if(this.category == 0x1111){
      return 15;
    }

    return 1;
  }
  
  impactCaster(object: ModuleObject){
    if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)) return;

    let armorClassPenalty = 0;
    let armorClassPenaltyDuration = 3000;
    let attackPenalty = 0;
    let attackPenatlyDuration = 3000;

    switch(this.id){
      case 11: //FLURRY
      case 30: //RAPID SHOT
        armorClassPenalty = 4;
        attackPenalty = 4;
      break;
      case 91: //IMPROVED FLURRY
      case 92: //IMPROVED RAPID SHOT
        armorClassPenalty = 2;
        attackPenalty = 2;
      break;
      case 51: //MASTER FLURRY
      case 21: //MASTER RAPID SHOT
        armorClassPenalty = 1;
        attackPenalty = 1;
      break;
      case 28: //CRITICAL STRIKE
      case 19: //IMPROVED CRITICAL STRIKE
      case 81: //MASTER CRITICAL STRIKE
        armorClassPenalty = 5;
      break;
      case 8: //POWER ATTACK
        attackPenalty = 3;
      break;
      case 17: //IMPROVED POWER ATTACK
        attackPenalty = 3;
      break;
      case 83: //MASTER POWER ATTACK
        attackPenalty = 3;
      break;
      case 29: //POWER BLAST
        attackPenalty = 3;
      break;
      case 18: //IMPROVED POWER BLAST
        attackPenalty = 3;
      break;
      case 82: //MASTER POWER BLAST
        attackPenalty = 3;
      break;
    }

    if(armorClassPenalty > 0){
      const acDecreaseEffect = new EffectACDecrease();
      acDecreaseEffect.setDurationType(GameEffectDurationType.TEMPORARY);
      acDecreaseEffect.setDuration(armorClassPenaltyDuration);
      acDecreaseEffect.setInt(1, armorClassPenalty);
      object.addEffect(acDecreaseEffect);
    }

    if(attackPenalty > 0){
      const attackDecreaseEffect = new EffectAttackDecrease();
      attackDecreaseEffect.setDurationType(GameEffectDurationType.TEMPORARY);
      attackDecreaseEffect.setDuration(attackPenatlyDuration);
      attackDecreaseEffect.setInt(0, attackPenalty);
      object.addEffect(attackDecreaseEffect);
    }

  }

  impactTarget(object: ModuleObject){
    // if(!(object instanceof ModuleCreature)) return;

  }

  static From2DA( object: any ){
    if(typeof object == 'object'){
      let feat = new TalentFeat();
      Object.assign(feat, TwoDAManager.datatables.get('feat').rows[object.__index]);
      feat.id = object.__index;
      return feat;
    }
    return;
  }

  save(){
    let featStruct = new GFFStruct(1);
    featStruct.addField( new GFFField(GFFDataType.WORD, 'Feat') ).setValue(this.getId());
    return featStruct;
  }

}
