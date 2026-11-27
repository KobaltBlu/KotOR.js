import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { ShaderOdysseyModel } from '@engine/render/shaders/ShaderOdysseyModel';

/** CPU copy of three's GLSL inverseTransformDirection(dir, matrix). */
function inverseTransformDirection(dir: THREE.Vector3, matrix: THREE.Matrix4): THREE.Vector3 {
  return dir.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(matrix).transpose()).normalize();
}

describe('Odyssey envmap sampling', () => {
  test('viewMatrix inverse equals retail eye-space × camera orientation', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(12, -40, 3);
    camera.rotation.set(0.4, -1.9, 0.3);
    camera.updateMatrixWorld(true);

    const cameraRotation = new THREE.Matrix3().setFromMatrix4(camera.matrixWorld);
    const eyeReflect = new THREE.Vector3(0.3, -0.5, 0.8).normalize();

    const retail = eyeReflect.clone().applyMatrix3(cameraRotation);
    const viaViewMatrix = inverseTransformDirection(eyeReflect, camera.matrixWorldInverse);

    expect(viaViewMatrix.x).toBeCloseTo(retail.x, 6);
    expect(viaViewMatrix.y).toBeCloseTo(retail.y, 6);
    expect(viaViewMatrix.z).toBeCloseTo(retail.z, 6);
  });

  test('fragment rotates the reflection with three\'s per-draw viewMatrix', () => {
    const fragment = new ShaderOdysseyModel().fragment;
    expect(fragment).toContain('inverseTransformDirection( reflectVec, viewMatrix )');
    expect(fragment).not.toContain('reflectVec = envMapRotation * reflectVec');
  });
});
