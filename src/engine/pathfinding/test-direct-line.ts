import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleRoom } from "@/module/ModuleRoom";
import { getCreaturePersonalSpace, getPathPersonalSpace } from "@/combat/attack-range";
import { Utility } from "@/utility/Utility";
import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import { clippedLineSegmentWalkable } from "@/engine/pathfinding/clipped-line-segment";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import {
  createWalkHitInfo,
  type WalkHitInfo,
} from "@/engine/pathfinding/walk-hit-info";

/**
 * Approximate CSWSArea::TestDirectLine @ 004bcb70 + NoCreaturesOnLine.
 *
 * Retail walks room→room via ClippedLineSegmentWalkable / NoNonWalkPolys,
 * height band (param_4), then NoCreaturesOnLine.
 *
 * JS: face-walk ClippedLine + NoNonWalkPolysDetailed (doors/static/mesh) +
 * adaptive samples + personal-space ring + height continuity +
 * creperspace NoCreaturesOnLine + walk-transition rooms + wall edges.
 *
 * @file test-direct-line.ts
 */

/** Retail-ish TestDirectLine return codes used by ProcessPoint / callers. */
export enum TestDirectLineCode {
  Fail = 0,
  Ok = 1,
  NonWalk = -1,
  DetailedBlock = -2,
  Creature = -3,
}

export type TestDirectLineHit = {
  ok: boolean;
  code: TestDirectLineCode;
  /** Farthest clear point along the segment (origin if none). */
  clearPoint: THREE.Vector3;
  /** Fraction 0..1 of the full segment that is clear. */
  clearT: number;
  /** Blocking creature id when a creature blocks the line. */
  blockingCreatureId?: number;
  /** Blocking door/placeable id when DetailedBlock. */
  blockingObjectId?: number;
  /** Optional retail CWalkHitInfo payload. */
  walkHit?: WalkHitInfo;
};

const _sample = new THREE.Vector3();
const _lateral = new THREE.Vector3();
const _heightProbe = new THREE.Vector3();

/**
 * Sample walkmesh Z at a 2D point (first matching walk face).
 * Returns NaN if no face.
 */
export function getWalkHeightAt(
  area: ModuleArea | undefined,
  point: THREE.Vector3
): number {
  if(!area?.walkFaces?.length) return NaN;
  for(let i = 0, len = area.walkFaces.length; i < len; i++){
    const f = area.walkFaces[i];
    if(f.pointInFace2d(point)){
      f.triangle.closestPointToPoint(point, _heightProbe);
      return _heightProbe.z;
    }
  }
  return NaN;
}

/**
 * True if segment crosses a non-transition walk edge (wall).
 * Same rule as PathPoint.hasLOS / retail ClippedLine exit when GetAdjacentRoom==-1.
 */
export function segmentCrossesBlockingWalkEdge(
  area: ModuleArea | undefined,
  a: THREE.Vector3,
  b: THREE.Vector3
): boolean {
  const edges = area?.walkEdges;
  if(!edges?.length) return false;
  for(let j = 0, len = edges.length; j < len; j++){
    const edge = edges[j];
    if(!edge || edge.transition != -1) continue;
    if(Utility.LineLineIntersection(
      a.x, a.y, b.x, b.y,
      edge.line.start.x, edge.line.start.y,
      edge.line.end.x, edge.line.end.y
    )){
      return true;
    }
  }
  return false;
}

/**
 * Room containing a point via walkable faces only.
 * No AABB fallback — overlapping room boxes caused false VIS/room fails.
 * Retail GetRoom uses walkmesh; undefined → skip room connectivity.
 */
export function getRoomAtPoint(
  area: ModuleArea | undefined,
  point: THREE.Vector3
): ModuleRoom | undefined {
  const rooms = area?.rooms;
  if(!rooms?.length) return undefined;

  for(let i = 0, len = rooms.length; i < len; i++){
    const room = rooms[i];
    const faces = room.collisionManager?.walkmesh?.walkableFaces;
    if(!faces?.length) continue;
    for(let f = 0, fl = faces.length; f < fl; f++){
      if(faces[f].pointInFace2d?.(point)){
        return room;
      }
    }
  }
  return undefined;
}

/** Cache: walkmesh transition adjacency (not VIS visibility links). */
const _walkAdjCache = new WeakMap<ModuleArea, { roomCount: number; adj: Map<string, Set<string>> }>();

/**
 * Undirected room graph from WalkmeshEdge.transition → area.rooms[index].
 * Retail TestDirectLine uses GetAdjacentRoom on clip exit, not .vis links.
 */
function getWalkRoomAdjacency(area: ModuleArea): Map<string, Set<string>> {
  const cached = _walkAdjCache.get(area);
  if(cached && cached.roomCount === area.rooms.length){
    return cached.adj;
  }

  const rooms = area.rooms;
  const adj = new Map<string, Set<string>>();
  const ensure = (name: string) => {
    let set = adj.get(name);
    if(!set){
      set = new Set<string>();
      adj.set(name, set);
    }
    return set;
  };

  for(let i = 0, len = rooms.length; i < len; i++){
    const room = rooms[i];
    if(!room?.roomName) continue;
    ensure(room.roomName);
    const edges = room.collisionManager?.walkmesh?.edges;
    if(!edges) continue;
    for(const edge of edges.values()){
      const t = edge.transition;
      if(typeof t !== 'number' || t < 0 || t >= len) continue;
      const other = rooms[t];
      if(!other?.roomName || other === room) continue;
      ensure(room.roomName).add(other.roomName);
      ensure(other.roomName).add(room.roomName);
    }
  }

  _walkAdjCache.set(area, { roomCount: rooms.length, adj });
  return adj;
}

/** BFS on walkmesh-transition room graph (endpoint coarse check; depth-capped). */
const ROOM_BFS_MAX_DEPTH = 16;

function roomsAreWalkConnected(
  area: ModuleArea,
  start: ModuleRoom,
  dest: ModuleRoom
): boolean {
  if(start === dest || start.roomName === dest.roomName) return true;
  const adj = getWalkRoomAdjacency(area);
  const startLinks = adj.get(start.roomName);
  const destLinks = adj.get(dest.roomName);
  // No transition data → cannot prove disconnect; allow (avoid false fails)
  if(!startLinks?.size && !destLinks?.size) return true;

  // Retail TestDirectLine walks GetAdjacentRoom along the clip (hop = transitions).
  // Cap BFS depth so distant graph paths are not treated as LOS-clear.
  type Node = { name: string; depth: number };
  const open: Node[] = [{ name: start.roomName, depth: 0 }];
  const seen = new Set<string>([start.roomName]);
  while(open.length){
    const cur = open.pop()!;
    if(cur.depth >= ROOM_BFS_MAX_DEPTH) continue;
    const links = adj.get(cur.name);
    if(!links) continue;
    for(const next of links){
      if(seen.has(next)) continue;
      if(next === dest.roomName) return true;
      seen.add(next);
      open.push({ name: next, depth: cur.depth + 1 });
    }
  }
  return false;
}

/** True if `next` is the same room or a 1-hop walkmesh neighbor of `cur`. */
function roomsAreAdjacentOrSame(
  area: ModuleArea,
  cur: ModuleRoom,
  next: ModuleRoom
): boolean {
  if(cur === next || cur.roomName === next.roomName) return true;
  const adj = getWalkRoomAdjacency(area);
  const links = adj.get(cur.roomName);
  if(!links?.size) return true; // no data → allow
  return links.has(next.roomName);
}

function adaptiveSteps(origin: THREE.Vector3, dest: THREE.Vector3, requested?: number): number {
  if(requested != null) return Math.max(4, requested);
  const dist = Math.hypot(dest.x - origin.x, dest.y - origin.y);
  // ~1 sample / 0.4m, clamp 8..48 (retail continuous clip)
  return Math.max(8, Math.min(48, Math.ceil(dist / 0.4) + 1));
}

/**
 * Test whether origin→dest is walkable (and optionally creature-clear).
 * @param checkCreatures When true, treat creature spheres as blockers (NoCreaturesOnLine).
 * @param maxHeightDelta Max |ΔZ| between consecutive walk samples (retail height cylinder).
 */
export function testDirectLine(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: ModuleObject;
    personalSpace?: number;
    checkCreatures?: boolean;
    /** Creature ids to skip in NoCreaturesOnLine (e.g. the hex blocker). */
    ignoreCreatureIds?: number[];
    /** Treat party members as non-blocking (retail ProcessPoint -3 + IsPartyMember). */
    allowPartyCreatures?: boolean;
    maxHeightDelta?: number;
    steps?: number;
    /** Skip room-adjacency / connectivity (grid neighbor micro-steps). */
    skipRoomCheck?: boolean;
    /** Skip face-walk ClippedLineSegmentWalkable (micro-steps / grid). */
    skipClippedLine?: boolean;
    /** Collect CWalkHitInfo on creature / mesh blocks. */
    collectHitInfo?: boolean;
  } = {}
): TestDirectLineHit {
  const clearPoint = origin.clone();
  if(!area){
    return { ok: false, code: TestDirectLineCode.Fail, clearPoint, clearT: 0 };
  }

  const steps = adaptiveSteps(origin, dest, options.steps);
  const perspace = options.personalSpace
    ?? (options.owner ? getPathPersonalSpace(options.owner as ModuleCreature) : 0.5);
  const checkCreatures = options.checkCreatures !== false;
  const ignore = options.ignoreCreatureIds;
  const allowParty = options.allowPartyCreatures === true;
  const maxDz = options.maxHeightDelta ?? 2.5;
  const checkRooms = options.skipRoomCheck !== true && !!area.rooms?.length;
  const checkClip = options.skipClippedLine !== true;
  const walkHit = options.collectHitInfo ? createWalkHitInfo() : undefined;

  // Retail: ClippedLineSegmentWalkable per room before NoNonWalk / creatures
  if(checkClip && area.walkFaces?.length){
    const clip = clippedLineSegmentWalkable(area, origin, dest, { maxHeightDelta: maxDz });
    if(!clip.ok){
      clearPoint.copy(clip.clearPoint);
      return {
        ok: false,
        code: TestDirectLineCode.NonWalk,
        clearPoint,
        clearT: clip.clearT,
      };
    }
  }

  // Retail NoNonWalkPolysDetailed + OnRoom after clip (−2 DetailedBlock).
  // Full-segment block still reports farthest clear fraction (PlotPath partial).
  if(checkClip){
    const polys = noNonWalkPolysDetailed(area, origin, dest, {
      personalSpace: perspace,
      hit: walkHit,
      skipMesh: options.skipClippedLine === true,
    });
    if(!polys.clear){
      const clearT = refineDetailedClearT(
        area,
        origin,
        dest,
        perspace,
        options.skipClippedLine === true,
        clearPoint
      );
      return {
        ok: false,
        code: TestDirectLineCode.DetailedBlock,
        clearPoint,
        clearT,
        blockingObjectId: polys.blockingObjectId,
        walkHit,
      };
    }
  }

  let startRoom: ModuleRoom | undefined;
  if(checkRooms){
    startRoom = getRoomAtPoint(area, origin);
    const endRoom = getRoomAtPoint(area, dest);
    // Only fail when both endpoints map to walk faces AND walk-transition
    // graph proves disconnect (VIS linkedRooms are wrong for this).
    if(startRoom && endRoom && !roomsAreWalkConnected(area, startRoom, endRoom)){
      return { ok: false, code: TestDirectLineCode.Fail, clearPoint, clearT: 0 };
    }
  }

  let clearT = 0;
  let prevZ = getWalkHeightAt(area, origin);
  if(isNaN(prevZ)) prevZ = origin.z;
  const prevSample = origin.clone();
  // Retail walks GetAdjacentRoom along the clip — track current room, 1-hop only
  let walkRoom = startRoom;

  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      origin.x + (dest.x - origin.x) * t,
      origin.y + (dest.y - origin.y) * t,
      origin.z + (dest.z - origin.z) * t
    );

    // Non-transition walk edge = wall (retail GetAdjacentRoom -1)
    if(segmentCrossesBlockingWalkEdge(area, prevSample, _sample)){
      refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
      return {
        ok: false,
        code: TestDirectLineCode.NonWalk,
        clearPoint,
        clearT,
      };
    }

    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(_sample)){
      refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
      return {
        ok: false,
        code: TestDirectLineCode.NonWalk,
        clearPoint,
        clearT,
      };
    }

    if(checkRooms && walkRoom){
      const sampleRoom = getRoomAtPoint(area, _sample);
      if(sampleRoom && !roomsAreAdjacentOrSame(area, walkRoom, sampleRoom)){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: TestDirectLineCode.Fail,
          clearPoint,
          clearT,
        };
      }
      if(sampleRoom) walkRoom = sampleRoom;
    }

    const z = getWalkHeightAt(area, _sample);
    if(!isNaN(z)){
      if(Math.abs(z - prevZ) > maxDz){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: TestDirectLineCode.DetailedBlock,
          clearPoint,
          clearT,
        };
      }
      prevZ = z;
      _sample.z = z;
    }

    if(perspace > 0.05){
      let ringBlocked = false;
      for(let a = 0; a < 4; a++){
        const ang = (a * Math.PI) / 2;
        _lateral.set(
          _sample.x + Math.cos(ang) * perspace * 0.5,
          _sample.y + Math.sin(ang) * perspace * 0.5,
          _sample.z
        );
        if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(_lateral)){
          ringBlocked = true;
          break;
        }
      }
      if(ringBlocked){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: TestDirectLineCode.NonWalk,
          clearPoint,
          clearT,
        };
      }
    }

    clearPoint.copy(_sample);
    clearT = t;
    prevSample.copy(_sample);
  }

  // Retail NoCreaturesOnLine on the (clipped) segment — creperspace capsule
  if(checkCreatures){
    const creSpace = options.owner
      ? getCreaturePersonalSpace(options.owner as ModuleCreature)
      : perspace;
    const creatures = noCreaturesOnLine(area, origin, dest, {
      owner: options.owner,
      crePersonalSpace: creSpace,
      ignoreCreatureIds: ignore,
      allowPartyCreatures: allowParty,
      hit: walkHit,
    });
    if(!creatures.clear){
      return {
        ok: false,
        code: TestDirectLineCode.Creature,
        clearPoint,
        clearT: Math.max(0, clearT - 0.05),
        blockingCreatureId: creatures.blockingCreatureId,
        walkHit,
      };
    }
  }

  return {
    ok: clearT >= 0.999,
    code: clearT >= 0.999 ? TestDirectLineCode.Ok : TestDirectLineCode.Fail,
    clearPoint,
    clearT,
    walkHit,
  };
}

/**
 * Binary-search farthest t where origin→lerp(t) clears NoNonWalkPolysDetailed.
 * Retail PlotPathInArea partial recovery needs clearT > 0 when a static object
 * only blocks near the destination (e.g. console placeable beside a waypoint).
 */
function refineDetailedClearT(
  area: ModuleArea,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  perspace: number,
  skipMesh: boolean,
  out: THREE.Vector3
): number {
  let lo = 0;
  let hi = 1;
  out.copy(origin);
  for(let k = 0; k < 10; k++){
    const mid = (lo + hi) * 0.5;
    _sample.set(
      origin.x + (dest.x - origin.x) * mid,
      origin.y + (dest.y - origin.y) * mid,
      origin.z + (dest.z - origin.z) * mid
    );
    const midPolys = noNonWalkPolysDetailed(area, origin, _sample, {
      personalSpace: perspace,
      skipMesh,
    });
    if(midPolys.clear){
      lo = mid;
      out.copy(_sample);
      const z = getWalkHeightAt(area, _sample);
      if(!isNaN(z)) out.z = z;
    }else{
      hi = mid;
    }
  }
  return lo;
}

/** Binary search last walkable t in (lo, hi). */
function refineClearPoint(
  area: ModuleArea,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  lo: number,
  hi: number,
  out: THREE.Vector3,
  _perspace: number
){
  let best = lo;
  for(let k = 0; k < 6; k++){
    const mid = (best + hi) * 0.5;
    _sample.set(
      origin.x + (dest.x - origin.x) * mid,
      origin.y + (dest.y - origin.y) * mid,
      origin.z + (dest.z - origin.z) * mid
    );
    if(area.isPointWalkable(_sample)){
      best = mid;
      out.copy(_sample);
      const z = getWalkHeightAt(area, _sample);
      if(!isNaN(z)) out.z = z;
    }else{
      hi = mid;
    }
  }
}

/**
 * Binary expand toward dest from origin for farthest walkable point
 * (retail PlotPathInArea partial-path recovery when full line fails).
 */
export function farthestClearPoint(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: ModuleObject;
    personalSpace?: number;
    checkCreatures?: boolean;
  } = {}
): THREE.Vector3 {
  const hit = testDirectLine(area, origin, dest, { ...options, steps: 24 });
  if(hit.ok) return dest.clone();
  if(hit.clearT < 0.05) return origin.clone();
  return hit.clearPoint.clone();
}

/**
 * Retail PlotPathInArea first stage: full LOS → true.
 */
export function hasDirectLine(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  owner?: ModuleObject
): boolean {
  return testDirectLine(area, origin, dest, {
    owner,
    checkCreatures: true,
  }).ok;
}
