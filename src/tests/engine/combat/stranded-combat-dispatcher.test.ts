/**
 * Stranded schedule must get ActionCombat back when the dispatcher is missing.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const objectMap = new Map<number, any>();
const queueAdd = jest.fn();

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: () => undefined,
    },
    ModuleObjectManager: {
      GetObjectById: (id: number) => objectMap.get(id),
      showObject: jest.fn(),
    },
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
    GameKey: 0,
    AutoPauseManager: { SignalAutoPauseEvent: jest.fn() },
    ActionFactory: {
      ActionCombat: class ActionCombat {
        type = 0x3f;
        constructor(public actionId: number = -1) {}
      },
    },
  },
}));

jest.mock('@engine/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: () => undefined,
  },
}));

jest.mock('@engine/effects', () => ({
  EffectDamage: class {},
}));

jest.mock('@engine/effects/effect-bonuses', () => ({
  getAttackEffectBonus: () => 0,
  getDamageIncreaseBonusesByChannel: () => [],
}));

jest.mock('@engine/render/TextSprite3D', () => ({
  TextSprite3D: { CreateOnObject: jest.fn() },
}));

jest.mock('@engine/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => ({ x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }) }),
  spawnCombatProjectile: jest.fn(),
}));

jest.mock('@engine/pathfinding/visual-los', () => ({
  hasVisualLos: () => true,
}));

jest.mock('@engine/combat/ranged-impact-vfx', () => ({
  signalRangedImpactVfx: jest.fn(),
  spawnWorldImpactVfx: jest.fn(),
}));

jest.mock('@engine/combat/attack-summary-feedback', () => ({
  formatAttackSummaryFeedback: () => ({ message: '', color: 0 }),
  AttackSummaryStrRef: {},
}));

jest.mock('@engine/combat/duel-debug', () => ({
  duelLog: () => {},
  duelWho: () => '',
}));

jest.mock('@engine/combat/combat-round-pause', () => ({
  shouldEndRoundOnPauseExpiry: () => false,
  shouldSnapCombatReady: () => false,
}));

jest.mock('@engine/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: (n: number) => n,
  scaleDamageChannels: (c: unknown) => c,
}));

jest.mock('@engine/combat/nearest-enemy', () => ({
  getNearestEnemy: () => undefined,
  explainNearestEnemyMiss: () => ({}),
}));

jest.mock('@engine/combat/attack-range', () => ({
  maxCleaveRange: () => 10,
}));

jest.mock('three', () => {
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; }
    clone(){ return new Vector3(this.x, this.y, this.z); }
  }
  return { Vector3, MathUtils: { randInt: () => 0 }, __esModule: true };
});

import { CombatRound } from '@engine/combat/CombatRound';
import { CombatRoundAction } from '@engine/combat/CombatRoundAction';
import { CombatActionType } from '@core/enums/combat/CombatActionType';
import { ActionType } from '@core/enums/actions/ActionType';
import { ModuleObjectType } from '@core/enums/module/ModuleObjectType';
import { ensureCombatDispatcher } from '@engine/combat/ensure-combat-dispatcher';
import { queueAttackActions } from '@engine/combat/queue-attack-actions';

function makeCreature(id: number, opts?: { hasCombatDispatcher?: boolean }){
  const hasDispatcher = !!opts?.hasCombatDispatcher;
  const combatData = {
    lastAttackTarget: undefined as any,
    lastAttemptedAttackTarget: undefined as any,
    lastAttacker: undefined as any,
  };
  const actionQueue: any[] = [];
  (actionQueue as any).actionTypeExists = (type: ActionType) =>
    actionQueue.some((a) => a?.type === type);
  (actionQueue as any).add = (action: any) => {
    queueAdd(action);
    actionQueue.push(action);
  };

  if(hasDispatcher){
    actionQueue.push({ type: ActionType.ActionCombat });
  }

  const creature: any = {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    combatData,
    combatRound: undefined as CombatRound | undefined,
    actionQueue,
    isDead: () => false,
    isHostile: () => true,
    onCombatRoundEnd: jest.fn(),
    bodyFuel: false,
    attackCreature: jest.fn(),
    clearCombatMode: jest.fn(),
    setAnimationState: jest.fn(),
    animationState: { index: 0 },
  };
  creature.combatRound = new CombatRound(creature);
  objectMap.set(id, creature);
  return creature;
}

describe('ensureCombatDispatcher / stranded schedule', () => {
  beforeEach(() => {
    objectMap.clear();
    queueAdd.mockClear();
  });

  it('adds ActionCombat when schedule is non-empty and queue lacks dispatcher', () => {
    const creature = makeCreature(9001);
    const round = creature.combatRound as CombatRound;
    const scheduled = new CombatRoundAction(creature);
    scheduled.actionType = CombatActionType.ATTACK;
    round.scheduledActionList.push(scheduled);
    round.roundStarted = true;
    round.roundPaused = true;
    round.infinitePause = true;

    const added = ensureCombatDispatcher(creature);

    expect(added).toBe(true);
    expect(queueAdd).toHaveBeenCalledTimes(1);
    expect(creature.actionQueue.actionTypeExists(ActionType.ActionCombat)).toBe(true);
    expect(round.scheduledActionList.length).toBe(1);
  });

  it('does not add when ActionCombat already exists', () => {
    const creature = makeCreature(9002, { hasCombatDispatcher: true });
    const round = creature.combatRound as CombatRound;
    const scheduled = new CombatRoundAction(creature);
    scheduled.actionType = CombatActionType.ATTACK;
    round.scheduledActionList.push(scheduled);

    const added = ensureCombatDispatcher(creature);

    expect(added).toBe(false);
    expect(queueAdd).not.toHaveBeenCalled();
    expect(round.scheduledActionList.length).toBe(1);
  });

  it('does not add when schedule is empty', () => {
    const creature = makeCreature(9003);

    const added = ensureCombatDispatcher(creature);

    expect(added).toBe(false);
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('queueAttackActions keep-queue path restores missing dispatcher', () => {
    const creature = makeCreature(9004);
    const round = creature.combatRound as CombatRound;
    const sticky = makeCreature(9005);
    round.newAttackTarget = sticky;
    const scheduled = new CombatRoundAction(creature);
    scheduled.actionType = CombatActionType.ATTACK;
    scheduled.target = sticky;
    round.scheduledActionList.push(scheduled);

    const result = queueAttackActions(creature);

    expect(result).toBe(false);
    expect(creature.attackCreature).not.toHaveBeenCalled();
    expect(creature.actionQueue.actionTypeExists(ActionType.ActionCombat)).toBe(true);
    expect(round.scheduledActionList.length).toBe(1);
  });
});
