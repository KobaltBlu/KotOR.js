import { describe, expect, it } from "@jest/globals";
import { GameEngineType } from "@/enums/engine";
import { computeSkillPointsGained } from "@/engine/rules/skill-points";

describe("skill-points first-level CharGen formula", () => {
  it("computes K1 level-1 points", () => {
    // Soldier skillpointbase 1, INT 10 -> mod 0: floor sum capped to 4
    expect(computeSkillPointsGained(1, 10, 1, GameEngineType.KOTOR)).toBe(4);
    // Scout skillpointbase 4, INT 14 -> mod 2: (2 + 2) * 4 = 16
    expect(computeSkillPointsGained(4, 14, 1, GameEngineType.KOTOR)).toBe(16);
  });

  it("computes TSL level-1 points", () => {
    expect(computeSkillPointsGained(1, 10, 1, GameEngineType.TSL)).toBe(4);
    // TSL: (intMod + base) * 4 when sum > 1
    expect(computeSkillPointsGained(4, 14, 1, GameEngineType.TSL)).toBe(24);
  });
});
