/**
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';
import { updateDanglyWindMesh } from '@/odyssey/DanglyWindSimulator';

describe('DanglyWindSimulator matrix scope', () => {
  test('updateDanglyWindMesh refreshes ancestors only (no subtree walk)', () => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry());
    mesh.userData.danglySim = {
      rest: new Float32Array(0),
      pos: new Float32Array(0),
      vel: new Float32Array(0),
      constraints: new Float32Array(0),
      displacement: new Float32Array(0),
      tightness: new Float32Array(0),
      period: new Float32Array(0),
      lastWorldPos: new THREE.Vector3(),
      lastWorldQuat: new THREE.Quaternion(),
      initialized: false,
    };

    const spy = jest.spyOn(mesh, 'updateWorldMatrix');
    const wm = {
      uniformValues: {
        windDanglyElapsed: { value: 0.02 },
      },
      getGlobalWind: jest.fn(() => new THREE.Vector3(1, 0, 0)),
    } as any;

    updateDanglyWindMesh(mesh, wm, 0.016);

    expect(spy).toHaveBeenCalledWith(true, false);
  });
});
