import { describe, expect, it } from "@jest/globals";
import { costToDecreaseAbility, costToIncreaseAbility } from "@/engine/rules/ability-points";

describe("ability-points retail costs", () => {
  it("matches DetermineCostToIncreaseScore thresholds", () => {
    expect(costToIncreaseAbility(8)).toBe(1);
    expect(costToIncreaseAbility(13)).toBe(1);
    expect(costToIncreaseAbility(14)).toBe(2);
    expect(costToIncreaseAbility(15)).toBe(2);
    expect(costToIncreaseAbility(16)).toBe(3);
    expect(costToIncreaseAbility(18)).toBe(3);
  });

  it("matches DetermineCostToDecreaseScore refunds", () => {
    expect(costToDecreaseAbility(8)).toBe(0);
    expect(costToDecreaseAbility(9)).toBe(1);
    expect(costToDecreaseAbility(14)).toBe(1);
    expect(costToDecreaseAbility(15)).toBe(2);
    expect(costToDecreaseAbility(16)).toBe(2);
    expect(costToDecreaseAbility(17)).toBe(3);
  });

  it("keeps point-buy balanced across increase then decrease", () => {
    let score = 8;
    let points = 30;
    const cost = costToIncreaseAbility(score);
    expect(cost).toBeLessThanOrEqual(points);
    score += 1;
    points -= cost;
    expect(points).toBe(29);

    // Raise into the 2-point band.
    while(score < 14){
      const c = costToIncreaseAbility(score);
      points -= c;
      score += 1;
    }
    expect(score).toBe(14);
    expect(costToIncreaseAbility(score)).toBe(2);

    const paid = costToIncreaseAbility(score);
    score += 1;
    points -= paid;
    expect(score).toBe(15);

    const refund = costToDecreaseAbility(score);
    score -= 1;
    points += refund;
    expect(score).toBe(14);
    expect(refund).toBe(paid);
  });
});
