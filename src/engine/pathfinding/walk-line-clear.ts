import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import type { AreaRoom } from "@engine/module/area/AreaRoom";
import { getCreaturePersonalSpace, getPathPersonalSpace } from "@engine/combat/attack-range";
import { Utility } from "@core/utility/Utility";
import { isCreatureCapsuleClear } from "@engine/pathfinding/creature-capsule-clear";
import { clippedLineSegmentWalkable } from "@engine/pathfinding/clipped-line-segment";
import { isStaticWalkClearDetailed } from "@engine/pathfinding/static-walk-blockers";
import type { WalkmeshEdge } from "@engine/odyssey/WalkmeshEdge";
import {
  createWalkHitInfo,
  type WalkHitInfo,
} from "@engine/pathfinding/walk-hit-info";

/**
 * Walkability / creature clearance along a straight segment.
 *
 * Face-walk clipped line, detailed non-walk (doors/static/mesh), adaptive
 * samples, personal-space ring, height continuity, creature capsules,
 * walk-transition rooms, and wall edges.
 */

/** Result codes used by party follow and other callers. */
export enum WalkLineHitCode {
  Fail = 0,
  Ok = 1,
  NonWalk = -1,
  DetailedBlock = -2,
  Creature = -3,
}

export type WalkLineHit = {
  ok: boolean;
  code: WalkLineHitCode;
  /** Farthest clear point along the segment (origin if none). */
  clearPoint: THREE.Vector3;
  /** Fraction 0..1 of the full segment that is clear. */
  clearT: number;
  /** Blocking creature id when a creature blocks the line. */
  blockingCreatureId?: number;
  /** Blocking door/placeable id when DetailedBlock. */
  blockingObjectId?: number;
  /** Optional walk-hit payload. */
  walkHit?: WalkHitInfo;
};

const _sample = new THREE.Vector3();
const _lateral = new THREE.Vector3();
const _heightProbe = new THREE.Vector3();
const _lineBox = new THREE.Box3();
const _candidateFaces: any[] = [];
const _candidateEdges: WalkmeshEdge[] = [];
const _candidateRooms: AreaRoom[] = [];

/**
 * Sample walkmesh Z at a 2D point (first matching walk face).
 * Returns NaN if no face.
 */
export function getWalkHeightAt(
  area: Area | undefined,
  point: THREE.Vector3,
  candidateFaces?: Array<{ pointInFace2d?: (point: THREE.Vector3) => boolean; triangle?: THREE.Triangle }>
): number {
  const faces = candidateFaces ?? area?.walkFaces;
  if(!faces?.length) return NaN;
  for(let i = 0, len = faces.length; i < len; i++){
    const f = faces[i];
    if(f.pointInFace2d(point)){
      f.triangle.closestPointToPoint(point, _heightProbe);
      return _heightProbe.z;
    }
  }
  return NaN;
}

/**
 * True when a point lies on a walkable face (candidate list or area walkmesh).
 */
function isCandidatePointWalkable(
  area: Area,
  point: THREE.Vector3,
  candidateFaces?: Array<{ pointInFace2d?: (point: THREE.Vector3) => boolean }>
): boolean {
  // Empty array must fall through — getWalkCandidatesForBox can return [] when
  // VIS cull missed a walkable strip; treating [] as filtered yields NonWalk.
  if(candidateFaces?.length){
    for(let i = 0, len = candidateFaces.length; i < len; i++){
      if(candidateFaces[i]?.pointInFace2d?.(point)){
        return true;
      }
    }
    return false;
  }
  return typeof area.isPointWalkable === "function" ? area.isPointWalkable(point) : true;
}

/**
 * True if segment crosses a non-transition walk edge (wall).
 * Same rule as PathPoint.hasLOS / clipped-line exit when adjacent room is none.
 */
export function segmentCrossesBlockingWalkEdge(
  area: Area | undefined,
  a: THREE.Vector3,
  b: THREE.Vector3,
  candidateEdges?: WalkmeshEdge[]
): boolean {
  const edges = candidateEdges ?? area?.walkEdges;
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
 * Undefined → skip room connectivity.
 */
export function getRoomAtPoint(
  area: Area | undefined,
  point: THREE.Vector3,
  candidateFaces?: any[]
): AreaRoom | undefined {
  if(candidateFaces?.length){
    for(let i = 0, len = candidateFaces.length; i < len; i++){
      const face = candidateFaces[i];
      if(face?.pointInFace2d?.(point)){
        const room = face.walkmesh?.gameObject as AreaRoom | undefined;
        if(room) return room;
      }
    }
  }

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
const _walkAdjCache = new WeakMap<Area, { roomCount: number; adj: Map<string, Set<string>> }>();

/**
 * Undirected room graph from WalkmeshEdge.transition → area.rooms[index].
 * Direct-line uses walkmesh adjacency on clip exit, not VIS links.
 */
function getWalkRoomAdjacency(area: Area): Map<string, Set<string>> {
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
  area: Area,
  start: AreaRoom,
  dest: AreaRoom
): boolean {
  if(start === dest || start.roomName === dest.roomName) return true;
  const adj = getWalkRoomAdjacency(area);
  const startLinks = adj.get(start.roomName);
  const destLinks = adj.get(dest.roomName);
  // No transition data → cannot prove disconnect; allow (avoid false fails)
  if(!startLinks?.size && !destLinks?.size) return true;

  // Walkmesh-adjacent rooms along the clip (hop = transitions).
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
  area: Area,
  cur: AreaRoom,
  next: AreaRoom
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
  // ~1 sample / 0.4m, clamp 8..48 (continuous clip)
  return Math.max(8, Math.min(48, Math.ceil(dist / 0.4) + 1));
}

/**
 * Test whether origin→dest is walkable (and optionally creature-clear).
 * @param checkCreatures When true, treat creature spheres as blockers.
 * @param maxHeightDelta Max |ΔZ| between consecutive walk samples (height cylinder).
 */
export function hasWalkLineClear(
  area: Area | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: GameObject;
    personalSpace?: number;
    checkCreatures?: boolean;
    /** Creature ids to skip in the creature capsule test. */
    ignoreCreatureIds?: number[];
    /** Treat party members as non-blocking (creature hit + party member). */
    allowPartyCreatures?: boolean;
    maxHeightDelta?: number;
    steps?: number;
    /** Skip room-adjacency / connectivity (grid neighbor micro-steps). */
    skipRoomCheck?: boolean;
    /** Skip face-walk clipped-line check (micro-steps / grid). */
    skipClippedLine?: boolean;
    /** Collect walk-hit info on creature / mesh blocks. */
    collectHitInfo?: boolean;
    /**
     * Soft-clear door/placeable start overlap (PlayerControl escape).
     * Pathfinding / AI leave this false.
     */
    softClearStartOverlap?: boolean;
  } = {}
): WalkLineHit {
  const clearPoint = origin.clone();
  if(!area){
    return { ok: false, code: WalkLineHitCode.Fail, clearPoint, clearT: 0 };
  }

  const steps = adaptiveSteps(origin, dest, options.steps);
  const perspace = options.personalSpace
    ?? (options.owner ? getPathPersonalSpace(options.owner as Creature) : 0.5);
  const checkCreatures = options.checkCreatures !== false;
  const ignore = options.ignoreCreatureIds;
  const allowParty = options.allowPartyCreatures === true;
  const maxDz = options.maxHeightDelta ?? 2.5;
  const checkRooms = options.skipRoomCheck !== true && !!area.rooms?.length;
  const checkClip = options.skipClippedLine !== true;
  const walkHit = options.collectHitInfo ? createWalkHitInfo() : undefined;
  const candidateSource = (area as any).getWalkCandidatesForBox;
  const candidates = typeof candidateSource === "function"
    ? candidateSource.call(
      area,
      _lineBox.setFromPoints([origin, dest]).expandByScalar(Math.max(0.1, perspace + 0.1)),
      { faces: _candidateFaces, edges: _candidateEdges, rooms: _candidateRooms }
    )
    : undefined;
  const candidateFaces = candidates?.faces as any[] | undefined;
  const candidateEdges = candidates?.edges as WalkmeshEdge[] | undefined;

  // Clipped line per room before non-walk / creature tests
  if(checkClip && area.walkFaces?.length){
    const clip = clippedLineSegmentWalkable(area, origin, dest, { maxHeightDelta: maxDz });
    if(!clip.ok){
      clearPoint.copy(clip.clearPoint);
      return {
        ok: false,
        code: WalkLineHitCode.NonWalk,
        clearPoint,
        clearT: clip.clearT,
      };
    }
  }

  // Detailed non-walk (doors/static/mesh) after clip → DetailedBlock.
  // Full-segment block still reports farthest clear fraction for partial paths.
  if(checkClip){
    const polys = isStaticWalkClearDetailed(area, origin, dest, {
      personalSpace: perspace,
      hit: walkHit,
      skipMesh: options.skipClippedLine === true,
      softClearStartOverlap: options.softClearStartOverlap === true,
    });
    if(!polys.clear){
      const clearT = refineDetailedClearT(
        area,
        origin,
        dest,
        perspace,
        options.skipClippedLine === true,
        clearPoint,
        options.softClearStartOverlap === true,
        polys.blockingObjectId
      );
      return {
        ok: false,
        code: WalkLineHitCode.DetailedBlock,
        clearPoint,
        clearT,
        blockingObjectId: polys.blockingObjectId,
        walkHit,
      };
    }
  }

  let startRoom: AreaRoom | undefined;
  if(checkRooms){
    startRoom = getRoomAtPoint(area, origin, candidateFaces);
    const endRoom = getRoomAtPoint(area, dest, candidateFaces);
    // Only fail when both endpoints map to walk faces AND walk-transition
    // graph proves disconnect (VIS linkedRooms are wrong for this).
    if(startRoom && endRoom && !roomsAreWalkConnected(area, startRoom, endRoom)){
      return { ok: false, code: WalkLineHitCode.Fail, clearPoint, clearT: 0 };
    }
  }

  let clearT = 0;
  let prevZ = getWalkHeightAt(area, origin, candidateFaces);
  if(isNaN(prevZ)) prevZ = origin.z;
  const prevSample = origin.clone();
  // Track current room along the clip — 1-hop adjacency only
  let walkRoom = startRoom;

  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      origin.x + (dest.x - origin.x) * t,
      origin.y + (dest.y - origin.y) * t,
      origin.z + (dest.z - origin.z) * t
    );

    // Non-transition walk edge = wall
    if(segmentCrossesBlockingWalkEdge(area, prevSample, _sample, candidateEdges)){
      refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
      return {
        ok: false,
        code: WalkLineHitCode.NonWalk,
        clearPoint,
        clearT,
      };
    }

    if(!isCandidatePointWalkable(area, _sample, candidateFaces)){
      refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
      return {
        ok: false,
        code: WalkLineHitCode.NonWalk,
        clearPoint,
        clearT,
      };
    }

    if(checkRooms && walkRoom){
      const sampleRoom = getRoomAtPoint(area, _sample, candidateFaces);
      if(sampleRoom && !roomsAreAdjacentOrSame(area, walkRoom, sampleRoom)){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: WalkLineHitCode.Fail,
          clearPoint,
          clearT,
        };
      }
      if(sampleRoom) walkRoom = sampleRoom;
    }

    const z = getWalkHeightAt(area, _sample, candidateFaces);
    if(!isNaN(z)){
      if(Math.abs(z - prevZ) > maxDz){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: WalkLineHitCode.DetailedBlock,
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
        if(!isCandidatePointWalkable(area, _lateral, candidateFaces)){
          ringBlocked = true;
          break;
        }
      }
      if(ringBlocked){
        refineClearPoint(area, origin, dest, clearT, t, clearPoint, perspace);
        return {
          ok: false,
          code: WalkLineHitCode.NonWalk,
          clearPoint,
          clearT,
        };
      }
    }

    clearPoint.copy(_sample);
    clearT = t;
    prevSample.copy(_sample);
  }

  // Creature personal-space capsules on the (clipped) segment
  if(checkCreatures){
    const creSpace = options.owner
      ? getCreaturePersonalSpace(options.owner as Creature)
      : perspace;
    const creatures = isCreatureCapsuleClear(area, origin, dest, {
      owner: options.owner,
      crePersonalSpace: creSpace,
      ignoreCreatureIds: ignore,
      allowPartyCreatures: allowParty,
      hit: walkHit,
    });
    if(!creatures.clear){
      return {
        ok: false,
        code: WalkLineHitCode.Creature,
        clearPoint,
        clearT: Math.max(0, clearT - 0.05),
        blockingCreatureId: creatures.blockingCreatureId,
        walkHit,
      };
    }
  }

  return {
    ok: clearT >= 0.999,
    code: clearT >= 0.999 ? WalkLineHitCode.Ok : WalkLineHitCode.Fail,
    clearPoint,
    clearT,
    walkHit,
  };
}

/**
 * Binary-search farthest t where origin→lerp(t) clears detailed non-walk.
 * Partial-path recovery needs clearT > 0 when a static object only blocks
 * near the destination (e.g. console placeable beside a waypoint).
 *
 * When `blockingObjectId` is known, each mid sample tests only that object
 * (or room mesh when id is missing) instead of a full area scan.
 */
function refineDetailedClearT(
  area: Area,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  perspace: number,
  skipMesh: boolean,
  out: THREE.Vector3,
  softClearStartOverlap = false,
  blockingObjectId?: number,
  forceFull = false
): number {
  const scoped = !forceFull && blockingObjectId != null;
  const meshOnly = !forceFull && !scoped && !skipMesh;
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
    const midPolys = isStaticWalkClearDetailed(area, origin, _sample, {
      personalSpace: perspace,
      skipMesh: scoped ? true : skipMesh,
      softClearStartOverlap,
      onlyObjectId: scoped ? blockingObjectId : undefined,
      meshOnly: meshOnly,
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

  // Scoped refine can miss a second blocker closer to origin — verify and
  // fall back to a full (unscoped) binary search when needed.
  if(!forceFull && (scoped || meshOnly)){
    const verify = isStaticWalkClearDetailed(area, origin, out, {
      personalSpace: perspace,
      skipMesh,
      softClearStartOverlap,
    });
    if(!verify.clear){
      return refineDetailedClearT(
        area,
        origin,
        dest,
        perspace,
        skipMesh,
        out,
        softClearStartOverlap,
        undefined,
        true
      );
    }
  }
  return lo;
}

/** Binary search last walkable t in (lo, hi). */
function refineClearPoint(
  area: Area,
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
 * (partial-path recovery when the full line fails).
 */
export function farthestClearPoint(
  area: Area | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  options: {
    owner?: GameObject;
    personalSpace?: number;
    checkCreatures?: boolean;
  } = {}
): THREE.Vector3 {
  const hit = hasWalkLineClear(area, origin, dest, { ...options, steps: 24 });
  if(hit.ok) return dest.clone();
  if(hit.clearT < 0.05) return origin.clone();
  return hit.clearPoint.clone();
}

/**
 * True when origin→dest has a fully clear direct line.
 */
export function hasClearWalkLine(
  area: Area | undefined,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  owner?: GameObject
): boolean {
  return hasWalkLineClear(area, origin, dest, {
    owner,
    checkCreatures: true,
  }).ok;
}
