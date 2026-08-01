/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  centeredExtentMax,
  truncDiv,
} from "@/gui/GUICoord";
import { borderInnerExtent } from "@/gui/borderInnerExtent";

describe("BTN_AUTO fill TL-frustum vs float border inners", () => {
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

    // borderSideExtent L/R centers with dim 16: left=-55, right=56; float ±dim/2 inners
    const leftInner = -55 + 16 / 2;
    const rightInner = 56 - 16 / 2;
    expect(fillMinX - leftInner).toBe(0);
    expect(rightInner - fillMaxX).toBe(0);

    // Old float fill ±w/2 left a 0.5px right gap
    expect(rightInner - hole.width / 2).toBe(0.5);
  });
});
