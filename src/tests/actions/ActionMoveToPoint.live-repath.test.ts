/**
 * Live-chase in-place repath preserves walkSpeedFactor.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockPlotPath = jest.fn();
const mockWalkUpdate = jest.fn();

jest.mock("@/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock("@/three/odyssey/OdysseyModel3D", () => ({
  OdysseyModel3D: class {},
}));

jest.mock("@/GameState", () => ({
  GameState: {
    module: { area: { id: 1 } },
    ActionFactory: {},
    ModuleObjectManager: {
      GetObjectById: (id: number) => {
        if(id === 2){
          return {
            id: 2,
            position: { x: 1.174, y: 0, z: 0 },
            isDead: () => false,
          };
        }
        return undefined;
      },
    },
    PartyManager: { party: [] },
  },
}));

jest.mock("@/engine/pathfinding/plot-path", () => ({
  PlotPathCode: { Ready: 0, Incomplete: 1, Fail: 3 },
  plotPath: (...args: unknown[]) => mockPlotPath(...args),
}));

jest.mock("@/engine/pathfinding/update-creature-walk", () => ({
  CreatureWalkResult: { OK: 1, ARRIVED: 2, BLOCKED: 3 },
  updateCreatureWalk: (...args: unknown[]) => mockWalkUpdate(...args),
}));

jest.mock("@/engine/pathfinding/inter-area-path", () => ({
  beginInterAreaPath: () => {},
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (value: unknown) => typeof value === "object" && value !== null,
    InstanceOf: (value: unknown) => typeof value === "object" && value !== null,
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

const mockIsInUseRange = jest.fn(() => false);

jest.mock("@/actions/use-range", () => ({
  isInUseRange: (...args: unknown[]) => mockIsInUseRange(...args),
}));

import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { PlotPathCode } from "@/engine/pathfinding/plot-path";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("ActionMoveToPoint live-chase repath", () => {
  beforeEach(() => {
    mockPlotPath.mockReset();
    mockWalkUpdate.mockReset();
    mockIsInUseRange.mockReset();
    mockIsInUseRange.mockReturnValue(false);
    mockWalkUpdate.mockReturnValue(1);
    mockPlotPath.mockReturnValue({
      code: PlotPathCode.Ready,
      path: {
        points: [{ vector: new THREE.Vector3(5, 0, 0) }],
        fixWalkEdges: () => {},
        setColor: () => {},
        realtime: true,
        timer: 20,
        pop: () => {},
      },
    });
  });

  it("repathToLiveTargetInPlace does not zero walkSpeedFactor", () => {
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      walkSpeedFactor: 0.85,
      setComputedPath: () => {},
      getComputedPath: () => undefined,
      clearLocomotionState: jest.fn(),
    } as unknown as ModuleCreature;

    const target = {
      id: 2,
      position: new THREE.Vector3(8, 0, 0),
      area: { id: 1 },
      isDead: () => false,
    };

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 3);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, target.id);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 2.0);
    (action as { target: unknown }).target = target;
    action.real_target_position.copy(target.position);
    action.target_position.set(3, 0, 0);

    action.repathToLiveTargetInPlace();

    expect(owner.walkSpeedFactor).toBe(0.85);
    expect(owner.clearLocomotionState).not.toHaveBeenCalled();
    expect(action.target_position.x).toBeCloseTo(8, 4);
    expect(mockPlotPath).toHaveBeenCalled();
  });

  it("calculatePath plots in the owner area, not the module singleton area", () => {
    const ownerArea = {
      id: 99,
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    };
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
      area: ownerArea,
      walkSpeedFactor: 0.85,
      locomotionScale: 1,
      movementSpeed: 1,
      helperColor: 0,
      setComputedPath: jest.fn(),
      getComputedPath: () => undefined,
      clearLocomotionState: jest.fn(),
      setFacing: jest.fn(),
      setAnimationState: jest.fn(),
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      walk: false,
      force: 0,
      speed: 0,
    } as unknown as ModuleCreature;

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 5);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, ownerArea.id);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.set(5, 0, 0);

    action.calculatePath();

    expect(mockPlotPath).toHaveBeenCalled();
    expect(mockPlotPath.mock.calls[0][0]).toBe(ownerArea);
  });

  it("syncs cleared owner path after WalkUpdate blocks", () => {
    let ownerPath: any;
    const path = {
      points: [{ vector: new THREE.Vector3(5, 0, 0) }],
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: true,
      timer: 20,
      pop: jest.fn(),
    };
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      walkSpeedFactor: 0.85,
      locomotionScale: 1,
      movementSpeed: 1,
      helperColor: 0,
      setComputedPath: jest.fn((p: unknown) => { ownerPath = p; }),
      getComputedPath: jest.fn(() => ownerPath),
      clearLocomotionState: jest.fn(),
      setFacing: jest.fn(),
      setAnimationState: jest.fn(),
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      walk: false,
      force: 0,
      speed: 0,
      collisionTimer: 0,
      blockingTimer: 0,
    } as unknown as ModuleCreature;
    mockPlotPath.mockReturnValue({ code: PlotPathCode.Ready, path });
    mockWalkUpdate.mockImplementation(() => {
      owner.setComputedPath(undefined);
      return 3;
    });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 5);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.set(5, 0, 0);

    action.calculatePath();
    // Full update path: BLOCKED clears owner path, syncs undefined onto the
    // action — must not throw on computedPath.timer (quickWalk crash).
    const status = action.update(1 / 60);

    expect(mockWalkUpdate).toHaveBeenCalled();
    expect((action as { computedPath?: unknown }).computedPath).toBeUndefined();
    expect(status).toBe(ActionStatus.IN_PROGRESS);
  });

  it("completes live chase when isInUseRange even if dist > param range", () => {
    // end_m01aa k_pend_traskdl40: WalkUpdate early-outs at use.range+0.1 while
    // MoveToPoint used only param-6 — hung PauseConversation forever.
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      walkSpeedFactor: 1,
      locomotionScale: 1,
      movementSpeed: 1,
      helperColor: 0,
      setComputedPath: jest.fn(),
      getComputedPath: jest.fn(),
      clearLocomotionState: jest.fn(),
      setFacing: jest.fn(),
      setAnimationState: jest.fn(),
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      openSpot: undefined,
      force: 0,
      speed: 0,
      animState: 0,
      collisionTimer: 0,
      blockingTimer: 0,
    } as unknown as ModuleCreature;

    mockIsInUseRange.mockReturnValue(true);

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 1.174);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 2);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 1.1);

    expect(action.update(1 / 60)).toBe(ActionStatus.COMPLETE);
    expect(mockIsInUseRange).toHaveBeenCalled();
  });

  it("completes door/placeable use-range move when isInUseRange even if dist > param range", () => {
    // Same WalkUpdate UseRange early-out as live chase — without this, OpenDoor /
    // UseObject never run after walking into range (must re-click).
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      walkSpeedFactor: 1,
      locomotionScale: 1,
      movementSpeed: 1,
      helperColor: 0,
      setComputedPath: jest.fn(),
      getComputedPath: jest.fn(),
      clearLocomotionState: jest.fn(),
      setFacing: jest.fn(),
      setAnimationState: jest.fn(),
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      openSpot: undefined,
      force: 0,
      speed: 0,
      animState: 0,
      collisionTimer: 0,
      blockingTimer: 0,
    } as unknown as ModuleCreature;

    mockIsInUseRange.mockReturnValue(true);

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 1.174);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    // OBJECT_INVALID would skip use-range completion; any real target id counts
    action.setParameter(4, ActionParameterType.DWORD, 2);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 1.1);

    expect(action.update(1 / 60)).toBe(ActionStatus.COMPLETE);
    expect(owner.clearLocomotionState).toHaveBeenCalled();
  });
});
