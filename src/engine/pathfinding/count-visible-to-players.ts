import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import { GameState } from "@/GameState";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";

/**
 * Approximate CSWSArea::CountVisibleToPlayers —
 * used by ComputeNonVisibleLocation @ 004bee30.
 *
 * Counts party members with ClearLineOfSight to `point`, early-out at `maxCount`
 * (retail starts at 0x60 and shrinks to the best score found so far).
 *
 * @file count-visible-to-players.ts
 */

/**
 * @returns Number of party members that can see `point` (capped at maxCount).
 */
export function countVisibleToPlayers(
  area: ModuleArea | undefined,
  point: THREE.Vector3,
  maxCount: number = 0x60
): number {
  if(!area || !point || maxCount <= 0) return 0;

  const party = GameState.PartyManager?.party || [];
  let visible = 0;
  for(let i = 0; i < party.length; i++){
    const member = party[i];
    if(!member?.position) continue;
    if(member.isDead?.()) continue;
    if(clearLineOfSight(area, member.position, point)){
      visible++;
      if(visible >= maxCount) return visible;
    }
  }
  return visible;
}
