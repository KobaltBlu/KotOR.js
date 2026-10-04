/**
 * FollowLeader action-level locomotion regressions.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockParty: unknown[] = [];
const mockGameState = {
  Mode: 1,
  SOLOMODE: false,
  PartyManager: {
    FollowState: 0,
    party: mockParty,
    getFormationOffsets: () => [
      { x: 0, y: 0 },
      { x: 1.5, y: -0.7 },
      { x: -1.5, y: 0.8 },
    ],
    GetFollowPosition: () => new THREE.Vector3(2, 0, 0),
    teleportFollowForward: () => false,
  },
  SWRuleSet: {
    ranges: {
      14: { primaryRange: 5.0 },
      15: { primaryRange: 8.0 },
    },
  },
  ModuleObjectManager: { GetObjectById: () => undefined },
  module: undefined as undefined,
  ActionFactory: {
    ActionJumpToPoint: class {
      setParameter(){}
    },
  },
};

jest.mock("@engine/runtime/GameState", () => ({ GameState: mockGameState }));

jest.mock("@engine/render/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock("@engine/render/three/odyssey/OdysseyModel3D", () => ({
  OdysseyModel3D: class {},
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasWalkLineClear: () => ({
    ok: true,
    code: 1,
    clearPoint: new THREE.Vector3(),
    clearT: 1,
  }),
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
}));

jest.mock("@engine/pathfinding/safe-walk-point", () => ({
  isSafeWalkPoint: () => true,
}));

jest.mock("@engine/pathfinding/party-soft-separate", () => ({
  partySoftSeparate: () => {},
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

import { ActionFollowLeader } from "@engine/actions/ActionFollowLeader";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";
import { PartyFollowState } from "@engine/pathfinding/party-follow";
import { partyFollowPath } from "@engine/pathfinding/party-follow-path";

function angleDelta(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

describe("ActionFollowLeader locomotion facing", () => {
  beforeEach(() => {
    mockParty.length = 0;
    mockGameState.Mode = 1;
    mockGameState.SOLOMODE = false;
    mockGameState.PartyManager.GetFollowPosition = () => new THREE.Vector3(2, 0, 0);
    mockGameState.PartyManager.teleportFollowForward = () => false;
    partyFollowPath.reset();
  });

  function makeCreature(id: number, x: number, y: number){
    const creature = {
      id,
      objectType: ModuleObjectType.ModuleCreature,
      position: new THREE.Vector3(x, y, 0),
      rotation: { z: 0 },
      area: {
        id: 1,
        creatures: [],
        isPointWalkable: () => true,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      },
      partyFollowInfo: { inSafetyRange: 0 },
      pathBlockFailCount: 0,
      blockingTimer: 0,
      collisionTimer: 0,
      walkSpeedFactor: 0.8,
      locomotionScale: 1,
      force: 0,
      speed: 0,
      walk: false,
      moveDirOverride: undefined,
      helperColor: 0,
      forceVector: new THREE.Vector3(),
      actionQueue: { addFront: jest.fn() },
      getComputedPath: jest.fn(() => undefined),
      setComputedPath: jest.fn(),
      setAnimationState: jest.fn(),
      clearLocomotionAnimation: jest.fn(),
      clearLocomotionState: jest.fn(),
      setFacing: jest.fn(),
      setPosition(v: THREE.Vector3 | number, yy = 0, zz = 0){
        if(typeof v === "object"){
          creature.position.copy(v);
        }else{
          creature.position.set(v, yy, zz);
        }
      },
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      isDead: () => false,
      isDebilitated: () => false,
      isPartyMember: () => true,
    };
    return creature;
  }

  it("keeps active Offset facing on the path sample instead of looking at leader", () => {
    const leader = makeCreature(1, 0, 10);
    const follower = makeCreature(2, 0, 0);
    mockParty.push(leader, follower);

    const action = new ActionFollowLeader();
    action.setOwner(follower as any);
    const runtime = (action as any).followRuntime;
    runtime.state = PartyFollowState.Offset;
    runtime.lastSampleX = follower.position.x;
    runtime.lastSampleY = follower.position.y;
    runtime.lastSampleZ = follower.position.z;
    runtime.pathPointX = follower.position.x;
    runtime.pathPointY = follower.position.y;
    runtime.pathPointZ = follower.position.z;

    const status = action.update(1 / 60);

    expect(status).toBe(ActionStatus.IN_PROGRESS);
    expect(runtime.offsetStepped).toBe(true);
    expect(follower.setAnimationState).toHaveBeenCalledWith(ModuleCreatureAnimState.RUNNING);
    expect(follower.setAnimationState).not.toHaveBeenCalledWith(ModuleCreatureAnimState.PAUSE);
    expect(follower.clearLocomotionAnimation).not.toHaveBeenCalled();

    const facingCalls = follower.setFacing.mock.calls;
    const lastFacing = facingCalls[facingCalls.length - 1]?.[0] as number;
    const towardPathSample = (Math.PI * 3) / 2;
    const towardLeader = 0;
    expect(angleDelta(lastFacing, towardPathSample)).toBeLessThan(0.00001);
    expect(angleDelta(lastFacing, towardLeader)).toBeGreaterThan(0.1);
  });

  it("uses FollowLeader ring recovery without enqueueing a hard jump", () => {
    const leader = makeCreature(1, 0, 0);
    const follower = makeCreature(2, 20, 0);
    mockParty.push(leader, follower);
    const ringDest = new THREE.Vector3(4, -1, 0);
    const teleportFollowForward = jest.fn((_owner: unknown, dest: THREE.Vector3) => {
      dest.copy(ringDest);
      return true;
    });
    const getFollowPosition = jest.fn(() => new THREE.Vector3(99, 99, 0));
    mockGameState.PartyManager.teleportFollowForward = teleportFollowForward;
    mockGameState.PartyManager.GetFollowPosition = getFollowPosition;

    const action = new ActionFollowLeader();
    action.setOwner(follower as any);
    const runtime = (action as any).followRuntime;
    runtime.state = PartyFollowState.Teleport;

    const status = action.update(1 / 60);

    expect(status).toBe(ActionStatus.IN_PROGRESS);
    expect(teleportFollowForward).toHaveBeenCalledWith(follower, expect.any(THREE.Vector3));
    expect(getFollowPosition).toHaveBeenCalledTimes(1);
    expect(follower.position).toEqual(ringDest);
    expect(follower.actionQueue.addFront).not.toHaveBeenCalled();
    expect(runtime.state).toBe(PartyFollowState.MovingToPath);
  });

  it("does not clear Offset locomotion on brief zero-step frames (slide thrash)", () => {
    const leader = makeCreature(1, 0, 0);
    const follower = makeCreature(2, 1.5, -0.7);
    mockParty.push(leader, follower);
    mockGameState.PartyManager.GetFollowPosition = () => follower.position.clone();

    // Keep Advance/lateral on the follower's feet so Offset produces no step.
    const advanceSpy = jest
      .spyOn(partyFollowPath, "advancePointOnPath")
      .mockImplementation((_budget, _slot, _sample, out) => {
        out.copy(follower.position);
      });
    const lateralSpy = jest
      .spyOn(partyFollowPath, "applyFormationLateral")
      .mockImplementation((_slot, _x, _y, _z, _bearing, out) => {
        out.copy(follower.position);
      });

    const action = new ActionFollowLeader();
    action.setOwner(follower as any);
    const runtime = (action as any).followRuntime;
    runtime.state = PartyFollowState.Offset;
    runtime.lastSampleX = follower.position.x;
    runtime.lastSampleY = follower.position.y;
    runtime.lastSampleZ = follower.position.z;
    runtime.pathPointX = follower.position.x;
    runtime.pathPointY = follower.position.y;
    runtime.pathPointZ = follower.position.z;
    runtime.goalX = follower.position.x;
    runtime.goalY = follower.position.y;
    runtime.goalZ = follower.position.z;
    runtime.offsetStepped = false;
    runtime.offsetIdleTime = 0;

    try {
      // Brief zero-step frames must not demote run/walk (AnimRun transtime thrash).
      action.update(1 / 60);
      expect(runtime.state).toBe(PartyFollowState.Offset);
      expect(runtime.offsetStepped).toBe(false);
      expect(runtime.offsetIdleTime).toBeGreaterThan(0);
      expect(runtime.offsetIdleTime).toBeLessThan(0.25);
      expect(follower.clearLocomotionAnimation).not.toHaveBeenCalled();

      // After the idle hold, soft-park may clear sticky loco.
      action.update(0.3);
      expect(follower.clearLocomotionAnimation).toHaveBeenCalled();
    } finally {
      advanceSpy.mockRestore();
      lateralSpy.mockRestore();
    }
  });
});
