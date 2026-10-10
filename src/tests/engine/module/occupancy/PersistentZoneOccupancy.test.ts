/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import { PersistentZoneOccupancy } from "@engine/module/occupancy/PersistentZoneOccupancy";

describe("PersistentZoneOccupancy", () => {
  it("preserves insertion order across duplicate updates and removals", () => {
    const objectsInside: object[] = [];
    const occupancy = new PersistentZoneOccupancy(objectsInside);
    const first = { id: 1 };
    const second = { id: 2 };
    const hooks = { onEnter: jest.fn(), onExit: jest.fn() };

    occupancy.applyTransition(first, true, hooks);
    occupancy.applyTransition(second, true, hooks);
    occupancy.applyTransition(first, true, hooks);

    expect(objectsInside).toEqual([first, second]);

    occupancy.applyTransition(first, false, hooks);
    occupancy.applyTransition(first, true, hooks);

    expect(objectsInside).toEqual([second, first]);
  });
});
