/**
 * ActionCheckMoveToObjectRadius param ABI.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as THREE from 'three';

const queued: unknown[] = [];
const mockIsInUseRange = jest.fn(() => false);
const mockGetUseRange = jest.fn(() => ({
  ok: true,
  point: new THREE.Vector3(5, 0, 0),
  range: 1.1,
}));

jest.mock('@engine/render/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock('@engine/render/three/odyssey/OdysseyModel3D', () => ({
  OdysseyModel3D: class {},
}));

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    ActionFactory: {
      ActionCheckMoveToObjectRadius: class {
        parameters: { type: number; value: unknown }[] = [];
        groupId = -1;
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
      ActionMoveToPoint: class {
        type = 0x01;
        parameters: { type: number; value: unknown }[] = [];
        setParameter(i: number, type: number, value: unknown){
          this.parameters[i] = { type, value };
        }
      },
    },
  },
}));

jest.mock('@engine/actions/Action', () => ({
  Action: class {
    type = -1;
    parameters: { type: number; value: unknown }[] = [];
    owner: unknown;
    groupId = -1;
    setParameter(i: number, type: number, value: unknown){
      this.parameters[i] = { type, value };
    }
    getParameter<T>(i: number): T {
      return this.parameters[i]?.value as T;
    }
  },
}));

jest.mock('@engine/actions/use-range', () => ({
  isInUseRange: (...args: unknown[]) => mockIsInUseRange(...args),
  getUseRange: (...args: unknown[]) => mockGetUseRange(...args),
}));

jest.mock('@engine/combat/attack-range', () => ({
  getPathPersonalSpace: () => 0.35,
}));

jest.mock('@engine/pathfinding/inter-area-path', () => ({
  advanceInterAreaWaypoint: () => {},
  beginInterAreaPath: () => false,
  excludeFailedInterAreaPortal: () => {},
  tryUseInterAreaTransition: () => false,
}));

jest.mock('@engine/pathfinding/find-away-vector', () => ({
  findAwayVector: () => new THREE.Vector3(),
}));

jest.mock('@engine/pathfinding/can-path-to', () => ({
  canPathToPoint: () => true,
}));

jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!(o as { __creature?: boolean })?.__creature,
}));

jest.mock('@engine/module/guards/isObject', () => ({
  isObject: (o: unknown) => !!o,
}));

import { ActionCheckMoveToObjectRadius } from '@engine/actions/ActionCheckPath';
import { ActionParameterType } from '@core/enums/actions/ActionParameterType';
import { ActionStatus } from '@core/enums/actions/ActionStatus';
import { ActionType } from '@core/enums/actions/ActionType';

describe('ActionCheckMoveToObjectRadius ABI', () => {
  beforeEach(() => {
    queued.length = 0;
    mockIsInUseRange.mockReset();
    mockIsInUseRange.mockReturnValue(false);
    mockGetUseRange.mockClear();
  });

  it('reads param1 as bRun and param2 as arrive range', () => {
    const owner = {
      __creature: true,
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      area: { id: 1 },
      isDead: () => false,
      isDebilitated: () => false,
      actionQueue: { addFront: (a: unknown) => { queued.unshift(a); } },
    };
    const target = {
      __creature: true,
      id: 2,
      position: new THREE.Vector3(5, 0, 0),
      area: { id: 1 },
      isDead: () => false,
    };

    const action = new ActionCheckMoveToObjectRadius();
    (action as any).owner = owner;
    action.setParameter(0, ActionParameterType.DWORD, target as any);
    action.setParameter(1, ActionParameterType.INT, 1);
    action.setParameter(2, ActionParameterType.FLOAT, 15.0);
    action.setParameter(3, ActionParameterType.FLOAT, 15.0);

    const status = action.update(0);

    expect(status).toBe(ActionStatus.COMPLETE);
    expect(mockIsInUseRange).toHaveBeenCalled();
    const extra = mockIsInUseRange.mock.calls[0][2] as number;
    // extra = max(0, arrive − use.range) = 15 − 1.1
    expect(extra).toBeCloseTo(13.9, 5);

    expect(queued.length).toBe(2);
    expect((queued[0] as { type?: number }).type).toBe(ActionType.ActionMoveToPoint);
    const move = queued[0] as { parameters: { value: unknown }[] };
    expect(move.parameters[5].value).toBe(1); // bRun
    expect(move.parameters[6].value).toBe(15.0); // arrive from param2, not param1
  });

  it('completes without Move when already in use range', () => {
    mockIsInUseRange.mockReturnValue(true);
    const owner = {
      __creature: true,
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      area: { id: 1 },
      isDead: () => false,
      isDebilitated: () => false,
      actionQueue: { addFront: (a: unknown) => { queued.unshift(a); } },
    };
    const target = {
      __creature: true,
      id: 2,
      position: new THREE.Vector3(1, 0, 0),
      area: { id: 1 },
      isDead: () => false,
    };

    const action = new ActionCheckMoveToObjectRadius();
    (action as any).owner = owner;
    action.setParameter(0, ActionParameterType.DWORD, target as any);
    action.setParameter(1, ActionParameterType.INT, 1);
    action.setParameter(2, ActionParameterType.FLOAT, 2.0);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expect(queued.length).toBe(0);
  });
});
