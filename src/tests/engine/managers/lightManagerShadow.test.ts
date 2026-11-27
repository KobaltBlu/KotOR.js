import { describe, expect, test } from '@jest/globals';
import { LightManager } from '@engine/managers/LightManager';
import { OdysseyShadowLightMode } from '@engine/render/odysseyLighting';
import * as THREE from 'three';

type MockShadowLight = {
  uuid: string;
  isAmbient: boolean;
  color: THREE.Color;
  radius: number;
  shadowRadius: number;
  dynamicType: number;
  castShadow: boolean;
  illuminationScore: number;
  shadowFadeFactor: number;
  priority: number;
  authoredPriority: number;
  registrationOrder: number;
  fadeFactor: number;
  isDynamic: boolean;
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

function mockLight(overrides: Partial<MockShadowLight> = {}): MockShadowLight {
  const radius = overrides.radius ?? 8;
  const color = overrides.color ?? new THREE.Color(1, 0.8, 0.5);
  return {
    uuid: overrides.uuid ?? `light-${Math.random()}`,
    isAmbient: overrides.isAmbient ?? false,
    color,
    radius,
    shadowRadius: overrides.shadowRadius ?? 0,
    dynamicType: overrides.dynamicType ?? 1,
    castShadow: overrides.castShadow ?? false,
    illuminationScore: overrides.illuminationScore ?? 0.5,
    shadowFadeFactor: overrides.shadowFadeFactor ?? 1,
    priority: overrides.priority ?? 3,
    authoredPriority: overrides.authoredPriority ?? 0,
    registrationOrder: overrides.registrationOrder ?? 0,
    fadeFactor: 1,
    isDynamic: overrides.isDynamic ?? true,
    sortKey: {
      priority: 0,
      dynamicRank: 0,
      illuminationScore: 0,
      colorIsBlack: false,
      registrationOrder: 0,
      uuid: '',
    },
    getRadius: () => radius,
    isColorBlack: () => color.r === 0 && color.g === 0 && color.b === 0,
    ...overrides,
  };
}

describe('LightManager shadow selection (shadow light selection modes 0/1)', () => {
  test('prioritizeShadow includes local lamps without MDL castShadow', () => {
    const lm = new LightManager();
    const lamp = mockLight({ radius: 8, castShadow: false, illuminationScore: 0.42, dynamicType: 1 });
    const sun = mockLight({ radius: 800, castShadow: true, illuminationScore: 0.2, dynamicType: 0 });
    lm.boundLights = [sun as never, lamp as never];
    const candidates = lm.prioritizeShadow();
    expect(candidates.some((l) => l === lamp)).toBe(true);
    expect(candidates.some((l) => l === sun)).toBe(true);
  });

  test('getShadowLights mode 1 picks nearby dynamic lamp when area shadows disabled', () => {
    const lm = new LightManager();
    (lm as { context?: { areaShadowsEnabled: boolean } }).context = { areaShadowsEnabled: false };
    const lamp = mockLight({
      radius: 8,
      castShadow: false,
      illuminationScore: 0.42,
      dynamicType: 1,
      registrationOrder: 1,
    });
    const sun = mockLight({
      radius: 800,
      castShadow: true,
      illuminationScore: 0.2,
      dynamicType: 0,
      registrationOrder: 0,
    });
    lm.boundLights = [sun as never, lamp as never];
    const selected = lm.getShadowLights(OdysseyShadowLightMode.SingleDynamic, 0);
    expect(selected.length).toBe(1);
    expect(selected[0]).toBe(lamp);
  });

  test('mode 0 hysteresis keeps prior resident over newly higher-ranked bound light', () => {
    const lm = new LightManager();
    LightManager.MAXSHADOWLIGHTS = 1;
    const sticky = mockLight({
      uuid: 'sticky',
      illuminationScore: 0.6,
      shadowFadeFactor: 1,
      registrationOrder: 0,
    });
    const challenger = mockLight({
      uuid: 'challenger',
      illuminationScore: 0.1,
      shadowFadeFactor: 0,
      registrationOrder: 1,
    });
    // Challenger is first in bound order (would win raw walk).
    lm.boundLights = [challenger as never, sticky as never];
    lm.shadowLights = [sticky as never];

    const selected = lm.getShadowLights(OdysseyShadowLightMode.Multi, 0);
    expect(selected.some((l) => l.uuid === 'sticky')).toBe(true);
    expect(selected[selected.length - 1].uuid).toBe('sticky');
  });

  test('mode 0 allows transient MAX+1 residency during crossfade', () => {
    const lm = new LightManager();
    LightManager.MAXSHADOWLIGHTS = 1;
    const outgoing = mockLight({
      uuid: 'out',
      illuminationScore: 1.5, // no longer qualifies for desired
      shadowFadeFactor: 1,
    });
    const incoming = mockLight({
      uuid: 'in',
      illuminationScore: 0.2,
      shadowFadeFactor: 0,
    });
    lm.boundLights = [incoming as never];
    lm.shadowLights = [outgoing as never];

    const selected = lm.getShadowLights(OdysseyShadowLightMode.Multi, 0.05);
    expect(selected.length).toBe(2);
    expect(selected.some((l) => l.uuid === 'out')).toBe(true);
    expect(selected.some((l) => l.uuid === 'in')).toBe(true);
    expect(outgoing.shadowFadeFactor).toBeLessThan(1);
    expect(incoming.shadowFadeFactor).toBeGreaterThan(0);
  });
});

describe('LightManager isPrioritizeEligible vs room frustum cull', () => {
  function mockPrioritizeLight(opts: {
    visActive?: boolean;
    visible?: boolean;
    radius?: number;
    black?: boolean;
  }){
    const model = new THREE.Object3D();
    model.visible = opts.visible ?? true;
    if(opts.visActive !== undefined){
      model.userData.visActive = opts.visActive;
    }
    const color = opts.black ? new THREE.Color(0, 0, 0) : new THREE.Color(1, 1, 1);
    const radius = opts.radius ?? 8;
    return {
      odysseyModel: model,
      getRadius: () => radius,
      isColorBlack: () => color.r === 0 && color.g === 0 && color.b === 0,
      color,
    } as never;
  }

  test('VIS-active room light stays eligible when mesh draw-culled', () => {
    const lm = new LightManager();
    const light = mockPrioritizeLight({ visActive: true, visible: false });
    expect(lm.isPrioritizeEligible(light)).toBe(true);
    expect(lm.isPrioritizeModelVisible((light as any).odysseyModel)).toBe(true);
  });

  test('VIS-inactive room light is not eligible', () => {
    const lm = new LightManager();
    const light = mockPrioritizeLight({ visActive: false, visible: false });
    expect(lm.isPrioritizeEligible(light)).toBe(false);
  });

  test('non-room model without visActive uses model.visible', () => {
    const lm = new LightManager();
    expect(lm.isPrioritizeEligible(mockPrioritizeLight({ visible: false }))).toBe(false);
    expect(lm.isPrioritizeEligible(mockPrioritizeLight({ visible: true }))).toBe(true);
  });

  test('frustum-hidden VIS sun still passes prioritize candidate filter', () => {
    const lm = new LightManager();
    const model = new THREE.Object3D();
    model.userData.visActive = true;
    model.visible = false;
    const sun = mockLight({
      uuid: 'sun',
      radius: 800,
      illuminationScore: 0.23,
      dynamicType: 0,
      castShadow: true,
    }) as any;
    sun.odysseyModel = model;
    expect(lm.isPrioritizeEligible(sun)).toBe(true);
    expect(sun.illuminationScore <= 1).toBe(true);
  });
});
