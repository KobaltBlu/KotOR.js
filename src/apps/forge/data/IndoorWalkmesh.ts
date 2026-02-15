import * as THREE from "three";

import { OdysseyWalkMesh } from "@/apps/forge/KotOR";
import { BinaryReader } from "@/utility/binary/BinaryReader";

export type WalkmeshTransform = {
  position: THREE.Vector3;
  rotationDegrees: number;
  flipX: boolean;
  flipY: boolean;
};

export const cloneWalkmeshFromBuffer = (buffer: Uint8Array): OdysseyWalkMesh => {
  return new OdysseyWalkMesh(new BinaryReader(buffer));
};

export const cloneWalkmesh = (walkmesh: OdysseyWalkMesh): OdysseyWalkMesh => {
  const buffer = walkmesh.toExportBuffer();
  return cloneWalkmeshFromBuffer(buffer);
};

export const applyWalkmeshTransform = (walkmesh: OdysseyWalkMesh, transform: WalkmeshTransform): void => {
  const { position, rotationDegrees, flipX, flipY } = transform;
  const rotation = (rotationDegrees * Math.PI) / 180;
  const scaleX = flipX ? -1 : 1;
  const scaleY = flipY ? -1 : 1;

  const matrix = new THREE.Matrix4();
  const scale = new THREE.Matrix4().makeScale(scaleX, scaleY, 1);
  const rotate = new THREE.Matrix4().makeRotationZ(rotation);
  const translate = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);

  matrix.identity();
  matrix.multiply(scale);
  matrix.multiply(rotate);
  matrix.multiply(translate);

  walkmesh.mat4.copy(matrix);
  walkmesh.updateMatrix();
  walkmesh.buildBufferedGeometry();
  if (walkmesh.mesh) {
    walkmesh.mesh.geometry.dispose();
    walkmesh.mesh.geometry = walkmesh.geometry;
  }
};

export const collectWalkmeshFaceVertices = (walkmesh: OdysseyWalkMesh): Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]> => {
  return walkmesh.faces.map((face) => {
    return [
      walkmesh.vertices[face.a],
      walkmesh.vertices[face.b],
      walkmesh.vertices[face.c],
    ];
  });
};
