import type { ModuleCreature } from "@/module/ModuleCreature";
import { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";

/**
 * Approximate isCreatureNudgeable.
 *
 * Returns true when `other` is a soft friendly that may be pushed
 * (nudgeFriendlyCreatures) rather than treated as a hard path blocker.
 *
 * gates:
 * - reputation > 9
 * - other is non-party / non-player-UI — mirrored as !isPartyMember
 * - Party / player-UI mover: never bumps world creatures out of the way
 * - NPC mover: other not player, empty action queue, round not paused
 *
 * @file is-creature-nudgeable.ts
 */

/** Front-of-queue actions that make a creature non-bumpable for the PC. */
const BUSY_ACTIONS: number[] = [
  ActionType.ActionPhysicalAttacks, // 0x0C
  ActionType.ActionCastSpell,       // 0x0F
  ActionType.ActionItemCastSpell,   // 0x2E
  ActionType.ActionCombat,          // 0x3F
];

function getPlayerCreature(): ModuleCreature | undefined {
  const pc = GameState.getCurrentPlayer?.() as ModuleCreature | undefined;
  if(pc) return pc;
  return GameState.PartyManager?.party?.[0];
}

/** Party / player-UI creatures are never bump targets. */
function isPartyUiCreature(creature: ModuleCreature): boolean {
  if(creature.isPartyMember?.()) return true;
  const party = GameState.PartyManager?.party;
  return !!(party && party.indexOf(creature) >= 0);
}

/**
 * @param self Pathfinding / moving creature
 * @param other Candidate blocker
 */
export function isCreatureNudgeable(
  self: ModuleCreature | undefined,
  other: ModuleCreature | undefined
): boolean {
  if(!self || !other || self === other) return false;
  if(other.isDead?.()) return false;

  // : GetReputation(self, other) > 9
  const rep = typeof self.getReputation === 'function'
    ? self.getReputation(other)
    : 0;
  if(!(rep > 9)) return false;

  // : party / player-UI creatures are not bumpable
  if(isPartyUiCreature(other)) return false;
  // Party followers use FollowLeader direct-line recovery, not world-creature pushes.
  if(isPartyUiCreature(self)) return false;

  const player = getPlayerCreature();
  const front = other.actionQueue?.[0] as { type?: number } | undefined;
  const frontType = front?.type;

  if(player && player === self){
    // Player mover: busy combat/cast → not bumpable; otherwise require empty party-UI bit
    if(frontType != null && BUSY_ACTIONS.indexOf(frontType) >= 0){
      return false;
    }
    return false;
  }

  // NPC mover: bumpable if other isn't the player, idle queue, round not paused
  if(player && player === other) return false;
  if(other.actionQueue && other.actionQueue.length > 0) return false;
  if(other.combatRound?.roundPaused) return false;
  return true;
}
