import {
  isHideEquippedItemsAnimation,
} from "@engine/module/animation/animation2daFlag";
import { SWAnimation } from "@engine/rules/SWAnimation";

/**
 * Mirrors ModuleCreature hide/show for animations.2da hideequippeditems
 * without pulling the full creature graph into the test env.
 */
function applyHideEquippedSideEffect(
  next: SWAnimation | undefined,
  state: { active: boolean; dialogStash: boolean }
): { hide: boolean; show: boolean } {
  const hideNext = isHideEquippedItemsAnimation(next);
  let hide = false;
  let show = false;
  if(hideNext){
    if(!state.active){
      state.active = true;
      hide = true;
    }
  }else if(state.active && !state.dialogStash){
    state.active = false;
    show = true;
  }
  return { hide, show };
}

describe("hideequippeditems animation path", () => {
  it("hides on flagged clip then restores on non-flagged", () => {
    const state = { active: false, dialogStash: false };
    const inject = new SWAnimation();
    inject.hideequippeditems = true;
    const pause = new SWAnimation();
    pause.hideequippeditems = false;

    expect(applyHideEquippedSideEffect(inject, state)).toEqual({ hide: true, show: false });
    expect(state.active).toBe(true);
    expect(applyHideEquippedSideEffect(inject, state)).toEqual({ hide: false, show: false });
    expect(applyHideEquippedSideEffect(pause, state)).toEqual({ hide: false, show: true });
    expect(state.active).toBe(false);
  });

  it("does not restore while dialog stash is active", () => {
    const state = { active: true, dialogStash: true };
    const pause = new SWAnimation();
    pause.hideequippeditems = false;
    expect(applyHideEquippedSideEffect(pause, state)).toEqual({ hide: false, show: false });
    expect(state.active).toBe(true);
  });
});
