import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import { WalkmeshEdge } from "@/odyssey/WalkmeshEdge";
import { OdysseyFace3 } from "@/three/odyssey";

/**
 * Approximate CSWRoomSurfaceMesh::ClippedLineSegmentWalkable @ 00584220
 * (+ ComputeClippedLineSegment @ 00583e30 exit semantics).
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
};

const _hit = new THREE.Vector3();
const _nudge = new THREE.Vector3();

function findWalkFaceAt(
  area: ModuleArea,
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

/**
 * Retail IntersectLineSegments2d — writes intersection into `out`.
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

/** Dest is outside edge vi→vj when cross < 0 (retail ClippedLine orientation). */
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
 */
export function clippedLineSegmentWalkable(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: { maxHeightDelta?: number } = {}
): ClippedLineSegmentResult {
  const clearPoint = origin.clone();
  const maxDz = options.maxHeightDelta ?? 2.5;
  if(!area?.walkFaces?.length){
    return { ok: true, clearPoint, clearT: 1, minZ: origin.z, maxZ: origin.z };
  }

  const fullDist = Math.hypot(dest.x - origin.x, dest.y - origin.y);
  if(fullDist < 1e-8){
    return { ok: true, clearPoint: dest.clone(), clearT: 1, minZ: origin.z, maxZ: dest.z };
  }

  let face = findWalkFaceAt(area, origin);
  if(!face){
    // Start off-mesh — defer to sample / isPointWalkable path
    return { ok: true, clearPoint, clearT: 0, minZ: origin.z, maxZ: origin.z };
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
        return {
          ok: false,
          clearPoint,
          clearT: Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
          minZ,
          maxZ,
        };
      }
      clearPoint.copy(dest);
      clearPoint.z = z;
      return { ok: true, clearPoint, clearT: 1, minZ, maxZ };
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
      return { ok: true, clearPoint, clearT: 1, minZ, maxZ };
    }

    let nextFace: OdysseyFace3 | undefined;
    let exitHit = false;

    for(let s = 0; s < 3; s++){
      if(!outside[s]) continue;
      const va = verts[s];
      const vb = verts[(s + 1) % 3];
      if(!intersectLineSegments2d(
        curX, curY, dest.x, dest.y,
        va.x, va.y, vb.x, vb.y,
        _hit, curZ, dest.z
      )){
        continue;
      }

      const adj = adjacentForSide(face, s as 0 | 1 | 2);
      if(adj instanceof OdysseyFace3){
        curX = _hit.x;
        curY = _hit.y;
        curZ = _hit.z;
        face.triangle.closestPointToPoint(_hit, _nudge);
        curZ = _nudge.z;
        minZ = Math.min(minZ, curZ);
        maxZ = Math.max(maxZ, curZ);
        if(maxZ - minZ > maxDz + 0.2){
          clearPoint.set(curX, curY, curZ);
          return {
            ok: false,
            clearPoint,
            clearT: Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
            minZ,
            maxZ,
          };
        }
        nextFace = adj;
        exitHit = true;
        break;
      }

      if(adj instanceof WalkmeshEdge){
        curX = _hit.x;
        curY = _hit.y;
        curZ = _hit.z;
        clearPoint.set(curX, curY, curZ);
        const t = Math.hypot(curX - origin.x, curY - origin.y) / fullDist;

        // Non-transition = wall (retail GetAdjacentRoom == -1)
        if(adj.transition === -1){
          return { ok: false, clearPoint, clearT: t, minZ, maxZ };
        }

        // Transition: nudge into next room face and continue
        const dx = dest.x - origin.x;
        const dy = dest.y - origin.y;
        const inv = 1 / fullDist;
        _nudge.set(curX + dx * inv * 0.05, curY + dy * inv * 0.05, curZ);
        const hopped = findWalkFaceAt(area, _nudge);
        if(!hopped || hopped === face){
          // Portal with no walkable face beyond — treat as clear exit of mesh
          // only if dest is near the hit (room-local clip success)
          if(Math.hypot(dest.x - curX, dest.y - curY) < 0.15){
            return { ok: true, clearPoint: dest.clone(), clearT: 1, minZ, maxZ };
          }
          return { ok: false, clearPoint, clearT: t, minZ, maxZ };
        }
        curX = _nudge.x;
        curY = _nudge.y;
        nextFace = hopped;
        exitHit = true;
        break;
      }

      // Undefined adjacency = hard wall
      clearPoint.set(_hit.x, _hit.y, _hit.z);
      return {
        ok: false,
        clearPoint,
        clearT: Math.hypot(_hit.x - origin.x, _hit.y - origin.y) / fullDist,
        minZ,
        maxZ,
      };
    }

    if(!exitHit || !nextFace){
      clearPoint.set(curX, curY, curZ);
      return {
        ok: false,
        clearPoint,
        clearT: Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
        minZ,
        maxZ,
      };
    }
    face = nextFace;
  }

  clearPoint.set(curX, curY, curZ);
  return {
    ok: false,
    clearPoint,
    clearT: Math.hypot(curX - origin.x, curY - origin.y) / fullDist,
    minZ,
    maxZ,
  };
}
