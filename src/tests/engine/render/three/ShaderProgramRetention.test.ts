/**
 * @jest-environment node
 *
 * ShaderProgramRetention pins programs once, compiles one texture-free keeper per
 * shader source through proxies of the source meshes, and compileSceneOffscreen
 * compiles with the offscreen target bound and hides the world while linking.
 */
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import * as THREE from 'three';
import {
  ShaderProgramRetention,
  createKeeperMaterial,
} from '@engine/render/three/odyssey/ShaderProgramRetention';
import { compileSceneOffscreen } from '@engine/render/three/odyssey/warmRoomGpuResources';

function makeMaterial(vs = 'void main(){}', fs = 'void main(){}'): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    vertexShader: vs,
    fragmentShader: fs,
    defines: { USE_LIGHTMAP: '' },
    uniforms: {
      map: { value: new THREE.Texture() },
      tint: { value: new THREE.Vector3(1, 2, 3) },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
  mat.userData.owner = { self: null as any };
  mat.userData.owner.self = mat.userData.owner; // circular: copy must not JSON it
  return mat;
}

function fakeRenderer(programs: Array<{ usedTimes: number }>) {
  let target: THREE.WebGLRenderTarget | null = null;
  const compiled: Array<{ children: THREE.Object3D[]; target: THREE.WebGLRenderTarget | null; mats: THREE.Material[] }> = [];
  const renderer: any = {
    info: { programs },
    getRenderTarget: () => target,
    setRenderTarget: (t: THREE.WebGLRenderTarget | null) => { target = t; },
    compile: (scene: THREE.Object3D) => {
      const mats: THREE.Material[] = [];
      scene.traverse((o: any) => { if(o.material) mats.push(o.material); });
      compiled.push({ children: [...scene.children], target, mats });
    },
  };
  return { renderer, compiled };
}

describe('ShaderProgramRetention', () => {
  afterEach(() => {
    ShaderProgramRetention.reset();
    jest.restoreAllMocks();
  });

  test('keeper copies shader state but no textures, and leaves the source intact', () => {
    const src = makeMaterial();
    const keeper = createKeeperMaterial(src);
    expect(keeper.vertexShader).toBe(src.vertexShader);
    expect(keeper.fragmentShader).toBe(src.fragmentShader);
    expect(keeper.defines).toEqual(src.defines);
    expect(keeper.defines).not.toBe(src.defines);
    expect(keeper.transparent).toBe(true);
    expect(keeper.side).toBe(THREE.DoubleSide);
    expect(keeper.uniforms.map.value).toBeNull();
    expect(keeper.uniforms.tint.value).toBe(src.uniforms.tint.value);
    expect(keeper.uniforms.map).not.toBe(src.uniforms.map);
    expect(src.uniforms.map.value).toBeInstanceOf(THREE.Texture);
    expect(src.userData.owner.self).toBe(src.userData.owner);
  });

  test('pins each program once and keeps one keeper per shader source', () => {
    const programs = [{ usedTimes: 1 }, { usedTimes: 2 }];
    const { renderer, compiled } = fakeRenderer(programs);
    const scene = new THREE.Scene();
    const shared = makeMaterial();
    const skinned = new THREE.Mesh(new THREE.BufferGeometry(), shared);
    skinned.add(new THREE.Mesh(new THREE.BufferGeometry(), makeMaterial())); // same source
    scene.add(skinned);
    scene.add(new THREE.Mesh(new THREE.BufferGeometry(), makeMaterial('void main(){ }')));
    scene.add(new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial()));
    const camera = new THREE.PerspectiveCamera();

    ShaderProgramRetention.retain(renderer, scene, camera);
    expect(programs.map((p) => p.usedTimes)).toEqual([2, 3]);
    expect(ShaderProgramRetention.keeperCount).toBe(2);
    expect(compiled).toHaveLength(1);
    expect(compiled[0].mats).toHaveLength(2);
    // Proxies inherit the source mesh (geometry / flags) but not its children,
    // and the real scene graph is untouched.
    const proxy = compiled[0].children[0] as THREE.Mesh;
    expect(proxy.geometry).toBe(skinned.geometry);
    expect(proxy.material).not.toBe(shared);
    expect(skinned.material).toBe(shared);
    expect(skinned.children).toHaveLength(1);

    programs.push({ usedTimes: 1 });
    ShaderProgramRetention.retain(renderer, scene, camera);
    expect(programs.map((p) => p.usedTimes)).toEqual([2, 3, 2]);
    expect(compiled).toHaveLength(1); // no new shader sources
  });
});

describe('compileSceneOffscreen', () => {
  test('compiles with the target bound and hides the world until linked', async () => {
    const scene = new THREE.Scene();
    const target = new THREE.WebGLRenderTarget(1, 1);
    const prev = new THREE.WebGLRenderTarget(1, 1);
    let resolve!: () => void;
    let boundAtCompile: unknown;
    let current: unknown = prev;
    const renderer: any = {
      getRenderTarget: () => current,
      setRenderTarget: (t: unknown) => { current = t; },
      compileAsync: () => {
        boundAtCompile = current;
        return new Promise<void>((r) => { resolve = r; });
      },
    };
    const done = compileSceneOffscreen(renderer, scene, new THREE.PerspectiveCamera(), target);
    expect(boundAtCompile).toBe(target);
    expect(current).toBe(prev);
    expect(scene.visible).toBe(false);
    resolve();
    await done;
    expect(scene.visible).toBe(true);
  });

  test('leaves an already hidden scene hidden', async () => {
    const scene = new THREE.Scene();
    scene.visible = false;
    const renderer: any = {
      getRenderTarget: () => null,
      setRenderTarget: () => {},
      compileAsync: () => Promise.resolve(),
    };
    await compileSceneOffscreen(renderer, scene, new THREE.PerspectiveCamera(), null);
    expect(scene.visible).toBe(false);
  });
});
