import type { ModuleCreature } from "@/module/ModuleCreature";
import { GameState } from "@/GameState";
import { getCreaturePersonalSpace } from "@/combat/attack-range";
import * as THREE from "three";

/**
 * Soft party-member separation when GetIsCreatureBumpable cannot push
 * state party-UI creatures (PC bump returns 0 for companions).
 *
 * Gently nudges overlapping companions apart so they don't stack forever.
 *
 * @file party-soft-separate.ts
 */

const _tmp = new THREE.Vector3();

/**
 * Separate `creature` from other party members if personal spaces overlap.
 * @returns true if a nudge was applied
 */
export function partySoftSeparate(creature: ModuleCreature | undefined): boolean {
  if(!creature || !creature.isPartyMember?.()) return false;
  const party = GameState.PartyManager?.party as ModuleCreature[] | undefined;
  if(!party || party.length < 2) return false;

  const selfSpace = getCreaturePersonalSpace(creature);
  let nudged = false;

  for(let i = 0; i < party.length; i++){
    const other = party[i];
    if(!other || other === creature || other.isDead?.()) continue;

    const minDist = selfSpace + getCreaturePersonalSpace(other) + 0.05;
    let dx = creature.position.x - other.position.x;
    let dy = creature.position.y - other.position.y;
    const dist = Math.hypot(dx, dy);
    if(dist >= minDist) continue;

    if(dist < 1e-4){
      const ang = (i + 1) * 1.2566;
      dx = Math.cos(ang);
      dy = Math.sin(ang);
    }else{
      dx /= dist;
      dy /= dist;
    }

    const push = (minDist - dist) * 0.5;
    _tmp.set(
      creature.position.x + dx * push,
      creature.position.y + dy * push,
      creature.position.z
    );
    const area = creature.area;
    if(typeof area?.getNearestWalkablePoint === 'function'){
      const walk = area.getNearestWalkablePoint(_tmp, 0.5);
      _tmp.copy(walk);
    }
    if(typeof creature.setPosition === 'function'){
      creature.setPosition(_tmp);
    }else{
      creature.position.x = _tmp.x;
      creature.position.y = _tmp.y;
    }
    nudged = true;
  }

  return nudged;
}
