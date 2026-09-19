import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@/GameState', () => ({
  GameState: {
    shadowAlpha: 1,
    beamingProjectionAlpha: 0,
    currentCamera: null,
    odysseyShadowManager: null as any,
  },
}));

import { GameState } from '@/GameState';
import { OdysseyLightingBinder } from '@/three/odyssey/OdysseyLightingBinder';
import { createOdysseyShadowUniforms } from '@/shaders/chunks/OdysseyShadow';

function makeShadowMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    defines: { USE_ODYSSEY_SHADOW: '' },
    uniforms: createOdysseyShadowUniforms(),
  });
}

function makeMockShadowManager(epoch = 1){
  return {
    frameEpoch: epoch,
    softShadowMaps: false,
    activeLightCount: 0,
    mapResolution: 512,
    getShadowMapTextureAt: () => null,
    getShadowMapTexture: () => null,
    getSlotState: () => undefined,
    getShadowMatrixAt: () => undefined,
  };
}

function shadowReceivers(): Set<THREE.ShaderMaterial> {
  return (OdysseyLightingBinder as any)._shadowReceivers as Set<THREE.ShaderMaterial>;
}

describe('OdysseyLightingBinder shadow registry', () => {
  beforeEach(() => {
    shadowReceivers().clear();
    (GameState as any).shadowAlpha = 1;
    (GameState as any).beamingProjectionAlpha = 0;
    (GameState as any).odysseyShadowManager = makeMockShadowManager(1);
    (GameState as any).currentCamera = null;
  });

  test('refreshSceneShadowMapUniforms rebinds registered receivers without scene.traverse', () => {
    const material = makeShadowMaterial();
    OdysseyLightingBinder.registerShadowReceiver(material);
    material.userData.odysseyShadowBoundEpoch = 1;

    const scene = new THREE.Scene();
    const orphan = makeShadowMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), orphan);
    scene.add(mesh);

    const traverseSpy = jest.spyOn(scene, 'traverse');

    OdysseyLightingBinder.refreshSceneShadowMapUniforms(scene);

    expect(traverseSpy).not.toHaveBeenCalled();
    expect(material.userData.odysseyShadowBoundEpoch).toBe(1);
    expect(orphan.userData.odysseyShadowBoundEpoch).toBeUndefined();
    expect(shadowReceivers().has(material)).toBe(true);
    expect(shadowReceivers().has(orphan)).toBe(false);

    traverseSpy.mockRestore();
    material.dispose();
    orphan.dispose();
  });

  test('dispose removes material from the receiver registry', () => {
    const material = makeShadowMaterial();
    OdysseyLightingBinder.registerShadowReceiver(material);
    expect(shadowReceivers().has(material)).toBe(true);
    material.dispose();
    expect(shadowReceivers().has(material)).toBe(false);
  });

  test('bindModelShadowUniforms skips material walks when epoch and gating match', () => {
    const material = makeShadowMaterial();
    const model = new THREE.Group() as any;
    model.materials = [material];
    model.userData = {};

    const bindSpy = jest.spyOn(OdysseyLightingBinder, 'bindShadowMapUniforms');

    (OdysseyLightingBinder as any).bindModelShadowUniforms(model);
    expect(bindSpy).toHaveBeenCalledTimes(1);
    expect(model.userData.odysseyShadowBoundEpoch).toBe(1);

    bindSpy.mockClear();
    (OdysseyLightingBinder as any).bindModelShadowUniforms(model);
    expect(bindSpy).not.toHaveBeenCalled();

    (GameState as any).odysseyShadowManager.frameEpoch = 2;
    (OdysseyLightingBinder as any).bindModelShadowUniforms(model);
    expect(bindSpy).toHaveBeenCalledTimes(1);
    expect(model.userData.odysseyShadowBoundEpoch).toBe(2);

    bindSpy.mockRestore();
    material.dispose();
  });

  test('bindModelShadowUniforms rebinds when shadowAlpha gating changes', () => {
    const material = makeShadowMaterial();
    const model = new THREE.Group() as any;
    model.materials = [material];
    model.userData = {};

    (OdysseyLightingBinder as any).bindModelShadowUniforms(model);
    const bindSpy = jest.spyOn(OdysseyLightingBinder, 'bindShadowMapUniforms');

    (GameState as any).shadowAlpha = 0.5;
    (OdysseyLightingBinder as any).bindModelShadowUniforms(model);
    expect(bindSpy).toHaveBeenCalledTimes(1);
    expect(model.userData.odysseyShadowGatingBound).toBe(0.5);

    bindSpy.mockRestore();
    material.dispose();
  });

  test('onBeforeRender skips bindShadowMapUniforms when shadowUniformsAreCurrent', () => {
    const material = makeShadowMaterial();
    OdysseyLightingBinder.ensureShadowMapBeforeRenderHook(material);
    OdysseyLightingBinder.bindShadowMapUniforms(material);
    expect(material.userData.odysseyShadowBoundEpoch).toBe(1);

    const bindSpy = jest.spyOn(OdysseyLightingBinder, 'bindShadowMapUniforms');
    material.onBeforeRender(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(bindSpy).not.toHaveBeenCalled();

    (GameState as any).odysseyShadowManager.frameEpoch = 2;
    material.onBeforeRender(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(bindSpy).toHaveBeenCalledTimes(1);
    expect(material.userData.odysseyShadowBoundEpoch).toBe(2);

    bindSpy.mockRestore();
    material.dispose();
  });

  test('onBeforeRender rebinds when live texture identity changes', () => {
    const material = makeShadowMaterial();
    const liveTex = { uuid: 'live' } as any;
    (GameState as any).odysseyShadowManager = {
      ...makeMockShadowManager(1),
      activeLightCount: 1,
      getShadowMapTextureAt: () => liveTex,
      getShadowMapTexture: () => liveTex,
    };
    OdysseyLightingBinder.ensureShadowMapBeforeRenderHook(material);
    material.userData.odysseyShadowBoundEpoch = 1;
    material.userData.odysseyShadowGatingBound = 1;
    material.userData.odysseyBeamingBound = 0;
    material.userData.odysseyShadowSoftBound = 0;
    material.userData.odysseyLightingDebugRevision = 0;
    // Bound sampler differs from live texture.
    material.uniforms.odysseyShadowMap0.value = null;

    const bindSpy = jest.spyOn(OdysseyLightingBinder, 'bindShadowMapUniforms');
    material.onBeforeRender(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
    expect(bindSpy).toHaveBeenCalledTimes(1);

    bindSpy.mockRestore();
    material.dispose();
  });

  test('shadowUniformsAreCurrent is false when shadowAlpha changes', () => {
    const material = makeShadowMaterial();
    OdysseyLightingBinder.bindShadowMapUniforms(material);
    expect(OdysseyLightingBinder.shadowUniformsAreCurrent(material)).toBe(true);
    (GameState as any).shadowAlpha = 0.25;
    expect(OdysseyLightingBinder.shadowUniformsAreCurrent(material)).toBe(false);
    material.dispose();
  });
});
