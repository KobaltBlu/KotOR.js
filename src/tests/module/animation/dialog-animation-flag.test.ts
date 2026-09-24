import { isAnimation2DAFlagSet, isDialogAnimation } from "@/module/animation/animation2daFlag";
import { SWAnimation } from "@/engine/rules/SWAnimation";

/**
 * Mirrors CutsceneManager.isDialogAnimationPlaying boolean parsing for
 * animations.2da rows stored as SWAnimation booleans.
 */
function isDialogClipPlayingFromState(anim: SWAnimation | undefined): boolean {
  if(!anim || !isDialogAnimation(anim)) return false;
  if(isAnimation2DAFlagSet(anim.fireforget)) return true;
  if(isAnimation2DAFlagSet(anim.looping)) return false;
  return false;
}

describe("dialog animation flag boolean parse", () => {
  it("accepts SWAnimation boolean dialog+fireforget without parseInt", () => {
    const anim = new SWAnimation();
    anim.dialog = true;
    anim.fireforget = true;
    anim.looping = false;
    // Legacy parseInt(String(true)) === NaN — must not be used.
    expect(!!parseInt(String(anim.dialog))).toBe(false);
    expect(isDialogClipPlayingFromState(anim)).toBe(true);
  });

  it("looping dialog does not block after start (WAIT_ANIM policy)", () => {
    const anim = new SWAnimation();
    anim.dialog = true;
    anim.looping = true;
    anim.fireforget = false;
    expect(isDialogClipPlayingFromState(anim)).toBe(false);
  });
});
