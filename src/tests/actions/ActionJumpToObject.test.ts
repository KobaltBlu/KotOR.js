/**
 * ActionJumpToObject — safe-location jump parity.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const findSafeLocation = jest.fn();
const applyLocalJump = jest.fn();
const applyAddToArea = jest.fn();
const classifyJumpDestination = jest.fn(() => ({ kind: 'same' }));

jest.mock('@/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock('@/GameState', () => ({
  GameState: {
    module: { filename: 'tar_m02ac', area: { id: 1 } },
    PartyManager: {
      party: [],
      resetFollowPath: jest.fn(),
    },
    ModuleObjectManager: {
      GetObjectById: (id: number) => (id === 99 ? mockTarget : undefined),
      GetClientObjectById: (id: number) => (id === 99 ? mockTarget : undefined),
    },
    getCurrentPlayer: () => undefined,
  },
}));

jest.mock('@/engine/jump-to-location', () => ({
  classifyJumpDestination: (...args: unknown[]) => classifyJumpDestination(...args),
}));

jest.mock('@/actions/ActionJumpToPoint', () => ({
  applyLocalJump: (...args: unknown[]) => applyLocalJump(...args),
  applyAddToArea: (...args: unknown[]) => applyAddToArea(...args),
}));

jest.mock('@/engine/pathfinding/find-safe-location', () => ({
  findSafeLocation: (...args: unknown[]) => findSafeLocation(...args),
}));

jest.mock('@/combat/attack-range', () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock('@/module/guards/isCreature', () => ({
  isCreature: () => true,
}));

jest.mock('@/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => typeof v === 'object' && v != null,
    InstanceOf: () => true,
  },
}));

import { ActionJumpToObject } from '@/actions/ActionJumpToObject';
import { ActionParameterType } from '@/enums/actions/ActionParameterType';
import { ActionStatus } from '@/enums/actions/ActionStatus';

let mockTarget: {
  id: number;
  position: THREE.Vector3;
  area: { id: number };
  rotation: { z: number };
};

describe('ActionJumpToObject ComputeSafeLocation', () => {
  beforeEach(() => {
    findSafeLocation.mockReset();
    applyLocalJump.mockReset();
    applyAddToArea.mockReset();
    classifyJumpDestination.mockReset();
    classifyJumpDestination.mockReturnValue({ kind: 'same' });
    mockTarget = {
      id: 99,
      position: new THREE.Vector3(179.2, 63.5, 0),
      area: { id: 1 },
      rotation: { z: 1.5 },
    };
  });

  function makeOwner() {
    return {
      id: 1,
      position: new THREE.Vector3(170, 66, 0),
      area: mockTarget.area,
      controlled: false,
      setPosition: jest.fn(),
      setFacing: jest.fn(),
    };
  }

  function makeAction(bWalkStraight?: number) {
    const action = new ActionJumpToObject();
    action.setParameter(0, ActionParameterType.DWORD, mockTarget.id);
    if(bWalkStraight !== undefined){
      action.setParameter(1, ActionParameterType.INT, bWalkStraight);
    }
    return action;
  }

  function expectSafeOpts(partial: Record<string, unknown>) {
    expect(findSafeLocation).toHaveBeenCalled();
    const opts = findSafeLocation.mock.calls[0][3] as Record<string, unknown>;
    expect(opts).toMatchObject(partial);
  }

  it('always uses findSafeLocation with radius 20 and allowPartyCreatures false', () => {
    findSafeLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(178.5, 64.0, 0.1);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction(1);
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      radius: 20,
      requireLineOfSight: true,
      allowPartyCreatures: false,
    });
    expect(applyLocalJump).toHaveBeenCalledWith(
      owner,
      178.5,
      64.0,
      0.1,
      1.5,
    );
  });

  it('defaults omitted bWalkStraight to requireLOS true', () => {
    findSafeLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(178.0, 63.0, 0);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction(); // no param 1
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      requireLineOfSight: true,
      allowPartyCreatures: false,
    });
    expect(applyLocalJump).toHaveBeenCalledWith(owner, 178.0, 63.0, 0, 1.5);
  });

  it('still searches safe location when bWalkStraight is FALSE (no LOS)', () => {
    findSafeLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
      out.set(177.0, 62.0, 0);
      return true;
    });

    const owner = makeOwner();
    const action = makeAction(0);
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expectSafeOpts({
      radius: 20,
      requireLineOfSight: false,
      allowPartyCreatures: false,
    });
    expect(applyLocalJump).toHaveBeenCalledWith(owner, 177.0, 62.0, 0, 1.5);
  });

  it('returns FAILED when findSafeLocation fails (no applyLocalJump)', () => {
    findSafeLocation.mockReturnValue(false);

    const owner = makeOwner();
    const action = makeAction(1);
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.FAILED);
    expect(applyLocalJump).not.toHaveBeenCalled();
  });
});

describe('ModuleCreature.jumpToObject default flag', () => {
  it('defaults bWalkStraight to 1 (requireLOS on) in source', () => {
    // Lightweight source check — full ModuleCreature import is heavy.
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/module/ModuleCreature.ts'),
      'utf8',
    );
    expect(src).toMatch(
      /jumpToObject\(target:\s*ModuleObject,\s*bWalkStraight:\s*number\s*=\s*1\)/,
    );
    expect(src).toMatch(
      /setParameter\(1,\s*ActionParameterType\.INT,\s*bWalkStraight\s*\|\s*0\)/,
    );
  });

  it('NWScript JumpToObject forwards the integer arg', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/nwscript/NWScriptDefK1.ts'),
      'utf8',
    );
    expect(src).toMatch(/jumpToObject\(args\[0\],\s*bWalkStraight\)/);
  });
});
