import { describe, expect, test } from '@jest/globals';

import * as THREE from 'three';

import {
  adjustShadowProxyPositionForMap,
  buildAngledSpotShadowCameraParams,
  buildFocusSpotShadowCameraParams,
  buildOrthoShadowCameraParams,
  buildSpotShadowCameraParams,
  computeSpotShadowFovDegrees,
  configureSpotShadowProxyForFloorContact,
  isDistantShadowLightRadius,
  ODYSSEY_SHADOW_COPLANAR_Z_EPS,
  ODYSSEY_SHADOW_DIRECTIONAL_MAX_HALF_EXTENT,
  ODYSSEY_SHADOW_MIN_HALF_EXTENT,
  placeDirectionalShadowProxyAlongLight,
} from '@/utility/odysseyShadowMap';
import {
  isOdysseyAreaDirectionalShadowLight,
  ODYSSEY_AREA_DIRECTIONAL_SHADOW_RADIUS,
} from '@/utility/odysseyLighting';

describe('odyssey shadow map camera', () => {
  test('spot FOV uses receiver coverage radius, not max shadow distance', () => {
    expect(computeSpotShadowFovDegrees(5, 5)).toBeCloseTo(90, 4);
    expect(computeSpotShadowFovDegrees(5, 40)).toBeGreaterThan(150);

    const local = buildSpotShadowCameraParams(5, 5);
    expect(local.fovDeg).toBeCloseTo(90, 4);
    expect(local.far).toBe(15);
  });

  test('coplanar local lights elevate proxy Z for shadow-map casting', () => {
    const lightPos = new THREE.Vector3(10, 20, 0);
    const focus = new THREE.Vector3(12, 22, 0.005);
    adjustShadowProxyPositionForMap(lightPos, focus, 5);
    expect(lightPos.z).toBeCloseTo(focus.z + 5, 4);

    const elevated = new THREE.Vector3(1, 2, focus.z + ODYSSEY_SHADOW_COPLANAR_Z_EPS + 1);
    adjustShadowProxyPositionForMap(elevated, focus, 3);
    expect(elevated.z).toBeCloseTo(focus.z + ODYSSEY_SHADOW_COPLANAR_Z_EPS + 1, 4);

    const tinyInfluence = new THREE.Vector3(0, 0, focus.z);
    adjustShadowProxyPositionForMap(tinyInfluence, focus, 1);
    expect(tinyInfluence.z).toBeCloseTo(focus.z + ODYSSEY_SHADOW_MIN_HALF_EXTENT, 4);
  });

  test('spot proxy keeps source XY and elevates coplanar lamps toward focus', () => {
    const source = new THREE.Vector3(129, 89, 0);
    const focus = new THREE.Vector3(125.7, 89.26, 0.005);
    const spot = new THREE.SpotLight(0xffffff, 0);
    const proxyPos = configureSpotShadowProxyForFloorContact(source, focus, 5, spot);

    expect(proxyPos.x).toBeCloseTo(source.x, 4);
    expect(proxyPos.y).toBeCloseTo(source.y, 4);
    expect(proxyPos.z).toBeCloseTo(focus.z + 5, 4);
    expect(spot.position.x).toBeCloseTo(source.x, 4);
    expect(spot.target.position.x).toBeCloseTo(focus.x, 4);
    expect(spot.target.position.y).toBeCloseTo(focus.y, 4);
    expect(spot.target.position.z).toBeCloseTo(focus.z, 4);
  });

  test('angled spot camera tightens near/far around light-to-focus distance', () => {
    const light = new THREE.Vector3(130, 89, 5);
    const focus = new THREE.Vector3(125, 89, 0);
    const params = buildAngledSpotShadowCameraParams(light, focus, 5);
    const dist = light.distanceTo(focus);
    expect(params.near).toBeCloseTo(Math.max(0.1, dist - 3.5), 4);
    expect(params.far).toBeCloseTo(dist + 5, 4);
    expect(params.far).toBeGreaterThan(params.near);
    expect(params.fovDeg).toBeGreaterThanOrEqual(30);
    expect(params.fovDeg).toBeLessThanOrEqual(120);
  });

  test('close local lamps keep near below body so feet-only clipping cannot occur', () => {
    // auroralight27-style: lamp at head height, dist < ODYSSEY_SHADOW_LENGTH (5)
    const light = new THREE.Vector3(5.691, 28.577, 23.579);
    const focus = new THREE.Vector3(5.926, 29.166, 21.804);
    const dist = light.distanceTo(focus);
    expect(dist).toBeLessThan(ODYSSEY_SHADOW_MIN_HALF_EXTENT);

    const params = buildAngledSpotShadowCameraParams(light, focus, 5);
    expect(params.near).toBeCloseTo(0.1, 4);
    expect(params.near).toBeLessThan(dist * 0.5);
    expect(params.far).toBeCloseTo(dist + 5, 4);
    // Wider FOV than the old dist-clamped-to-5 path (90°) so floor throw stays in-map.
    expect(params.fovDeg).toBeGreaterThan(90);
    expect(params.fovDeg).toBeLessThanOrEqual(120);
  });

  test('focus spot camera tightens near/far around elevation', () => {
    const params = buildFocusSpotShadowCameraParams(5);
    expect(params.fovDeg).toBe(90);
    expect(params.near).toBeCloseTo(1.5, 4);
    expect(params.far).toBeCloseTo(6.5, 4);
    expect(params.far).toBeGreaterThan(params.near);
  });

  test('area-scale radii use directional/ortho shadow cameras (threshold 100)', () => {
    expect(ODYSSEY_AREA_DIRECTIONAL_SHADOW_RADIUS).toBe(100);
    expect(isDistantShadowLightRadius(99)).toBe(false);
    expect(isDistantShadowLightRadius(100)).toBe(true);
    expect(isDistantShadowLightRadius(800)).toBe(true);
    expect(isOdysseyAreaDirectionalShadowLight(800)).toBe(true);
  });

  test('ortho near/far hug a focus-relative directional proxy offset', () => {
    const light = new THREE.Vector3(262, 173, 189);
    const focus = new THREE.Vector3(187, 78, 0);
    const ortho = buildOrthoShadowCameraParams(800, light, focus);
    expect(ortho.halfExtent).toBe(ODYSSEY_SHADOW_DIRECTIONAL_MAX_HALF_EXTENT);
    expect(ortho.near).toBeLessThan(ortho.far);
    expect(ortho.far).toBeLessThan(200);

    const proxy = new THREE.Vector3();
    placeDirectionalShadowProxyAlongLight(light, focus, ortho.halfExtent, proxy);
    const dist = proxy.distanceTo(focus);
    expect(dist).toBeCloseTo(Math.max(ortho.halfExtent * 2, ODYSSEY_SHADOW_MIN_HALF_EXTENT * 2), 4);
    // Same direction as authored light → focus.
    const a = light.clone().sub(focus).normalize();
    const b = proxy.clone().sub(focus).normalize();
    expect(a.dot(b)).toBeCloseTo(1, 4);
  });

  test('MDL key lights remain eligible when ARE SunShadows is off', () => {
    // Mirrors LightManager.getShadowLights: illuminationScore gate only —
    // areaShadowsEnabled must not drop radius >= 100 module lights.
    type Candidate = { radius: number; illuminationScore: number; name: string };
    const candidates: Candidate[] = [
      { name: 'auroralight01', radius: 800, illuminationScore: 0.14 },
      { name: 'auroralight104', radius: 5, illuminationScore: 0.65 },
    ];
    const areaShadowsEnabled = false;
    const eligible = candidates.filter((light) => {
      if(light.illuminationScore > 1){ return false; }
      void areaShadowsEnabled; // no longer excludes large MDL lights
      return true;
    });
    expect(eligible.map((l) => l.name)).toEqual(['auroralight01', 'auroralight104']);
    const preferred = eligible.reduce((best, light) =>
      light.illuminationScore < best.illuminationScore ? light : best
    );
    expect(preferred.name).toBe('auroralight01');
    expect(isDistantShadowLightRadius(preferred.radius)).toBe(true);
  });
});
