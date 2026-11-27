import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Door } from "@engine/module/Door";
import type { OdysseyFace3 } from "@engine/render/three/odyssey/OdysseyFace3";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameState } from "@engine/runtime/GameState";

const _dir = new THREE.Vector3();
/** Scratch list of LOS-blocking walkmesh faces (reused per cast). */
const _losFaces: OdysseyFace3[] = [];

/**
 * Collect faces that block line of sight (surfacemat.lineOfSight).
 * Walkable floors typically do not block LOS — casting against all faces
 * falsely occludes elevated lights for lens flares.
 */
function collectLosBlockingFaces(faces: OdysseyFace3[] | undefined): OdysseyFace3[] {
  _losFaces.length = 0;
  if(!faces?.length){
    return _losFaces;
  }
  for(let i = 0, il = faces.length; i < il; i++){
    const face = faces[i];
    if(face?.blocksLineOfSight){
      _losFaces.push(face);
    }
  }
  return _losFaces;
}

/**
 * Walkmesh approximation of for a world segment.
 *
 * Tests LOS-blocking room WOK faces + closed door DWKs.
 * Residual vs full : room model AABB/BSP and placeable
 * gob hits are not tested.
 *
 * @returns true when the segment is occluded
 */
export function sceneHitCheckSegment(
  area: Area | undefined | null,
  from: THREE.Vector3,
  to: THREE.Vector3,
  raycaster: THREE.Raycaster = GameState.raycaster,
): boolean {
  if(!area){
    return false;
  }

  const dist = from.distanceTo(to);
  if(dist < 1e-4){
    return false;
  }

  _dir.copy(to).sub(from).normalize();
  raycaster.set(from, _dir);
  raycaster.far = dist;

  const rooms = area.rooms || [];
  for(let i = 0, il = rooms.length; i < il; i++){
    const room = rooms[i] as any;
    const wok = room?.collisionManager?.walkmesh;
    if(!wok?.faces?.length){
      continue;
    }
    const losFaces = collectLosBlockingFaces(wok.faces);
    if(!losFaces.length){
      continue;
    }
    const hits = wok.raycast(raycaster, losFaces) || [];
    if(hits.length > 0){
      return true;
    }
  }

  const doorWoks = area.doorWalkmeshes;
  if(doorWoks?.length){
    for(let i = 0, il = doorWoks.length; i < il; i++){
      const wok = doorWoks[i];
      if(!wok?.faces?.length){
        continue;
      }
      const door = wok.gameObject;
      if(
        door &&
        BitWise.InstanceOf(door.objectType, GameObjectType.Door) &&
        (door as Door).isOpen()
      ){
        continue;
      }
      const hits = wok.raycast(raycaster) || [];
      if(hits.length > 0){
        return true;
      }
    }
  }else{
    const doors = area.doors || [];
    for(let j = 0, jl = doors.length; j < jl; j++){
      const door = doors[j];
      if(!door?.collisionManager?.walkmesh || door.isOpen()){
        continue;
      }
      const wok = door.collisionManager.walkmesh;
      const hits = wok.raycast(raycaster, wok.faces) || [];
      if(hits.length > 0){
        return true;
      }
    }
  }

  return false;
}
