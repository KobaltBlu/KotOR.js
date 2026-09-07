import { WeaponWield } from "@/enums/combat/WeaponWield";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";

/**
 * melee duel / choreography helpers —
 * ResolveChoreographedState,
 * ResolveEngagedState,
 * ResolveMasterState.
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
 * MainHand weapon eligible for choreographed melee:
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
 * ResolveChoreographedState
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
 * appearance MODELTYPE S/L check (IsCreature).
 * Used when selecting ATTACK_DUELING while already engaged.
 */
export function isOdysseyDuelCreature(creature: ModuleCreature | undefined): boolean {
  if(!creature) return false;
  const mt = String(creature.getAppearance?.()?.modeltype ?? creature.creatureAppearance?.modeltype ?? '');
  const c = mt.charAt(0);
  return c === 'S' || c === 'L' || c === 's' || c === 'l';
}

/**
 * ResolveEngagedState
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

  // Party leader as target — GetCharacter(0) special case
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
      // Keep engaged only when both last-spell and attempted targets are us or empty
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
 * ResolveMasterState
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

  // Party / player-UI creatures are always duel masters
  if(GameState.PartyManager?.party?.indexOf(attacker) >= 0){
    return true;
  }

  // Mutual-master guard: if the target is already driving this exact pair as
  // master, yield so only one fighter drives the duel. Prevents both rounds
  // infinitePausing each other (wait-for-each-other deadlock).
  const targetRound = targetCreature.combatRound;
  if(targetRound?.engaged && targetRound?.master && targetRound?.duelPartner === attacker){
    return false;
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
 * Resolve all duel flags for one PhysicalAttacks tick (order).
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
    isOdysseyDuelCreature(attacker) ||
    isOdysseyDuelCreature(asCreature(target))
  ){
    useDuelingAnim = true;
  }else if(choreographed){
    useDuelingAnim = true;
  }

  return { choreographed, engaged, master, useDuelingAnim };
}
