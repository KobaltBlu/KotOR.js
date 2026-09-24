/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import * as THREE from 'three';
import { computeBoundingBoxXY } from '@/gui/GUIFont';

describe('computeBoundingBoxXY', () => {
  it('avoids NaN z that Three r186 computeBoundingBox produces for itemSize 2', () => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 10, 0, 10, -5, 0, -5]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 2));

    // Baseline: stock Three path NaNs z via getZ() past the array.
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    geo.computeBoundingBox();
    err.mockRestore();
    expect(Number.isNaN(geo.boundingBox!.min.z) || Number.isNaN(geo.boundingBox!.max.z)).toBe(true);

    computeBoundingBoxXY(geo, positions);
    expect(geo.boundingBox!.min.toArray()).toEqual([0, -5, 0]);
    expect(geo.boundingBox!.max.toArray()).toEqual([10, 0, 0]);
  });

  it('makeEmpty on zero-length positions', () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 2));
    computeBoundingBoxXY(geo, []);
    expect(geo.boundingBox!.isEmpty()).toBe(true);
  });
});
