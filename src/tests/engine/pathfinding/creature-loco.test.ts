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

jest.mock("@/engine/pathfinding/walk-line-clear", () => ({
  hasWalkLineClear: () => ({ ok: true, code: 1, clearPoint: {}, clearT: 1 }),
  WalkLineHitCode: { Ok: 1 },
}));

jest.mock("@/engine/pathfinding/safe-walk-point", () => ({
  isSafeWalkPoint: () => true,
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

import {
  FORCE_PUSH_LOCO_STATE,
  CreatureLocoState,
  getCreatureLocoState,
  isForcePushLocoActive,
  isPartyFollowLocoActive,
  isCreatureLocoPaused,
  locoStateToWakePaused,
  setCreatureLocoState,
  tryWakePausedCreatureLoco,
} from "@/engine/pathfinding/creature-loco";
import {
  computeFollowStepBudget,
  getEffectiveFollowRate,
} from "@/engine/pathfinding/party-follow-sm";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleCreature } from "@/module/ModuleCreature";

function makeCreature(partial: Record<string, unknown> = {}): ModuleCreature {
  return {
    creatureLocoState: CreatureLocoState.PathWalk,
    stealthMode: false,
    movementSpeed: 1,
    walkSpeedFactor: 0,
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
    getHasFeat: () => false,
    ...partial,
  } as unknown as ModuleCreature;
}

describe("CreatureLocoState", () => {
  it("installs FollowLeader mode 3 and ForcePush mode 4", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.PartyFollow);
    expect(getCreatureLocoState(creature)).toBe(3);
    expect(isPartyFollowLocoActive(creature)).toBe(true);
    expect(isForcePushLocoActive(creature)).toBe(false);

    setCreatureLocoState(creature, FORCE_PUSH_LOCO_STATE);
    expect(getCreatureLocoState(creature)).toBe(4);
    expect(isForcePushLocoActive(creature)).toBe(true);
    expect(isPartyFollowLocoActive(creature)).toBe(false);
  });

  it("Paused (1) early-out gate", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.Paused);
    expect(isCreatureLocoPaused(creature)).toBe(true);
  });

  it("ForceJump loco modes 5/6 count as active", () => {
    const creature = makeCreature({ creatureLocoState: 5 });
    expect(isForcePushLocoActive(creature)).toBe(true);
    setCreatureLocoState(creature, CreatureLocoState.ForceJumpTarget);
    expect(isForcePushLocoActive(creature)).toBe(true);
  });
});

describe("tryWakePausedCreatureLoco", () => {
  it("wakes PathWalk for head ActionMoveToPoint", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.Paused);
    expect(
      tryWakePausedCreatureLoco(creature, ActionType.ActionMoveToPoint)
    ).toBe(true);
    expect(getCreatureLocoState(creature)).toBe(CreatureLocoState.PathWalk);
  });

  it("wakes PathWalk for Drive and ForceFollowObject", () => {
    const drive = makeCreature();
    setCreatureLocoState(drive, CreatureLocoState.Paused);
    expect(tryWakePausedCreatureLoco(drive, ActionType.ActionDrive)).toBe(true);
    expect(getCreatureLocoState(drive)).toBe(CreatureLocoState.PathWalk);

    const follow = makeCreature();
    setCreatureLocoState(follow, CreatureLocoState.Paused);
    expect(
      tryWakePausedCreatureLoco(follow, ActionType.ActionForceFollowObject)
    ).toBe(true);
    expect(getCreatureLocoState(follow)).toBe(CreatureLocoState.PathWalk);
  });

  it("wakes PartyFollow for head ActionFollowLeader", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.Paused);
    expect(
      tryWakePausedCreatureLoco(creature, ActionType.ActionFollowLeader)
    ).toBe(true);
    expect(getCreatureLocoState(creature)).toBe(CreatureLocoState.PartyFollow);
  });

  it("stays paused without a locomotion head action", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.Paused);
    expect(
      tryWakePausedCreatureLoco(creature, ActionType.ActionPhysicalAttacks)
    ).toBe(false);
    expect(isCreatureLocoPaused(creature)).toBe(true);
    expect(tryWakePausedCreatureLoco(creature, undefined)).toBe(false);
    expect(isCreatureLocoPaused(creature)).toBe(true);
  });

  it("is a no-op when not paused", () => {
    const creature = makeCreature();
    setCreatureLocoState(creature, CreatureLocoState.PathWalk);
    expect(
      tryWakePausedCreatureLoco(creature, ActionType.ActionMoveToPoint)
    ).toBe(true);
    expect(getCreatureLocoState(creature)).toBe(CreatureLocoState.PathWalk);
  });

  it("locoStateToWakePaused leaves ForcePush routing unchanged", () => {
    expect(locoStateToWakePaused(ActionType.ActionMoveToPoint)).toBe(
      CreatureLocoState.PathWalk
    );
    expect(locoStateToWakePaused(ActionType.ActionFollowLeader)).toBe(
      CreatureLocoState.PartyFollow
    );
    // Force-push modes are selected before wake; helper only maps head actions.
    const creature = makeCreature();
    setCreatureLocoState(creature, FORCE_PUSH_LOCO_STATE);
    expect(isForcePushLocoActive(creature)).toBe(true);
    expect(locoStateToWakePaused(ActionType.ActionMoveToPoint)).toBe(
      CreatureLocoState.PathWalk
    );
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
