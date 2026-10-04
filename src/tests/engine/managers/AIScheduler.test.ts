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
import type { ModuleObject } from "@engine/module/ModuleObject";

function makeObj(id: number): ModuleObject {
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
  } as unknown as ModuleObject;
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
});
