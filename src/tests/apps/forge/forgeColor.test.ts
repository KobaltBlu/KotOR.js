import { describe, expect, test } from "@jest/globals";
import {
  byteToRgb01,
  clamp01,
  hexToRgb01,
  hsvToRgb01,
  rgb01ToHex,
  rgb01ToHsv,
} from "@/apps/forge/helpers/forgeColor";

describe("forgeColor", () => {
  test("clamps RGB 0-1 and converts to hex", () => {
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
    expect(rgb01ToHex({ r: 0.1, g: 0.2, b: 0.3 })).toBe("#1a334d");
    expect(byteToRgb01(255)).toBe(1);
  });

  test("hex round-trips to 0-1 RGB", () => {
    expect(hexToRgb01("#1a334d")).toEqual({
      r: 26 / 255,
      g: 51 / 255,
      b: 77 / 255,
    });
    expect(hexToRgb01("not-a-color")).toBeUndefined();
  });

  test("HSV red/white round-trip", () => {
    const red = hsvToRgb01({ h: 0, s: 1, v: 1 });
    expect(red.r).toBeCloseTo(1);
    expect(red.g).toBeCloseTo(0);
    expect(red.b).toBeCloseTo(0);
    const hsv = rgb01ToHsv({ r: 1, g: 0, b: 0 });
    expect(hsv.h).toBeCloseTo(0);
    expect(hsv.s).toBeCloseTo(1);
    expect(hsv.v).toBeCloseTo(1);
  });
});
