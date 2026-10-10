/**
 * ActionJumpToObject — safe-location jump parity.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const findOpenWalkLocation = jest.fn();
const applyLocalJump = jest.fn();
const applyAddToArea = jest.fn();
const classifyJumpDestination = jest.fn(() => ({ kind: 'same' }));

jest.mock('@engine/render/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    module: { filename: 'tar_m02ac', area: { id: 1 } },
    PartyManager: {
      getCurrentPlayer: () => undefined,
      party: [],
      resetFollowPath: jest.fn(),
    },
    GameObjectManager: {
      GetObjectById: (id: number) => (id === 99 ? mockTarget : undefined),
      GetClientObjectById: (id: number) => (id === 99 ? mockTarget : undefined),
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
}));

jest.mock('@engine/actions/ActionJumpToPoint', () => ({
  applyLocalJump: (...args: unknown[]) => applyLocalJump(...args),
  applyAddToArea: (...args: unknown[]) => applyAddToArea(...args),
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

import { ActionJumpToObject } from '@engine/actions/ActionJumpToObject';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionStatus } from '@core/enums/actions/ActionStatus';

let mockTarget: {
  id: number;
  position: THREE.Vector3;
  area: { id: number };
  rotation: { z: number };
};

describe('ActionJumpToObject open/safe walk location', () => {
  beforeEach(() => {
    findOpenWalkLocation.mockReset();
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
    expect(findOpenWalkLocation).toHaveBeenCalled();
    const opts = findOpenWalkLocation.mock.calls[0][3] as Record<string, unknown>;
    expect(opts).toMatchObject(partial);
  }

  it('always uses findOpenWalkLocation with radius 20 and allowPartyCreatures false', () => {
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
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
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
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
    findOpenWalkLocation.mockImplementation((_area, _center, out: THREE.Vector3) => {
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

  it('returns FAILED when findOpenWalkLocation fails (no applyLocalJump)', () => {
    findOpenWalkLocation.mockReturnValue(false);

    const owner = makeOwner();
    const action = makeAction(1);
    action.setOwner(owner as any);

    expect(action.update(0)).toBe(ActionStatus.FAILED);
    expect(applyLocalJump).not.toHaveBeenCalled();
  });
});

describe('Creature.jumpToObject default flag', () => {
  it('defaults bWalkStraight to 1 (requireLOS on) in source', () => {
    // Lightweight source check — full Creature import is heavy.
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/module/Creature.ts'),
      'utf8',
    );
    expect(src).toMatch(
      /jumpToObject\(target:\s*GameObject,\s*bWalkStraight:\s*number\s*=\s*1\)/,
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
