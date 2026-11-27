/**
 * TSL Mobility feat +0.1 movement rate (G15).
 * @jest-environment node
 */
import { describe, expect, it } from "@jest/globals";
import {
  applyMobilityMovementBonus,
  clampMovementRateFactor,
} from "@engine/pathfinding/locomotion";

describe("TSL Mobility movement factor (G15)", () => {
  it("adds +0.1 then clamps when Mobility feat is present on TSL", () => {
    const raw = applyMobilityMovementBonus(1.0, true, true);
    expect(raw).toBeCloseTo(1.1, 5);
    expect(clampMovementRateFactor(raw)).toBeCloseTo(1.1, 5);
  });

  it("does not add bonus on K1 or without feat", () => {
    expect(applyMobilityMovementBonus(1.0, true, false)).toBe(1.0);
    expect(applyMobilityMovementBonus(1.0, false, true)).toBe(1.0);
  });

  it("clamps Mobility stack at 1.5 max", () => {
    const raw = applyMobilityMovementBonus(1.5, true, true);
    expect(clampMovementRateFactor(raw)).toBe(1.5);
  });
});
