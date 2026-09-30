/**
 * ActionMoveToPoint destination snap uses capsule-safe open-walk when
 * PreferWalkable leaves a wall-buffer lip.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockPlotPath = jest.fn();
const mockWalkUpdate = jest.fn();
const mockFindSafeLocation = jest.fn();
const mockIsSafeWalkPoint = jest.fn();
const mockEnsureSafeStanding = jest.fn(() => false);

jest.mock("@/three/odyssey", () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock("@/three/odyssey/OdysseyModel3D", () => ({
  OdysseyModel3D: class {},
}));

jest.mock("@/engine/OdysseyRenderPipeline", () => ({
  OdysseyRenderPipeline: {},
}));

jest.mock("@/GameState", () => ({
  GameState: {
    module: { area: { id: 1 } },
    ActionFactory: {},
    ModuleObjectManager: { GetObjectById: () => undefined },
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

jest.mock("@/engine/pathfinding/path-hops-clear", () => ({
  WALKMESH_BLOCK_REPATH_FRAMES: 3,
  isWalkmeshHopBlocked: () => false,
  dropWalkmeshBlockedPathPrefix: () => 0,
  findWalkClearDetour: () => undefined,
  pathHopsAreWalkClear: () => true,
  isWalkmeshEdgeWalkClear: () => true,
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
  getPathPersonalSpace: () => 1.0,
}));

jest.mock("@/engine/pathfinding/open-walk-location", () => ({
  findOpenWalkLocation: (...args: unknown[]) => mockFindSafeLocation(...args),
}));

jest.mock("@/engine/pathfinding/ensure-safe-standing", () => ({
  ensureSafeStandingPosition: (...args: unknown[]) => mockEnsureSafeStanding(...args),
}));

jest.mock("@/engine/pathfinding/safe-walk-point", () => ({
  isSafeWalkPoint: (...args: unknown[]) => mockIsSafeWalkPoint(...args),
}));

jest.mock("@/actions/use-range", () => ({
  isInUseRange: () => false,
}));

import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { WalkPathCode } from "@/engine/pathfinding/build-walk-path";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("ActionMoveToPoint capsule-safe dest snap", () => {
  beforeEach(() => {
    mockPlotPath.mockReset();
    mockWalkUpdate.mockReset();
    mockWalkUpdate.mockReturnValue(1);
    mockEnsureSafeStanding.mockReset();
    mockEnsureSafeStanding.mockReturnValue(false);
    mockIsSafeWalkPoint.mockReset();
    mockFindSafeLocation.mockReset();
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

  it("replaces an unsafe PreferWalkable dest with findOpenWalkLocation", () => {
    mockIsSafeWalkPoint.mockReturnValue(false);
    mockFindSafeLocation.mockImplementation(
      (_area: unknown, _center: THREE.Vector3, out: THREE.Vector3) => {
        out.set(4.5, -0.5, 0);
        return true;
      }
    );

    const owner = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      area: {
        id: 1,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
        isPointWalkable: () => true,
      },
      rotation: { z: 0 },
      actionQueue: { addFront: jest.fn() },
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
    action.setParameter(3, ActionParameterType.DWORD, 1);
    action.setParameter(4, ActionParameterType.DWORD, 0x7f000000);
    action.setParameter(5, ActionParameterType.INT, 1);
    action.setParameter(6, ActionParameterType.FLOAT, 0.1);
    action.target_position.set(5, 0, 0);

    action.update(1 / 60);

    expect(mockIsSafeWalkPoint).toHaveBeenCalled();
    expect(mockFindSafeLocation).toHaveBeenCalledWith(
      owner.area,
      expect.any(THREE.Vector3),
      expect.any(THREE.Vector3),
      expect.objectContaining({
        radius: 2,
        personalSpace: 1.0,
        owner,
      })
    );
    expect(action.target_position.x).toBeCloseTo(4.5, 4);
    expect(action.target_position.y).toBeCloseTo(-0.5, 4);
  });
});
