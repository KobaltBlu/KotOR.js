import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { isCreatureBlind } from "@/effects/EffectBlindness";
import { getAbilityModifier } from "@/engine/rules/skill-points";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { TalentSkill } from "@/talents/TalentSkill";

/**
 * Retail CSWSCreatureStats::GetSkillRank @ 005aa570.
 * raw=true returns the signed base rank only; raw=false applies ability mods,
 * armor check, blindness, skill feats, and skill increase/decrease effects.
 */
export function getSkillRankRetail(
  creature: ModuleCreature,
  skillId: number,
  raw: boolean = false
): number {
  const skills = creature.skills;
  if(!skills || skillId < 0 || skillId >= skills.length){
    return 0;
  }

  const skill = skills[skillId] as TalentSkill;
  let rank = ((skill.rank << 24) >> 24);

  if(raw){
    return clampSkillRank(rank);
  }

  // Trained-only skills with no ranks contribute nothing.
  if(!skill.isUntrained?.() && rank === 0){
    return 0;
  }

  // Effect skill increase / decrease
  if(creature.effects?.length){
    for(let i = 0; i < creature.effects.length; i++){
      const e = creature.effects[i];
      if(e?.type === GameEffectType.EffectSkillIncrease && e.getInt(0) === skillId){
        rank += e.getInt(1) || 0;
      }else if(e?.type === GameEffectType.EffectSkillDecrease){
        const id = e.getInt(0);
        if(id === skillId || id === 0xff){
          rank -= e.getInt(1) || 0;
        }
      }
    }
  }

  const keyRaw = skill.getKeyAbility?.() || skill.keyAbility || '';
  const keyNum = parseInt(String(keyRaw), 10);
  const key = Number.isNaN(keyNum) ? String(keyRaw).toLowerCase() : keyNum;

  switch(key){
    case 0:
    case 'str':
      rank += getAbilityModifier(creature.getSTR());
      if(isCreatureBlind(creature)) rank -= 4;
      break;
    case 1:
    case 'dex': {
      const dexMod = getAbilityModifier(creature.getDEX());
      if(creature.isDebilitated?.()){
        rank += dexMod < 0 ? dexMod : 0;
      }else{
        rank += dexMod;
      }
      if(isCreatureBlind(creature)) rank -= 4;
      break;
    }
    case 2:
    case 'con':
      rank += getAbilityModifier(creature.getCON());
      break;
    case 3:
    case 'int':
      rank += getAbilityModifier(creature.getINT());
      break;
    case 4:
    case 'wis':
      rank += getAbilityModifier(creature.getWIS());
      break;
    case 5:
    case 'cha':
      rank += getAbilityModifier(creature.getCHA());
      break;
    default:
      break;
  }

  if(skill.hasArmorCheckPenalty?.() || skill.armorCheckPenalty){
    rank += (creature.combatInformation?.armorCheckPen | 0);
  }

  rank += getSkillFeatBonus(creature, skillId);

  return clampSkillRank(rank);
}

function clampSkillRank(rank: number): number {
  if(rank > 0x7e) return 0x7f;
  if(rank < -0x7e) return -0x7f;
  return rank | 0;
}

/** Retail GetSkillRank feat chains (Gear Head / Caution / Empathy). */
function getSkillFeatBonus(creature: ModuleCreature, skillId: number): number {
  const has = (id: number) => !!(creature.getHasFeat?.(id));

  switch(skillId){
    case SkillType.COMPUTER_USE:
      if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
      if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
      if(has(CombatFeatType.GEAR_HEAD)) return 1;
      return 0;
    case SkillType.DEMOLITIONS:
    case SkillType.STEALTH:
      if(has(CombatFeatType.MASTER_CAUTION)) return 3;
      if(has(CombatFeatType.IMPROVED_CAUTION)) return 2;
      if(has(CombatFeatType.CAUTIOUS)) return 1;
      return 0;
    case SkillType.AWARENESS:
    case SkillType.PERSUADE:
    case SkillType.TREAT_INJURY:
      if(has(CombatFeatType.MASTER__EMPATHY)) return 3;
      if(has(CombatFeatType.IMPROVED_EMPATHY)) return 2;
      if(has(CombatFeatType.EMPATHY)) return 1;
      return 0;
    case SkillType.REPAIR:
    case SkillType.SECURITY:
      if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
      if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
      if(has(CombatFeatType.GEAR_HEAD)) return 1;
      return 0;
    default:
      return 0;
  }
}
