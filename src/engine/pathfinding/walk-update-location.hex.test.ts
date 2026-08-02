/**
 * WalkUpdateLocation mid-step hex field141 (G2).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const blocker = {
  id: 9,
  position: new THREE.Vector3(1, 0, 0),
};

jest.mock("@/GameState", () => ({
  GameState: {
    module: undefined,
    PartyManager: { party: [] },
    ModuleObjectManager: { GetObjectById: () => undefined },
  },
}));

jest.mock("@/actions/use-range", () => ({
  isInUseRange: () => false,
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

const noCreaturesMock = jest.fn();
jest.mock("@/engine/pathfinding/no-creatures-on-line", () => ({
  noCreaturesOnLine: (...args: unknown[]) => noCreaturesMock(...args),
}));

const bumpFriendsMock = jest.fn();
jest.mock("@/engine/pathfinding/bump-friends", () => ({
  bumpFriends: (...args: unknown[]) => bumpFriendsMock(...args),
}));

const plotHexMock = jest.fn();
jest.mock("@/engine/pathfinding/plot-path-around-creature", () => ({
  plotPathAroundCreature: (...args: unknown[]) => plotHexMock(...args),
}));

jest.mock("@/engine/pathfinding/drive-update-location", () => ({
  DriveUpdateResult: { OK: 0, BLOCKED: 1, ARRIVED: 2 },
  driveUpdateLocation: () => 0,
}));

import { walkUpdateLocation } from "@/engine/pathfinding/walk-update-location";
import type { ModuleCreature } from "@/module/ModuleCreature";

describe("walkUpdateLocation mid-step hex (G2)", () => {
  let owner: ModuleCreature & {
    pathBlockFailCount: number;
    setComputedPath: jest.Mock;
    setAnimationState: jest.Mock;
  };

  beforeEach(() => {
    noCreaturesMock.mockReset();
    bumpFriendsMock.mockReset();
    plotHexMock.mockReset();
    owner = {
      position: new THREE.Vector3(0, 0, 0),
      rotation: { z: 0 },
      area: {
        creatures: [blocker],
        isPointWalkable: () => true,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      },
      pathBlockFailCount: 0,
      locomotionScale: 1,
      walkSpeedFactor: 0.5,
      setComputedPath: jest.fn(),
      setAnimationState: jest.fn(),
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      walk: false,
      force: 1,
      speed: 1,
    } as unknown as ModuleCreature & {
      pathBlockFailCount: number;
      setComputedPath: jest.Mock;
      setAnimationState: jest.Mock;
    };
  });

  it("bumps friends without hex when blocker is bumpable", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(true);

    walkUpdateLocation(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(bumpFriendsMock).toHaveBeenCalled();
    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.pathBlockFailCount).toBe(0);
  });

  it("hex-splices once when bump fails and count < 6", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(false);
    plotHexMock.mockReturnValue({ spliced: true });

    walkUpdateLocation(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).toHaveBeenCalledTimes(1);
    expect(owner.pathBlockFailCount).toBe(0); // reset on successful splice
  });

  it("pauses and clears path when hex fails (retail PlotPathAroundCreature miss)", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(false);
    plotHexMock.mockReturnValue({ spliced: false });

    walkUpdateLocation(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).toHaveBeenCalledTimes(1);
    expect(owner.setAnimationState).toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(1);
  });

  it("clears path at sixth fail without further hex", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(false);
    owner.pathBlockFailCount = 5; // next fail → 6

    walkUpdateLocation(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(0);
  });

  it("arrives without bump or hex when the blocking creature is the use target", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    owner.pathBlockFailCount = 3;
    owner.walkSpeedFactor = 0.75;

    const result = walkUpdateLocation(owner, new THREE.Vector3(5, 0, 0), false, 0.05, {
      useRangeTargetId: 9,
    });

    expect(result).toBe(2);
    expect(bumpFriendsMock).not.toHaveBeenCalled();
    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(0);
    expect(owner.walkSpeedFactor).toBe(0);
    expect(owner.setAnimationState).toHaveBeenCalled();
  });
});
