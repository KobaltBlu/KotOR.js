import * as THREE from "three";
import type { ModuleTrigger } from "@/module/ModuleTrigger";

/**
 * Retail CreateNewGeometry(halfExtent=2.0) — used by
 * set-mine action for free-ground traps.
 *
 * Builds an axis-aligned square footprint centered on the trigger (±halfExtent).
 *
 * @file trap-geometry.ts
 */

/** Retail SetMine free-ground half-extent (CreateNewGeometry 2.0). */
export const TRAP_GROUND_HALF_EXTENT = 2.0;

/**
 * Assign local-space trigger vertices for a square mine footprint.
 */
export function applyTrapGroundGeometry(
  trigger: ModuleTrigger,
  halfExtent: number = TRAP_GROUND_HALF_EXTENT
): void {
  if(!trigger) return;
  const h = Math.max(0.1, Number(halfExtent) || TRAP_GROUND_HALF_EXTENT);
  trigger.vertices = [
    new THREE.Vector3(-h,  h, 0),
    new THREE.Vector3(-h, -h, 0),
    new THREE.Vector3( h,  h, 0),
    new THREE.Vector3( h, -h, 0),
  ];
}

/**
 * traps.2da `resref` for RecoverMine item restore.
 */
export function trapKitResRefFromRow(trapRow: any): string {
  if(!trapRow) return '';
  const resref = (trapRow.resref || '').toString().trim();
  if(!resref || resref === '****') return '';
  return resref;
}
