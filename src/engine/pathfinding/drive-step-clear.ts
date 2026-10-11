import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import { clippedLineSegmentWalkable } from "@engine/pathfinding/clipped-line-segment";
import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import {
  createWalkHitInfo,
  WalkHitKind,
  type WalkHitInfo,
} from "@engine/pathfinding/walk-hit-info";
import { WalkLineHitCode } from "@engine/pathfinding/walk-line-clear";

/**
 * Frame-step drive clearance: one thin probe (clip + one static/mesh stadium).
 *
 * Intentionally omits plot-grade hasWalkLineClear work:
 * refineDetailedClearT, room-connectivity BFS, adaptive sample rings,
 * and personal-space endpoint rings.
 *
 * The returned result is a shared scratch object — copy fields before the
 * next probeDriveStepClear call if they must outlive that call.
 *
 * @file drive-step-clear.ts
 */

export type DriveStepClearOptions = {
  owner?: Creature;
  personalSpace?: number;
  softClearStartOverlap?: boolean;
  collectHitInfo?: boolean;
};

export type DriveStepClearResult = {
  clear: boolean;
  clearT: number;
  clearPoint: THREE.Vector3;
  code: WalkLineHitCode;
  normal: THREE.Vector3;
  blockingObjectId?: number;
  walkHit?: WalkHitInfo;
};

const _queryBox = new THREE.Box3();
const _queryMin = new THREE.Vector3();
const _queryMax = new THREE.Vector3();
const _faceScratch: OdysseyFace3[] = [];
const _hitScratch = createWalkHitInfo();
const _result: DriveStepClearResult = {
  clear: true,
  clearT: 1,
  clearPoint: new THREE.Vector3(),
  code: WalkLineHitCode.Ok,
  normal: new THREE.Vector3(0, 0, 1),
  blockingObjectId: undefined,
  walkHit: undefined,
};

/** Dev counter: thin drive probes this process (tests / live DevTools). */
let _driveProbeCount = 0;

export function getDriveProbeCount(): number {
  return _driveProbeCount;
}

export function resetDriveProbeCount(): void {
  _driveProbeCount = 0;
}

function projectClearT(
  from: THREE.Vector3,
  to: THREE.Vector3,
  hitPoint: THREE.Vector3
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy;
  if(lenSq < 1e-12) return 0;
  const t = ((hitPoint.x - from.x) * dx + (hitPoint.y - from.y) * dy) / lenSq;
  return Math.max(0, Math.min(1, t));
}

function gatherCandidateFaces(
  area: Area,
  from: THREE.Vector3,
  to: THREE.Vector3,
  personalSpace: number
): OdysseyFace3[] | undefined {
  if(typeof area.getWalkCandidatesForBox !== "function" || !area.rooms?.length){
    return undefined;
  }
  const expand = Math.max(0.05, personalSpace) + 0.05;
  _queryBox.set(
    _queryMin.set(
      Math.min(from.x, to.x) - expand,
      Math.min(from.y, to.y) - expand,
      Math.min(from.z, to.z) - expand
    ),
    _queryMax.set(
      Math.max(from.x, to.x) + expand,
      Math.max(from.y, to.y) + expand,
      Math.max(from.z, to.z) + expand
    )
  );
  const { faces } = area.getWalkCandidatesForBox(
    _queryBox,
    { faces: _faceScratch },
    { edges: false, walkFacesOnly: false }
  );
  return faces;
}

/**
 * One thin blocked? probe for drive / WASD / follow foot steps.
 * Returns first-contact clearT/normal from clip or stadium hit — no refine.
 */
export function probeDriveStepClear(
  area: Area | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: DriveStepClearOptions = {}
): DriveStepClearResult {
  _driveProbeCount++;
  _result.blockingObjectId = undefined;
  _result.walkHit = undefined;
  _result.normal.set(0, 0, 1);

  if(!area || from.distanceToSquared(to) < 1e-10){
    _result.clear = true;
    _result.clearT = 1;
    _result.clearPoint.copy(to);
    _result.code = WalkLineHitCode.Ok;
    return _result;
  }

  const personalSpace = options.personalSpace ?? 0.5;
  const softStart = !!options.softClearStartOverlap;

  // 1) Clipped walk-face traversal (wall / hop).
  const clip = clippedLineSegmentWalkable(area, from, to);
  if(!clip.ok){
    _result.clearPoint.copy(clip.clearPoint);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if(len > 1e-8){
      _result.normal.set(-(dx / len), -(dy / len), 0);
    }
    const walkHit = options.collectHitInfo !== false ? _hitScratch : undefined;
    if(walkHit){
      walkHit.kind = WalkHitKind.Edge;
      walkHit.hitPoint.copy(_result.clearPoint);
      walkHit.normal.copy(_result.normal);
      walkHit.objectId = undefined;
    }
    _result.clear = false;
    _result.clearT = Math.max(0, Math.min(1, clip.clearT));
    _result.code = WalkLineHitCode.NonWalk;
    _result.walkHit = walkHit;
    return _result;
  }

  // 2) One static/mesh stadium — reuse candidate faces from a single gather.
  const candidateFaces = gatherCandidateFaces(area, from, to, personalSpace);
  const hit = options.collectHitInfo !== false ? _hitScratch : undefined;
  if(hit){
    hit.kind = WalkHitKind.None;
    hit.objectId = undefined;
  }

  const staticResult = isStaticWalkClearDetailed(area, from, to, {
    personalSpace,
    hit,
    softClearStartOverlap: softStart,
    skipMesh: false,
    candidateFaces,
  });

  if(staticResult.clear){
    _result.clear = true;
    _result.clearT = 1;
    _result.clearPoint.copy(to);
    _result.code = WalkLineHitCode.Ok;
    return _result;
  }

  if(hit && hit.kind !== WalkHitKind.None){
    _result.clearT = projectClearT(from, to, hit.hitPoint);
    _result.clearPoint.set(
      from.x + (to.x - from.x) * _result.clearT,
      from.y + (to.y - from.y) * _result.clearT,
      from.z + (to.z - from.z) * _result.clearT
    );
    if(hit.hitPoint){
      _result.clearPoint.z = hit.hitPoint.z;
    }
    _result.normal.copy(hit.normal);
  }else{
    _result.clearT = 0;
    _result.clearPoint.copy(from);
  }

  _result.clear = false;
  _result.code = WalkLineHitCode.DetailedBlock;
  _result.blockingObjectId = staticResult.blockingObjectId ?? hit?.objectId;
  _result.walkHit = hit;
  return _result;
}
