import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as THREE from 'three';
import {
  warmRoomGpuResources,
  compileAreaRoomsVisible,
  warmSceneGeometryDraw,
  collectModuleGpuTextureTargets,
} from '@engine/render/three/odyssey/warmRoomGpuResources';

jest.mock('@engine/render/odysseyDepthPrepass', () => ({
  runOdysseyDepthPrepass: jest.fn(),
}));

describe('warmRoomGpuResources', () => {
  test('inits map, lightMap, envMap, bumpMap, and grass uniforms', () => {
    const inited: THREE.Texture[] = [];
    const renderer = {
      initTexture: (tex: THREE.Texture) => { inited.push(tex); },
    } as unknown as THREE.WebGLRenderer;

    const map = new THREE.Texture();
    const lightMap = new THREE.Texture();
    const envMap = new THREE.Texture();
    const bumpMap = new THREE.Texture();
    const grassMap = new THREE.Texture();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: map },
        lightMap: { value: lightMap },
        envMap: { value: envMap },
        bumpMap: { value: bumpMap },
      },
    });

    const model = new THREE.Group() as any;
    model.materials = [material];
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    model.add(mesh);

    const grassMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: grassMap } },
    });
    const grassMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(), grassMat, 1);
    const grass = new THREE.Group();
    grass.add(grassMesh);

    warmRoomGpuResources([{ model, grass, grassBins: [{ mesh: grassMesh, center: new THREE.Vector3(), fade: 1 }] }], renderer);

    expect(inited).toEqual(
      expect.arrayContaining([map, lightMap, envMap, bumpMap, grassMap])
    );
    // Deduped across materials array + mesh.material
    expect(inited.filter((t) => t === map).length).toBe(1);
  });

  test('no-ops without renderer.initTexture', () => {
    expect(() => warmRoomGpuResources([], null)).not.toThrow();
    expect(() => warmRoomGpuResources([], {} as any)).not.toThrow();
  });
});

describe('collectModuleGpuTextureTargets', () => {
  test('includes rooms and objects with models', () => {
    const roomModel = new THREE.Group() as any;
    const creatureModel = new THREE.Group() as any;
    const targets = collectModuleGpuTextureTargets(
      {
        rooms: [{ model: roomModel }],
        creatures: [{ model: creatureModel }, {}],
        doors: [],
      },
      [{ model: creatureModel }]
    );
    expect(targets.length).toBe(3);
  });
});

describe('compileAreaRoomsVisible', () => {
  test('forces rooms visible for compile then restores', () => {
    const model = new THREE.Group();
    model.visible = false;
    const grass = new THREE.Mesh();
    grass.visible = false;

    const compile = jest.fn();
    const renderer = { compile } as unknown as THREE.WebGLRenderer;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();

    compileAreaRoomsVisible([{ model: model as any, grass }], renderer, scene, camera);

    expect(compile).toHaveBeenCalledWith(scene, camera);
    expect(model.visible).toBe(false);
    expect(grass.visible).toBe(false);
  });

  test('restores visibility if compile throws', () => {
    const model = new THREE.Group();
    model.visible = false;
    const renderer = {
      compile: () => { throw new Error('compile fail'); },
    } as unknown as THREE.WebGLRenderer;

    expect(() =>
      compileAreaRoomsVisible(
        [{ model: model as any }],
        renderer,
        new THREE.Scene(),
        new THREE.PerspectiveCamera()
      )
    ).toThrow('compile fail');
    expect(model.visible).toBe(false);
  });
});

describe('warmSceneGeometryDraw', () => {
  let disposeSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    disposeSpy = jest.spyOn(THREE.WebGLRenderTarget.prototype, 'dispose');
  });

  function mockRenderer(): THREE.WebGLRenderer {
    let target: THREE.WebGLRenderTarget | null = null;
    return {
      getRenderTarget: () => target,
      setRenderTarget: (rt: THREE.WebGLRenderTarget | null) => { target = rt; },
      autoClear: true,
      clear: jest.fn(),
      render: jest.fn(),
    } as unknown as THREE.WebGLRenderer;
  }

  test('forces frustumCulled off and hidden visible for render then restores', () => {
    const renderer = mockRenderer();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.visible = false;
    mesh.frustumCulled = true;
    scene.add(mesh);

    warmSceneGeometryDraw({ renderer, scene, camera });

    expect(renderer.render).toHaveBeenCalledWith(scene, camera);
    expect(mesh.visible).toBe(false);
    expect(mesh.frustumCulled).toBe(true);
    expect(disposeSpy).toHaveBeenCalled();
  });

  test('does not modify meshes under skipRoots', () => {
    const renderer = mockRenderer();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const debug = new THREE.Group();
    debug.visible = true;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.visible = false;
    mesh.frustumCulled = true;
    debug.add(mesh);
    scene.add(debug);

    warmSceneGeometryDraw({
      renderer,
      scene,
      camera,
      skipRoots: new Set([debug]),
    });

    expect(mesh.visible).toBe(false);
    expect(mesh.frustumCulled).toBe(true);
  });

  test('restores state if render throws', () => {
    const renderer = mockRenderer();
    (renderer.render as jest.Mock).mockImplementation(() => {
      throw new Error('render fail');
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.frustumCulled = true;
    scene.add(mesh);

    expect(() => warmSceneGeometryDraw({ renderer, scene, camera })).toThrow('render fail');
    expect(mesh.frustumCulled).toBe(true);
    expect(disposeSpy).toHaveBeenCalled();
  });
});
