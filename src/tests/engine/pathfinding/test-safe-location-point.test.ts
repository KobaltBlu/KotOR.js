/**
 * TestSafeLocationPoint — hard-block occupied cells (no start soft-clear).
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

jest.mock("@/engine/pathfinding/no-non-walk-polys", () => ({
  noNonWalkPolysDetailed: () => ({ clear: true }),
}));

jest.mock("@/engine/pathfinding/test-direct-line", () => ({
  getRoomAtPoint: () => ({}),
}));

import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";

function creature(id: number, x: number, y: number): ModuleCreature {
  return {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(x, y, 0),
    isDead: () => false,
    getAppearance: () => ({ creperspace: 0.4, perspace: 0.35 }),
  } as unknown as ModuleCreature;
}

describe("testSafeLocationPoint hard creature block", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("rejects a point occupied by an NPC (Zelka-style)", () => {
    const jumper = creature(1, 170, 66);
    const zelka = creature(50, 179.2, 63.5);
    const area = { creatures: [zelka] } as unknown as ModuleArea;
    const point = new THREE.Vector3(179.2, 63.5, 0);

    expect(testSafeLocationPoint(area, point, jumper)).toBe(false);
  });

  it("rejects a point occupied by a party member (Carth→PC)", () => {
    const carth = creature(2, 170, 66);
    const pc = creature(1, 179.25, 63.5);
    mockParty.push(pc, carth);
    const area = { creatures: [] } as unknown as ModuleArea;
    const point = new THREE.Vector3(179.25, 63.5, 0);

    expect(testSafeLocationPoint(area, point, carth)).toBe(false);
  });

  it("accepts a clear point away from creatures", () => {
    const jumper = creature(1, 170, 66);
    const zelka = creature(50, 179.2, 63.5);
    const area = { creatures: [zelka] } as unknown as ModuleArea;
    const point = new THREE.Vector3(176.0, 63.5, 0);

    expect(testSafeLocationPoint(area, point, jumper)).toBe(true);
  });
});
