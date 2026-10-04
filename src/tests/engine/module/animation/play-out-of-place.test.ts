import { isPlayOutOfPlaceServerId } from "@engine/module/animation/animation2daFlag";
import { AuroraAnimationFlag } from "@core/enums/animation/AuroraAnimationFlag";

describe("play-out-of-place", () => {
  it("exposes PLAY_OUT_OF_PLACE flag bit", () => {
    expect(AuroraAnimationFlag.PLAY_OUT_OF_PLACE).toBe(0x800);
  });

  it("server ID bands match gesture ranges used by SetAnimation", () => {
    expect(isPlayOutOfPlaceServerId(0x4b0)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x52f)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x500)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x640)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x6bf)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x680)).toBe(true);
    expect(isPlayOutOfPlaceServerId(0x4af)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x530)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x63f)).toBe(false);
    expect(isPlayOutOfPlaceServerId(0x6c0)).toBe(false);
  });
});
