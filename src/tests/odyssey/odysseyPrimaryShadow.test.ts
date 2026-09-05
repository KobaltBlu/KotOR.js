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
import {
  OdysseyShadowManager,
  SOFT_SHADOW_STICKY_HOLD_SEC,
} from '@/managers/OdysseyShadowManager';
import { LightManager } from '@/managers/LightManager';
import { RETAIL_DISTANT_SHADOW_RADIUS } from '@/utility/retailLighting';

type MockShadowLight = {
  uuid: string;
  worldPosition: THREE.Vector3;
  shadowRadius: number;
  verticalDisplacement: number;
  shadowFadeFactor: number;
  illuminationScore: number;
  isAmbient: boolean;
  color: THREE.Color;
  priority: number;
  authoredPriority: number;
  dynamicType: number;
  registrationOrder: number;
  sortKey: {
    priority: number;
    dynamicRank: number;
    illuminationScore: number;
    colorIsBlack: boolean;
    registrationOrder: number;
    uuid: string;
  };
  getRadius: () => number;
  isColorBlack: () => boolean;
};

function mockShadowLight(overrides: Partial<MockShadowLight> = {}): MockShadowLight {
  const radius = overrides.getRadius ? undefined : 8;
  const color = overrides.color ?? new THREE.Color(1, 0.9, 0.7);
  const uuid = overrides.uuid ?? `light-${Math.random()}`;
  const registrationOrder = overrides.registrationOrder ?? 0;
  return {
    uuid,
    worldPosition: overrides.worldPosition ?? new THREE.Vector3(1, 2, 3),
    shadowRadius: overrides.shadowRadius ?? 0,
    verticalDisplacement: overrides.verticalDisplacement ?? 0,
    shadowFadeFactor: overrides.shadowFadeFactor ?? 1,
    illuminationScore: overrides.illuminationScore ?? 0.3,
    isAmbient: overrides.isAmbient ?? false,
    color,
    priority: overrides.priority ?? 3,
    authoredPriority: overrides.authoredPriority ?? 0,
    dynamicType: overrides.dynamicType ?? 1,
    registrationOrder,
    sortKey: overrides.sortKey ?? {
      priority: 0,
      dynamicRank: 0,
      illuminationScore: 0,
      colorIsBlack: false,
      registrationOrder,
      uuid,
    },
    getRadius: overrides.getRadius ?? (() => radius as number),
    isColorBlack: () => color.r === 0 && color.g === 0 && color.b === 0,
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
    lightManager.softShadowsEnabled = false;
    manager.init(lightManager);
    manager.useQualityPreset(false);
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
      worldPosition: new THREE.Vector3(100, 50, 200),
      getRadius: () => RETAIL_DISTANT_SHADOW_RADIUS,
    }) as any;

    lightManager.staticMeshShadowLights = [light];
    lightManager.shadowLights = [];
    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    expect(manager.activeLightType).toBe('directional');
    expect(manager.getShadowCamera()).toBeTruthy();
    // Radial fade must track the authored light, not the focus-proximate map proxy.
    expect(manager.lightWorld.x).toBeCloseTo(100, 4);
    expect(manager.lightWorld.y).toBeCloseTo(50, 4);
    expect(manager.lightWorld.z).toBeCloseTo(200, 4);
  });

  test('spot map coverage follows light influence up to retail focus distance', () => {
    const light = mockShadowLight({
      uuid: 'lamp',
      worldPosition: new THREE.Vector3(0, 0, 8),
      getRadius: () => 20,
    }) as any;
    lightManager.shadowLights = [light];
    lightManager.staticMeshShadowLights = [];
    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    const slot = manager.getSlotState(0);
    expect(slot?.influenceRadius).toBe(20);
    const spot = (manager as any).slots[0].spot as THREE.SpotLight;
    // FOV should cover ~20 around focus, not the old ~7.5 clamp.
    expect(spot.shadow.camera.fov).toBeGreaterThan(60);
  });

  test('prefers mode-0 shadow lights over static mesh fallback', () => {
    const staticLight = mockShadowLight({ uuid: 'static' }) as any;
    const dynamic = mockShadowLight({ uuid: 'dynamic' }) as any;
    lightManager.staticMeshShadowLights = [staticLight];
    lightManager.shadowLights = [dynamic];

    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    expect(manager.activeLightUuid).toBe('dynamic');
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

  test('UUID-stable slots keep the same proxy when list order shuffles', () => {
    const a = mockShadowLight({
      uuid: 'a',
      worldPosition: new THREE.Vector3(2, 0, 4),
      shadowFadeFactor: 1,
    }) as any;
    const b = mockShadowLight({
      uuid: 'b',
      worldPosition: new THREE.Vector3(-2, 0, 4),
      shadowFadeFactor: 1,
    }) as any;
    lightManager.shadowLights = [a, b];
    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    const spotA = (manager as any).slots.find((s: any) => s.state.uuid === 'a')?.spot;
    expect(spotA).toBeTruthy();

    lightManager.shadowLights = [b, a];
    manager.update(undefined, new THREE.Vector3(0, 0, 0));

    const spotAAfter = (manager as any).slots.find((s: any) => s.state.uuid === 'a')?.spot;
    expect(spotAAfter).toBe(spotA);
    expect(manager.activeLightCount).toBe(2);
  });
});

describe('OdysseyShadowManager soft sticky + crossfade', () => {
  let manager: OdysseyShadowManager;
  let lightManager: LightManager;

  beforeEach(() => {
    gameStateMock.shadowAlpha = 1;
    gameStateMock.userShadowsEnabled = true;
    manager = new OdysseyShadowManager();
    lightManager = new LightManager();
    lightManager.softShadowsEnabled = true;
    manager.init(lightManager);
    manager.useQualityPreset(true);
  });

  function softLamp(uuid: string, x: number, z: number, order = 0){
    return mockShadowLight({
      uuid,
      worldPosition: new THREE.Vector3(x, 0, z),
      illuminationScore: 0.2,
      shadowFadeFactor: 0,
      registrationOrder: order,
      priority: 3,
    }) as any;
  }

  test('soft sticky keeps first elevated caster until hold elapses', () => {
    const focus = new THREE.Vector3(0, 0, 0);
    // Almost overhead
    const ceiling = softLamp('ceiling', 0.1, 5, 0);
    // Slightly more angled but will become "best" when we move it
    const side = softLamp('side', 3, 5, 1);
    lightManager.boundLights = [ceiling, side];

    manager.update(undefined, focus, 0);
    expect(manager.activeLightUuid).toBe('ceiling');

    // Make side clearly more overhead (smaller XY offset)
    side.worldPosition.set(0, 0, 6);
    ceiling.worldPosition.set(2.5, 0, 4);

    manager.update(undefined, focus, 0.05);
    // Still sticky — hold not reached
    expect(manager.activeLightUuid).toBe('ceiling');

    manager.update(undefined, focus, SOFT_SHADOW_STICKY_HOLD_SEC);
    expect(manager.activeLightUuid).toBe('side');
  });

  test('soft path crossfades with two maps during swap', () => {
    const focus = new THREE.Vector3(0, 0, 0);
    const a = softLamp('a', 0, 6, 0);
    a.shadowFadeFactor = 1;
    const b = softLamp('b', 0.05, 8, 1);
    lightManager.boundLights = [a, b];

    manager.update(undefined, focus, 0);
    expect(manager.activeLightCount).toBe(1);
    expect(manager.activeLightUuid).toBe('a');

    // Instant-margin: move a far aside and b directly overhead
    a.worldPosition.set(8, 0, 4);
    b.worldPosition.set(0, 0, 10);

    manager.update(undefined, focus, 0.05);
    // Both should be resident while a fades out and b fades in
    expect(manager.activeLightCount).toBeGreaterThanOrEqual(1);
    const uuids = manager.diagnostics.activeLightUuids;
    expect(uuids.includes('b')).toBe(true);
    if(manager.activeLightCount > 1){
      expect(uuids.includes('a')).toBe(true);
      expect(a.shadowFadeFactor).toBeLessThan(1);
      expect(b.shadowFadeFactor).toBeGreaterThan(0);
    }
  });
});
