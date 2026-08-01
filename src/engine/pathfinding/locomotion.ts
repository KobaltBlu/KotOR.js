/**
 * Shared locomotion helpers — retail-aligned numbers for KotOR.js force movers.
 *
 * Foot motion stays force/walk (ModuleCreature); these tune rate/ease/follow
 * to match GetWalkRate clamp, FollowLeader bands, and WalkUpdateLocation ease.
 *
 * @file locomotion.ts
 */

/** Retail GetWalkRate / GetRunRate movement_rate_factor clamp. */
export const MOVEMENT_RATE_MIN = 0.125;
export const MOVEMENT_RATE_MAX = 1.5;

/** Retail DriveUpdateLocation special strafe rate (0x275e/0x275f → 1600 milli-units). */
export const DRIVE_STRAFE_RATE = 1.6;

/**
 * Clamp effect movement factor like retail GetWalkRate / GetRunRate.
 */
export function clampMovementRateFactor(factor: number): number {
  if(!(factor > 0) || !Number.isFinite(factor)) return 1;
  if(factor < MOVEMENT_RATE_MIN) return MOVEMENT_RATE_MIN;
  if(factor > MOVEMENT_RATE_MAX) return MOVEMENT_RATE_MAX;
  return factor;
}

/**
 * TSL GetMovementRateFactor @ 0068f140 — Mobility feat (0xc3) adds +0.1 before clamp.
 * K1 has no equivalent bonus.
 */
export function applyMobilityMovementBonus(
  factor: number,
  hasMobilityFeat: boolean,
  isTsl: boolean
): number {
  if(!isTsl || !hasMobilityFeat) return factor;
  return factor + 0.1;
}

/**
 * Normalize EffectMovementSpeedIncrease int to absolute speed percent.
 * NWScript: n < 100 → n+100; n >= 100 used as-is (100 = unchanged, 150 = 1.5×).
 */
export function normalizeSpeedIncreasePercent(n: number): number {
  const v = n | 0;
  return v < 100 ? v + 100 : v;
}

/**
 * Path-approach ease — retail WalkUpdateLocation @ 0051bb10.
 * Far (remaining > rate×0.5) → 1; near → √(remaining/thresh), min 0.1.
 * When near, retail also subtracts dt_ms*0.001 from the approach target.
 */
export function pathApproachScale(remaining: number, baseSpeed: number, deltaSec = 0): number {
  const thresh = Math.max(0.25, (baseSpeed > 0 ? baseSpeed : 1.7) * 0.5);
  if(remaining > thresh) return 1;
  const ratio = remaining / thresh;
  let approach = ratio < 0.01 ? 0.1 : Math.sqrt(ratio);
  // field42 dt_ms * 0.001
  if(deltaSec > 0){
    approach -= deltaSec;
  }
  return Math.max(0.1, approach);
}

/**
 * Retail field37_0xb8 speed-factor ramp toward approach target.
 * Ramps up by dt when previous factor < 1 and below target.
 */
export function walkSpeedFactorRamp(
  previousFactor: number,
  approachTarget: number,
  deltaSec: number
): number {
  let target = Math.max(0.1, approachTarget);
  const prev = Number.isFinite(previousFactor) ? previousFactor : 0;
  if(prev < 1.0){
    const ramp = prev + Math.max(0, deltaSec);
    if(ramp <= target){
      target = ramp;
    }
  }
  return Math.max(0.1, target);
}

/**
 * Trapezoidal step distance — retail:
 *   step = dt_ms * (new + old) * rate_milli * 0.5 * 1e-6
 * With world rate (units/sec) and delta seconds:
 *   step = delta * (new + old) * 0.5 * rate
 */
export function walkTrapezoidStep(
  previousFactor: number,
  newFactor: number,
  baseSpeed: number,
  deltaSec: number
): number {
  const rate = baseSpeed > 0 ? baseSpeed : 1.7;
  const dt = Math.max(0, deltaSec);
  return dt * (newFactor + previousFactor) * 0.5 * rate;
}

/**
 * Retail FollowLeader post-rate dist² bands (@ 0051c360):
 *   dist² < 1 → ×0.9; < 225 → ×1.2; else ×1.5
 */
export function getFollowRateScale(distToOffset: number): number {
  const d2 = distToOffset * distToOffset;
  if(d2 < 1) return 0.9;
  if(d2 < 225) return 1.2;
  return 1.5;
}

/**
 * Cosine of max turn before walk-back (retail dot < -0.707 ≈ 135°).
 */
export const WALK_BACK_DOT = -0.707;
