/**
 * @jest-environment node
 *
 * Mirrors OdysseyModel3D.disableMatrixUpdate: freeze all descendants,
 * keep the model root on matrixAutoUpdate = true for container moves.
 */
import { describe, expect, it } from "@jest/globals";
import * as THREE from "three";
import { OdysseyObject3D } from "@engine/render/three/odyssey/OdysseyObject3D";

function disableMatrixUpdate(root: THREE.Object3D) {
  root.traverse((node) => {
    node.matrixAutoUpdate = false;
  });
  root.matrixAutoUpdate = true;
}

describe("OdysseyModel3D.disableMatrixUpdate freezes leaf nodes", () => {
  it("sets matrixAutoUpdate false on bones and meshes, keeps root true", () => {
    const root = new OdysseyObject3D();
    const bone = new OdysseyObject3D();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial()
    );
    root.add(bone);
    bone.add(mesh);
    root.matrixAutoUpdate = true;
    bone.matrixAutoUpdate = true;
    mesh.matrixAutoUpdate = true;

    disableMatrixUpdate(root);

    expect(root.matrixAutoUpdate).toBe(true);
    expect(bone.matrixAutoUpdate).toBe(false);
    expect(mesh.matrixAutoUpdate).toBe(false);
  });
});
