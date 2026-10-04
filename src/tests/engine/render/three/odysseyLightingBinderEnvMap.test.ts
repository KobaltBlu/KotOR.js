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
});
