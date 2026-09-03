import { describe, expect, test } from '@jest/globals';
import { LightManager } from '@/managers/LightManager';
import { RetailShadowLightMode } from '@/utility/retailLighting';
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

describe('LightManager shadow selection (GetShadowLights modes 0/1)', () => {
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
    const selected = lm.getShadowLights(RetailShadowLightMode.SingleDynamic, 0);
    expect(selected.length).toBe(1);
    expect(selected[0]).toBe(lamp);
  });
});
