/**
 * FadeOverlayManager holdForScript / fade gate parity + Draw timing.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    scene_gui: { add: jest.fn() },
  },
}));

import { FadeOverlayManager } from '@/managers/FadeOverlayManager';
import { FadeOverlayState } from '@/enums/engine/FadeOverlayState';

describe('FadeOverlayManager.holdForScript', () => {
  beforeEach(() => {
    FadeOverlayManager.Reset();
    FadeOverlayManager._testNowMs = undefined;
  });

  afterEach(() => {
    FadeOverlayManager._testNowMs = undefined;
  });

  test('FadeOut is a no-op while holdForScript is set', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.FadeOut(1, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.NONE);
  });

  test('FadeIn is a no-op while holdForScript is set', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.FadeIn(1, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.NONE);
  });

  test('Reset clears holdForScript', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.Reset();
    expect(FadeOverlayManager.holdForScript).toBe(false);
  });

  test('FadeIn proceeds after hold is cleared', () => {
    FadeOverlayManager.holdForScript = true;
    FadeOverlayManager.holdForScript = false;
    FadeOverlayManager.FadeIn(0, 0, 0, 0, 0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADED_IN);
  });

  test('party dialog switch fade-out length matches engine 0.75s', () => {
    expect(FadeOverlayManager.PARTY_DIALOG_SWITCH_FADE_OUT_LENGTH).toBe(0.75);
  });
});

describe('FadeOverlayManager Draw timing', () => {
  beforeEach(() => {
    FadeOverlayManager.Reset();
    FadeOverlayManager._testNowMs = 1000;
  });

  afterEach(() => {
    FadeOverlayManager._testNowMs = undefined;
  });

  test('world fade-in constants match post-load reveal (wait 0.5, length 1.0)', () => {
    expect(FadeOverlayManager.WORLD_FADE_IN_WAIT).toBe(0.5);
    expect(FadeOverlayManager.WORLD_FADE_IN_LENGTH).toBe(1.0);
  });

  test('first Update arms clock and ignores async gap before first frame', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);
    expect(FadeOverlayManager.lastFadeTickMs).toBe(0);

    // Async LoadModule → first INGAME Update gap (must not skip wait+ramp).
    FadeOverlayManager._testNowMs = 1000 + 2000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(FadeOverlayManager.ELAPSED_SEED, 5);
    expect(FadeOverlayManager.lastFadeTickMs).toBe(3000);
  });

  test('fade-in accumulates ticks through wait then ramps to clear', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);

    // Arm
    FadeOverlayManager._testNowMs = 1000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(0.1, 5);

    // Still in wait: 0.1 + 0.3 = 0.4 < 0.5
    FadeOverlayManager._testNowMs = 1000 + 300;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(0.4, 5);

    // Mid ramp: 0.4 + 0.7 = 1.1 → t = (1.1 - 0.5) / 1.0 = 0.6 → α = 0.4
    FadeOverlayManager._testNowMs = 1000 + 300 + 700;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBeCloseTo(0.4, 5);

    // Past wait + length
    FadeOverlayManager._testNowMs = 1000 + 300 + 700 + 1000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADED_IN);
    expect(FadeOverlayManager.material.opacity).toBe(0);
    expect(FadeOverlayManager.material.visible).toBe(false);
  });

  test('hitch gap ≥5s does not advance elapsed', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);
    FadeOverlayManager._testNowMs = 1000;
    FadeOverlayManager.Update(0);
    const elapsedArmed = FadeOverlayManager.elapsed;

    FadeOverlayManager._testNowMs = 1000 + 6000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(elapsedArmed, 5);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);

    FadeOverlayManager._testNowMs = 1000 + 6000 + 400;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(elapsedArmed + 0.4, 5);
    expect(FadeOverlayManager.material.opacity).toBe(1);
  });
});
