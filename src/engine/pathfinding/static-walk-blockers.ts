import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Door } from "@engine/module/Door";
import type { Placeable } from "@engine/module/Placeable";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import { isStaticWalkClearOnAreaMesh, isStaticWalkClearOnWalkMesh, walkMeshHasStartOverlap } from "@engine/pathfinding/static-walk-blockers-mesh";
import {
  composeDoorWalkmeshLocalToWorld,
  walkmeshWorldAabbXY,
  type WalkmeshWorldAabbXY,
} from "@engine/pathfinding/door-walkmesh-matrix";
import {
  ensureWalkmeshMatrixSynced,
  queryStaticBlockersInAabb,
} from "@engine/pathfinding/static-blocker-grid";
import {
  setHitInfoForAabb,
  type WalkHitInfo,
} from "@engine/pathfinding/walk-hit-info";

/**
 * Static walk blockers: detailed corridor checks for doors / placeables / mesh,
 * plus room non-walk materials.
 *
 * @file static-walk-blockers.ts
 */

export type NoNonWalkPolysResult = {
  clear: boolean;
  /** Blocking door / placeable id when clear=false. */
  blockingObjectId?: number;
};

/** Half-extent used when facing-plane falls back to door.position (no model box). */
const FACING_PLANE_HALF = 1.5;

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _meshAabb: WalkmeshWorldAabbXY = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
const _facingBox = new THREE.Box3();

function segmentHitsBox(a: THREE.Vector3, b: THREE.Vector3, box: THREE.Box3): boolean {
  for(let i = 0; i <= 10; i++){
    const t = i / 10;
    _mid.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
    if(box.containsPoint(_mid)) return true;
  }
  return false;
}

function segmentOverlapsAabbXY(
  from: THREE.Vector3,
  to: THREE.Vector3,
  expand: number,
  aabb: WalkmeshWorldAabbXY
): boolean {
  const minX = Math.min(from.x, to.x) - expand;
  const maxX = Math.max(from.x, to.x) + expand;
  const minY = Math.min(from.y, to.y) - expand;
  const maxY = Math.max(from.y, to.y) + expand;
  if(maxX < aabb.minX || minX > aabb.maxX) return false;
  if(maxY < aabb.minY || minY > aabb.maxY) return false;
  return true;
}

/**
 * Facing-plane cull volume: union of door.position slab and model box when
 * present so a stale open-pose model AABB cannot false-clear a closed door.
 */
function facingPlaneCullBox(door: Door): THREE.Box3 | undefined {
  const pos = door.position;
  if(!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)){
    return door.box ?? undefined;
  }
  _facingBox.min.set(
    pos.x - FACING_PLANE_HALF,
    pos.y - FACING_PLANE_HALF,
    (pos.z ?? 0) - 0.5
  );
  _facingBox.max.set(
    pos.x + FACING_PLANE_HALF,
    pos.y + FACING_PLANE_HALF,
    (pos.z ?? 0) + 3.5
  );
  if(door.box && Number.isFinite(door.box.min.x) && Number.isFinite(door.box.max.x)){
    _facingBox.union(door.box);
  }
  return _facingBox;
}

/**
 * Door walkmesh — static walk blockers (door) runs collision mesh
 * on the open_state surface mesh. Missing/empty open mesh = clear (no faces).
 * Facing-plane fallback is closed-only (GetDoorCrossed).
 */
function closedDoorBlocksLine(
  door: Door,
  from: THREE.Vector3,
  to: THREE.Vector3,
  expand: number,
  hit?: WalkHitInfo,
  softClearStartOverlap = false,
  forceDestOnly = false
): boolean {
  if(!door) return false;

  const wok =
    (typeof door.getWalkmeshForOpenState === 'function'
      ? door.getWalkmeshForOpenState()
      : undefined) ?? door.collisionManager?.walkmesh;

  // Empty / missing open-state mesh → clear (LoadMesh with no faces)
  if(!wok?.faces?.length){
    if(typeof door.isOpen === 'function' && door.isOpen()) return false;
  }else{
    // Refresh LocalToWorld on the mesh under test (door pose + BWM header.position)
    composeDoorWalkmeshLocalToWorld(
      wok.matrixWorld ?? (wok.matrixWorld = new THREE.Matrix4()),
      door.position,
      door.rotation ?? new THREE.Euler(0, 0, door.facing || 0),
      wok.header?.position,
    );
    if(wok.mat4){
      wok.mat4.copy(wok.matrixWorld);
    }
    // Cull against DWK world AABB — never visual model door.box (open-pose drift).
    const meshAabb = walkmeshWorldAabbXY(wok.vertices, wok.matrixWorld, _meshAabb);
    if(meshAabb && !segmentOverlapsAabbXY(from, to, expand, meshAabb)){
      return false;
    }
    // Walk-check materials only (door DWK faces are Nonwalk mat 7).
    // Face range starts after walkable/adjacency count.
    const mesh = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: expand,
      hit,
      faceStartIndex: wok.walkableFaces?.length ?? 0,
      softClearStartOverlap,
      forceDestOnly,
    });
    if(!mesh.clear){
      if(hit) hit.objectId = door.id;
      return true;
    }
    // Mesh clear — door geo doesn't block this corridor
    return false;
  }

  // Fallback facing-plane when closed and no door wok
  const cullBox = facingPlaneCullBox(door);
  if(!cullBox) return false;

  const minX = Math.min(from.x, to.x) - expand;
  const maxX = Math.max(from.x, to.x) + expand;
  const minY = Math.min(from.y, to.y) - expand;
  const maxY = Math.max(from.y, to.y) + expand;
  if(maxX < cullBox.min.x || minX > cullBox.max.x) return false;
  if(maxY < cullBox.min.y || minY > cullBox.max.y) return false;
  if(!segmentHitsBox(from, to, cullBox)) return false;

  const fx = Math.cos(door.facing || 0);
  const fy = Math.sin(door.facing || 0);
  const dStart =
    (from.x - door.position.x) * fx +
    (from.y - door.position.y) * fy;
  const dEnd =
    (to.x - door.position.x) * fx +
    (to.y - door.position.y) * fy;
  if((dStart > 0) === (dEnd > 0)) return false;
  if(hit){
    hit.objectId = door.id;
    setHitInfoForAabb(cullBox, from, to, hit, door.id);
  }
  return true;
}

function findDoorById(area: Area, id: number): Door | undefined {
  const doors = area.doors;
  if(!doors?.length) return undefined;
  for(let i = 0; i < doors.length; i++){
    if(doors[i]?.id === id) return doors[i];
  }
  return undefined;
}

function findPlaceableById(area: Area, id: number): Placeable | undefined {
  const placeables = area.placeables;
  if(!placeables?.length) return undefined;
  for(let i = 0; i < placeables.length; i++){
    if(placeables[i]?.id === id) return placeables[i];
  }
  return undefined;
}

function testPlaceableBlocks(
  plc: Placeable,
  from: THREE.Vector3,
  to: THREE.Vector3,
  expand: number,
  hit: WalkHitInfo | undefined,
  softStart: boolean,
  forceDestOnly: boolean
): boolean {
  const wok = plc.collisionManager?.walkmesh;
  if(!wok?.faces?.length) return false;
  ensureWalkmeshMatrixSynced(plc);
  if(plc.box){
    const minX = Math.min(from.x, to.x) - expand;
    const maxX = Math.max(from.x, to.x) + expand;
    const minY = Math.min(from.y, to.y) - expand;
    const maxY = Math.max(from.y, to.y) + expand;
    if(maxX < plc.box.min.x || minX > plc.box.max.x) return false;
    if(maxY < plc.box.min.y || minY > plc.box.max.y) return false;
  }
  const mesh = isStaticWalkClearOnWalkMesh(wok, from, to, {
    personalSpace: expand,
    hit,
    softClearStartOverlap: softStart,
    forceDestOnly,
  });
  return !mesh.clear;
}

/**
 * Test static non-walk blockers on the segment (doors + placeables + mesh).
 * Returns clear=false → walk-line clear / hasWalkLineClear −2 (DetailedBlock).
 */
export function isStaticWalkClearDetailed(
  area: Area | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    personalSpace?: number;
    hit?: WalkHitInfo;
    /** Skip room/placeable wok face corridor (grid micro-steps). */
    skipMesh?: boolean;
    /** Object ids to skip (visual LOS / hasVisualLos exclude list). */
    ignoreObjectIds?: number[];
    /**
     * When true, door/placeable mesh tests soft-clear an already-overlapping
     * start so the actor can step out (PlayerControl escape). Pathfinding
     * leaves this false.
     */
    softClearStartOverlap?: boolean;
    /**
     * Binary-search refine: test only this door/placeable id (skips mesh).
     */
    onlyObjectId?: number;
    /**
     * Binary-search refine for room-mesh blocks: skip doors/placeables.
     */
    meshOnly?: boolean;
    /**
     * Pre-gathered room walk-check faces — passed through to mesh stadium
     * so callers can avoid a second getWalkCandidatesForBox.
     */
    candidateFaces?: OdysseyFace3[];
  } = {}
): NoNonWalkPolysResult {
  if(!area) return { clear: true };
  if(from.distanceToSquared(to) < 1e-10) return { clear: true };

  const expand = options.personalSpace ?? 0.5;
  const softStart = !!options.softClearStartOverlap;
  const ignore = options.ignoreObjectIds;
  const isIgnored = (id: number | undefined) =>
    id != null && !!ignore && ignore.indexOf(id) >= 0;
  const onlyId = options.onlyObjectId;
  const meshOnly = options.meshOnly === true;

  _from.set(from.x, from.y, from.z + 0.5);
  _to.set(to.x, to.y, to.z + 0.5);

  // Scoped refine against a single known door/placeable.
  if(onlyId != null && !meshOnly){
    if(isIgnored(onlyId)) return { clear: true };
    const door = findDoorById(area, onlyId);
    if(door){
      ensureWalkmeshMatrixSynced(door);
      if(closedDoorBlocksLine(door, _from, _to, expand, options.hit, softStart, false)){
        return { clear: false, blockingObjectId: door.id };
      }
      return { clear: true };
    }
    const plc = findPlaceableById(area, onlyId);
    if(plc){
      if(testPlaceableBlocks(plc, _from, _to, expand, options.hit, softStart, false)){
        return { clear: false, blockingObjectId: plc.id };
      }
      return { clear: true };
    }
    // Unknown id — treat as clear for scoped path; caller may full-rescan.
    return { clear: true };
  }

  // Room-mesh-only refine (no door/placeable id on the original block).
  if(meshOnly){
    if(options.skipMesh === true) return { clear: true };
    const mesh = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: expand,
      hit: options.hit,
      candidateFaces: options.candidateFaces,
    });
    if(!mesh.clear){
      return {
        clear: false,
        blockingObjectId: options.hit?.objectId,
      };
    }
    return { clear: true };
  }

  const segMinX = Math.min(_from.x, _to.x) - expand;
  const segMaxX = Math.max(_from.x, _to.x) + expand;
  const segMinY = Math.min(_from.y, _to.y) - expand;
  const segMaxY = Math.max(_from.y, _to.y) + expand;
  const nearby = queryStaticBlockersInAabb(area, segMinX, segMaxX, segMinY, segMaxY);
  const doorsScan = nearby.doors;
  const placeablesScan = nearby.placeables;

  // If the capsule already overlaps any door/placeable, force dest-only on all
  // static mesh tests so a neighbor prop cannot stadium-block the escape path.
  let forceDestOnly = false;
  if(softStart){
    if(doorsScan?.length){
      for(let i = 0; i < doorsScan.length; i++){
        const door = doorsScan[i];
        if(!door || isIgnored(door.id)) continue;
        const wok = door.collisionManager?.walkmesh;
        if(!wok?.faces?.length) continue;
        ensureWalkmeshMatrixSynced(door);
        if(walkMeshHasStartOverlap(wok, _from, { personalSpace: expand })){
          forceDestOnly = true;
          break;
        }
      }
    }
    if(!forceDestOnly && placeablesScan?.length){
      for(let i = 0; i < placeablesScan.length; i++){
        const plc = placeablesScan[i];
        if(!plc || isIgnored(plc.id)) continue;
        const wok = plc.collisionManager?.walkmesh;
        if(!wok?.faces?.length) continue;
        ensureWalkmeshMatrixSynced(plc);
        if(walkMeshHasStartOverlap(wok, _from, { personalSpace: expand })){
          forceDestOnly = true;
          break;
        }
      }
    }
  }

  if(doorsScan?.length){
    for(let i = 0; i < doorsScan.length; i++){
      const door = doorsScan[i];
      if(!door || isIgnored(door.id)) continue;
      ensureWalkmeshMatrixSynced(door);
      if(closedDoorBlocksLine(door, _from, _to, expand, options.hit, softStart, forceDestOnly)){
        return { clear: false, blockingObjectId: door.id };
      }
    }
  }

  // Static placeables: collision mesh only (no bare AABB).
  // Placeables with no surface wok (InfoTerm / invisible cameras / speak
  // placeholders) must not AABB-block.
  if(placeablesScan?.length){
    for(let i = 0; i < placeablesScan.length; i++){
      const plc = placeablesScan[i];
      if(!plc || isIgnored(plc.id)) continue;
      if(testPlaceableBlocks(plc, _from, _to, expand, options.hit, softStart, forceDestOnly)){
        return { clear: false, blockingObjectId: plc.id };
      }
    }
  }

  // static walk blockers (room) — non-walk surface materials in corridor
  if(options.skipMesh !== true){
    const mesh = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: expand,
      hit: options.hit,
      candidateFaces: options.candidateFaces,
    });
    if(!mesh.clear){
      return {
        clear: false,
        blockingObjectId: options.hit?.objectId,
      };
    }
  }

  return { clear: true };
}
