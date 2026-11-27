import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { ensureMergeCompatibleAttributes } from '@engine/render/three/odyssey/ensureMergeCompatibleAttributes';

describe('ensureMergeCompatibleAttributes', () => {
  test('pads missing uv1 so merge does not zero-fill lightmap UVs', () => {
    const withLm = new THREE.BufferGeometry();
    withLm.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    withLm.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    withLm.setAttribute('uv1', new THREE.Float32BufferAttribute([0.25, 0.5, 0.75, 0.5, 0.5, 0.75], 2));
    withLm.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));

    const noLm = new THREE.BufferGeometry();
    noLm.setAttribute('position', new THREE.Float32BufferAttribute([2, 0, 0, 3, 0, 0, 2, 1, 0], 3));
    noLm.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    // no uv1, no normal — previously caused dark LM patches after merge

    ensureMergeCompatibleAttributes([withLm, noLm]);

    expect(noLm.getAttribute('uv1')).toBeTruthy();
    expect(noLm.getAttribute('uv1').count).toBe(3);
    expect(noLm.getAttribute('normal')).toBeTruthy();
    expect(noLm.getAttribute('normal').count).toBe(3);
    // uv1 falls back to diffuse uv when missing
    expect(noLm.getAttribute('uv1').getX(1)).toBe(1);
    expect(noLm.getAttribute('uv1').getY(1)).toBe(0);
  });

  test('repairs short uv1 to match vertex count', () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    geo.setAttribute('uv1', new THREE.Float32BufferAttribute([0.5, 0.5], 2)); // only 1 vert

    const other = new THREE.BufferGeometry();
    other.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    other.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    other.setAttribute('uv1', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));

    ensureMergeCompatibleAttributes([geo, other]);
    expect(geo.getAttribute('uv1').count).toBe(3);
  });
});
