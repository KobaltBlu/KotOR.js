import { ActionUnlockObject } from "../actions";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { TwoDAManager } from "../managers";
import { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";

export class TalentSkill extends TalentObject {
  rank: number;
  constructor( id = 0, rank = 0 ){
    super( id );
    this.type = 2;
    this.rank = rank;

    //Merge the skill properties from the skills.2da row with this skill
    if(TwoDAManager.datatables.get('skills').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('skills').rows[this.id]);
    }
  }
  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    this.oCaster = oCaster;
    this.oTarget = oTarget;
    if(this.id == 6){ //Security
      const action = new ActionUnlockObject();
      action.setParameter(0, ActionParameterType.DWORD, this.oTarget.id || ModuleObject.OBJECT_INVALID);
      this.oCaster.actionQueue.add(action);
    }
  }

  setId( value = 0 ){
    this.id = value;
    if(TwoDAManager.datatables.get('skills').rows[this.id]){
      Object.assign(this, TwoDAManager.datatables.get('skills').rows[this.id]);
    }
  }

  getRank(){
    return this.rank;
  }

  setRank( value = 0){
    this.rank = value;
  }

  save(){
    let skillStruct = new GFFStruct();
    skillStruct.AddField( new GFFField(GFFDataType.BYTE, 'Rank') ).SetValue(this.getRank());
    return skillStruct;
  }

}
