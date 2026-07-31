/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  hitCheckMouseLocal,
  selectTopmostHitChildIndex,
  skillFlowArrowExtentLeft,
  skillFlowCenteredXFromExtentLeft,
  skillFlowSlotExtentLeft,
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

describe("skill-flow slot extents (list-row nested hit)", () => {
  const protoW = 242;
  const iconW = 40;
  const rowTop = 48; // second list row
  const rowLeft = 4;

  it("places left/center/right slots without overlapping", () => {
    const left = skillFlowSlotExtentLeft(0, protoW, iconW);
    const mid = skillFlowSlotExtentLeft(1, protoW, iconW);
    const right = skillFlowSlotExtentLeft(2, protoW, iconW);
    expect(left).toBe(0);
    expect(mid).toBe(101);
    expect(right).toBe(202);
    expect(left + iconW).toBeLessThanOrEqual(mid);
    expect(mid + iconW).toBeLessThanOrEqual(right);
  });

  it("centered widget X matches prior skill-flow layout", () => {
    expect(skillFlowCenteredXFromExtentLeft(0, iconW, protoW)).toBe(-101);
    expect(skillFlowCenteredXFromExtentLeft(101, iconW, protoW)).toBe(0);
    expect(skillFlowCenteredXFromExtentLeft(202, iconW, protoW)).toBe(101);
  });

  it("composed list-viewport extents hit the correct slot on a lower row", () => {
    const slots = [0, 1, 2].map((i) => ({
      left: rowLeft + skillFlowSlotExtentLeft(i, protoW, iconW),
      top: rowTop,
      width: iconW,
      height: iconW,
    }));
    // Hover center of left slot on row 2 — must not hit right slot.
    const mx = slots[0].left + 20;
    const my = rowTop + 20;
    expect(hitCheckMouseLocal(slots[0], mx, my)).toBe(true);
    expect(hitCheckMouseLocal(slots[1], mx, my)).toBe(false);
    expect(hitCheckMouseLocal(slots[2], mx, my)).toBe(false);

    // Same X as left slot but at list top (row 0) — lower-row composed extent misses.
    expect(hitCheckMouseLocal(slots[0], mx, 20)).toBe(false);
  });

  it("arrow extent.left tracks prior ±arrowOffset widget X", () => {
    const aw = 32;
    const left1 = skillFlowArrowExtentLeft(1, protoW, iconW, aw);
    const left2 = skillFlowArrowExtentLeft(2, protoW, iconW, aw);
    expect(skillFlowCenteredXFromExtentLeft(left1, aw, protoW)).toBe(-50);
    expect(skillFlowCenteredXFromExtentLeft(left2, aw, protoW)).toBe(50);
  });
});
