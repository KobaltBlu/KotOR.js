/**
 * Retail FrameBufferModifications gate model (K1 / K2 ARB path).
 *
 * RenderSinglePass passes mask 0x1F (or 0x3F with force distortion),
 * but each stage also requires its independent visualizePassN flag.
 *
 * Shipping defaults (K1):
 * visualizePass1 (overbrighten) = 0 — BSS, never written → off
 * visualizePass2 (convolution) = 1 — .data init → on
 * visualizePass3..7 = 1
 *
 * Bit presence in the dispatcher mask is therefore not sufficient for enablement.
 *
 * @file FrameBufferEffectGates.ts
 */

/** Retail FrameBufferModifications bit flags. */
export const FrameBufferModBit = {
  Overbrighten: 0x01,
  Convolution: 0x02,
  FilmNoise: 0x04,
  Saturation: 0x08,
  SpeedBlur: 0x10,
  ForceDistortion: 0x20,
} as const;

/**
 * Retail visualizePass* shipping defaults.
 * Pass1 (overbrighten) is the only stage that stays off.
 */
export const RetailVisualizePassDefaults = {
  /** visualizePass1 — BSS zero, no writers. */
  overbrighten: false,
  /** visualizePass2 — .data init 1. */
  convolution: true,
  /** visualizePass3 / pass7 — film/scan noise (still needs aurScanNoise). */
  filmNoise: true,
  /** visualizePass4 — saturation (still needs aurSaturation). */
  saturation: true,
  /** visualizePass5 — force distortion (still needs forcePushBucket). */
  forceDistortion: true,
  /** visualizePass6 — speed blur (still needs enableSpeedBlur). */
  speedBlur: true,
} as const;

/** Retail BloomFilter glColor4f alpha / bloomFilterMultiplier. */
export const RETAIL_BLOOM_FILTER_MULTIPLIER = 0.35;

/**
 * Retail bloomFiltersATI 5×5 kernel (row-major).
 * BloomFilter draws these weights with alpha = RETAIL_BLOOM_FILTER_MULTIPLIER.
 */
export const RETAIL_BLOOM_KERNEL_5X5: readonly number[] = [
  0.12, 0.25, 0.29, 0.25, 0.12,
  0.25, 0.49, 0.58, 0.49, 0.25,
  0.29, 0.58, 0.67, 0.58, 0.29,
  0.25, 0.49, 0.58, 0.49, 0.25,
  0.12, 0.25, 0.29, 0.25, 0.12,
];

/** Retail overbrighten curve sample (retail = 0.5). */
export function retailOverbrightenCurve(x: number): number {
  const f = Math.max(0, Math.min(1, x));
  if(f >= 0.5){
    return Math.sqrt((f - 0.5) * 0.5) + 0.5;
  }
  return f * f * 0.5 * 4.0; // 2*f^2
}

export interface FrameBufferPassEnableInput {
  frameBufferIniEnabled: boolean;
  roomedArea: boolean;
  /** Debug override for visualizePass1; default matches retail shipping (false). */
  visualizeOverbrighten?: boolean;
  /** Debug override for visualizePass2; default matches retail shipping (true). */
  visualizeConvolution?: boolean;
}

export interface SpeedBlurPassEnableInput {
  frameBufferIniEnabled: boolean;
  /** Enable speed blur / SWMG_SetSpeedBlurEffect / Force Speed VFX. */
  enableSpeedBlur: boolean;
  /** Debug override for visualizePass6; default matches retail shipping (true). */
  visualizeSpeedBlur?: boolean;
}

/**
 * Resolve which always-on FB stages should run this frame.
 * Mirrors (mask & bit) && visualizePassN && doFrameBufferFX && room.
 */
export function resolveAlwaysOnFrameBufferPasses(input: FrameBufferPassEnableInput): {
  overbrighten: boolean;
  convolution: boolean;
} {
  const base = input.frameBufferIniEnabled && input.roomedArea;
  const visOver =
    input.visualizeOverbrighten ?? RetailVisualizePassDefaults.overbrighten;
  const visConv =
    input.visualizeConvolution ?? RetailVisualizePassDefaults.convolution;
  return {
    // Mask always includes 0x01, but visualizePass1 stays 0 in shipping.
    overbrighten: base && visOver,
    convolution: base && visConv,
  };
}

/**
 * Retail visualizePass6 && enableSpeedBlur && (mask & 0x10) && doFrameBufferFX.
 * Not room-gated here — ApplyMotionBlur / SWMG own their enablement; swoop has no rooms.
 */
export function resolveSpeedBlurPass(input: SpeedBlurPassEnableInput): boolean {
  const vis =
    input.visualizeSpeedBlur ?? RetailVisualizePassDefaults.speedBlur;
  return input.frameBufferIniEnabled && input.enableSpeedBlur && vis;
}

/** Retail progFX ids that call ApplyMotionBlur with speed blur enabled (0x641 / 0x642). */
export const MOTION_BLUR_PROGFX_ENABLE = new Set([0x641, 0x642]);

/** Retail hardcoded class range for ApplyMotionBlur / RemoveMotionBlur. */
export function isMotionBlurProgFX(id: number): boolean {
  return id >= 0x640 && id < 0x6a4;
}
