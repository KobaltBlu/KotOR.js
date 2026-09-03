import * as THREE from "three";
import { envMapRotationFromCamera } from "@/utility/envMapRotation";

describe("envMapRotationFromCamera", () => {
  test("identity when camera is missing", () => {
    const m = new THREE.Matrix3().set(2, 0, 0, 0, 2, 0, 0, 0, 2);
    envMapRotationFromCamera(undefined, m);
    expect(m.elements).toEqual(new THREE.Matrix3().identity().elements);
  });

  test("copies camera world rotation (yaw 90° around Y)", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    camera.updateMatrixWorld(true);

    const m = new THREE.Matrix3();
    envMapRotationFromCamera(camera, m);

    const expected = new THREE.Matrix3().setFromMatrix4(camera.matrixWorld);
    for(let i = 0; i < 9; i++){
      expect(m.elements[i]).toBeCloseTo(expected.elements[i], 5);
    }

    // Rotation-only: translated camera still yields the same 3×3 as orientation alone.
    const moved = new THREE.PerspectiveCamera();
    moved.quaternion.copy(camera.quaternion);
    moved.position.set(10, 20, 30);
    moved.updateMatrixWorld(true);
    const m2 = new THREE.Matrix3();
    envMapRotationFromCamera(moved, m2);
    for(let i = 0; i < 9; i++){
      expect(m2.elements[i]).toBeCloseTo(expected.elements[i], 5);
    }
  });
});
