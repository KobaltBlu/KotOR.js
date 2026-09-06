import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { PlaceableLightmapBaker } from '@/managers/PlaceableLightmapBaker';
import type { LightManager } from '@/managers/LightManager';
import type { OdysseyLight3D } from '@/three/odyssey/OdysseyLight3D';
import type { ModulePlaceable } from '@/module/ModulePlaceable';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';

function mockLightManager(overrides: Partial<LightManager> = {}): LightManager {
  return {
    lights: [],
    ambientColor: new THREE.Color(0.05, 0.05, 0.05),
    sunAmbientColor: new THREE.Color(0, 0, 0),
    sunColor: new THREE.Color(0, 0, 0),
    sunDirection: new THREE.Vector3(0, 0, 1),
    ...overrides,
  } as unknown as LightManager;
}

function makePlaceable(geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial){
  const mesh = new THREE.Mesh(geometry, material);
  const model = new THREE.Object3D() as OdysseyModel3D;
  model.materials = [material];
  model.add(mesh);
  const container = new THREE.Object3D();
  container.add(model);
  const plc = { model, container, destroyed: false } as unknown as ModulePlaceable;
  return { plc, model, mesh, material, geometry };
}

describe('PlaceableLightmapBaker', () => {
  test('applyLightmap sets USE_LIGHTMAP and clears IGNORE_LIGHTING', () => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        lightMap: { value: null },
      },
      defines: {
        IGNORE_LIGHTING: '',
      },
    });
    const data = new Float32Array(4);
    data[0] = 0.5; data[1] = 0.5; data[2] = 0.5; data[3] = 1;
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat, THREE.FloatType);
    PlaceableLightmapBaker.applyLightmap(material, tex);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'IGNORE_LIGHTING')).toBe(false);
    expect(material.uniforms.lightMap.value).toBe(tex);
    expect(material.userData.odysseyRuntimeLightmap).toBe(true);
    tex.dispose();
    material.dispose();
  });

  test('bakePlaceable writes DynAmbient into lightmap and marks model baked', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ], 3));
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2));

    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: { IGNORE_LIGHTING: '' },
    });
    const { plc, model } = makePlaceable(geometry, material);
    plc.container.position.set(10, 20, 0);

    const lm = mockLightManager({ ambientColor: new THREE.Color(0.2, 0.2, 0.25) });
    PlaceableLightmapBaker.bakePlaceable(plc, lm);

    expect(model.userData.odysseyPlaceableLightmap).toBe(true);
    expect(PlaceableLightmapBaker.isBaked(plc)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'IGNORE_LIGHTING')).toBe(false);

    const tex = material.uniforms.lightMap.value as THREE.DataTexture;
    expect(tex).toBeTruthy();
    const pixels = tex.image.data as Float32Array;
    let foundAmbient = false;
    for(let i = 0; i < pixels.length; i += 4){
      if(pixels[i] >= 0.19 && pixels[i + 1] >= 0.19 && pixels[i + 2] >= 0.24){
        foundAmbient = true;
        break;
      }
    }
    expect(foundAmbient).toBe(true);

    PlaceableLightmapBaker.dispose(plc);
    expect(PlaceableLightmapBaker.isBaked(plc)).toBe(false);
    material.dispose();
    geometry.dispose();
  });

  test('rejects UV1-as-UV2 copy and builds unique atlas charts', () => {
    // Indexed quad (two tris sharing verts) — classic placeable UV1→UV2 copy case.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
    ], 3));
    const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    // Diffuse copy as UV2 (what OdysseyModelNodeMesh does when UV2 is absent).
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uv.slice(0), 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);

    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { plc, mesh } = makePlaceable(geometry, material);
    const beforeUv2 = Array.from((geometry.attributes.uv2 as THREE.BufferAttribute).array);

    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager());

    const geo = mesh.geometry as THREE.BufferGeometry;
    expect(geo.userData.odysseyLightmapChartsReady).toBe(true);
    expect(geo.index).toBeNull(); // expanded to unique verts
    expect(geo.attributes.position.count).toBe(6); // 2 tris × 3 verts

    const afterUv2 = Array.from((geo.attributes.uv2 as THREE.BufferAttribute).array);
    // Atlas UVs must differ from the diffuse copy.
    expect(afterUv2).not.toEqual(beforeUv2);
    // Two triangles get distinct chart cells (u0 of each tri differs across grid).
    expect(afterUv2[0]).not.toBeCloseTo(afterUv2[6], 5);

    PlaceableLightmapBaker.dispose(plc);
    material.dispose();
    geometry.dispose();
  });

  test('bake shows spatial irradiance variation across differently lit triangles', () => {
    // Two triangles facing opposite directions; bright directional light along +Z.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      // Tri 0 — faces +Z (lit)
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      // Tri 1 — faces -Z (unlit by sun)
      0, 0, 0,
      0, 1, 0,
      1, 0, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1,
      0, 0, 1,
      0, 0, 1,
      0, 0, -1,
      0, 0, -1,
      0, 0, -1,
    ], 3));

    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { plc, mesh } = makePlaceable(geometry, material);

    const lm = mockLightManager({
      ambientColor: new THREE.Color(0.02, 0.02, 0.02),
      sunColor: new THREE.Color(1, 1, 1),
      sunDirection: new THREE.Vector3(0, 0, 1),
    });
    PlaceableLightmapBaker.bakePlaceable(plc, lm);

    const geo = mesh.geometry as THREE.BufferGeometry;
    const uv2 = geo.attributes.uv2 as THREE.BufferAttribute;
    const tex = material.uniforms.lightMap.value as THREE.DataTexture;
    const pixels = tex.image.data as Float32Array;
    const w = tex.image.width as number;
    const h = tex.image.height as number;

    const sampleChart = (triIndex: number): number => {
      // Sample near the centroid of the right-triangle chart for this tri.
      const i0 = triIndex * 3;
      const u = (uv2.getX(i0) + uv2.getX(i0 + 1) + uv2.getX(i0 + 2)) / 3;
      const v = (uv2.getY(i0) + uv2.getY(i0 + 1) + uv2.getY(i0 + 2)) / 3;
      const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
      const y = Math.min(h - 1, Math.max(0, Math.floor(v * h)));
      const o = (y * w + x) * 4;
      return (pixels[o] + pixels[o + 1] + pixels[o + 2]) / 3;
    };

    const lit = sampleChart(0);
    const unlit = sampleChart(1);
    expect(lit).toBeGreaterThan(unlit + 0.3);

    PlaceableLightmapBaker.dispose(plc);
    material.dispose();
    geometry.dispose();
  });

  test('collects only dynamicType 0 lights into bake (type 1 excluded)', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { plc } = makePlaceable(geometry, material);

    const type0 = {
      dynamicType: 0,
      isAmbient: true,
      color: new THREE.Color(1, 0, 0),
      worldPosition: new THREE.Vector3(0, 0, 0),
      getRadius: () => 5,
      getIntensity: () => 1,
      getWorldPosition: (out: THREE.Vector3) => out.set(0, 0, 0),
    } as unknown as OdysseyLight3D;

    const type1 = {
      dynamicType: 1,
      isAmbient: true,
      color: new THREE.Color(0, 1, 0),
      worldPosition: new THREE.Vector3(0, 0, 0),
      getRadius: () => 5,
      getIntensity: () => 1,
      getWorldPosition: (out: THREE.Vector3) => out.set(0, 0, 0),
    } as unknown as OdysseyLight3D;

    const lm = mockLightManager({ lights: [type0, type1] });
    PlaceableLightmapBaker.bakePlaceable(plc, lm);

    const tex = material.uniforms.lightMap.value as THREE.DataTexture;
    const pixels = tex.image.data as Float32Array;
    let maxR = 0, maxG = 0;
    for(let i = 0; i < pixels.length; i += 4){
      if(pixels[i] > maxR) maxR = pixels[i];
      if(pixels[i + 1] > maxG) maxG = pixels[i + 1];
    }
    expect(maxR).toBeGreaterThan(0.5);
    expect(maxG).toBeLessThan(0.5);

    PlaceableLightmapBaker.dispose(plc);
    material.dispose();
    geometry.dispose();
  });
});
