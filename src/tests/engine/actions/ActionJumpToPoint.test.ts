/**
 * ActionJumpToPoint — safe-location jump parity.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const findOpenWalkLocation = jest.fn();
const classifyJumpDestination = jest.fn(() => ({ kind: 'same' }));
const isAreaLike = jest.fn((obj: unknown) => {
  return !!(obj && typeof obj === 'object' && Array.isArray((obj as any).creatures));
});
const jumpFacingFromOrientation = jest.fn((_ox: number, _oy: number) => 0.5);

jest.mock('@engine/render/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    module: {
      filename: 'end_m01aa',
      area: { id: 1, creatures: [] },
      isObjectInLimbo: () => false,
      removeObjectFromLimbo: jest.fn(),
    },
    PartyManager: {
      getCurrentPlayer: () => undefined,
      party: [],
      resetFollowPath: jest.fn(),
    },
    ModuleObjectManager: {
      GetObjectById: () => undefined,
    },
  },
}));

jest.mock('@engine/render/OdysseyRenderPipeline', () => ({
  OdysseyRenderPipeline: {},
}));

jest.mock('@engine/runtime/ModuleLoadCoordinator', () => ({
  ModuleLoadCoordinator: {
    LoadModuleWithJumpSpawn: jest.fn(),
  },
}));

jest.mock('@engine/movement/jump-to-location', () => ({
  classifyJumpDestination: (...args: unknown[]) => classifyJumpDestination(...args),
  isAreaLike: (...args: unknown[]) => isAreaLike(...args),
  jumpFacingFromOrientation: (...args: unknown[]) =>
    jumpFacingFromOrientation(...(args as [number, number])),
}));

jest.mock('@engine/pathfinding/open-walk-location', () => ({
  findOpenWalkLocation: (...args: unknown[]) => findOpenWalkLocation(...args),
}));

jest.mock('@engine/combat/attack-range', () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: () => true,
}));

jest.mock('@core/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => typeof v === 'object' && v != null,
    InstanceOf: () => true,
  },
}));

import { ActionJumpToPoint } from '@engine/actions/ActionJumpToPoint';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionStatus } from '@core/enums/actions/ActionStatus';

describe('ActionJumpToPoint open/safe walk location', () => {
  const area = { id: 1, creatures: [] as unknown[] };

  beforeEach(() => {
    findOpenWalkLocation.mockReset();
    classifyJumpDestination.mockReset();
    classifyJumpDestination.mockReturnValue({ kind: 'same' });
    jumpFacingFromOrientation.mockReturnValue(0.5);
  });

  function makeOwner() {
    return {
      id: 1,
      position: new THREE.Vector3(39, 137, 0),
      area,
      controlled: false,
      setPosition: jest.fn(),
      setFacing: jest.fn(),
      markCollisionMatrixDirty: jest.fn(),
      computeBoundingBox: jest.fn(),
      collisionManager: {
        groundFace: undefined as unknown,
        lastGroundFace: undefined as unknown,
        findWalkableFace: jest.fn(),
        blockingObject: undefined as unknown,
      },
    };
  }

  function makeAction(opts: {
    x?: number;
    y?: number;
    z?: number;
    bWalkStraight?: number;
    radius?: number;
    omitParam4?: boolean;
    omitParam5?: boolean;
  } = {}) {
    const action = new ActionJumpToPoint();
    action.setParameter(0, ActionParameterType.FLOAT, opts.x ?? 40.2);
    action.setParameter(1, ActionParameterType.FLOAT, opts.y ?? 136.93);
    action.setParameter(2, ActionParameterType.FLOAT, opts.z ?? 0);
    action.setParameter(3, ActionParameterType.DWORD, area.id);
    if(!opts.omitParam4){
      action.setParameter(
        4,
        ActionParameterType.INT,
        opts.bWalkStraight !== undefined ? opts.bWalkStraight : 1,
      );
    }
    if(!opts.omitParam5){
      action.setParameter(
        5,
        ActionParameterType.FLOAT,
        opts.radius !== undefined ? opts.radius : 20.0,
      );
    }
    action.setParameter(6, ActionParameterType.FLOAT, 0);
    action.setParameter(7, ActionParameterType.FLOAT, 1);
    return action;
  }

  function expectSafeOpts(partial: Record<string, unknown>) {
    expect(findOpenWalkLocation).toHaveBeenCalled();
    const opts = findOpenWalkLocation.mock.calls[0][3] as Record<string, unknown>;
    expect(opts).toMatchObject(partial);
  }

  it('always uses findOpenWalkLocation with allowPartyCreatures false', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(40.5, 137.2, 0.1);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction({ bWalkStraight: 1, radius: 20 });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      radius: 20,
      requireLineOfSight: true,
      allowPartyCreatures: false,
    });
    // Placement goes through applyLocalTeleport (not setPosition locomotion settle).
    expect(owner.position.x).toBeCloseTo(40.5);
    expect(owner.position.y).toBeCloseTo(137.2);
    expect(owner.position.z).toBeCloseTo(0.1);
    expect(owner.setFacing).toHaveBeenCalled();
  });

  it('defaults omitted params to requireLOS true and radius 20', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(40.0, 137.0, 0);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction({ omitParam4: true, omitParam5: true });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      radius: 20,
      requireLineOfSight: true,
      allowPartyCreatures: false,
    });
  });

  it('honors bWalkStraight FALSE (ActionJumpToLocation / k_pend_xpboost)', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(41.0, 136.0, 0);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction({ bWalkStraight: 0, radius: 20 });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      radius: 20,
      requireLineOfSight: false,
      allowPartyCreatures: false,
    });
  });

  it('honors custom search radius from param 5', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(40.2, 136.93, 0);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction({ bWalkStraight: 0, radius: 5 });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({ radius: 5, requireLineOfSight: false });
  });

  it('returns FAILED when findOpenWalkLocation fails (no setPosition)', () => {
    findOpenWalkLocation.mockReturnValue(false);

    const owner = makeOwner();
    const action = makeAction({ bWalkStraight: 0 });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.FAILED);
    expect(owner.setPosition).not.toHaveBeenCalled();
  });

  it('passes jump center from XYZ params into findOpenWalkLocation', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.copy(_center as THREE.Vector3);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction({ x: 40.203758, y: 136.933, z: 0, bWalkStraight: 0 });
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    const center = findOpenWalkLocation.mock.calls[0][1] as THREE.Vector3;
    expect(center.x).toBeCloseTo(40.203758);
    expect(center.y).toBeCloseTo(136.933);
  });
});
