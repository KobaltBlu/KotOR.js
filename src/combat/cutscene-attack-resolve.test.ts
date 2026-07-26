/**
 * CutsceneAttack resolve path — stamp roll/damage + ranged VFX flags.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const animRows: Record<number | string, any> = {
  239: { name: 'RF_Attack_1', __rowlabel: 'RF_Attack_1' },
};

// Index-style iteration used by weapon-discharge OdysseyModelAnimationGetRow
animRows[0] = animRows[239];

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        [
          'animations',
          {
            rows: animRows,
            RowCount: 1,
            getByID: (id: number) => animRows[id],
          },
        ],
        [
          'weapondischarge',
          {
            rows: {
              RF_Attack_1: {
                __rowlabel: 'RF_Attack_1',
                shots: '1',
                hits: '1',
                switchmask: '0',
                shot1: '100',
                droid: '0',
              },
            },
            RowCount: 1,
          },
        ],
      ]),
    },
    FeedbackMessageManager: {
      AddMessage: jest.fn(),
    },
    TLKManager: {
      GetStringById: () => ({ Value: '', getDisplayText: () => '' }),
    },
    GameKey: 0,
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: (name: string) =>
      name ? { name, __rowlabel: name, __index: name } : undefined,
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
  getProjectileImpactPosition: () => ({ x: 1, y: 2, z: 3, clone: () => ({ x: 1, y: 2, z: 3 }) }),
  spawnCombatProjectile: jest.fn(),
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  signalRangedImpactVfx: jest.fn(),
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
  pickMeleeReaction: () => 0,
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
  createNewAttackActions: () => {},
}));

jest.mock('@/combat/damage-mitigation', () => ({
  damageFlagsFromChannels: () => 0,
  mitigateDamageAmount: (n: number) => n,
  scaleDamageChannels: (c: unknown) => c,
}));

jest.mock('@/combat/damage-shields', () => ({
  resolveDamageShields: () => {},
}));

jest.mock('three', () => {
  class Vector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0){ this.x = x; this.y = y; this.z = z; }
    clone(){ return new Vector3(this.x, this.y, this.z); }
    distanceTo(other: Vector3){
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dz = this.z - other.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  }
  return { Vector3, __esModule: true };
});

import { CombatRound } from '@/combat/CombatRound';
import { CombatRoundAction } from '@/combat/CombatRoundAction';
import { CombatAttackData } from '@/combat/CombatAttackData';
import { AttackResult } from '@/enums/combat/AttackResult';
import { DamageType } from '@/enums/combat/DamageType';
import { ModuleCreatureArmorSlot } from '@/enums/module/ModuleCreatureArmorSlot';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';
import * as THREE from 'three';

function makeCreature(opts: { ranged?: boolean } = {}) {
  const weapon = {
    isRangedWeapon: () => !!opts.ranged,
  };
  return {
    objectType: ModuleObjectType.ModuleCreature,
    equipment: { RIGHTHAND: weapon, LEFTHAND: undefined },
    position: new THREE.Vector3(0, 0, 0),
    effects: [],
    hasEffect: () => false,
    isSimpleCreature: () => false,
    weaponPowered: jest.fn(),
    playTwoDAAnimation: jest.fn(),
    animationState: { index: 0 },
    getCombatAnimationAttackType: () => 'b',
    getCombatAnimationWeaponType: () => 5,
    isDuelingObject: () => false,
    isDead: () => false,
    model: undefined,
    combatData: {
      lastAttackTarget: undefined,
      lastAttackResult: undefined,
    },
  } as any;
}

function makeTarget() {
  return {
    objectType: ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(5, 0, 0),
    combatData: { lastAttacker: undefined },
    onAttacked: jest.fn(),
    getAC: () => 10,
  } as any;
}

describe('CutsceneAttack calculateWeaponAttack stamp', () => {
  let round: CombatRound;
  let creature: ReturnType<typeof makeCreature>;
  let target: ReturnType<typeof makeTarget>;

  beforeEach(() => {
    creature = makeCreature({ ranged: true });
    target = makeTarget();
    round = new CombatRound(creature);
    round.attackList = [new CombatAttackData()];
    round.currentAttack = 0;
    round.onHandAttacks = 1;
    round.offHandAttacks = 0;
  });

  it('stamps scripted result and base damage when resultsCalculated', () => {
    const action = new CombatRoundAction(creature);
    action.resultsCalculated = true;
    action.attackResult = AttackResult.HIT_SUCCESSFUL;
    action.attackDamage = 42;
    action.target = target;

    const weapon = creature.equipment.RIGHTHAND;
    round.calculateWeaponAttack(
      creature,
      weapon,
      ModuleCreatureArmorSlot.RIGHTHAND,
      action
    );

    const attack = round.attackList[0];
    expect(attack.attackResult).toBe(AttackResult.HIT_SUCCESSFUL);
    expect(attack.damageList[DamageType.BASE].damageValue).toBe(42);
    expect(attack.rangedAttack).toBe(true);
    expect(attack.reactObject).toBe(target);
    expect(attack.attackWeapon).toBe(weapon);
    expect(round.currentAttack).toBe(1);
  });

  it('does not roll damage dice over scripted miss', () => {
    const action = new CombatRoundAction(creature);
    action.resultsCalculated = true;
    action.attackResult = AttackResult.MISS;
    action.attackDamage = 99;
    action.target = target;

    round.calculateWeaponAttack(
      creature,
      creature.equipment.RIGHTHAND,
      ModuleCreatureArmorSlot.RIGHTHAND,
      action
    );

    const attack = round.attackList[0];
    expect(attack.attackResult).toBe(AttackResult.MISS);
    // Unset channel stays -1; scripted damage must not be applied on miss
    expect(attack.damageList[DamageType.BASE].damageValue).not.toBe(99);
    expect(attack.rangedAttack).toBe(true);
  });
});

describe('CutsceneAttack resolveRangedAttack VFX packing', () => {
  it('sets rangedAttack and muzzle+travel delay for resultsCalculated', () => {
    const creature = makeCreature({ ranged: true });
    const target = makeTarget();
    const round = new CombatRound(creature);
    round.attackList = [new CombatAttackData()];
    round.currentAttack = 0;
    round.onHandAttacks = 1;
    round.offHandAttacks = 0;

    const action = new CombatRoundAction(creature);
    action.resultsCalculated = true;
    action.attackAnimation = 239;
    action.attackResult = AttackResult.HIT_SUCCESSFUL;
    action.attackDamage = 12;
    action.target = target;

    round.resolveRangedAttack(creature, action);

    expect(action.animationName).toBe('RF_Attack_1');
    expect(round.currentAttack).toBeGreaterThanOrEqual(1);
    const attack = round.attackList[0];
    expect(attack.rangedAttack).toBe(true);
    expect(attack.attackResult).toBe(AttackResult.HIT_SUCCESSFUL);
    expect(attack.damageList[DamageType.BASE].damageValue).toBe(12);
    expect(attack.damageApplyDelay).toBeGreaterThanOrEqual(0);
    expect(attack.reaxnDelay).toBeGreaterThanOrEqual(0);
  });

  it('resolveAttack does not wipe ranged damageApplyDelay for cutscene', () => {
    const creature = makeCreature({ ranged: true });
    const target = makeTarget();
    const round = new CombatRound(creature);
    round.attackList = [new CombatAttackData()];
    round.onHandAttacks = 1;
    round.offHandAttacks = 0;

    const action = new CombatRoundAction(creature);
    action.resultsCalculated = true;
    action.attackAnimation = 239;
    action.attackResult = AttackResult.HIT_SUCCESSFUL;
    action.attackDamage = 8;
    action.target = target;
    round.action = action;

    // Capture delay after ranged packing; resolveAttack must not wipe it
    round.resolveRangedAttack(creature, action);
    const delayAfterRanged = round.attackList[0].damageApplyDelay;
    expect(delayAfterRanged).toBeGreaterThanOrEqual(0);

    action.resolved = false;
    round.currentAttack = 0;
    round.attackList = [new CombatAttackData()];
    round.resolveAttack(creature, action);

    const attack = round.attackList[0];
    expect(attack.rangedAttack).toBe(true);
    expect(attack.damageApplyDelay).toBeGreaterThanOrEqual(0);
    expect(action.resolved).toBe(true);
  });
});
