/**
 * Characterization of current trigger-like occupancy transitions.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as THREE from 'three';

const gameState = {
  module: {
    area: { creatures: [] as any[] },
    timeManager: { pauseDay: 0, pauseTime: 0 },
    addEvent: jest.fn(),
  },
  PartyManager: { party: [] as any[], getCurrentPlayer: jest.fn() },
  GameEventFactory: { EventSignalEvent: class {} },
  GameObjectManager: {},
  Mode: 0,
};

jest.mock('@engine/runtime/GameState', () => ({ GameState: gameState }));
jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));
jest.mock('@engine/runtime/ModuleLoadCoordinator', () => ({
  ModuleLoadCoordinator: { LoadModuleWithAreaTransitionFade: jest.fn() },
}));
jest.mock('@core/filesystem/ConfigClient', () => ({
  ConfigClient: { get: jest.fn(() => false) },
}));

import { ModuleTriggerType } from '@core/enums/module/ModuleTriggerType';
import { Trigger } from '@engine/module/Trigger';
import { AreaEffect } from '@engine/module/AreaEffect';
import { Encounter } from '@engine/module/Encounter';

describe('occupancy characterization', () => {
  beforeEach(() => {
    gameState.module.area.creatures = [];
    gameState.PartyManager.party = [];
  });

  it('fires Trigger enter and exit only on occupancy changes', () => {
    const trigger = new Trigger();
    const object: any = { id: 11 };
    let inside = true;
    trigger.type = ModuleTriggerType.GENERIC;
    trigger.isInsideBoundingBox = jest.fn(() => inside);
    trigger.onEnter = jest.fn();
    trigger.onExit = jest.fn();

    trigger.updateObjectInside(object);
    trigger.updateObjectInside(object);
    inside = false;
    trigger.updateObjectInside(object);
    trigger.updateObjectInside(object);

    expect(trigger.onEnter).toHaveBeenCalledTimes(1);
    expect(trigger.onExit).toHaveBeenCalledTimes(1);
    expect(trigger.objectsInside).toEqual([]);
    expect(object.lastTriggerEntered).toBe(trigger);
    expect(object.lastTriggerExited).toBe(trigger);
  });

  it('keeps rejected trap occupants without running the enter path', () => {
    const trigger = new Trigger();
    const object: any = { id: 12 };
    trigger.type = ModuleTriggerType.TRAP;
    trigger.isInsideBoundingBox = jest.fn(() => true);
    trigger.canTrigger = jest.fn(() => false);
    trigger.onEnter = jest.fn();

    trigger.updateObjectInside(object);
    trigger.updateObjectInside(object);

    expect(trigger.objectsInside).toEqual([object]);
    expect(trigger.onEnter).not.toHaveBeenCalled();
    expect(trigger.triggered).toBe(false);
  });

  it('fires AreaEffect enter and exit only on occupancy changes', () => {
    const areaEffect = new AreaEffect();
    const object: any = { id: 21 };
    let inside = true;
    areaEffect.isInsideBoundingBox = jest.fn(() => inside);
    areaEffect.onEnter = jest.fn();
    areaEffect.onExit = jest.fn();

    areaEffect.updateObjectInside(object);
    areaEffect.updateObjectInside(object);
    inside = false;
    areaEffect.updateObjectInside(object);
    areaEffect.updateObjectInside(object);

    expect(areaEffect.onEnter).toHaveBeenCalledTimes(1);
    expect(areaEffect.onExit).toHaveBeenCalledTimes(1);
    expect(areaEffect.lastEnteredId).toBe(21);
    expect(areaEffect.lastLeftId).toBe(21);
    // TODO: AoE enter/exit events are currently dispatched through the same
    // trigger-only EventSignalEvent path; preserve that until event dispatch is split.
  });

  it('tracks all Encounter occupants but signals only hostile transitions', () => {
    const hostile: any = { id: 31, position: new THREE.Vector3(1, 0, 0) };
    const neutral: any = { id: 32, position: new THREE.Vector3(2, 0, 0) };
    const encounter = new Encounter();
    encounter.mesh = { visible: true } as any;
    encounter.getCurrentRoom = jest.fn();
    encounter.isInsideBoundingBox = jest.fn(() => true);
    encounter.isHostile = jest.fn((object: any) => object === hostile);
    encounter.onEnter = jest.fn();
    encounter.onExit = jest.fn();
    encounter.deferEventUpdate = true;
    encounter.active = 0;
    gameState.module.area.creatures = [hostile, neutral];

    encounter.aiUpdate(0);
    encounter.aiUpdate(0);

    expect(encounter.objectsInside).toEqual([hostile, neutral]);
    expect(encounter.onEnter).toHaveBeenCalledTimes(1);
    expect(encounter.onEnter).toHaveBeenCalledWith(hostile);
    expect(encounter.lastObjectEntered).toBe(hostile);

    encounter.isInsideBoundingBox = jest.fn(() => false);
    encounter.aiUpdate(0);

    expect(encounter.objectsInside).toEqual([]);
    expect(encounter.onExit).toHaveBeenCalledTimes(1);
    expect(encounter.onExit).toHaveBeenCalledWith(hostile);
    expect(neutral.lastTriggerEntered).toBeUndefined();
    expect(neutral.lastTriggerExited).toBeUndefined();
  });
});
