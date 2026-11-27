/**
 * creature walk update — start-overlap must not walk through creatures.
 * Uses real isCreatureCapsuleClear (not mocked).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { GameObjectType } from "@core/enums/module/GameObjectType";

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

const nudgeFriendlyCreaturesMock = jest.fn();
jest.mock("@engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: (...args: unknown[]) => nudgeFriendlyCreaturesMock(...args),
}));

const plotHexMock = jest.fn();
jest.mock("@engine/pathfinding/build-path-around-creature", () => ({
  buildPathAroundCreature: (...args: unknown[]) => plotHexMock(...args),
}));

const tickCreatureDriveMock = jest.fn();
jest.mock("@engine/pathfinding/tick-creature-drive", () => ({
  DriveUpdateResult: { OK: 1, ARRIVED: 2, BLOCKED: 3 },
  tickCreatureDrive: (...args: unknown[]) => tickCreatureDriveMock(...args),
}));

import { tickCreatureWalk } from "@engine/pathfinding/tick-creature-walk";
import { DriveUpdateResult } from "@engine/pathfinding/tick-creature-drive";
import type { Creature } from "@engine/module/Creature";

function makeCreature(
  id: number,
  x: number,
  y: number,
  extras: Record<string, unknown> = {}
): Creature {
  return {
    id,
    objectType: GameObjectType.Creature,
    position: new THREE.Vector3(x, y, 0),
    rotation: { z: 0 },
    isDead: () => false,
    getAppearance: () => ({ creperspace: 0.4, perspace: 0.35 }),
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
    pathBlockFailCount: 0,
    locomotionScale: 1,
    walkSpeedFactor: 0.5,
    setComputedPath: jest.fn(),
    setAnimationState: jest.fn(),
    walk: false,
    force: 1,
    speed: 1,
    ...extras,
  } as unknown as Creature;
}

describe("tickCreatureWalk start-overlap (real capsule)", () => {
  beforeEach(() => {
    nudgeFriendlyCreaturesMock.mockReset();
    plotHexMock.mockReset();
    tickCreatureDriveMock.mockReset();
    tickCreatureDriveMock.mockReturnValue(DriveUpdateResult.OK);
    nudgeFriendlyCreaturesMock.mockReturnValue(false);
    plotHexMock.mockReturnValue({ spliced: false });
  });

  it("does not advance through an overlapping creature (blocks dig-deeper)", () => {
    // Pre-overlapped pair: centers 0.3m apart, creperspace sum ≈ 0.81.
    const blocker = makeCreature(9, 1.0, 0);
    const owner = makeCreature(1, 0.7, 0, {
      area: {
        creatures: [] as Creature[],
        isPointWalkable: () => true,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      },
    });
    (owner.area as { creatures: Creature[] }).creatures = [owner, blocker];

    const before = owner.position.clone();
    const result = tickCreatureWalk(
      owner,
      new THREE.Vector3(5, 0, 0),
      false,
      0.05
    );

    // Capsule hit → nudge/hex path, not drive commit through the body.
    expect(tickCreatureDriveMock).not.toHaveBeenCalled();
    expect(result).toBe(DriveUpdateResult.BLOCKED);
    expect(owner.position.x).toBeCloseTo(before.x, 5);
    expect(owner.position.y).toBeCloseTo(before.y, 5);
    // Still reaches the existing blocked recovery path.
    expect(nudgeFriendlyCreaturesMock).toHaveBeenCalled();
    expect(plotHexMock).toHaveBeenCalled();
  });

  it("arrives without bump or hex when the blocking creature is the use target", () => {
    const blocker = makeCreature(9, 1.0, 0);
    const owner = makeCreature(1, 0.7, 0, {
      pathBlockFailCount: 3,
      walkSpeedFactor: 0.75,
      area: {
        creatures: [] as Creature[],
        isPointWalkable: () => true,
        getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      },
    });
    (owner.area as { creatures: Creature[] }).creatures = [owner, blocker];

    const result = tickCreatureWalk(
      owner,
      new THREE.Vector3(5, 0, 0),
      false,
      0.05,
      { useRangeTargetId: 9 }
    );

    expect(result).toBe(DriveUpdateResult.ARRIVED);
    expect(nudgeFriendlyCreaturesMock).not.toHaveBeenCalled();
    expect(plotHexMock).not.toHaveBeenCalled();
    expect(tickCreatureDriveMock).not.toHaveBeenCalled();
    expect(owner.setComputedPath).toHaveBeenCalledWith(undefined);
    expect(owner.pathBlockFailCount).toBe(0);
    expect(owner.walkSpeedFactor).toBe(0);
  });
});
