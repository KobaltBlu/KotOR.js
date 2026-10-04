/**
 * creature drive update creature-block gates.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const noCreaturesMock = jest.fn();
const nudgeFriendlyCreaturesMock = jest.fn();
const hasWalkLineClearMock = jest.fn();

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] },
    module: undefined,
  },
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
    InstanceOf: () => true,
  },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: (...args: unknown[]) => noCreaturesMock(...args),
}));

jest.mock("@engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: (...args: unknown[]) => nudgeFriendlyCreaturesMock(...args),
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasWalkLineClear: (...args: unknown[]) => hasWalkLineClearMock(...args),
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
}));

import { driveResolveMoveTarget } from "@engine/pathfinding/tick-creature-drive";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleCreature } from "@engine/module/ModuleCreature";

describe("driveResolveMoveTarget creature bump gate", () => {
  const blocker = { id: 9, position: new THREE.Vector3(1, 0, 0) };
  const area = {
    creatures: [blocker],
  } as unknown as ModuleArea;
  const owner = {
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    area,
  } as unknown as ModuleCreature;

  beforeEach(() => {
    noCreaturesMock.mockReset();
    nudgeFriendlyCreaturesMock.mockReset();
    hasWalkLineClearMock.mockReset();
    hasWalkLineClearMock.mockReturnValue({
      code: 1,
      ok: true,
      clearT: 1,
      clearPoint: new THREE.Vector3(5, 0, 0),
    });
  });

  it("stays put when a creature blocks and nudgeFriendlyCreatures cannot clear it", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(false);

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(resolved).toEqual(origin);
    expect(nudgeFriendlyCreaturesMock).toHaveBeenCalledWith(owner, blocker, ideal, origin);
    expect(hasWalkLineClearMock).not.toHaveBeenCalled();
  });

  it("continues resolving when nudgeFriendlyCreatures clears the creature blocker", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(true);

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(resolved).toEqual(ideal);
    expect(hasWalkLineClearMock).toHaveBeenCalled();
  });
});
