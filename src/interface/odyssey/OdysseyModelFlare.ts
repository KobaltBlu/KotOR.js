import * as THREE from "three";

export interface OdysseyModelFlare {
  radius: number,
  sizes: number[],
  positions: number[],
  colorShifts: THREE.Color[],
  textures: string[]
}