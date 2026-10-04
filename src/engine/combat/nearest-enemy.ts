import {
  getCreaturePersonalSpace,
  hasCombatLineOfSight,
  maxCleaveRange,
} from "@engine/combat/attack-range";
import { PerceptionMask } from "@engine/enums/engine/PerceptionMask";
import { GameState } from "@engine/runtime/GameState";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleObject } from "@engine/module/ModuleObject";

import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/**
 * GetNearestEnemy / HasTargetBeenDetected.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nearest-enemy.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** True when viewer has a perceptionList entry with SEEN bit for target. */
export function hasPerceptionSeen(
  viewer: ModuleObject,
  target: ModuleObject
): boolean {
  if(!viewer?.perceptionList || !target){
    return false;
  }
  const list = viewer.perceptionList;
  for(let i = 0; i < list.length; i++){
    const entry = list[i];
    if(!entry) continue;
    if(entry.object === target || entry.objectId === target.id){
      return !!(entry.data & PerceptionMask.SEEN);
    }
  }
  return false;
}

/**
 * HasTargetBeenDetected.
 * Doors / placeables always; creatures require SEEN.
 * party-UI path skips the visibility gate — mirrored for party members.
 */
export function hasTargetBeenDetected(
  attacker: ModuleCreature,
  target: ModuleObject
): boolean {
  if(!attacker || !target){
    return false;
  }
  if(
    isDoor(target) ||
    isPlaceable(target)
  ){
    return true;
  }
  // Party-UI bypass (controlled / party-ordered attacks)
  const party = GameState.PartyManager?.party;
  if(party && party.indexOf(attacker) >= 0){
    return true;
  }
  return hasPerceptionSeen(attacker, target);
}

/** Gap distance used by GetNearestEnemy: |Δpos| − creperspace − target.creperspace. */
export function getEnemyGapDistance(
  from: ModuleCreature,
  target: ModuleCreature
): number {
  const magnitude = from.position.distanceTo(target.position);
  return magnitude - getCreaturePersonalSpace(from) - getCreaturePersonalSpace(target);
}

/**
 * LOS distance cap for GetNearestEnemy: gap uses personal-space-adjusted range,
 * but hasCombatLineOfSight / hasLineOfSight clamps on raw center distance.
 * Pass maxRange + both creperspaces so a candidate that passes the gap gate
 * is not rejected solely by the raw-distance LOS clamp.
 */
export function getNearestEnemyLosMaxDistance(
  attacker: ModuleCreature,
  candidate: ModuleCreature,
  maxRange: number
): number {
  return (
    maxRange +
    getCreaturePersonalSpace(attacker) +
    getCreaturePersonalSpace(candidate)
  );
}

function collectAreaCreatures(attacker: ModuleCreature): ModuleCreature[] {
  const out: ModuleCreature[] = [];
  const seen = new Set<number>();
  const push = (c: ModuleCreature | undefined) => {
    if(!c || seen.has(c.id)) return;
    seen.add(c.id);
    out.push(c);
  };

  const area = attacker.area;
  if(area?.creatures){
    for(let i = 0; i < area.creatures.length; i++){
      push(area.creatures[i]);
    }
  }

  const party = GameState.PartyManager?.party;
  if(party){
    for(let i = 0; i < party.length; i++){
      push(party[i]);
    }
  }

  return out;
}

export type GetNearestEnemyOptions = {
  /** Exclude this object id from the search. Defaults to attacker. */
  exclude?: ModuleObject;
  /** Cap; default MaxCleaveRange(attacker). */
  maxRange?: number;
};

/**
 * GetNearestEnemy.
 * Hostile + alive + SEEN + combat LOS + creperspace gap within maxRange.
 */
export function getNearestEnemy(
  attacker: ModuleCreature,
  maxRange?: number,
  options?: GetNearestEnemyOptions
): ModuleCreature | undefined {
  if(!attacker?.area){
    return undefined;
  }

  const range = typeof maxRange === 'number'
    ? maxRange
    : (options?.maxRange ?? maxCleaveRange(attacker));
  const exclude = options?.exclude ?? attacker;
  const excludeId = exclude?.id;

  let best: ModuleCreature | undefined;
  let bestGap = range;

  const candidates = collectAreaCreatures(attacker);
  for(let i = 0; i < candidates.length; i++){
    const candidate = candidates[i];
    if(!candidate || candidate === attacker) continue;
    if(excludeId !== undefined && candidate.id === excludeId) continue;
    if(!isCreature(candidate)) continue;
    if(candidate.isDead?.()) continue;
    if(!attacker.isHostile(candidate)) continue;
    if(!hasPerceptionSeen(attacker, candidate)) continue;

    const gap = getEnemyGapDistance(attacker, candidate);
    if(!(gap < bestGap)) continue;
    const losMax = getNearestEnemyLosMaxDistance(attacker, candidate, range);
    if(!hasCombatLineOfSight(attacker, candidate, losMax)) continue;

    bestGap = gap;
    best = candidate;
  }

  return best;
}

/**
 * Diagnostic counts for why GetNearestEnemy returned nothing (duelLog / tests).
 */
export function explainNearestEnemyMiss(
  attacker: ModuleCreature,
  maxRange?: number,
  options?: GetNearestEnemyOptions
): {
  candidates: number;
  hostileAlive: number;
  seen: number;
  inRange: number;
  los: number;
  maxRange: number;
} {
  const range = typeof maxRange === 'number'
    ? maxRange
    : (options?.maxRange ?? maxCleaveRange(attacker));
  const exclude = options?.exclude ?? attacker;
  const excludeId = exclude?.id;

  let candidates = 0;
  let hostileAlive = 0;
  let seen = 0;
  let inRange = 0;
  let los = 0;

  if(!attacker?.area){
    return { candidates: 0, hostileAlive: 0, seen: 0, inRange: 0, los: 0, maxRange: range };
  }

  const list = collectAreaCreatures(attacker);
  for(let i = 0; i < list.length; i++){
    const candidate = list[i];
    if(!candidate || candidate === attacker) continue;
    if(excludeId !== undefined && candidate.id === excludeId) continue;
    if(!isCreature(candidate)) continue;
    candidates++;
    if(candidate.isDead?.()) continue;
    if(!attacker.isHostile(candidate)) continue;
    hostileAlive++;
    if(!hasPerceptionSeen(attacker, candidate)) continue;
    seen++;
    const gap = getEnemyGapDistance(attacker, candidate);
    if(!(gap < range)) continue;
    inRange++;
    const losMax = getNearestEnemyLosMaxDistance(attacker, candidate, range);
    if(!hasCombatLineOfSight(attacker, candidate, losMax)) continue;
    los++;
  }

  return { candidates, hostileAlive, seen, inRange, los, maxRange: range };
}
