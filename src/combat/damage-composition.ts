import type { ModuleCreature, ModuleItem } from "@/module";
import { CombatMode } from "@/enums/combat/CombatMode";
import { ModuleItemProperty } from "@/enums/module/ModuleItemProperty";
import { resolveDamageBonusCode } from "@/combat/damage-bonus";

/**
 * Retail GetDamageBonus / GetDamageRoll damage-composition helpers
 * (combat-mode Power Attack + Massive Criticals).
 *
 * @file damage-composition.ts
 * @see GetDamageBonus, GetDamageRoll Massive Criticals 
 */

/**
 * Retail GetDamageBonus combat-mode branch — modes 2/3.
 */
export function getCombatModeDamageBonus(creature: ModuleCreature): number {
  if(creature.combatMode === CombatMode.MODE_2) return 5;
  if(creature.combatMode === CombatMode.MODE_3) return 10;
  return 0;
}

/**
 * Retail Massive Criticals item property (0x31) via iprp_damagecost — once per crit.
 */
export function getMassiveCriticalBonus(weapon: ModuleItem | undefined): number {
  if(!weapon?.properties) return 0;
  for(let i = 0; i < weapon.properties.length; i++){
    const property = weapon.properties[i];
    if(!property?.isUseable?.() || !property.is?.(ModuleItemProperty.Massive_Criticals)){
      continue;
    }
    // Retail: cost_value indexes iprp_damagecost (same table as DAMAGE_BONUS_*)
    return resolveDamageBonusCode(property.costValue | 0);
  }
  return 0;
}
