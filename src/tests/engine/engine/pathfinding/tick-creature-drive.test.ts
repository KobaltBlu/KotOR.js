/**
 * creature drive update creature-block gates + thin probe prepare.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const noCreaturesMock = jest.fn();
const nudgeFriendlyCreaturesMock = jest.fn();
const probeDriveStepClearMock = jest.fn();

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

jest.mock("@engine/pathfinding/drive-step-clear", () => ({
  probeDriveStepClear: (...args: unknown[]) => probeDriveStepClearMock(...args),
  getDriveProbeCount: () => 0,
  resetDriveProbeCount: () => undefined,
}));

jest.mock("@engine/movement/wall-slide", () => ({
  collectBlockingWalkEdgeNormals: (
    _area: unknown,
    _origin: unknown,
    _r: unknown,
    out: THREE.Vector3[]
  ) => {
    out.length = 0;
    out.push(new THREE.Vector3(-1, 0, 0));
  },
  projectDesiredOntoNormals: () => undefined,
}));

import { driveResolveMoveTarget } from "@engine/pathfinding/tick-creature-drive";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

describe("driveResolveMoveTarget creature bump gate", () => {
  const blocker = { id: 9, position: new THREE.Vector3(1, 0, 0) };
  const area = {
    creatures: [blocker],
  } as unknown as Area;
  const owner = {
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    area,
  } as unknown as Creature;

  beforeEach(() => {
    noCreaturesMock.mockReset();
    nudgeFriendlyCreaturesMock.mockReset();
    probeDriveStepClearMock.mockReset();
    probeDriveStepClearMock.mockReturnValue({
      clear: true,
      clearT: 1,
      clearPoint: new THREE.Vector3(5, 0, 0),
      code: 1,
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
    expect(probeDriveStepClearMock).not.toHaveBeenCalled();
  });

  it("continues resolving when nudgeFriendlyCreatures clears the creature blocker", () => {
    noCreaturesMock.mockReturnValue({ clear: false, blockingCreatureId: 9 });
    nudgeFriendlyCreaturesMock.mockReturnValue(true);

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(resolved).toEqual(ideal);
    expect(probeDriveStepClearMock).toHaveBeenCalled();
  });
});

describe("drivePrepareDestination thin probe budget", () => {
  const area = {
    creatures: [],
    getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
  } as unknown as Area;
  const owner = {
    id: 1,
    position: new THREE.Vector3(0, 0, 0),
    area,
    locomotionScale: 1,
  } as unknown as Creature;

  beforeEach(() => {
    noCreaturesMock.mockReset();
    noCreaturesMock.mockReturnValue({ clear: true });
    nudgeFriendlyCreaturesMock.mockReset();
    probeDriveStepClearMock.mockReset();
  });

  it("uses at most 3 thin probes on a blocked corridor (not tens of full WLC)", () => {
    // First probe blocked with clearT; retries may clear on second.
    probeDriveStepClearMock
      .mockReturnValueOnce({
        clear: false,
        clearT: 0.2,
        clearPoint: new THREE.Vector3(1, 0, 0),
        code: -2,
        normal: new THREE.Vector3(-1, 0, 0),
      })
      .mockReturnValue({
        clear: true,
        clearT: 1,
        clearPoint: new THREE.Vector3(0, 5, 0),
        code: 1,
      });

    const origin = new THREE.Vector3(0, 0, 0);
    const ideal = new THREE.Vector3(5, 0, 0);
    const resolved = driveResolveMoveTarget(area, origin, ideal, owner);

    expect(probeDriveStepClearMock.mock.calls.length).toBeLessThanOrEqual(3);
    expect(probeDriveStepClearMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(resolved).not.toEqual(origin);
  });
});
