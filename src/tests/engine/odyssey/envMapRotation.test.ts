import { describe, expect, test } from "@jest/globals";
import * as THREE from "three";
import {
  envMapRotationFromCamera,
  installEnvMapRotationHook,
} from "@engine/render/envMapRotation";

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

  test("cloned materials get their own draw hook", () => {
    const source = new THREE.ShaderMaterial({
      defines: { USE_ENVMAP: "" },
      uniforms: { envMapRotation: { value: new THREE.Matrix3() } },
    });
    installEnvMapRotationHook(source);
    const clone = source.clone();
    installEnvMapRotationHook(clone);

    const camera = new THREE.PerspectiveCamera();
    camera.rotation.set(0, 0.6, 0);
    camera.updateMatrixWorld(true);
    const draw = clone.onBeforeRender as unknown as (...args: unknown[]) => void;
    draw.call(clone, null, null, camera, null, null, null);

    const expected = new THREE.Matrix3().setFromMatrix4(camera.matrixWorld);
    const actual = clone.uniforms.envMapRotation.value as THREE.Matrix3;
    expect(actual.elements[2]).toBeCloseTo(expected.elements[2], 6);
  });
});

