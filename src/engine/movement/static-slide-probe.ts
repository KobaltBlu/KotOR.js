import type * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import { WalkLineHitCode } from "@engine/pathfinding/walk-line-clear";
import type { DriveStepClearResult } from "@engine/pathfinding/drive-step-clear";
import { testDriveStepClear } from "@engine/movement/area-movement-queries";
import { MovementHitKind, type MovementHit } from "@engine/movement/types";
import type { CollideAndSlideProbe } from "@engine/movement/collide-and-slide";

/**
 * Shared adapter: thin drive probe → collide-and-slide probe result.
 * Used by player control and NPC drive so both resolve statics identically.
 */

/**
 * True when a probe hit normal is usable for horizontal wall slide.
 * Near-Z / tiny-XY normals (flat Nonwalk skirts) are rejected.
 */
export function isUsableWallNormalXY(n: THREE.Vector3 | undefined): boolean {
  if(!n) return false;
  const xy = Math.hypot(n.x, n.y);
  if(xy < 1e-3) return false;
  if(Math.abs(n.z) > 0.9) return false;
  return true;
}

export function movementHitFromProbe(probe: DriveStepClearResult): MovementHit | undefined {
  if(probe.clear) return undefined;
  return {
    kind:
      probe.code === WalkLineHitCode.DetailedBlock
        ? MovementHitKind.Static
        : MovementHitKind.Walkmesh,
    objectId: probe.blockingObjectId,
    position: probe.clearPoint.clone(),
    distance: probe.clearT,
  };
}

export type StaticSlideProbeOptions = {
  owner?: Creature;
  personalSpace: number;
  softClearStartOverlap?: boolean;
  collectHitInfo?: boolean;
};

export function makeStaticSlideProbe(
  area: Area,
  options: StaticSlideProbeOptions
): (from: THREE.Vector3, to: THREE.Vector3) => CollideAndSlideProbe {
  const opts = {
    owner: options.owner,
    personalSpace: options.personalSpace,
    softClearStartOverlap: options.softClearStartOverlap,
    collectHitInfo: options.collectHitInfo ?? true,
  };
  return (from, to) => {
    const r = testDriveStepClear(area, from, to, opts);
    const clear = r.clear && r.code === WalkLineHitCode.Ok;
    const n = r.normal ?? r.walkHit?.normal;
    return {
      clear,
      clearT: clear ? 1 : r.clearT,
      normalX: n?.x,
      normalY: n?.y,
      normalUsable: !r.normalSynthetic && isUsableWallNormalXY(n),
      hit: clear ? undefined : movementHitFromProbe(r),
    };
  };
}
