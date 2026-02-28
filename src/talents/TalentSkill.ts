import { ActionUnlockObject } from "@/actions/ActionUnlockObject";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";
import type { ITwoDARowData } from "@/resource/TwoDAObject";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { TalentObject } from "@/talents/TalentObject";

interface SkillClass {
  class: string;
  isClassSkill: boolean;
  recommendedLevel: number;
}

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

  label: string;
  name: number;
  description: number;
  icon: string;
  untrained: boolean;
  keyAbility: string;
  armorCheckPenalty: boolean;
  allClassesCanUse: boolean;
  constant: string;
  hostileSkill: boolean;
  droidCanUse: boolean;
  npcCanUse: boolean;

  classData: Map<string, SkillClass> = new Map();

  constructor( id = 0, rank = 0 ){
    super( id );
    this.objectType = TalentObjectType.TalentObject | TalentObjectType.TalentSkill;
    this.rank = rank;
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

  getName(){
    return this.name != -1 ? GameState.TLKManager.GetStringById(this.name).Value : this.label;
  }

  getDescription(){
    return this.description != -1 ? GameState.TLKManager.GetStringById(this.description).Value : '';
  }

  isUntrained(){
    return this.untrained || false;
  }

  getKeyAbility(){
    return this.keyAbility || '';
  }

  hasArmorCheckPenalty(){
    return this.armorCheckPenalty || false;
  }

  canAllClassesUse(){
    return this.allClassesCanUse || false;
  }

  getCategory(){
    return this.category || 0;
  }

  getMaxCR(){
    return this.maxCR || 0;
  }

  getConstant(){
    return this.constant || '';
  }

  isHostileSkill(){
    return this.hostileSkill || false;
  }

  save(){
    const skillStruct = new GFFStruct();
    skillStruct.addField( new GFFField(GFFDataType.BYTE, 'Rank') ).setValue(this.getRank());
    return skillStruct;
  }

  clone(){
    const skill = new TalentSkill(this.id, this.rank);
    skill.id = this.id;
    skill.label = this.label;
    skill.name = this.name;
    skill.description = this.description;
    skill.icon = this.icon;
    skill.untrained = this.untrained;
    skill.keyAbility = this.keyAbility;
    skill.armorCheckPenalty = this.armorCheckPenalty;
    skill.allClassesCanUse = this.allClassesCanUse;
    skill.category = this.category;
    skill.maxCR = this.maxCR;
    skill.constant = this.constant;
    skill.hostileSkill = this.hostileSkill;
    skill.droidCanUse = this.droidCanUse;
    skill.npcCanUse = this.npcCanUse;
    skill.classData = new Map(this.classData);
    return skill;
  }

  static From2DA(row: any = {}){
    const skill = new TalentSkill();
    skill.id = TwoDAObject.normalizeValue(row.__index, 'number', -1);
    skill.label = TwoDAObject.normalizeValue(row.label, 'string', '');
    skill.name = TwoDAObject.normalizeValue(row.name, 'number', -1);
    skill.description = TwoDAObject.normalizeValue(row.description, 'number', -1);
    skill.icon = TwoDAObject.normalizeValue(row.icon, 'string', '');
    skill.untrained = TwoDAObject.normalizeValue(row.untrained, 'boolean', false);
    skill.keyAbility = TwoDAObject.normalizeValue(row.keyability, 'string', '');
    skill.armorCheckPenalty = TwoDAObject.normalizeValue(row.armorcheckpenalty, 'boolean', false);
    skill.allClassesCanUse = TwoDAObject.normalizeValue(row.allclassescanuse, 'boolean', false);
    skill.category = TwoDAObject.normalizeValue(row.category, 'number', 0);
    skill.maxCR = TwoDAObject.normalizeValue(row.maxcr, 'number', 0);
    skill.constant = TwoDAObject.normalizeValue(row.constant, 'string', '');
    skill.hostileSkill = TwoDAObject.normalizeValue(row.hostileskill, 'boolean', false);
    skill.droidCanUse = TwoDAObject.normalizeValue(row.droidcanuse, 'boolean', false);
    skill.npcCanUse = TwoDAObject.normalizeValue(row.npccanuse, 'boolean', false);

    const classData = GameState.TwoDAManager.datatables.get('classes');
    if(classData){
      for(let i = 0; i < classData.RowCount; i++){
        const classRow = classData.rows[i];

        const classCode = TwoDAObject.normalizeValue(classRow.skillstable, 'string', '');
        if(classCode === '')
          continue;

        const classCodeLower = classCode.toLowerCase();

        const isClassSkill = TwoDAObject.normalizeValue(`${classCodeLower}_class`, 'boolean', false);
        const recommendedLevel = TwoDAObject.normalizeValue(`${classCodeLower}_reco`, 'number', 0);

        const skillClass: SkillClass = {
          class: classCode,
          isClassSkill: isClassSkill,
          recommendedLevel: recommendedLevel,
        };
        
        skill.classData.set(classCode, skillClass);
      }
    }

    return skill;
  }

}
