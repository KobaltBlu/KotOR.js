import type * as THREE from "three";

/**
 * ILayoutRoom interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ILayoutRoom.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface ILayoutRoom {
  name: string;
  position: THREE.Vector3;
}
