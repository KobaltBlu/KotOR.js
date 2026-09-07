/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { borderInnerExtent } from "@/gui/borderInnerExtent";
import { truncDiv } from "@/gui/GUICoord";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";

/**
 * SetExtent — text extent is
 * Intersection(GetInnerExtent(border), GetInnerExtent(hilight)).
 * map.gui BTN_PRTYSLCT / BTN_RETURN: H13, border dim2/inner9, hilight dim6/inner9,
 * ALIGNMENT 10 (HorizontalCenter|VerticalTop).
 */
function buttonTextInnerSize(params: {
  width: number;
  height: number;
  borderDim: number;
  borderInner: number;
  hilightDim: number;
  hilightInner: number;
}) {
  const border = borderInnerExtent({
    width: params.width,
    height: params.height,
    dimension: params.borderDim,
    innerOffset: params.borderInner,
  });
  const hilight = borderInnerExtent({
    width: params.width,
    height: params.height,
    dimension: params.hilightDim,
    innerOffset: params.hilightInner,
  });
  return {
    width: Math.min(border.width, hilight.width),
    height: Math.min(border.height, hilight.height),
  };
}

describe("MenuMap BTN_PRTYSLCT / BTN_RETURN text inner (engine)", () => {
  it("intersects border+hilight GetInnerExtent for skinny INNEROFFSET buttons", () => {
    const inner = buttonTextInnerSize({
      width: 278,
      height: 13,
      borderDim: 2,
      borderInner: 9,
      hilightDim: 6,
      hilightInner: 9,
    });
    // Hilight content collapses (13-12 < half edge) then +2*INNEROFFSET → 18
    expect(inner).toEqual({ width: 278, height: 18 });
    expect(10 & GUIControlAlignment.VerticalMask).toBe(GUIControlAlignment.VerticalTop);
    expect(truncDiv(inner.height, 2)).toBe(9);
  });

  it("EXIT (VerticalCenter) uses smaller of border/hilight inners", () => {
    const inner = buttonTextInnerSize({
      width: 146,
      height: 28,
      borderDim: 2,
      borderInner: 0,
      hilightDim: 6,
      hilightInner: 9,
    });
    expect(inner).toEqual({ width: 142, height: 24 });
  });
});
