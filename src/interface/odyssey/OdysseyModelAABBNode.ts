import * as THREE from "three";

export interface OdysseyModelAABBNode {
  type: string,
  box: THREE.Box3,
  _box?: THREE.Box3,
  leftNodeOffset: number,
  rightNodeOffset: number,
  faceIdx: number,
  mostSignificantPlane: number,
  leftNode?: OdysseyModelAABBNode,
  rightNode?: OdysseyModelAABBNode,
  face: any,
  unknownFixedAt4?: number
};