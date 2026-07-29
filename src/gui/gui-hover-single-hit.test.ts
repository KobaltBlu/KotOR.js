/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  hitCheckMouseLocal,
  selectTopmostHitChildIndex,
} from "@/gui/GUICoord";

describe("selectTopmostHitChildIndex (retail CSWGuiPanel::HitCheckMouse @ 0040b690)", () => {
  it("returns -1 when nothing is hit", () => {
    expect(selectTopmostHitChildIndex([false, false, false])).toBe(-1);
    expect(selectTopmostHitChildIndex([])).toBe(-1);
  });

  it("picks the last overlapping sibling (topmost / reverse walk)", () => {
    // Children 0 and 2 both under the cursor — retail returns child 2 only.
    expect(selectTopmostHitChildIndex([true, false, true])).toBe(2);
  });

  it("picks the only hit when siblings do not overlap", () => {
    expect(selectTopmostHitChildIndex([false, true, false])).toBe(1);
  });

  it("prefers selectable button under decorative label (LBLH / LBL_INV)", () => {
    // Label (index 2) is topmost hit but not selectable; button (index 0) is.
    expect(selectTopmostHitChildIndex(
      [true, false, true],
      [true, false, false],
    )).toBe(0);
  });

  it("falls back to any hit when nothing is selectable", () => {
    expect(selectTopmostHitChildIndex(
      [true, false, true],
      [false, false, false],
    )).toBe(2);
  });
});

describe("overlapping AABB + topmost pick", () => {
  const a = { left: 0, top: 0, width: 40, height: 40 };
  const b = { left: 30, top: 0, width: 40, height: 40 }; // overlaps a by 10px

  it("both extents contain the overlap point", () => {
    expect(hitCheckMouseLocal(a, 35, 20)).toBe(true);
    expect(hitCheckMouseLocal(b, 35, 20)).toBe(true);
  });

  it("topmost index is the later sibling when both hit", () => {
    const hits = [hitCheckMouseLocal(a, 35, 20), hitCheckMouseLocal(b, 35, 20)];
    expect(selectTopmostHitChildIndex(hits)).toBe(1);
  });
});
