import { describe, expect, test } from '@jest/globals';
import {
  compareRetailLights,
  retailDynamicRank,
  retailEffectivePriority,
  retailEnvmapAdd,
  retailEnvmapAlbedo,
  retailFadeInit,
  retailFadeStep,
  retailIlluminationScore,
  retailPointAttenuation,
  retailQuadraticAttenuation,
  retailStencilShadowDisk,
  retailStencilShadowOpacity,
  isRetailShadowColorVisible,
  retailShadowFadeStep,
  retailSelectPrioritizeBump,
  retailSelectIlluminationBump,
  retailSelectDistantStaticShadowLight,
  retailModelLightSlots,
  retailVideoQualityRowIndex,
  RETAIL_MAX_LIGHTS_PER_MODEL,
  RETAIL_STENCIL_SHADOW_SEGMENTS,
  RETAIL_DISTANT_SHADOW_RADIUS,
} from '@/utility/retailLighting';

describe('retailLighting', () => {
  test('quadratic coefficient is 4.5 / r²', () => {
    expect(retailQuadraticAttenuation(3)).toBeCloseTo(4.5 / 9);
    expect(retailQuadraticAttenuation(0)).toBe(0);
  });

  test('SetLightGL clamps atten radius to max(r, 0.1)', () => {
    expect(retailQuadraticAttenuation(0.05)).toBeCloseTo(4.5 / (0.1 * 0.1));
    expect(retailQuadraticAttenuation(0.1)).toBeCloseTo(4.5 / 0.01);
    expect(retailQuadraticAttenuation(1)).toBeCloseTo(4.5);
  });

  test('point attenuation matches 1/(1 + q*d²)', () => {
    const radius = 10;
    const q = retailQuadraticAttenuation(radius);
    const d = 5;
    expect(retailPointAttenuation(d, radius)).toBeCloseTo(1 / (1 + q * d * d));
    expect(retailPointAttenuation(0, radius)).toBeCloseTo(1);
  });

  test('illumination score is horizontal dist / radius', () => {
    expect(retailIlluminationScore(10, 0, 0, 0, 5)).toBeCloseTo(2);
    expect(retailIlluminationScore(0, 0, 0, 0, 5)).toBeCloseTo(0);
    expect(retailIlluminationScore(0, 0, 0, 0, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  test('ControlLightsFade uses ±deltaT for all lights; flag only sets init', () => {
    expect(retailFadeInit(true)).toBe(0);
    expect(retailFadeInit(false)).toBe(1);
    expect(retailFadeStep(0.2, 1, 0.1)).toBeCloseTo(0.3);
    expect(retailFadeStep(0.2, 0, 0.1)).toBeCloseTo(0.1);
    expect(retailFadeStep(0.9, 1, 0.5)).toBe(1);
    // New fading light: init 0 then +deltaT same frame
    expect(retailFadeStep(retailFadeInit(true), 1, 0.25)).toBeCloseTo(0.25);
    // New non-fading light: init 1 then +deltaT stays 1
    expect(retailFadeStep(retailFadeInit(false), 1, 0.25)).toBe(1);
  });

  test('lightcmp prefers lower numeric priority then dynamic then lower score', () => {
    const low = {
      priority: 1,
      dynamicRank: retailDynamicRank(1),
      illuminationScore: 0.5,
      colorIsBlack: false,
    };
    const high = {
      priority: 5,
      dynamicRank: retailDynamicRank(1),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    expect(compareRetailLights(low, high)).toBeLessThan(0);

    const near = { ...low, priority: 3, illuminationScore: 0.1 };
    const far = { ...low, priority: 3, illuminationScore: 0.9 };
    expect(compareRetailLights(near, far)).toBeLessThan(0);

    const black = { ...low, colorIsBlack: true };
    expect(compareRetailLights(black, low)).toBeGreaterThan(0);

    const a = { ...low, priority: 3, registrationOrder: 0 };
    const b = { ...low, priority: 3, registrationOrder: 1 };
    expect(compareRetailLights(a, b)).toBeLessThan(0);
  });

  test('effective priority falls back to authored when runtime priority is 0', () => {
    expect(retailEffectivePriority(0, 4)).toBe(4);
    expect(retailEffectivePriority(2, 4)).toBe(2);
    expect(retailEffectivePriority(0, 0)).toBe(0);
  });

  test('lightcmp ranks n_dynamic_type 1 > 2 > 0 (affectDynamic is separate)', () => {
    const type1 = {
      priority: 3,
      dynamicRank: retailDynamicRank(1),
      illuminationScore: 0.5,
      colorIsBlack: false,
    };
    const type2 = {
      priority: 3,
      dynamicRank: retailDynamicRank(2),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    const type0 = {
      priority: 3,
      dynamicRank: retailDynamicRank(0),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    expect(compareRetailLights(type1, type2)).toBeLessThan(0);
    expect(compareRetailLights(type2, type0)).toBeLessThan(0);
    expect(retailDynamicRank(1)).toBe(2);
    expect(retailDynamicRank(2)).toBe(1);
    expect(retailDynamicRank(0)).toBe(0);
  });

  test('stencil shadow disk matches retail radius clamp', () => {
    const near = retailStencilShadowDisk(0, 0, 2, 10, 0, 0, 0, 0);
    expect(near.radius).toBeCloseTo(Math.sqrt(100 - 4));
    expect(near.x).toBe(0);
    const far = retailStencilShadowDisk(1, 2, 0, 100, 0, 5, 6, 0);
    expect(far.radius).toBe(50);
    expect(far.x).toBe(5);
    expect(retailStencilShadowOpacity(1)).toBeCloseTo(0.5);
    expect(retailStencilShadowOpacity(0.2)).toBeCloseTo(0.1);
  });

  test('PrioritizeShadow color gate requires a channel > 0.1', () => {
    expect(isRetailShadowColorVisible(0.11, 0, 0)).toBe(true);
    expect(isRetailShadowColorVisible(0, 0.05, 0.05)).toBe(false);
    expect(isRetailShadowColorVisible(0, 0, 0)).toBe(false);
  });

  test('shadow fade uses GetShadowLights rates (Δt/0.3 in, 2× out)', () => {
    expect(retailShadowFadeStep(0, 1, 0.3)).toBeCloseTo(1);
    expect(retailShadowFadeStep(0, 1, 0.15)).toBeCloseTo(0.5);
    expect(retailShadowFadeStep(1, 0, 0.15)).toBeCloseTo(0);
    expect(retailShadowFadeStep(1, 0, 0.075)).toBeCloseTo(0.5);
  });

  test('PrioritizeIllumination bump scans top 3 for first non-ambient dynamic', () => {
    const ambient = { isAmbient: true, dynamicType: 1 };
    const staticDyn = { isAmbient: false, dynamicType: 0 };
    const bump = { isAmbient: false, dynamicType: 1 };
    expect(retailSelectIlluminationBump([ambient, staticDyn, bump])).toEqual([bump]);
    expect(retailSelectIlluminationBump([ambient, staticDyn])).toEqual([]);
  });

  test('PrioritizeBump sorts all render-pool dynamic non-ambient lights', () => {
    const a = { isAmbient: false, dynamicType: 1, priority: 5 };
    const b = { isAmbient: false, dynamicType: 1, priority: 1 };
    const ambient = { isAmbient: true, dynamicType: 1, priority: 0 };
    const selected = retailSelectPrioritizeBump(
      [a, ambient, b],
      (x, y) => (x.priority ?? 0) - (y.priority ?? 0)
    );
    expect(selected).toEqual([b]);
  });

  test('GetShadowLights mode 2 picks lowest-priority distant/static shadow light', () => {
    const nearDynamic = {
      castShadow: true,
      isAmbient: false,
      dynamicType: 1,
      radius: 5,
      priority: 1,
    };
    const distant = {
      castShadow: true,
      isAmbient: false,
      dynamicType: 1,
      radius: RETAIL_DISTANT_SHADOW_RADIUS,
      priority: 4,
    };
    const staticNear = {
      castShadow: true,
      isAmbient: false,
      dynamicType: 0,
      radius: 5,
      priority: 2,
    };
    expect(retailSelectDistantStaticShadowLight([nearDynamic, distant, staticNear]))
      .toBe(staticNear);
  });

  test('headlight reserves one of three model light slots', () => {
    expect(retailModelLightSlots(RETAIL_MAX_LIGHTS_PER_MODEL, false)).toBe(3);
    expect(retailModelLightSlots(RETAIL_MAX_LIGHTS_PER_MODEL, true)).toBe(2);
    expect(RETAIL_STENCIL_SHADOW_SEGMENTS).toBe(10);
  });

  test('videoquality row prefers Video Quality then Texture Quality', () => {
    expect(retailVideoQualityRowIndex(4, 1, 2)).toBe(2);
    expect(retailVideoQualityRowIndex(4, 1)).toBe(1);
    expect(retailVideoQualityRowIndex(4)).toBe(3);
    expect(retailVideoQualityRowIndex(4, 99)).toBe(3);
  });

  test('envmap ADD keeps lit diffuse and layers env by (1-alpha)', () => {
    const lit: [number, number, number] = [0.5, 0.4, 0.3];
    const env: [number, number, number] = [0.1, 0.1, 0.2];
    expect(retailEnvmapAdd(lit, env, 1)).toEqual([0.5, 0.4, 0.3]);
    expect(retailEnvmapAdd(lit, env, 0)).toEqual([0.6, 0.5, 0.5]);
    const mid = retailEnvmapAdd(lit, env, 0.5);
    expect(mid[0]).toBeCloseTo(0.55);
    expect(mid[1]).toBeCloseTo(0.45);
    expect(mid[2]).toBeCloseTo(0.4);
  });

  test('envmap ADD preserves armor under dark cubemap; LERP crushes it', () => {
    const lit: [number, number, number] = [0.6, 0.55, 0.5];
    const darkEnv: [number, number, number] = [0.05, 0.05, 0.05]; // CM_Baremetal-like
    const chromeAlpha = 0.1;
    const added = retailEnvmapAdd(lit, darkEnv, chromeAlpha);
    const lerped = retailEnvmapAlbedo(darkEnv, lit, chromeAlpha);
    // ADD stays near armor luminance; LERP pulls toward near-black env.
    expect(added[0]).toBeGreaterThan(0.55);
    expect(lerped[0]).toBeLessThan(0.15);
  });
});
