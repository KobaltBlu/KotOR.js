/**
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, jest } from "@jest/globals";

jest.mock("@/GameState", () => ({
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

jest.mock("@/utility/BitWise", () => ({
  BitWise: {
    InstanceOfObject: () => false,
  },
}));

import { AILevel } from "@/enums/module/AILevel";
import { ServerAIMaster } from "@/engine/ServerAIMaster";
import type { ModuleObject } from "@/module/ModuleObject";

function makeObj(id: number): ModuleObject {
  return {
    id,
    aiLevel: AILevel.INVALID,
    tag: `obj${id}`,
    _lastAIUpdateWorldMs: 0,
    _quickWalkedThisFrame: false,
    _aiHeartbeatElapsedMs: 0,
    aiUpdate: jest.fn(),
    actionQueue: [],
    action: undefined,
    destroyed: false,
    willDestroy: false,
    animationState: { index: 0 },
  } as unknown as ModuleObject;
}

describe("ServerAIMaster", () => {
  beforeEach(() => {
    ServerAIMaster.Reset();
  });

  it("addObject registers at VERY_LOW by default", () => {
    const a = makeObj(1);
    expect(ServerAIMaster.addObject(a)).toBe(true);
    expect(a.aiLevel).toBe(AILevel.VERY_LOW);
    expect(ServerAIMaster.lists[AILevel.VERY_LOW]).toContain(a);
  });

  it("setAILevel moves between lists without duplicating", () => {
    const a = makeObj(1);
    ServerAIMaster.addObject(a, AILevel.VERY_LOW);
    ServerAIMaster.setAILevel(a, AILevel.VERY_HIGH);
    expect(a.aiLevel).toBe(AILevel.VERY_HIGH);
    expect(ServerAIMaster.lists[AILevel.VERY_LOW]).not.toContain(a);
    expect(ServerAIMaster.lists[AILevel.VERY_HIGH]).toContain(a);
    expect(ServerAIMaster.lists[AILevel.VERY_HIGH].length).toBe(1);
  });

  it("setAILevel is a no-op when already at that level", () => {
    const a = makeObj(1);
    ServerAIMaster.addObject(a, AILevel.LOW);
    expect(ServerAIMaster.setAILevel(a, AILevel.LOW)).toBe(true);
    expect(ServerAIMaster.lists[AILevel.LOW].length).toBe(1);
  });

  it("removeObject clears aiLevel", () => {
    const a = makeObj(1);
    ServerAIMaster.addObject(a, AILevel.NORMAL);
    ServerAIMaster.removeObject(a);
    expect(a.aiLevel).toBe(AILevel.INVALID);
    expect(ServerAIMaster.lists[AILevel.NORMAL]).not.toContain(a);
  });

  it("increaseAILevelPriority promotes eligible VERY_LOW objects", () => {
    const creature = makeObj(1);
    const spy = jest.spyOn(ServerAIMaster, "shouldPromoteOnAreaEntry").mockReturnValue(true);
    ServerAIMaster.addObject(creature, AILevel.VERY_LOW);
    ServerAIMaster.increaseAILevelPriority([creature]);
    expect(creature.aiLevel).toBe(AILevel.LOW);
    spy.mockRestore();
  });
});
