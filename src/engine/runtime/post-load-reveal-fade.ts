import { EngineMode } from "@engine/enums/engine";

export interface PostLoadRevealFadeInput {
  holdWorldFadeInForDialog: boolean;
  cutsceneActive: boolean;
  mode: EngineMode;
}

export interface PostLoadRevealFadePlan {
  /** Start WORLD_FADE_IN_* when neither hold nor active dialog. */
  startWorldFadeIn: boolean;
  /** Re-assert DIALOG so dialog updates / hold release can run. */
  assertDialogMode: boolean;
  /**
   * Force holdWorldFadeInForDialog true when hold was already set or dialog
   * is already active (post-load MainLoop policy).
   */
  forceHold: boolean;
}

/**
 * Post-load reveal fade decision (MainLoop after load UI hide).
 *
 * If hold is already set (HoldWorldFadeInForDialog / party-leader switch) or
 * dialog state is non-idle, force hold and skip the normal wait=0.5 / length=1.0
 * world fade-in. Dialog entry send is gated until after this decision so the
 * first entry can release hold with HOLD_WORLD_FADE_IN_* (wait=0, length=1.0).
 */
export function planPostLoadRevealFade(input: PostLoadRevealFadeInput): PostLoadRevealFadePlan {
  const forceHold = input.holdWorldFadeInForDialog || input.cutsceneActive;
  return {
    startWorldFadeIn: !forceHold,
    assertDialogMode: input.cutsceneActive && input.mode !== EngineMode.DIALOG,
    forceHold,
  };
}
