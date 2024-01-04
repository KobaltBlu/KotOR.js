import type * as THREE from "three";

/**
 * IOdysseyModelFlare interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyModelFlare.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyModelFlare {
  radius: number,
  sizes: number[],
  positions: number[],
  colorShifts: THREE.Color[],
  textures: string[]
}