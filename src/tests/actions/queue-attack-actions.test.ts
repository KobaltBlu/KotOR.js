/**
 * QueueAttackActions sticky / nearest behavior (end combat round).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetNearestEnemy = jest.fn();
const mockShowObject = jest.fn();
let mockPlayer: any = { id: 1 };

jest.mock('@/combat/nearest-enemy', () => ({
  getNearestEnemy: (...args: unknown[]) => mockGetNearestEnemy(...args),
  explainNearestEnemyMiss: () => ({}),
}));

jest.mock('@/combat/attack-range', () => ({
  maxCleaveRange: () => 10,
}));

jest.mock('@/combat/duel-debug', () => ({
  duelLog: () => {},
  duelWho: (o: { id?: number } | undefined) => o?.id ?? 'none',
}));

jest.mock('@/GameState', () => ({
  GameState: {
    getCurrentPlayer: () => mockPlayer,
    ModuleObjectManager: {
      showObject: (...args: unknown[]) => mockShowObject(...args),
    },
  },
}));

jest.mock('@/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (obj: unknown) => !!obj,
  },
}));

import { queueAttackActions } from '@/combat/queue-attack-actions';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

function makeCreature(overrides: Record<string, unknown> = {}) {
  const targetA = {
    id: 10,
    isDead: () => false,
  };
  const targetB = {
    id: 20,
    isDead: () => false,
  };
  const creature: any = {
    id: 1,
    isDead: () => false,
    isHostile: (t: { id: number }) => t.id === 10 || t.id === 20,
    attackCreature: jest.fn(),
    clearCombatMode: jest.fn(),
    animationState: { index: ModuleCreatureAnimState.READY },
    setAnimationState: jest.fn(),
    combatData: {
      lastAttackTarget: targetA,
      lastAttemptedAttackTarget: targetA,
      lastAttacker: targetB,
    },
    combatRound: {
      newAttackTarget: targetA,
      scheduledActionList: [] as unknown[],
      specialAttackList: [] as unknown[],
      setAttackTarget: jest.fn(),
    },
    ...overrides,
  };
  creature._A = targetA;
  creature._B = targetB;
  mockPlayer = creature;
  return creature;
}

describe('queueAttackActions', () => {
  beforeEach(() => {
    mockGetNearestEnemy.mockReset();
    mockShowObject.mockReset();
  });

  it('keeps a non-empty attack queue when sticky target is still valid', () => {
    const creature = makeCreature();
    const queued = { target: creature._A };
    creature.combatRound.scheduledActionList = [queued];

    expect(queueAttackActions(creature)).toBe(false);
    expect(mockGetNearestEnemy).not.toHaveBeenCalled();
    expect(creature.attackCreature).not.toHaveBeenCalled();
    expect(creature.combatRound.scheduledActionList).toEqual([queued]);
  });

  it('re-queues the sticky target when the schedule is empty', () => {
    const creature = makeCreature();
    creature.combatData.lastAttacker = creature._A;

    expect(queueAttackActions(creature)).toBe(true);
    expect(mockGetNearestEnemy).not.toHaveBeenCalled();
    expect(creature.attackCreature).toHaveBeenCalledWith(creature._A);
    // clears lastAttacker when it equals the (re)queued target
    expect(creature.combatData.lastAttacker).toBeUndefined();
  });

  it('does not retarget to lastAttacker when sticky is valid', () => {
    const creature = makeCreature();
    mockGetNearestEnemy.mockReturnValue(creature._B);

    queueAttackActions(creature);

    expect(creature.attackCreature).toHaveBeenCalledWith(creature._A);
    expect(creature.attackCreature).not.toHaveBeenCalledWith(creature._B);
    // Other attacker remains bookkeeping only — does not become attack target
    expect(creature.combatData.lastAttacker).toBe(creature._B);
  });

  it('uses GetNearestEnemy when forceNearest after sticky death', () => {
    const creature = makeCreature();
    creature.combatRound.newAttackTarget = undefined;
    creature.combatRound.scheduledActionList = [{ target: creature._A }];
    mockGetNearestEnemy.mockReturnValue(creature._B);

    expect(queueAttackActions(creature, { forceNearest: true })).toBe(true);
    expect(mockGetNearestEnemy).toHaveBeenCalled();
    expect(creature.attackCreature).toHaveBeenCalledWith(creature._B);
    expect(creature.combatRound.setAttackTarget).toHaveBeenCalledWith(creature._B);
    expect(mockShowObject).toHaveBeenCalledWith(creature._B, true, false);
  });

  it('uses GetNearestEnemy when sticky is missing and schedule is empty', () => {
    const creature = makeCreature();
    creature.combatRound.newAttackTarget = undefined;
    mockGetNearestEnemy.mockReturnValue(creature._B);

    expect(queueAttackActions(creature)).toBe(true);
    expect(creature.attackCreature).toHaveBeenCalledWith(creature._B);
  });
});
