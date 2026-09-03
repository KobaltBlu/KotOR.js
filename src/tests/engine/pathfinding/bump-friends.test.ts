/**
 * BumpFriends displacement checks.
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

import { bumpFriends } from "@/engine/pathfinding/bump-friends";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";

function creature(id: number, x: number, y: number): ModuleCreature {
  const c = {
    id,
    objectType: ModuleObjectType.ModuleCreature,
    position: new THREE.Vector3(x, y, 0),
    actionQueue: [],
    combatRound: { roundPaused: false },
    area: undefined as ModuleArea | undefined,
    getReputation: () => 50,
    getAppearance: () => ({ creperspace: 0.4 }),
    isDead: () => false,
    isPartyMember: () => false,
    setPosition(v: THREE.Vector3){
      c.position.copy(v);
    },
  };
  return c as unknown as ModuleCreature;
}

describe("bumpFriends", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("pushes a bumpable friend off the mover travel line by combined personal space", () => {
    const mover = creature(1, 0, 0);
    const other = creature(9, 2, 0);
    const area = {
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    } as unknown as ModuleArea;
    mover.area = area;
    other.area = area;

    const bumped = bumpFriends(
      mover,
      other,
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(0, 0, 0)
    );

    expect(bumped).toBe(true);
    expect(other.position.x).toBeCloseTo(2);
    expect(other.position.y).toBeCloseTo(0.9);
  });

  it("does not bump when the resolved destination is not walkable", () => {
    const mover = creature(1, 0, 0);
    const other = creature(9, 2, 0);
    const area = {
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => false,
    } as unknown as ModuleArea;
    mover.area = area;
    other.area = area;

    const bumped = bumpFriends(
      mover,
      other,
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(0, 0, 0)
    );

    expect(bumped).toBe(false);
    expect(other.position.x).toBeCloseTo(2);
    expect(other.position.y).toBeCloseTo(0);
  });
});
