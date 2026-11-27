/**
 * Creature capsule clear checks.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { GameObjectType } from "@core/enums/module/GameObjectType";

const mockParty: unknown[] = [];

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: {
      getCurrentPlayer: () => mockParty[0],
      party: mockParty,
    },
  },
}));

import { isCreatureCapsuleClear } from "@engine/pathfinding/creature-capsule-clear";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

function creature(id: number, x: number, y: number): Creature {
  return {
    id,
    objectType: GameObjectType.Creature,
    position: new THREE.Vector3(x, y, 0),
    isDead: () => false,
    isPartyMember: () => mockParty.includes(id),
    getAppearance: () => ({ creperspace: 0.4 }),
  } as unknown as Creature;
}

describe("isCreatureCapsuleClear", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("returns the first creature whose personal-space capsule intersects the line", () => {
    const owner = creature(1, 0, 0);
    const blocker = creature(9, 2, 0.2);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { owner }
    );

    expect(result).toEqual({ clear: false, blockingCreatureId: 9 });
  });

  it("ignores party creatures when party passage is allowed", () => {
    const owner = creature(1, 0, 0);
    const partyBlocker = creature(2, 2, 0.1);
    mockParty.push(partyBlocker);
    const area = { creatures: [owner, partyBlocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { owner, allowPartyCreatures: true }
    );

    expect(result.clear).toBe(true);
  });

  it("soft-clears start-overlap when the step separates from the blocker", () => {
    // Owner/blocker stacked near origin; step away (−X) increases separation.
    const owner = creature(1, 0, 0);
    const blocker = creature(9, 0.05, 0);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      { owner }
    );

    expect(result.clear).toBe(true);
  });

  it("blocks start-overlap when the step digs deeper into the blocker", () => {
    // Pre-overlapped: owner at 0.7, blocker at 1.0 (creperspace sum ≈ 0.81).
    const owner = creature(1, 0.7, 0);
    const blocker = creature(9, 1.0, 0);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0.7, 0, 0),
      new THREE.Vector3(0.85, 0, 0),
      { owner }
    );

    expect(result).toEqual({ clear: false, blockingCreatureId: 9 });
  });

  it("blocks start-overlap when the step tunnels through the blocker", () => {
    // Blocker sits on the start; walking +X tunnels through the capsule.
    const owner = creature(1, 0, 0);
    const blocker = creature(9, 0.05, 0);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { owner }
    );

    expect(result).toEqual({ clear: false, blockingCreatureId: 9 });
  });

  it("soft-clears start-overlap for a tangential / outward step", () => {
    const owner = creature(1, 0.7, 0);
    const blocker = creature(9, 1.0, 0);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0.7, 0, 0),
      new THREE.Vector3(0.7, 0.25, 0),
      { owner }
    );

    expect(result.clear).toBe(true);
  });

  it("hard-blocks start-overlap when softClearStartOverlap is false", () => {
    const owner = creature(1, 10, 10);
    const blocker = creature(9, 0.05, 0);
    const area = { creatures: [owner, blocker] } as unknown as Area;

    const result = isCreatureCapsuleClear(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { owner, softClearStartOverlap: false }
    );

    expect(result).toEqual({ clear: false, blockingCreatureId: 9 });
  });
});
