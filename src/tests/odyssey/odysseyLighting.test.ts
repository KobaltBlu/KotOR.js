import { describe, expect, test } from '@jest/globals';
import {
  compareOdysseyLights,
  odysseyDynamicRank,
  odysseyEffectivePriority,
  odysseyEnvmapAdd,
  odysseyEnvmapAlbedo,
  odysseyFadeInit,
  odysseyFadeStep,
  odysseyIlluminationScore,
  odysseyPointAttenuation,
  odysseyQuadraticAttenuation,
  odysseyStencilShadowDisk,
  odysseyStencilShadowOpacity,
  isOdysseyShadowColorVisible,
  odysseyShadowFadeStep,
  odysseyShadowDistantFactor,
  odysseyShadowProjectionStrength,
  odysseySelectPrioritizeBump,
  odysseySelectIlluminationBump,
  odysseySelectDistantStaticShadowLight,
  odysseyModelLightSlots,
  odysseyVideoQualityRowIndex,
  ODYSSEY_MAX_LIGHTS_PER_MODEL,
  ODYSSEY_STENCIL_SHADOW_SEGMENTS,
  ODYSSEY_DISTANT_SHADOW_RADIUS,
} from '@/utility/odysseyLighting';

describe('odysseyLighting', () => {
  test('quadratic coefficient is 4.5 / r²', () => {
    expect(odysseyQuadraticAttenuation(3)).toBeCloseTo(4.5 / 9);
    expect(odysseyQuadraticAttenuation(0)).toBe(0);
  });

  test('light upload clamps atten radius to max(r, 0.1)', () => {
    expect(odysseyQuadraticAttenuation(0.05)).toBeCloseTo(4.5 / (0.1 * 0.1));
    expect(odysseyQuadraticAttenuation(0.1)).toBeCloseTo(4.5 / 0.01);
    expect(odysseyQuadraticAttenuation(1)).toBeCloseTo(4.5);
  });

  test('point attenuation matches 1/(1 + q*d²)', () => {
    const radius = 10;
    const q = odysseyQuadraticAttenuation(radius);
    const d = 5;
    expect(odysseyPointAttenuation(d, radius)).toBeCloseTo(1 / (1 + q * d * d));
    expect(odysseyPointAttenuation(0, radius)).toBeCloseTo(1);
  });

  test('illumination score is horizontal dist / radius', () => {
    expect(odysseyIlluminationScore(10, 0, 0, 0, 5)).toBeCloseTo(2);
    expect(odysseyIlluminationScore(0, 0, 0, 0, 5)).toBeCloseTo(0);
    expect(odysseyIlluminationScore(0, 0, 0, 0, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  test('light fade pass uses ±deltaT for all lights; flag only sets init', () => {
    expect(odysseyFadeInit(true)).toBe(0);
    expect(odysseyFadeInit(false)).toBe(1);
    expect(odysseyFadeStep(0.2, 1, 0.1)).toBeCloseTo(0.3);
    expect(odysseyFadeStep(0.2, 0, 0.1)).toBeCloseTo(0.1);
    expect(odysseyFadeStep(0.9, 1, 0.5)).toBe(1);
    // New fading light: init 0 then +deltaT same frame
    expect(odysseyFadeStep(odysseyFadeInit(true), 1, 0.25)).toBeCloseTo(0.25);
    // New non-fading light: init 1 then +deltaT stays 1
    expect(odysseyFadeStep(odysseyFadeInit(false), 1, 0.25)).toBe(1);
  });

  test('light sort prefers lower numeric priority then dynamic then lower score', () => {
    const low = {
      priority: 1,
      dynamicRank: odysseyDynamicRank(1),
      illuminationScore: 0.5,
      colorIsBlack: false,
    };
    const high = {
      priority: 5,
      dynamicRank: odysseyDynamicRank(1),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    expect(compareOdysseyLights(low, high)).toBeLessThan(0);

    const near = { ...low, priority: 3, illuminationScore: 0.1 };
    const far = { ...low, priority: 3, illuminationScore: 0.9 };
    expect(compareOdysseyLights(near, far)).toBeLessThan(0);

    const black = { ...low, colorIsBlack: true };
    expect(compareOdysseyLights(black, low)).toBeGreaterThan(0);

    const a = { ...low, priority: 3, registrationOrder: 0 };
    const b = { ...low, priority: 3, registrationOrder: 1 };
    expect(compareOdysseyLights(a, b)).toBeLessThan(0);
  });

  test('effective priority falls back to authored when runtime priority is 0', () => {
    expect(odysseyEffectivePriority(0, 4)).toBe(4);
    expect(odysseyEffectivePriority(2, 4)).toBe(2);
    expect(odysseyEffectivePriority(0, 0)).toBe(0);
  });

  test('light sort ranks n_dynamic_type 1 > 2 > 0 (affectDynamic is separate)', () => {
    const type1 = {
      priority: 3,
      dynamicRank: odysseyDynamicRank(1),
      illuminationScore: 0.5,
      colorIsBlack: false,
    };
    const type2 = {
      priority: 3,
      dynamicRank: odysseyDynamicRank(2),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    const type0 = {
      priority: 3,
      dynamicRank: odysseyDynamicRank(0),
      illuminationScore: 0.1,
      colorIsBlack: false,
    };
    expect(compareOdysseyLights(type1, type2)).toBeLessThan(0);
    expect(compareOdysseyLights(type2, type0)).toBeLessThan(0);
    expect(odysseyDynamicRank(1)).toBe(2);
    expect(odysseyDynamicRank(2)).toBe(1);
    expect(odysseyDynamicRank(0)).toBe(0);
  });

  test('stencil shadow disk matches engine radius clamp', () => {
    const near = odysseyStencilShadowDisk(0, 0, 2, 10, 0, 0, 0, 0);
    expect(near.radius).toBeCloseTo(Math.sqrt(100 - 4));
    expect(near.x).toBe(0);
    const far = odysseyStencilShadowDisk(1, 2, 0, 100, 0, 5, 6, 0);
    expect(far.radius).toBe(50);
    expect(far.x).toBe(5);
    expect(odysseyStencilShadowOpacity(1)).toBeCloseTo(0.5);
    expect(odysseyStencilShadowOpacity(0.2)).toBeCloseTo(0.1);
  });

  test('shadow prioritize color gate requires a channel > 0.1', () => {
    expect(isOdysseyShadowColorVisible(0.11, 0, 0)).toBe(true);
    expect(isOdysseyShadowColorVisible(0, 0.05, 0.05)).toBe(false);
    expect(isOdysseyShadowColorVisible(0, 0, 0)).toBe(false);
  });

  test('shadow fade uses shadow light selection rates (Δt/0.3 in, 2× out)', () => {
    expect(odysseyShadowFadeStep(0, 1, 0.3)).toBeCloseTo(1);
    expect(odysseyShadowFadeStep(0, 1, 0.15)).toBeCloseTo(0.5);
    expect(odysseyShadowFadeStep(1, 0, 0.15)).toBeCloseTo(0);
    expect(odysseyShadowFadeStep(1, 0, 0.075)).toBeCloseTo(0.5);
  });

  test('distantFactor is 0 for lamps and 1 for area/sun radii', () => {
    expect(odysseyShadowDistantFactor(8)).toBe(0);
    expect(odysseyShadowDistantFactor(20)).toBe(0);
    expect(odysseyShadowDistantFactor(100)).toBe(1);
    expect(odysseyShadowDistantFactor(800)).toBe(1);
    const mid = odysseyShadowDistantFactor(60);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  test('engine projection strength base is shadowAlpha * 0.5 * fade', () => {
    expect(odysseyShadowProjectionStrength(1, 1)).toBeCloseTo(0.5);
    expect(odysseyShadowProjectionStrength(1, 0.8)).toBeCloseTo(0.4);
  });

  test('illumination prioritize bump scans top 3 for first non-ambient dynamic', () => {
    const ambient = { isAmbient: true, dynamicType: 1 };
    const staticDyn = { isAmbient: false, dynamicType: 0 };
    const bump = { isAmbient: false, dynamicType: 1 };
    expect(odysseySelectIlluminationBump([ambient, staticDyn, bump])).toEqual([bump]);
    expect(odysseySelectIlluminationBump([ambient, staticDyn])).toEqual([]);
  });

  test('bump prioritize sorts all render-pool dynamic non-ambient lights', () => {
    const a = { isAmbient: false, dynamicType: 1, priority: 5 };
    const b = { isAmbient: false, dynamicType: 1, priority: 1 };
    const ambient = { isAmbient: true, dynamicType: 1, priority: 0 };
    const selected = odysseySelectPrioritizeBump(
      [a, ambient, b],
      (x, y) => (x.priority ?? 0) - (y.priority ?? 0)
    );
    expect(selected).toEqual([b]);
  });

  test('shadow light selection mode 2 picks lowest-priority distant/static shadow light', () => {
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
      radius: ODYSSEY_DISTANT_SHADOW_RADIUS,
      priority: 4,
    };
    const staticNear = {
      castShadow: true,
      isAmbient: false,
      dynamicType: 0,
      radius: 5,
      priority: 2,
    };
    expect(odysseySelectDistantStaticShadowLight([nearDynamic, distant, staticNear]))
      .toBe(staticNear);
  });

  test('headlight reserves one of three model light slots', () => {
    expect(odysseyModelLightSlots(ODYSSEY_MAX_LIGHTS_PER_MODEL, false)).toBe(3);
    expect(odysseyModelLightSlots(ODYSSEY_MAX_LIGHTS_PER_MODEL, true)).toBe(2);
    expect(ODYSSEY_STENCIL_SHADOW_SEGMENTS).toBe(10);
  });

  test('videoquality row prefers Video Quality then Texture Quality', () => {
    expect(odysseyVideoQualityRowIndex(4, 1, 2)).toBe(2);
    expect(odysseyVideoQualityRowIndex(4, 1)).toBe(1);
    expect(odysseyVideoQualityRowIndex(4)).toBe(3);
    expect(odysseyVideoQualityRowIndex(4, 99)).toBe(3);
  });

  test('envmap ADD keeps lit diffuse and layers env by (1-alpha)', () => {
    const lit: [number, number, number] = [0.5, 0.4, 0.3];
    const env: [number, number, number] = [0.1, 0.1, 0.2];
    expect(odysseyEnvmapAdd(lit, env, 1)).toEqual([0.5, 0.4, 0.3]);
    expect(odysseyEnvmapAdd(lit, env, 0)).toEqual([0.6, 0.5, 0.5]);
    const mid = odysseyEnvmapAdd(lit, env, 0.5);
    expect(mid[0]).toBeCloseTo(0.55);
    expect(mid[1]).toBeCloseTo(0.45);
    expect(mid[2]).toBeCloseTo(0.4);
  });

  test('envmap ADD preserves armor under dark cubemap; LERP crushes it', () => {
    const lit: [number, number, number] = [0.6, 0.55, 0.5];
    const darkEnv: [number, number, number] = [0.05, 0.05, 0.05]; // CM_Baremetal-like
    const chromeAlpha = 0.1;
    const added = odysseyEnvmapAdd(lit, darkEnv, chromeAlpha);
    const lerped = odysseyEnvmapAlbedo(darkEnv, lit, chromeAlpha);
    // ADD stays near armor luminance; LERP pulls toward near-black env.
    expect(added[0]).toBeGreaterThan(0.55);
    expect(lerped[0]).toBeLessThan(0.15);
  });
});
