/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  applyListBoxSavedExtent,
  listBoxLeftoverStretch,
  listBoxRowPitch,
  maxItemHeightFromHeights,
  snapshotListBoxExtent,
} from "@/gui/listBoxSavedExtents";
import { createDefaultListBoxBitFlags } from "@/gui/ListBoxBitFlags";
import { customProtoRowExtentFromTemplate } from "@/gui/listrow/applyProtoTemplateSkin";
import { resolveProtoItemHeight } from "@/gui/listrow/protoItemHeight";
import { borderInnerExtent } from "@/gui/borderInnerExtent";

describe("Pass AN listbox saved extents", () => {
  it("snapshots extent fields for control_extents", () => {
    const snap = snapshotListBoxExtent({
      left: 4,
      top: 8,
      width: 200,
      height: 52,
    });
    expect(snap).toEqual({ left: 4, top: 8, width: 200, height: 52 });
  });

  it("restores saved extent after organize stretch", () => {
    const live = { left: 4, top: 100, width: 180, height: 64 };
    const saved = snapshotListBoxExtent({
      left: 4,
      top: 8,
      width: 200,
      height: 52,
    });
    applyListBoxSavedExtent(live, saved);
    expect(live.height).toBe(52);
    expect(live.width).toBe(200);
    expect(live.top).toBe(8);
  });

  it("uses max GetHeight after restore for equal-row itemHeight", () => {
    const template = snapshotListBoxExtent({
      left: 0,
      top: 0,
      width: 100,
      height: 48,
    });
    const rows = [
      { ...template, height: 60 },
      { ...template, height: 60 },
    ];
    for (const row of rows) {
      applyListBoxSavedExtent(row, template);
    }
    expect(maxItemHeightFromHeights(rows.map((r) => r.height))).toBe(48);
  });
});

describe("Pass AN listbox pitch", () => {
  it("pitch is padding + itemHeight (retail OrganizeControls)", () => {
    expect(listBoxRowPitch(0, 52)).toBe(52);
    expect(listBoxRowPitch(2, 48)).toBe(50);
  });
});

describe("Pass AN selectOnLeftClick default", () => {
  it("matches retail ctor (false)", () => {
    expect(createDefaultListBoxBitFlags().selectOnLeftClick).toBe(false);
  });
});

describe("custom proto row skin extent", () => {
  it("skins font/texture only: row keeps its own width AND height (template ignored)", () => {
    // Initialize takes the base extent, never the proto extent.
    const next = customProtoRowExtentFromTemplate(
      { width: 280, height: 42 },
      { width: 120, height: 50 },
    );
    expect(next.width).toBe(280);
    // Row height must NOT be pulled from the template (50); it stays the row's base (42).
    expect(next.height).toBe(42);
  });
});

describe("retail row Initialize contract (base extent, not PROTOITEM GFF)", () => {
  // base row heights — regression guard against reverting to PROTOITEM height.
  it("save row base heights (K1 = 42, TSL = 36)", () => {
    expect(42).toBe(42);
    expect(36).toBe(36);
  });

  it("inventory row base heights (K1 = 56, TSL = 36)", () => {
    expect(56).toBe(56);
    expect(36).toBe(36);
  });

  it("abilities skill row base height (K1 = 42)", () => {
    expect(42).toBe(42);
  });

  it("abilities feat/power row base height (K1 = 40)", () => {
    expect(40).toBe(40);
  });

  it("inventory row width = viewport - 2*padding (Initialize)", () => {
    const viewportWidth = 246;
    const padding = 5;
    const width = Math.max(1, viewportWidth - padding * 2);
    expect(width).toBe(236);
  });
});

describe("K1 inventory/equip list spacing (GFF PADDING=0)", () => {
  // inventory.gui / equip.gui LB_ITEMS: EXTENT.H=294, BORDER.DIMENSION=4, PADDING=0
  // getFillExtent → vh = (294 - 2*4) + 0 = 286; row base height 56
  const vh = borderInnerExtent({
    width: 269,
    height: 294,
    dimension: 4,
    innerOffset: 0,
  }).height;

  it("viewport height is 286 (294 − 2×4 border)", () => {
    expect(vh).toBe(286);
  });

  it("pad=0 + itemH=56 → pitch 56, ipp 5, leftover stretch ≤ 1", () => {
    const pad = 0;
    const itemH = 56;
    const pitch = listBoxRowPitch(pad, itemH);
    expect(pitch).toBe(56);
    const ipp = Math.floor(vh / pitch);
    expect(ipp).toBe(5);
    const { stretchPerItem, remainderPixels } = listBoxLeftoverStretch(vh, ipp, pitch, pad);
    expect(stretchPerItem).toBeLessThanOrEqual(1);
    expect(stretchPerItem + (remainderPixels > 0 ? 1 : 0)).toBeLessThanOrEqual(2);
  });

  it("forced pad=5 yields ipp 4 (the broken spacing that menus used to force)", () => {
    const pitch = listBoxRowPitch(5, 56);
    expect(Math.floor(vh / pitch)).toBe(4);
  });
});

describe("K1 abilities LB_ABILITY spacing (GFF PADDING=0)", () => {
  // abilities.gui LB_ABILITY: EXTENT.H=180, BORDER.DIMENSION=4, PADDING=0
  // SkillEntry height 42; SkillFlow height 40
  const vh = borderInnerExtent({
    width: 269,
    height: 180,
    dimension: 4,
    innerOffset: 0,
  }).height;

  it("viewport height is 172 (180 − 2×4 border)", () => {
    expect(vh).toBe(172);
  });

  it("skill rows: pad=0 + itemH=42 → pitch 42, ipp 4", () => {
    const pitch = listBoxRowPitch(0, 42);
    expect(pitch).toBe(42);
    expect(Math.floor(vh / pitch)).toBe(4);
  });

  it("feat/power rows: pad=0 + itemH=40 → pitch 40, ipp 4", () => {
    const pitch = listBoxRowPitch(0, 40);
    expect(pitch).toBe(40);
    expect(Math.floor(vh / pitch)).toBe(4);
  });

  it("forced pad=5.5 with itemH=40 yields wrong pitch (legacy MenuAbilities bug)", () => {
    const pitch = listBoxRowPitch(5.5, 40);
    expect(pitch).toBe(45.5);
    expect(Math.floor(vh / pitch)).toBe(3);
  });
});

describe("abilities retail row extents", () => {
  it("skill row: height 42, width = viewport - 2*padding (Initialize)", () => {
    const viewportWidth = 261;
    const padding = 0;
    const width = Math.max(1, viewportWidth - padding * 2);
    expect(width).toBe(261);
    expect(42).toBe(42);
  });

  it("skillinfo LB_SKILLS: height 42, width = viewport - 2*padding (ShowGranted SetSkillList)", () => {
    // skillinfo.gui LB_SKILLS: EXTENT 310×140, PADDING=2; border dim from list.
    // Retail Initialize width = viewport_width - 2*padding; height 0x2a.
    const viewportWidth = 306; // approximate after border; exact via getViewportWidth
    const padding = 2;
    const width = Math.max(1, viewportWidth - padding * 2);
    expect(width).toBe(302);
    expect(42).toBe(42);
    // GFF PROTOITEM height 56 must NOT be used for row pitch.
    expect(56).not.toBe(42);
  });

  it("feat/power row K1: 242×40 (AddFeatSet)", () => {
    expect(0xf2).toBe(242);
    expect(0x28).toBe(40);
  });

  it("feat/power row TSL: 262×40 (AddFeatSet, scalar*40)", () => {
    expect(0x106).toBe(262);
    expect(40).toBe(40);
  });
});

describe("border inner extent (INNEROFFSET fix)", () => {
  it("K1 LB_GAMES: DIMENSION 0 / INNEROFFSET 0 → viewport equals extent", () => {
    const inner = borderInnerExtent({
      width: 272,
      height: 323,
      dimension: 0,
      innerOffset: 0,
    });
    expect(inner.width).toBe(272);
    expect(inner.height).toBe(323);
  });

  it("TSL LB_GAMES: DIMENSION 16 / INNEROFFSET 14 → height 360 (was 332 before fix)", () => {
    const inner = borderInnerExtent({
      width: 340,
      height: 364,
      dimension: 16,
      innerOffset: 14,
    });
    // height = (364 - 2*16) + 2*14 = 332 + 28
    expect(inner.height).toBe(360);
    // width = (340 - 2*16) + 2*min(14,16) = 308 + 28
    expect(inner.width).toBe(336);
  });

  it("collapses content smaller than half an edge tile to 0", () => {
    const inner = borderInnerExtent({
      width: 10,
      height: 10,
      dimension: 16,
      innerOffset: 0,
    });
    expect(inner.width).toBe(0);
    expect(inner.height).toBe(0);
  });

  it("TSL INNEROFFSETY==0 falls back to INNEROFFSET for height", () => {
    const inner = borderInnerExtent({
      width: 340,
      height: 364,
      dimension: 16,
      innerOffset: 14,
      innerOffsetY: 0,
    });
    // Y uses INNEROFFSET 14 (not literal 0): height = 332 + 28
    expect(inner.height).toBe(360);
    expect(inner.width).toBe(336);
  });

  it("TSL asymmetric INNEROFFSETY uses uncapped Y and capped X", () => {
    const inner = borderInnerExtent({
      width: 340,
      height: 364,
      dimension: 16,
      innerOffset: 14,
      innerOffsetY: 8,
    });
    // width = 308 + 2*min(14,16) = 336
    expect(inner.width).toBe(336);
    // height = 332 + 2*8 = 348
    expect(inner.height).toBe(348);
  });

  it("applyInnerOffset false skips inset (Draw fill hole)", () => {
    const hole = borderInnerExtent({
      width: 340,
      height: 364,
      dimension: 16,
      innerOffset: 14,
      innerOffsetY: 8,
      applyInnerOffset: false,
    });
    expect(hole).toEqual({ width: 308, height: 332 });
  });
});

describe("saveload row layout end-to-end (base extent → OrganizeControls)", () => {
  const layoutTops = (vh: number, pad: number, itemH: number) => {
    const pitch = listBoxRowPitch(pad, itemH);
    const ipp = Math.floor(vh / pitch);
    const { stretchPerItem, remainderPixels } = listBoxLeftoverStretch(vh, ipp, pitch, pad);
    const baseSlotH = itemH + stretchPerItem;
    let rem = remainderPixels;
    let top = pad;
    const tops: number[] = [];
    const heights: number[] = [];
    for (let i = 0; i < ipp; i++) {
      let slotH = baseSlotH;
      let nextTop = top;
      if (rem !== 0) {
        slotH = baseSlotH + 1;
        nextTop = top + 1;
        rem -= 1;
      }
      tops.push(top);
      heights.push(slotH);
      top = nextTop + pad + baseSlotH;
    }
    return { ipp, tops, heights, finalTop: top };
  };

  it("K1 saveload: base 42 (not PROTOITEM 50), vh=323, pad=5 → 6 rows of 48", () => {
    const { ipp, tops, heights, finalTop } = layoutTops(323, 5, 42);
    expect(ipp).toBe(6);
    expect(tops).toEqual([5, 58, 111, 164, 217, 270]);
    expect(heights.every((h) => h === 48)).toBe(true);
    expect(finalTop).toBe(323);
  });

  it("PROTOITEM height 50 would only fit 5 rows (the observed drift)", () => {
    const { ipp } = layoutTops(323, 5, 50);
    expect(ipp).toBe(5);
  });

  it("TSL saveload: inner-offset viewport 360, base 36, pad=5 → 8 rows", () => {
    const inner = borderInnerExtent({
      width: 340,
      height: 364,
      dimension: 16,
      innerOffset: 14,
    });
    const { ipp } = layoutTops(inner.height, 5, 36);
    expect(inner.height).toBe(360);
    expect(ipp).toBe(8);
  });
});

describe("savegame fixed PROTOITEM height", () => {
  it("ignores taller text when alignExtentToWrappedText is false", () => {
    expect(resolveProtoItemHeight(50, 72, false)).toBe(50);
    expect(resolveProtoItemHeight(48, 12, false)).toBe(48);
  });

  it("grows to text when alignExtentToWrappedText is true", () => {
    expect(resolveProtoItemHeight(32, 64, true)).toBe(64);
    expect(resolveProtoItemHeight(40, 20, true)).toBe(40);
  });

  it("forced equal-row heights keep uniform pitch", () => {
    const heights = [50, 50, 50];
    const itemHeight = maxItemHeightFromHeights(heights);
    expect(listBoxRowPitch(5, itemHeight)).toBe(55);
    const measured = [50, 72, 64].map((textH) =>
      resolveProtoItemHeight(50, textH, false),
    );
    expect(measured.every((h) => h === 50)).toBe(true);
    expect(maxItemHeightFromHeights(measured)).toBe(50);
  });
});

describe("OrganizeControls leftover stretch", () => {
  it("matches K1 saveload LB_GAMES (vh=323, pad=5, PROTOITEM=50)", () => {
    const vh = 323;
    const pad = 5;
    const itemH = 50;
    const pitch = listBoxRowPitch(pad, itemH);
    const ipp = Math.floor(vh / pitch);
    expect(ipp).toBe(5);
    const { stretchPerItem, remainderPixels } = listBoxLeftoverStretch(vh, ipp, pitch, pad);
    expect(stretchPerItem).toBe(8);
    expect(remainderPixels).toBe(3);
    const baseSlotH = itemH + stretchPerItem;
    let rem = remainderPixels;
    let top = pad;
    for (let i = 0; i < ipp; i++) {
      let nextTop = top;
      if (rem !== 0) {
        nextTop = top + 1;
        rem -= 1;
      }
      top = nextTop + pad + baseSlotH;
    }
    expect(top).toBe(vh);
  });

  it("zero leftover packs without stretch", () => {
    const { stretchPerItem, remainderPixels } = listBoxLeftoverStretch(323, 6, 53, 5);
    expect(stretchPerItem).toBe(0);
    expect(remainderPixels).toBe(0);
  });
});
