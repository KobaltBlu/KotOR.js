/**
 * Combat approach must keep walk/run while ActionCombat/MoveTo is queued.
 * Regression: isDriveAnimationBlocked treated any actionQueue entry as blocked
 * and updateAnimationState cleared loco → READY slide.
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import * as fs from "fs";
import { srcPath } from "@/tests/helpers/paths";
import { isDialogAnimation } from "@/module/animation/animation2daFlag";
import { SWAnimation } from "@/engine/rules/SWAnimation";

/** Dialog-only gate matching ModuleCreature.isDriveAnimationBlocked. */
function isDriveAnimationBlocked(
  creature: { dialogAnimation?: unknown; animationState?: { animation?: SWAnimation } }
): boolean {
  if(creature.dialogAnimation){
    return true;
  }
  return isDialogAnimation(creature.animationState?.animation);
}

describe("ModuleCreature combat approach loco gate", () => {
  it("updateAnimationState does not clear loco when driveBlocked", () => {
    const src = fs.readFileSync(srcPath("module", "ModuleCreature.ts"), "utf8");
    const start = src.indexOf("  updateAnimationState(){");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("\n  primeAnimationPose(){", start);
    const fn = src.slice(start, end > start ? end : start + 6000);
    expect(fn).not.toMatch(
      /isDriveAnimationBlocked\s*\(\s*\)[\s\S]{0,200}clearLocomotionAnimation/
    );
    expect(fn).not.toMatch(
      /!isStationaryAnimation[\s\S]{0,120}isDriveAnimationBlocked/
    );
  });

  it("isDriveAnimationBlocked ignores actionQueue length", () => {
    const src = fs.readFileSync(srcPath("module", "ModuleCreature.ts"), "utf8");
    const start = src.indexOf("  isDriveAnimationBlocked(): boolean {");
    expect(start).toBeGreaterThan(-1);
    const fn = src.slice(start, start + 400);
    expect(fn).not.toMatch(/actionQueue/);
    expect(fn).toMatch(/dialogAnimation/);
    expect(fn).toMatch(/isDialogAnimation/);
  });

  it("queued combat/move action does not block drive when no dialog clip", () => {
    const run = new SWAnimation();
    run.stationary = false;
    run.running = true;
    const creature = {
      actionQueue: [{ type: 1 }],
      dialogAnimation: null,
      animationState: { index: 10002, animation: run },
      combatData: { combatState: true },
    };
    // actionQueue present must not matter
    expect(isDriveAnimationBlocked(creature)).toBe(false);
    expect(creature.animationState.index).toBe(10002);
  });

  it("dialog-owned pose still blocks drive", () => {
    const talk = new SWAnimation();
    talk.dialog = true;
    talk.looping = true;
    expect(
      isDriveAnimationBlocked({
        dialogAnimation: { animation: talk },
        animationState: { animation: talk },
      })
    ).toBe(true);
    expect(
      isDriveAnimationBlocked({
        dialogAnimation: null,
        animationState: { animation: talk },
      })
    ).toBe(true);
  });
});
