/**
 * Door transition commit: linked open door cross warps without XY move.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const transitNPCMock = jest.fn();
const addEventMock = jest.fn();

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: { party: [] as unknown[] },
    module: {
      addEvent: (...args: unknown[]) => addEventMock(...args),
      timeManager: { pauseDay: 0, pauseTime: 0 },
    },
    GameEventFactory: {
      EventSignalEvent: class {
        eventType = 0;
        setCaller() {}
        setObject() {}
        setDay() {}
        setTime() {}
      },
    },
  },
}));

jest.mock("@/module/guards/isCreature", () => ({
  isCreature: () => true,
}));

jest.mock("@/module/guards/isDoor", () => ({
  isDoor: (o: unknown) =>
    !!(o as { transitNPC?: unknown })?.transitNPC,
}));

jest.mock("@/engine/movement/instrumentation", () => ({
  assertSingleCommit: jest.fn(),
  recordMovementWrite: jest.fn(),
}));

jest.mock("@/engine/movement/creature-movement-state", () => ({
  ensureMovementState: () => ({
    blockingObject: undefined,
    lastBlockingObject: undefined,
    collisionTime: 0,
    authority: 0,
    lastCommitFrame: -1,
    lastCommitSource: undefined,
    actualVelocity: new THREE.Vector3(),
  }),
  getMovementFrameId: () => 1,
}));

import { commitMovement } from "@/engine/movement/movement-committer";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
} from "@/engine/movement/types";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";

describe("commitMovement door transition", () => {
  beforeEach(() => {
    transitNPCMock.mockReset();
    addEventMock.mockReset();
  });

  it("calls transitNPC and does not move XY on linked open door cross", () => {
    const door = {
      id: 42,
      getLinkedToModule: () => "m02aa",
      isOpen: () => true,
      transitNPC: transitNPCMock,
    } as unknown as ModuleDoor;

    const creature = {
      id: 1,
      position: new THREE.Vector3(10, 20, 0),
      speed: 1,
      force: 1,
      blockingTimer: 0,
      collisionTimer: 0,
      area: { creatures: [] },
    } as unknown as ModuleCreature;

    commitMovement(creature, {
      source: MovementSource.PlayerControl,
      status: MovementStatus.Blocked,
      origin: creature.position.clone(),
      finalPosition: new THREE.Vector3(11, 20, 0),
      acceptedDisplacement: new THREE.Vector3(),
      actualDistance: 0,
      blockAfterDoorSignal: true,
      crossedTransition: door,
      hit: { kind: MovementHitKind.Door, object: door },
      incrementBlockingTimer: true,
    });

    expect(transitNPCMock).toHaveBeenCalledWith(creature);
    expect(creature.position.x).toBeCloseTo(10);
    expect(creature.position.y).toBeCloseTo(20);
    expect(creature.speed).toBe(0);
    expect(addEventMock).toHaveBeenCalled();
  });

  it("does not transit when door has no linked module", () => {
    const door = {
      id: 43,
      getLinkedToModule: () => "",
      isOpen: () => true,
      transitNPC: transitNPCMock,
    } as unknown as ModuleDoor;

    const creature = {
      id: 1,
      position: new THREE.Vector3(0, 0, 0),
      speed: 0,
      force: 0,
      blockingTimer: 0,
      area: { creatures: [] },
    } as unknown as ModuleCreature;

    commitMovement(creature, {
      source: MovementSource.Drive,
      status: MovementStatus.Blocked,
      origin: creature.position.clone(),
      finalPosition: creature.position.clone(),
      acceptedDisplacement: new THREE.Vector3(),
      actualDistance: 0,
      blockAfterDoorSignal: true,
      crossedTransition: door,
    });

    expect(transitNPCMock).not.toHaveBeenCalled();
    expect(addEventMock).toHaveBeenCalled();
  });
});
