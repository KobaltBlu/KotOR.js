import * as THREE from "three";
import type { Creature } from "@engine/module/Creature";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";
import { isCreatureNudgeable } from "@engine/pathfinding/is-creature-nudgeable";
import { teleportObject } from "@engine/movement/teleport";
import { setMovementAuthority } from "@engine/movement/creature-movement-state";
import { MovementAuthority } from "@engine/movement/types";

/**
 * Approximate nudgeFriendlyCreatures.
 *
 * If `other` is nudgeable, push them off the mover's travel line by
 * combined creperspace, then clamp to a walkable point.
 *
 * @file nudge-friendlies.ts
 */

const _proj = new THREE.Vector3();
const _push = new THREE.Vector3();
const _dest = new THREE.Vector3();

/**
 * Project point P onto segment AB (2D), write into out.
 */
function lineProject2D(
  a: THREE.Vector3,
  b: THREE.Vector3,
  p: THREE.Vector3,
  out: THREE.Vector3
): void {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;
  let t = 0;
  if(abLenSq > 1e-12){
    t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  }
  out.set(a.x + abx * t, a.y + aby * t, p.z);
}

/**
 * @param self Mover
 * @param other Friendly to push
 * @param to Intended destination (along travel)
 * @param from Mover start (usually self.position before step)
 * @returns true if other was pushed (return 1)
 */
export function nudgeFriendlyCreatures(
  self: Creature,
  other: Creature,
  to: THREE.Vector3,
  from?: THREE.Vector3
): boolean {
  if(!self || !other) return false;
  if(!isCreatureNudgeable(self, other)) return false;

  const start = from ?? self.position;
  const radius =
    getCreaturePersonalSpace(other) + 0.1 + getCreaturePersonalSpace(self);

  lineProject2D(start, to, other.position, _proj);

  _push.set(
    other.position.x - _proj.x,
    other.position.y - _proj.y,
    0
  );
  const len = Math.hypot(_push.x, _push.y);
  if(len < 1e-6){
    // Collinear — push perpendicular to travel
    const dx = to.x - start.x;
    const dy = to.y - start.y;
    const plen = Math.hypot(dx, dy);
    if(plen < 1e-6) return false;
    _push.set(-dy / plen, dx / plen, 0);
  }else{
    _push.x /= len;
    _push.y /= len;
  }

  _dest.set(
    _proj.x + _push.x * radius,
    _proj.y + _push.y * radius,
    other.position.z
  );

  const area = self.area ?? other.area;
  if(area?.getNearestWalkablePoint){
    const safe = area.getNearestWalkablePoint(_dest, getCreaturePersonalSpace(other));
    if(safe){
      _dest.copy(safe);
    }
  }
  if(typeof area?.isPointWalkable === 'function' && !area.isPointWalkable(_dest)){
    return false;
  }

  setMovementAuthority(other, MovementAuthority.FriendNudge);
  teleportObject(other, _dest, 0, 0, {
    findGround: true,
    caller: "nudgeFriendlyCreatures",
  });
  return true;
}
