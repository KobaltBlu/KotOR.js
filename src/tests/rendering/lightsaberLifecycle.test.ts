/// <reference types="jest" />
import * as THREE from 'three';
import { LightsaberGlowPass } from '@/shaders/pass/LightsaberGlowPass';
import { OdysseyLightsaberEffect } from '@/three/odyssey/OdysseyLightsaberEffect';

jest.mock('three/examples/jsm/postprocessing/Pass', () => ({
  Pass: class { renderToScreen = false; clear = false; },
  FullScreenQuad: class {
    constructor(public material: unknown) {}
    render = jest.fn();
    dispose = jest.fn();
  },
}));

function rendererMock() {
  let target: unknown = { name: 'previous-target' };
  return {
    getRenderTarget: jest.fn(() => target),
    setRenderTarget: jest.fn((value: unknown) => { target = value; }),
    getClearColor: jest.fn((color: THREE.Color) => color.set(0x123456)),
    getClearAlpha: jest.fn(() => 0.6),
    setClearColor: jest.fn(),
    clear: jest.fn(),
    render: jest.fn(),
  };
}

function blade() {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial());
  mesh.userData.qolLightsaberGlow = true;
  return mesh;
}

describe('LightsaberGlowPass', () => {
  test('disables compositing and clears the mask after the final blade disappears', () => {
    const scene = new THREE.Scene();
    const saber = blade();
    scene.add(saber);
    const pass = new LightsaberGlowPass(scene, () => new THREE.PerspectiveCamera());
    const renderer = rendererMock();
    const read = new THREE.WebGLRenderTarget(8, 8);
    const write = new THREE.WebGLRenderTarget(8, 8);
    pass.render(renderer as any, write, read);
    expect(pass.compositeMaterial.uniforms.glowEnabled.value).toBe(true);
    const clears = renderer.clear.mock.calls.length;
    saber.visible = false;
    pass.render(renderer as any, write, read);
    expect(renderer.clear.mock.calls.length).toBeGreaterThan(clears);
    expect(pass.compositeMaterial.uniforms.glowEnabled.value).toBe(false);
    expect(pass.compositeMaterial.uniforms.tDiffuse.value).toBe(read.texture);
    pass.dispose(); read.dispose(); write.dispose();
  });

  test('hidden ancestors exclude blades from the mask', () => {
    const scene = new THREE.Scene();
    const parent = new THREE.Group();
    parent.add(blade());
    parent.visible = false;
    scene.add(parent);
    const pass = new LightsaberGlowPass(scene, () => new THREE.PerspectiveCamera());
    expect(pass.beginSaberIsolation()).toBe(false);
    pass.dispose();
  });

  test('restores shared materials, scene background, target and clear state after an exception', () => {
    const scene = new THREE.Scene();
    const background = new THREE.Color(0x445566);
    scene.background = background;
    const material = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
    scene.add(blade());
    const pass = new LightsaberGlowPass(scene, () => new THREE.PerspectiveCamera());
    const renderer = rendererMock();
    const previous = renderer.getRenderTarget();
    renderer.render.mockImplementation(() => { throw new Error('synthetic render failure'); });
    expect(() => pass.renderSaberMask(renderer as any, new THREE.PerspectiveCamera())).toThrow('synthetic render failure');
    expect(material.colorWrite).toBe(true);
    expect(scene.background).toBe(background);
    expect(renderer.getRenderTarget()).toBe(previous);
    expect(renderer.setClearColor).toHaveBeenLastCalledWith(expect.any(THREE.Color), 0.6);
    expect(pass.darkenedMaterials).toHaveLength(0);
    pass.dispose();
  });

  test('copies the source when there is no active camera', () => {
    const pass = new LightsaberGlowPass(new THREE.Scene(), () => undefined);
    const renderer = rendererMock();
    const read = new THREE.WebGLRenderTarget(1, 1);
    const write = new THREE.WebGLRenderTarget(1, 1);
    pass.render(renderer as any, write, read);
    expect(pass.compositeMaterial.uniforms.glowEnabled.value).toBe(false);
    expect(pass.compositeQuad.render).toHaveBeenCalled();
    pass.dispose(); read.dispose(); write.dispose();
  });
});

describe('OdysseyLightsaberEffect', () => {
  test('extinguished blades stop being visible and reset their motion sample', () => {
    const saber = new OdysseyLightsaberEffect();
    saber.setPowered(true);
    saber.update(1);
    expect(saber.visible).toBe(true);
    saber.setPowered(false);
    saber.update(1);
    expect(saber.visible).toBe(false);
    expect(saber.hasMotionSample).toBe(false);
    expect(saber.pointLight.visible).toBe(false);
    saber.setPowered(true);
    saber.update(1);
    expect(saber.visible).toBe(true);
    saber.dispose();
  });
});
