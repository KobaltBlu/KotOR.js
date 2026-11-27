import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {},
}));

import { OdysseyLightingBinder } from '@engine/render/three/odyssey/OdysseyLightingBinder';

describe('OdysseyLightingBinder envmap rotation', () => {
  test('updates for opposite angles with identical camera-matrix diagonals', () => {
    const material = new THREE.ShaderMaterial({
      defines: { USE_ENVMAP: '' },
      uniforms: { envMapRotation: { value: new THREE.Matrix3() } },
    });
    const camera = new THREE.PerspectiveCamera();

    camera.rotation.set(0, 0.25, 0);
    camera.updateMatrixWorld(true);
    OdysseyLightingBinder.writeEnvMapRotation(material, camera);
    const positiveYaw = (
      material.uniforms.envMapRotation.value as THREE.Matrix3
    ).elements.slice();

    // +yaw and -yaw have the same diagonal terms. The former diagonal-only
    // fingerprint treated them as one view and left the projection frozen.
    camera.rotation.set(0, -0.25, 0);
    camera.updateMatrixWorld(true);
    OdysseyLightingBinder.writeEnvMapRotation(material, camera);
    const negativeYaw = (
      material.uniforms.envMapRotation.value as THREE.Matrix3
    ).elements.slice();

    expect(negativeYaw).not.toEqual(positiveYaw);
    expect(Math.sign(negativeYaw[2])).toBe(-Math.sign(positiveYaw[2]));
  });

  test('model envmap pass updates independently of lighting cache', () => {
    const material = new THREE.ShaderMaterial({
      defines: { USE_ENVMAP: '' },
      uniforms: { envMapRotation: { value: new THREE.Matrix3() } },
    });
    const model = new THREE.Group() as any;
    model.materials = [material];
    const camera = new THREE.PerspectiveCamera();

    camera.rotation.set(0, 0.1, 0);
    camera.updateMatrixWorld(true);
    (OdysseyLightingBinder as any).bindModelEnvMapRotations(model, camera);
    const first = (
      material.uniforms.envMapRotation.value as THREE.Matrix3
    ).elements.slice();

    camera.rotation.set(0, 0.2, 0);
    camera.updateMatrixWorld(true);
    (OdysseyLightingBinder as any).bindModelEnvMapRotations(model, camera);
    const second = (
      material.uniforms.envMapRotation.value as THREE.Matrix3
    ).elements.slice();

    expect(second).not.toEqual(first);
  });

  test('per-draw hook follows the render camera without another bind', () => {
    // Area binds are throttled and cached; the draw-time hook must track the camera.
    const material = new THREE.ShaderMaterial({
      defines: { USE_ENVMAP: '' },
      uniforms: { envMapRotation: { value: new THREE.Matrix3() } },
    });
    const camera = new THREE.PerspectiveCamera();
    camera.updateMatrixWorld(true);
    OdysseyLightingBinder.writeEnvMapRotation(material, camera);
    material.uniformsNeedUpdate = false;

    camera.rotation.set(0.1, 0.7, 0);
    camera.updateMatrixWorld(true);
    const draw = material.onBeforeRender as unknown as (...args: unknown[]) => void;
    draw.call(material, null, null, camera, null, null, null);

    const expected = new THREE.Matrix3().setFromMatrix4(camera.matrixWorld);
    const actual = material.uniforms.envMapRotation.value as THREE.Matrix3;
    for(let i = 0; i < 9; i++){
      expect(actual.elements[i]).toBeCloseTo(expected.elements[i], 6);
    }
    expect(material.uniformsNeedUpdate).toBe(true);

    // Unchanged camera: no redundant upload request.
    material.uniformsNeedUpdate = false;
    draw.call(material, null, null, camera, null, null, null);
    expect(material.uniformsNeedUpdate).toBe(false);
  });

  test('hook installed before USE_ENVMAP starts tracking once the define appears', () => {
    const material = new THREE.ShaderMaterial({ uniforms: {} });
    const camera = new THREE.PerspectiveCamera();
    OdysseyLightingBinder.writeEnvMapRotation(material, camera);
    expect(material.uniforms.envMapRotation).toBeUndefined();

    material.defines = { USE_ENVMAP: '' };
    camera.rotation.set(0, 0.4, 0);
    camera.updateMatrixWorld(true);
    const draw = material.onBeforeRender as unknown as (...args: unknown[]) => void;
    draw.call(material, null, null, camera, null, null, null);
    const expected = new THREE.Matrix3().setFromMatrix4(camera.matrixWorld);
    expect((material.uniforms.envMapRotation.value as THREE.Matrix3).elements[2])
      .toBeCloseTo(expected.elements[2], 6);
  });
});
