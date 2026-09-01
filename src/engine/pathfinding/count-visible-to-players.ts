import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { GameState } from "@/GameState";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";

/**
 * Retail CountVisibleToPlayers
 * used by ComputeNonVisibleLocation.
 *
 * Counts player creatures with ClearLineOfSight to `point`, early-out at `maxCount`
 * (retail starts at 0x60 and shrinks to the best score found so far).
 *
 * Pass AF: dist² < 900 (30 m), eye Z +1.5 on both ends before LOS.
 *
 * @file count-visible-to-players.ts
 */

/** Retail squared range gate before LOS. */
export const COUNT_VISIBLE_RANGE_SQ = 900.0;
/** Retail eye-height offset applied to both endpoints before ClearLineOfSight. */
export const COUNT_VISIBLE_EYE_Z = 1.5;

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();

/**
 * Collect living player-controlled creatures for visibility (party + area PCs).
 */
function collectPlayerCreatures(area: ModuleArea): ModuleCreature[] {
  const out: ModuleCreature[] = [];
  const seen = new Set<number>();

  const push = (c: ModuleCreature | undefined) => {
    if(!c?.position) return;
    if(c.isDead?.()) return;
    const id = c.id;
    if(typeof id === 'number'){
      if(seen.has(id)) return;
      seen.add(id);
    }
    out.push(c);
  };

  const party = GameState.PartyManager?.party || [];
  for(let i = 0; i < party.length; i++){
    push(party[i] as ModuleCreature);
  }

  const creatures = area.creatures || [];
  for(let i = 0; i < creatures.length; i++){
    const c = creatures[i] as ModuleCreature;
    if(c?.isPC || c?.isPartyMember?.()){
      push(c);
    }
  }

  return out;
}

/**
 * @returns Number of players that can see `point` (capped at maxCount).
 */
export function countVisibleToPlayers(
  area: ModuleArea | undefined,
  point: THREE.Vector3,
  maxCount: number = 0x60
): number {
  if(!area || !point || maxCount <= 0) return 0;

  const players = collectPlayerCreatures(area);
  let visible = 0;
  for(let i = 0; i < players.length; i++){
    const member = players[i];
    const mp = member.position;
    const dx = point.x - mp.x;
    const dy = point.y - mp.y;
    const dz = point.z - mp.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    // Retail: fVar1 < 900.0 (strict)
    if(!(distSq < COUNT_VISIBLE_RANGE_SQ)) continue;

    _from.set(mp.x, mp.y, mp.z + COUNT_VISIBLE_EYE_Z);
    _to.set(point.x, point.y, point.z + COUNT_VISIBLE_EYE_Z);
    if(clearLineOfSight(area, _from, _to)){
      visible++;
      if(visible >= maxCount) return visible;
    }
  }
  return visible;
}
