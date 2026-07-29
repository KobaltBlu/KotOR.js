import { GameState } from "@/GameState";
import { SWGrenadeSound } from "@/engine/rules/SWGrenadeSound";
import type { ModuleObject } from "@/module/ModuleObject";
import * as THREE from "three";

/**
 * Retail GrenadeSND.2da accessors — bounce sound by surfacemat row index.
 *
 * @file grenade-sound.ts
 */

function pickRowField(row: Record<string, any> | undefined, ...keys: string[]): string {
  if(!row) return '';
  const lowerMap: Record<string, any> = {};
  for(const k of Object.keys(row)){
    lowerMap[k.toLowerCase()] = row[k];
  }
  for(let i = 0; i < keys.length; i++){
    const v = lowerMap[keys[i].toLowerCase()];
    if(v != null && String(v).trim() !== '' && String(v) !== '****'){
      return String(v).trim();
    }
  }
  return '';
}

/**
 * Resolve a GrenadeSND row by surfacemat index (retail row id).
 */
export function getGrenadeSoundBySurfaceId(surfaceId: number): SWGrenadeSound | undefined {
  if(!Number.isFinite(surfaceId) || surfaceId < 0) return undefined;
  const fromRules = GameState.SWRuleSet?.grenadeSounds?.[surfaceId | 0];
  if(fromRules) return fromRules;

  const table = GameState.TwoDAManager?.datatables?.get('grenadesnd');
  if(!table) return undefined;
  const row =
    table.getByID?.(surfaceId) ||
    table.rows?.[surfaceId] ||
    table.rows?.[String(surfaceId)];
  if(!row) return undefined;
  return SWGrenadeSound.From2DA(row);
}

/**
 * Resolve by surface label (Dirt, Metal, …) — case-insensitive.
 */
export function getGrenadeSoundByLabel(label: string): SWGrenadeSound | undefined {
  const needle = String(label || '').trim().toLowerCase();
  if(!needle) return undefined;

  const list = GameState.SWRuleSet?.grenadeSounds;
  if(list?.length){
    for(let i = 0; i < list.length; i++){
      if((list[i]?.label || '').toLowerCase() === needle) return list[i];
    }
  }

  const table = GameState.TwoDAManager?.datatables?.get('grenadesnd');
  if(!table?.rows) return undefined;
  const keys = Object.keys(table.rows);
  for(let i = 0; i < keys.length; i++){
    const row = table.rows[keys[i]];
    if(pickRowField(row, 'label').toLowerCase() === needle){
      return SWGrenadeSound.From2DA(row);
    }
  }
  return undefined;
}

/**
 * Resolve surfacemat walkIndex under a world position (walkable-face scan).
 */
export function resolveSurfaceIdAtPosition(position: THREE.Vector3): number {
  const rooms = GameState.module?.area?.rooms;
  if(!rooms?.length || !position) return -1;
  for(let i = 0; i < rooms.length; i++){
    const walkmesh = rooms[i]?.collisionManager?.walkmesh;
    const faces = walkmesh?.walkableFaces;
    if(!faces) continue;
    for(let j = 0; j < faces.length; j++){
      const face = faces[j];
      if(face?.triangle?.containsPoint?.(position)){
        return face.walkIndex | 0;
      }
    }
  }
  return -1;
}

/**
 * Play the GrenadeSND bounce/impact sample at a world position.
 * No-ops when the surface maps to **** / empty.
 */
export function playGrenadeBounceSoundAt(
  surfaceId: number,
  position: THREE.Vector3,
  emitterOwner?: ModuleObject
): void {
  const entry = getGrenadeSoundBySurfaceId(surfaceId);
  const resref = entry?.getSoundResRef();
  if(!resref) return;

  const emitter = emitterOwner?.audioEmitter;
  if(emitter && typeof emitter.playSound === 'function'){
    emitter.setPosition?.(position.x, position.y, position.z);
    emitter.playSound(resref);
    return;
  }

  const area = GameState.module?.area as any;
  if(area?.audioEmitter?.playSound){
    area.audioEmitter.setPosition?.(position.x, position.y, position.z);
    area.audioEmitter.playSound(resref);
  }
}

/**
 * Resolve surface under position and play the matching GrenadeSND sample.
 */
export function playGrenadeBounceAtPosition(
  position: THREE.Vector3,
  emitterOwner?: ModuleObject
): void {
  const surfaceId = resolveSurfaceIdAtPosition(position);
  if(surfaceId < 0) return;
  playGrenadeBounceSoundAt(surfaceId, position, emitterOwner);
}
