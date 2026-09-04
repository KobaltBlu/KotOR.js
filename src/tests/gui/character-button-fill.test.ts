/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import { borderInnerExtent } from "@/gui/borderInnerExtent";

/**
 * character.gui BTN_AUTO / BTN_LEVELUP: thick confirm2 frame + dialog2 fill.
 * Draw sizes fill to the corner hole (no INNEROFFSET).
 * GetInnerExtent (text) still applies INNEROFFSET.
 */
describe("MenuCharacter BTN_AUTO / BTN_LEVELUP fill vs text inner", () => {
  it("AUTO fill is 95×20 hole; text inner expands with INNEROFFSET", () => {
    const fill = borderInnerExtent({
      width: 127,
      height: 52,
      dimension: 16,
      innerOffset: 0,
    });
    const text = borderInnerExtent({
      width: 127,
      height: 52,
      dimension: 16,
      innerOffset: 14,
    });
    expect(fill).toEqual({ width: 95, height: 20 });
    expect(text).toEqual({ width: 123, height: 48 });
  });

  it("LEVELUP fill is 95×8 hole", () => {
    const fill = borderInnerExtent({
      width: 127,
      height: 40,
      dimension: 16,
      innerOffset: 0,
    });
    expect(fill).toEqual({ width: 95, height: 8 });
  });
});
