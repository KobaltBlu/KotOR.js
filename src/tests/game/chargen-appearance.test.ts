import { describe, expect, it } from "@jest/globals";
import {
  buildCharGenPortraitList,
  getCharGenSlotSoundSet,
  resolveCharGenAppearanceHead,
  CHARGEN_SLOT_SOUNDSET,
} from "@/engine/rules/chargen-appearance";
import type { SWPortrait } from "@/engine/rules/SWPortrait";
import { SWPortrait as SWPortraitClass } from "@/engine/rules/SWPortrait";
import type { SWCreatureAppearance } from "@/engine/rules/SWCreatureAppearance";

function makePortrait(partial: Partial<SWPortrait> & { id: number }): SWPortrait {
  const p = new SWPortraitClass();
  Object.assign(p, {
    id: partial.id,
    appearancenumber: partial.appearancenumber ?? -1,
    baseresref: partial.baseresref ?? `p${partial.id}`,
    sex: partial.sex ?? 0,
    race: partial.race ?? 6,
    plot: partial.plot ?? 0,
    lowgore: partial.lowgore ?? 0,
    appearance_s: partial.appearance_s ?? -1,
    appearance_l: partial.appearance_l ?? -1,
    forpc: partial.forpc ?? 0,
    baseresrefe: '',
    baseresrefve: '',
    baseresrefvve: '',
    baseresrefvvve: '',
  });
  return p;
}

describe("chargen-appearance helpers", () => {
  it("exposes retail classSelection soundsets", () => {
    expect(CHARGEN_SLOT_SOUNDSET).toEqual([85, 85, 85, 83, 83, 83]);
    expect(getCharGenSlotSoundSet(0)).toBe(85);
    expect(getCharGenSlotSoundSet(5)).toBe(83);
  });

  it("filters portraits by Sex + ForPC and class appearance column", () => {
    const portraits = [
      makePortrait({ id: 0, sex: 0, forpc: 1, appearance_l: 10, appearancenumber: 20, appearance_s: 30 }),
      makePortrait({ id: 1, sex: 1, forpc: 1, appearance_l: 11, appearancenumber: 21, appearance_s: 31 }),
      makePortrait({ id: 2, sex: 0, forpc: 0, appearance_l: 12, appearancenumber: 22, appearance_s: 32 }),
      makePortrait({ id: 3, sex: 0, forpc: 1, appearance_l: 13, appearancenumber: 23, appearance_s: 33 }),
    ];

    const soldierMale = buildCharGenPortraitList(portraits, 0, 0);
    expect(soldierMale).toEqual([
      { portraitId: 0, appearanceId: 10 },
      { portraitId: 3, appearanceId: 13 },
    ]);

    const scoutMale = buildCharGenPortraitList(portraits, 1, 0);
    expect(scoutMale).toEqual([
      { portraitId: 0, appearanceId: 20 },
      { portraitId: 3, appearanceId: 23 },
    ]);

    const scoundrelFemale = buildCharGenPortraitList(portraits, 2, 1);
    expect(scoundrelFemale).toEqual([
      { portraitId: 1, appearanceId: 31 },
    ]);
  });

  it("resolves Appearance_Head from appearance.2da normalhead", () => {
    const appearances = [
      { normalhead: 5 },
      { normalhead: -1 },
    ] as SWCreatureAppearance[];
    expect(resolveCharGenAppearanceHead(appearances, 0)).toBe(5);
    expect(resolveCharGenAppearanceHead(appearances, 1)).toBe(0xff);
    expect(resolveCharGenAppearanceHead(undefined, 0)).toBe(0xff);
  });
});
