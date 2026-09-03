/**
 * Mid-combat save/load resume helpers.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const objectMap = new Map<number, any>();

jest.mock('@/GameState', () => ({
  GameState: {
    ModuleObjectManager: {
      GetObjectById: (id: number) => objectMap.get(id),
    },
    getCurrentPlayer: () => undefined,
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
    GameKey: 0,
    AutoPauseManager: { SignalAutoPauseEvent: jest.fn() },
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: () => undefined,
  },
}));

jest.mock('@/effects', () => ({
  EffectDamage: class {},
}));

jest.mock('@/effects/effect-bonuses', () => ({
  getAttackEffectBonus: () => 0,
  getDamageIncreaseBonusesByChannel: () => [],
}));

jest.mock('@/engine/TextSprite3D', () => ({
  TextSprite3D: { CreateOnObject: jest.fn() },
}));

jest.mock('@/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => ({ x: 0, y: 0, z: 0, clone: () => ({ x: 0, y: 0, z: 0 }) }),
  spawnCombatProjectile: jest.fn(),
}));

jest.mock('@/combat/on-hit-visuals', () => ({
  resolveOnHitVisuals: jest.fn(),
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  signalRangedImpactVfx: jest.fn(),
  spawnWorldImpactVfx: jest.fn(),
}));

jest.mock('@/combat/attack-summary-feedback', () => ({
  formatAttackSummaryFeedback: () => ({ message: '', color: 0 }),
  AttackSummaryStrRef: {},
}));

jest.mock('@/combat/combat-floaty', () => ({
  shouldShowCombatFloaty: () => false,
}));

jest.mock('@/combat/combat-reaction-eligibility', () => ({
  canSyncMeleeReaction: () => false,
  canSyncRangedReaction: () => false,
  pickMeleeReaction: () => 0,
  pickRangedReaction: () => 0,
  rangedAttackHadLandingHit: () => false,
  isRangedDodgeBlockedAnimation: () => false,
  resolveMeleeReactionPlayback: () => {},
}));

jest.mock('@/combat/duel-debug', () => ({
  duelLog: () => {},
  duelWho: () => '',
}));

jest.mock('@/combat/combat-round-pause', () => ({
  shouldEndRoundOnPauseExpiry: () => false,
  shouldSnapCombatReady: () => false,
}));

jest.mock('@/combat/create-new-attack-actions', () => ({
  createNewAttackActions: jest.fn(() => false),
}));

jest.mock('@/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: (n: number) => n,
  scaleDamageChannels: (c: unknown) => c,
}));

jest.mock('@/combat/damage-shields', () => ({
  resolveDamageShields: () => {},
}));

jest.mock('@/combat/weapon-discharge', () => ({
  getProjectileMissLocation: () => ({ x: 0, y: 0, z: 0 }),
  getProjectileTravelDelayMs: () => 0,
  getWeaponDischargeHand: () => 0,
  getWeaponDischargeInfo: () => undefined,
  pickAttackShotIndices: () => [],
}));

jest.mock('three', () => {
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; }
    clone(){ return new Vector3(this.x, this.y, this.z); }
  }
  return { Vector3, MathUtils: { randInt: () => 0 }, __esModule: true };
});

import { GameEffect } from '@/effects/GameEffect';
import {
  lookupCombatObjectById,
  normalizeCombatObjectId,
} from '@/combat/resolve-combat-object-id';
import { CombatRound } from '@/combat/CombatRound';
import { CombatRoundAction } from '@/combat/CombatRoundAction';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { ModuleObjectConstant } from '@/enums/module/ModuleObjectConstant';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';
import { createNewAttackActions } from '@/combat/create-new-attack-actions';

function makeCreature(id: number){
  const combatData = {
    lastAttackTarget: undefined as any,
    lastAttemptedAttackTarget: undefined as any,
  };
  const creature: any = {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    combatData,
    combatRound: undefined as CombatRound | undefined,
    actionQueue: { actionTypeExists: () => false, add: jest.fn() },
    isDead: () => false,
    onCombatRoundEnd: jest.fn(),
    bodyFuel: false,
  };
  creature.combatRound = new CombatRound(creature);
  objectMap.set(id, creature);
  return creature;
}

describe('resolve-combat-object-id', () => {
  beforeEach(() => {
    objectMap.clear();
  });

  it('normalizes INVALID/0 to 0', () => {
    expect(normalizeCombatObjectId(0)).toBe(0);
    expect(normalizeCombatObjectId(ModuleObjectConstant.OBJECT_INVALID)).toBe(0);
    expect(normalizeCombatObjectId(42)).toBe(42);
  });

  it('looks up registered objects', () => {
    const a = makeCreature(1001);
    expect(lookupCombatObjectById(1001)).toBe(a);
    expect(lookupCombatObjectById(ModuleObjectConstant.OBJECT_INVALID)).toBeUndefined();
  });
});

describe('GameEffect deferred CreatorId / ObjectList', () => {
  beforeEach(() => {
    objectMap.clear();
  });

  it('resolves creator and object list after late registration', () => {
    const effect = new GameEffect();
    effect.setCreator(2001);
    effect.setObjectList([2002, 2003] as any);

    expect(effect.creator).toBe(2001);
    expect(effect.getObject(0)).toBe(2002);

    const creator = makeCreature(2001);
    const target = makeCreature(2002);
    makeCreature(2003);

    effect.resolveObjectReferences();
    expect(effect.creator).toBe(creator);
    expect(effect.getObject(0)).toBe(target);
  });

  it('initialize resolves object refs once', () => {
    makeCreature(3001);
    const effect = new GameEffect();
    effect.setCreator(3001);
    effect.initialize();
    expect(effect.creator?.id).toBe(3001);
    expect(effect.initialized).toBe(true);
  });
});

describe('CombatRound mid-load duel / schedule recovery', () => {
  beforeEach(() => {
    objectMap.clear();
    (createNewAttackActions as jest.Mock).mockClear();
  });

  it('wires bidirectional duelPartner after reconstruct', () => {
    const master = makeCreature(4001);
    const slave = makeCreature(4002);
    const masterRound = master.combatRound as CombatRound;
    const slaveRound = slave.combatRound as CombatRound;

    masterRound.roundStarted = true;
    masterRound.engaged = true;
    masterRound.master = true;
    masterRound.duelPartner = undefined;
    masterRound.dodgeTarget = slave;

    slaveRound.roundStarted = true;
    slaveRound.engaged = true;
    slaveRound.master = false;
    slaveRound.masterID = master;
    slaveRound.duelPartner = undefined;

    masterRound.resolveObjectReferences();
    slaveRound.resolveObjectReferences();

    expect(masterRound.duelPartner).toBe(slave);
    expect(slaveRound.duelPartner).toBe(master);
    expect(slaveRound.masterID).toBe(master);
  });

  it('retargets via createNewAttackActions when attack sched targets are missing', () => {
    const owner = makeCreature(5001);
    const foe = makeCreature(5002);
    const round = owner.combatRound as CombatRound;
    round.roundStarted = true;
    round.dodgeTarget = foe;

    const bad = new CombatRoundAction(owner);
    bad.actionType = CombatActionType.ATTACK;
    bad.target = undefined as any;
    round.scheduledActionList = [bad];

    round.recoverEmptyOrInvalidScheduleAfterLoad();

    expect(createNewAttackActions).toHaveBeenCalled();
    expect(owner.combatData.lastAttackTarget).toBe(foe);
  });

  it('ends round when schedule empty and no fallback target', () => {
    const owner = makeCreature(6001);
    const round = owner.combatRound as CombatRound;
    round.roundStarted = true;
    round.scheduledActionList = [];
    round.dodgeTarget = undefined;
    round.newAttackTarget = undefined;
    round.duelPartner = undefined;

    round.recoverEmptyOrInvalidScheduleAfterLoad();

    expect(round.roundStarted).toBe(false);
  });
});
