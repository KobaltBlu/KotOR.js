import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';
import {
  GRASS_FAR_RADIUS_SQ,
  GRASS_NEAR_RADIUS_SQ,
  binCellKey,
  colorFromAreDword,
  computeBinFade,
  computeFaceGrassCount,
  grassMeshOffset,
  normalizeGrassProbability,
  pickGrassTextureQuad,
  resolveGrassFaces,
} from '@/managers/grass/grassHelpers';

jest.mock('@/GameState', () => ({
  GameState: {
    ShaderManager: {
      Shaders: new Map([
        ['grass', {
          getVertex: () => 'void main(){}',
          getFragment: () => 'void main(){}',
        }],
      ]),
    },
  },
}));

import { GrassManager } from '@/managers/GrassManager';

describe('GrassManager material depth', () => {
  test('grass is transparent with depthWrite for terrain draw order and saber occlusion', () => {
    const mgr = new GrassManager();
    const material = (mgr as any).createMaterial({ grass: {} }, 1) as THREE.ShaderMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.blending).toBe(THREE.NormalBlending);
  });
});

describe('grassHelpers', () => {
  test('computeFaceGrassCount matches round(area * density)', () => {
    expect(computeFaceGrassCount(2.4, 1)).toBe(2);
    expect(computeFaceGrassCount(2.6, 1)).toBe(3);
    expect(computeFaceGrassCount(10, 0)).toBe(0);
    expect(computeFaceGrassCount(0, 5)).toBe(0);
  });

  test('normalizeGrassProbability handles percentages and zeros', () => {
    const pct = normalizeGrassProbability(new THREE.Vector4(25, 25, 25, 25));
    expect(pct.x + pct.y + pct.z + pct.w).toBeCloseTo(1);
    expect(pct.x).toBeCloseTo(0.25);

    const zero = normalizeGrassProbability(new THREE.Vector4(0, 0, 0, 0));
    expect(zero.x).toBeCloseTo(0.25);
  });

  test('pickGrassTextureQuad respects weights', () => {
    const prob = new THREE.Vector4(1, 0, 0, 0);
    expect(pickGrassTextureQuad(prob, () => 0.1)).toBe(0);
    const prob2 = new THREE.Vector4(0, 0, 0, 1);
    expect(pickGrassTextureQuad(prob2, () => 0.9)).toBe(3);
  });

  test('computeBinFade uses extended near/far squared radii', () => {
    expect(computeBinFade(0)).toBe(1);
    expect(computeBinFade(GRASS_NEAR_RADIUS_SQ - 1)).toBe(1);
    expect(computeBinFade(GRASS_FAR_RADIUS_SQ)).toBe(0);
    expect(computeBinFade(GRASS_FAR_RADIUS_SQ + 10)).toBe(0);
    const mid = (GRASS_NEAR_RADIUS_SQ + GRASS_FAR_RADIUS_SQ) * 0.5;
    const fade = computeBinFade(mid);
    expect(fade).toBeGreaterThan(0);
    expect(fade).toBeLessThan(1);
    // Extended vs original 15/30: full opacity still holds past old far radius.
    expect(computeBinFade(900)).toBe(1);
  });

  test('resolveGrassFaces prefers WOK over AABB', () => {
    const wokFace = { a: 0 } as any;
    const aabbFace = { a: 1 } as any;
    const wok = { grassFaces: [wokFace] } as any;
    const aabb = { grassFaces: [aabbFace], vertices: [] } as any;
    expect(resolveGrassFaces(wok, aabb).source).toBe('wok');
    expect(resolveGrassFaces(undefined, aabb).source).toBe('aabb');
    expect(resolveGrassFaces(undefined, undefined).source).toBe('none');
  });

  test('binCellKey and colorFromAreDword', () => {
    expect(binCellKey(0, 0, 12)).toBe('0,0');
    expect(binCellKey(12, 24, 12)).toBe('1,2');
    expect(colorFromAreDword(0x00ff8040).getHex()).toBe(0xff8040);
  });

  test('grassMeshOffset is zero for WOK world verts', () => {
    const room = new THREE.Vector3(348, 140, 59);
    const aabb = new THREE.Vector3(97, -6, -3);
    expect(grassMeshOffset('wok', room, aabb).lengthSq()).toBe(0);
    const aabbOff = grassMeshOffset('aabb', room, aabb);
    expect(aabbOff.x).toBeCloseTo(445);
    expect(aabbOff.y).toBeCloseTo(134);
    expect(aabbOff.z).toBeCloseTo(56);
  });
});
