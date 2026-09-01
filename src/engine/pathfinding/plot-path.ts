import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { beginInterAreaPath } from "@/engine/pathfinding/inter-area-path";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

/**
 * Retail PlotPath / PlotPathInArea return codes.
 * Thin façade over ModulePath.traverseToPoint + resume maps (Pass AD).
 *
 * @file plot-path.ts
 */

export enum PlotPathCode {
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
  /** Retail pathfind state — live chase / UseRange target object id. */
  targetObjectId?: number;
  /** Last code; Ready + unchanged endpoints → early-out. */
  lastCode?: PlotPathCode;
  lastOrigin?: THREE.Vector3;
  lastDest?: THREE.Vector3;
  /** Optional: force path reset. */
  replot?: boolean;
};

export type PlotPathResult = {
  code: PlotPathCode;
  path?: ComputedPath;
};

const ENDPOINT_EPS_SQ = 0.01;

function endpointsMatch(a: THREE.Vector3 | undefined, b: THREE.Vector3): boolean {
  if(!a) return false;
  return a.distanceToSquared(b) <= ENDPOINT_EPS_SQ;
}

/**
 * Minimal PlotPath — classify traverseToPoint / inter-area into retail 1/2/3.
 * Resume state stays in ModulePath dfs/smooth maps.
 */
export function plotPath(
  area: ModuleArea | undefined,
  owner: ModuleObject,
  info: PathFindInfoLite,
  opts: { smooth?: boolean } = {}
): PlotPathResult {
  if(!area || !owner){
    return { code: PlotPathCode.Fail };
  }

  const destAreaId = info.destAreaId;
  const ownerAreaId = area.id;
  if(
    typeof destAreaId === 'number' &&
    typeof ownerAreaId === 'number' &&
    destAreaId !== ownerAreaId
  ){
    if(!BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)){
      return { code: PlotPathCode.Fail };
    }
    const creature = owner as ModuleCreature;
    const ok = beginInterAreaPath(creature, undefined, destAreaId);
    if(!ok && !(creature.interAreaWaypoints?.length)){
      info.lastCode = PlotPathCode.Fail;
      return { code: PlotPathCode.Fail };
    }
    // Inter-area hop continues via CheckInterArea — PlotPath return 1
    info.lastCode = PlotPathCode.Incomplete;
    return { code: PlotPathCode.Incomplete };
  }

  // Early-out Ready when endpoints unchanged (Retail)
  if(
    !info.replot &&
    info.lastCode === PlotPathCode.Ready &&
    endpointsMatch(info.lastOrigin, info.origin) &&
    endpointsMatch(info.lastDest, info.dest)
  ){
    return { code: PlotPathCode.Ready };
  }

  const path = area.path.traverseToPoint(
    owner,
    info.origin,
    info.dest,
    opts.smooth !== false
  );

  if(!path?.points?.length){
    info.lastCode = PlotPathCode.Fail;
    return { code: PlotPathCode.Fail };
  }

  // Stay-put / no progress toward dest → Fail
  if(path.points.length <= 2){
    const last = path.points[path.points.length - 1].vector;
    const nearOrigin = last.distanceToSquared(info.origin) < ENDPOINT_EPS_SQ;
    const destFar = info.dest.distanceToSquared(info.origin) > 0.25;
    if(nearOrigin && destFar){
      info.lastCode = PlotPathCode.Fail;
      return { code: PlotPathCode.Fail, path };
    }
  }

  if(
    path.incomplete ||
    path.smoothResume ||
    path.smoothCornerResume ||
    (path.realtime && area.path.hasPendingSmoothSession(owner.id))
  ){
    info.lastCode = PlotPathCode.Incomplete;
    return { code: PlotPathCode.Incomplete, path };
  }

  info.lastCode = PlotPathCode.Ready;
  info.lastOrigin = info.origin.clone();
  info.lastDest = info.dest.clone();
  info.replot = false;
  return { code: PlotPathCode.Ready, path };
}
