/**
 * Update-loop scheduler: V-Sync default, workMs yield, single live callback.
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  MESSAGE_CHANNEL_YIELD_MS,
  UpdateLoopArm,
  isVSyncEnabledRaw,
  runUpdateTick,
  uncappedYieldMs,
} from '@/engine/updateLoopSchedule';

function polyfillAnimationFrame(): void {
  if(typeof globalThis.requestAnimationFrame === 'function') return;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    clearTimeout(id);
  }) as typeof cancelAnimationFrame;
}

describe('updateLoopSchedule', () => {
  describe('isVSyncEnabledRaw', () => {
    it('defaults true when config is missing', () => {
      expect(isVSyncEnabledRaw(undefined, false)).toBe(true);
    });

    it('defaults true when V-Sync key is missing or empty', () => {
      expect(isVSyncEnabledRaw(undefined, true)).toBe(true);
      expect(isVSyncEnabledRaw(null, true)).toBe(true);
      expect(isVSyncEnabledRaw('', true)).toBe(true);
    });

    it('is true for "1" and false for "0"', () => {
      expect(isVSyncEnabledRaw('1', true)).toBe(true);
      expect(isVSyncEnabledRaw('0', true)).toBe(false);
    });
  });

  describe('uncappedYieldMs', () => {
    it('follows ceil(workMs/8) clamped to 1–8', () => {
      expect(uncappedYieldMs(0)).toBe(1);
      expect(uncappedYieldMs(8)).toBe(1);
      expect(uncappedYieldMs(9)).toBe(2);
      expect(uncappedYieldMs(16)).toBe(2);
      expect(uncappedYieldMs(17)).toBe(3);
      expect(uncappedYieldMs(32)).toBe(4);
      expect(uncappedYieldMs(64)).toBe(8);
      expect(uncappedYieldMs(10_000)).toBe(8);
    });
  });

  describe('UpdateLoopArm', () => {
    let arm: UpdateLoopArm;
    let onTick: jest.Mock;

    beforeEach(() => {
      polyfillAnimationFrame();
      jest.useFakeTimers();
      arm = new UpdateLoopArm();
      onTick = jest.fn();
    });

    afterEach(() => {
      arm.clear();
      jest.useRealTimers();
    });

    it('arms exactly one RAF when V-Sync is on', () => {
      arm.schedule(true, 12, onTick);
      expect(arm.rafId).toBeTruthy();
      expect(arm.timeoutId).toBe(0);
      expect(arm.armedCount).toBe(1);

      arm.schedule(true, 12, onTick);
      expect(arm.armedCount).toBe(1);
    });

    it('arms MessageChannel for short uncapped yields (avoids 4ms timer clamp)', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      arm.schedule(false, 17, onTick);
      expect(arm.channelPending).toBe(true);
      expect(arm.timeoutId).toBe(0);
      expect(arm.rafId).toBe(0);
      expect(arm.armedCount).toBe(1);
      expect(uncappedYieldMs(17)).toBeLessThanOrEqual(MESSAGE_CHANNEL_YIELD_MS);
      // Short yields must not arm setTimeout (browser clamps nested timers to ~4ms).
      const yieldCalls = setTimeoutSpy.mock.calls.filter(
        (c) => typeof c[1] === 'number' && (c[1] as number) <= MESSAGE_CHANNEL_YIELD_MS
      );
      expect(yieldCalls).toHaveLength(0);
      setTimeoutSpy.mockRestore();
    });

    it('arms adaptive timeout when uncapped yield exceeds MessageChannel threshold', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      // ceil(40/8)=5 > MESSAGE_CHANNEL_YIELD_MS
      arm.schedule(false, 40, onTick);
      expect(arm.timeoutId).toBeTruthy();
      expect(arm.channelPending).toBe(false);
      expect(arm.rafId).toBe(0);
      expect(arm.armedCount).toBe(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5);
      setTimeoutSpy.mockRestore();
    });

    it('ignores stale generation callbacks', () => {
      arm.schedule(true, 0, onTick);
      arm.generation++;
      jest.runOnlyPendingTimers();
      expect(onTick).not.toHaveBeenCalled();
    });

    it('leaves at most one armed handle after applyOption + re-schedule', () => {
      arm.schedule(true, 0, onTick);
      expect(arm.armedCount).toBe(1);

      arm.applyOption(false, onTick);
      expect(arm.armedCount).toBe(1);
      expect(arm.channelPending).toBe(true);
      expect(arm.timeoutId).toBe(0);
      expect(arm.rafId).toBe(0);

      // Mid-Update pattern: apply then finally schedule (short yield → channel).
      arm.schedule(false, 9, onTick);
      expect(arm.armedCount).toBe(1);
      expect(arm.channelPending).toBe(true);
      expect(arm.timeoutId).toBe(0);
    });

    it('does not let a pre-toggle callback invoke onTick', () => {
      arm.schedule(true, 0, onTick);
      const genBefore = arm.generation;
      arm.applyOption(true, onTick);
      expect(arm.generation).toBe(genBefore + 1);
      jest.runOnlyPendingTimers();
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('clear invalidates a pending MessageChannel tick', async () => {
      arm.schedule(false, 1, onTick);
      expect(arm.channelPending).toBe(true);
      arm.clear();
      expect(arm.channelPending).toBe(false);
      expect(arm.armedCount).toBe(0);
      // Flush any posted message; token bump must prevent onTick.
      await new Promise<void>((resolve) => {
        const ch = new MessageChannel();
        ch.port1.onmessage = () => resolve();
        ch.port2.postMessage(null);
      });
      expect(onTick).not.toHaveBeenCalled();
    });
  });

  describe('runUpdateTick', () => {
    it('schedules only after body work completes', () => {
      const order: string[] = [];
      runUpdateTick(
        () => { order.push('work'); },
        (workMs) => {
          order.push('schedule');
          expect(typeof workMs).toBe('number');
        },
      );
      expect(order).toEqual(['work', 'schedule']);
    });

    it('still schedules after an early return in the body', () => {
      const schedule = jest.fn();
      runUpdateTick(() => {
        return;
      }, schedule);
      expect(schedule).toHaveBeenCalledTimes(1);
      expect(schedule).toHaveBeenCalledWith(expect.any(Number));
    });

    it('applyOption mid-tick still ends with a finally schedule', () => {
      const arm = new UpdateLoopArm();
      const onTick = jest.fn();
      const scheduleCalls: number[] = [];

      polyfillAnimationFrame();
      jest.useFakeTimers();
      try {
        runUpdateTick(
          () => {
            arm.applyOption(true, onTick);
          },
          (workMs) => {
            scheduleCalls.push(workMs);
            arm.schedule(true, workMs, onTick);
          },
        );
        expect(scheduleCalls).toHaveLength(1);
        expect(arm.armedCount).toBe(1);
      } finally {
        arm.clear();
        jest.useRealTimers();
      }
    });
  });
});
