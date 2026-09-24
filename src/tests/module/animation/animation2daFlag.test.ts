import {
  isAnimation2DAFlagSet,
  isStationaryAnimation,
  isPauseAnimation,
  isWalkingAnimation,
  isRunningAnimation,
  isHideEquippedItemsAnimation,
  isAttackAnimation,
  isParryAnimation,
  isDialogAnimation,
  isPlayOutOfPlaceServerId,
} from "@/module/animation/animation2daFlag";
import { SWAnimation } from "@/engine/rules/SWAnimation";

function row(partial: Partial<SWAnimation>): SWAnimation {
  const anim = new SWAnimation();
  Object.assign(anim, partial);
  return anim;
}

describe("animation2daFlag predicates", () => {
  it("isAnimation2DAFlagSet accepts boolean/number/string shapes", () => {
    expect(isAnimation2DAFlagSet(true)).toBe(true);
    expect(isAnimation2DAFlagSet(1)).toBe(true);
    expect(isAnimation2DAFlagSet("1")).toBe(true);
    expect(isAnimation2DAFlagSet(false)).toBe(false);
    expect(isAnimation2DAFlagSet(0)).toBe(false);
    expect(isAnimation2DAFlagSet("0")).toBe(false);
    expect(isAnimation2DAFlagSet(undefined)).toBe(false);
  });

  it("isStationaryAnimation defaults true when row is missing", () => {
    expect(isStationaryAnimation(undefined)).toBe(true);
    expect(isStationaryAnimation(null)).toBe(true);
    expect(isStationaryAnimation(row({ stationary: false }))).toBe(false);
    expect(isStationaryAnimation(row({ stationary: true }))).toBe(true);
  });

  it("classifies pause / walking / running / hide / attack / parry", () => {
    expect(isPauseAnimation(row({ pause: true }))).toBe(true);
    expect(isWalkingAnimation(row({ walking: true }))).toBe(true);
    expect(isRunningAnimation(row({ running: true }))).toBe(true);
    expect(isHideEquippedItemsAnimation(row({ hideequippeditems: true }))).toBe(true);
    expect(isAttackAnimation(row({ attack: true }))).toBe(true);
    expect(isParryAnimation(row({ parry: true }))).toBe(true);
    expect(isPauseAnimation(row({}))).toBe(false);
  });

  it("isDialogAnimation requires dialog and (looping or fireforget)", () => {
    expect(isDialogAnimation(row({ dialog: true, looping: true }))).toBe(true);
    expect(isDialogAnimation(row({ dialog: true, fireforget: true }))).toBe(true);
    expect(isDialogAnimation(row({ dialog: true }))).toBe(false);
    expect(isDialogAnimation(row({ looping: true }))).toBe(false);
    expect(isDialogAnimation(undefined)).toBe(false);
  });

  it("isPlayOutOfPlaceServerId matches retail ID bands only", () => {
    expect(isPlayOutOfPlaceServerId(0x4b0)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x52f)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x640)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x6bf)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x4af)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x530)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x63f)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x6c0)).toBe(false);
    expect(isPlayOutOfPlaceServerId(10000)).toBe(false);
  });
});
