/**
 * Object isOnScreen must use a frustum rebuilt from the current camera pose
 * (same timing as Area: FollowerCamera → updateViewportFrustum → sync).
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';

/** Mirrors GameLoop.updateViewportFrustum frustum rebuild. */
function rebuildViewportFrustum(camera: THREE.Camera, out: THREE.Frustum, mat = new THREE.Matrix4()): THREE.Frustum {
  camera.updateMatrixWorld(true);
  const persp = camera as THREE.PerspectiveCamera;
  if(typeof persp.updateProjectionMatrix === 'function'){
    persp.updateProjectionMatrix();
  }
  mat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  out.setFromProjectionMatrix(mat);
  return out;
}

function sphereOnScreen(frustum: THREE.Frustum, center: THREE.Vector3, radius = 0.5): boolean {
  return frustum.intersectsSphere(new THREE.Sphere(center, radius));
}

describe('object on-screen cull from current camera frustum', () => {
  test('stale prior-frame frustum hides a creature that the snapped chase pose would show', () => {
    const frustum = new THREE.Frustum();
    const mat = new THREE.Matrix4();

    // Prior-frame / pre-load camera at origin
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    cam.position.set(0, 0, 0);
    cam.lookAt(0, 1, 0);
    rebuildViewportFrustum(cam, frustum, mat);

    const creatureNearPlayer = new THREE.Vector3(50, 0, 0);
    const creatureFarAway = new THREE.Vector3(500, 0, 0);

    expect(sphereOnScreen(frustum, creatureNearPlayer)).toBe(false);
    expect(sphereOnScreen(frustum, creatureFarAway)).toBe(false);

    // Chase snap behind the player — object cull must rebuild from this pose
    cam.position.set(55, 0, 5);
    cam.lookAt(50, 0, 0);
    rebuildViewportFrustum(cam, frustum, mat);

    expect(sphereOnScreen(frustum, creatureNearPlayer)).toBe(true);
    expect(sphereOnScreen(frustum, creatureFarAway)).toBe(false);
  });
});
