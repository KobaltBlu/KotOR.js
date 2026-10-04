/**
 * Post-load reveal fade + HoldWorldFadeInForDialog retail policy.
 * @jest-environment node
 */
import { describe, expect, test } from '@jest/globals';
import { EngineMode } from '@engine/enums/engine';
import { planPostLoadRevealFade } from '@engine/runtime/post-load-reveal-fade';

describe('planPostLoadRevealFade', () => {
  test('active dialog without pre-set hold forces hold and skips world FadeIn', () => {
    // Retail: dialogState != 0 → force hold, skip wait=0.5/length=1.0 world fade.
    // Entry send is gated until after reveal so HOLD release can run.
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: false,
      cutsceneActive: true,
      mode: EngineMode.INGAME,
    });
    expect(plan.forceHold).toBe(true);
    expect(plan.startWorldFadeIn).toBe(false);
    expect(plan.assertDialogMode).toBe(true);
  });

  test('pre-set hold skips world FadeIn', () => {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: true,
      cutsceneActive: false,
      mode: EngineMode.INGAME,
    });
    expect(plan.forceHold).toBe(true);
    expect(plan.startWorldFadeIn).toBe(false);
    expect(plan.assertDialogMode).toBe(false);
  });

  test('pre-set hold with active cutscene skips world FadeIn; asserts DIALOG if needed', () => {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: true,
      cutsceneActive: true,
      mode: EngineMode.INGAME,
    });
    expect(plan.forceHold).toBe(true);
    expect(plan.startWorldFadeIn).toBe(false);
    expect(plan.assertDialogMode).toBe(true);
  });

  test('already in DIALOG does not re-assert mode but still forces hold when active', () => {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: false,
      cutsceneActive: true,
      mode: EngineMode.DIALOG,
    });
    expect(plan.forceHold).toBe(true);
    expect(plan.startWorldFadeIn).toBe(false);
    expect(plan.assertDialogMode).toBe(false);
  });

  test('no hold and no cutscene starts world FadeIn', () => {
    const plan = planPostLoadRevealFade({
      holdWorldFadeInForDialog: false,
      cutsceneActive: false,
      mode: EngineMode.INGAME,
    });
    expect(plan.forceHold).toBe(false);
    expect(plan.startWorldFadeIn).toBe(true);
    expect(plan.assertDialogMode).toBe(false);
  });
});
