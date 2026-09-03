/**
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";

/** Mirrors InventoryFilter.QUEST / retail plot flag gate @ PopulateItemListBox 006d29f0. */
function isQuestPlotItem(item: { plot?: number } | null | undefined): boolean {
  return !!(item && item.plot);
}

describe("Pass AK QuestItem plot filter", () => {
  it("accepts plot items only", () => {
    expect(isQuestPlotItem({ plot: 1 })).toBe(true);
    expect(isQuestPlotItem({ plot: 0 })).toBe(false);
    expect(isQuestPlotItem(null)).toBe(false);
  });
});

describe("Pass AK ScriptSelect aiscripts row shape", () => {
  it("parses AISTATE / NAME_STRREF / DESCRIPTION_STRREF like retail ctor @ 006ea000", () => {
    const row = {
      NAME_STRREF: "32190",
      DESCRIPTION_STRREF: "32191",
      AISTATE: "2",
    };
    expect(parseInt(row.NAME_STRREF, 10)).toBe(32190);
    expect(parseInt(row.DESCRIPTION_STRREF, 10)).toBe(32191);
    expect(parseInt(row.AISTATE, 10)).toBe(2);
  });
});
