import { describe, expect, test } from "@jest/globals";
import {
  featGffRowsToIds,
  featIdsToGffRows,
  skillGffRowsToRanks,
  skillRanksToGffRows,
  utcRuleSetHasClassOptions,
  utcRuleSetHasFeatGrid,
  utcRuleSetHasSkillGrid,
  utcRuleSetHasSpellGrid,
} from "@/apps/forge/components/tabs/tab-utc-editor/utcGffList";

describe("utc GFF fallbacks", () => {
  test("feat and spell grids stay off when rule tables are empty or unlabeled", () => {
    expect(utcRuleSetHasFeatGrid(undefined)).toBe(false);
    expect(utcRuleSetHasFeatGrid([])).toBe(false);
    expect(utcRuleSetHasFeatGrid([{ label: "", prereqFeat1: -1, prereqFeat2: -1 }])).toBe(false);
    expect(utcRuleSetHasSpellGrid(undefined, 1)).toBe(false);
    expect(utcRuleSetHasSpellGrid([{ userType: 1, prerequisites: [] }], 1)).toBe(true);
    expect(utcRuleSetHasSpellGrid([{ userType: 2, prerequisites: [] }], 1)).toBe(false);
  });

  test("labeled root feats with no prereqs enable the icon grid", () => {
    expect(utcRuleSetHasFeatGrid([
      { label: "Power Attack", prereqFeat1: -1, prereqFeat2: -1 },
    ])).toBe(true);
  });

  test("class and skill tables enable labeled UI only when rows exist", () => {
    expect(utcRuleSetHasClassOptions(undefined)).toBe(false);
    expect(utcRuleSetHasClassOptions([{ label: "" }])).toBe(false);
    expect(utcRuleSetHasClassOptions([{ label: "Soldier" }])).toBe(true);
    expect(utcRuleSetHasSkillGrid(undefined)).toBe(false);
    expect(utcRuleSetHasSkillGrid([{}])).toBe(true);
  });

  test("feat id lists map to Feat GFF rows and back", () => {
    expect(featIdsToGffRows([14, 3])).toEqual([{ Feat: 14 }, { Feat: 3 }]);
    expect(featGffRowsToIds([{ Feat: 14 }, { Feat: 3 }])).toEqual([14, 3]);
  });

  test("skill ranks map to Rank GFF rows and back", () => {
    expect(skillRanksToGffRows([0, 4, 1])).toEqual([{ Rank: 0 }, { Rank: 4 }, { Rank: 1 }]);
    expect(skillGffRowsToRanks([{ Rank: 0 }, { Rank: 4 }])).toEqual([0, 4]);
  });
});
