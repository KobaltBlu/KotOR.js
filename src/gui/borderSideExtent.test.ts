/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  centeredExtentMax,
  orthoAlignedUnitPlanePositions,
  orthoFrustumInt,
  truncDiv,
} from "@/gui/GUICoord";
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

describe("writeOrthoAlignedPlanePositions vs float ±w/2 fill gap", () => {
  it("odd fill width 95 meets TL-centered L/R inners at −47 / +48", () => {
    const fw = 95;
    const floatSpan = { min: -fw / 2, max: fw / 2 };
    const intSpan = { min: -truncDiv(fw, 2), max: centeredExtentMax(fw) };
    // Border inners for odd control (BTN_AUTO hole): left maxX=-47, right minX=48
    expect(intSpan).toEqual({ min: -47, max: 48 });
    expect(floatSpan.max).toBe(47.5);
    expect(48 - floatSpan.max).toBe(0.5); // classic right-side gap
    expect(floatSpan.min - -47).toBe(-0.5); // left-side overlap
    expect(intSpan.min).toBe(-47);
    expect(intSpan.max).toBe(48);
  });
});

describe("orthoAlignedUnitPlanePositions (RTT blit vs orthoFrustumInt)", () => {
  it("even size matches symmetric ±half (same as float scale)", () => {
    expect(orthoAlignedUnitPlanePositions(200, 100)).toEqual([
      [-100, 50],
      [100, 50],
      [-100, -50],
      [100, -50],
    ]);
  });

  it("odd size uses integer frustum edges, not float ±w/2", () => {
    const corners = orthoAlignedUnitPlanePositions(201, 101);
    expect(corners).toEqual([
      [-100, 51],
      [101, 51],
      [-100, -50],
      [101, -50],
    ]);
    // Old unit plane × scale(201,101) spanned ±100.5 / ±50.5
    expect(corners[0][0]).not.toBe(-(201 / 2));
    expect(corners[1][0]).not.toBe(201 / 2);
    const f = orthoFrustumInt(201, 101);
    expect(corners[1][0] - corners[0][0]).toBe(f.right - f.left);
    expect(corners[0][1] - corners[2][1]).toBe(f.top - f.bottom);
  });
});
