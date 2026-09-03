/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  centeredExtentMax,
  truncDiv,
} from "@/gui/GUICoord";
import { borderInnerExtent } from "@/gui/borderInnerExtent";

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
