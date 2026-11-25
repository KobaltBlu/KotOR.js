/**
 * NPC/AI drive steps go through the shared collide-and-slide solver: a
 * DetailedBlock (placeable) hit with an unreliable clearT ≈ 1 must not let the
 * creature step into the obstacle (live: NPC drove straight through Kiosk2).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const probeMock = jest.fn();

jest.mock("@engine/runtime/GameState", () => ({
  GameState: { PartyManager: { party: [] }, module: undefined },
}));

jest.mock("@engine/combat/attack-range", () => ({
  getPathPersonalSpace: () => 0.35,
  getCreaturePersonalSpace: () => 0.4,
}));

jest.mock("@engine/pathfinding/creature-capsule-clear", () => ({
  isCreatureCapsuleClear: () => ({ clear: true }),
}));

jest.mock("@engine/pathfinding/nudge-friendlies", () => ({
  nudgeFriendlyCreatures: () => true,
}));

jest.mock("@engine/pathfinding/drive-step-clear", () => ({
  probeDriveStepClear: (...args: unknown[]) => probeMock(...args),
  getDriveProbeCount: () => 0,
  resetDriveProbeCount: () => undefined,
}));

import { drivePrepareDestination, resolveDriveStep } from "@engine/movement/drive-policy";
import { MovementStatus } from "@engine/movement/types";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

/** Placeable face at x = 1: capsule centre must stay at x <= 1 - 0.35. */
const FACE_X = 1;
const RADIUS = 0.35;

function placeableProbe(_area: unknown, from: THREE.Vector3, to: THREE.Vector3){
  if(to.x <= FACE_X - RADIUS){
    return { clear: true, clearT: 1, clearPoint: to.clone(), code: 1, normal: new THREE.Vector3(0, 0, 1) };
  }
  // DetailedBlock: clearT is the (wrong) projected midpoint hint ≈ 1.
  return {
    clear: false,
    clearT: 1,
    clearPoint: to.clone(),
    code: -2,
    normal: new THREE.Vector3(-1, 0, 0),
    normalSynthetic: false,
    blockingObjectId: 77,
  };
}

function makeCreature(x: number, y: number){
  const area = { creatures: [], walkEdges: [], doors: [] } as unknown as Area;
  return {
    id: 1,
    area,
    position: new THREE.Vector3(x, y, 0),
    movementSpeed: 1,
    locomotionScale: 1,
    getWalkSpeed: () => 1.7,
    getRunSpeed: () => 5.4,
  } as unknown as Creature;
}

describe("resolveDriveStep static collide-and-slide", () => {
  beforeEach(() => {
    probeMock.mockReset();
    probeMock.mockImplementation(placeableProbe as never);
  });

  it("never steps into a placeable even when its probe reports clearT = 1", () => {
    const c = makeCreature(0, 0);
    for(let i = 0; i < 20; i++){
      const r = resolveDriveStep(c, new THREE.Vector3(3, 0, 0), true, 1 / 30);
      c.position.copy(r.finalPosition);
    }
    expect(c.position.x).toBeLessThanOrEqual(FACE_X - RADIUS + 1e-6);
    expect(c.position.x).toBeGreaterThan(0.5);
  });

  it("reports Blocked (not sub-mm Moving creep) when pressed head-on", () => {
    const c = makeCreature(FACE_X - RADIUS - 0.0005, 0);
    const r = resolveDriveStep(c, new THREE.Vector3(3, 0, 0), true, 1 / 30);
    expect(r.status).toBe(MovementStatus.Blocked);
    expect(r.incrementBlockingTimer).toBe(true);
  });

  it("slides along the face when approaching diagonally", () => {
    const c = makeCreature(FACE_X - RADIUS - 0.01, 0);
    const r = resolveDriveStep(c, new THREE.Vector3(3, 3, 0), true, 1 / 30);
    expect(r.finalPosition.x).toBeLessThanOrEqual(FACE_X - RADIUS + 1e-6);
    expect(r.finalPosition.y).toBeGreaterThan(0.05);
  });
});

describe("drivePrepareDestination static collide-and-slide", () => {
  beforeEach(() => {
    probeMock.mockReset();
    probeMock.mockImplementation(placeableProbe as never);
  });

  it("clips the prepared destination short of the placeable", () => {
    const c = makeCreature(0, 0);
    const out = drivePrepareDestination(
      c.area as Area,
      c.position,
      new THREE.Vector3(3, 0, 0),
      c
    ).clone();
    expect(out.x).toBeLessThanOrEqual(FACE_X - RADIUS + 1e-6);
  });
});
