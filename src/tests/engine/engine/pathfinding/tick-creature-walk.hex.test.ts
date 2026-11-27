/**
 * creature walk update mid-step hex field141 (G2).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const blocker = {
  id: 9,
  position: new THREE.Vector3(1, 0, 0),
};

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    module: undefined,
    PartyManager: { party: [] },
    GameObjectManager: { GetObjectById: () => undefined },
  },
}));

jest.mock("@engine/actions/use-range", () => ({
  isInUseRange: () => false,
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
    InstanceOf: () => true,
  },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.5,
}));

const noCreaturesMock = jest.fn();
jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: (...args: unknown[]) => noCreaturesMock(...args),
}));

const nudgeFriendlyCreaturesMock = jest.fn();
jest.mock("@engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: (...args: unknown[]) => nudgeFriendlyCreaturesMock(...args),
}));

const plotHexMock = jest.fn();
jest.mock("@engine/pathfinding/build-path-around-creature", () => ({
  buildPathAroundCreature: (...args: unknown[]) => plotHexMock(...args),
}));

jest.mock("@engine/pathfinding/tick-creature-drive", () => ({
  DriveUpdateResult: { OK: 0, BLOCKED: 1, ARRIVED: 2 },
  tickCreatureDrive: () => 0,
}));

import { tickCreatureWalk } from "@engine/pathfinding/tick-creature-walk";
import type { Creature } from "@engine/module/Creature";

describe("tickCreatureWalk mid-step hex (G2)", () => {
  let owner: Creature & {
    pathBlockFailCount: number;
    setComputedPath: jest.Mock;
    setAnimationState: jest.Mock;
  };

  beforeEach(() => {
    noCreaturesMock.mockReset();
    nudgeFriendlyCreaturesMock.mockReset();
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
    } as unknown as Creature & {
      pathBlockFailCount: number;
      setComputedPath: jest.Mock;
      setAnimationState: jest.Mock;
    };
  });

  it("bumps friends without hex when blocker is bumpable", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(true);

    tickCreatureWalk(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(nudgeFriendlyCreaturesMock).toHaveBeenCalled();
    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.pathBlockFailCount).toBe(0);
  });

  it("hex-splices once when bump fails and count < 6", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(false);
    plotHexMock.mockReturnValue({ spliced: true });

    tickCreatureWalk(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).toHaveBeenCalledTimes(1);
    expect(owner.pathBlockFailCount).toBe(0); // reset on successful splice
  });

  it("pauses and clears path when hex fails (engine buildPathAroundCreature miss)", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(false);
    plotHexMock.mockReturnValue({ spliced: false });

    tickCreatureWalk(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).toHaveBeenCalledTimes(1);
    expect(owner.setAnimationState).toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(1);
  });

  it("clears path at sixth fail without further hex", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(false);
    owner.pathBlockFailCount = 5; // next fail → 6

    tickCreatureWalk(owner, new THREE.Vector3(5, 0, 0), false, 0.05);

    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(0);
  });

  it("arrives without bump or hex when the blocking creature is the use target", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    owner.pathBlockFailCount = 3;
    owner.walkSpeedFactor = 0.75;

    const result = tickCreatureWalk(owner, new THREE.Vector3(5, 0, 0), false, 0.05, {
      useRangeTargetId: 9,
    });

    expect(result).toBe(2);
    expect(nudgeFriendlyCreaturesMock).not.toHaveBeenCalled();
    expect(plotHexMock).not.toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(0);
    expect(owner.walkSpeedFactor).toBe(0);
    expect(owner.setAnimationState).toHaveBeenCalled();
  });
});
