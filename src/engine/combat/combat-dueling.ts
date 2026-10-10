import { WeaponWield } from "@core/enums/combat/WeaponWield";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";

import { isCreature } from "@engine/module/guards/isCreature";

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

function asCreature(obj: GameObject | undefined): Creature | undefined {
  if(!obj || !isCreature(obj)){
    return undefined;
  }
  return obj as Creature;
}

/**
 * MainHand weapon eligible for choreographed melee:
 * present, not ranged, not stun baton, not wield 8 (unused in K1 baseitems).
 */
export function isChoreographedMeleeWeapon(creature: Creature | undefined): boolean {
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
  attacker: Creature,
  target: GameObject
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
export function isOdysseyDuelCreature(creature: Creature | undefined): boolean {
  if(!creature) return false;
  const mt = String(creature.getAppearance?.()?.modeltype ?? creature.creatureAppearance?.modeltype ?? '');
  const c = mt.charAt(0);
  return c === 'S' || c === 'L' || c === 's' || c === 'l';
}

/**
 * Party-leader focus gate: last-spell and attempted-attack must be empty or us.
 */
function partyLeaderFocusAllowsEngaged(
  attacker: Creature,
  lastSpell: GameObject | undefined,
  attempted: GameObject | undefined
): boolean {
  const spellOk = !lastSpell || lastSpell === attacker;
  const attemptedOk = !attempted || attempted === attacker;
  return spellOk && attemptedOk;
}

/**
 * ResolveEngagedState
 * whether this attack should sync as an engaged duel round with target.
 */
export function resolveEngagedState(
  attacker: Creature,
  target: GameObject
): boolean {
  const targetCreature = asCreature(target);
  if(!targetCreature) return false;

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

  // Party leader as target — GetCharacter(0) special case:
  // third-party last-attack clears; otherwise keep only when last-spell and
  // attempted-attack are empty or point at this attacker.
  const partyLeader = GameState.PartyManager?.party?.[0];
  if(partyLeader && targetCreature === partyLeader){
    if(noAttackTarget){
      if(!targetLastSpell){
        engaged = false;
      }
      if(!partyLeaderFocusAllowsEngaged(attacker, targetLastSpell, targetAttempted)){
        engaged = false;
      }
    }else if(targetLastAttack === attacker){
      if(!partyLeaderFocusAllowsEngaged(attacker, targetLastSpell, targetAttempted)){
        engaged = false;
      }
    }else{
      engaged = false;
    }
  }

  if(typeof targetCreature.isDebilitated === 'function' && targetCreature.isDebilitated()){
    return false;
  }

  return engaged;
}

/**
 * ResolveMasterState
 * who drives the engaged duel (party members always master).
 */
export function resolveMasterState(
  attacker: Creature,
  target: GameObject,
  engaged: boolean
): boolean {
  if(!engaged) return false;

  const targetCreature = asCreature(target);
  if(!targetCreature) return false;

  // Party members always drive the duel.
  if(typeof attacker.isPartyMember === 'function' && attacker.isPartyMember()){
    return true;
  }
  if(GameState.PartyManager?.party?.indexOf(attacker) >= 0){
    return true;
  }

  // Deadlock guard (not in retail ResolveMaster): if the target is already
  // driving this exact pair as master, yield so both sides do not infinitePause.
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
  attacker: Creature,
  target: GameObject
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
