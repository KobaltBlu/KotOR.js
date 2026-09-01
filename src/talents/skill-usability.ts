export interface SkillUsabilityClass {
  skillstable: string;
}

export interface SkillUsabilityTalent {
  rank: number;
  isUntrained(): boolean;
  canAllClassesUse(): boolean;
  classData: Map<string, { isClassSkill: boolean }>;
}

/**
 * Retail GetCanUseSkill.
 * Trained-only skills require a positive signed-byte rank. Skills usable
 * untrained require either their all-classes flag or a matching class table.
 */
export function getCanUseSkill(
  skills: SkillUsabilityTalent[],
  classes: SkillUsabilityClass[],
  value: number
): boolean {
  // Retail aliases the mine subskills 100–102 to Demolitions.
  const skillId = value === 100 || value === 101 || value === 102
    ? 1
    : value;
  const skill = skills[skillId];
  if(!skill) return false;
  if(!skill.isUntrained()){
    // Retail stores ranks as signed bytes; 0xff is -1, not 255 ranks.
    return ((skill.rank << 24) >> 24) > 0;
  }
  if(skill.canAllClassesUse()){
    return true;
  }
  for(let i = 0; i < classes.length; i++){
    const classSkill = skill.classData.get(classes[i].skillstable);
    if(classSkill?.isClassSkill){
      return true;
    }
  }
  return false;
}
