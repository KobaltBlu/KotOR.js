import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { isStaticWalkClearOnAreaMesh, isStaticWalkClearOnWalkMesh } from "@/engine/pathfinding/static-walk-blockers-mesh";
import { composeDoorWalkmeshLocalToWorld } from "@/engine/pathfinding/door-walkmesh-matrix";
import {
  setHitInfoForAabb,
  type WalkHitInfo,
} from "@/engine/pathfinding/walk-hit-info";

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

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _mid = new THREE.Vector3();

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

/**
 * Door walkmesh — static walk blockers (door) runs collision mesh
 * on the open_state surface mesh. Missing/empty open mesh = clear (no faces).
 * Facing-plane fallback is closed-only (GetDoorCrossed).
 */
function closedDoorBlocksLine(
  door: ModuleDoor,
  from: THREE.Vector3,
  to: THREE.Vector3,
  expand: number,
  hit?: WalkHitInfo,
  softClearStartOverlap = false
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
    // AABB pre-cull when box available
    if(door.box){
      const minX = Math.min(from.x, to.x) - expand;
      const maxX = Math.max(from.x, to.x) + expand;
      const minY = Math.min(from.y, to.y) - expand;
      const maxY = Math.max(from.y, to.y) + expand;
      if(maxX < door.box.min.x || minX > door.box.max.x) return false;
      if(maxY < door.box.min.y || minY > door.box.max.y) return false;
    }
    // Walk-check materials only (door DWK faces are Nonwalk mat 7).
    // Face range starts after walkable/adjacency count.
    const mesh = isStaticWalkClearOnWalkMesh(wok, from, to, {
      personalSpace: expand,
      hit,
      faceStartIndex: wok.walkableFaces?.length ?? 0,
      softClearStartOverlap,
    });
    if(!mesh.clear){
      if(hit) hit.objectId = door.id;
      return true;
    }
    // Mesh clear — door geo doesn't block this corridor
    return false;
  }

  // Fallback facing-plane when closed and no door wok
  if(!door.box) return false;

  const minX = Math.min(from.x, to.x) - expand;
  const maxX = Math.max(from.x, to.x) + expand;
  const minY = Math.min(from.y, to.y) - expand;
  const maxY = Math.max(from.y, to.y) + expand;
  if(maxX < door.box.min.x || minX > door.box.max.x) return false;
  if(maxY < door.box.min.y || minY > door.box.max.y) return false;
  if(!segmentHitsBox(from, to, door.box)) return false;

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
    if(door.box){
      setHitInfoForAabb(door.box, from, to, hit, door.id);
    }
  }
  return true;
}

/**
 * Test static non-walk blockers on the segment (doors + placeables + mesh).
 * Returns clear=false → walk-line clear / hasWalkLineClear −2 (DetailedBlock).
 */
export function isStaticWalkClearDetailed(
  area: ModuleArea | undefined,
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
  } = {}
): NoNonWalkPolysResult {
  if(!area) return { clear: true };
  if(from.distanceToSquared(to) < 1e-10) return { clear: true };

  const expand = options.personalSpace ?? 0.5;
  const softStart = !!options.softClearStartOverlap;
  const ignore = options.ignoreObjectIds;
  const isIgnored = (id: number | undefined) =>
    id != null && !!ignore && ignore.indexOf(id) >= 0;

  _from.set(from.x, from.y, from.z + 0.5);
  _to.set(to.x, to.y, to.z + 0.5);

  const doors = area.doors;
  if(doors?.length){
    for(let i = 0; i < doors.length; i++){
      const door = doors[i];
      if(!door || isIgnored(door.id)) continue;
      if(closedDoorBlocksLine(door, _from, _to, expand, options.hit, softStart)){
        return { clear: false, blockingObjectId: door.id };
      }
    }
  }

  // Static placeables: collision mesh only (no bare AABB).
  // Placeables with no surface wok (InfoTerm / invisible cameras / speak
  // placeholders) must not AABB-block.
  const placeables = area.placeables;
  if(placeables?.length){
    for(let i = 0; i < placeables.length; i++){
      const plc = placeables[i];
      if(!plc || isIgnored(plc.id)) continue;
      const wok = plc.collisionManager?.walkmesh;
      if(!wok?.faces?.length) continue;
      // Refresh LocalToWorld (pose + BWM header.position) before mesh test.
      if(typeof (plc as { syncWalkmeshMatrix?: () => void }).syncWalkmeshMatrix === 'function'){
        (plc as { syncWalkmeshMatrix: () => void }).syncWalkmeshMatrix();
      }
      if(plc.box){
        const minX = Math.min(_from.x, _to.x) - expand;
        const maxX = Math.max(_from.x, _to.x) + expand;
        const minY = Math.min(_from.y, _to.y) - expand;
        const maxY = Math.max(_from.y, _to.y) + expand;
        if(maxX < plc.box.min.x || minX > plc.box.max.x) continue;
        if(maxY < plc.box.min.y || minY > plc.box.max.y) continue;
      }
      // Placeable surface meshes use walkcheck material bits (unlike door geo).
      const mesh = isStaticWalkClearOnWalkMesh(wok, _from, _to, {
        personalSpace: expand,
        hit: options.hit,
        softClearStartOverlap: softStart,
      });
      if(!mesh.clear){
        return { clear: false, blockingObjectId: plc.id };
      }
    }
  }

  // static walk blockers (room) — non-walk surface materials in corridor
  if(options.skipMesh !== true){
    const mesh = isStaticWalkClearOnAreaMesh(area, from, to, {
      personalSpace: expand,
      hit: options.hit,
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
