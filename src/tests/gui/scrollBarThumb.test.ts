/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  scrollBarDragValue,
  scrollBarThumbCenterY,
  scrollBarThumbSize,
} from "@/gui/scrollBarThumb";

describe("scrollBarThumbSize (engine SetExtent)", () => {
  it("uses border inner width, not full track width", () => {
    const size = scrollBarThumbSize({
      trackWidth: 20,
      trackHeight: 200,
      borderDimension: 3,
      maxValue: 10,
      visibleItemCount: 5,
    });
    // inner width = 20 - 2*3 = 14
    expect(size.width).toBe(14);
    expect(size.width).toBeLessThan(20);
  });

  it("clamps thumb height to minimum 4 when maxValue > 1", () => {
    const size = scrollBarThumbSize({
      trackWidth: 16,
      trackHeight: 100,
      borderDimension: 0,
      maxValue: 100,
      visibleItemCount: 1,
    });
    // 1/(1+100)*100 ≈ 0.99 → floors to 0 → clamp 4
    expect(size.height).toBe(4);
  });

  it("fills the track when maxValue <= 1", () => {
    const size = scrollBarThumbSize({
      trackWidth: 16,
      trackHeight: 120,
      borderDimension: 0,
      maxValue: 1,
      visibleItemCount: 5,
    });
    expect(size.height).toBe(120);
    expect(size.travel).toBe(0);
  });
});

describe("scrollBarDragValue (engine HandleMouseCapturedMovement)", () => {
  it("zero delta keeps start value (no jump past cursor)", () => {
    expect(scrollBarDragValue({
      deltaY: 0,
      travel: 100,
      startValue: 3,
      maxIndex: 9,
      oneBased: false,
    })).toBe(3);
  });

  it("uses current - start panel Y (positive delta scrolls down)", () => {
    // Half of travel → half of maxIndex from start 0
    expect(scrollBarDragValue({
      deltaY: 50,
      travel: 100,
      startValue: 0,
      maxIndex: 10,
      oneBased: false,
    })).toBe(5);
  });

  it("one-based oversized scroll clamps to [1, pages]", () => {
    expect(scrollBarDragValue({
      deltaY: -1000,
      travel: 80,
      startValue: 2,
      maxIndex: 4,
      oneBased: true,
    })).toBe(1);
    expect(scrollBarDragValue({
      deltaY: 1000,
      travel: 80,
      startValue: 2,
      maxIndex: 4,
      oneBased: true,
    })).toBe(5);
  });
});

describe("scrollBarThumbCenterY", () => {
  it("places t=0 at positive Y (visual top)", () => {
    expect(scrollBarThumbCenterY(100, 0)).toBe(50);
    expect(scrollBarThumbCenterY(100, 1)).toBe(-50);
  });
});
