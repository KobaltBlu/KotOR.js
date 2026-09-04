import { describe, expect, test } from '@jest/globals';
import {
  FrameBufferModBit,
  RetailVisualizePassDefaults,
  RETAIL_BLOOM_FILTER_MULTIPLIER,
  RETAIL_BLOOM_KERNEL_5X5,
  resolveAlwaysOnFrameBufferPasses,
  resolveSpeedBlurPass,
  isMotionBlurProgFX,
  MOTION_BLUR_PROGFX_ENABLE,
  retailOverbrightenCurve,
} from '@/shaders/pass/FrameBufferEffectGates';

describe('FrameBufferEffectGates', () => {
  test('shipping visualizePass defaults leave overbrighten off and convolution on', () => {
    expect(RetailVisualizePassDefaults.overbrighten).toBe(false);
    expect(RetailVisualizePassDefaults.convolution).toBe(true);
  });

  test('dispatcher mask includes overbrighten bit even when visualize gate is off', () => {
    expect(FrameBufferModBit.Overbrighten).toBe(0x01);
    expect(FrameBufferModBit.Convolution).toBe(0x02);
    expect(0x1f & FrameBufferModBit.Overbrighten).toBeTruthy();
    expect(0x1f & FrameBufferModBit.Convolution).toBeTruthy();
  });

  test('resolveAlwaysOnFrameBufferPasses matches retail shipping in a room', () => {
    const on = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: true,
      roomedArea: true,
    });
    expect(on.overbrighten).toBe(false);
    expect(on.convolution).toBe(true);
  });

  test('resolveAlwaysOnFrameBufferPasses disables all when Frame Buffer INI is off', () => {
    const off = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: false,
      roomedArea: true,
    });
    expect(off.overbrighten).toBe(false);
    expect(off.convolution).toBe(false);
  });

  test('resolveAlwaysOnFrameBufferPasses disables all outside a roomed area', () => {
    const menu = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: true,
      roomedArea: false,
    });
    expect(menu.overbrighten).toBe(false);
    expect(menu.convolution).toBe(false);
  });

  test('debug visualizeOverbrighten can re-enable the dormant pass', () => {
    const debug = resolveAlwaysOnFrameBufferPasses({
      frameBufferIniEnabled: true,
      roomedArea: true,
      visualizeOverbrighten: true,
    });
    expect(debug.overbrighten).toBe(true);
    expect(debug.convolution).toBe(true);
  });

  test('overbrighten curve crushes midtones (why always-on looked dark)', () => {
    expect(retailOverbrightenCurve(0)).toBeCloseTo(0);
    expect(retailOverbrightenCurve(0.25)).toBeCloseTo(0.125);
    expect(retailOverbrightenCurve(0.4)).toBeCloseTo(0.32);
    expect(retailOverbrightenCurve(0.5)).toBeCloseTo(0.5);
    expect(retailOverbrightenCurve(1)).toBeCloseTo(Math.sqrt(0.25) + 0.5);
  });

  test('retail bloom multiplier and 5x5 kernel constants', () => {
    expect(RETAIL_BLOOM_FILTER_MULTIPLIER).toBeCloseTo(0.35);
    expect(RETAIL_BLOOM_KERNEL_5X5).toHaveLength(25);
    expect(RETAIL_BLOOM_KERNEL_5X5[12]).toBeCloseTo(0.67); // center
    expect(RETAIL_BLOOM_KERNEL_5X5[0]).toBeCloseTo(0.12);
    expect(RETAIL_BLOOM_KERNEL_5X5[24]).toBeCloseTo(0.12);
    const kernelSum = RETAIL_BLOOM_KERNEL_5X5.reduce((a, b) => a + b, 0);
    expect(kernelSum).toBeCloseTo(8.59, 2);
  });

  test('resolveSpeedBlurPass requires enableSpeedBlur and Frame Buffer INI', () => {
    expect(resolveSpeedBlurPass({
      frameBufferIniEnabled: true,
      enableSpeedBlur: true,
    })).toBe(true);
    expect(resolveSpeedBlurPass({
      frameBufferIniEnabled: false,
      enableSpeedBlur: true,
    })).toBe(false);
    expect(resolveSpeedBlurPass({
      frameBufferIniEnabled: true,
      enableSpeedBlur: false,
    })).toBe(false);
  });

  test('Force Speed progFX 1601/1602 are motion-blur enable ids', () => {
    expect(isMotionBlurProgFX(0x641)).toBe(true);
    expect(isMotionBlurProgFX(0x642)).toBe(true);
    expect(isMotionBlurProgFX(0x63f)).toBe(false);
    expect(isMotionBlurProgFX(0x6a4)).toBe(false);
    expect(MOTION_BLUR_PROGFX_ENABLE.has(0x641)).toBe(true);
    expect(MOTION_BLUR_PROGFX_ENABLE.has(0x642)).toBe(true);
    expect(MOTION_BLUR_PROGFX_ENABLE.has(0x640)).toBe(false);
  });

  test('SpeedBlur bit is 0x10 in the dispatcher mask', () => {
    expect(FrameBufferModBit.SpeedBlur).toBe(0x10);
    expect(0x1f & FrameBufferModBit.SpeedBlur).toBeTruthy();
  });

});
