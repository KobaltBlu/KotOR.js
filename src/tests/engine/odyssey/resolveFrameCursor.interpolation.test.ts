/**
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { OdysseyModelAnimationManager } from '@engine/odyssey/OdysseyModelAnimationManager';

describe('computeInterpolationFactor', () => {
  const mgr = Object.create(OdysseyModelAnimationManager.prototype) as OdysseyModelAnimationManager;

  test('clamps between keyed frames without abs/modulo', () => {
    const controller: any = {
      data: [
        { time: 0 },
        { time: 1 },
        { time: 2 },
      ],
    };
    const state: any = { elapsed: 0.5 };
    const r = (mgr as any).computeInterpolationFactor(
      state,
      controller.data[0],
      controller.data[1],
      0,
      controller
    );
    expect(r.fl).toBeCloseTo(0.5);
  });

  test('identical timestamps yield fl 0', () => {
    const controller: any = {
      data: [{ time: 1 }, { time: 1 }],
    };
    const state: any = { elapsed: 1 };
    const r = (mgr as any).computeInterpolationFactor(
      state,
      controller.data[0],
      controller.data[1],
      0,
      controller
    );
    expect(r.fl).toBe(0);
  });

  test('missing next clamps to end', () => {
    const controller: any = {
      data: [{ time: 0 }, { time: 1 }],
    };
    const state: any = { elapsed: 1 };
    const r = (mgr as any).computeInterpolationFactor(
      state,
      controller.data[1],
      undefined,
      1,
      controller
    );
    expect(r.fl).toBe(1);
  });
});
