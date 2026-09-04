/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/GameState", () => ({
  GameState: {
    ModuleObjectManager: { GetObjectById: () => undefined },
  },
}));

import { isPthEdgeBlockedByObject } from "@/engine/pathfinding/pth-edge-block";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleObject } from "@/module/ModuleObject";

function makeDoor(staticFlag: boolean, id = 1): ModuleDoor {
  return {
    id,
    objectType: ModuleObjectType.ModuleDoor,
    static: staticFlag,
  } as unknown as ModuleDoor;
}

function makePlaceable(id = 2): ModulePlaceable {
  return {
    id,
    objectType: ModuleObjectType.ModulePlaceable,
  } as unknown as ModulePlaceable;
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
      objectType: ModuleObjectType.ModuleCreature,
    } as unknown as ModuleObject;
    expect(isPthEdgeBlockedByObject(creature)).toBe(false);
  });
});
