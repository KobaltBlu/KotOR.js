/**
 * ExternalForce / wall-slide must not tunnel through a room wall edge.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] as unknown[] },
    module: undefined,
    debug: {},
  },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getCreaturePersonalSpace: () => 0.4,
  getPathPersonalSpace: () => 0.5,
}));

jest.mock("@engine/module/guards/isCreature", () => ({
  isCreature: () => true,
}));

jest.mock("@engine/movement/movement-committer", () => ({
  commitMovement: jest.fn((creature: any, result: any) => {
    creature.position.copy(result.finalPosition);
    if(result.room && creature.attachToRoom) creature.attachToRoom(result.room);
    if(result.groundFace && creature.collisionManager){
      creature.collisionManager.groundFace = result.groundFace;
    }
  }),
}));

jest.mock("@engine/movement/creature-movement-state", () => ({
  setMovementAuthority: jest.fn(),
  ensureMovementState: () => ({
    blockingObject: undefined,
    lastBlockingObject: undefined,
    collisionTime: 0,
    actualVelocity: new THREE.Vector3(),
  }),
}));

const testStaticMovementMock = jest.fn();
const testCreatureMovementMock = jest.fn();
const findWalkableAttachmentAtMock = jest.fn();

jest.mock("@engine/movement/area-movement-queries", () => ({
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2 },
  testStaticMovement: (...args: unknown[]) => testStaticMovementMock(...args),
  testCreatureMovement: (...args: unknown[]) => testCreatureMovementMock(...args),
  findWalkableAttachmentAt: (...args: unknown[]) =>
    findWalkableAttachmentAtMock(...args),
}));

jest.mock("@engine/movement/wall-slide", () => ({
  collectBlockingWalkEdgeNormals: (
    _area: unknown,
    _pt: THREE.Vector3,
    _r: number,
    out: THREE.Vector3[]
  ) => {
    out.length = 0;
    out.push(new THREE.Vector3(0, 1, 0));
    return out;
  },
  projectDesiredOntoNormals: (
    dx: number,
    dy: number,
    normals: THREE.Vector3[],
    out: THREE.Vector3
  ) => {
    out.set(dx, dy, 0);
    for(const n of normals){
      const vn = out.x * n.x + out.y * n.y;
      if(vn < 0){
        out.x -= n.x * vn;
        out.y -= n.y * vn;
      }
    }
    return out;
  },
}));

import { resolveExternalForceStep, tickExternalForceStep } from "@engine/movement/external-force-policy";
import { MovementStatus } from "@engine/movement/types";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleArea } from "@engine/module/ModuleArea";

describe("ExternalForce wall tunnel guard", () => {
  beforeEach(() => {
    testStaticMovementMock.mockReset();
    testCreatureMovementMock.mockReset();
    findWalkableAttachmentAtMock.mockReset();
    testCreatureMovementMock.mockReturnValue({ clear: true, raw: { clear: true } });
    findWalkableAttachmentAtMock.mockReturnValue(undefined);
  });

  it("does not accept a full into-wall impulse when static blocks (projects to zero)", () => {
    testStaticMovementMock.mockReturnValue({
      clear: false,
      hit: { kind: "Walkmesh" },
      walkHit: {
        code: -1,
        ok: false,
        clearT: 0,
        clearPoint: new THREE.Vector3(0, 1.5, 0),
        walkHit: { normal: new THREE.Vector3(0, 1, 0) },
      },
    });

    const creature = {
      position: new THREE.Vector3(0, 1.5, 0),
      area: {} as ModuleArea,
      room: undefined,
    } as unknown as ModuleCreature;

    // Desired into wall (−Y); wall normal +Y → projected slide ≈ 0
    const result = resolveExternalForceStep(
      creature,
      new THREE.Vector3(0, -5, 0)
    );
    expect(result.status).toBe(MovementStatus.Blocked);
    expect(result.finalPosition.y).toBeCloseTo(1.5);
  });

  it("commits along-wall residual after projecting into-wall component away", () => {
    testStaticMovementMock.mockImplementation(
      (_a: unknown, from: THREE.Vector3, to: THREE.Vector3) => {
        if(Math.abs(to.y - from.y) > 0.01){
          return {
            clear: false,
            walkHit: {
              code: -1,
              ok: false,
              clearT: 0,
              clearPoint: from.clone(),
              walkHit: { normal: new THREE.Vector3(0, 1, 0) },
            },
          };
        }
        return {
          clear: true,
          walkHit: { code: 1, ok: true, clearT: 1, clearPoint: to.clone() },
        };
      }
    );

    const creature = {
      position: new THREE.Vector3(0, 1.0, 0),
      area: {} as ModuleArea,
      room: undefined,
      attachToRoom: jest.fn(),
      collisionManager: {},
    } as unknown as ModuleCreature;

    const result = tickExternalForceStep(
      creature,
      new THREE.Vector3(0.5, -0.2, 0),
      0.016
    );
    expect(result.status).toBe(MovementStatus.Moving);
    expect(result.finalPosition.x).toBeGreaterThan(0.2);
    expect(result.finalPosition.y).toBeCloseTo(1.0, 1);
  });
});
