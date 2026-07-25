/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { centeredExtentMax, orthoFrustumInt, truncDiv } from "@/gui/GUICoord";
import { borderSideExtent } from "@/gui/borderSideExtent";

/** Outer X span of a vertical edge/corner plane (thickness along X after rotation). */
function verticalStripOuter(centerX: number, thickness: number) {
  const half = thickness / 2;
  return { min: centerX - half, max: centerX + half, thickness };
}

describe("borderSideExtent TL-faithful L/R (int-space)", () => {
  it("BTN_SAVELOAD even 134×28 dim 6: L/R outer ±67, thickness 6", () => {
    const ew = 134;
    const eh = 28;
    const dim = 6;
    const left = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "left" });
    const right = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "right" });

    expect(left.height).toBe(6);
    expect(right.height).toBe(6);

    const l = verticalStripOuter(left.left, left.height);
    const r = verticalStripOuter(right.left, right.height);
    expect(l).toEqual({ min: -67, max: -61, thickness: 6 });
    expect(r).toEqual({ min: 61, max: 67, thickness: 6 });
    expect(r.max - l.min).toBe(ew);
  });

  it("odd width 135×28 dim 6: left −67, right +68, thickness 6 both sides", () => {
    const ew = 135;
    const eh = 28;
    const dim = 6;
    const left = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "left" });
    const right = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "right" });

    expect(left.height).toBe(6);
    expect(right.height).toBe(6);

    const l = verticalStripOuter(left.left, left.height);
    const r = verticalStripOuter(right.left, right.height);
    expect(l.min).toBe(-truncDiv(ew, 2));
    expect(r.max).toBe(centeredExtentMax(ew));
    expect(l.thickness).toBe(6);
    expect(r.thickness).toBe(6);
    expect(r.max - l.min).toBe(ew);
    // Regression: old ±halfInnerW stopped at +67
    expect(r.max).toBe(68);
    expect(right.left).toBe(65);
  });

  it("odd height 134×29 dim 6: bottom −14, top +15", () => {
    const ew = 134;
    const eh = 29;
    const dim = 6;
    const top = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "top" });
    const bottom = borderSideExtent({ width: ew, height: eh, dimension: dim, side: "bottom" });

    const half = dim / 2;
    expect(top.top - half).toBe(-truncDiv(eh, 2));
    expect(bottom.top + half).toBe(centeredExtentMax(eh));
  });

  it("right corners share the odd-width right center", () => {
    const right = borderSideExtent({ width: 135, height: 28, dimension: 6, side: "right" });
    const topRight = borderSideExtent({ width: 135, height: 28, dimension: 6, side: "topRight" });
    const bottomRight = borderSideExtent({
      width: 135,
      height: 28,
      dimension: 6,
      side: "bottomRight",
    });
    expect(topRight.left).toBe(right.left);
    expect(bottomRight.left).toBe(right.left);
  });
});

describe("centeredExtentMax", () => {
  it("even width matches truncDiv half", () => {
    expect(centeredExtentMax(134)).toBe(67);
    expect(centeredExtentMax(134)).toBe(truncDiv(134, 2));
  });

  it("odd width keeps the extra pixel on the max side", () => {
    expect(centeredExtentMax(135)).toBe(68);
    expect(truncDiv(135, 2)).toBe(67);
    expect(centeredExtentMax(135) - -truncDiv(135, 2)).toBe(135);
  });
});

describe("orthoFrustumInt (odd viewport half-pixel guard)", () => {
  it("even viewport stays symmetric integers", () => {
    expect(orthoFrustumInt(1920, 1080)).toEqual({
      left: -960,
      right: 960,
      top: 540,
      bottom: -540,
    });
  });

  it("odd viewport uses integer edges (not ±width/2 floats)", () => {
    const f = orthoFrustumInt(1921, 1081);
    expect(f).toEqual({
      left: -960,
      right: 961,
      top: 541,
      bottom: -540,
    });
    expect(Number.isInteger(f.left)).toBe(true);
    expect(Number.isInteger(f.right)).toBe(true);
    expect(f.right - f.left).toBe(1921);
    expect(f.top - f.bottom).toBe(1081);
    // Old float path: ±960.5 — that is what thinned L/R GUI strokes
    expect(f.left).not.toBe(1921 / -2);
    expect(f.right).not.toBe(1921 / 2);
  });
});
