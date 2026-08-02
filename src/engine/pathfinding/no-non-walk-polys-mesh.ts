import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { OdysseyFace3 } from "@/three/odyssey";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import {
  WalkHitKind,
  type WalkHitInfo,
} from "@/engine/pathfinding/walk-hit-info";
import { isWalkCheckBlockingFace } from "@/engine/pathfinding/walk-check-material-mask";

/**
 * Approximate CSWCollisionMesh::NoNonWalkPolys @ 005972b0 /
 * CSWSRoom::NoNonWalkPolysOnRoom @ 00579680.
 *
 * Retail (Ghidra-validated): personal-space stadium corridor vs walk-check
 * faces — IntersectLineSegments2d × stadium edges, IntersectCircle2d ends,
 * interior containment.
 *
 * @file no-non-walk-polys-mesh.ts
 */

export type NoNonWalkMeshResult = {
  clear: boolean;
};

const _sample = new THREE.Vector3();
const _queryBox = new THREE.Box3();
const _queryMin = new THREE.Vector3();
const _queryMax = new THREE.Vector3();
const _faceScratch: OdysseyFace3[] = [];

function isBlockingFace(face: OdysseyFace3 | undefined): boolean {
  return isWalkCheckBlockingFace(face);
}

function meshFaces(wok: OdysseyWalkMesh | undefined): OdysseyFace3[] | undefined {
  if(!wok) return undefined;
  return wok.faces?.length ? wok.faces : undefined;
}

/**
 * Approximate CSWCollisionMesh IntersectCircle2d @ 004aab50 —
 * circle-segment intersections in 2D (return count 0/1/2).
 */
export function intersectCircle2d(
  centerX: number,
  centerY: number,
  radius: number,
  ax: number, ay: number,
  bx: number, by: number,
  out1?: { x: number; y: number },
  out2?: { x: number; y: number }
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const fx = ax - centerX;
  const fy = ay - centerY;
  const a = dx * dx + dy * dy;
  if(a < 1e-12){
    const d = Math.hypot(fx, fy);
    if(Math.abs(d - radius) < 1e-4){
      if(out1){ out1.x = ax; out1.y = ay; }
      return 1;
    }
    return 0;
  }
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radius * radius;
  const disc = b * b - 4 * a * c;
  if(disc < 0) return 0;
  if(disc === 0){
    const t = -b / (2 * a);
    if(t >= 0 && t <= 1){
      if(out1){ out1.x = ax + dx * t; out1.y = ay + dy * t; }
      return 1;
    }
    return 0;
  }
  const sqrtD = Math.sqrt(disc);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);
  let n = 0;
  if(t1 >= 0 && t1 <= 1){
    if(out1){ out1.x = ax + dx * t1; out1.y = ay + dy * t1; }
    n++;
  }
  if(t2 >= 0 && t2 <= 1){
    const o = n === 0 ? out1 : out2;
    if(o){ o.x = ax + dx * t2; o.y = ay + dy * t2; }
    n++;
  }
  return n;
}

/** Distance from point P to segment AB in 2D. */
function distPointSeg2D(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = abx * abx + aby * aby;
  if(abLenSq < 1e-12) return Math.hypot(apx, apy);
  let t = (apx * abx + apy * aby) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

/** Closest distance between segments AB and CD in 2D. */
function distSegSeg2D(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): number {
  let best = distPointSeg2D(ax, ay, cx, cy, dx, dy);
  best = Math.min(best, distPointSeg2D(bx, by, cx, cy, dx, dy));
  best = Math.min(best, distPointSeg2D(cx, cy, ax, ay, bx, by));
  best = Math.min(best, distPointSeg2D(dx, dy, ax, ay, bx, by));
  if(intersectLineSegments2d(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
  return best;
}

/**
 * Approximate IntersectLineSegments2d @ 004ac340 — true if segments cross in 2D.
 */
export function intersectLineSegments2d(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const abx = bx - ax, aby = by - ay;
  const cdx = dx - cx, cdy = dy - cy;
  const det = abx * cdy - cdx * aby;
  if(Math.abs(det) < 1e-12) return false;
  const acx = cx - ax, acy = cy - ay;
  const t = (acx * cdy - cdx * acy) / det;
  const u = (acx * aby - abx * acy) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

type StadiumEdge = { ax: number; ay: number; bx: number; by: number };

/** Personal-space inflated travel strip (stadium / capsule outline). */
function buildStadiumEdges(
  ax: number, ay: number, bx: number, by: number, radius: number
): StadiumEdge[] {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if(len < 1e-8) return [];
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy * radius;
  const py = ux * radius;
  const sx = ax - ux * radius;
  const sy = ay - uy * radius;
  const ex = bx + ux * radius;
  const ey = by + uy * radius;
  const c0x = sx + px, c0y = sy + py;
  const c1x = ex + px, c1y = ey + py;
  const c2x = ex - px, c2y = ey - py;
  const c3x = sx - px, c3y = sy - py;
  return [
    { ax: c0x, ay: c0y, bx: c1x, by: c1y },
    { ax: c1x, ay: c1y, bx: c2x, by: c2y },
    { ax: c2x, ay: c2y, bx: c3x, by: c3y },
    { ax: c3x, ay: c3y, bx: c0x, by: c0y },
  ];
}

function faceVerts(face: OdysseyFace3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] | undefined {
  const wm = face.walkmesh;
  if(!wm?.vertices) return undefined;
  const a = wm.vertices[face.a];
  const b = wm.vertices[face.b];
  const c = wm.vertices[face.c];
  if(!a || !b || !c) return undefined;
  return [a, b, c];
}

/**
 * Retail NoNonWalkPolys stadium vs triangle (@ 005972b0):
 * IntersectLineSegments2d × stadium edges, IntersectCircle2d ends, interior samples.
 */
function corridorHitsFace(
  face: OdysseyFace3,
  ax: number, ay: number, bx: number, by: number,
  az: number, bz: number,
  radius: number,
  hit?: WalkHitInfo
): boolean {
  const verts = faceVerts(face);
  if(!verts) return false;
  const [v0, v1, v2] = verts;
  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [v0, v1], [v1, v2], [v2, v0],
  ];
  const stadium = buildStadiumEdges(ax, ay, bx, by, radius);

  const startR = radius;
  const destR = radius + 0.001;
  for(let e = 0; e < 3; e++){
    const va = edges[e][0];
    const vb = edges[e][1];
    if(intersectCircle2d(ax, ay, startR, va.x, va.y, vb.x, vb.y) > 0){
      if(hit){
        hit.kind = WalkHitKind.Edge;
        hit.hitPoint.set(ax, ay, az);
        hit.edgeA = va.clone();
        hit.edgeB = vb.clone();
        if(face.normal) hit.normal.copy(face.normal);
        else hit.normal.set(0, 0, 1);
      }
      return true;
    }
    if(intersectCircle2d(bx, by, destR, va.x, va.y, vb.x, vb.y) > 0){
      if(hit){
        hit.kind = WalkHitKind.Edge;
        hit.hitPoint.set(bx, by, bz);
        hit.edgeA = va.clone();
        hit.edgeB = vb.clone();
        if(face.normal) hit.normal.copy(face.normal);
        else hit.normal.set(0, 0, 1);
      }
      return true;
    }
  }

  for(let e = 0; e < 3; e++){
    const va = edges[e][0];
    const vb = edges[e][1];
    for(let s = 0; s < stadium.length; s++){
      const st = stadium[s];
      if(intersectLineSegments2d(va.x, va.y, vb.x, vb.y, st.ax, st.ay, st.bx, st.by)){
        if(hit){
          hit.kind = WalkHitKind.Edge;
          hit.edgeA = va.clone();
          hit.edgeB = vb.clone();
          hit.hitPoint.set((va.x + vb.x) * 0.5, (va.y + vb.y) * 0.5, (az + bz) * 0.5);
          if(face.normal) hit.normal.copy(face.normal);
          else hit.normal.set(0, 0, 1);
        }
        return true;
      }
    }
    if(distSegSeg2D(ax, ay, bx, by, va.x, va.y, vb.x, vb.y) < radius){
      if(hit){
        hit.kind = WalkHitKind.Edge;
        hit.edgeA = va.clone();
        hit.edgeB = vb.clone();
        hit.hitPoint.set((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
        if(face.normal) hit.normal.copy(face.normal);
        else hit.normal.set(0, 0, 1);
      }
      return true;
    }
  }

  const steps = 4;
  for(let i = 0; i <= steps; i++){
    const t = i / steps;
    _sample.set(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
    if(face.pointInFace2d(_sample)){
      if(hit){
        hit.kind = WalkHitKind.Interior;
        face.triangle.closestPointToPoint(_sample, hit.hitPoint);
        if(face.normal) hit.normal.copy(face.normal);
        else hit.normal.set(0, 0, 1);
      }
      return true;
    }
  }

  return false;
}

function faceOverlapsCorridorAabb(
  face: OdysseyFace3,
  minX: number, maxX: number,
  minY: number, maxY: number
): boolean {
  const verts = faceVerts(face);
  if(!verts) return true; // can't cull
  let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
  for(let i = 0; i < 3; i++){
    const v = verts[i];
    fMinX = Math.min(fMinX, v.x);
    fMaxX = Math.max(fMaxX, v.x);
    fMinY = Math.min(fMinY, v.y);
    fMaxY = Math.max(fMaxY, v.y);
  }
  return !(fMaxX < minX || fMinX > maxX || fMaxY < minY || fMinY > maxY);
}

const _localFrom = new THREE.Vector3();
const _localTo = new THREE.Vector3();
const _invMatrix = new THREE.Matrix4();

/**
 * Test a single walkmesh (door / placeable surface) against the stadium corridor.
 * Applies WorldToLocal (@ 00596a00) when `matrixWorld` is set — retail door mesh
 * stores verts in object space after obj_position_/orientation.
 *
 * `blockAllFaces`: door meshes often lack walkcheck bits — treat every face as blocking
 * (retail door surface mesh is dedicated collision geo).
 */
export function noNonWalkPolysOnWalkMesh(
  wok: OdysseyWalkMesh | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    personalSpace?: number;
    hit?: WalkHitInfo;
    blockAllFaces?: boolean;
  } = {}
): NoNonWalkMeshResult {
  const faces = meshFaces(wok);
  if(!faces?.length) return { clear: true };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if(dist < 1e-8) return { clear: true };

  // WorldToLocal: query in mesh/object space when matrixWorld is present
  let ax = from.x, ay = from.y, az = from.z;
  let bx = to.x, by = to.y, bz = to.z;
  const mw = wok.matrixWorld ?? wok.mesh?.matrixWorld;
  if(mw){
    _invMatrix.copy(mw).invert();
    _localFrom.copy(from).applyMatrix4(_invMatrix);
    _localTo.copy(to).applyMatrix4(_invMatrix);
    ax = _localFrom.x; ay = _localFrom.y; az = _localFrom.z;
    bx = _localTo.x; by = _localTo.y; bz = _localTo.z;
  }

  const perspace = options.personalSpace ?? 0.5;
  const radius = Math.max(0.05, perspace);
  const hit = options.hit;
  const expand = radius + 0.05;
  const minX = Math.min(ax, bx) - expand;
  const maxX = Math.max(ax, bx) + expand;
  const minY = Math.min(ay, by) - expand;
  const maxY = Math.max(ay, by) + expand;
  const blockAll = !!options.blockAllFaces;

  for(let i = 0, len = faces.length; i < len; i++){
    const face = faces[i];
    if(!blockAll && !isBlockingFace(face)) continue;
    if(!faceOverlapsCorridorAabb(face, minX, maxX, minY, maxY)) continue;
    if(corridorHitsFace(face, ax, ay, bx, by, az, bz, radius, hit)){
      // Hit point is in local space — map back to world for callers
      if(hit?.hitPoint && mw){
        hit.hitPoint.applyMatrix4(mw);
      }
      return { clear: false };
    }
  }
  return { clear: true };
}

/**
 * Test personal-space corridor along from→to for walk-check mesh hits.
 */
export function noNonWalkPolysOnAreaMesh(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    personalSpace?: number;
    hit?: WalkHitInfo;
    /** Kept for API compat; geometry path no longer depends on dense samples. */
    steps?: number;
  } = {}
): NoNonWalkMeshResult {
  if(!area) return { clear: true };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  if(dist < 1e-8) return { clear: true };

  const perspace = options.personalSpace ?? 0.5;
  const radius = Math.max(0.05, perspace);
  const hit = options.hit;
  const expand = radius + 0.05;
  const minX = Math.min(from.x, to.x) - expand;
  const maxX = Math.max(from.x, to.x) + expand;
  const minY = Math.min(from.y, to.y) - expand;
  const maxY = Math.max(from.y, to.y) + expand;

  const queryBox = _queryBox.set(
    _queryMin.set(minX, minY, Math.min(from.z, to.z) - expand),
    _queryMax.set(maxX, maxY, Math.max(from.z, to.z) + expand)
  );

  const rooms = area.rooms;
  if(rooms?.length){
    for(let r = 0; r < rooms.length; r++){
      const room = rooms[r];
      const wok =
        room.collisionManager?.walkmesh ??
        (room as { model?: { wok?: OdysseyWalkMesh } }).model?.wok;
      const faces = wok?.getFacesInBox ? wok.getFacesInBox(queryBox, _faceScratch) : meshFaces(wok);
      if(!faces?.length) continue;
      for(let i = 0, len = faces.length; i < len; i++){
        const face = faces[i];
        if(!isBlockingFace(face)) continue;
        if(!faceOverlapsCorridorAabb(face, minX, maxX, minY, maxY)) continue;
        if(corridorHitsFace(
          face, from.x, from.y, to.x, to.y, from.z, to.z, radius, hit
        )){
          return { clear: false };
        }
      }
    }
  }

  const placeables = area.placeables;
  if(placeables?.length){
    for(let p = 0; p < placeables.length; p++){
      const plc = placeables[p];
      if(!plc?.isStatic?.() && !plc?.collisionManager?.walkmesh) continue;
      const faces = meshFaces(plc.collisionManager?.walkmesh);
      if(!faces?.length) continue;
      if(plc.box){
        if(
          maxX < plc.box.min.x - expand ||
          minX > plc.box.max.x + expand ||
          maxY < plc.box.min.y - expand ||
          minY > plc.box.max.y + expand
        ){
          continue;
        }
      }
      for(let i = 0, len = faces.length; i < len; i++){
        const face = faces[i];
        if(!isBlockingFace(face)) continue;
        if(!faceOverlapsCorridorAabb(face, minX, maxX, minY, maxY)) continue;
        if(corridorHitsFace(
          face, from.x, from.y, to.x, to.y, from.z, to.z, radius, hit
        )){
          if(hit) hit.objectId = plc.id;
          return { clear: false };
        }
      }
    }
  }

  return { clear: true };
}
