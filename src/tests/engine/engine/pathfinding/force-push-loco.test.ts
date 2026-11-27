/**
 * Force Push — on-apply / force-push loco helpers.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@engine/pathfinding/walk-line-clear', () => ({
  WalkLineHitCode: { Fail: 0, Ok: 1, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  getWalkHeightAt: jest.fn(() => NaN),
  hasWalkLineClear: jest.fn(() => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  })),
}));

jest.mock('@engine/pathfinding/ComputedPath', () => ({
  ComputedPath: {
    FromVector3List: (points: THREE.Vector3[]) => ({
      points: points.map((v) => ({ vector: v.clone() })),
      dispose: jest.fn(),
      owner: undefined,
      buildHelperLine: jest.fn(),
    }),
  },
}));

jest.mock('@engine/pathfinding/tick-creature-drive', () => ({
  DriveUpdateResult: { OK: 0, ARRIVED: 1, BLOCKED: 2 },
  tickCreatureDrive: jest.fn((creature: any, dest: THREE.Vector3, _run: boolean, delta: number, rate?: number) => {
    const speed = rate && rate > 0 ? rate : 1.7;
    const step = speed * Math.max(0, delta);
    const dx = dest.x - creature.position.x;
    const dy = dest.y - creature.position.y;
    const rem = Math.hypot(dx, dy);
    if(rem <= step || rem < 1e-4){
      creature.position.copy(dest);
      return 1; // ARRIVED
    }
    const t = step / rem;
    creature.position.x += dx * t;
    creature.position.y += dy * t;
    return 0; // OK
  }),
}));

jest.mock('@core/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (obj: any, _type: number) => !!obj && typeof obj === 'object',
    InstanceOf: () => true,
  },
}));

import {
  applyForcePushAIActivityMask,
  clipForcePushDestination,
  computeForcePushDestination,
  facingFromDirection,
  FORCE_PUSH_AI_ACTIVITY_MASK,
  FORCE_PUSH_DEFAULT_DISTANCE,
  FORCE_PUSH_LOCO_STATE,
  FORCE_PUSH_SPEED,
  tickForcePushLoco,
  installForcePushPath,
  resolveForcePushDistance,
  resolveForcePushOrigin,
  stampForcePushAttackSummary,
  updateForcePushAnimFlags,
  startForcePushSequence,
  tickForcePushSequence,
  isForcePushRecovering,
  FORCE_PUSH_ANIM_LAND,
  FORCE_PUSH_ANIM_GETUP,
} from '@engine/pathfinding/force-push-loco';
import { hasWalkLineClear } from '@engine/pathfinding/walk-line-clear';
import { CreatureLocoState } from '@engine/pathfinding/creature-loco';

function mockEffect(ints: number[] = [], floats: number[] = []) {
  return {
    getInt: (i: number) => ints[i] ?? 0,
    getFloat: (i: number) => floats[i] ?? 0,
  };
}

describe('resolveForcePushOrigin', () => {
  it('uses creator position when untargeted', () => {
    const r = resolveForcePushOrigin(
      mockEffect([0], []),
      new THREE.Vector3(1, 2, 3)
    );
    expect(r).toBeDefined();
    expect(r!.origin.x).toBeCloseTo(1);
    expect(r!.origin.y).toBeCloseTo(2);
    expect(r!.ignoreWalkLineClear).toBe(false);
  });

  it('returns undefined when untargeted without creator', () => {
    expect(resolveForcePushOrigin(mockEffect([0], []), undefined)).toBeUndefined();
  });

  it('uses float location and ignore flag when targeted', () => {
    const r = resolveForcePushOrigin(
      mockEffect([1, 1], [10, 20, 30]),
      new THREE.Vector3(0, 0, 0)
    );
    expect(r!.origin.x).toBeCloseTo(10);
    expect(r!.origin.y).toBeCloseTo(20);
    expect(r!.origin.z).toBeCloseTo(30);
    expect(r!.ignoreWalkLineClear).toBe(true);
  });
});

describe('resolveForcePushDistance', () => {
  it('defaults to 5 when float[3] is 0', () => {
    expect(resolveForcePushDistance(mockEffect([], []))).toBe(FORCE_PUSH_DEFAULT_DISTANCE);
  });

  it('uses float[3] when nonzero', () => {
    expect(resolveForcePushDistance(mockEffect([], [0, 0, 0, 8]))).toBe(8);
  });
});

describe('computeForcePushDestination', () => {
  it('pushes away from origin along creator→target', () => {
    const pos = new THREE.Vector3(5, 0, 0);
    const origin = new THREE.Vector3(0, 0, 0);
    const r = computeForcePushDestination(pos, origin, 5);
    expect(r.ok).toBe(true);
    expect(r.dest.x).toBeCloseTo(10, 5);
    expect(r.dest.y).toBeCloseTo(0, 5);
    expect(r.faceDir.x).toBeCloseTo(-1, 5);
  });

  it('returns ok=false when origin coincides with position', () => {
    const p = new THREE.Vector3(1, 1, 0);
    const r = computeForcePushDestination(p, p.clone(), 5);
    expect(r.ok).toBe(false);
    expect(r.dest.x).toBeCloseTo(1);
  });
});

describe('facingFromDirection', () => {
  it('maps +Y forward to facing 0', () => {
    expect(facingFromDirection(0, 1)).toBeCloseTo(0, 5);
  });
});

describe('clipForcePushDestination', () => {
  const creature = {
    position: new THREE.Vector3(0, 0, 0),
    id: 1,
    area: undefined as any,
    getAppearance: () => ({ height: 1.8 }),
  } as any;

  it('keeps dest when ignoreWalkLineClear is set', () => {
    const dest = new THREE.Vector3(5, 0, 0);
    const r = clipForcePushDestination(creature, dest, true);
    expect(r.x).toBeCloseTo(5);
  });

  it('stays put on walk-line clear / hasWalkLineClear Fail (0)', () => {
    creature.area = {};
    (hasWalkLineClear as jest.Mock).mockReturnValueOnce({
      ok: false,
      code: 0,
      clearPoint: new THREE.Vector3(2, 0, 0),
      clearT: 0,
    });
    const r = clipForcePushDestination(creature, new THREE.Vector3(5, 0, 0), false);
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(0);
    creature.area = undefined;
  });

  it('uses clear point on non-fail block', () => {
    creature.area = {
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    };
    (hasWalkLineClear as jest.Mock).mockReturnValueOnce({
      ok: false,
      code: -1,
      clearPoint: new THREE.Vector3(3, 0, 0),
      clearT: 0.6,
    });
    const r = clipForcePushDestination(creature, new THREE.Vector3(5, 0, 0), false);
    expect(r.x).toBeCloseTo(3);
    expect((hasWalkLineClear as jest.Mock).mock.calls.at(-1)?.[3]?.maxHeightDelta).toBeCloseTo(2.5);
    creature.area = undefined;
  });

  it('passes appearance height into walk-line clear / hasWalkLineClear maxHeightDelta', () => {
    creature.area = {};
    creature.getAppearance = () => ({ height: 3.5 });
    (hasWalkLineClear as jest.Mock).mockReturnValueOnce({
      ok: true,
      code: 1,
      clearPoint: new THREE.Vector3(5, 0, 0),
      clearT: 1,
    });
    clipForcePushDestination(creature, new THREE.Vector3(5, 0, 0), false);
    expect((hasWalkLineClear as jest.Mock).mock.calls.at(-1)?.[3]?.maxHeightDelta).toBeCloseTo(3.5);
    creature.area = undefined;
    creature.getAppearance = () => ({ height: 1.8 });
  });
});

describe('tickForcePushLoco', () => {
  it('slides ~5m in ~0.2s at 25 u/s and stops', () => {
    const creature: any = {
      position: new THREE.Vector3(0, 0, 0),
      creatureLocoState: 0,
      forcePushDistanceTraveled: 0,
      forcePushArrived: false,
      forcePushArriveElapsed: 0,
      area: undefined,
      setComputedPath: jest.fn(function (this: any, p: any) {
        this._path = p;
      }),
      getComputedPath: jest.fn(function (this: any) {
        return this._path;
      }),
    };

    installForcePushPath(
      creature,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0)
    );
    expect(creature.creatureLocoState).toBe(FORCE_PUSH_LOCO_STATE);
    expect(creature.forcePushArrived).toBe(false);

    let result = tickForcePushLoco(creature, 0.2);
    expect(result).toBe('arrived');
    expect(creature.position.x).toBeCloseTo(5, 4);
    expect(creature.forcePushArrived).toBe(true);
    // Arrival drops the slide loco to Paused so the creature can walk again.
    expect(creature.creatureLocoState).toBe(CreatureLocoState.Paused);

    result = tickForcePushLoco(creature, 0.1);
    expect(result).toBe('idle');
  });

  it('moves partially across smaller deltas', () => {
    const creature: any = {
      position: new THREE.Vector3(0, 0, 0),
      creatureLocoState: FORCE_PUSH_LOCO_STATE,
      forcePushDistanceTraveled: 0,
      forcePushArrived: false,
      forcePushArriveElapsed: 0,
      area: undefined,
      _path: {
        points: [
          { vector: new THREE.Vector3(0, 0, 0) },
          { vector: new THREE.Vector3(5, 0, 0) },
        ],
      },
      getComputedPath() {
        return this._path;
      },
    };

    const r = tickForcePushLoco(creature, 0.04); // 1m
    expect(r).toBe('moving');
    expect(creature.position.x).toBeCloseTo(FORCE_PUSH_SPEED * 0.04, 4);
  });
});

describe('updateForcePushAnimFlags', () => {
  it('holds push flag until arrived, then lands/gets up', () => {
    const creature: any = {
      creatureLocoState: FORCE_PUSH_LOCO_STATE,
      forcePushArrived: false,
      forcePushArriveElapsed: 0,
      fp_push_played: false,
      fp_land_played: false,
      fp_getup_played: false,
    };

    updateForcePushAnimFlags(creature, 0.1);
    expect(creature.fp_push_played).toBe(false);

    creature.forcePushArrived = true;
    updateForcePushAnimFlags(creature, 0.1);
    expect(creature.fp_push_played).toBe(true);
    expect(creature.fp_land_played).toBe(false);

    updateForcePushAnimFlags(creature, 1.1);
    expect(creature.fp_land_played).toBe(true);
    expect(creature.fp_getup_played).toBe(false);

    updateForcePushAnimFlags(creature, 1.5);
    expect(creature.fp_getup_played).toBe(true);
  });
});

describe('applyForcePushAIActivityMask', () => {
  it('ANDs activity with 0xFFFD (SETAISTATE -3)', () => {
    const creature: any = { activity: 0xffff };
    applyForcePushAIActivityMask(creature);
    expect(creature.activity).toBe(FORCE_PUSH_AI_ACTIVITY_MASK);
  });
});

describe('SET_STATE_OUTER_AI_ACTIVITY_MASK', () => {
  it('clears bit 0x100 (SETAISTATE -0x101)', () => {
    // Mirrors set-state.ts SET_STATE_OUTER_AI_ACTIVITY_MASK = 0xfeff
    const mask = 0xfeff;
    expect(0xffff & mask).toBe(0xfeff);
    expect(0x0100 & mask).toBe(0);
  });
});

describe('stampForcePushAttackSummary', () => {
  it('stamps setStateType=9 on creator current attack', () => {
    const attack: any = { setStateType: 0, setStateApplied: false };
    const creator: any = {
      combatRound: { currentAttack: 0, attackList: [attack] },
    };
    const target: any = { id: 99 };
    stampForcePushAttackSummary(creator, target);
    expect(attack.setStateType).toBe(9);
    expect(attack.setStateApplied).toBe(true);
    expect(attack.reactObject).toBe(target);
  });
});

describe('Force Push recovery sequence', () => {
  function pushedCreature(overrides: any = {}){
    const creature: any = {
      position: new THREE.Vector3(0, 0, 0),
      area: undefined,
      creatureLocoState: 0,
      ambientAnimState: 0,
      combatData: { combatState: true },
      _path: undefined as any,
      setComputedPath(p: any){ this._path = p; },
      getComputedPath(){ return this._path; },
      hasSetState: jest.fn(() => false),
      isDead: jest.fn(() => false),
      setAnimationState: jest.fn(),
      ...overrides,
    };
    return creature;
  }

  it('stays recovering through slide, land and get-up, then releases', () => {
    const creature = pushedCreature();
    installForcePushPath(creature, new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0));
    startForcePushSequence(creature);
    // The zero-delta seed tick must not end the slide.
    expect(creature.creatureLocoState).toBe(FORCE_PUSH_LOCO_STATE);
    expect(isForcePushRecovering(creature)).toBe(true);

    tickForcePushSequence(creature, 0.05);
    expect(creature.fp_push_played).toBeFalsy();

    tickForcePushLoco(creature, 0.5);
    expect(creature.creatureLocoState).toBe(CreatureLocoState.Paused);

    tickForcePushSequence(creature, FORCE_PUSH_ANIM_LAND);
    expect(creature.fp_land_played).toBe(true);
    expect(isForcePushRecovering(creature)).toBe(true);

    tickForcePushSequence(creature, FORCE_PUSH_ANIM_GETUP);
    expect(isForcePushRecovering(creature)).toBe(false);
    expect(creature.setAnimationState).toHaveBeenCalledTimes(1);
  });

  it('leaves the pose alone while the FORCEPUSH state is still applied', () => {
    const creature = pushedCreature({ hasSetState: jest.fn(() => true) });
    installForcePushPath(creature, new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0));
    startForcePushSequence(creature);
    tickForcePushLoco(creature, 0.5);
    tickForcePushSequence(creature, FORCE_PUSH_ANIM_LAND + FORCE_PUSH_ANIM_GETUP);
    expect(isForcePushRecovering(creature)).toBe(false);
    expect(creature.setAnimationState).not.toHaveBeenCalled();
  });

  it('drops the sequence when the creature dies', () => {
    const creature = pushedCreature({ isDead: jest.fn(() => true) });
    startForcePushSequence(creature);
    tickForcePushSequence(creature, 0.1);
    expect(isForcePushRecovering(creature)).toBe(false);
  });
});
