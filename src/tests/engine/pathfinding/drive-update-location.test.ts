/**
 * DriveUpdateLocation creature-block gates.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const noCreaturesMock = jest.fn();
const bumpFriendsMock = jest.fn();
const testDirectLineMock = jest.fn();

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: { party: [] },
    module: undefined,
  },
}));

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
  },
}));

jest.mock("@/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@/engine/pathfinding/no-creatures-on-line", () => ({
  noCreaturesOnLine: (...args: unknown[]) => noCreaturesMock(...args),
}));

jest.mock("@/engine/pathfinding/bump-friends", () => ({
  bumpFriends: (...args: unknown[]) => bumpFriendsMock(...args),
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  testDirectLine: (...args: unknown[]) => testDirectLineMock(...args),
  TestDirectLineCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
}));

import { driveResolveMoveTarget } from "@/engine/pathfinding/drive-update-location";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";

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
    bumpFriendsMock.mockReset();
    testDirectLineMock.mockReset();
    testDirectLineMock.mockReturnValue({
      code: 1,
      ok: true,
      clearT: 1,
      clearPoint: new THREE.Vector3(5, 0, 0),
    });
  });

  it("stays put when a creature blocks and BumpFriends cannot clear it", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(false);

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(resolved).toEqual(origin);
    expect(bumpFriendsMock).toHaveBeenCalledWith(owner, blocker, ideal, origin);
    expect(testDirectLineMock).not.toHaveBeenCalled();
  });

  it("continues resolving when BumpFriends clears the creature blocker", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    bumpFriendsMock.mockReturnValue(true);

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(resolved).toEqual(ideal);
    expect(testDirectLineMock).toHaveBeenCalled();
  });
});
