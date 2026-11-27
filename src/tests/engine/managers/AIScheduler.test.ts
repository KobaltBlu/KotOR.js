/**
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, jest } from "@jest/globals";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    module: {
      readyToProcessEvents: true,
      eventQueue: [],
      timeManager: {
        pauseDay: 0,
        pauseTime: 0,
        getMilisecondsElapsed: () => -1,
      },
      area: {},
    },
    PartyManager: { party: [] },
    timeStopActive: false,
    timeStopExclusions: new Set(),
  },
}));

jest.mock("@core/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: () => false,
    InstanceOf: () => false,
  },
}));

import { AILevel } from "@core/enums/module/AILevel";
import { AIScheduler } from "@engine/runtime/AIScheduler";
import type { GameObject } from "@engine/module/GameObject";

function makeObj(id: number): GameObject {
  return {
    id,
    aiLevel: AILevel.INVALID,
    tag: `obj${id}`,
    _lastAIUpdateWorldMs: 0,
    _creatureLocoThisFrame: false,
    _aiHeartbeatElapsedMs: 0,
    aiUpdate: jest.fn(),
    actionQueue: [],
    action: undefined,
    destroyed: false,
    willDestroy: false,
    animationState: { index: 0 },
  } as unknown as GameObject;
}

describe("AIScheduler", () => {
  let scheduler: AIScheduler;

  beforeEach(() => {
    scheduler = new AIScheduler();
  });

  it("addObject registers at VERY_LOW by default", () => {
    const a = makeObj(1);
    expect(scheduler.addObject(a)).toBe(true);
    expect(a.aiLevel).toBe(AILevel.VERY_LOW);
    expect(scheduler.lists[AILevel.VERY_LOW]).toContain(a);
  });

  it("setAILevel moves between lists without duplicating", () => {
    const a = makeObj(1);
    scheduler.addObject(a, AILevel.VERY_LOW);
    scheduler.setAILevel(a, AILevel.VERY_HIGH);
    expect(a.aiLevel).toBe(AILevel.VERY_HIGH);
    expect(scheduler.lists[AILevel.VERY_LOW]).not.toContain(a);
    expect(scheduler.lists[AILevel.VERY_HIGH]).toContain(a);
    expect(scheduler.lists[AILevel.VERY_HIGH].length).toBe(1);
  });

  it("setAILevel is a no-op when already at that level", () => {
    const a = makeObj(1);
    scheduler.addObject(a, AILevel.LOW);
    expect(scheduler.setAILevel(a, AILevel.LOW)).toBe(true);
    expect(scheduler.lists[AILevel.LOW].length).toBe(1);
  });

  it("removeObject clears aiLevel", () => {
    const a = makeObj(1);
    scheduler.addObject(a, AILevel.NORMAL);
    scheduler.removeObject(a);
    expect(a.aiLevel).toBe(AILevel.INVALID);
    expect(scheduler.lists[AILevel.NORMAL]).not.toContain(a);
  });

  it("increaseAILevelPriority promotes eligible VERY_LOW objects", () => {
    const creature = makeObj(1);
    const spy = jest.spyOn(scheduler, "shouldPromoteOnAreaEntry").mockReturnValue(true);
    scheduler.addObject(creature, AILevel.VERY_LOW);
    scheduler.increaseAILevelPriority([creature]);
    expect(creature.aiLevel).toBe(AILevel.LOW);
    spy.mockRestore();
  });

  it("reset clears lists and cursors", () => {
    const a = makeObj(1);
    scheduler.addObject(a, AILevel.HIGH);
    scheduler.reset();
    expect(scheduler.lists[AILevel.HIGH]).toHaveLength(0);
    expect(scheduler.listIndex.every((i) => i === 0)).toBe(true);
  });

  it("a slow creature loco pass cannot starve a level's aiUpdates", () => {
    const objs = [makeObj(1), makeObj(2), makeObj(3)];
    objs.forEach((o) => scheduler.addObject(o, AILevel.LOW));
    // Simulate a loco pass that burns far more than the whole frame budget.
    (scheduler as any).creatureLocoPass = () => {
      const end = performance.now() + 15;
      while(performance.now() < end){ /* busy */ }
    };
    for(let frame = 0; frame < 3; frame++) scheduler.update(1 / 60);
    for(const o of objs){
      expect((o.aiUpdate as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    }
  });

  it("every non-empty level advances at least one object per frame even over budget", () => {
    const high = makeObj(10);
    const low = makeObj(11);
    scheduler.addObject(high, AILevel.VERY_HIGH);
    scheduler.addObject(low, AILevel.VERY_LOW);
    // High-level aiUpdate eats the entire frame budget.
    (high.aiUpdate as jest.Mock).mockImplementation(() => {
      const end = performance.now() + 15;
      while(performance.now() < end){ /* busy */ }
    });
    scheduler.update(1 / 60);
    expect((low.aiUpdate as jest.Mock).mock.calls.length).toBe(1);
  });
});
