import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";

/**
 * CM-style wall slide helpers: collect nearby blocking walkmesh edge normals
 * and multi-project desired motion (Gauss-Seidel). Used by PlayerControl so
 * perimeter vertices do not inherit bad mesh corner normals.
 */

const _candBox = new THREE.Box3();
const _candSize = new THREE.Vector3();
const _candEdges: WalkmeshEdge[] = [];
const _candFaces: unknown[] = [];
const _candRooms: unknown[] = [];
const _scratchNormals: THREE.Vector3[] = [];

/** 2D distance from point to clamped segment. */
export function distancePointToSegment2d(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if(lenSq > 1e-12){
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return Math.hypot(px - cx, py - cy);
}

/**
 * Nearby non-transition walk edge normals within `radius` of `point`.
 * Dedupes near-parallel duplicates (dot > 0.98).
 */
export function collectBlockingWalkEdgeNormals(
  area: ModuleArea | undefined,
  point: THREE.Vector3,
  radius: number,
  out: THREE.Vector3[] = _scratchNormals
): THREE.Vector3[] {
  out.length = 0;
  if(!area || !point || !(radius > 0)) return out;

  // Slight pad so grazing contacts (live ~ps+0.01) still contribute normals.
  const collectR = radius + 0.05;

  let edges: WalkmeshEdge[] | undefined;
  const candidateSource = (area as {
    getWalkCandidatesForBox?: (
      box: THREE.Box3,
      scratch?: { faces: unknown[]; edges: WalkmeshEdge[]; rooms: unknown[] }
    ) => { edges?: WalkmeshEdge[] };
  }).getWalkCandidatesForBox;

  if(typeof candidateSource === "function"){
    _candSize.set(collectR * 2 + 0.2, collectR * 2 + 0.2, 4);
    _candBox.setFromCenterAndSize(point, _candSize);
    const cands = candidateSource.call(area, _candBox, {
      faces: _candFaces,
      edges: _candEdges,
      rooms: _candRooms,
    });
    edges = cands?.edges;
  }
  if(!edges?.length){
    edges = area.walkEdges as WalkmeshEdge[] | undefined;
  }
  if(!edges?.length) return out;

  for(let i = 0, n = edges.length; i < n; i++){
    const edge = edges[i];
    if(!edge || edge.transition !== -1) continue;
    const line = edge.line;
    if(!line?.start || !line?.end) continue;
    const dist = distancePointToSegment2d(
      point.x,
      point.y,
      line.start.x,
      line.start.y,
      line.end.x,
      line.end.y
    );
    if(dist > collectR) continue;
    const normal = edge.normal;
    if(!normal) continue;
    const nx = normal.x;
    const ny = normal.y;
    const nLen = Math.hypot(nx, ny);
    if(nLen < 1e-8) continue;
    const ux = nx / nLen;
    const uy = ny / nLen;
    let dup = false;
    for(let j = 0; j < out.length; j++){
      if(out[j].x * ux + out[j].y * uy > 0.98){
        dup = true;
        break;
      }
    }
    if(dup) continue;
    out.push(new THREE.Vector3(ux, uy, 0));
  }
  return out;
}

/**
 * Remove into-wall components against all normals (CM collide-and-slide).
 * Writes XY into `out` (z = 0).
 */
export function projectDesiredOntoNormals(
  desiredX: number,
  desiredY: number,
  normals: ReadonlyArray<THREE.Vector3>,
  out: THREE.Vector3,
  iterations = 3
): THREE.Vector3 {
  out.set(desiredX, desiredY, 0);
  if(!normals.length) return out;

  for(let iter = 0; iter < iterations; iter++){
    for(let i = 0; i < normals.length; i++){
      const n = normals[i];
      const nx = n.x;
      const ny = n.y;
      const nLen = Math.hypot(nx, ny);
      if(nLen < 1e-8) continue;
      const ux = nx / nLen;
      const uy = ny / nLen;
      const vn = out.x * ux + out.y * uy;
      if(vn < 0){
        out.x -= ux * vn;
        out.y -= uy * vn;
      }
    }
  }
  out.z = 0;
  return out;
}
