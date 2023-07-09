import { ActionType } from "../enums/actions/ActionType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager } from "../managers";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";

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
    this.type = 1;

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
