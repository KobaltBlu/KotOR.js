import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Placeable } from "@engine/module/Placeable";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import { isWalkCheckBlockingFace } from "@engine/pathfinding/walk-check-material-mask";

/**
 * CM-style wall slide helpers: collect nearby blocking walkmesh edge normals
 * and project desired motion onto the free region they bound (exact 2D
 * constraint projection). Used by the collide-and-slide solver so perimeter
 * vertices do not inherit bad mesh corner normals.
 *
 * Also collects placeable PWK boundary-edge XY normals (many PWKs have no
 * walkEdges).
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
const _worldVerts = [_worldA, _worldB, _worldC];
const _edgeN = new THREE.Vector3();
const _contactN = new THREE.Vector3();

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

const _closest = { x: 0, y: 0, t: 0, dist: 0 };

/** Closest point on clamped segment (writes module scratch `_closest`). */
function closestOnSegment2d(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): typeof _closest {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if(lenSq > 1e-12){
    t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  _closest.x = ax + dx * t;
  _closest.y = ay + dy * t;
  _closest.t = t;
  _closest.dist = Math.hypot(px - _closest.x, py - _closest.y);
  return _closest;
}

/** Signed-side slack for points numerically just behind a wall line. */
const BEHIND_EDGE_TOLERANCE = 0.02;

/**
 * Capsule-vs-segment contact normal for a wall edge with face normal (nx, ny).
 * - Point behind the wall line (beyond tolerance): returns false — the edge
 *   only constrains motion from its front side (avoids phantom normals from
 *   the far edge of a reflex/pillar corner).
 * - Closest point at an endpoint: normal is vertex→point, so creatures round
 *   corners instead of hitting an invisible extension of the wall.
 * - Otherwise: the edge normal.
 */
/** Distance from point to the edge, set by the last edgeContactNormal(). */
let _lastContactDist = 0;

function edgeContactNormal(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  out: THREE.Vector3
): boolean {
  const nLen = Math.hypot(nx, ny);
  if(nLen < 1e-8) return false;
  nx /= nLen;
  ny /= nLen;
  const signed = (px - ax) * nx + (py - ay) * ny;
  if(signed < -BEHIND_EDGE_TOLERANCE) return false;
  const c = closestOnSegment2d(px, py, ax, ay, bx, by);
  _lastContactDist = c.dist;
  const atEnd = c.t <= 1e-6 || c.t >= 1 - 1e-6;
  if(atEnd && c.dist > 1e-4){
    const vx = (px - c.x) / c.dist;
    const vy = (py - c.y) / c.dist;
    if(vx * nx + vy * ny > 0){
      out.set(vx, vy, 0);
      return true;
    }
  }
  out.set(nx, ny, 0);
  return true;
}

/**
 * Unit XY normal of edge a→b oriented so `ref` is on its positive side
 * (points toward `ref`). Returns false for degenerate edges.
 */
export function outwardEdgeNormal2d(
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

/** Vector pool per output array so per-frame collection does not allocate. */
const _pools = new WeakMap<THREE.Vector3[], THREE.Vector3[]>();

/** Optional per-normal contact distance sink for the active collection. */
let _distSink: number[] | undefined;

function pushUniqueNormal(
  out: THREE.Vector3[],
  ux: number,
  uy: number,
  dist = 0
): void {
  const nLen = Math.hypot(ux, uy);
  if(nLen < 1e-8) return;
  const nx = ux / nLen;
  const ny = uy / nLen;
  for(let j = 0; j < out.length; j++){
    if(out[j].x * nx + out[j].y * ny > 0.98){
      // Near-parallel duplicate: keep the closest contact.
      if(_distSink && dist < _distSink[j]) _distSink[j] = dist;
      return;
    }
  }
  _distSink?.push(dist);
  let pool = _pools.get(out);
  if(!pool){
    pool = [];
    _pools.set(out, pool);
  }
  const idx = out.length;
  let v = pool[idx];
  if(!v){
    v = new THREE.Vector3();
    pool[idx] = v;
  }
  out.push(v.set(nx, ny, 0));
}

const _blockingFaceIdx: number[] = [];
const _edgeUseCount = new Map<number, number>();

function edgeKey(i: number, j: number): number {
  return i < j ? i * 65536 + j : j * 65536 + i;
}

/**
 * Placeable PWK blocking-region boundary normals near `point`.
 *
 * PWK blocking faces are (near-)horizontal, so `face.normal` says nothing
 * about the wall direction. Use each *boundary* edge instead (edges shared by
 * two blocking faces are interior and skipped), with the XY normal pointing
 * away from the face's opposite vertex — i.e. out of the blocked footprint.
 */
function collectPlaceableFaceEdgeNormals(
  area: Area,
  point: THREE.Vector3,
  collectR: number,
  out: THREE.Vector3[]
): void {
  const placeables = area.placeables as Placeable[] | undefined;
  if(!placeables?.length) return;

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
    const verts = wok?.vertices;
    if(!faces?.length || !verts) continue;
    const mw = wok.matrixWorld ?? wok.mesh?.matrixWorld;

    // Pass 1: blocking faces + edge use counts (interior edges appear twice).
    _blockingFaceIdx.length = 0;
    _edgeUseCount.clear();
    for(let f = 0; f < faces.length; f++){
      const face = faces[f] as OdysseyFace3;
      if(!isWalkCheckBlockingFace(face)) continue;
      if(!verts[face.a] || !verts[face.b] || !verts[face.c]) continue;
      _blockingFaceIdx.push(f);
      const ka = edgeKey(face.a, face.b);
      const kb = edgeKey(face.b, face.c);
      const kc = edgeKey(face.c, face.a);
      _edgeUseCount.set(ka, (_edgeUseCount.get(ka) ?? 0) + 1);
      _edgeUseCount.set(kb, (_edgeUseCount.get(kb) ?? 0) + 1);
      _edgeUseCount.set(kc, (_edgeUseCount.get(kc) ?? 0) + 1);
    }

    // Pass 2: boundary edges within reach.
    for(let k = 0; k < _blockingFaceIdx.length; k++){
      const face = faces[_blockingFaceIdx[k]] as OdysseyFace3;
      const ia = face.a;
      const ib = face.b;
      const ic = face.c;
      if(mw){
        _worldA.copy(verts[ia]).applyMatrix4(mw);
        _worldB.copy(verts[ib]).applyMatrix4(mw);
        _worldC.copy(verts[ic]).applyMatrix4(mw);
      }else{
        _worldA.copy(verts[ia]);
        _worldB.copy(verts[ib]);
        _worldC.copy(verts[ic]);
      }
      for(let e = 0; e < 3; e++){
        const i0 = e === 0 ? ia : e === 1 ? ib : ic;
        const i1 = e === 0 ? ib : e === 1 ? ic : ia;
        if((_edgeUseCount.get(edgeKey(i0, i1)) ?? 0) > 1) continue;
        const a = _worldVerts[e];
        const b = _worldVerts[(e + 1) % 3];
        const opp = _worldVerts[(e + 2) % 3];
        const dist = distancePointToSegment2d(
          point.x, point.y, a.x, a.y, b.x, b.y
        );
        if(dist > collectR) continue;
        if(!outwardEdgeNormal2d(a.x, a.y, b.x, b.y, opp.x, opp.y, _edgeN)){
          continue;
        }
        // _edgeN points toward the opposite vertex (into the footprint).
        const ox = -_edgeN.x;
        const oy = -_edgeN.y;
        if(edgeContactNormal(
          point.x, point.y, a.x, a.y, b.x, b.y, ox, oy, _contactN
        )){
          pushUniqueNormal(out, _contactN.x, _contactN.y, _lastContactDist);
        }else{
          // Overlapping the footprint: keep the outward edge normal so
          // depenetration still has a direction to push.
          pushUniqueNormal(out, ox, oy, 0);
        }
      }
    }
  }
}

/**
 * Nearby non-transition walk edge normals within `radius` of `point`.
 * Dedupes near-parallel duplicates (dot > 0.98).
 * Includes placeable PWK blocking-region boundary normals.
 */
export function collectBlockingWalkEdgeNormals(
  area: Area | undefined,
  point: THREE.Vector3,
  radius: number,
  out: THREE.Vector3[] = _scratchNormals,
  /** When given, filled in parallel with `out`: distance to each contact. */
  outDistances?: number[]
): THREE.Vector3[] {
  out.length = 0;
  if(outDistances) outDistances.length = 0;
  _distSink = outDistances;
  try{
    collectInto(area, point, radius, out);
  }finally{
    _distSink = undefined;
  }
  return out;
}

function collectInto(
  area: Area | undefined,
  point: THREE.Vector3,
  radius: number,
  out: THREE.Vector3[]
): void {
  if(!area || !point || !(radius > 0)) return;

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
      if(!edgeContactNormal(
        point.x, point.y,
        line.start.x, line.start.y, line.end.x, line.end.y,
        normal.x, normal.y,
        _contactN
      )){
        continue;
      }
      pushUniqueNormal(out, _contactN.x, _contactN.y, _lastContactDist);
    }
  }

  collectPlaceableFaceEdgeNormals(area, point, collectR, out);
}

/** Tolerance so tangent motion along a wall is not rejected by rounding. */
const CONSTRAINT_EPS = 1e-7;

function satisfiesAll(
  vx: number,
  vy: number,
  normals: ReadonlyArray<THREE.Vector3>,
  gaps: ReadonlyArray<number> | undefined
): boolean {
  const scale = Math.max(1, Math.hypot(vx, vy));
  for(let i = 0; i < normals.length; i++){
    const n = normals[i];
    const nLen = Math.hypot(n.x, n.y);
    if(nLen < 1e-8) continue;
    const g = gaps ? Math.max(0, gaps[i] ?? 0) : 0;
    if((vx * n.x + vy * n.y) / nLen < -g - CONSTRAINT_EPS * scale) return false;
  }
  return true;
}

/**
 * Closest XY vector to `desired` inside the free region
 * `{ v : v · nᵢ ≥ −gapᵢ }` (exact 2D collide-and-slide projection).
 *
 * `gaps` (optional, parallel to `normals`) is the clearance to each wall:
 * motion may approach a wall by up to its gap. Omitted / 0 = in contact.
 *
 * The region is a convex polygon containing 0, so the closest point is
 * `desired` itself, a projection onto one boundary line, or a vertex where
 * two boundary lines meet. All candidates are tried and the feasible one
 * nearest to `desired` wins. Writes XY into `out` (z = 0).
 *
 * The fifth argument may be the legacy `iterations` number (ignored).
 */
export function projectDesiredOntoNormals(
  desiredX: number,
  desiredY: number,
  normals: ReadonlyArray<THREE.Vector3>,
  out: THREE.Vector3,
  gaps?: ReadonlyArray<number> | number
): THREE.Vector3 {
  const g = typeof gaps === "number" ? undefined : gaps;
  out.set(desiredX, desiredY, 0);
  if(!normals.length) return out;
  if(satisfiesAll(desiredX, desiredY, normals, g)) return out;

  let bestX = 0;
  let bestY = 0;
  let bestD = desiredX * desiredX + desiredY * desiredY; // candidate v = 0
  const consider = (cx: number, cy: number) => {
    const ex = cx - desiredX;
    const ey = cy - desiredY;
    const d = ex * ex + ey * ey;
    if(d >= bestD) return;
    if(!satisfiesAll(cx, cy, normals, g)) return;
    bestD = d;
    bestX = cx;
    bestY = cy;
  };

  const n = normals.length;
  for(let i = 0; i < n; i++){
    const ni = normals[i];
    const li = Math.hypot(ni.x, ni.y);
    if(li < 1e-8) continue;
    const ux = ni.x / li;
    const uy = ni.y / li;
    const gi = g ? Math.max(0, g[i] ?? 0) : 0;
    // Projection onto the line v·u = −gi.
    const s = desiredX * ux + desiredY * uy + gi;
    if(s < 0) consider(desiredX - ux * s, desiredY - uy * s);

    // Vertices: intersections with every other boundary line.
    for(let j = i + 1; j < n; j++){
      const nj = normals[j];
      const lj = Math.hypot(nj.x, nj.y);
      if(lj < 1e-8) continue;
      const wx = nj.x / lj;
      const wy = nj.y / lj;
      const det = ux * wy - uy * wx;
      if(Math.abs(det) < 1e-9) continue;
      const gj = g ? Math.max(0, g[j] ?? 0) : 0;
      // u·v = −gi, w·v = −gj
      const vx = (-gi * wy + gj * uy) / det;
      const vy = (-ux * gj + wx * gi) / det;
      consider(vx, vy);
    }
  }
  return out.set(bestX, bestY, 0);
}

/**
 * Of `normals`, the one most opposed to motion (dx, dy) — the wall being
 * pushed into hardest. Writes into `out`; returns false when empty.
 */
export function mostOpposingNormal(
  dx: number,
  dy: number,
  normals: ReadonlyArray<THREE.Vector3>,
  out: THREE.Vector3
): boolean {
  let best = -1;
  let bestDot = Infinity;
  for(let i = 0; i < normals.length; i++){
    const d = normals[i].x * dx + normals[i].y * dy;
    if(d < bestDot){
      bestDot = d;
      best = i;
    }
  }
  if(best < 0) return false;
  out.set(normals[best].x, normals[best].y, 0);
  return true;
}
