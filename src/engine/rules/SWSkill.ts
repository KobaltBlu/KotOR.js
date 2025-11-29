import { TLKManager } from "../../managers/TLKManager";
import { TwoDAObject } from "../../resource/TwoDAObject";
import { GameState } from "../../GameState";

interface SkillClass {
  class: string;
  isClassSkill: boolean;
  recommendedLevel: number;
}

export class SWSkill {
  id: number;
  label: string;
  name: number;
  description: number;
  icon: string;
  untrained: boolean;
  keyAbility: string;
  armorCheckPenalty: boolean;
  allClassesCanUse: boolean;
  category: number;
  maxCR: number;
  constant: string;
  hostileSkill: boolean;
  droidCanUse: boolean;
  npcCanUse: boolean;

  classData: Map<string, SkillClass> = new Map();

  getName(){
    return this.name != -1 ? TLKManager.GetStringById(this.name).Value : this.label;
  }

  getDescription(){
    return this.description != -1 ? TLKManager.GetStringById(this.description).Value : '';
  }

  static From2DA(row: any = {}){
    const skill = new SWSkill();
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