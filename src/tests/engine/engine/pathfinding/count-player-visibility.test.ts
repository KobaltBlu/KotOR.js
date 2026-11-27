/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import * as THREE from "three";

const clearLosMock = jest.fn(() => true);

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    PartyManager: { party: [] as unknown[] },
  },
}));

jest.mock("@engine/pathfinding/visual-los", () => ({
  hasVisualLos: (...args: unknown[]) => clearLosMock(...args),
}));

import {
  COUNT_VISIBLE_EYE_Z,
  COUNT_VISIBLE_RANGE_SQ,
  countPlayerVisibility,
} from "@engine/pathfinding/count-player-visibility";
import { GameState } from "@engine/runtime/GameState";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

function makePlayer(x: number, y: number, z = 0): Creature {
  return {
    position: new THREE.Vector3(x, y, z),
    isDead: () => false,
    isPC: 1,
    isPartyMember: () => true,
    id: Math.random(),
  } as unknown as Creature;
}

describe("countPlayerVisibility", () => {
  beforeEach(() => {
    clearLosMock.mockReset();
    clearLosMock.mockReturnValue(true);
    (GameState.PartyManager as { party: unknown[] }).party = [];
  });

  it("gates at dist² < 900 (30 m) before LOS", () => {
    const near = makePlayer(0, 0, 0);
    const far = makePlayer(40, 0, 0); // 40² = 1600 > 900
    const area = { creatures: [near, far] } as unknown as Area;
    const point = new THREE.Vector3(0, 0, 0);

    const n = countPlayerVisibility(area, point, 0x60);
    expect(n).toBe(1);
    expect(clearLosMock).toHaveBeenCalledTimes(1);
    expect(COUNT_VISIBLE_RANGE_SQ).toBe(900);
  });

  it("raises both endpoints by eye Z +1.5 for visual LOS / hasVisualLos", () => {
    const player = makePlayer(1, 2, 3);
    const area = { creatures: [player] } as unknown as Area;
    const point = new THREE.Vector3(4, 5, 6);

    countPlayerVisibility(area, point, 0x60);
    expect(clearLosMock).toHaveBeenCalledTimes(1);
    const from = clearLosMock.mock.calls[0][1] as THREE.Vector3;
    const to = clearLosMock.mock.calls[0][2] as THREE.Vector3;
    expect(from.z).toBeCloseTo(3 + COUNT_VISIBLE_EYE_Z);
    expect(to.z).toBeCloseTo(6 + COUNT_VISIBLE_EYE_Z);
  });

  it("counts area PCs even when not in party list", () => {
    const pc = makePlayer(0, 0, 0);
    const area = { creatures: [pc] } as unknown as Area;
    expect(countPlayerVisibility(area, new THREE.Vector3(0, 0, 0))).toBe(1);
  });
});
