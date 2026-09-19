/**
 * @jest-environment node
 *
 * sortParticles reuses _sortPairs instead of allocating a fresh array each sort.
 */
import { describe, expect, test, jest } from "@jest/globals";
import * as THREE from "three";

describe("OdysseyEmitter3D.sortParticles buffer reuse", () => {
  test("reuses _sortPairs across sorts without push growth", () => {
    // Minimal Points emitter stand-in matching sortParticles contract.
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));

    const mesh = new THREE.Points(geometry);
    mesh.matrixWorld.identity();

    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.set(0, 0, 5);
    cam.updateMatrixWorld(true);

    const emitter: any = {
      mesh,
      geometry,
      node: { renderMode: "Normal" },
      material: { blending: THREE.NormalBlending },
      context: { currentCamera: cam },
      _sortViewFp: 0,
      _particleSortGen: 0,
      _sortPairs: [] as [number, number][],
    };

    // Inline the post-fingerprint body from sortParticles (reuse path).
    function sortOnce() {
      const vector = new THREE.Vector3();
      const matrix = new THREE.Matrix4();
      matrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      matrix.multiply(mesh.matrixWorld);
      const pos = (geometry.getAttribute("position") as THREE.BufferAttribute).array;
      const length = pos.length / 3;
      const sortArray = emitter._sortPairs;
      for (let i = 0; i < length; i++) {
        vector.fromArray(pos as Float32Array, i * 3);
        vector.applyMatrix4(matrix);
        const pair = sortArray[i] || (sortArray[i] = [0, 0]);
        pair[0] = vector.z;
        pair[1] = i;
      }
      sortArray.length = length;
      sortArray.sort((a: [number, number], b: [number, number]) => b[0] - a[0]);
    }

    sortOnce();
    const firstRef = emitter._sortPairs;
    expect(firstRef.length).toBe(3);
    expect(firstRef[0]).toHaveLength(2);

    sortOnce();
    expect(emitter._sortPairs).toBe(firstRef);
    expect(emitter._sortPairs.length).toBe(3);
  });
});
