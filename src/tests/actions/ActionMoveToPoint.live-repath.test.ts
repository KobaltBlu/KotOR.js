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

jest.mock("@/engine/pathfinding/build-walk-path", () => ({
  WalkPathCode: { Ready: 0, Incomplete: 1, Fail: 3 },
  buildWalkPath: (...args: unknown[]) => mockPlotPath(...args),
}));

jest.mock("@/engine/pathfinding/tick-creature-walk", () => ({
  CreatureWalkResult: { OK: 1, ARRIVED: 2, BLOCKED: 3 },
  tickCreatureWalk: (...args: unknown[]) => mockWalkUpdate(...args),
}));

const mockIsWalkmeshHopBlocked = jest.fn(() => false);
const mockDropWalkmeshBlockedPathPrefix = jest.fn(() => 0);
const mockFindWalkClearDetour = jest.fn(() => undefined);
const mockPathHopsAreWalkClear = jest.fn(() => true);
const mockIsWalkmeshEdgeWalkClear = jest.fn(() => true);

jest.mock("@/engine/pathfinding/path-hops-clear", () => ({
  WALKMESH_BLOCK_REPATH_FRAMES: 3,
  isWalkmeshHopBlocked: (...args: unknown[]) => mockIsWalkmeshHopBlocked(...args),
  dropWalkmeshBlockedPathPrefix: (...args: unknown[]) =>
    mockDropWalkmeshBlockedPathPrefix(...args),
  findWalkClearDetour: (...args: unknown[]) => mockFindWalkClearDetour(...args),
  pathHopsAreWalkClear: (...args: unknown[]) => mockPathHopsAreWalkClear(...args),
  isWalkmeshEdgeWalkClear: (...args: unknown[]) => mockIsWalkmeshEdgeWalkClear(...args),
}));

jest.mock("@/engine/pathfinding/inter-area-path", () => ({
  beginInterAreaPath: () => {},
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (value: unknown) => typeof value === "object" && value !== null,
    InstanceOf: () => true,
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

const mockFindSafeLocation = jest.fn();

jest.mock("@/engine/pathfinding/open-walk-location", () => ({
  findOpenWalkLocation: (...args: unknown[]) => mockFindSafeLocation(...args),
}));

const mockIsInUseRange = jest.fn(() => false);

jest.mock("@/actions/use-range", () => ({
  isInUseRange: (...args: unknown[]) => mockIsInUseRange(...args),
}));

import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { WalkPathCode } from "@/engine/pathfinding/build-walk-path";
import type { ModuleCreature } from "@/module/ModuleCreature";

function makeMockPath(points: THREE.Vector3[]) {
  const path: any = {
    points: points.map((v) => ({ vector: v.clone() })),
    fixWalkEdges: jest.fn(),
    setColor: jest.fn(),
    realtime: false,
    timer: 20,
    pop() {
      return this.points.shift();
    },
    clone() {
      return makeMockPath(this.points.map((p: { vector: THREE.Vector3 }) => p.vector));
    },
    merge(other: { points: Array<{ vector: THREE.Vector3 }> }) {
      const end = this.points[this.points.length - 1];
      const start = other.points[0];
      let rest = other.points;
      if(
        end &&
        start &&
        end.vector.distanceToSquared(start.vector) < 1e-8
      ){
        rest = other.points.slice(1);
      }
      this.points = [...this.points, ...rest.map((p) => ({ vector: p.vector.clone() }))];
      return this;
    },
  };
  return path;
}

describe("ActionMoveToPoint live-chase repath", () => {
  beforeEach(() => {
    mockPlotPath.mockReset();
    mockWalkUpdate.mockReset();
    mockIsInUseRange.mockReset();
    mockIsInUseRange.mockReturnValue(false);
    mockIsWalkmeshHopBlocked.mockReset();
    mockIsWalkmeshHopBlocked.mockReturnValue(false);
    mockDropWalkmeshBlockedPathPrefix.mockReset();
    mockDropWalkmeshBlockedPathPrefix.mockReturnValue(0);
    mockFindWalkClearDetour.mockReset();
    mockFindWalkClearDetour.mockReturnValue(undefined);
    mockPathHopsAreWalkClear.mockReset();
    mockPathHopsAreWalkClear.mockReturnValue(true);
    mockIsWalkmeshEdgeWalkClear.mockReset();
    mockIsWalkmeshEdgeWalkClear.mockReturnValue(true);
    mockFindSafeLocation.mockReset();
    mockFindSafeLocation.mockImplementation((_area: unknown, center: THREE.Vector3, out: THREE.Vector3) => {
      out.copy(center);
      return true;
    });
    mockWalkUpdate.mockReturnValue(1);
    mockPlotPath.mockReturnValue({
      code: WalkPathCode.Ready,
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
    expect(mockFindSafeLocation).toHaveBeenCalled();
    expect(mockFindSafeLocation.mock.calls[0][3]).toMatchObject({
      radius: 20,
      requireLineOfSight: true,
    });
    expect(mockPlotPath).toHaveBeenCalled();
  });

  it("repathToLiveTargetInPlace falls back to live target when open/safe walk location fails", () => {
    mockFindSafeLocation.mockImplementation((_area: unknown, center: THREE.Vector3, out: THREE.Vector3) => {
      out.set(-1, -1, -1);
      return false;
    });
    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone().set(99, 99, 0),
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

    expect(action.target_position.x).toBeCloseTo(8, 4);
    expect(action.target_position.y).toBeCloseTo(0, 4);
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

  it("syncs cleared owner path after tickCreatureWalk / walk tick blocks", () => {
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
    mockPlotPath.mockReturnValue({ code: WalkPathCode.Ready, path });
    mockWalkUpdate.mockImplementation(() => {
      owner.setComputedPath(undefined);
      return 3;
    });
    // After sync clears the path, escapeWalkmeshJam replots immediately.
    mockIsWalkmeshHopBlocked.mockReturnValue(false);

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
    mockPlotPath.mockClear();
    // Full update path: BLOCKED clears owner path — escape replots without throwing
    // on computedPath.timer (creatureLoco crash).
    const status = action.update(1 / 60);

    expect(mockWalkUpdate).toHaveBeenCalled();
    expect(mockPlotPath).toHaveBeenCalled();
    expect(status).toBe(ActionStatus.IN_PROGRESS);
  });

  it("completes live chase when isInUseRange even if dist > param range", () => {
    // end_m01aa k_pend_traskdl40: tickCreatureWalk / walk tick early-outs at use.range+0.1 while
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
    // Same tickCreatureWalk / walk tick UseRange early-out as live chase — without this, OpenDoor /
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

  it("on walkmesh BLOCKED with stale hop, replots from current position", () => {
    const pathPoints = [
      { vector: new THREE.Vector3(79.16, 74.6, 0) },
      { vector: new THREE.Vector3(80.32, 73.0, 0) },
    ];
    const path = {
      points: pathPoints,
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: false,
      timer: -0.16,
      pop: jest.fn(() => {
        pathPoints.shift();
      }),
    };
    let ownerPath: unknown = path;
    const owner = {
      id: 1,
      position: new THREE.Vector3(79.62, 72.31, 0),
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
      blockingTimer: 6,
      pathFindApproachPersonalSpace: 0,
    } as unknown as ModuleCreature;

    mockWalkUpdate.mockReturnValue(3); // BLOCKED
    mockIsWalkmeshHopBlocked
      .mockReturnValueOnce(true) // first hop blocked
      .mockReturnValueOnce(true) // still blocked after drop
      .mockReturnValueOnce(false) // calculatePath narrow-corridor drive check
      .mockReturnValueOnce(false); // clear after replot
    mockDropWalkmeshBlockedPathPrefix.mockImplementation(() => {
      // leave a still-blocked final point
      while(pathPoints.length > 1) pathPoints.shift();
      return 1;
    });
    mockPlotPath.mockReturnValue({
      code: WalkPathCode.Ready,
      path: {
        points: [{ vector: new THREE.Vector3(80.32, 73.0, 0) }],
        fixWalkEdges: () => {},
        setColor: () => {},
        realtime: false,
        timer: 20,
        pop: () => {},
      },
    });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 80.32);
    action.setParameter(1, ActionParameterType.FLOAT, 73.0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.set(80.32, 73.0, 0);
    action.calculatePath();
    // Seed the stale path the creature was following.
    (action as { computedPath?: unknown }).computedPath = path;
    ownerPath = path;
    mockPlotPath.mockClear();
    // After seeding stale path, reset hop-blocked sequence for the update frame.
    mockIsWalkmeshHopBlocked.mockReset();
    mockIsWalkmeshHopBlocked
      .mockReturnValueOnce(true) // first hop blocked
      .mockReturnValueOnce(true) // still blocked after drop
      .mockReturnValueOnce(false) // calculatePath during replot
      .mockReturnValueOnce(false); // after replot clear

    const status = action.update(1 / 60);
    expect(status).toBe(ActionStatus.IN_PROGRESS);
    expect(mockIsWalkmeshHopBlocked).toHaveBeenCalled();
    expect(mockDropWalkmeshBlockedPathPrefix).toHaveBeenCalled();
    // repathFromCurrentPosition → calculatePath → buildWalkPath
    expect(mockPlotPath).toHaveBeenCalled();
  });

  it("on walkmesh BLOCKED when replot stays blocked, uses walk-clear detour", () => {
    const path = {
      points: [{ vector: new THREE.Vector3(79.16, 75.05, 0) }],
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: false,
      timer: 10,
      pop: () => {},
    };
    let ownerPath: unknown = path;
    const owner = {
      id: 1,
      position: new THREE.Vector3(78.95, 76.02, 0),
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
      blockingTimer: 6,
      pathFindApproachPersonalSpace: 0,
    } as unknown as ModuleCreature;

    const detour = new THREE.Vector3(79.5, 76.02, 0);
    const realDest = new THREE.Vector3(80.32, 73.0, 0);
    mockWalkUpdate.mockReturnValue(3);
    mockIsWalkmeshHopBlocked
      .mockReturnValueOnce(true) // enter recovery
      .mockReturnValueOnce(true) // still after drop
      .mockReturnValueOnce(false) // calculatePath drive check during replot
      .mockReturnValueOnce(true) // after direct replot still blocked
      .mockReturnValueOnce(false); // first hop of merged path clear
    mockFindWalkClearDetour.mockReturnValue(detour);
    mockPlotPath.mockImplementation((_area: unknown, _owner: unknown, info: any) => {
      return {
        code: WalkPathCode.Ready,
        path: makeMockPath([info.origin.clone(), info.dest.clone()]),
      };
    });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, realDest.x);
    action.setParameter(1, ActionParameterType.FLOAT, realDest.y);
    action.setParameter(2, ActionParameterType.FLOAT, realDest.z);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.copy(realDest);
    action.real_target_position.copy(realDest);
    (action as { computedPath?: unknown }).computedPath = path;
    ownerPath = path;

    expect(action.update(1 / 60)).toBe(ActionStatus.IN_PROGRESS);
    expect(mockFindWalkClearDetour).toHaveBeenCalled();
    // Destination params stay on the real attack target — not the detour.
    expect(action.target_position.x).toBeCloseTo(realDest.x, 3);
    expect(action.target_position.y).toBeCloseTo(realDest.y, 3);
    expect(action.getParameter<number>(0)).toBeCloseTo(realDest.x, 3);
    expect(action.getParameter<number>(1)).toBeCloseTo(realDest.y, 3);
    // Merged path installed: first hop toward detour, not immediate complete.
    const installed = (action as { computedPath?: { points: Array<{ vector: THREE.Vector3 }> } }).computedPath;
    expect(installed?.points?.length).toBeGreaterThan(1);
    expect(installed!.points[0].vector.x).toBeCloseTo(detour.x, 2);
    expect(mockWalkUpdate).toHaveBeenCalled();
  });

  it("off-walkmesh BLOCKED escape installs synthetic hop without mutating dest", () => {
    const path = {
      points: [{ vector: new THREE.Vector3(79.16, 75.05, 0) }],
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: false,
      timer: 10,
      pop: () => {},
    };
    let ownerPath: unknown = path;
    const owner = {
      id: 1,
      position: new THREE.Vector3(78.95, 76.02, 0),
      rotation: { z: 0 },
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) =>
          new THREE.Vector3(79.4, 76.02, p.z),
        isPointWalkable: (p: THREE.Vector3) => p.x > 79.2,
      },
      walkSpeedFactor: 1,
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
      blockingTimer: 6,
      pathFindApproachPersonalSpace: 0,
    } as unknown as ModuleCreature;

    const detour = new THREE.Vector3(79.4, 76.02, 0);
    const realDest = new THREE.Vector3(80.32, 73.0, 0);
    mockWalkUpdate.mockReturnValue(3);
    mockIsWalkmeshHopBlocked
      .mockReturnValueOnce(true) // enter recovery
      .mockReturnValueOnce(true) // still after drop
      .mockReturnValueOnce(false) // calculatePath drive check during replot
      .mockReturnValueOnce(true); // after replot still blocked → detour
    mockFindWalkClearDetour.mockReturnValue(detour);
    // Only leg2 (detour → dest) is built through buildWalkPath; leg1 is synthetic.
    mockPlotPath.mockImplementation((_area: unknown, _owner: unknown, info: any) => {
      return {
        code: WalkPathCode.Ready,
        path: makeMockPath([info.origin.clone(), info.dest.clone()]),
      };
    });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, realDest.x);
    action.setParameter(1, ActionParameterType.FLOAT, realDest.y);
    action.setParameter(2, ActionParameterType.FLOAT, realDest.z);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.copy(realDest);
    action.real_target_position.copy(realDest);
    (action as { computedPath?: unknown }).computedPath = path;
    ownerPath = path;

    expect(action.update(1 / 60)).toBe(ActionStatus.IN_PROGRESS);
    expect(action.target_position.x).toBeCloseTo(realDest.x, 3);
    expect(action.getParameter<number>(0)).toBeCloseTo(realDest.x, 3);
    const installed = (action as { computedPath?: { points: Array<{ vector: THREE.Vector3 }> } }).computedPath;
    expect(installed?.points?.length).toBeGreaterThan(0);
    expect(installed!.points[0].vector.x).toBeCloseTo(detour.x, 2);
  });

  it("detour leg2 Fail with walk-clear straight chord uses direct dest hop", () => {
    let ownerPath: unknown;
    const owner = {
      id: 1,
      position: new THREE.Vector3(76.74, 83.28, 0),
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
      pathFindApproachPersonalSpace: 0,
      pathFindDrivePersonalSpace: -1,
    } as unknown as ModuleCreature;

    const detour = new THREE.Vector3(77.89, 80.51, 0);
    const realDest = new THREE.Vector3(80.32, 73.0, 0);
    mockFindWalkClearDetour.mockReturnValue(detour);
    mockIsWalkmeshEdgeWalkClear.mockReturnValue(true);
    mockPathHopsAreWalkClear.mockReturnValue(true);
    mockIsWalkmeshHopBlocked.mockReturnValue(false);
    mockWalkUpdate.mockReturnValue(1);

    let plotCalls = 0;
    mockPlotPath.mockImplementation((_area: unknown, _owner: unknown, info: any) => {
      plotCalls++;
      // Initial calculatePath + leg1 Ready; leg2 graph Fail (poison PTH).
      if(plotCalls === 1){
        return { code: WalkPathCode.Fail };
      }
      if(plotCalls === 2){
        return {
          code: WalkPathCode.Ready,
          path: makeMockPath([info.origin.clone(), info.dest.clone()]),
        };
      }
      return { code: WalkPathCode.Fail, path: makeMockPath([info.origin.clone(), info.dest.clone()]) };
    });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, realDest.x);
    action.setParameter(1, ActionParameterType.FLOAT, realDest.y);
    action.setParameter(2, ActionParameterType.FLOAT, realDest.z);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 30);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 2.1);

    expect(action.update(1 / 60)).toBe(ActionStatus.IN_PROGRESS);
    expect(mockFindWalkClearDetour).toHaveBeenCalled();
    expect(mockIsWalkmeshEdgeWalkClear).toHaveBeenCalled();
    expect(action.target_position.x).toBeCloseTo(realDest.x, 3);
    expect(action.getParameter<number>(0)).toBeCloseTo(realDest.x, 3);
    const installed = (action as { computedPath?: { points: Array<{ vector: THREE.Vector3 }> } }).computedPath;
    expect(installed?.points?.length).toBeGreaterThan(1);
    const last = installed!.points[installed!.points.length - 1].vector;
    expect(last.x).toBeCloseTo(realDest.x, 2);
    expect(last.y).toBeCloseTo(realDest.y, 2);
    expect(owner.pathFindDrivePersonalSpace).toBe(0);
  });

  it("on walkmesh BLOCKED when replot and detour fail, returns FAILED", () => {
    const path = {
      points: [{ vector: new THREE.Vector3(79.16, 75.05, 0) }],
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: false,
      timer: 10,
      pop: () => {},
    };
    let ownerPath: unknown = path;
    const owner = {
      id: 1,
      position: new THREE.Vector3(78.95, 76.02, 0),
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
      blockingTimer: 6,
      pathFindApproachPersonalSpace: 0,
    } as unknown as ModuleCreature;

    mockWalkUpdate.mockReturnValue(3);
    mockIsWalkmeshHopBlocked.mockReturnValue(true);
    mockFindWalkClearDetour.mockReturnValue(undefined);
    mockPlotPath.mockReturnValue({ code: WalkPathCode.Fail });

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 80.32);
    action.setParameter(1, ActionParameterType.FLOAT, 73.0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.set(80.32, 73.0, 0);
    (action as { computedPath?: unknown }).computedPath = path;
    ownerPath = path;

    expect(action.update(1 / 60)).toBe(ActionStatus.FAILED);
    expect(mockFindWalkClearDetour).toHaveBeenCalled();
    expect(owner.clearLocomotionState).toHaveBeenCalled();
  });

  it("on walkmesh BLOCKED when within arrive range but multi-point path still walking, completes", () => {
    // Multi-point paths keep walking while dist > 0.5 even if dist <= param-6 range.
    // Walkmesh BLOCKED must still complete once within arrive range.
    const path = {
      points: [
        { vector: new THREE.Vector3(0.8, 0, 0) },
        { vector: new THREE.Vector3(1.0, 0, 0) },
      ],
      fixWalkEdges: () => {},
      setColor: () => {},
      realtime: false,
      timer: 10,
      pop: () => {},
    };
    let ownerPath: unknown = path;
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
      blockingTimer: 6,
    } as unknown as ModuleCreature;

    mockWalkUpdate.mockReturnValue(3); // BLOCKED
    mockIsWalkmeshHopBlocked.mockReturnValue(true);

    const action = new ActionMoveToPoint();
    action.setOwner(owner);
    action.setParameter(0, ActionParameterType.FLOAT, 1.0);
    action.setParameter(1, ActionParameterType.FLOAT, 0);
    action.setParameter(2, ActionParameterType.FLOAT, 0);
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 2.1);
    action.target_position.set(1.0, 0, 0);
    (action as { computedPath?: unknown }).computedPath = path;

    expect(action.update(1 / 60)).toBe(ActionStatus.COMPLETE);
    expect(mockWalkUpdate).toHaveBeenCalled();
    expect(owner.clearLocomotionState).toHaveBeenCalled();
  });
});
