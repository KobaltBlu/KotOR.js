/**
 * Retail Movement Harmony — architecture invariant suite.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] },
    module: undefined,
    debug: {},
  },
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => !!v,
    InstanceOf: () => true,
  },
}));

jest.mock("@engine/module/guards/isCreature", () => ({
  isCreature: (o: unknown) => !!(o as { objectType?: number })?.objectType,
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  hasWalkLineClear: () => ({
    code: 1,
    ok: true,
    clearT: 1,
    clearPoint: new (require("three").Vector3)(0, 0, 0),
  }),
  WalkLineHitCode: { Ok: 1, Fail: 0, NonWalk: -1, DetailedBlock: -2, Creature: -3 },
  getWalkHeightAt: () => 0,
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: () => ({ clear: true }),
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.5,
  getCreaturePersonalSpace: () => 0.4,
}));

import {
  advanceMovementFrame,
  ensureMovementState,
  getMovementFrameId,
  setMovementAuthority,
} from "@engine/movement/creature-movement-state";
import { commitMovement } from "@engine/movement/movement-committer";
import { teleportObject } from "@engine/movement/teleport";
import { setMovementInstrumentation } from "@engine/movement/instrumentation";
import {
  testStaticMovement,
  testCreatureMovement,
} from "@engine/movement/area-movement-queries";
import {
  MovementAuthority,
  MovementHitKind,
  MovementPolicy,
  MovementSource,
  MovementStatus,
  type MovementIntent,
  type MovementResult,
} from "@engine/movement/types";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import type { Creature } from "@engine/module/Creature";
import type { Area } from "@engine/module/Area";

function mockCreature(id = 1): Creature {
  const c = {
    id,
    objectType: GameObjectType.Creature,
    position: new THREE.Vector3(0, 0, 0),
    force: 0,
    speed: 0,
    blockingTimer: 0,
    collisionTimer: 0,
    forceVector: new THREE.Vector3(),
    collisionManager: {
      blockingObject: undefined,
      groundFace: undefined,
      lastGroundFace: undefined,
      findWalkableFace: jest.fn(),
    },
    area: {
      creatures: [],
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
    } as unknown as Area,
    markCollisionMatrixDirty: jest.fn(),
    onBlocked: jest.fn(),
  };
  return c as unknown as Creature;
}

function movingResult(
  creature: Creature,
  dx: number,
  dy: number,
  source = MovementSource.Drive
): MovementResult {
  const origin = creature.position.clone();
  const finalPosition = new THREE.Vector3(origin.x + dx, origin.y + dy, origin.z);
  return {
    source,
    status: MovementStatus.Moving,
    origin,
    finalPosition,
    acceptedDisplacement: new THREE.Vector3(dx, dy, 0),
    actualDistance: Math.hypot(dx, dy),
  };
}

describe("movement contract types", () => {
  it("MovementIntent is request-only (no mutation fields beyond request data)", () => {
    const intent: MovementIntent = {
      source: MovementSource.Walk,
      origin: new THREE.Vector3(),
      desiredDisplacement: new THREE.Vector3(1, 0, 0),
      actorRadius: 0.5,
      actorHeight: 2,
      policy: MovementPolicy.Walk,
    };
    expect(intent.policy).toBe(MovementPolicy.Walk);
    expect(Object.keys(MovementPolicy).sort()).toEqual(
      [
        "Drive",
        "ExternalForce",
        "FollowLeader",
        "ForcePush",
        "FriendNudge",
        "Jump",
        "PlayerControl",
        "SoftSeparate",
        "Walk",
      ].sort()
    );
  });
});

describe("MovementCommitter frame ownership", () => {
  beforeEach(() => {
    setMovementInstrumentation({ assert: true, log: false });
    advanceMovementFrame();
  });

  it("allows exactly one normal XY commit per creature per frame", () => {
    const creature = mockCreature();
    setMovementAuthority(creature, MovementAuthority.Drive);
    commitMovement(creature, movingResult(creature, 1, 0), { delta: 0.1 });
    expect(creature.position.x).toBeCloseTo(1);
    expect(ensureMovementState(creature).lastCommitFrame).toBe(getMovementFrameId());

    expect(() => {
      commitMovement(creature, movingResult(creature, 1, 0), { delta: 0.1 });
    }).toThrow(/multiple movement commits/);
  });

  it("allows a second commit after the frame advances", () => {
    const creature = mockCreature();
    commitMovement(creature, movingResult(creature, 1, 0), { delta: 0.1 });
    advanceMovementFrame();
    expect(() => {
      commitMovement(creature, movingResult(creature, 1, 0), { delta: 0.1 });
    }).not.toThrow();
    expect(creature.position.x).toBeCloseTo(2);
  });

  it("fires OnBlocked on contact enter only", () => {
    const creature = mockCreature();
    const blocker = mockCreature(9);
    const result: MovementResult = {
      ...movingResult(creature, 0.5, 0),
      status: MovementStatus.Blocked,
      hit: {
        kind: MovementHitKind.Creature,
        object: blocker,
        creatureId: 9,
      },
    };
    commitMovement(creature, result, { delta: 0.1 });
    expect(creature.onBlocked).toHaveBeenCalledTimes(1);

    advanceMovementFrame();
    commitMovement(creature, result, { delta: 0.1 });
    expect(creature.onBlocked).toHaveBeenCalledTimes(1);
  });
});

describe("teleport placement", () => {
  beforeEach(() => {
    setMovementInstrumentation({ assert: false, log: false });
  });

  it("relocates without OnBlocked or collision timer growth", () => {
    const creature = mockCreature();
    creature.collisionTimer = 0;
    teleportObject(creature, 5, 3, 1, { caller: "test" });
    expect(creature.position.x).toBe(5);
    expect(creature.position.y).toBe(3);
    expect(creature.onBlocked).not.toHaveBeenCalled();
    expect(creature.collisionTimer).toBe(0);
    expect(ensureMovementState(creature).blockingObject).toBeUndefined();
  });
});

describe("AreaMovementQueries purity", () => {
  it("testStaticMovement / testCreatureMovement do not mutate position or timers", () => {
    const creature = mockCreature();
    creature.position.set(1, 2, 3);
    creature.blockingTimer = 4;
    creature.collisionTimer = 0.25;
    const area = {
      creatures: [],
      rooms: [],
      doors: [],
      placeables: [],
    } as unknown as Area;

    testStaticMovement(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      { owner: creature }
    );
    testCreatureMovement(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      { owner: creature }
    );

    expect(creature.position.x).toBe(1);
    expect(creature.position.y).toBe(2);
    expect(creature.position.z).toBe(3);
    expect(creature.blockingTimer).toBe(4);
    expect(creature.collisionTimer).toBe(0.25);
  });
});

describe("drive / walk facade does not settle via CollisionContext solver", () => {
  it("tickCreatureDrive facade re-exports resolve+commit from drive-policy", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const facade = require("@engine/pathfinding/tick-creature-drive");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const policy = require("@engine/movement/drive-policy");
    expect(facade.tickCreatureDrive).toBe(policy.tickCreatureDrive);
    expect(facade.drivePrepareDestination).toBe(policy.drivePrepareDestination);
    expect(facade.driveResolveMoveTarget).toBe(policy.drivePrepareDestination);
  });

  it("CollisionContext has no updateCollision locomotion solver", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CollisionContext } = require("@engine/movement/CollisionContext");
    expect(CollisionContext.prototype.updateCollision).toBeUndefined();
  });
});
