import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Placeable } from "@engine/module/Placeable";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import { isWalkCheckBlockingFace } from "@engine/pathfinding/walk-check-material-mask";

/**
 * CM-style wall slide helpers: collect nearby blocking walkmesh edge normals
 * and multi-project desired motion (Gauss-Seidel). Used by PlayerControl so
 * perimeter vertices do not inherit bad mesh corner normals.
 *
 * Also collects placeable PWK face-edge XY normals (many PWKs have no walkEdges).
 */

const _candBox = new THREE.Box3();
const _candSize = new THREE.Vector3();
const _candEdges: WalkmeshEdge[] = [];
const _candFaces: unknown[] = [];
const _candRooms: unknown[] = [];
const _scratchNormals: THREE.Vector3[] = [];
const _worldA = new THREE.Vector3();
const _worldB = new THREE.Vector3();
const _worldC = new THREE.Vector3();

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

/** Outward XY normal for a mesh edge, oriented away from `ref`. */
function outwardEdgeNormal2d(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  refX: number,
  refY: number,
  out: THREE.Vector3
): boolean {
  let ex = bx - ax;
  let ey = by - ay;
  const el = Math.hypot(ex, ey);
  if(el < 1e-8) return false;
  ex /= el;
  ey /= el;
  let nx = -ey;
  let ny = ex;
  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  if((refX - mx) * nx + (refY - my) * ny < 0){
    nx = -nx;
    ny = -ny;
  }
  out.set(nx, ny, 0);
  return true;
}

function pushUniqueNormal(
  out: THREE.Vector3[],
  ux: number,
  uy: number
): void {
  const nLen = Math.hypot(ux, uy);
  if(nLen < 1e-8) return;
  const nx = ux / nLen;
  const ny = uy / nLen;
  for(let j = 0; j < out.length; j++){
    if(out[j].x * nx + out[j].y * ny > 0.98){
      return;
    }
  }
  out.push(new THREE.Vector3(nx, ny, 0));
}

function collectPlaceableFaceEdgeNormals(
  area: Area,
  point: THREE.Vector3,
  collectR: number,
  out: THREE.Vector3[]
): void {
  const placeables = area.placeables as Placeable[] | undefined;
  if(!placeables?.length) return;

  const _n = new THREE.Vector3();
  for(let i = 0; i < placeables.length; i++){
    const plc = placeables[i];
    if(!plc) continue;
    if(plc.box){
      const minX = plc.box.min.x - collectR;
      const maxX = plc.box.max.x + collectR;
      const minY = plc.box.min.y - collectR;
      const maxY = plc.box.max.y + collectR;
      if(
        point.x < minX || point.x > maxX ||
        point.y < minY || point.y > maxY
      ){
        continue;
      }
    }
    const sync = (plc as { syncWalkmeshMatrix?: () => void }).syncWalkmeshMatrix;
    if(typeof sync === "function") sync.call(plc);

    const wok = plc.collisionManager?.walkmesh;
    const faces = wok?.faces;
    if(!faces?.length) continue;
    const mw = wok.matrixWorld ?? wok.mesh?.matrixWorld;

    for(let f = 0; f < faces.length; f++){
      const face = faces[f] as OdysseyFace3;
      if(!isWalkCheckBlockingFace(face)) continue;
      const verts = wok.vertices;
      if(!verts) continue;
      const ia = face.a;
      const ib = face.b;
      const ic = face.c;
      const va = verts[ia];
      const vb = verts[ib];
      const vc = verts[ic];
      if(!va || !vb || !vc) continue;

      if(mw){
        _worldA.copy(va).applyMatrix4(mw);
        _worldB.copy(vb).applyMatrix4(mw);
        _worldC.copy(vc).applyMatrix4(mw);
      }else{
        _worldA.copy(va);
        _worldB.copy(vb);
        _worldC.copy(vc);
      }

      const edges: [THREE.Vector3, THREE.Vector3][] = [
        [_worldA, _worldB],
        [_worldB, _worldC],
        [_worldC, _worldA],
      ];
      for(let e = 0; e < 3; e++){
        const a = edges[e][0];
        const b = edges[e][1];
        const dist = distancePointToSegment2d(
          point.x, point.y, a.x, a.y, b.x, b.y
        );
        if(dist > collectR) continue;
        // Prefer face XY normal when present; else edge-derived outward.
        const fn = face.normal;
        if(fn && (Math.abs(fn.x) > 1e-6 || Math.abs(fn.y) > 1e-6)){
          if(mw){
            _n.set(fn.x, fn.y, 0).transformDirection(mw);
            pushUniqueNormal(out, _n.x, _n.y);
          }else{
            pushUniqueNormal(out, fn.x, fn.y);
          }
        }else if(
          outwardEdgeNormal2d(a.x, a.y, b.x, b.y, point.x, point.y, _n)
        ){
          pushUniqueNormal(out, _n.x, _n.y);
        }
      }
    }
  }
}

/**
 * Nearby non-transition walk edge normals within `radius` of `point`.
 * Dedupes near-parallel duplicates (dot > 0.98).
 * Includes placeable PWK blocking-face edge normals.
 */
export function collectBlockingWalkEdgeNormals(
  area: Area | undefined,
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
  if(edges?.length){
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
      pushUniqueNormal(out, normal.x, normal.y);
    }
  }

  collectPlaceableFaceEdgeNormals(area, point, collectR, out);
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
