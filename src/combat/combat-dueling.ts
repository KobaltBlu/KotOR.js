import { WeaponWield } from "@/enums/combat/WeaponWield";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * Retail melee duel / choreography helpers —
 * ResolveChoreographedState @ 004d2b70,
 * ResolveEngagedState @ 004d2c30,
 * ResolveMasterState @ 004d2d60.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file combat-dueling.ts
 */

function asCreature(obj: ModuleObject | undefined): ModuleCreature | undefined {
  if(!obj || !BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
    return undefined;
  }
  return obj as ModuleCreature;
}

/**
 * Retail MainHand weapon eligible for choreographed melee:
 * present, not ranged, not stun baton, not wield 8 (unused in K1 baseitems).
 */
export function isChoreographedMeleeWeapon(creature: ModuleCreature | undefined): boolean {
  if(!creature) return false;
  const weapon = creature.equipment?.RIGHTHAND;
  if(!weapon) return false;
  if(weapon.isRangedWeapon?.()) return false;
  const wield = weapon.getWeaponWield?.() ?? WeaponWield.INVALID;
  if(wield === WeaponWield.STUN_BATON) return false;
  if(wield === 8) return false;
  return true;
}

/**
 * Retail ResolveChoreographedState @ 004d2b70 —
 * both combatants have choreographed melee weapons.
 * Used for Desired/MaxAttackRange and ATTACK_DUELING anim preview.
 */
export function resolveChoreographedState(
  attacker: ModuleCreature,
  target: ModuleObject
): boolean {
  if(!isChoreographedMeleeWeapon(attacker)) return false;
  const targetCreature = asCreature(target);
  if(!targetCreature) return false;
  return isChoreographedMeleeWeapon(targetCreature);
}

/**
 * Retail appearance MODELTYPE S/L check (CSWSCreature::IsCreature @ 005b47c0).
 * Used when selecting ATTACK_DUELING while already engaged.
 */
export function isRetailDuelCreature(creature: ModuleCreature | undefined): boolean {
  if(!creature) return false;
  const mt = String(creature.getAppearance?.()?.modeltype ?? creature.creatureAppearance?.modeltype ?? '');
  const c = mt.charAt(0);
  return c === 'S' || c === 'L' || c === 's' || c === 'l';
}

/**
 * Retail ResolveEngagedState @ 004d2c30 —
 * whether this attack should sync as an engaged duel round with target.
 */
export function resolveEngagedState(
  attacker: ModuleCreature,
  target: ModuleObject
): boolean {
  const targetCreature = asCreature(target);
  if(!targetCreature) return false;
  if(typeof targetCreature.isDebilitated === 'function' && targetCreature.isDebilitated()){
    return false;
  }

  const targetRound = targetCreature.combatRound;
  const targetLastAttack = targetCreature.combatData?.lastAttackTarget;
  const targetLastSpell = targetCreature.combatData?.lastSpellTarget;
  const targetAttempted = targetCreature.combatData?.lastAttemptedAttackTarget;
  const noAttackTarget = !targetLastAttack;
  const roundStarted = !!targetRound?.roundStarted;

  let engaged = false;
  if(!roundStarted && noAttackTarget){
    engaged = true;
  }
  if(targetLastAttack === attacker || targetLastSpell === attacker){
    engaged = true;
  }
  if(roundStarted && noAttackTarget){
    engaged = true;
  }

  // Party leader as target — retail GetCharacter(0) special case
  const partyLeader = GameState.PartyManager?.party?.[0];
  if(partyLeader && targetCreature === partyLeader){
    if(noAttackTarget){
      if(!targetLastSpell){
        engaged = false;
      }
    }else if(targetLastAttack !== attacker){
      engaged = false;
    }else if(
      (targetLastSpell && targetLastSpell !== attacker) ||
      (targetAttempted && targetAttempted !== attacker)
    ){
      // retail LAB_004d2d0d: both spell + attempted must be us or empty to keep
      if(
        (targetLastSpell && targetLastSpell !== attacker) &&
        (targetAttempted && targetAttempted !== attacker)
      ){
        engaged = false;
      }
    }
  }

  return engaged;
}

/**
 * Retail ResolveMasterState @ 004d2d60 —
 * who drives the engaged duel (party members always master).
 */
export function resolveMasterState(
  attacker: ModuleCreature,
  target: ModuleObject,
  engaged: boolean
): boolean {
  if(!engaged) return false;

  const targetCreature = asCreature(target);
  if(!targetCreature) return false;

  // Retail field426_0xa88 — party / player-UI creatures always master
  if(GameState.PartyManager?.party?.indexOf(attacker) >= 0){
    return true;
  }

  const targetLastAttack = targetCreature.combatData?.lastAttackTarget;
  let master = !targetLastAttack;
  if(targetLastAttack === attacker && !targetCreature.combatRound?.master){
    master = true;
  }
  return master;
}

export type DuelRoundFlags = {
  choreographed: boolean;
  engaged: boolean;
  master: boolean;
  useDuelingAnim: boolean;
};

/**
 * Resolve all duel flags for one PhysicalAttacks tick (retail order).
 */
export function resolveDuelRoundFlags(
  attacker: ModuleCreature,
  target: ModuleObject
): DuelRoundFlags {
  const choreographed = resolveChoreographedState(attacker, target);
  const engaged = resolveEngagedState(attacker, target);
  const master = resolveMasterState(attacker, target, engaged);

  let useDuelingAnim = choreographed;
  if(!engaged){
    useDuelingAnim = false;
  }else if(
    isRetailDuelCreature(attacker) ||
    isRetailDuelCreature(asCreature(target))
  ){
    useDuelingAnim = true;
  }else if(choreographed){
    useDuelingAnim = true;
  }

  return { choreographed, engaged, master, useDuelingAnim };
}
