/**
 * Live-chase in-place repath preserves walkSpeedFactor.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const mockPlotPath = jest.fn();

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
      GetObjectById: (id: number) => (id === 2 ? { id: 2 } : undefined),
    },
    PartyManager: { party: [] },
  },
}));

jest.mock("@/engine/pathfinding/plot-path", () => ({
  PlotPathCode: { Ready: 0, Incomplete: 1, Fail: 3 },
  plotPath: (...args: unknown[]) => mockPlotPath(...args),
}));

jest.mock("@/engine/pathfinding/walk-update-location", () => ({
  walkUpdateLocation: () => {},
}));

jest.mock("@/engine/pathfinding/inter-area-path", () => ({
  beginInterAreaPath: () => {},
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: () => true,
    InstanceOf: () => true,
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

import { ActionMoveToPoint } from "@/actions/ActionMoveToPoint";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { PlotPathCode } from "@/engine/pathfinding/plot-path";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("ActionMoveToPoint live-chase repath", () => {
  beforeEach(() => {
    mockPlotPath.mockReset();
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
});
