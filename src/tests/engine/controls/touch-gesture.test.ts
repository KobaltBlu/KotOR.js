/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  exceedsDragThreshold,
  isTap,
  leashOrigin,
  stickAxis,
  stickDeadzone,
  stickRangeUnits,
  takeSmoothedDelta,
  TOUCH_DRAG_THRESHOLD_DP,
  TOUCH_TAP_SLOP_DP,
} from '@engine/controls/touch-gesture';

describe('touch stick tuning', () => {
  it('range and dead zone shrink as sensitivity rises', () => {
    expect(stickRangeUnits(0)).toBe(150);
    expect(stickRangeUnits(1)).toBe(40);
    expect(stickRangeUnits(0.5)).toBe(95);
    expect(stickDeadzone(0)).toBeCloseTo(0.3);
    expect(stickDeadzone(1)).toBeCloseTo(0);
    expect(stickDeadzone(0.5)).toBeCloseTo(0.15);
  });

  it('clamps sensitivity outside 0..1', () => {
    expect(stickRangeUnits(-1)).toBe(150);
    expect(stickRangeUnits(5)).toBe(40);
  });
});

describe('stickAxis', () => {
  it('reads zero inside the dead zone', () => {
    expect(stickAxis(0, 100, 0.2)).toBe(0);
    expect(stickAxis(20, 100, 0.2)).toBe(0);
    expect(stickAxis(-19, 100, 0.2)).toBe(0);
  });

  it('rescales past the dead zone so full range reads ±1', () => {
    expect(stickAxis(100, 100, 0.2)).toBeCloseTo(1);
    expect(stickAxis(-100, 100, 0.2)).toBeCloseTo(-1);
    expect(stickAxis(60, 100, 0.2)).toBeCloseTo(0.5);
  });

  it('clamps beyond the range', () => {
    expect(stickAxis(400, 100, 0.2)).toBe(1);
    expect(stickAxis(-400, 100, 0)).toBe(-1);
  });

  it('ignores bad input', () => {
    expect(stickAxis(50, 0, 0.2)).toBe(0);
    expect(stickAxis(NaN, 100, 0.2)).toBe(0);
  });
});

describe('leashOrigin', () => {
  it('keeps the origin while the finger is within range', () => {
    expect(leashOrigin(200, 260, 100)).toBe(200);
    expect(leashOrigin(200, 100, 100)).toBe(200);
  });

  it('drags the origin one range behind the finger', () => {
    expect(leashOrigin(200, 350, 100)).toBe(250);
    expect(leashOrigin(200, 20, 100)).toBe(120);
  });
});

describe('tap and drag thresholds', () => {
  it('counts short travel as a tap', () => {
    expect(isTap(0)).toBe(true);
    expect(isTap(TOUCH_TAP_SLOP_DP - 0.5)).toBe(true);
    expect(isTap(TOUCH_TAP_SLOP_DP)).toBe(false);
  });

  it('starts a drag past the drag threshold', () => {
    expect(exceedsDragThreshold(TOUCH_DRAG_THRESHOLD_DP, 0)).toBe(false);
    expect(exceedsDragThreshold(15, 15)).toBe(true);
    expect(exceedsDragThreshold(0, -21)).toBe(true);
  });
});

describe('takeSmoothedDelta', () => {
  it('releases an eighth per frame, rounded up', () => {
    expect(takeSmoothedDelta(80)).toEqual({ step: 10, rest: 70 });
    expect(takeSmoothedDelta(-17)).toEqual({ step: -3, rest: -14 });
    expect(takeSmoothedDelta(0)).toEqual({ step: 0, rest: 0 });
  });

  it('drains fully and never overshoots', () => {
    let acc = 37;
    let total = 0;
    for(let i = 0; i < 100 && acc; i++){
      const { step, rest } = takeSmoothedDelta(acc);
      total += step;
      acc = rest;
    }
    expect(acc).toBe(0);
    expect(total).toBe(37);
    expect(takeSmoothedDelta(0.4)).toEqual({ step: 0.4, rest: 0 });
  });
});
