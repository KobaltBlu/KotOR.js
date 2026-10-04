import { describe, expect, test } from '@jest/globals';
import {
  odysseyBrightExtractChannel,
  odysseyBrightExtractRgb,
} from '@engine/render/shaders/pass/ConvolutionBloomShader';
import { ODYSSEY_BLOOM_FILTER_MULTIPLIER } from '@engine/render/shaders/pass/FrameBufferEffectGates';

/** GOG K1 __ftol2 reference for a channel ramp. */
function ftol2Extract(i: number, cutoff: number, invSpan: number): number {
  if(i < cutoff){ return 0; }
  return Math.trunc((i - cutoff) * invSpan * 178.5);
}

describe('ConvolutionBloomLut (GOG K1 bright-extract)', () => {
  test('grey 215 stays black (below G/B cutoff 216)', () => {
    expect(odysseyBrightExtractRgb(215)).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('cyan band 216–233: G/B bloom before R (engine hallway-trim cast)', () => {
    expect(odysseyBrightExtractRgb(216)).toEqual({ r: 0, g: 0, b: 0 });

    const g220 = ftol2Extract(220, 0xd8, 0.025641026);
    expect(odysseyBrightExtractRgb(220)).toEqual({ r: 0, g: g220, b: g220 });
    expect(g220).toBeGreaterThan(0);

    const g230 = ftol2Extract(230, 0xd8, 0.025641026);
    expect(odysseyBrightExtractRgb(230)).toEqual({ r: 0, g: g230, b: g230 });
    expect(g230).toBe(Math.trunc((230 - 0xd8) * 0.025641026 * 178.5));
  });

  test('grey 234: R just enters; G/B already active', () => {
    const rgb = odysseyBrightExtractRgb(234);
    expect(rgb.r).toBe(0); // (234-234)*scale trunc → 0
    expect(rgb.g).toBe(ftol2Extract(234, 0xd8, 0.025641026));
    expect(rgb.b).toBe(rgb.g);
    expect(rgb.g).toBeGreaterThan(0);
  });

  test('grey 255: channels meet near 178 after __ftol2 trunc (not Math.round)', () => {
    const rgb = odysseyBrightExtractRgb(255);
    const r = ftol2Extract(255, 0xea, 0.04761905);
    const g = ftol2Extract(255, 0xd8, 0.025641026);
    expect(rgb).toEqual({ r, g, b: g });
    // 178.5 truncates to 178; Math.round would wrongly yield 179.
    expect(r).toBe(178);
    expect(g).toBe(178);
    expect(Math.round(178.5)).toBe(179);
  });

  test('channel helpers match GOG cutoffs 0xEA / 0xD8', () => {
    expect(odysseyBrightExtractChannel(233, 0xea, 0.04761905)).toBe(0);
    expect(odysseyBrightExtractChannel(234, 0xea, 0.04761905)).toBe(0);
    expect(odysseyBrightExtractChannel(235, 0xea, 0.04761905)).toBe(
      Math.trunc(1 * 0.04761905 * 178.5)
    );
    expect(odysseyBrightExtractChannel(215, 0xd8, 0.025641026)).toBe(0);
    expect(odysseyBrightExtractChannel(216, 0xd8, 0.025641026)).toBe(0);
  });

  test('bloomFilterMultiplier stays 0.35 (single composite scale)', () => {
    expect(ODYSSEY_BLOOM_FILTER_MULTIPLIER).toBeCloseTo(0.35);
    expect(Math.trunc(ODYSSEY_BLOOM_FILTER_MULTIPLIER * 255)).toBe(89);
  });
});
