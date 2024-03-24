import { GameState } from "../GameState";
import { ActionUnlockObject } from "../actions/ActionUnlockObject";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { TalentObjectType } from "../enums/engine/TalentObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { TwoDAManager } from "../managers";
import type { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";
import { TalentObject } from "./TalentObject";

/**
 * TalentSkill class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TalentSkill.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TalentSkill extends TalentObject {
  rank: number;
  name: string;
  description: string;
  icon: string;
  untrained: string;
  keyability: string;
  armorcheckpenalty: string;
  allclassescanuse: string;
  // category: string;
  maxcr: string;
  constant: string;
  hostileskill: string;

  /* class props */

  droidcanuse: string;
  npccanuse: string;

  constructor( id = 0, rank = 0 ){
    super( id );
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentSkill;
    this.rank = rank;

    //Merge the skill properties from the skills.2da row with this skill
    if(GameState.TwoDAManager.datatables.get('skills').rows[this.id]){
      Object.assign(this, GameState.TwoDAManager.datatables.get('skills').rows[this.id]);
    }
  }
  useTalentOnObject(oTarget: ModuleObject, oCaster: ModuleObject){
    this.oCaster = oCaster;
    this.oTarget = oTarget;
    if(this.id == 6){ //Security
      const action = new ActionUnlockObject();
      action.setParameter(0, ActionParameterType.DWORD, this.oTarget.id || ModuleObjectConstant.OBJECT_INVALID);
      this.oCaster.actionQueue.add(action);
    }
  }

  setId( value = 0 ){
    this.id = value;
    if(GameState.TwoDAManager.datatables.get('skills').rows[this.id]){
      Object.assign(this, GameState.TwoDAManager.datatables.get('skills').rows[this.id]);
    }
  }

  getRank(){
    return this.rank;
  }

  setRank( value = 0){
    this.rank = value;
  }

  getIcon(){
    return this.icon;
  }

  getNameStrRef(){
    return parseInt(this.name);
  }

  getDescription(){
    return this.description;
  }

  save(){
    let skillStruct = new GFFStruct();
    skillStruct.addField( new GFFField(GFFDataType.BYTE, 'Rank') ).setValue(this.getRank());
    return skillStruct;
  }

}
