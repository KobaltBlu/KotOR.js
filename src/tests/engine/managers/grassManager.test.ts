import { describe, expect, test, jest } from '@jest/globals';
import * as THREE from 'three';
import {
  GRASS_LOD_FAR_DIST,
  GRASS_LOD_FULL_DIST,
  GRASS_LOD_MID_DIST,
  GRASS_LOD_MID_FRACTION,
  binCellKey,
  colorFromAreDword,
  computeFaceGrassCount,
  computeGrassBoundaryEdges,
  computeGrassLodFraction,
  grassInstanceRank,
  grassVisibleInstanceCount,
  triangleR2Barycentric,
  grassMeshOffset,
  normalizeGrassProbability,
  pickGrassTextureQuad,
  resolveGrassFaces,
} from '@engine/managers/grass/grassHelpers';

jest.mock('@engine/runtime/GameState', () => ({
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

import { GrassManager } from '@engine/managers/GrassManager';
import { GrassTrampleField } from '@engine/managers/grass/GrassTrampleField';

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
  test('computeFaceGrassCount scales and stochastically rounds', () => {
    expect(computeFaceGrassCount(2.4, 1, 1, () => 0.5)).toBe(2);
    expect(computeFaceGrassCount(2.4, 1, 1, () => 0.3)).toBe(3);
    expect(computeFaceGrassCount(2, 1, 2.5, () => 0.99)).toBe(5);
    expect(computeFaceGrassCount(10, 0)).toBe(0);
    expect(computeFaceGrassCount(0, 5)).toBe(0);
    // Tiny faces still get grass on average (no bald fine-mesh patches).
    let total = 0;
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for(let i = 0; i < 4000; i++) total += computeFaceGrassCount(0.1, 1, 1, rnd);
    expect(total / 4000).toBeGreaterThan(0.08);
    expect(total / 4000).toBeLessThan(0.12);
  });

  test('triangleR2Barycentric stays inside the triangle', () => {
    const out = new THREE.Vector3();
    for(let i = 0; i < 200; i++){
      triangleR2Barycentric(i, 0.3, 0.7, out);
      expect(out.x).toBeGreaterThanOrEqual(-1e-9);
      expect(out.y).toBeGreaterThanOrEqual(0);
      expect(out.z).toBeGreaterThanOrEqual(0);
      expect(out.x + out.y + out.z).toBeCloseTo(1);
    }
  });

  test('computeGrassBoundaryEdges flags only unshared edges', () => {
    // Two triangles sharing edge (1,0,0)-(0,1,0).
    const verts = [0,0,0, 1,0,0, 0,1,0, 1,1,0];
    const faces = [{ a: 0, b: 1, c: 2 }, { a: 1, b: 3, c: 2 }] as any;
    const flags = computeGrassBoundaryEdges(faces, 'aabb', verts, undefined);
    expect(flags[0]).toBe(0b101); // AB and CA border; BC shared
    expect(flags[1]).toBe(0b011); // AB and BC border; CA shared
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

  test('LOD keeps everything near and thins smoothly with distance', () => {
    expect(computeGrassLodFraction(0)).toBe(1);
    expect(computeGrassLodFraction(GRASS_LOD_FULL_DIST)).toBe(1);
    expect(computeGrassLodFraction(GRASS_LOD_MID_DIST)).toBeCloseTo(GRASS_LOD_MID_FRACTION);
    expect(computeGrassLodFraction(GRASS_LOD_FAR_DIST)).toBe(0);
    let prev = 1;
    for(let d = 0; d < GRASS_LOD_FAR_DIST + 5; d += 0.5){
      const f = computeGrassLodFraction(d);
      expect(f).toBeLessThanOrEqual(prev + 1e-9);
      prev = f;
    }
  });

  test('visible prefix covers every blade the shader can draw', () => {
    const total = 1000;
    expect(grassVisibleInstanceCount(total, 1)).toBe(total);
    expect(grassVisibleInstanceCount(total, 0)).toBe(0);
    for(const keep of [0.05, 0.3, 0.6, 0.87]){
      const n = grassVisibleInstanceCount(total, keep);
      // Instance n (first culled) must have rank >= keep, i.e. zero size in shader.
      if(n < total) expect(grassInstanceRank(n, total)).toBeGreaterThanOrEqual(keep - 1e-9);
    }
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

describe('GrassTrampleField', () => {
  test('stamping bends grass away from the body and it springs back', () => {
    const field = new GrassTrampleField(64, 0.25);
    field.setFocus(0, 0);
    for(let i = 0; i < 10; i++) field.stamp(0, 0, 1, 0, 0, 1, 1 / 60);
    const bend = field.sample(0.6, 0, new THREE.Vector2());
    expect(bend.x).toBeGreaterThan(0.3);
    expect(Math.abs(bend.y)).toBeLessThan(bend.x * 0.35);
    expect(field.activeCount).toBeGreaterThan(0);

    // Held briefly after the foot lifts...
    field.update(0.2);
    expect(field.sample(0.6, 0).x).toBeGreaterThan(0.3);
    // ...then recovers fully and deactivates.
    for(let i = 0; i < 600; i++) field.update(1 / 60);
    expect(field.sample(0.6, 0).length()).toBeLessThan(0.01);
    expect(field.activeCount).toBe(0);
  });

  test('moving bodies push grass toward travel direction', () => {
    const field = new GrassTrampleField(64, 0.25);
    field.setFocus(0, 0);
    for(let i = 0; i < 10; i++) field.stamp(0, 0, 1, 4, 0, 1, 1 / 60);
    // Beside the path, blades lean outward and forward.
    const side = field.sample(0, 0.6);
    expect(side.y).toBeGreaterThan(0);
    expect(side.x).toBeGreaterThan(0);
  });

  test('recentering evicts texels outside the window', () => {
    const field = new GrassTrampleField(64, 0.25); // 16 unit window
    field.setFocus(0, 0);
    field.stamp(0, 0, 1, 0, 0, 1, 1 / 60);
    expect(field.activeCount).toBeGreaterThan(0);
    field.setFocus(100, 100);
    expect(field.activeCount).toBe(0);
    expect(field.sample(0, 0).length()).toBe(0);
  });
});
