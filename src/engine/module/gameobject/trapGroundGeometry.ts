import * as THREE from 'three';
import type { Trigger } from '@engine/module/Trigger';

export const TRAP_GROUND_HALF_EXTENT = 2.0;

export function applyTrapGroundGeometry(
  trigger: Trigger,
  halfExtent: number = TRAP_GROUND_HALF_EXTENT,
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

export function trapKitResRefFromRow(trapRow: any): string {
  if(!trapRow) return '';
  const resref = (trapRow.resref || '').toString().trim();
  if(!resref || resref === '****') return '';
  return resref;
}
