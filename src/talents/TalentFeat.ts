import { ActionType } from "../enums/actions/ActionType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager } from "../managers/TwoDAManager";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";

export class TalentFeat extends TalentObject {
  category: number;

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
    featStruct.AddField( new GFFField(GFFDataType.WORD, 'Feat') ).SetValue(this.getId());
    return featStruct;
  }

}
