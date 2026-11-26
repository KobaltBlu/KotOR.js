/**
 * Pure gesture maths for single-finger touch input (floating stick, tap / drag
 * classification, camera delta smoothing).
 *
 * @file touch-gesture.ts
 */

/** A touch that travels less than this (CSS px ≈ dp) before release is a tap. */
export const TOUCH_TAP_SLOP_DP = 14;
/** Travel past this turns a world touch into a stick / camera drag. */
export const TOUCH_DRAG_THRESHOLD_DP = 20;
/** Stick range is defined in 1024×768 screen space and scaled to the viewport height. */
export const TOUCH_REFERENCE_HEIGHT = 768;
/** Default touch sensitivity (0-100). */
export const TOUCH_DEFAULT_SENSITIVITY = 50;

/** Stick full-deflection distance in reference units; higher sensitivity shortens it. */
export function stickRangeUnits(sensitivity: number): number {
  return 150 - 110 * clamp01(sensitivity);
}

/** Stick dead zone as a fraction of the range; higher sensitivity shrinks it. */
export function stickDeadzone(sensitivity: number): number {
  return 0.3 - 0.3 * clamp01(sensitivity);
}

/**
 * Stick value for a finger offset from the stick origin.
 * Offsets inside the dead zone read 0; the rest is rescaled so a full-range
 * offset reads ±1.
 */
export function stickAxis(offsetPx: number, rangePx: number, deadzone: number): number {
  if(!(rangePx > 0) || !Number.isFinite(offsetPx)) return 0;
  const v = offsetPx / rangePx;
  const mag = Math.abs(v) - deadzone;
  if(mag <= 0) return 0;
  const span = 1 - deadzone;
  const scaled = span > 1e-6 ? mag / span : 1;
  return Math.sign(v) * Math.min(1, scaled);
}

/**
 * Floating stick origin: once the finger is further than the range from the
 * origin, drag the origin along so it stays exactly one range behind.
 */
export function leashOrigin(origin: number, current: number, rangePx: number): number {
  const offset = current - origin;
  if(Math.abs(offset) <= rangePx) return origin;
  return current - Math.sign(offset) * rangePx;
}

/** True once a touch has moved far enough to count as a drag. */
export function exceedsDragThreshold(dx: number, dy: number, threshold: number = TOUCH_DRAG_THRESHOLD_DP): boolean {
  return Math.hypot(dx, dy) > threshold;
}

/** Release classification from the furthest distance the touch travelled. */
export function isTap(maxTravel: number, slop: number = TOUCH_TAP_SLOP_DP): boolean {
  return maxTravel < slop;
}

/**
 * Smoothed release of an accumulated delta: 1/8 per frame, rounded up so the
 * remainder always drains.
 */
export function takeSmoothedDelta(accumulated: number): { step: number; rest: number } {
  if(!accumulated) return { step: 0, rest: 0 };
  const mag = Math.abs(accumulated);
  const step = Math.sign(accumulated) * Math.min(mag, Math.ceil(mag / 8));
  return { step, rest: accumulated - step };
}

export function clamp01(v: number): number {
  if(!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
