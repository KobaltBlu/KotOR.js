import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  farthestClearPoint,
  testDirectLine,
  TestDirectLineCode,
} from "@/engine/pathfinding/test-direct-line";

/**
 * find away vector
 * Try 8 directions at 45° around the creature→threat axis, prefer 180°
 * (away), clip with TestDirectLine / farthestClearPoint, pick best by
 * distance-from-threat × angle weight.
 *
 * @file find-away-vector.ts
 */

const ANGLE_STEP = Math.PI / 4; // 0.7853982
/** multipliers: index 4 (180°) best, then ±135°, etc. */
const ANGLE_WEIGHT = [1, 4, 16, 64, 256, 64, 16, 4];

const _toward = new THREE.Vector3();
const _candidate = new THREE.Vector3();

/**
 * Clip destination along origin→ideal via TestDirectLine.
 */
function clipDirectLine(
  area: NonNullable<ModuleCreature["area"]>,
  owner: ModuleCreature,
  origin: THREE.Vector3,
  ideal: THREE.Vector3
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(owner);
  const hit = testDirectLine(area, origin, ideal, {
    owner,
    personalSpace: perspace,
    allowPartyCreatures: false,
  });
  if(hit.ok || hit.code === TestDirectLineCode.Ok){
    return ideal.clone();
  }
  return farthestClearPoint(area, origin, ideal, {
    owner,
    personalSpace: perspace,
  });
}

/**
 * Compute flee destination at least ~`range` from `threat`.
 */
export function findAwayVector(
  creature: ModuleCreature,
  threat: THREE.Vector3,
  range: number
): THREE.Vector3 {
  const origin = creature.position;
  const area = creature.area;
  const out = origin.clone();

  _toward.set(threat.x - origin.x, threat.y - origin.y, 0);
  const len = Math.sqrt(_toward.x * _toward.x + _toward.y * _toward.y);
  if(len < 1e-4){
    _toward.set(1, 0, 0);
  }else{
    _toward.x /= len;
    _toward.y /= len;
  }

  const rangeSq = range * range;
  const startDistSq =
    (origin.x - threat.x) * (origin.x - threat.x) +
    (origin.y - threat.y) * (origin.y - threat.y) +
    (origin.z - threat.z) * (origin.z - threat.z);

  let bestScore = -1;

  for(let i = 0; i < 8; i++){
    const ang = i * ANGLE_STEP;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    // Rotate toward-threat in XY
    const rx = _toward.x * c + _toward.y * s;
    const ry = _toward.y * c - _toward.x * s;
    let dx = rx * range;
    let dy = ry * range;

    _candidate.set(origin.x + dx, origin.y + dy, origin.z);

    // If still inside range of threat, push another range step 
    const dtx = threat.x - _candidate.x;
    const dty = threat.y - _candidate.y;
    const dtz = threat.z - _candidate.z;
    if(dtx * dtx + dty * dty + dtz * dtz < rangeSq){
      _candidate.x += dx;
      _candidate.y += dy;
    }

    let dest = _candidate.clone();
    if(area){
      // Full line blocked → binary-scale toward origin (scale *= 0.5)
      let scale = 1.0;
      let cleared = false;
      while(scale >= 0.005){
        _candidate.set(origin.x + dx * scale, origin.y + dy * scale, origin.z);
        const clipped = clipDirectLine(area, creature, origin, _candidate);
        const reached =
          Math.abs(clipped.x - _candidate.x) < 0.15 &&
          Math.abs(clipped.y - _candidate.y) < 0.15;
        if(reached || scale < 0.01){
          dest.copy(clipped);
          cleared = true;
          break;
        }
        const cDist =
          (clipped.x - threat.x) * (clipped.x - threat.x) +
          (clipped.y - threat.y) * (clipped.y - threat.y);
        if(cDist > startDistSq * 0.25){
          dest.copy(clipped);
          cleared = true;
          break;
        }
        scale *= 0.5;
      }
      if(!cleared){
        continue;
      }
      // Reject if closer to threat than we started (goto skip)
      const newDist =
        (dest.x - threat.x) * (dest.x - threat.x) +
        (dest.y - threat.y) * (dest.y - threat.y) +
        (dest.z - threat.z) * (dest.z - threat.z);
      if(newDist < startDistSq){
        continue;
      }
    }

    const distThreat = Math.sqrt(
      (dest.x - threat.x) * (dest.x - threat.x) +
      (dest.y - threat.y) * (dest.y - threat.y) +
      (dest.z - threat.z) * (dest.z - threat.z)
    );
    const score = distThreat * ANGLE_WEIGHT[i];
    if(score >= bestScore){
      bestScore = score;
      out.copy(dest);
    }
  }

  if(area?.getNearestWalkablePoint){
    return area.getNearestWalkablePoint(out, getPathPersonalSpace(creature));
  }
  return out;
}
