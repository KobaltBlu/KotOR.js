import {
  flareElementColor,
  flareElementSize,
  flareFacing,
  flareRadiusFalloff,
  hasLensFlareData,
  isBeyondFlareRadius,
  stepFlareOcclusionFade,
  RETAIL_FLARE_SPEED,
  RETAIL_LENS_FLARE_SIZE,
} from "@/utility/odyssey-lens-flare-math";

describe("odyssey-lens-flare-math", () => {
  describe("hasLensFlareData", () => {
    it("gates on flarecolorshifts count > 0", () => {
      expect(hasLensFlareData(0)).toBe(false);
      expect(hasLensFlareData(1)).toBe(true);
      expect(hasLensFlareData(3)).toBe(true);
    });
  });

  describe("isBeyondFlareRadius", () => {
    it("culls when distance exceeds flareradius", () => {
      expect(isBeyondFlareRadius(10, 10)).toBe(false);
      expect(isBeyondFlareRadius(10.01, 10)).toBe(true);
      expect(isBeyondFlareRadius(0, 0)).toBe(false);
    });
  });

  describe("flareRadiusFalloff", () => {
    it("returns (radius - dist) / radius when radius != 0", () => {
      expect(flareRadiusFalloff(25, 100)).toBeCloseTo(0.75);
      expect(flareRadiusFalloff(100, 100)).toBeCloseTo(0);
    });

    it("skips divide when radius is 0 (retail guard)", () => {
      expect(flareRadiusFalloff(5, 0)).toBe(-5);
      expect(flareRadiusFalloff(0, 0)).toBe(0);
    });
  });

  describe("flareFacing", () => {
    it("squares max(0, -viewDir.z)", () => {
      expect(flareFacing(-1)).toBeCloseTo(1);
      expect(flareFacing(-0.5)).toBeCloseTo(0.25);
      expect(flareFacing(0)).toBe(0);
      expect(flareFacing(0.5)).toBe(0);
    });
  });

  describe("flareElementSize", () => {
    it("matches retail size formula with default lensFlareSize", () => {
      // size = flaresize * (radius-dist)/radius * 0.1
      expect(flareElementSize(10, 50, 100)).toBeCloseTo(10 * 0.5 * RETAIL_LENS_FLARE_SIZE);
    });

    it("applies custom lensFlareSize", () => {
      expect(flareElementSize(8, 0, 100, 0.2)).toBeCloseTo(8 * 1 * 0.2);
    });
  });

  describe("flareElementColor", () => {
    it("adds colorShift to light.color and applies fade * facing * falloff", () => {
      const rgb = flareElementColor({
        shiftR: 0.25,
        shiftG: 0,
        shiftB: 0,
        lightR: 0.5,
        lightG: 0.5,
        lightB: 0.5,
        occlusionFade: 1,
        facing: 1,
        distance: 0,
        flareRadius: 100,
      });
      expect(rgb.r).toBeCloseTo(0.75);
      expect(rgb.g).toBeCloseTo(0.5);
      expect(rgb.b).toBeCloseTo(0.5);
    });

    it("clamps channels to [0, 1]", () => {
      const rgb = flareElementColor({
        shiftR: 2,
        shiftG: -1,
        shiftB: 0.5,
        lightR: 2,
        lightG: 0,
        lightB: 0.5,
        occlusionFade: 1,
        facing: 1,
        distance: 0,
        flareRadius: 10,
      });
      expect(rgb.r).toBe(1);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(1);
    });

    it("does not use light multiplier (shift + color only)", () => {
      const rgb = flareElementColor({
        shiftR: 0,
        shiftG: 0,
        shiftB: 0,
        lightR: 0.2,
        lightG: 0.2,
        lightB: 0.2,
        occlusionFade: 0.5,
        facing: 0.5,
        distance: 50,
        flareRadius: 100,
      });
      // 0.2 * 0.5 * 0.5 * 0.5 = 0.025
      expect(rgb.r).toBeCloseTo(0.025);
    });
  });

  describe("stepFlareOcclusionFade", () => {
    it("fades up when clear and does not skip draw", () => {
      const r = stepFlareOcclusionFade(0.5, false, 0.1, RETAIL_FLARE_SPEED);
      expect(r.fade).toBeCloseTo(0.5 + RETAIL_FLARE_SPEED * 0.1);
      expect(r.skipDraw).toBe(false);
    });

    it("clamps fade up to 1", () => {
      const r = stepFlareOcclusionFade(0.95, false, 1, RETAIL_FLARE_SPEED);
      expect(r.fade).toBe(1);
      expect(r.skipDraw).toBe(false);
    });

    it("fades down when occluded and skips when fade hits 0", () => {
      const mid = stepFlareOcclusionFade(0.5, true, 0.1, RETAIL_FLARE_SPEED);
      expect(mid.fade).toBeCloseTo(0.5 - RETAIL_FLARE_SPEED * 0.1);
      expect(mid.skipDraw).toBe(false);

      const zero = stepFlareOcclusionFade(0.1, true, 1, RETAIL_FLARE_SPEED);
      expect(zero.fade).toBe(0);
      expect(zero.skipDraw).toBe(true);
    });
  });
});
