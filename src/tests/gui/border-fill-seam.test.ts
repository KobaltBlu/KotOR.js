/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  asGuiSize,
  centeredExtentMax,
  clampFrameDim,
  truncDiv,
} from "@/gui/GUICoord";
import { borderInnerExtent } from "@/gui/borderInnerExtent";
import { borderSideExtent } from "@/gui/borderSideExtent";

describe("BTN_AUTO / BTN_LEVELUP odd-width seams", () => {
  it("odd fill width 95 uses [-47, 48] and meets even-dim L/R inners", () => {
    const hole = borderInnerExtent({
      width: 127,
      height: 52,
      dimension: 16,
      innerOffset: 0,
    });
    expect(hole).toEqual({ width: 95, height: 20 });

    const fillMinX = -truncDiv(hole.width, 2);
    const fillMaxX = centeredExtentMax(hole.width);
    expect({ fillMinX, fillMaxX }).toEqual({ fillMinX: -47, fillMaxX: 48 });

    const leftInner = -55 + 16 / 2;
    const rightInner = 56 - 16 / 2;
    expect(fillMinX - leftInner).toBe(0);
    expect(rightInner - fillMaxX).toBe(0);
  });

  it("odd edge width 95 with +0.5 center nudge spans [-47, 48] like corners", () => {
    // Symmetric PlaneGeometry(95) is ±47.5; translate X += 0.5 → [-47, 48]
    const half = 95 / 2;
    const nudged = { minX: 0.5 - half, maxX: 0.5 + half };
    expect(nudged).toEqual({ minX: -47, maxX: 48 });
    // Without nudge (user dump): ±47.5 leaves 0.5px gap to corner at 48
    expect(48 - half).toBe(0.5);
  });
});

describe("asGuiSize / clampFrameDim (retail int frame)", () => {
  it("0.4 clamps to 1 so thin frames are not discarded", () => {
    expect(asGuiSize(0.4)).toBe(1);
    expect(asGuiSize(0)).toBe(0);
    expect(asGuiSize(2.9)).toBe(2);
    expect(clampFrameDim(0.4, 40, 20)).toBe(1);
  });

  it("oversized dim clamps to half extent; fill hole becomes 0", () => {
    // 10×10 control, dim 8 → each side 5, hole 0 (retail Draw when edges do not fit)
    expect(clampFrameDim(8, 10, 10)).toBe(5);
    expect(
      borderInnerExtent({ width: 10, height: 10, dimension: 8, innerOffset: 0 }),
    ).toEqual({ width: 0, height: 0 });

    const left = borderSideExtent({ width: 10, height: 10, dimension: 8, side: "left" });
    expect(left.height).toBe(5);
  });

  it("fractional dim shrinks fill by 1 on each side", () => {
    expect(
      borderInnerExtent({ width: 40, height: 20, dimension: 0.4, innerOffset: 0 }),
    ).toEqual({ width: 38, height: 18 });
  });

  it("odd width with oversized dim: fill collapses to 0, frame takes half", () => {
    // 11×11, dim 8 → clamp 5; GetInnerExtent degenerate test zeros the 1px leftover
    // (w < edge/2). Frame still uses half-extent corners (retail Draw).
    expect(clampFrameDim(8, 11, 11)).toBe(5);
    expect(
      borderInnerExtent({ width: 11, height: 11, dimension: 8, innerOffset: 0 }),
    ).toEqual({ width: 0, height: 0 });
    const corner = borderSideExtent({
      width: 11,
      height: 11,
      dimension: 8,
      side: "topLeft",
    });
    expect(corner.width).toBe(5);
    expect(corner.height).toBe(5);
  });
});
