import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { PlaceableLightmapBaker } from '@/managers/PlaceableLightmapBaker';
import type { LightManager } from '@/managers/LightManager';
import type { OdysseyLight3D } from '@/three/odyssey/OdysseyLight3D';
import type { ModulePlaceable } from '@/module/ModulePlaceable';
import type { OdysseyModel3D } from '@/three/odyssey/OdysseyModel3D';
import { OdysseyModelControllerType } from '@/enums/odyssey/OdysseyModelControllerType';

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
  model.odysseyAnimations = [];
  model.skins = [];
  model.danglyMeshes = [];
  model.nodesById = [];
  model.nodes = new Map();
  model.add(mesh);
  const container = new THREE.Object3D();
  container.add(model);
  const plc = { model, container, destroyed: false } as unknown as ModulePlaceable;
  return { plc, model, mesh, material, geometry };
}

describe('PlaceableLightmapBaker', () => {
  test('applyLightmap sets USE_LIGHTMAP and clears IGNORE_LIGHTING', () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: { IGNORE_LIGHTING: '' },
    });
    const data = new Float32Array(4);
    data[0] = 0.5; data[1] = 0.5; data[2] = 0.5; data[3] = 1;
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat, THREE.FloatType);
    PlaceableLightmapBaker.applyLightmap(material, tex);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'IGNORE_LIGHTING')).toBe(false);
    tex.dispose();
    material.dispose();
  });

  test('authored userData.lightmap skips bake and leaves UV2 unchanged', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ], 3));
    const uv2 = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    geometry.setAttribute('uv2', new THREE.Float32BufferAttribute(uv2.slice(0), 2));

    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    material.userData.lightmap = 'lm_placeable01';

    const { plc, mesh } = makePlaceable(geometry, material);
    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager());

    expect(PlaceableLightmapBaker.isBaked(plc)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(Array.from((mesh.geometry as THREE.BufferGeometry).attributes.uv2.array)).toEqual(
      Array.from(uv2)
    );
    expect(material.userData.odysseyAuthoredLightmap).toBe(true);

    material.dispose();
    geometry.dispose();
  });

  test('computeChartPad never inverts charts at high tri density', () => {
    // Dense atlas: many tris → small cell; pad must stay < cell/2.
    const triCount = 400;
    const grid = Math.ceil(Math.sqrt(triCount));
    const cell = 1 / grid;
    for(const res of [16, 32, 64]){
      const pad = PlaceableLightmapBaker.computeChartPad(cell, res);
      expect(pad).toBeLessThan(cell / 2);
      expect(pad).toBeGreaterThanOrEqual(0);
      const u0 = pad;
      const u1 = cell - pad;
      expect(u1).toBeGreaterThan(u0);
    }
  });

  test('mesh under multi-frame Orientation controller stays nearest-lit', () => {
    const staticGeo = new THREE.BufferGeometry();
    staticGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ], 3));
    staticGeo.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ], 3));
    const staticMat = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const staticMesh = new THREE.Mesh(staticGeo, staticMat);

    const hinge = new THREE.Object3D();
    hinge.name = 'hinge';
    const lidGeo = new THREE.BufferGeometry();
    lidGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ], 3));
    lidGeo.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ], 3));
    const lidMat = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const lidMesh = new THREE.Mesh(lidGeo, lidMat);
    hinge.add(lidMesh);

    const model = new THREE.Object3D() as OdysseyModel3D;
    model.materials = [staticMat, lidMat];
    model.skins = [];
    model.danglyMeshes = [];
    model.nodesById = [];
    model.nodes = new Map([['hinge', hinge]]);
    model.nodesById[1] = hinge;
    model.odysseyAnimations = [{
      nodes: [{
        name: 'hinge',
        nodeNumber: 1,
        controllers: new Map([
          [OdysseyModelControllerType.Orientation, { frameCount: 4, data: [{}, {}, {}, {}] }],
        ]),
      }],
    }] as any;
    model.add(staticMesh);
    model.add(hinge);

    const container = new THREE.Object3D();
    container.add(model);
    const plc = { model, container, destroyed: false } as unknown as ModulePlaceable;

    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager({
      ambientColor: new THREE.Color(0.2, 0.2, 0.25),
    }));

    expect(PlaceableLightmapBaker.isBaked(plc)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(staticMat.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(lidMesh.userData.odysseyPlaceableDynamicLit).toBe(true);

    PlaceableLightmapBaker.dispose(plc);
    staticMat.dispose();
    lidMat.dispose();
    staticGeo.dispose();
    lidGeo.dispose();
  });

  test('dilate fills neighbor of chart texel', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ], 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { plc } = makePlaceable(geometry, material);

    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager({
      ambientColor: new THREE.Color(0.1, 0.1, 0.1),
      sunColor: new THREE.Color(2, 2, 2),
      sunDirection: new THREE.Vector3(0, 0, 1),
    }));

    const tex = material.uniforms.lightMap.value as THREE.DataTexture;
    const pixels = tex.image.data as Float32Array;
    const w = tex.image.width as number;
    const h = tex.image.height as number;
    // Right-tri chart leaves the far half empty; after dilate a sample just
    // past the hypotenuse should rise above seed ambient (0.1).
    const x = Math.min(w - 1, Math.floor(w * 0.72));
    const y = Math.min(h - 1, Math.floor(h * 0.72));
    const o = (y * w + x) * 4;
    const sampleAvg = (pixels[o] + pixels[o + 1] + pixels[o + 2]) / 3;
    expect(sampleAvg).toBeGreaterThan(0.15);

    PlaceableLightmapBaker.dispose(plc);
    material.dispose();
    geometry.dispose();
  });

  test('rejects UV1-as-UV2 copy and builds unique atlas charts', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
    ], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ], 3));
    const uv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
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
    expect(geo.index).toBeNull();
    expect(geo.attributes.position.count).toBe(6);
    const afterUv2 = Array.from((geo.attributes.uv2 as THREE.BufferAttribute).array);
    expect(afterUv2).not.toEqual(beforeUv2);
    expect(afterUv2[0]).not.toBeCloseTo(afterUv2[6], 5);

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

    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager({ lights: [type0, type1] }));

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
