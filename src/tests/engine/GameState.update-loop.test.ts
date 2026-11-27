/**
 * Update-loop scheduler: V-Sync default, workMs yield, single live callback.
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  BACKOFF_BASE_RATIO,
  BACKOFF_MAX_RATIO,
  GpuFrameFence,
  MAX_BACKOFF_YIELD_MS,
  backoffYieldMs,
  IDLE_WORK_MS,
  INPUT_BREATH_INTERVAL_MS,
  MESSAGE_CHANNEL_YIELD_MS,
  PRESENT_MARGIN_MS,
  UpdateLoopArm,
  isVSyncEnabledRaw,
  runUpdateTick,
  uncappedYieldMs,
} from '@engine/runtime/updateLoopSchedule';

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
      arm.stopHeartbeat();
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

    it('arms MessageChannel for busy short uncapped yields (avoids 4ms timer clamp)', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      // workMs=17 → yield 3, and workMs >= IDLE_WORK_MS → MessageChannel.
      arm.schedule(false, 17, onTick);
      expect(arm.channelPending).toBe(true);
      expect(arm.timeoutId).toBe(0);
      expect(arm.rafId).toBe(0);
      expect(arm.armedCount).toBe(1);
      expect(uncappedYieldMs(17)).toBeLessThanOrEqual(MESSAGE_CHANNEL_YIELD_MS);
      expect(17).toBeGreaterThanOrEqual(IDLE_WORK_MS);
      const yieldCalls = setTimeoutSpy.mock.calls.filter(
        (c) => typeof c[1] === 'number' && (c[1] as number) <= MESSAGE_CHANNEL_YIELD_MS
      );
      expect(yieldCalls).toHaveLength(0);
      setTimeoutSpy.mockRestore();
    });

    it('arms setTimeout(0) on every idle short uncapped yield (input breath)', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      arm.schedule(false, 0, onTick);
      expect(arm.timeoutId).toBeTruthy();
      expect(arm.channelPending).toBe(false);
      expect(arm.rafId).toBe(0);
      expect(arm.armedCount).toBe(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 0);

      arm.schedule(false, IDLE_WORK_MS - 0.1, onTick);
      expect(arm.timeoutId).toBeTruthy();
      expect(arm.channelPending).toBe(false);
      setTimeoutSpy.mockRestore();
    });

    it('forces a setTimeout breath on busy short yields after the input interval', () => {
      const nowSpy = jest.spyOn(performance, 'now');
      let t = 1000;
      nowSpy.mockImplementation(() => t);

      arm.schedule(false, 17, onTick);
      expect(arm.channelPending).toBe(true);

      t = 1000 + INPUT_BREATH_INTERVAL_MS;
      arm.schedule(false, 17, onTick);
      expect(arm.timeoutId).toBeTruthy();
      expect(arm.channelPending).toBe(false);

      nowSpy.mockRestore();
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
      // workMs=0 → idle → setTimeout(0)
      expect(arm.timeoutId).toBeTruthy();
      expect(arm.channelPending).toBe(false);
      expect(arm.rafId).toBe(0);

      // Mid-Update pattern: apply then finally schedule (busy short → channel).
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

    it('starts a RAF heartbeat only while uncapped', () => {
      arm.schedule(false, 17, onTick);
      expect(arm.heartbeatRunning).toBe(true);
      arm.schedule(true, 17, onTick);
      expect(arm.heartbeatRunning).toBe(false);
    });

    it('rides the next RAF and doubles back-off when rendering is starved', () => {
      const nowSpy = jest.spyOn(performance, 'now');
      let t = 1000;
      nowSpy.mockImplementation(() => t);

      arm.schedule(false, 17, onTick);
      expect(arm.channelPending).toBe(true);
      expect(arm.backoffRatio).toBe(BACKOFF_BASE_RATIO);

      // No heartbeat for well past two display frames.
      t = 1000 + arm.renderStarvedThresholdMs() + 1;
      arm.schedule(false, 17, onTick);
      expect(arm.rafId).toBeTruthy();
      expect(arm.armedCount).toBe(1);
      expect(arm.backoffRatio).toBe(BACKOFF_BASE_RATIO * 2);

      nowSpy.mockRestore();
    });

    it('decays back-off toward base on healthy rendering opportunities', () => {
      arm.schedule(false, 17, onTick);
      arm.backoffRatio = BACKOFF_MAX_RATIO;
      jest.advanceTimersByTime(16 * 200);
      expect(arm.backoffRatio).toBeLessThan(BACKOFF_MAX_RATIO);
      expect(arm.backoffRatio).toBeGreaterThanOrEqual(BACKOFF_BASE_RATIO);
    });

    it('sizes the adaptive gap from back-off ratio and smoothed work', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      arm.schedule(false, 17, onTick);
      arm.backoffRatio = 0.5;
      // max(17, ewma≈17) * 0.5 → 9ms
      arm.schedule(false, 17, onTick);
      expect(arm.timeoutId).toBeTruthy();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 9);
      expect(backoffYieldMs(1000, 1)).toBe(MAX_BACKOFF_YIELD_MS);
      setTimeoutSpy.mockRestore();
    });

    it('defers the tick while the GPU fence reports frames in flight', () => {
      let ready = false;
      arm.gpuFence = { isReady: () => ready, reset: () => {} } as unknown as GpuFrameFence;
      arm.schedule(false, 0, onTick);
      jest.advanceTimersByTime(5);
      expect(onTick).not.toHaveBeenCalled();
      expect(arm.armedCount).toBe(1);
      ready = true;
      jest.advanceTimersByTime(5);
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    describe('shouldPresentFrame', () => {
      let nowSpy: ReturnType<typeof jest.spyOn>;
      let t = 0;
      beforeEach(() => {
        t = 1000;
        nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => t);
      });
      afterEach(() => nowSpy.mockRestore());

      it('always draws with V-Sync on or before the heartbeat runs', () => {
        expect(arm.shouldPresentFrame(true, t)).toBe(true);
        expect(arm.shouldPresentFrame(false, t)).toBe(true);
      });

      it('draws once per refresh, on the last tick that fits before it', () => {
        arm.schedule(false, 4, onTick); // heartbeat starts, lastRenderAt = 1000
        arm.frameIntervalMs = 16;
        // next refresh at 1016; draw tick ≈ 4ms + 2ms margin → window opens at 1010
        expect(arm.shouldPresentFrame(false, 1002)).toBe(false);
        expect(arm.shouldPresentFrame(false, 1006)).toBe(false);
        expect(arm.shouldPresentFrame(false, 1011)).toBe(true);
        // Same refresh: no second draw.
        expect(arm.shouldPresentFrame(false, 1014)).toBe(false);
      });

      it('draws immediately after a refresh with no draw', () => {
        arm.schedule(false, 4, onTick);
        arm.frameIntervalMs = 16;
        expect(arm.shouldPresentFrame(false, 1011)).toBe(true);
        // Two refreshes pass without a tick landing in the window.
        arm.renderSeq = 2;
        expect(arm.shouldPresentFrame(false, 1001)).toBe(true);
      });

      it('widens the window by the tick spacing so a tick always lands in it', () => {
        arm.schedule(false, 2, onTick); // lastRenderAt = 1000, work ≈ 2
        arm.frameIntervalMs = 16;
        arm.tickSpacingEwmaMs = 7;
        // next refresh 1016, draw ≈ 2 + 2 margin: a tick at 1006 is the last
        // whose successor (≈1013) could not finish (1013 + 4 > 1016).
        expect(arm.shouldPresentFrame(false, 1004)).toBe(false);
        expect(arm.shouldPresentFrame(false, 1006)).toBe(true);
      });

      it('grows the margin after a missed refresh and decays it after on-time draws', () => {
        arm.schedule(false, 2, onTick);
        arm.frameIntervalMs = 16;
        expect(arm.shouldPresentFrame(false, 1013)).toBe(true); // seq 0, on time
        expect(arm.presentMarginMs).toBe(PRESENT_MARGIN_MS);
        arm.renderSeq = 2; // refresh 1 went out with no draw
        expect(arm.shouldPresentFrame(false, 1001)).toBe(true);
        const grown = arm.presentMarginMs;
        expect(grown).toBeGreaterThan(PRESENT_MARGIN_MS);
        arm.renderSeq = 3;
        expect(arm.shouldPresentFrame(false, 1013)).toBe(true);
        expect(arm.presentMarginMs).toBeLessThan(grown);
      });

      it('learns tick spacing from successive measured schedules', () => {
        arm.schedule(false, 2, onTick);
        t = 1006;
        arm.schedule(false, 2, onTick);
        expect(arm.tickSpacingEwmaMs).toBeGreaterThan(0);
        // A long gap (pause / hidden tab) does not count as cadence.
        const before = arm.tickSpacingEwmaMs;
        t = 5000;
        arm.schedule(false, 2, onTick);
        expect(arm.tickSpacingEwmaMs).toBe(before);
      });

      it('draws every refresh when a tick is longer than the refresh interval', () => {
        arm.schedule(false, 30, onTick);
        arm.frameIntervalMs = 16;
        for(let seq = 0; seq < 4; seq++){
          arm.renderSeq = seq;
          expect(arm.shouldPresentFrame(false, 1000)).toBe(true);
        }
      });
    });

    it('clear invalidates a pending MessageChannel tick', async () => {
      arm.schedule(false, 17, onTick);
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
