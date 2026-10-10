/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import { AreaSubAreaPositionFanout } from "@engine/module/occupancy/AreaSubAreaPositionFanout";

describe("AreaSubAreaPositionFanout", () => {
  it("updates triggers before area effects in list order", () => {
    const calls: string[] = [];
    const creature = {
      area: {
        triggers: [
          { updateObjectInside: jest.fn(() => calls.push("trigger-1")) },
          { updateObjectInside: jest.fn(() => calls.push("trigger-2")) },
        ],
        areaOfEffects: [
          { updateObjectInside: jest.fn(() => calls.push("aoe-1")) },
          { updateObjectInside: jest.fn(() => calls.push("aoe-2")) },
        ],
      },
    } as any;

    AreaSubAreaPositionFanout.update(creature);

    expect(calls).toEqual(["trigger-1", "trigger-2", "aoe-1", "aoe-2"]);
  });
});
