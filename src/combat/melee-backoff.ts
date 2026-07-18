import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import * as THREE from "three";

/**
 * Retail AIActionPhysicalAttacks too-close branch @ 005bbbf0 —
 * Ideal back-off at DesiredAttackRange, then TestDirectLine clip
 * (approximated with walkable line sample + getNearestWalkablePoint).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file melee-backoff.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const _ideal = new THREE.Vector3();
const _sample = new THREE.Vector3();

/**
 * Point at `desired` meters from `target` along the attacker←target axis,
 * clipped to the farthest walkable sample toward that ideal (TestDirectLine approx).
 */
export function getMeleeBackoffPosition(
  attacker: ModuleCreature,
  target: ModuleObject,
  desired: number
): THREE.Vector3 {
  const dx = attacker.position.x - target.position.x;
  const dy = attacker.position.y - target.position.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1.0;
  _ideal.set(
    target.position.x + (dx / len) * desired,
    target.position.y + (dy / len) * desired,
    attacker.position.z
  );

  const area = attacker.area;
  if(!area){
    return _ideal.clone();
  }

  // Sample along attacker → ideal; keep last walkable point (retail CWalkHitInfo clip).
  let best = attacker.position.clone();
  const steps = 8;
  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      attacker.position.x + (_ideal.x - attacker.position.x) * t,
      attacker.position.y + (_ideal.y - attacker.position.y) * t,
      attacker.position.z
    );
    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(_sample)){
      break;
    }
    best.copy(_sample);
  }

  if(typeof area.getNearestWalkablePoint === 'function'){
    return area.getNearestWalkablePoint(best, getPathPersonalSpace(attacker));
  }
  return best;
}
