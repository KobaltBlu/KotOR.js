const gameStateMock = {
  shadowAlpha: 1,
  areaShadowsEnabled: true,
  userShadowsEnabled: true,
};

jest.mock('@/GameState', () => ({
  GameState: {
    get shadowAlpha(){ return gameStateMock.shadowAlpha; },
    set shadowAlpha(v: number){ gameStateMock.shadowAlpha = v; },
    get areaShadowsEnabled(){ return gameStateMock.areaShadowsEnabled; },
    set areaShadowsEnabled(v: boolean){ gameStateMock.areaShadowsEnabled = v; },
    get userShadowsEnabled(){ return gameStateMock.userShadowsEnabled; },
    set userShadowsEnabled(v: boolean){ gameStateMock.userShadowsEnabled = v; },
    areShadowsEnabled(){
      return gameStateMock.userShadowsEnabled && gameStateMock.shadowAlpha > 0;
    },
  },
}));

import { describe, expect, test, beforeEach } from '@jest/globals';
import * as THREE from 'three';
import { OdysseyShadowManager } from '@/managers/OdysseyShadowManager';
import { LightManager } from '@/managers/LightManager';
import { RETAIL_DISTANT_SHADOW_RADIUS } from '@/utility/retailLighting';

type MockShadowLight = {
  uuid: string;
  worldPosition: THREE.Vector3;
  shadowRadius: number;
  verticalDisplacement: number;
  shadowFadeFactor: number;
  getRadius: () => number;
};

function mockShadowLight(overrides: Partial<MockShadowLight> = {}): MockShadowLight {
  const radius = overrides.getRadius ? undefined : 8;
  return {
    uuid: overrides.uuid ?? `light-${Math.random()}`,
    worldPosition: overrides.worldPosition ?? new THREE.Vector3(1, 2, 3),
    shadowRadius: overrides.shadowRadius ?? 0,
    verticalDisplacement: overrides.verticalDisplacement ?? 0,
    shadowFadeFactor: overrides.shadowFadeFactor ?? 1,
    getRadius: overrides.getRadius ?? (() => radius as number),
  };
}

describe('OdysseyShadowManager primary shadow map', () => {
  let manager: OdysseyShadowManager;
  let lightManager: LightManager;

  beforeEach(() => {
    gameStateMock.shadowAlpha = 1;
    gameStateMock.areaShadowsEnabled = true;
    gameStateMock.userShadowsEnabled = true;
    manager = new OdysseyShadowManager();
    lightManager = new LightManager();
    manager.init(lightManager);
  });

  test('selects one primary light with retail fade strength', () => {
    const light = mockShadowLight({
      uuid: 'a',
      worldPosition: new THREE.Vector3(10, 0, 0),
      shadowFadeFactor: 0.8,
    }) as any;

    lightManager.shadowLights = [light];
    lightManager.staticMeshShadowLights = [];

    const focus = new THREE.Vector3(0, 0, 0);
    manager.update(undefined, focus);

    expect(manager.activeLightCount).toBe(1);
    expect(manager.shadowStrength).toBeCloseTo(
      OdysseyShadowManager.shadowStrengthForLight(1, 0.8),
      5
    );
    expect(manager.lightWorld.x).toBeCloseTo(10, 4);
    expect(manager.activeLightType).toBe('spot');
  });

  test('uses directional proxy for distant lights', () => {
    const light = mockShadowLight({
      uuid: 'sun',
      getRadius: () => RETAIL_DISTANT_SHADOW_RADIUS,
    }) as any;

    lightManager.staticMeshShadowLights = [light];
    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    expect(manager.activeLightType).toBe('directional');
    expect(manager.getShadowCamera()).toBeTruthy();
  });

  test('prefers static mesh shadow light when area shadows enabled', () => {
    const staticLight = mockShadowLight({ uuid: 'static' }) as any;
    const dynamic = mockShadowLight({ uuid: 'dynamic' }) as any;
    lightManager.staticMeshShadowLights = [staticLight];
    lightManager.shadowLights = [dynamic];

    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    expect(manager.activeLightUuid).toBe('static');
  });

  test('skips primary light when shadows disabled or shadowAlpha is zero', () => {
    lightManager.shadowLights = [mockShadowLight() as any];

    gameStateMock.userShadowsEnabled = false;
    manager.update(undefined, new THREE.Vector3(0, 0, 0));
    expect(manager.activeLightCount).toBe(0);

    gameStateMock.userShadowsEnabled = true;
    gameStateMock.shadowAlpha = 0;
    manager.update(undefined, new THREE.Vector3(0, 0, 0));
    expect(manager.activeLightCount).toBe(0);
  });

  test('frameEpoch increments when primary light state changes', () => {
    const light = mockShadowLight({
      uuid: 'stable',
      worldPosition: new THREE.Vector3(5, 0, 0),
    }) as any;
    lightManager.shadowLights = [light];
    lightManager.staticMeshShadowLights = [];

    manager.update(undefined, new THREE.Vector3(0, 0, 0));
    const epochAfterFirst = manager.frameEpoch;

    manager.update(undefined, new THREE.Vector3(0, 0, 0));
    expect(manager.frameEpoch).toBe(epochAfterFirst);

    light.worldPosition.x = 6;
    manager.update(undefined, new THREE.Vector3(0, 0, 0));
    expect(manager.frameEpoch).toBe(epochAfterFirst + 1);
  });
});
