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
} from "@engine/gui/GUICoord";

describe("selectTopmostHitChildIndex (HitCheckMouse)", () => {
  it("returns -1 when nothing is hit", () => {
    expect(selectTopmostHitChildIndex([false, false, false])).toBe(-1);
    expect(selectTopmostHitChildIndex([])).toBe(-1);
  });

  it("picks the last overlapping sibling (topmost / reverse walk)", () => {
    // Children 0 and 2 both under the cursor — returns child 2 only.
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

/**
 * abchrgen / skchrgen nest PLUS/MINUS/LBL under POINTS_BTN (Obj_Parent) while
 * keeping panel-absolute extents that extend outside the POINTS AABB.
 * Parent hit must include descendants or getActiveControls never reaches PLUS.
 */
describe("chargen POINTS_BTN nested PLUS/MINUS extents (abchrgen STR_*)", () => {
  const points = { left: 251, top: 137, width: 42, height: 43 };
  const minus = { left: 225, top: 143, width: 27, height: 32 };
  const plus = { left: 292, top: 143, width: 27, height: 32 };
  const lbl = { left: 51, top: 137, width: 175, height: 43 };

  /** Mirror GUIControl.hitCheckMouse: self AABB or any nested child AABB. */
  const parentOrDescendantHit = (x: number, y: number) =>
    hitCheckMouseLocal(points, x, y) ||
    [minus, plus, lbl].some((e) => hitCheckMouseLocal(e, x, y));

  it("PLUS center lies outside POINTS AABB but inside PLUS", () => {
    const x = plus.left + 13;
    const y = plus.top + 16;
    expect(hitCheckMouseLocal(points, x, y)).toBe(false);
    expect(hitCheckMouseLocal(plus, x, y)).toBe(true);
    expect(parentOrDescendantHit(x, y)).toBe(true);
  });

  it("MINUS center lies outside POINTS AABB but inside MINUS", () => {
    const x = minus.left + 13;
    const y = minus.top + 16;
    expect(hitCheckMouseLocal(points, x, y)).toBe(false);
    expect(hitCheckMouseLocal(minus, x, y)).toBe(true);
    expect(parentOrDescendantHit(x, y)).toBe(true);
  });

  it("ability name LBL is fully outside POINTS AABB", () => {
    const x = lbl.left + 80;
    const y = lbl.top + 20;
    expect(hitCheckMouseLocal(points, x, y)).toBe(false);
    expect(hitCheckMouseLocal(lbl, x, y)).toBe(true);
    expect(parentOrDescendantHit(x, y)).toBe(true);
  });

  it("among POINTS children, selectable PLUS wins over POINTS on PLUS center", () => {
    const x = plus.left + 13;
    const y = plus.top + 16;
    // Nested under POINTS: [LBL, MINUS, PLUS] order varies by row; STR is LBL, MINUS, PLUS.
    const childHit = [
      hitCheckMouseLocal(lbl, x, y),
      hitCheckMouseLocal(minus, x, y),
      hitCheckMouseLocal(plus, x, y),
    ];
    const childSelectable = [false, true, true];
    expect(selectTopmostHitChildIndex(childHit, childSelectable)).toBe(2);
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
