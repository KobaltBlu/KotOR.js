/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from "@jest/globals";
import { SignalEventType } from "@core/enums/events/SignalEventType";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { ScriptHook } from "@core/enums/module/ScriptHook";
import { EventSignalEvent } from "@engine/events/EventSignalEvent";

jest.mock("@engine/runtime/GameState", () => ({
  GameState: {
    GameObjectManager: { GetObjectById: jest.fn() },
  },
}));

describe("AreaEffect EventSignalEvent dispatch", () => {
  it.each([
    [SignalEventType.OnObjectEnter, ScriptHook.AoEOnEnter, "enteringObject"],
    [SignalEventType.OnObjectExit, ScriptHook.AoEOnExit, "exitingObject"],
  ])("dispatches %s to the AoE hook", (eventType, hook, objectField) => {
    const caller = {
      id: 41,
      objectType: GameObjectType.GameObject,
    } as any;
    const script = {
      bindOwner: jest.fn(),
      run: jest.fn(),
      scriptKey: hook,
    } as any;
    const areaEffect = {
      id: 42,
      objectType: GameObjectType.GameObject | GameObjectType.AreaEffect,
      getScriptInstance: jest.fn((scriptHook: ScriptHook) =>
        scriptHook === hook ? script : undefined
      ),
    } as any;
    const event = new EventSignalEvent();
    event.setCaller(caller);
    event.setObject(areaEffect);
    event.eventType = eventType;

    event.execute();

    expect(script[objectField]).toBe(caller);
    expect(script.run).toHaveBeenCalledWith(areaEffect);
  });
});
