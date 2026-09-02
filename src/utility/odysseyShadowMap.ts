import * as THREE from 'three';

import {
  RETAIL_DISTANT_SHADOW_RADIUS,
  RETAIL_MAX_SHADOW_DISTANCE,
  RETAIL_SHADOW_LENGTH,
} from '@/utility/retailLighting';

/** Minimum spot/directional shadow camera near plane. */
export const ODYSSEY_SHADOW_CAMERA_NEAR = 0.1;

/**
 * Depth bias for packed shadow-map compares (NDC). Retail stencil bias (0.05) is far too
 * large for perspective maps where useful depths cluster near 1.0.
 */
export const ODYSSEY_SHADOW_MAP_DEPTH_BIAS = 0.001;

/** Three.js LightShadow.bias while rendering the depth pass. */
export const ODYSSEY_SHADOW_MAP_LIGHT_BIAS = -0.001;

/** Default orthographic half-extent when influence radius is tiny. */
export const ODYSSEY_SHADOW_MIN_HALF_EXTENT = RETAIL_SHADOW_LENGTH;

/** Local lights coplanar with focus within this Z delta get a map proxy elevation. */
export const ODYSSEY_SHADOW_COPLANAR_Z_EPS = 0.25;

const _scratchFocus = new THREE.Vector3();
const _scratchLightPos = new THREE.Vector3();

export interface IOdysseySpotShadowCameraParams {
  fovDeg: number;
  far: number;
  near: number;
}

export interface IOdysseyOrthoShadowCameraParams {
  halfExtent: number;
  far: number;
  near: number;
}

/** Spot FOV from effective light radius and receiver coverage. */
export function computeSpotShadowFovDegrees(
  effectiveRadius: number,
  coverageRadius: number
): number {
  const dist = Math.max(effectiveRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  const coverage = Math.max(coverageRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  return THREE.MathUtils.radToDeg(Math.atan(coverage / dist) * 2);
}

/** Spot shadow camera far plane from effective radius and coverage. */
export function computeSpotShadowFar(effectiveRadius: number, coverageRadius: number): number {
  const dist = Math.max(effectiveRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  const coverage = Math.max(coverageRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  return dist + coverage + ODYSSEY_SHADOW_MIN_HALF_EXTENT;
}

export function buildSpotShadowCameraParams(
  effectiveRadius: number,
  coverageRadius: number
): IOdysseySpotShadowCameraParams {
  return {
    fovDeg: computeSpotShadowFovDegrees(effectiveRadius, coverageRadius),
    far: computeSpotShadowFar(effectiveRadius, coverageRadius),
    near: ODYSSEY_SHADOW_CAMERA_NEAR,
  };
}

/**
 * Near/far for a focus-centered overhead spot — tight range so body vs floor
 * depths separate in the packed map (avoids 0.99/0.99 self-compare).
 * @deprecated Prefer {@link buildAngledSpotShadowCameraParams} from the real lamp.
 */
export function buildFocusSpotShadowCameraParams(
  elevation: number
): IOdysseySpotShadowCameraParams {
  const elev = Math.max(elevation, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  const near = Math.max(ODYSSEY_SHADOW_CAMERA_NEAR, elev - 3.5);
  const far = elev + 1.5;
  return {
    fovDeg: 90,
    near,
    far: Math.max(far, near + 1),
  };
}

/**
 * Tight perspective range around the light→focus ray so packed depths separate
 * body from floor without forcing an overhead proxy.
 */
export function buildAngledSpotShadowCameraParams(
  lightPos: THREE.Vector3,
  focus: THREE.Vector3,
  coverageRadius: number = ODYSSEY_SHADOW_MIN_HALF_EXTENT
): IOdysseySpotShadowCameraParams {
  const dist = Math.max(lightPos.distanceTo(focus), ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  const coverage = Math.max(coverageRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  const near = Math.max(ODYSSEY_SHADOW_CAMERA_NEAR, dist - coverage * 0.7);
  const far = dist + coverage;
  const fovDeg = THREE.MathUtils.radToDeg(Math.atan(coverage / dist) * 2);
  return {
    fovDeg: THREE.MathUtils.clamp(fovDeg, 30, 120),
    near,
    far: Math.max(far, near + 1),
  };
}

/** Orthographic half-size clamped to retail focus-shadow region. */
export function computeOrthographicHalfExtent(effectiveRadius: number): number {
  const influence = Math.max(effectiveRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  return Math.min(influence, RETAIL_MAX_SHADOW_DISTANCE);
}

export function buildOrthoShadowCameraParams(effectiveRadius: number): IOdysseyOrthoShadowCameraParams {
  const half = computeOrthographicHalfExtent(effectiveRadius);
  return {
    halfExtent: half,
    far: half * 4 + ODYSSEY_SHADOW_MIN_HALF_EXTENT,
    near: ODYSSEY_SHADOW_CAMERA_NEAR,
  };
}

export function isDistantShadowLightRadius(radius: number): boolean {
  return radius >= RETAIL_DISTANT_SHADOW_RADIUS;
}

/**
 * Snap orthographic shadow camera center to texel grid to reduce shimmer while moving.
 */
export function snapOrthographicShadowCameraToTexels(
  camera: THREE.OrthographicCamera,
  focus: THREE.Vector3,
  mapSize: number
): void {
  if(!(mapSize > 0)){ return; }
  const width = camera.right - camera.left;
  const height = camera.top - camera.bottom;
  if(!(width > 0 && height > 0)){ return; }

  const texelX = width / mapSize;
  const texelY = height / mapSize;

  camera.position.x = Math.floor(focus.x / texelX) * texelX;
  camera.position.y = Math.floor(focus.y / texelY) * texelY;
  camera.position.z = focus.z + Math.max(height, width);
  camera.lookAt(focus);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}

/**
 * Raise a floor-level local light for shadow-map rendering.
 */
export function adjustShadowProxyPositionForMap(
  lightPos: THREE.Vector3,
  focus: THREE.Vector3,
  influenceRadius: number
): void {
  if(Math.abs(lightPos.z - focus.z) > ODYSSEY_SHADOW_COPLANAR_Z_EPS){
    return;
  }
  const elevation = Math.max(influenceRadius, ODYSSEY_SHADOW_MIN_HALF_EXTENT);
  lightPos.z = focus.z + elevation;
}

/**
 * Local spot shadow map: keep the retail lamp XY so shadows cast away from the
 * source, but elevate coplanar (z≈floor) lamps so the depth pass can see body
 * over floor along the light ray. Lighting still uses the real PartLight.
 */
export function configureSpotShadowProxyForFloorContact(
  sourceLight: THREE.Vector3,
  focus: THREE.Vector3,
  influenceRadius: number,
  proxyLight: THREE.SpotLight,
  outProxyPos: THREE.Vector3 = _scratchLightPos
): THREE.Vector3 {
  outProxyPos.copy(sourceLight);
  adjustShadowProxyPositionForMap(outProxyPos, focus, influenceRadius);
  aimShadowProxyAtFocus(outProxyPos, focus, proxyLight);
  return outProxyPos;
}

/** Aim a spot/directional proxy at focus from a retail-adjusted light position. */
export function aimShadowProxyAtFocus(
  lightPos: THREE.Vector3,
  focus: THREE.Vector3,
  proxyLight: THREE.SpotLight | THREE.DirectionalLight
): void {
  proxyLight.position.copy(lightPos);
  proxyLight.target.position.copy(focus);
  proxyLight.target.updateMatrixWorld(true);
  proxyLight.updateMatrixWorld(true);
}

export function copyVec3ToScratch(
  x: number,
  y: number,
  z: number,
  target: THREE.Vector3 = _scratchLightPos
): THREE.Vector3 {
  return target.set(x, y, z);
}

export function copyFocusToScratch(focus: THREE.Vector3): THREE.Vector3 {
  return _scratchFocus.copy(focus);
}
