/**
 * FadeOverlayManager holdForScript / fade gate parity + wall-clock timing.
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

describe('FadeOverlayManager wall-clock timing', () => {
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

  test('huge Update delta cannot skip fade when wall clock has not advanced', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);

    // Load hitch previously inflated THREE.Clock getDelta; wall clock is unchanged.
    FadeOverlayManager.Update(2.0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(FadeOverlayManager.ELAPSED_SEED, 5);
  });

  test('fade-in holds opaque through wait then ramps to clear', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);

    // Still in wait (seed 0.1 + 0.3s = 0.4 < 0.5)
    FadeOverlayManager._testNowMs = 1000 + 300;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);

    // Mid ramp: elapsed ≈ 0.1 + 1.0 = 1.1 → t = (1.1 - 0.5) / 1.0 = 0.6 → α = 0.4
    FadeOverlayManager._testNowMs = 1000 + 1000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBeCloseTo(0.4, 5);

    // Past wait + length → FADED_IN
    FadeOverlayManager._testNowMs = 1000 + 2000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADED_IN);
    expect(FadeOverlayManager.material.opacity).toBe(0);
    expect(FadeOverlayManager.material.visible).toBe(false);
  });

  test('hitch gap ≥5s does not advance elapsed', () => {
    FadeOverlayManager.FadeIn(1.0, 0, 0, 0, 0.5);
    const elapsedAtStart = FadeOverlayManager.elapsed;

    FadeOverlayManager._testNowMs = 1000 + 6000;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(elapsedAtStart, 5);
    expect(FadeOverlayManager.state).toBe(FadeOverlayState.FADING_IN);
    expect(FadeOverlayManager.material.opacity).toBe(1);

    // After hitch, normal advance resumes from frozen elapsed
    FadeOverlayManager._testNowMs = 1000 + 6000 + 400;
    FadeOverlayManager.Update(0);
    expect(FadeOverlayManager.elapsed).toBeCloseTo(elapsedAtStart + 0.4, 5);
    expect(FadeOverlayManager.material.opacity).toBe(1);
  });
});
