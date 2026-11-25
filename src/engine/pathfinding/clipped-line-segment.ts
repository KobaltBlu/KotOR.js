import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";

/**
 * Approximate ClippedLineSegmentWalkable
 * (+ clipped line segment exit semantics).
 *
 * Walks walkable faces from origin toward dest via adjacency. Fails when the
 * ray exits through a non-transition WalkmeshEdge (GetAdjacentRoom == -1).
 * Transition edges / next faces continue the walk (area-wide mesh).
 *
 * @file clipped-line-segment.ts
 */

export type ClippedLineSegmentResult = {
  ok: boolean;
  clearPoint: THREE.Vector3;
  /** Approximate fraction along origin→dest of farthest clear point. */
  clearT: number;
  minZ: number;
  maxZ: number;
  /**
   * True when the clip stopped on a known blocking edge; `wallNormal` then
   * holds that edge's XY normal pointing back into the walkable face.
   */
  hasWallNormal: boolean;
  wallNormal: THREE.Vector3;
};

const _hit = new THREE.Vector3();
const _nudge = new THREE.Vector3();
/** Shared result — callers must copy clearPoint before the next call. */
const _clipResult: ClippedLineSegmentResult = {
  ok: true,
  clearPoint: new THREE.Vector3(),
  clearT: 1,
  minZ: 0,
  maxZ: 0,
  hasWallNormal: false,
  wallNormal: new THREE.Vector3(),
};

/** Portal hop distances past the seam (live 07j↔02b needs >5cm). */
const TRANSITION_NUDGE_DISTANCES = [0.05, 0.15, 0.35];

function finishClip(
  ok: boolean,
  clearT: number,
  minZ: number,
  maxZ: number
): ClippedLineSegmentResult {
  _clipResult.ok = ok;
  _clipResult.clearT = clearT;
  _clipResult.minZ = minZ;
  _clipResult.maxZ = maxZ;
  return _clipResult;
}

/**
 * Record the blocking edge va→vb normal, oriented toward `inside` (the
 * opposite vertex of the face being exited — always on the walkable side).
 */
function setWallNormal(
  va: THREE.Vector3,
  vb: THREE.Vector3,
  inside: THREE.Vector3
): void {
  const ex = vb.x - va.x;
  const ey = vb.y - va.y;
  const el = Math.hypot(ex, ey);
  if(el < 1e-8) return;
  let nx = -ey / el;
  let ny = ex / el;
  const mx = (va.x + vb.x) * 0.5;
  const my = (va.y + vb.y) * 0.5;
  if((inside.x - mx) * nx + (inside.y - my) * ny < 0){
    nx = -nx;
    ny = -ny;
  }
  _clipResult.wallNormal.set(nx, ny, 0);
  _clipResult.hasWallNormal = true;
}

function findWalkFaceAt(
  area: Area,
  point: THREE.Vector3
): OdysseyFace3 | undefined {
  const faces = area.walkFaces;
  if(!faces?.length) return undefined;
  for(let i = 0, len = faces.length; i < len; i++){
    const f = faces[i];
    if(f?.pointInFace2d(point)) return f;
  }
  return undefined;
}

const _offMeshNearest = new THREE.Vector3();

/**
 * Start is off the walkmesh (pushed / spawned outside it). Only allow steps
 * that land back on a walk face or move closer to the mesh; anything else
 * is blocked with a normal pointing back toward the mesh so slide solvers
 * steer the creature home instead of letting it roam freely.
 */
function clipFromOffMesh(
  area: Area,
  origin: THREE.Vector3,
  dest: THREE.Vector3
): ClippedLineSegmentResult {
  const clearPoint = _clipResult.clearPoint;
  const destFace = findWalkFaceAt(area, dest);
  if(destFace){
    clearPoint.copy(dest);
    return finishClip(true, 1, origin.z, dest.z);
  }
  if(typeof area.getNearestWalkablePoint !== "function"){
    // Stub areas without a nearest-point query: legacy permissive behaviour.
    return finishClip(true, 0, origin.z, origin.z);
  }
  _offMeshNearest.copy(area.getNearestWalkablePoint(origin, 0));
  const nx = _offMeshNearest.x - origin.x;
  const ny = _offMeshNearest.y - origin.y;
  const dOrigin = Math.hypot(nx, ny);
  const dDest = Math.hypot(_offMeshNearest.x - dest.x, _offMeshNearest.y - dest.y);
  if(dOrigin < 1e-6 || dDest < dOrigin - 1e-6){
    clearPoint.copy(dest);
    return finishClip(true, 1, origin.z, dest.z);
  }
  clearPoint.copy(origin);
  _clipResult.wallNormal.set(nx / dOrigin, ny / dOrigin, 0);
  _clipResult.hasWallNormal = true;
  return finishClip(false, 0, origin.z, origin.z);
}

/**
 * After crossing a transition edge, prefer a walkable face on a different
 * walkmesh than the source. First-match findWalkFaceAt often returns the
 * source room's triangle at the shared seam.
 */
function findWalkFaceBeyondTransition(
  area: Area,
  point: THREE.Vector3,
  sourceFace: OdysseyFace3
): OdysseyFace3 | undefined {
  const faces = area.walkFaces;
  if(!faces?.length) return undefined;
  const sourceWok = sourceFace.walkmesh;
  let sameWokFallback: OdysseyFace3 | undefined;
  for(let i = 0, len = faces.length; i < len; i++){
    const f = faces[i];
    if(!f?.pointInFace2d(point)) continue;
    if(f === sourceFace) continue;
    if(f.walkmesh && sourceWok && f.walkmesh !== sourceWok){
      return f;
    }
    if(!sameWokFallback) sameWokFallback = f;
  }
  return sameWokFallback;
}

/** Duck-type WalkmeshEdge (instanceof can fail across bundle copies). */
function isWalkmeshEdgeAdj(
  adj: unknown
): adj is WalkmeshEdge {
  if(!adj || typeof adj !== "object") return false;
  const e = adj as { transition?: unknown; line?: unknown };
  return typeof e.transition === "number" && !!e.line;
}

function isWalkableFaceAdj(adj: unknown): adj is OdysseyFace3 {
  if(!adj || typeof adj !== "object") return false;
  const f = adj as { pointInFace2d?: unknown; a?: unknown; walkmesh?: unknown };
  return typeof f.pointInFace2d === "function" && f.walkmesh != null && typeof f.a === "number";
}

/**
 * IntersectLineSegments2d — writes intersection into `out`.
 * Inclusive endpoints (clip needs edge hits).
 */
function intersectLineSegments2d(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
  out: THREE.Vector3,
  az: number, bz: number
): boolean {
  const det = (bx - ax) * (dy - cy) - (dx - cx) * (by - ay);
  if(Math.abs(det) < 1e-12) return false;
  const lambda = ((dy - cy) * (dx - ax) + (cx - dx) * (dy - ay)) / det;
  const gamma = ((ay - by) * (dx - ax) + (bx - ax) * (dy - ay)) / det;
  if(lambda < -1e-6 || lambda > 1 + 1e-6 || gamma < -1e-6 || gamma > 1 + 1e-6){
    return false;
  }
  const t = Math.max(0, Math.min(1, lambda));
  out.set(ax + t * (bx - ax), ay + t * (by - ay), az + t * (bz - az));
  return true;
}

/** Dest is outside edge vi→vj when cross < 0 (ClippedLine orientation). */
function destOutsideEdge(
  destX: number, destY: number,
  vx: number, vy: number,
  nx: number, ny: number
): boolean {
  return (destY - vy) * (nx - vx) + (destX - vx) * (vy - ny) < 0;
}

function faceVerts(face: OdysseyFace3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const verts = face.walkmesh.vertices;
  return [verts[face.a], verts[face.b], verts[face.c]];
}

function adjacentForSide(
  face: OdysseyFace3,
  side: 0 | 1 | 2
): OdysseyFace3 | WalkmeshEdge | undefined {
  if(side === 0) return face.adjacentWalkableFaces.a;
  if(side === 1) return face.adjacentWalkableFaces.b;
  return face.adjacentWalkableFaces.c;
}

/**
 * Walk faces origin→dest. Returns ok=false on wall exit or hop budget.
 * When walkmesh is empty, ok=true (caller falls back to samples).
 * Returned clearPoint is scratch — copy before the next call.
 */
export function clippedLineSegmentWalkable(
  area: Area | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    maxHeightDelta?: number;
    /**
     * Frame-step movement: an off-mesh start may only move back onto / toward
     * the walkmesh. Plot-grade queries (pathing LOS) keep the permissive
     * legacy result and rely on their own sample checks.
     */
    strictOffMeshStart?: boolean;
  } = {}
): ClippedLineSegmentResult {
  const clearPoint = _clipResult.clearPoint;
  clearPoint.copy(origin);
  _clipResult.hasWallNormal = false;
  _clipResult.wallNormal.set(0, 0, 0);
  const maxDz = options.maxHeightDelta ?? 2.5;
  if(!area?.walkFaces?.length){
    return finishClip(true, 1, origin.z, origin.z);
  }

  const fullDist = Math.hypot(dest.x - origin.x, dest.y - origin.y);
  if(fullDist < 1e-8){
    clearPoint.copy(dest);
    return finishClip(true, 1, origin.z, dest.z);
  }

  let face = findWalkFaceAt(area, origin);
  if(!face){
    if(options.strictOffMeshStart){
      return clipFromOffMesh(area, origin, dest);
    }
    // Start off-mesh — defer to sample / isPointWalkable path
    return finishClip(true, 0, origin.z, origin.z);
  }

  let curX = origin.x;
  let curY = origin.y;
  let curZ = origin.z;
  let minZ = curZ;
  let maxZ = curZ;
  let hops = 0;

  while(hops++ < 512){
    if(face.pointInFace2d(dest)){
      face.triangle.closestPointToPoint(dest, _hit);
      const z = _hit.z;
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      if(maxZ - minZ > maxDz + 0.2){
        clearPoint.set(curX, curY, curZ);
        return finishClip(
          false,
          Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
          minZ,
          maxZ
        );
      }
      clearPoint.copy(dest);
      clearPoint.z = z;
      return finishClip(true, 1, minZ, maxZ);
    }

    const [v0, v1, v2] = faceVerts(face);
    const verts = [v0, v1, v2];
    const outside = [
      destOutsideEdge(dest.x, dest.y, v0.x, v0.y, v1.x, v1.y),
      destOutsideEdge(dest.x, dest.y, v1.x, v1.y, v2.x, v2.y),
      destOutsideEdge(dest.x, dest.y, v2.x, v2.y, v0.x, v0.y),
    ];
    let outsideCount = 0;
    for(let s = 0; s < 3; s++){
      if(outside[s]) outsideCount++;
    }
    if(outsideCount === 0){
      // Orientation says dest inside but pointInFace2d disagreed — accept
      clearPoint.copy(dest);
      return finishClip(true, 1, minZ, maxZ);
    }

    let nextFace: OdysseyFace3 | undefined;
    let exitHit = false;

    for(let s = 0; s < 3; s++){
      if(!outside[s]) continue;
      const va = verts[s];
      const vb = verts[(s + 1) % 3];
      const vOpp = verts[(s + 2) % 3];
      if(!intersectLineSegments2d(
        curX, curY, dest.x, dest.y,
        va.x, va.y, vb.x, vb.y,
        _hit, curZ, dest.z
      )){
        continue;
      }

      const adj = adjacentForSide(face, s as 0 | 1 | 2);
      if(isWalkableFaceAdj(adj)){
        curX = _hit.x;
        curY = _hit.y;
        curZ = _hit.z;
        face.triangle.closestPointToPoint(_hit, _nudge);
        curZ = _nudge.z;
        minZ = Math.min(minZ, curZ);
        maxZ = Math.max(maxZ, curZ);
        if(maxZ - minZ > maxDz + 0.2){
          clearPoint.set(curX, curY, curZ);
          return finishClip(
            false,
            Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
            minZ,
            maxZ
          );
        }
        nextFace = adj;
        exitHit = true;
        break;
      }

      if(isWalkmeshEdgeAdj(adj)){
        curX = _hit.x;
        curY = _hit.y;
        curZ = _hit.z;
        clearPoint.set(curX, curY, curZ);
        const t = Math.hypot(curX - origin.x, curY - origin.y) / fullDist;

        // Non-transition = wall (GetAdjacentRoom == -1)
        if(adj.transition === -1){
          setWallNormal(va, vb, vOpp);
          return finishClip(false, t, minZ, maxZ);
        }

        // Transition: nudge into next room face (prefer other walkmesh).
        const dx = dest.x - origin.x;
        const dy = dest.y - origin.y;
        const inv = 1 / fullDist;
        let hopped: OdysseyFace3 | undefined;
        for(let n = 0; n < TRANSITION_NUDGE_DISTANCES.length; n++){
          const dist = TRANSITION_NUDGE_DISTANCES[n];
          _nudge.set(curX + dx * inv * dist, curY + dy * inv * dist, curZ);
          hopped = findWalkFaceBeyondTransition(area, _nudge, face);
          if(hopped) break;
        }
        if(!hopped){
          // Portal with no walkable face beyond — treat as clear exit of mesh
          // only if dest is near the hit (room-local clip success)
          if(Math.hypot(dest.x - curX, dest.y - curY) < 0.15){
            clearPoint.copy(dest);
            return finishClip(true, 1, minZ, maxZ);
          }
          setWallNormal(va, vb, vOpp);
          return finishClip(false, t, minZ, maxZ);
        }
        curX = _nudge.x;
        curY = _nudge.y;
        nextFace = hopped;
        exitHit = true;
        break;
      }

      // Undefined adjacency = hard wall
      setWallNormal(va, vb, vOpp);
      clearPoint.set(_hit.x, _hit.y, _hit.z);
      return finishClip(
        false,
        Math.hypot(_hit.x - origin.x, _hit.y - origin.y) / fullDist,
        minZ,
        maxZ
      );
    }

    if(!exitHit || !nextFace){
      clearPoint.set(curX, curY, curZ);
      return finishClip(
        false,
        Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
        minZ,
        maxZ
      );
    }
    face = nextFace;
  }

  clearPoint.set(curX, curY, curZ);
  return finishClip(
    false,
    Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
    minZ,
    maxZ
  );
}
