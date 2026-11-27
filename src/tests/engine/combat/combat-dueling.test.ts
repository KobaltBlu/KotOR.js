/**
 * Duel engaged / master resolution + missing-master pause recovery.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const objectMap = new Map<number, any>();
const party: any[] = [];

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: {
      GetObjectById: (id: number) => objectMap.get(id),
      GetClientObjectById: (id: number) => objectMap.get(id),
    },
    PartyManager: {
      getCurrentPlayer: () => party[0],
      get party(){ return party; },
    },
    TwoDAManager: { datatables: new Map() },
    FeedbackMessageManager: { AddMessage: jest.fn() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
    GameKey: 0,
    AutoPauseManager: { SignalAutoPauseEvent: jest.fn() },
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

jest.mock('@engine/combat/queue-attack-actions', () => ({
  queueAttackActions: jest.fn(() => false),
}));

jest.mock('@engine/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: (n: number) => n,
  scaleDamageChannels: (c: unknown) => c,
}));

jest.mock('three', () => {
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; }
    clone(){ return new Vector3(this.x, this.y, this.z); }
  }
  return { Vector3, MathUtils: { randInt: () => 0 }, __esModule: true };
});

import {
  resolveEngagedState,
  resolveMasterState,
} from '@engine/combat/combat-dueling';
import { CombatRound } from '@engine/combat/CombatRound';
import { CombatData } from '@engine/combat/CombatData';
import { GameObjectType } from '@core/enums/module/GameObjectType';

function makeCreature(id: number, opts: {
  partyMember?: boolean;
  debilitated?: boolean;
} = {}){
  const combatData = {
    lastAttackTarget: undefined as any,
    lastSpellTarget: undefined as any,
    lastAttemptedAttackTarget: undefined as any,
    lastCombatFeatUsed: undefined as any,
    lastForcePowerUsed: undefined as any,
    lastAttackAction: undefined as any,
    lastAttackResult: undefined as any,
  };
  const creature: any = {
    id,
    objectType: GameObjectType.Creature,
    combatData,
    combatRound: undefined as CombatRound | undefined,
    actionQueue: { actionTypeExists: () => false, add: jest.fn() },
    isDead: () => false,
    isSimpleCreature: () => true,
    isPartyMember: () => !!opts.partyMember,
    isDebilitated: () => !!opts.debilitated,
    isPM: !!opts.partyMember,
    onCombatRoundEnd: jest.fn(),
    bodyFuel: false,
    equipment: { RIGHTHAND: undefined, LEFTHAND: undefined },
  };
  creature.combatRound = new CombatRound(creature);
  objectMap.set(id, creature);
  return creature;
}

describe('resolveEngagedState', () => {
  let attacker: any;
  let target: any;
  let third: any;

  beforeEach(() => {
    objectMap.clear();
    party.length = 0;
    attacker = makeCreature(1);
    target = makeCreature(2);
    third = makeCreature(3);
  });

  it('engages when target has no round and no last-attack', () => {
    expect(resolveEngagedState(attacker, target)).toBe(true);
  });

  it('engages when target last-attack is the attacker', () => {
    target.combatRound.roundStarted = true;
    target.combatData.lastAttackTarget = attacker;
    expect(resolveEngagedState(attacker, target)).toBe(true);
  });

  it('engages when target last-spell is the attacker', () => {
    target.combatRound.roundStarted = true;
    target.combatData.lastAttackTarget = third;
    target.combatData.lastSpellTarget = attacker;
    expect(resolveEngagedState(attacker, target)).toBe(true);
  });

  it('engages when round started and last-attack empty', () => {
    target.combatRound.roundStarted = true;
    expect(resolveEngagedState(attacker, target)).toBe(true);
  });

  it('returns false for debilitated target after other checks', () => {
    target.isDebilitated = () => true;
    expect(resolveEngagedState(attacker, target)).toBe(false);
  });

  describe('party leader as target', () => {
    beforeEach(() => {
      party.push(target);
    });

    it('clears engaged when leader has no last-attack and no last-spell', () => {
      expect(resolveEngagedState(attacker, target)).toBe(false);
    });

    it('keeps engaged when leader last-attack is attacker and focus is clear', () => {
      target.combatRound.roundStarted = true;
      target.combatData.lastAttackTarget = attacker;
      expect(resolveEngagedState(attacker, target)).toBe(true);
    });

    it('clears engaged when leader last-attack is a third party', () => {
      target.combatRound.roundStarted = true;
      target.combatData.lastAttackTarget = third;
      expect(resolveEngagedState(attacker, target)).toBe(false);
    });

    it('clears engaged when leader last-spell points elsewhere', () => {
      target.combatRound.roundStarted = true;
      target.combatData.lastAttackTarget = attacker;
      target.combatData.lastSpellTarget = third;
      expect(resolveEngagedState(attacker, target)).toBe(false);
    });

    it('clears engaged when leader attempted-attack points elsewhere', () => {
      target.combatRound.roundStarted = true;
      target.combatData.lastAttackTarget = attacker;
      target.combatData.lastAttemptedAttackTarget = third;
      expect(resolveEngagedState(attacker, target)).toBe(false);
    });

    it('player order onto a new enemy stops the current duel partner re-engaging', () => {
      // Leader is dueling the attacker, sticky attempted still points at it.
      target.combatRound.roundStarted = true;
      target.combatData.lastAttackTarget = attacker;
      target.combatData.lastAttemptedAttackTarget = attacker;
      expect(resolveEngagedState(attacker, target)).toBe(true);

      CombatData.prototype.setAttemptedAttackTargetFromPlayerInput.call(target.combatData, third);
      expect(target.combatData.lastAttemptedAttackTarget).toBe(third);
      expect(resolveEngagedState(attacker, target)).toBe(false);
    });

    it('player order on the current target leaves attempted alone', () => {
      target.combatData.lastAttackTarget = attacker;
      target.combatData.lastAttemptedAttackTarget = undefined;
      CombatData.prototype.setAttemptedAttackTargetFromPlayerInput.call(target.combatData, attacker);
      expect(target.combatData.lastAttemptedAttackTarget).toBeUndefined();
    });

    it('keeps engaged when leader last-spell is attacker and no bad attempted', () => {
      target.combatData.lastSpellTarget = attacker;
      expect(resolveEngagedState(attacker, target)).toBe(true);
    });
  });
});

describe('resolveMasterState', () => {
  let attacker: any;
  let target: any;

  beforeEach(() => {
    objectMap.clear();
    party.length = 0;
    attacker = makeCreature(10);
    target = makeCreature(11);
  });

  it('returns false when not engaged', () => {
    expect(resolveMasterState(attacker, target, false)).toBe(false);
  });

  it('masters when target has no last-attack', () => {
    expect(resolveMasterState(attacker, target, true)).toBe(true);
  });

  it('masters when target last-attack is attacker and target is not master', () => {
    target.combatData.lastAttackTarget = attacker;
    target.combatRound.master = false;
    expect(resolveMasterState(attacker, target, true)).toBe(true);
  });

  it('party member always masters', () => {
    attacker = makeCreature(12, { partyMember: true });
    target.combatData.lastAttackTarget = makeCreature(13);
    target.combatRound.master = true;
    expect(resolveMasterState(attacker, target, true)).toBe(true);
  });

  it('yields when target already masters this pair', () => {
    target.combatData.lastAttackTarget = attacker;
    target.combatRound.engaged = true;
    target.combatRound.master = true;
    target.combatRound.duelPartner = attacker;
    expect(resolveMasterState(attacker, target, true)).toBe(false);
  });
});

describe('CombatRound missing-master recovery', () => {
  beforeEach(() => {
    objectMap.clear();
    party.length = 0;
  });

  it('ends infinitePaused slave round when masterID cannot be resolved', () => {
    const slave = makeCreature(20);
    const round = slave.combatRound as CombatRound;
    round.roundStarted = true;
    round.engaged = true;
    round.master = false;
    round.roundPaused = true;
    round.infinitePause = true;
    round.pauseTimer = 1500;
    round.masterID = undefined;

    round.update(0.016);

    expect(round.roundStarted).toBe(false);
    expect(round.infinitePause).toBe(false);
    expect(round.engaged).toBe(false);
  });

  it('keeps infinitePaused slave round while master object still exists', () => {
    const master = makeCreature(30);
    const slave = makeCreature(31);
    const round = slave.combatRound as CombatRound;
    round.roundStarted = true;
    round.engaged = true;
    round.master = false;
    round.roundPaused = true;
    round.infinitePause = true;
    round.pauseTimer = 1500;
    round.masterID = master;

    round.update(0.016);

    expect(round.roundStarted).toBe(true);
    expect(round.infinitePause).toBe(true);
    expect(round.engaged).toBe(true);
  });

  it('ends infinitePaused slave round when master was unregistered', () => {
    const master = makeCreature(40);
    const slave = makeCreature(41);
    const round = slave.combatRound as CombatRound;
    round.roundStarted = true;
    round.engaged = true;
    round.master = false;
    round.roundPaused = true;
    round.infinitePause = true;
    round.pauseTimer = 1500;
    round.masterID = master;
    objectMap.delete(master.id);

    round.update(0.016);

    expect(round.roundStarted).toBe(false);
    expect(round.infinitePause).toBe(false);
  });
});
