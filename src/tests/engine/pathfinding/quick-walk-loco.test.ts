/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockGameState = {
  PartyManager: { party: [], FollowState: 0 },
  ModuleObjectManager: { GetObjectById: () => undefined },
  module: undefined as undefined,
  GameKey: "KOTOR",
};

jest.mock("@/GameState", () => ({
  GameState: mockGameState,
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: () => ({ ok: true, code: 1, clearPoint: {}, clearT: 1 }),
  TestDirectLineCode: { Ok: 1 },
}));

jest.mock("@/engine/pathfinding/test-safe-location-point", () => ({
  testSafeLocationPoint: () => true,
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

import {
  FORCE_PUSH_LOCO_STATE,
  QuickWalkLocoState,
  getQuickWalkLocoState,
  isForcePushLocoActive,
  isFollowLeaderLocoActive,
  isQuickWalkPaused,
  setQuickWalkLocoState,
} from "@/engine/pathfinding/quick-walk-loco";
import {
  computeFollowStepBudget,
  getEffectiveFollowRate,
} from "@/engine/pathfinding/follow-leader-sm";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import type { ModuleCreature } from "@/module/ModuleCreature";

function makeCreature(partial: Record<string, unknown> = {}): ModuleCreature {
  return {
    quickWalkLocoState: QuickWalkLocoState.PathWalk,
    stealthMode: false,
    movementSpeed: 1,
    walkSpeedFactor: 0,
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
    getHasFeat: () => false,
    ...partial,
  } as unknown as ModuleCreature;
}

describe("QuickWalkLocoState", () => {
  it("installs FollowLeader mode 3 and ForcePush mode 4", () => {
    const creature = makeCreature();
    setQuickWalkLocoState(creature, QuickWalkLocoState.FollowLeader);
    expect(getQuickWalkLocoState(creature)).toBe(3);
    expect(isFollowLeaderLocoActive(creature)).toBe(true);
    expect(isForcePushLocoActive(creature)).toBe(false);

    setQuickWalkLocoState(creature, FORCE_PUSH_LOCO_STATE);
    expect(getQuickWalkLocoState(creature)).toBe(4);
    expect(isForcePushLocoActive(creature)).toBe(true);
    expect(isFollowLeaderLocoActive(creature)).toBe(false);
  });

  it("Paused (1) early-out gate", () => {
    const creature = makeCreature();
    setQuickWalkLocoState(creature, QuickWalkLocoState.Paused);
    expect(isQuickWalkPaused(creature)).toBe(true);
  });

  it("ForceJump loco modes 5/6 count as active", () => {
    const creature = makeCreature({ quickWalkLocoState: 5 });
    expect(isForcePushLocoActive(creature)).toBe(true);
    setQuickWalkLocoState(creature, QuickWalkLocoState.ForceJumpTarget);
    expect(isForcePushLocoActive(creature)).toBe(true);
  });
});

describe("getEffectiveFollowRate / computeFollowStepBudget", () => {
  beforeEach(() => {
    mockGameState.PartyManager.party = [];
  });

  it("applies movementSpeed to walk/run base", () => {
    const creature = makeCreature({ movementSpeed: 1.5 });
    expect(getEffectiveFollowRate(creature, false)).toBeCloseTo(1.7 * 1.5);
    expect(getEffectiveFollowRate(creature, true)).toBeCloseTo(5.4 * 1.5);
  });

  it("stealth without STEALTH_RUN forces walk rate", () => {
    const creature = makeCreature({
      stealthMode: true,
      getHasFeat: () => false,
    });
    expect(getEffectiveFollowRate(creature, true)).toBeCloseTo(1.7);
  });

  it("STEALTH_RUN allows run while stealthed", () => {
    const creature = makeCreature({
      stealthMode: true,
      getHasFeat: (feat: number) => feat === CombatFeatType.STEALTH_RUN,
    });
    expect(getEffectiveFollowRate(creature, true)).toBeCloseTo(5.4);
  });

  it("budget uses follow bands and updates walkSpeedFactor", () => {
    const creature = makeCreature({ walkSpeedFactor: 0.5 });
    const budget = computeFollowStepBudget(creature, true, 20, 20, 0.1);
    expect(budget).toBeGreaterThan(0);
    expect(creature.walkSpeedFactor).toBeGreaterThan(0.5);
    const near = makeCreature({ walkSpeedFactor: 1 });
    const far = makeCreature({ walkSpeedFactor: 1 });
    const nearBudget = computeFollowStepBudget(near, true, 0.5, 0.5, 0.1);
    const farBudget = computeFollowStepBudget(far, true, 20, 20, 0.1);
    expect(farBudget).toBeGreaterThan(nearBudget);
  });
});
