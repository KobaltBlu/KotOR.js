/**
 * nudgeFriendlyCreatures displacement checks.
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

import { nudgeFriendlyCreatures } from "@engine/pathfinding/nudge-friendlies";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";

function creature(id: number, x: number, y: number): Creature {
  const c = {
    id,
    objectType: GameObjectType.Creature,
    position: new THREE.Vector3(x, y, 0),
    actionQueue: [],
    combatRound: { roundPaused: false },
    area: undefined as Area | undefined,
    getReputation: () => 50,
    getAppearance: () => ({ creperspace: 0.4 }),
    isDead: () => false,
    isPartyMember: () => false,
    setPosition(v: THREE.Vector3){
      c.position.copy(v);
    },
  };
  return c as unknown as Creature;
}

describe("nudgeFriendlyCreatures", () => {
  beforeEach(() => {
    mockParty.length = 0;
  });

  it("pushes a bumpable friend off the mover travel line by combined personal space", () => {
    const mover = creature(1, 0, 0);
    const other = creature(9, 2, 0);
    const area = {
      getNearestWalkablePoint: (p: THREE.Vector3) => p.clone(),
      isPointWalkable: () => true,
    } as unknown as Area;
    mover.area = area;
    other.area = area;

    const bumped = nudgeFriendlyCreatures(
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
    } as unknown as Area;
    mover.area = area;
    other.area = area;

    const bumped = nudgeFriendlyCreatures(
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
