/**
 * ActionUnlockObject — clear unlock anim on complete (no sticky unlockdr).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const startMs = jest.fn();
const stopFor = jest.fn();
const addFront = jest.fn();
const playAnimInstances: Array<{ params: Record<number, unknown> }> = [];

jest.mock('@/three/odyssey', () => ({
  OdysseyModel3D: class {},
  OdysseyObject3D: class {},
  OdysseyEmitter3D: class {},
  OdysseyLight3D: class {},
}));

jest.mock('@/GameState', () => ({
  GameState: {
    getCurrentPlayer: () => mockOwner,
    GuiTimingBarManager: { startMs: (...a: unknown[]) => startMs(...a), stopFor: (...a: unknown[]) => stopFor(...a) },
    ActionFactory: {
      ActionPlayAnimation: class {
        params: Record<number, unknown> = {};
        setParameter(i: number, _t: unknown, v: unknown) { this.params[i] = v; }
      },
    },
    GameEffectFactory: { EffectSkillIncrease: class {} },
    GameEventFactory: { EventSignalEvent: class {
      setCaller() {}
      setObject() {}
      setDay() {}
      setTime() {}
      eventType = 0;
    }},
    module: { timeManager: { pauseDay: 0, pauseTime: 0 }, addEvent: jest.fn() },
    SWRuleSet: { racialTypeCount: 1 },
    infiniteUses: true,
  },
}));

jest.mock('@/actions/use-range', () => ({
  queueMoveIntoUseRange: () => false,
}));

jest.mock('@/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!(o as { __creature?: boolean })?.__creature,
}));
jest.mock('@/module/guards/isDoor', () => ({
  isDoor: (o: unknown) => !!(o as { __door?: boolean })?.__door,
}));
jest.mock('@/module/guards/isPlaceable', () => ({
  isPlaceable: () => false,
}));

jest.mock('@/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (v: unknown) => typeof v === 'object' && v != null,
    InstanceOf: () => true,
  },
}));

import { ActionUnlockObject } from '@/actions/ActionUnlockObject';
import { ActionStatus } from '@/enums/actions/ActionStatus';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

let mockOwner: any;
let mockDoor: any;

describe('ActionUnlockObject unlock animation', () => {
  beforeEach(() => {
    startMs.mockClear();
    stopFor.mockClear();
    addFront.mockClear();
    playAnimInstances.length = 0;
    mockOwner = {
      __creature: true,
      force: 1,
      speed: 1,
      isSimpleCreature: () => false,
      playSoundSet: jest.fn(),
      setFacingObject: jest.fn(),
      setAnimationState: jest.fn(),
      actionQueue: { addFront },
      removeItem: jest.fn(),
    };
    mockDoor = {
      __door: true,
      audioEmitter: { playSound: jest.fn() },
      attemptUnlock: jest.fn(() => true),
    };
  });

  function makeAction() {
    const action = new ActionUnlockObject();
    action.setOwner(mockOwner);
    (action as any).getParameter = (i: number) => (i === 0 ? mockDoor : undefined);
    return action;
  }

  it('queues timed PlayAnimation once then clears IDLE on complete', () => {
    addFront.mockImplementation((a: any) => { playAnimInstances.push(a); });
    const action = makeAction();

    expect(action.update(0)).toBe(ActionStatus.IN_PROGRESS);
    expect(addFront).toHaveBeenCalledTimes(1);
    expect(playAnimInstances[0].params[0]).toBe(ModuleCreatureAnimState.UNLOCK_DOOR);
    expect(playAnimInstances[0].params[2]).toBe(1.5);

    expect(action.update(0)).toBe(ActionStatus.COMPLETE);
    expect(mockDoor.attemptUnlock).toHaveBeenCalledWith(mockOwner);
    expect(mockOwner.setAnimationState).toHaveBeenCalledWith(ModuleCreatureAnimState.IDLE);
    expect(stopFor).toHaveBeenCalledWith(mockOwner);
  });
});
