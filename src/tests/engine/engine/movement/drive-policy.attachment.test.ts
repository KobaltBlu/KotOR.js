/**
 * Drive resolve fills room/groundFace for VIS reattach on commit.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const testCreatureMovementMock = jest.fn();
const testStaticMovementMock = jest.fn();
const findWalkableAttachmentAtMock = jest.fn();
const findGroundMock = jest.fn();
const queryDoorCrossingMock = jest.fn();

jest.mock("@engine/runtime/GameState", () => ({
  GameState: { PartyManager: { party: [] as unknown[] } },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.4,
}));

jest.mock("@engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: () => false,
}));

jest.mock("@engine/module/guards/isCreature", () => ({
  isCreature: () => true,
}));

jest.mock("@engine/movement/area-movement-queries", () => ({
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  testCreatureMovement: (...args: unknown[]) => testCreatureMovementMock(...args),
  testStaticMovement: (...args: unknown[]) => testStaticMovementMock(...args),
  testWalkSegment: () => ({ code: 1, ok: true, clearT: 1 }),
  findGround: (...args: unknown[]) => findGroundMock(...args),
  findWalkableAttachmentAt: (...args: unknown[]) =>
    findWalkableAttachmentAtMock(...args),
  queryDoorCrossing: (...args: unknown[]) => queryDoorCrossingMock(...args),
}));

jest.mock("@engine/movement/movement-committer", () => ({
  commitMovement: jest.fn(),
}));

jest.mock("@engine/movement/creature-movement-state", () => ({
  setMovementAuthority: jest.fn(),
}));

import { resolveDriveStep } from "@engine/movement/drive-policy";
import { MovementStatus } from "@engine/movement/types";
import type { Creature } from "@engine/module/Creature";
import type { Area } from "@engine/module/Area";

describe("resolveDriveStep room attachment", () => {
  beforeEach(() => {
    testCreatureMovementMock.mockReset();
    testStaticMovementMock.mockReset();
    findWalkableAttachmentAtMock.mockReset();
    findGroundMock.mockReset();
    queryDoorCrossingMock.mockReset();
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    testStaticMovementMock.mockReturnValue({
      clear: true,
      walkHit: { code: 1, ok: true, clearT: 1, clearPoint: new THREE.Vector3() },
    });
    queryDoorCrossingMock.mockReturnValue(undefined);
    findGroundMock.mockReturnValue(undefined);
  });

  it("sets room and groundFace from attachment probe on a clear step", () => {
    const room = { roomName: "m02ac_02e" };
    const face = { walkIndex: 21 };
    findWalkableAttachmentAtMock.mockReturnValue({ room, face, z: 0.005 });

    const area = {} as Area;
    const creature = {
      position: new THREE.Vector3(0, 0, 0),
      area,
      room: { roomName: "m02ac_02j" },
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      movementSpeed: 1,
      locomotionScale: 1,
    } as unknown as Creature;

    const result = resolveDriveStep(
      creature,
      new THREE.Vector3(1, 0, 0),
      false,
      0.1
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.room).toBe(room);
    expect(result.groundFace).toBe(face);
    expect(result.finalPosition.z).toBeCloseTo(0.005);
  });

  it("blocks and sets blockAfterDoorSignal when crossing a linked open door", () => {
    const door = { id: 7 };
    queryDoorCrossingMock.mockReturnValue({ door, linkedOpen: true });

    const area = {} as Area;
    const creature = {
      position: new THREE.Vector3(0, 0, 0),
      area,
      getWalkSpeed: () => 1.7,
      getRunSpeed: () => 5.4,
      movementSpeed: 1,
      locomotionScale: 1,
    } as unknown as Creature;

    const result = resolveDriveStep(
      creature,
      new THREE.Vector3(1, 0, 0),
      false,
      0.1
    );
    expect(result.status).toBe(MovementStatus.Blocked);
    expect(result.blockAfterDoorSignal).toBe(true);
    expect(result.crossedTransition).toBe(door);
    expect(result.actualDistance).toBe(0);
  });
});
