/**
 * Pure lens-flare math (K1).
 *
 * @file odyssey-lens-flare-math.ts
 */

/** defaults */
export const ODYSSEY_LENS_FLARE_SIZE = 0.1;
export const ODYSSEY_FLARE_SPEED = 3.0;
export const ODYSSEY_HIT_CHECK_FLARE = true;
export const ODYSSEY_REVERSE_FLARE_HIT = true;
export const ODYSSEY_RENDER_LENS_FLARES = true;

export function hasLensFlareData(colorShiftCount: number): boolean {
  return colorShiftCount > 0;
}

export function isBeyondFlareRadius(distance: number, flareRadius: number): boolean {
  return distance > flareRadius;
}

/**
 * falloff factor (flareradius − dist) / flareradius.
 * When radius is 0, skips the divide (leaves pre-divide product).
 */
export function flareRadiusFalloff(distance: number, flareRadius: number): number {
  const delta = flareRadius - distance;
  if(flareRadius === 0){
    return delta;
  }
  return delta / flareRadius;
}

/**
 * View-space facing: max(0, −dir.z)² after normalize(light − camera) in camera space.
 */
export function flareFacing(viewDirZ: number): number {
  const facing = viewDirZ < 0 ? -viewDirZ : 0;
  return facing * facing;
}

/**
 * Element half-extent in eye-space (z = −2 plane).
 * size = flaresizes[i] * (radius − dist) / radius * lensFlareSize
 */
export function flareElementSize(
  flareSize: number,
  distance: number,
  flareRadius: number,
  lensFlareSize: number = ODYSSEY_LENS_FLARE_SIZE,
): number {
  return flareSize * flareRadiusFalloff(distance, flareRadius) * lensFlareSize;
}

/**
 * Element center in NDC (K1 00457ec0).
 *
 * Intersects plane n·x + 2 = 0 (z = +2), sets S = −hit, then places
 * the sprite at S × flarepositions[i] on the z = −2 draw plane. That equals
 * lightNDC × pos (pos = 1 on the light; 0 at screen center; −1 opposite).
 */
export function flareElementNdc(
  lightNdcX: number,
  lightNdcY: number,
  flarePosition: number,
): { x: number; y: number } {
  return {
    x: lightNdcX * flarePosition,
    y: lightNdcY * flarePosition,
  };
}

export interface FlareElementColorInput {
  shiftR: number;
  shiftG: number;
  shiftB: number;
  lightR: number;
  lightG: number;
  lightB: number;
  occlusionFade: number;
  facing: number;
  distance: number;
  flareRadius: number;
}

/**
 * rgb = clamp01((colorShift + light.color) * fade * facing * falloff)
 * No light node.multiplier.
 */
export function flareElementColor(input: FlareElementColorInput): { r: number; g: number; b: number } {
  const falloff = flareRadiusFalloff(input.distance, input.flareRadius);
  const scale = input.occlusionFade * input.facing * falloff;
  return {
    r: clamp01((input.shiftR + input.lightR) * scale),
    g: clamp01((input.shiftG + input.lightG) * scale),
    b: clamp01((input.shiftB + input.lightB) * scale),
  };
}

/**
 * Occlusion fade step (light node+0x88).
 * clear LOS → fade up; hit → fade down; return whether draw should continue.
 */
export function stepFlareOcclusionFade(
  currentFade: number,
  occluded: boolean,
  delta: number,
  flareSpeed: number = ODYSSEY_FLARE_SPEED,
): { fade: number; skipDraw: boolean } {
  if(!occluded){
    const fade = Math.min(1, currentFade + flareSpeed * delta);
    return { fade, skipDraw: false };
  }
  const fade = Math.max(0, currentFade - flareSpeed * delta);
  return { fade, skipDraw: fade === 0 };
}

function clamp01(v: number): number {
  if(v <= 0) return 0;
  if(v >= 1) return 1;
  return v;
}
