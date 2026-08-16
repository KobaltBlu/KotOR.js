import { describe, expect, test } from "@jest/globals";
import { encounterDifficultyValueAt } from "@/apps/forge/helpers/encounterDifficultyValue";

describe("encounterDifficultyValueAt", () => {
  test("uses the 2DA VALUE column when the row exists", () => {
    expect(encounterDifficultyValueAt(1, [{ value: 0 }, { value: 5 }])).toBe(5);
  });

  test("falls back to the index when the row is missing", () => {
    expect(encounterDifficultyValueAt(2, [])).toBe(2);
    expect(encounterDifficultyValueAt(3, undefined)).toBe(3);
    expect(encounterDifficultyValueAt(0, [{ value: Number.NaN }])).toBe(0);
  });
});
