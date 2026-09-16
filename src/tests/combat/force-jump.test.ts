/**
 * ResolveMoveToForceJump gates + Force Jump destination helpers.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const addEffect = jest.fn();

jest.mock('@/GameState', () => ({
  GameState: {
    GameEffectFactory: {
      EffectForceJump: class {
        setCreator = jest.fn();
        setObject = jest.fn();
        setInt = jest.fn();
        initialize = jest.fn(function (this: unknown) { return this; });
      },
    },
  },
}));

jest.mock('@/engine/pathfinding/test-direct-line', () => ({
  TestDirectLineCode: { Fail: 0, Ok: 1, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  getWalkHeightAt: jest.fn(() => NaN),
  testDirectLine: jest.fn(() => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  })),
}));

jest.mock('@/combat/attack-range', () => ({
  getPathPersonalSpace: () => 0.35,
}));

jest.mock('@/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!(o as { __creature?: boolean })?.__creature,
}));

jest.mock('@/engine/pathfinding/ComputedPath', () => ({
  ComputedPath: {
    FromVector3List: (points: THREE.Vector3[]) => ({
      points: points.map((v) => ({ vector: v.clone() })),
      dispose: jest.fn(),
    }),
  },
}));

jest.mock('@/engine/pathfinding/update-creature-drive', () => ({
  DriveUpdateResult: { OK: 0, ARRIVED: 1, BLOCKED: 2 },
  updateCreatureDrive: jest.fn(() => 1),
}));

jest.mock('@/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (obj: unknown) => !!obj && typeof obj === 'object',
    InstanceOf: () => true,
  },
}));

import {
  FORCE_JUMP_MIN_DIST_SQ,
  resolveMoveToForceJump,
} from '@/combat/resolve-move-to-force-jump';
import {
  computeForceJumpDestination,
  computeForceJumpTargetShoveDestination,
  installForceJumpPath,
} from '@/engine/pathfinding/force-jump-quick-walk';
import { QuickWalkLocoState, getQuickWalkLocoState } from '@/engine/pathfinding/quick-walk-loco';
import { CombatFeatType } from '@/enums/combat/CombatFeatType';
import { testDirectLine } from '@/engine/pathfinding/test-direct-line';

function makeAttacker(overrides: Record<string, unknown> = {}) {
  return {
    __creature: true,
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    area: { id: 1 },
    pathFindIgnoreObjectId: 0,
    feats: new Set([CombatFeatType.FORCE_JUMP]),
    getHasFeat: function (id: number) {
      return (this as { feats: Set<number> }).feats.has(id);
    },
    combatRound: {
      isLightsaberEquipped: () => true,
    },
    addEffect,
    ...overrides,
  };
}

function makeTarget(pos = new THREE.Vector3(15, 0, 0)) {
  return {
    __creature: true,
    id: 2,
    position: pos,
    area: { id: 1 },
  };
}

describe('resolveMoveToForceJump', () => {
  beforeEach(() => {
    addEffect.mockClear();
    (testDirectLine as jest.Mock).mockReturnValue({
      ok: true,
      code: 1,
      clearPoint: new THREE.Vector3(),
      clearT: 1,
    });
  });

  it('fails without Force Jump feat', () => {
    const attacker = makeAttacker({
      feats: new Set(),
      getHasFeat: () => false,
    });
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(attacker as any, makeTarget() as any, out)).toBe(false);
    expect(addEffect).not.toHaveBeenCalled();
  });

  it('fails without lightsaber', () => {
    const attacker = makeAttacker({
      combatRound: { isLightsaberEquipped: () => false },
    });
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(attacker as any, makeTarget() as any, out)).toBe(false);
  });

  it('fails when already has a feat id', () => {
    const out = { featId: CombatFeatType.FLURRY };
    expect(resolveMoveToForceJump(makeAttacker() as any, makeTarget() as any, out)).toBe(false);
  });

  it('fails when closer than 10 units', () => {
    const out = { featId: 0 };
    const target = makeTarget(new THREE.Vector3(5, 0, 0));
    expect(resolveMoveToForceJump(makeAttacker() as any, target as any, out)).toBe(false);
    expect(FORCE_JUMP_MIN_DIST_SQ).toBe(100);
  });

  it('fails when TestDirectLine blocked', () => {
    (testDirectLine as jest.Mock).mockReturnValue({
      ok: false,
      code: 0,
      clearPoint: new THREE.Vector3(),
      clearT: 0,
    });
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(makeAttacker() as any, makeTarget() as any, out)).toBe(false);
  });

  it('applies EffectForceJump and stamps Mastery when owned', () => {
    const attacker = makeAttacker({
      feats: new Set([
        CombatFeatType.FORCE_JUMP,
        CombatFeatType.FORCE_JUMP_ADVANCED,
        CombatFeatType.FORCE_JUMP_MASTERY,
      ]),
    });
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(attacker as any, makeTarget() as any, out)).toBe(true);
    expect(out.featId).toBe(CombatFeatType.FORCE_JUMP_MASTERY);
    expect(addEffect).toHaveBeenCalledTimes(1);
  });

  it('stamps Advanced when Mastery missing', () => {
    const attacker = makeAttacker({
      feats: new Set([
        CombatFeatType.FORCE_JUMP,
        CombatFeatType.FORCE_JUMP_ADVANCED,
      ]),
    });
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(attacker as any, makeTarget() as any, out)).toBe(true);
    expect(out.featId).toBe(CombatFeatType.FORCE_JUMP_ADVANCED);
  });

  it('stamps base Force Jump otherwise', () => {
    const out = { featId: 0 };
    expect(resolveMoveToForceJump(makeAttacker() as any, makeTarget() as any, out)).toBe(true);
    expect(out.featId).toBe(CombatFeatType.FORCE_JUMP);
  });
});

describe('computeForceJumpDestination', () => {
  it('places dest at desired range along jumper→target', () => {
    const jumper = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(20, 0, 0);
    const r = computeForceJumpDestination(jumper, target, 2);
    expect(r.ok).toBe(true);
    expect(r.dest.x).toBeCloseTo(18);
    expect(r.dest.y).toBeCloseTo(0);
    expect(r.dir.x).toBeCloseTo(1);
  });

  it('shove dest is target + dir × range', () => {
    const shove = computeForceJumpTargetShoveDestination(
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(1, 0, 0),
      2
    );
    expect(shove.x).toBeCloseTo(22);
  });
});

describe('installForceJumpPath', () => {
  it('sets ForceJump loco 5 on jumper', () => {
    const creature: any = {
      position: new THREE.Vector3(0, 0, 0),
      area: undefined,
      quickWalkLocoState: 0,
      forcePushDistanceTraveled: 0,
      forcePushArrived: false,
      forcePushArriveElapsed: 0,
      setComputedPath: jest.fn(),
      getAppearance: () => ({}),
    };
    installForceJumpPath(
      creature,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      QuickWalkLocoState.ForceJump
    );
    expect(getQuickWalkLocoState(creature)).toBe(QuickWalkLocoState.ForceJump);
    expect(creature.setComputedPath).toHaveBeenCalled();
  });

  it('sets ForceJumpTarget loco 6 on shove', () => {
    const creature: any = {
      position: new THREE.Vector3(20, 0, 0),
      area: undefined,
      quickWalkLocoState: 0,
      forcePushDistanceTraveled: 0,
      forcePushArrived: false,
      forcePushArriveElapsed: 0,
      setComputedPath: jest.fn(),
      getAppearance: () => ({}),
    };
    installForceJumpPath(
      creature,
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(22, 0, 0),
      QuickWalkLocoState.ForceJumpTarget
    );
    expect(getQuickWalkLocoState(creature)).toBe(QuickWalkLocoState.ForceJumpTarget);
  });
});
