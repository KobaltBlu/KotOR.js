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
import {
  chromeFrameRings,
  chromeWorldQuadsFromRings,
} from "@/gui/chromeGeometry";

describe("BTN_AUTO / BTN_LEVELUP odd-width seams", () => {
  it("odd fill width 95 uses [-47, 48] and meets even-dim L/R inners", () => {
    const hole = borderInnerExtent({
      width: 127,
      height: 52,
      dimension: 16,
      innerOffset: 0,
      applyInnerOffset: false,
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

  it("ring chrome shares exact edge↔corner seams (even dim)", () => {
    const quads = chromeWorldQuadsFromRings(127, 52, 16);
    const byRegion = (region: number) => quads.filter((q) => q.region === region);
    const edges = byRegion(0);
    const corners = byRegion(1);
    // top-left corner meets left edge + upper edge
    const tl = corners.find((q) => q.minX < 0 && q.maxY > 0)!;
    const left = edges.find((q) => q.maxX === tl.maxX && q.minY < tl.minY)!;
    const upper = edges.find((q) => q.minY === tl.minY && q.minX === tl.maxX)!;
    expect(tl.maxX).toBe(left.maxX);
    expect(tl.minY).toBe(left.maxY);
    expect(tl.minY).toBe(upper.minY);
    expect(tl.maxX).toBe(upper.minX);
  });

  it("ring chrome has zero right/top gaps for odd DIMENSION (MainMenu)", () => {
    // Odd dim + TL-around-center previously left gap:1 on right/top seams.
    for (const [ew, eh, dim] of [
      [229, 35, 9],
      [100, 25, 5],
      [211, 41, 7],
    ] as const) {
      const r = chromeFrameRings(ew, eh, dim);
      expect(r.innerR - r.innerL).toBeGreaterThan(0);
      const quads = chromeWorldQuadsFromRings(ew, eh, dim);
      const edges = quads.filter((q) => q.region === 0);
      const corners = quads.filter((q) => q.region === 1);
      const tr = corners.find((q) => q.minX > 0 && q.maxY > 0)!;
      const upper = edges.find((q) => q.maxY === tr.maxY)!;
      const right = edges.find((q) => q.minX === tr.minX && q.maxY < tr.maxY)!;
      expect(tr.minX - upper.maxX).toBe(0);
      expect(tr.minY - right.maxY).toBe(0);
      expect(tr.minX).toBe(r.innerR);
      expect(tr.maxX).toBe(r.outerR);
    }
  });

  it("ring fill hole matches borderInnerExtent Draw hole", () => {
    const ew = 229;
    const eh = 35;
    const dim = 9;
    const hole = borderInnerExtent({
      width: ew,
      height: eh,
      dimension: dim,
      innerOffset: 0,
      applyInnerOffset: false,
    });
    const r = chromeFrameRings(ew, eh, dim);
    expect(r.innerR - r.innerL).toBe(hole.width);
    expect(r.innerT - r.innerB).toBe(hole.height);
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
