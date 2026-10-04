import { describe, expect, test } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyLightmapBaker } from '@engine/managers/OdysseyLightmapBaker';
import { PlaceableLightmapBaker } from '@engine/managers/PlaceableLightmapBaker';
import type { LightManager } from '@engine/managers/LightManager';
import type { OdysseyLight3D } from '@engine/render/three/odyssey/OdysseyLight3D';
import type { ModulePlaceable } from '@engine/module/ModulePlaceable';
import type { OdysseyModel3D } from '@engine/render/three/odyssey/OdysseyModel3D';
import { OdysseyModelControllerType } from '@core/enums/odyssey/OdysseyModelControllerType';
import { ModulePlaceableAnimState } from '@core/enums/module/ModulePlaceableAnimState';

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

function makeModel(geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial){
  const mesh = new THREE.Mesh(geometry, material);
  const model = new THREE.Object3D() as OdysseyModel3D;
  model.materials = [material];
  model.odysseyAnimations = [];
  model.skins = [];
  model.danglyMeshes = [];
  model.nodesById = [];
  model.nodes = new Map();
  model.add(mesh);
  const root = new THREE.Object3D();
  root.add(model);
  return { model, mesh, material, geometry, root };
}

function makeHingeModel(){
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

  const root = new THREE.Object3D();
  root.add(model);

  return { model, root, staticMat, lidMat, lidMesh, staticGeo, lidGeo };
}

describe('OdysseyLightmapBaker', () => {
  test('applyLightmap sets USE_LIGHTMAP + USE_UV1 and clears IGNORE_LIGHTING', () => {
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: { IGNORE_LIGHTING: '' },
    });
    const data = new Float32Array(4);
    data[0] = 0.5; data[1] = 0.5; data[2] = 0.5; data[3] = 1;
    const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat, THREE.FloatType);
    OdysseyLightmapBaker.applyLightmap(material, tex);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_UV1')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'IGNORE_LIGHTING')).toBe(false);
    tex.dispose();
    material.dispose();
  });

  test('bakeGeometry works on bare geometry without a placeable', () => {
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
    OdysseyLightmapBaker.setLightManagerProvider(() => mockLightManager({
      ambientColor: new THREE.Color(0.2, 0.2, 0.25),
    }));
    const tex = OdysseyLightmapBaker.bakeGeometry(
      geometry,
      material,
      new THREE.Matrix4(),
      mockLightManager({ ambientColor: new THREE.Color(0.2, 0.2, 0.25) })
    );
    expect(tex).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(true);
    tex?.dispose();
    material.dispose();
    geometry.dispose();
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
    geometry.setAttribute('uv1', new THREE.Float32BufferAttribute(uv2.slice(0), 2));
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    material.userData.lightmap = 'lm_prop01';
    const { model, mesh, root } = makeModel(geometry, material);

    OdysseyLightmapBaker.bakeModel(model, mockLightManager(), { root });

    expect(OdysseyLightmapBaker.isBaked(model)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(material.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(Array.from((mesh.geometry as THREE.BufferGeometry).attributes.uv1.array)).toEqual(
      Array.from(uv2)
    );

    material.dispose();
    geometry.dispose();
  });

  test('computeChartPad never inverts charts at high tri density', () => {
    const triCount = 400;
    const grid = Math.ceil(Math.sqrt(triCount));
    const cell = 1 / grid;
    for(const res of [16, 32, 64]){
      const pad = OdysseyLightmapBaker.computeChartPad(cell, res);
      expect(pad).toBeLessThan(cell / 2);
      expect(cell - pad).toBeGreaterThan(pad);
    }
  });

  test('mesh under multi-frame Orientation controller stays nearest-lit', () => {
    const { model, staticMat, lidMat, lidMesh, staticGeo, lidGeo } = makeHingeModel();

    OdysseyLightmapBaker.bakeModel(model, mockLightManager({
      ambientColor: new THREE.Color(0.2, 0.2, 0.25),
    }));

    expect(OdysseyLightmapBaker.isBaked(model)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(staticMat.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(lidMesh.userData.odysseyDynamicLit).toBe(true);

    OdysseyLightmapBaker.dispose(model);
    staticMat.dispose();
    lidMat.dispose();
    staticGeo.dispose();
    lidGeo.dispose();
  });

  test('includeAnimatedTransforms bakes hinge meshes in current pose', () => {
    const { model, staticMat, lidMat, lidMesh, staticGeo, lidGeo } = makeHingeModel();

    OdysseyLightmapBaker.bakeModel(model, mockLightManager({
      ambientColor: new THREE.Color(0.2, 0.2, 0.25),
    }), { includeAnimatedTransforms: true });

    expect(Object.prototype.hasOwnProperty.call(staticMat.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(lidMesh.userData.odysseyDynamicLit).toBeFalsy();

    OdysseyLightmapBaker.dispose(model);
    staticMat.dispose();
    lidMat.dispose();
    staticGeo.dispose();
    lidGeo.dispose();
  });

  test('PlaceableLightmapBaker facade bakes via container root', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { model, root } = makeModel(geometry, material);
    const plc = {
      model,
      container: root,
      destroyed: false,
      animState: ModulePlaceableAnimState.DEFAULT,
      animStateInfo: { currentAnimState: ModulePlaceableAnimState.DEFAULT },
    } as unknown as ModulePlaceable;

    PlaceableLightmapBaker.bakePlaceable(plc, mockLightManager({
      ambientColor: new THREE.Color(0.2, 0.2, 0.2),
    }));
    expect(PlaceableLightmapBaker.isBaked(plc)).toBe(true);
    PlaceableLightmapBaker.dispose(plc);
    material.dispose();
    geometry.dispose();
  });

  test('idle rebake freezes hinge pose once, then resets on activity', () => {
    const { model, root, staticMat, lidMat, lidMesh, staticGeo, lidGeo } = makeHingeModel();
    const lm = mockLightManager({ ambientColor: new THREE.Color(0.2, 0.2, 0.25) });
    PlaceableLightmapBaker.setLightManagerProvider(() => lm);

    const plc = {
      model,
      container: root,
      destroyed: false,
      animState: ModulePlaceableAnimState.DEFAULT,
      animStateInfo: { currentAnimState: ModulePlaceableAnimState.DEFAULT },
    } as unknown as ModulePlaceable;

    PlaceableLightmapBaker.bakePlaceable(plc, lm);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(PlaceableLightmapBaker.isPoseFrozen(plc)).toBe(false);

    PlaceableLightmapBaker.noteActivity(plc);
    PlaceableLightmapBaker.tickIdle(0.25, lm);
    expect(PlaceableLightmapBaker.isPoseFrozen(plc)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(false);

    PlaceableLightmapBaker.tickIdle(0.25, lm);
    expect(PlaceableLightmapBaker.isPoseFrozen(plc)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(true);
    expect(lidMesh.userData.odysseyDynamicLit).toBeFalsy();

    // Further idle ticks do not clear freeze or thrash.
    PlaceableLightmapBaker.tickIdle(1.0, lm);
    expect(PlaceableLightmapBaker.isPoseFrozen(plc)).toBe(true);

    PlaceableLightmapBaker.noteActivity(plc);
    expect(PlaceableLightmapBaker.isPoseFrozen(plc)).toBe(false);
    PlaceableLightmapBaker.flushDirty(lm);
    expect(Object.prototype.hasOwnProperty.call(lidMat.defines, 'USE_LIGHTMAP')).toBe(false);
    expect(lidMesh.userData.odysseyDynamicLit).toBe(true);

    PlaceableLightmapBaker.dispose(plc);
    staticMat.dispose();
    lidMat.dispose();
    staticGeo.dispose();
    lidGeo.dispose();
  });

  test('bakes dynamicType 0 only; excludes type 1 and 2', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: { lightMap: { value: null } },
      defines: {},
    });
    const { model, root } = makeModel(geometry, material);

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

    const type2 = {
      dynamicType: 2,
      isAmbient: true,
      color: new THREE.Color(0, 0, 1),
      worldPosition: new THREE.Vector3(0, 0, 0),
      getRadius: () => 5,
      getIntensity: () => 1,
      getWorldPosition: (out: THREE.Vector3) => out.set(0, 0, 0),
    } as unknown as OdysseyLight3D;

    OdysseyLightmapBaker.bakeModel(model, mockLightManager({ lights: [type0, type1, type2] }), { root });

    const tex = material.uniforms.lightMap.value as THREE.DataTexture;
    const pixels = tex.image.data as Float32Array;
    let maxR = 0, maxG = 0, maxB = 0;
    for(let i = 0; i < pixels.length; i += 4){
      if(pixels[i] > maxR) maxR = pixels[i];
      if(pixels[i + 1] > maxG) maxG = pixels[i + 1];
      if(pixels[i + 2] > maxB) maxB = pixels[i + 2];
    }
    expect(maxR).toBeGreaterThan(0.5);
    expect(maxG).toBeLessThan(0.5);
    expect(maxB).toBeLessThan(0.5);

    OdysseyLightmapBaker.dispose(model);
    material.dispose();
    geometry.dispose();
  });
});
