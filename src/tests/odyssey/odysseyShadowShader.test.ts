import { describe, expect, test } from '@jest/globals';

import {
  MAX_ODYSSEY_SHADOW_MAPS,
  ODYSSEY_SHADOW_PARS_FRAGMENT,
  ODYSSEY_SHADOW_PCF_RADIUS,
  createOdysseyShadowUniforms,
} from '@/shaders/chunks/OdysseyShadow';

describe('OdysseyShadow primary map shader chunk', () => {
  test('uses shadow-map PCF sampling instead of SSCS symbols', () => {
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMap0');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMatrix');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyComputeShadowMapFactor');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMapFactorAt');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('unpackRGBAToDepth');

    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).not.toContain('odysseySceneDepth');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).not.toContain('ODYSSEY_SSCS');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).not.toContain('odysseyComputeScreenSpaceShadow');
  });

  test('supports retail maxShadowLights concurrent maps plus transient crossfade slot', () => {
    expect(MAX_ODYSSEY_SHADOW_MAPS).toBe(4);
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('MAX_ODYSSEY_SHADOW_MAPS');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMap1');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMap2');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowMap3');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('odysseyShadowLightCount');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('slotFactor *=');
  });

  test('fades shadow strength at influence radius and map edges', () => {
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('smoothstep');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('radiusFade0');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('mapFade0');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('mix( 1.0, lit0, fade0 )');
  });

  test('scales floor-receiver bias under lightmaps to close walkmesh vs MDL gaps', () => {
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('ODYSSEY_SHADOW_CONTACT_NORMAL_Z');
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toContain('ODYSSEY_SHADOW_FLOOR_BIAS_SCALE');
    // Floor bias must not run on creature skins (lightmapped receivers only).
    expect(ODYSSEY_SHADOW_PARS_FRAGMENT).toMatch(/#ifdef USE_LIGHTMAP[\s\S]*ODYSSEY_SHADOW_FLOOR_BIAS_SCALE/);
  });

  test('PCF radius constant is positive', () => {
    expect(ODYSSEY_SHADOW_PCF_RADIUS).toBeGreaterThan(0);
  });

  test('createOdysseyShadowUniforms exposes multi-map fields', () => {
    const uniforms = createOdysseyShadowUniforms();
    expect(uniforms.odysseyShadowMap0).toBeDefined();
    expect(uniforms.odysseyShadowMap1).toBeDefined();
    expect(uniforms.odysseyShadowMap2).toBeDefined();
    expect(uniforms.odysseyShadowMap3).toBeDefined();
    expect(uniforms.odysseyShadowMatrix).toBeDefined();
    expect(uniforms.odysseyShadowMapActive).toBeDefined();
    expect(uniforms.odysseyShadowLightCount).toBeDefined();
    expect(uniforms.odysseyShadowStrength.value).toHaveLength(MAX_ODYSSEY_SHADOW_MAPS);
    expect(uniforms.odysseyShadowActive.value).toHaveLength(MAX_ODYSSEY_SHADOW_MAPS);
  });
});
