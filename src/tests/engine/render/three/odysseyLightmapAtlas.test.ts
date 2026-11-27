import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import {
  atlasRectFromPlacement,
  packLightmapAtlas,
} from '@engine/render/three/odyssey/OdysseyLightmapAtlas';

describe('OdysseyLightmapAtlas.packLightmapAtlas', () => {
  test('converts top-down canvas placement to flipY texture UV space', () => {
    expect(atlasRectFromPlacement(
      { x: 64, y: 0, w: 16, h: 16 },
      256,
      64,
    )).toEqual({
      u: 0.25,
      v: 0.75,
      su: 0.0625,
      sv: 0.25,
    });
  });

  test('returns null for empty input', () => {
    expect(packLightmapAtlas([])).toBeNull();
  });

  test('returns null without DOM document (node test env)', () => {
    const tex = new THREE.Texture();
    (tex as any).image = { width: 64, height: 64 };
    // Node jest has no document — pack must fail closed instead of throwing.
    expect(typeof document === 'undefined' || !document.createElement).toBe(true);
    expect(packLightmapAtlas([tex])).toBeNull();
  });
});
