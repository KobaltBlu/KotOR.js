import type * as THREE from "three";

/**
 * IOdysseyModelAABBNode interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyModelAABBNode.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyModelAABBNode {
  type: string,
  box: THREE.Box3,
  _box?: THREE.Box3,
  leftNodeOffset: number,
  rightNodeOffset: number,
  faceIdx: number,
  mostSignificantPlane: number,
  leftNode?: IOdysseyModelAABBNode,
  rightNode?: IOdysseyModelAABBNode,
  face: any,
  unknownFixedAt4?: number
};