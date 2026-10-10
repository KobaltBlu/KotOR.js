/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    GameObjectManager: { GetObjectById: () => undefined },
  },
}));

import { isPthEdgeBlockedByObject } from "@engine/pathfinding/pth-edge-block";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import type { Door } from "@engine/module/Door";
import type { Placeable } from "@engine/module/Placeable";
import type { GameObject } from "@engine/module/GameObject";

function makeDoor(staticFlag: boolean, id = 1): Door {
  return {
    id,
    objectType: GameObjectType.Door,
    static: staticFlag,
  } as unknown as Door;
}

function makePlaceable(id = 2): Placeable {
  return {
    id,
    objectType: GameObjectType.Placeable,
  } as unknown as Placeable;
}

describe("isPthEdgeBlockedByObject (GenerateSuccessors)", () => {
  it("allows edge when blocker is a non-static (openable) door", () => {
    expect(isPthEdgeBlockedByObject(makeDoor(false))).toBe(false);
  });

  it("rejects edge when blocker is a static door", () => {
    expect(isPthEdgeBlockedByObject(makeDoor(true))).toBe(true);
  });

  it("rejects edge when blocker is a placeable", () => {
    expect(isPthEdgeBlockedByObject(makePlaceable())).toBe(true);
  });

  it("allows edge when blocker is missing or non-door/placeable", () => {
    expect(isPthEdgeBlockedByObject(undefined)).toBe(false);
    expect(isPthEdgeBlockedByObject(null)).toBe(false);
    const creature = {
      id: 3,
      objectType: GameObjectType.Creature,
    } as unknown as GameObject;
    expect(isPthEdgeBlockedByObject(creature)).toBe(false);
  });
});
