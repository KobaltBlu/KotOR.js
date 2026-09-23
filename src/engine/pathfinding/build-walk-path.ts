import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { beginInterAreaPath } from "@/engine/pathfinding/inter-area-path";
import { pathHopsAreWalkClear } from "@/engine/pathfinding/path-hops-clear";

import { isCreature } from "@/module/guards/isCreature";

/**
 * buildWalkPath / in-area return codes.
 * Thin façade over ModulePath.traverseToPoint + resume maps (Pass AD).
 *
 * @file build-walk-path.ts
 */

export enum WalkPathCode {
  /** Continue next frame (DFS / smooth / corner / inter-area hop). */
  Incomplete = 1,
  /** Path usable this frame. */
  Ready = 2,
  /** Hard fail (or stay-put that should ERROR). */
  Fail = 3,
}

export type PathFindInfoLite = {
  ownerId: number;
  origin: THREE.Vector3;
  dest: THREE.Vector3;
  destAreaId?: number;
  /** pathfind state — live chase / UseRange target object id. */
  targetObjectId?: number;
  /** Last code; Ready + unchanged endpoints → early-out. */
  lastCode?: WalkPathCode;
  lastOrigin?: THREE.Vector3;
  lastDest?: THREE.Vector3;
  /** Optional: force path reset. */
  replot?: boolean;
};

export type PlotPathResult = {
  code: WalkPathCode;
  path?: ComputedPath;
};

const ENDPOINT_EPS_SQ = 0.01;

function endpointsMatch(a: THREE.Vector3 | undefined, b: THREE.Vector3): boolean {
  if(!a) return false;
  return a.distanceToSquared(b) <= ENDPOINT_EPS_SQ;
}

/**
 * Minimal buildWalkPath — classify traverseToPoint / inter-area into 1/2/3.
 * Resume state stays in ModulePath dfs/smooth maps.
 */
export function buildWalkPath(
  area: ModuleArea | undefined,
  owner: ModuleObject,
  info: PathFindInfoLite,
  opts: { smooth?: boolean } = {}
): PlotPathResult {
  if(!area || !owner){
    return { code: WalkPathCode.Fail };
  }

  const destAreaId = info.destAreaId;
  const ownerAreaId = area.id;
  if(
    typeof destAreaId === 'number' &&
    typeof ownerAreaId === 'number' &&
    destAreaId !== ownerAreaId
  ){
    if(!isCreature(owner)){
      return { code: WalkPathCode.Fail };
    }
    const creature = owner as ModuleCreature;
    const ok = beginInterAreaPath(creature, undefined, destAreaId);
    if(!ok && !(creature.interAreaWaypoints?.length)){
      info.lastCode = WalkPathCode.Fail;
      return { code: WalkPathCode.Fail };
    }
    // Inter-area hop continues via CheckInterArea — buildWalkPath return 1
    info.lastCode = WalkPathCode.Incomplete;
    return { code: WalkPathCode.Incomplete };
  }

  // Early-out Ready when endpoints unchanged 
  if(
    !info.replot &&
    info.lastCode === WalkPathCode.Ready &&
    endpointsMatch(info.lastOrigin, info.origin) &&
    endpointsMatch(info.lastDest, info.dest)
  ){
    return { code: WalkPathCode.Ready };
  }

  const wantSmooth = opts.smooth !== false;
  let path = area.path.traverseToPoint(
    owner,
    info.origin,
    info.dest,
    wantSmooth
  );

  if(!path?.points?.length){
    info.lastCode = WalkPathCode.Fail;
    return { code: WalkPathCode.Fail };
  }

  // Stay-put / no progress toward dest → Fail
  if(path.points.length <= 2){
    const last = path.points[path.points.length - 1].vector;
    const nearOrigin = last.distanceToSquared(info.origin) < ENDPOINT_EPS_SQ;
    const destFar = info.dest.distanceToSquared(info.origin) > 0.25;
    if(nearOrigin && destFar){
      info.lastCode = WalkPathCode.Fail;
      return { code: WalkPathCode.Fail, path };
    }
  }

  if(
    path.incomplete ||
    path.smoothResume ||
    path.smoothCornerResume ||
    (path.realtime && area.path.hasPendingSmoothSession(owner.id))
  ){
    info.lastCode = WalkPathCode.Incomplete;
    return { code: WalkPathCode.Incomplete, path };
  }

  // Smooth chords can cross blocking edges — rebuild unsmoothed once if hops fail.
  if(
    wantSmooth &&
    !pathHopsAreWalkClear(area, info.origin, path, owner)
  ){
    const unsmooth = area.path.traverseToPoint(
      owner,
      info.origin,
      info.dest,
      false
    );
    if(unsmooth?.points?.length){
      if(
        unsmooth.incomplete ||
        unsmooth.smoothResume ||
        unsmooth.smoothCornerResume
      ){
        info.lastCode = WalkPathCode.Incomplete;
        return { code: WalkPathCode.Incomplete, path: unsmooth };
      }
      path = unsmooth;
    }
  }

  // Both smooth and unsmooth can still chord through NonWalk (doorway voids).
  // Do not ship a Ready poison polyline — callers must detour or fail the move.
  if(!pathHopsAreWalkClear(area, info.origin, path, owner)){
    info.lastCode = WalkPathCode.Fail;
    return { code: WalkPathCode.Fail, path };
  }

  info.lastCode = WalkPathCode.Ready;
  info.lastOrigin = info.origin.clone();
  info.lastDest = info.dest.clone();
  info.replot = false;
  return { code: WalkPathCode.Ready, path };
}
