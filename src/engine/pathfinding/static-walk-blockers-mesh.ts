import * as THREE from "three";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";
import {
  WalkHitKind,
  type WalkHitInfo,
} from "@engine/pathfinding/walk-hit-info";
import { isWalkCheckBlockingFace } from "@engine/pathfinding/walk-check-material-mask";

/**
 * Approximate static walk blockers
 * static walk blockers (room).
 *
 * : personal-space stadium corridor vs walk-check
 * faces — IntersectLineSegments2d × stadium edges, IntersectCircle2d ends,
 * interior containment.
 *
 * @file static-walk-blockers-mesh.ts
 */

export type StaticWalkBlockersMeshResult = {
  clear: boolean;
};

const _sample = new THREE.Vector3();
const _queryBox = new THREE.Box3();
const _queryMin = new THREE.Vector3();
const _queryMax = new THREE.Vector3();
const _faceScratch: OdysseyFace3[] = [];
/** Placeable getFacesInBox output — separate from room candidate scratch. */
const _placeableFaceScratch: OdysseyFace3[] = [];

function isBlockingFace(face: OdysseyFace3 | undefined): boolean {
  return isWalkCheckBlockingFace(face);
}

function meshFaces(wok: OdysseyWalkMesh | undefined): OdysseyFace3[] | undefined {
  if(!wok) return undefined;
  return wok.faces?.length ? wok.faces : undefined;
}

function facesInQueryBox(
  wok: OdysseyWalkMesh | undefined,
  queryBox: THREE.Box3,
  scratch: OdysseyFace3[]
): OdysseyFace3[] | undefined {
  if(!wok) return undefined;
  if(typeof wok.getFacesInBox === 'function'){
    return wok.getFacesInBox(queryBox, scratch);
  }
  return meshFaces(wok);
}

/**
 * Approximate collision mesh IntersectCircle2d
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
 * Approximate IntersectLineSegments2d — true if segments cross in 2D.
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
 * True when the start point lies on the face footprint (stuck inside).
 */
function startInteriorOnFace(
  face: OdysseyFace3,
  ax: number, ay: number, az: number
): boolean {
  _sample.set(ax, ay, az);
  return !!face.pointInFace2d?.(_sample);
}

/**
 * True when the start personal-space circle intersects any face edge.
 * Used with softClearStartOverlap so a capsule already wedged against a PWK
 * can leave via dest-only tests (corridor distSegSeg would otherwise clearT=0).
 * Uses a small graze pad so near-contacts (gap ≈ 2*r) still soft-clear.
 */
function startCircleTouchesFace(
  face: OdysseyFace3,
  ax: number,
  ay: number,
  radius: number
): boolean {
  const verts = faceVerts(face);
  if(!verts) return false;
  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [verts[0], verts[1]], [verts[1], verts[2]], [verts[2], verts[0]],
  ];
  const touchR = radius + 0.05;
  for(let e = 0; e < 3; e++){
    const va = edges[e][0];
    const vb = edges[e][1];
    if(intersectCircle2d(ax, ay, touchR, va.x, va.y, vb.x, vb.y) > 0){
      return true;
    }
  }
  return false;
}

/**
 * XY contact normal for Edge hits. Flat PWK faces (plc_desk1) often have
 * zero/Z-up face normals — PlayerControl slide needs an outward XY normal or
 * projectOntoTangent cancels all motion against −desired fallback.
 */
function fillEdgeHitNormal(
  hit: WalkHitInfo,
  face: OdysseyFace3,
  va: THREE.Vector3,
  vb: THREE.Vector3,
  refX: number,
  refY: number
): void {
  const fn = face.normal;
  if(fn && (Math.abs(fn.x) > 1e-6 || Math.abs(fn.y) > 1e-6)){
    hit.normal.copy(fn);
    return;
  }
  let ex = vb.x - va.x;
  let ey = vb.y - va.y;
  const el = Math.hypot(ex, ey);
  if(el < 1e-8){
    hit.normal.set(0, 0, 1);
    return;
  }
  ex /= el;
  ey /= el;
  let nx = -ey;
  let ny = ex;
  const mx = (va.x + vb.x) * 0.5;
  const my = (va.y + vb.y) * 0.5;
  if((refX - mx) * nx + (refY - my) * ny < 0){
    nx = -nx;
    ny = -ny;
  }
  hit.normal.set(nx, ny, 0);
}

/** Dest-only face hit (escape when start already sits on a mesh footprint). */
function destOnlyHitsFace(
  face: OdysseyFace3,
  bx: number, by: number, bz: number,
  radius: number,
  hit?: WalkHitInfo
): boolean {
  const verts = faceVerts(face);
  if(!verts) return false;
  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [verts[0], verts[1]], [verts[1], verts[2]], [verts[2], verts[0]],
  ];
  const destR = radius + 0.001;
  for(let e = 0; e < 3; e++){
    const va = edges[e][0];
    const vb = edges[e][1];
    if(intersectCircle2d(bx, by, destR, va.x, va.y, vb.x, vb.y) > 0){
      if(hit){
        hit.kind = WalkHitKind.Edge;
        hit.hitPoint.set(bx, by, bz);
        hit.edgeA = va.clone();
        hit.edgeB = vb.clone();
        fillEdgeHitNormal(hit, face, va, vb, bx, by);
      }
      return true;
    }
  }
  _sample.set(bx, by, bz);
  if(face.pointInFace2d?.(_sample)){
    if(hit){
      hit.kind = WalkHitKind.Interior;
      face.triangle?.closestPointToPoint?.(_sample, hit.hitPoint);
      if(face.normal) hit.normal.copy(face.normal);
      else hit.normal.set(0, 0, 1);
    }
    return true;
  }
  return false;
}

function corridorHitsFace(
  face: OdysseyFace3,
  ax: number, ay: number, bx: number, by: number,
  az: number, bz: number,
  radius: number,
  hit?: WalkHitInfo,
  softClearStartOverlap = false
): boolean {
  const verts = faceVerts(face);
  if(!verts) return false;
  const [v0, v1, v2] = verts;
  const edges: [THREE.Vector3, THREE.Vector3][] = [
    [v0, v1], [v1, v2], [v2, v0],
  ];

  const startR = radius;
  const destR = radius + 0.001;
  const stadium = buildStadiumEdges(ax, ay, bx, by, radius);

  for(let e = 0; e < 3; e++){
    const va = edges[e][0];
    const vb = edges[e][1];
    // Soft start-circle: already in contact can still probe slide/leave steps.
    // Dest + stadium still hard-block so placeables remain solid.
    if(!softClearStartOverlap){
      if(intersectCircle2d(ax, ay, startR, va.x, va.y, vb.x, vb.y) > 0){
        if(hit){
          hit.kind = WalkHitKind.Edge;
          hit.hitPoint.set(ax, ay, az);
          hit.edgeA = va.clone();
          hit.edgeB = vb.clone();
          fillEdgeHitNormal(hit, face, va, vb, ax, ay);
        }
        return true;
      }
    }
    if(intersectCircle2d(bx, by, destR, va.x, va.y, vb.x, vb.y) > 0){
      if(hit){
        hit.kind = WalkHitKind.Edge;
        hit.hitPoint.set(bx, by, bz);
        hit.edgeA = va.clone();
        hit.edgeB = vb.clone();
        fillEdgeHitNormal(hit, face, va, vb, ax, ay);
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
          fillEdgeHitNormal(hit, face, va, vb, ax, ay);
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
        fillEdgeHitNormal(hit, face, va, vb, ax, ay);
      }
      return true;
    }
  }

  const steps = 4;
  for(let i = softClearStartOverlap ? 1 : 0; i <= steps; i++){
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
 * True when `from` is interior to or within personal-space of any blocking face
 * on this walkmesh (WorldToLocal aware). Used to force dest-only across all
 * placeables when wedged between multiple props.
 */
export function walkMeshHasStartOverlap(
  wok: OdysseyWalkMesh | undefined,
  from: THREE.Vector3,
  options: {
    personalSpace?: number;
    blockAllFaces?: boolean;
    faceStartIndex?: number;
  } = {}
): boolean {
  const faces = meshFaces(wok);
  if(!faces?.length) return false;

  let ax = from.x, ay = from.y, az = from.z;
  const mw = wok!.matrixWorld ?? wok!.mesh?.matrixWorld;
  if(mw){
    _invMatrix.copy(mw).invert();
    _localFrom.copy(from).applyMatrix4(_invMatrix);
    ax = _localFrom.x; ay = _localFrom.y; az = _localFrom.z;
  }

  const radius = Math.max(0.05, options.personalSpace ?? 0.5);
  const blockAll = !!options.blockAllFaces;
  const start = Math.max(0, options.faceStartIndex ?? 0);
  for(let i = start, len = faces.length; i < len; i++){
    const face = faces[i];
    if(!blockAll && !isBlockingFace(face)) continue;
    if(
      startInteriorOnFace(face, ax, ay, az) ||
      startCircleTouchesFace(face, ax, ay, radius)
    ){
      return true;
    }
  }
  return false;
}

/**
 * Test a single walkmesh (door / placeable surface) against the stadium corridor.
 * Applies WorldToLocal when `matrixWorld` is set — door DWK verts stay in
 * BWM local space; matrix is T(obj) * R * T(header.position).
 *
 * `faceStartIndex`: skip faces below walkable/adjacency count (collision mesh
 * non-walk face range). Doors with adjacency 0 still test all Nonwalk faces.
 *
 * `blockAllFaces`: optional override to ignore walk-check bits (legacy).
 */
export function isStaticWalkClearOnWalkMesh(
  wok: OdysseyWalkMesh | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    personalSpace?: number;
    hit?: WalkHitInfo;
    blockAllFaces?: boolean;
    faceStartIndex?: number;
    /** Skip start-circle / enable interior escape (PlayerControl collide-and-slide). */
    softClearStartOverlap?: boolean;
    /**
     * Force dest-only tests even when this mesh does not touch the start
     * capsule. Used by area queries when any sibling placeable already overlaps
     * so corridor tests against neighbors cannot clearT=0 the escape.
     */
    forceDestOnly?: boolean;
  } = {}
): StaticWalkBlockersMeshResult {
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
  const start = Math.max(0, options.faceStartIndex ?? 0);
  const softStart = !!options.softClearStartOverlap;

  // Soft-start escape: if start is interior OR the capsule already touches a
  // blocking edge, only require dest clear. Otherwise distSegSeg / stadium keep
  // clearT=0 forever when wedged between placeables (gap < 2*radius).
  // forceDestOnly: sibling placeable already overlaps — treat this mesh the same.
  let startOverlapping = !!options.forceDestOnly;
  if(softStart && !startOverlapping){
    for(let i = start, len = faces.length; i < len; i++){
      const face = faces[i];
      if(!blockAll && !isBlockingFace(face)) continue;
      if(
        startInteriorOnFace(face, ax, ay, az) ||
        startCircleTouchesFace(face, ax, ay, radius)
      ){
        startOverlapping = true;
        break;
      }
    }
  }

  for(let i = start, len = faces.length; i < len; i++){
    const face = faces[i];
    if(!blockAll && !isBlockingFace(face)) continue;
    if(!faceOverlapsCorridorAabb(face, minX, maxX, minY, maxY)) continue;
    const blocked = startOverlapping
      ? destOnlyHitsFace(face, bx, by, bz, radius, hit)
      : corridorHitsFace(face, ax, ay, bx, by, az, bz, radius, hit, softStart);
    if(blocked){
      // Hit point / normal are in local space — map back to world for callers
      if(hit && mw){
        if(hit.hitPoint) hit.hitPoint.applyMatrix4(mw);
        hit.normal.transformDirection(mw);
        if(hit.edgeA) hit.edgeA.applyMatrix4(mw);
        if(hit.edgeB) hit.edgeB.applyMatrix4(mw);
      }
      return { clear: false };
    }
  }
  return { clear: true };
}

/**
 * Test personal-space corridor along from→to for walk-check mesh hits.
 */
export function isStaticWalkClearOnAreaMesh(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    personalSpace?: number;
    hit?: WalkHitInfo;
    /** Kept for API compat; geometry path no longer depends on dense samples. */
    steps?: number;
  } = {}
): StaticWalkBlockersMeshResult {
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

  // Room walk-check faces via area frame cache + per-wok AABB (not a full room loop).
  // walkFacesOnly:false — blockers are walkCheck && !walk; edges unused here.
  if(typeof area.getWalkCandidatesForBox === 'function' && area.rooms?.length){
    const { faces } = area.getWalkCandidatesForBox(
      queryBox,
      { faces: _faceScratch },
      { edges: false, walkFacesOnly: false }
    );
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

  const placeables = area.placeables;
  if(placeables?.length){
    for(let p = 0; p < placeables.length; p++){
      const plc = placeables[p];
      if(!plc?.isStatic?.() && !plc?.collisionManager?.walkmesh) continue;
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
      const faces = facesInQueryBox(
        plc.collisionManager?.walkmesh,
        queryBox,
        _placeableFaceScratch
      );
      if(!faces?.length) continue;
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
