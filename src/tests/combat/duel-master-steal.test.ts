/**
 * Duel master steal must release the prior infinitePause slave.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const objectMap = new Map<number, any>();

jest.mock('@/GameState', () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: () => undefined,
    },
    ModuleObjectManager: {
      GetObjectById: (id: number) => objectMap.get(id),
    },
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

jest.mock('@/engine/pathfinding/visual-los', () => ({
  hasVisualLos: () => true,
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  signalRangedImpactVfx: jest.fn(),
  spawnWorldImpactVfx: jest.fn(),
}));

jest.mock('@/combat/attack-summary-feedback', () => ({
  formatAttackSummaryFeedback: () => ({ message: '', color: 0 }),
  AttackSummaryStrRef: {},
}));

jest.mock('@/combat/duel-debug', () => ({
  duelLog: () => {},
  duelWho: () => '',
}));

jest.mock('@/combat/combat-round-pause', () => ({
  shouldEndRoundOnPauseExpiry: () => false,
  shouldSnapCombatReady: () => false,
}));

jest.mock('@/combat/queue-attack-actions', () => ({
  queueAttackActions: jest.fn(() => false),
}));

jest.mock('@/combat/damage-mitigation', () => ({
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

import { CombatRound } from '@/combat/CombatRound';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';

function makeCreature(id: number){
  const combatData = {
    lastAttackTarget: undefined as any,
    lastAttemptedAttackTarget: undefined as any,
    lastCombatFeatUsed: undefined as any,
    lastForcePowerUsed: undefined as any,
    lastAttackAction: undefined as any,
    lastAttackResult: undefined as any,
  };
  const creature: any = {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    combatData,
    combatRound: undefined as CombatRound | undefined,
    actionQueue: { actionTypeExists: () => false, add: jest.fn() },
    isDead: () => false,
    isSimpleCreature: () => true,
    onCombatRoundEnd: jest.fn(),
    bodyFuel: false,
    equipment: { RIGHTHAND: undefined, LEFTHAND: undefined },
  };
  creature.combatRound = new CombatRound(creature);
  objectMap.set(id, creature);
  return creature;
}

describe('CombatRound duel master steal', () => {
  beforeEach(() => {
    objectMap.clear();
  });

  it('releases prior infinitePause slave when master is stolen into a new duel', () => {
    // A master of B; C then starts engaged master duel against A (A becomes slave of C).
    const a = makeCreature(7001);
    const b = makeCreature(7002);
    const c = makeCreature(7003);
    const aRound = a.combatRound as CombatRound;
    const bRound = b.combatRound as CombatRound;
    const cRound = c.combatRound as CombatRound;

    aRound.startCombatRound(b, true, true, 0);
    bRound.startCombatRound(a, true, false, 0);
    bRound.pauseRound(a, 1500, true);

    expect(aRound.master).toBe(true);
    expect(aRound.duelPartner).toBe(b);
    expect(bRound.duelPartner).toBe(a);
    expect(bRound.infinitePause).toBe(true);
    expect(bRound.engaged).toBe(true);
    expect(bRound.roundPaused).toBe(true);

    // Carth/C steals A the way ActionPhysicalAttacks does for an engaged master.
    cRound.startCombatRound(a, true, true, 0);
    aRound.startCombatRound(c, true, false, 0);
    aRound.pauseRound(c, 1500, true);

    expect(bRound.infinitePause).toBe(false);
    expect(bRound.engaged).toBe(false);
    expect(bRound.roundPaused).toBe(false);
    expect(bRound.duelPartner).toBeUndefined();
    expect(bRound.masterID).toBeUndefined();

    expect(cRound.master).toBe(true);
    expect(cRound.duelPartner).toBe(a);
    expect(aRound.duelPartner).toBe(c);
    expect(aRound.master).toBe(false);
    expect(aRound.engaged).toBe(true);
    expect(aRound.infinitePause).toBe(true);
  });

  it('keeps the same duel partner when master restarts against them', () => {
    const master = makeCreature(8001);
    const slave = makeCreature(8002);
    const masterRound = master.combatRound as CombatRound;
    const slaveRound = slave.combatRound as CombatRound;

    masterRound.startCombatRound(slave, true, true, 0);
    slaveRound.pauseRound(master, 1500, true);

    masterRound.startCombatRound(slave, true, true, 0);

    expect(slaveRound.infinitePause).toBe(true);
    expect(masterRound.duelPartner).toBe(slave);
    expect(slaveRound.duelPartner).toBe(master);
  });

  it('releases prior slave when becoming slave without a prior master link overwrite', () => {
    // A still points at B when forced into a slave round vs C (no C master start first).
    const a = makeCreature(9001);
    const b = makeCreature(9002);
    const c = makeCreature(9003);
    const aRound = a.combatRound as CombatRound;
    const bRound = b.combatRound as CombatRound;

    aRound.startCombatRound(b, true, true, 0);
    bRound.pauseRound(a, 1500, true);
    expect(bRound.infinitePause).toBe(true);

    aRound.startCombatRound(c, true, false, 0);

    expect(bRound.infinitePause).toBe(false);
    expect(bRound.engaged).toBe(false);
    expect(aRound.master).toBe(false);
    expect(aRound.engaged).toBe(true);
    expect(aRound.duelPartner).toBe(c);
  });
});
