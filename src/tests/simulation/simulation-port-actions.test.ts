import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import * as THREE from 'three';

jest.mock('@/GameState', () => ({ GameState: {} }));
jest.mock('@/utility/Utility', () => ({
  Utility: {
    Distance2D: (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.y - b.y),
    LineLineIntersection: () => false,
  },
}));
jest.mock('@/actions/ActionParameter', () => ({
  ActionParameter: class {
    constructor(public type: number, public value: unknown = 0) {}
  },
}));

import { GameState } from '@/GameState';
import { Action } from '@/actions/Action';
import { ActionQueue } from '@/actions/ActionQueue';
import { ActionMoveToPoint } from '@/actions/ActionMoveToPoint';
import { enqueueMoveToPoint } from '@/actions/helpers/enqueueMoveToPoint';
import { ComputedPath } from '@/engine/pathfinding/ComputedPath';
import { ActionStatus } from '@/enums/actions/ActionStatus';
import { ActionParameterType } from '@/enums/actions/ActionParameterType';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';
import { ModuleObjectConstant } from '@/enums/module/ModuleObjectConstant';

const state = GameState as any;
let objects: Map<number, any>;

beforeEach(() => {
  objects = new Map();
  state.ModuleObjectManager = { GetObjectById: (id: number) => objects.get(id) };
  state.ActionFactory = { ActionMoveToPoint, ActionJumpToPoint: Action };
  state.module = { area: { id: 22 } };
  state.PartyManager = { party: [] };
  state.scene = new THREE.Scene();
});

function fakeAction(update: () => ActionStatus, groupId = ActionQueue.AUTO_INCREMENT_GROUP_ID) {
  const action = new Action(undefined, groupId);
  action.update = update;
  action.dispose = jest.fn();
  return action;
}

function movingOwner(): any {
  const owner: any = {
    id: 1,
    objectType: ModuleObjectType.ModuleObject | ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(),
    forceVector: new THREE.Vector3(),
    force: 0,
    speed: 0,
    blockingTimer: 0,
    collisionTimer: 0,
    helperColor: new THREE.Color(),
    setFacing: jest.fn(),
    setAnimationState: jest.fn(),
    getHitDistance: () => 0.5,
    getComputedPath: () => owner.computedPath,
    setComputedPath: (path: ComputedPath) => { owner.computedPath = path; },
    area: {
      id: 22,
      creatures: [],
      walkEdges: [],
      getNearestWalkablePoint: (point: THREE.Vector3) => point.clone(),
      scorePointEdgeDistance: () => 1,
    },
  };
  owner.actionQueue = new ActionQueue();
  owner.actionQueue.setOwner(owner);
  state.PartyManager.party = [owner];
  return owner;
}

function movement(owner: any, timeout = 30): ActionMoveToPoint {
  const action = enqueueMoveToPoint(owner, {
    x: 10, y: 0, z: 0, range: 1, timeout, groupId: 7,
  }) as ActionMoveToPoint;
  const path = ComputedPath.FromVector3List([new THREE.Vector3(10, 0, 0)]);
  path.setOwner(owner);
  path.timer = 20;
  action.setComputedPath(path);
  return action;
}

describe('ported action queue', () => {
  test('completion removes the executed action, not its prepended follow-up', () => {
    const queue = new ActionQueue();
    const followup = fakeAction(() => ActionStatus.IN_PROGRESS);
    const original = fakeAction(() => {
      queue.addFront(followup);
      return ActionStatus.COMPLETE;
    });
    queue.add(original);
    queue.process();
    expect(Array.from(queue)).toEqual([followup]);
    expect(original.dispose).toHaveBeenCalledTimes(1);
    expect(followup.dispose).not.toHaveBeenCalled();
  });

  test('an action clearing itself is not disposed twice and its successor survives', () => {
    const queue = new ActionQueue();
    const followup = fakeAction(() => ActionStatus.IN_PROGRESS);
    const original = fakeAction(() => {
      queue.clear();
      queue.add(followup);
      return ActionStatus.COMPLETE;
    });
    queue.add(original);
    queue.process();
    expect(Array.from(queue)).toEqual([followup]);
    expect(original.dispose).toHaveBeenCalledTimes(1);
  });

  test('throwing updates fail closed without discarding their prepended replacement', () => {
    const queue = new ActionQueue();
    const followup = fakeAction(() => ActionStatus.IN_PROGRESS);
    const original = fakeAction(() => {
      queue.addFront(followup);
      throw new Error('synthetic action failure');
    });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      queue.add(original);
      expect(() => queue.process()).not.toThrow();
      expect(Array.from(queue)).toEqual([followup]);
      expect(original.dispose).toHaveBeenCalledTimes(1);
    } finally {
      log.mockRestore();
    }
  });

  test('all insertion APIs assign ownership, queue references and usable groups', () => {
    const queue = new ActionQueue();
    const owner = {} as any;
    queue.setOwner(owner);
    const a = fakeAction(() => ActionStatus.IN_PROGRESS);
    const b = fakeAction(() => ActionStatus.IN_PROGRESS);
    queue.add(a);
    expect(queue.unshift(b)).toBe(2);
    expect(a.groupId).toBe(1);
    expect(b.groupId).toBe(2);
    expect(a.owner).toBe(owner);
    expect(b.queue).toBe(queue);
  });

  test('clearing a positive group leaves unrelated actions intact', () => {
    const queue = new ActionQueue();
    const a = fakeAction(() => ActionStatus.IN_PROGRESS, 7);
    const b = fakeAction(() => ActionStatus.IN_PROGRESS, 8);
    const c = fakeAction(() => ActionStatus.IN_PROGRESS, 7);
    queue.push(a, b, c);
    queue.clearActionsByGroupId(7);
    expect(Array.from(queue)).toEqual([b]);
    expect(a.dispose).toHaveBeenCalledTimes(1);
    expect(c.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('ported movement', () => {
  test('disposing an ownerless movement action is safe', () => {
    const action = new ActionMoveToPoint();
    expect(() => action.dispose()).not.toThrow();
  });

  test('helper retains group, zero object IDs and a typed timeout', () => {
    const owner = movingOwner();
    const action = enqueueMoveToPoint(owner, {
      x: 4, y: 5, z: 6, target: { id: 0 }, area: 0, run: true, range: 2,
      timeout: 12.5, groupId: 7,
    });
    expect(action.groupId).toBe(7);
    expect(action.parameters[3].value).toBe(0);
    expect(action.parameters[4].value).toBe(0);
    expect(action.parameters[8].type).toBe(ActionParameterType.FLOAT);
    expect(action.parameters[8].value).toBe(12.5);
    expect(action.queue).toBe(owner.actionQueue);
  });

  test('timeout decreases by delta rather than being reset to zero', () => {
    const owner = movingOwner();
    const action = movement(owner);
    expect(action.update(0.25)).toBe(ActionStatus.IN_PROGRESS);
    expect(action.getParameter<number>(8)).toBeCloseTo(29.75);
    expect(action.update(0.25)).toBe(ActionStatus.IN_PROGRESS);
    expect(action.getParameter<number>(8)).toBeCloseTo(29.5);
    expect(owner.forceVector.x).toBeGreaterThan(0);
  });

  test('expired movement leaves the queued jump fallback alive', () => {
    const owner = movingOwner();
    const action = movement(owner, 0.1);
    owner.actionQueue.process(0.2);
    expect(owner.actionQueue).toHaveLength(1);
    expect(owner.actionQueue[0]).not.toBe(action);
    expect(owner.actionQueue[0].getParameter(0)).toBe(10);
    expect(owner.actionQueue[0].groupId).toBe(7);
  });

  test('reaching a tracked target clears velocity and the stale path', () => {
    const owner = movingOwner();
    const action = movement(owner);
    const target = { id: 9, position: new THREE.Vector3(0.5, 0, 0), objectType: ModuleObjectType.ModuleObject };
    objects.set(9, target);
    action.setParameter(4, ActionParameterType.DWORD, 9);
    owner.force = 1;
    owner.speed = 2;
    expect(action.update(0.1)).toBe(ActionStatus.COMPLETE);
    expect(owner.force).toBe(0);
    expect(owner.speed).toBe(0);
    expect(action.computedPath).toBeUndefined();
  });

  test('keeps an adjusted destination rather than restoring the blocked raw point', () => {
    const owner = movingOwner();
    const action = movement(owner);
    const path = ComputedPath.FromVector3List([new THREE.Vector3(8, 0, 0)]);
    path.timer = 20;
    action.setComputedPath(path);
    action.update(0.1);
    expect(action.target_position.x).toBe(8);
    expect(action.real_target_position.x).toBe(10);
  });

  test('base action preserves an object with ID zero', () => {
    const action = new Action();
    action.setParameter(0, ActionParameterType.DWORD, { id: 0, objectType: ModuleObjectType.ModuleObject });
    expect(action.parameters[0].value).toBe(0);
    expect(action.parameters[0].value).not.toBe(ModuleObjectConstant.OBJECT_INVALID);
  });
});

describe('ported computed paths', () => {
  test('empty helper paths and empty merges are safe', () => {
    const path = ComputedPath.FromVector3List([]);
    expect(() => path.buildHelperLine()).not.toThrow();
    expect(path.helperMesh.visible).toBe(false);
    expect(() => path.merge(ComputedPath.FromVector3List([]))).not.toThrow();
    path.dispose();
  });

  test('does not alias entity position vectors or consume merged path input', () => {
    const position = new THREE.Vector3(1, 2, 3);
    const first = ComputedPath.FromVector3List([position, new THREE.Vector3(4, 5, 6)]);
    const second = ComputedPath.FromVector3List([new THREE.Vector3(4, 5, 6), new THREE.Vector3(7, 8, 9)]);
    first.points[0].vector.x = 99;
    expect(position.x).toBe(1);
    first.merge(second);
    expect(first.points).toHaveLength(3);
    expect(second.points).toHaveLength(2);
    first.dispose();
    second.dispose();
  });

  test('reindex creates a terminating predecessor chain', () => {
    const path = ComputedPath.FromVector3List([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    path.reIndex();
    expect(path.points[0].parent).toBeUndefined();
    expect(path.points[1].parent).toBe(path.points[0]);
    path.dispose();
  });
});
