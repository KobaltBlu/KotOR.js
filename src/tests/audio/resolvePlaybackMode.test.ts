import { AnimationPlaybackMode } from "@/enums/animation/AnimationPlaybackMode";
import {
  resolvePlaybackMode,
  resolveOverlayStartFlags,
  resolveOverlayStopFlags,
  ANIMATION_REVERSE_SERVER_ID,
} from "@/module/animation/resolvePlaybackMode";
import {
  SET_ANIMATION_OVERLAY_IDS,
  SET_ANIMATION_REVERSE_IDS,
} from "@/module/animation/setAnimationModeTables";

describe("resolvePlaybackMode", () => {
  it("returns REVERSE for the special reverse server ID", () => {
    expect(resolvePlaybackMode(ANIMATION_REVERSE_SERVER_ID)).toBe(AnimationPlaybackMode.REVERSE);
  });

  it("returns REVERSE for all reverse switch IDs", () => {
    for(const id of SET_ANIMATION_REVERSE_IDS){
      expect(resolvePlaybackMode(id)).toBe(AnimationPlaybackMode.REVERSE);
    }
  });

  it("returns OVERLAY for overlay switch IDs", () => {
    expect(resolvePlaybackMode(0x272e)).toBe(AnimationPlaybackMode.OVERLAY);
    expect(resolvePlaybackMode(0x2791)).toBe(AnimationPlaybackMode.OVERLAY);
    expect(resolvePlaybackMode(0x283e)).toBe(AnimationPlaybackMode.OVERLAY);
    for(const id of SET_ANIMATION_OVERLAY_IDS){
      expect(resolvePlaybackMode(id)).toBe(AnimationPlaybackMode.OVERLAY);
    }
  });

  it("returns OVERLAY for 2DA overlay=1 fallback", () => {
    expect(resolvePlaybackMode(10000, { overlay: "1" } as any)).toBe(AnimationPlaybackMode.OVERLAY);
  });

  it("returns OVERLAY for boolean overlay=true fallback", () => {
    expect(resolvePlaybackMode(10000, { overlay: true } as any)).toBe(AnimationPlaybackMode.OVERLAY);
  });

  it("defaults FLOURISH (10246) to NORMAL", () => {
    expect(resolvePlaybackMode(10246, { overlay: "0" } as any)).toBe(AnimationPlaybackMode.NORMAL);
    expect(resolvePlaybackMode(10246, { overlay: false } as any)).toBe(AnimationPlaybackMode.NORMAL);
  });
});

describe("overlay flags", () => {
  it("uses OVERLAY_SLOT when starting", () => {
    expect(resolveOverlayStartFlags(10030) & 0x08).toBe(0x08);
  });

  it("ORs ADDITIVE_GESTURE (0x400) for additive start IDs", () => {
    expect(resolveOverlayStartFlags(0x272e) & 0x400).toBe(0x400);
    expect(resolveOverlayStartFlags(0x272e) & 0x08).toBe(0x08);
  });

  it("skips FIRE_FORGET for looping overlay bands", () => {
    expect(resolveOverlayStartFlags(0x272e) & 0x001).toBe(0);
    expect(resolveOverlayStartFlags(0x2736) & 0x001).toBe(0);
  });

  it("uses 0x400 stop for additive listen IDs and 0x80 otherwise", () => {
    expect(resolveOverlayStopFlags(0x272e)).toBe(0x400);
    expect(resolveOverlayStopFlags(10000)).toBe(0x80);
  });
});
