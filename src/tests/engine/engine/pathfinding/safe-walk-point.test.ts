/**
 * safe walk point / isSafeWalkPoint — hard-block occupied cells (no start soft-clear).
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

jest.mock("@engine/pathfinding/static-walk-blockers", () => ({
  isStaticWalkClearDetailed: () => ({ clear: true }),
}));

jest.mock("@engine/pathfinding/walk-line-clear", () => ({
  getRoomAtPoint: () => ({}),
}));

import { isSafeWalkPoint } from "@engine/pathfinding/safe-walk-point";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

function creature(id: number, x: number, y: number): Creature {
  return {
    id,
    objectType: GameObjectType.Creature,
    position: new THREE.Vector3(x, y, 0),
    isDead: () => false,
    getAppearance: () => ({ creperspace: 0.4, perspace: 0.35 }),
  } as unknown as Creature;
}

describe("isSafeWalkPoint hard creature block", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("rejects a point occupied by an NPC (Zelka-style)", () => {
    const jumper = creature(1, 170, 66);
    const zelka = creature(50, 179.2, 63.5);
    const area = { creatures: [zelka] } as unknown as Area;
    const point = new THREE.Vector3(179.2, 63.5, 0);

    expect(isSafeWalkPoint(area, point, jumper)).toBe(false);
  });

  it("rejects a point occupied by a party member (Carth→PC)", () => {
    const carth = creature(2, 170, 66);
    const pc = creature(1, 179.25, 63.5);
    mockParty.push(pc, carth);
    const area = { creatures: [] } as unknown as Area;
    const point = new THREE.Vector3(179.25, 63.5, 0);

    expect(isSafeWalkPoint(area, point, carth)).toBe(false);
  });

  it("accepts a clear point away from creatures", () => {
    const jumper = creature(1, 170, 66);
    const zelka = creature(50, 179.2, 63.5);
    const area = { creatures: [zelka] } as unknown as Area;
    const point = new THREE.Vector3(176.0, 63.5, 0);

    expect(isSafeWalkPoint(area, point, jumper)).toBe(true);
  });
});
