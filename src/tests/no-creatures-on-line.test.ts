/**
 * NoCreaturesOnLine capsule checks.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

const mockParty: unknown[] = [];

jest.mock("@/GameState", () => ({
  GameState: {
    PartyManager: { party: mockParty },
    getCurrentPlayer: () => mockParty[0],
  },
}));

import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";

function creature(id: number, x: number, y: number): ModuleCreature {
  return {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(x, y, 0),
    isDead: () => false,
    isPartyMember: () => mockParty.includes(id),
    getAppearance: () => ({ creperspace: 0.4 }),
  } as unknown as ModuleCreature;
}

describe("noCreaturesOnLine", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("returns the first creature whose personal-space capsule intersects the line", () => {
    const owner = creature(1, 0, 0);
    const blocker = creature(9, 2, 0.2);
    const area = { creatures: [owner, blocker] } as unknown as ModuleArea;

    const result = noCreaturesOnLine(
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
    const area = { creatures: [owner, partyBlocker] } as unknown as ModuleArea;

    const result = noCreaturesOnLine(
      area,
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 0, 0),
      { owner, allowPartyCreatures: true }
    );

    expect(result.clear).toBe(true);
  });
});
