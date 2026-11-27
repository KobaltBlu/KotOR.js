/**
 * Enemy Sighted / ValidNearest alignment (save-load rising edge).
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSignalAutoPause = jest.fn();
let clientCombatMode = false;
let selectedObject: any = undefined;

jest.mock('@engine/managers/PartyManager', () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    CursorManager: {
      isClientCombatMode: () => clientCombatMode,
      get selectedObject(){ return selectedObject; },
      setReticleSelectedObject: jest.fn(),
    },
    AutoPauseManager: {
      SignalAutoPauseEvent: (...args: unknown[]) => mockSignalAutoPause(...args),
    },
    State: 0,
    module: undefined,
  },
}));
jest.mock('@engine/render/FollowerCamera', () => ({
  FollowerCamera: {
    setFocusObject: jest.fn(),
    clearFocusObject: jest.fn(),
  },
}));
jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: { addResolution: () => {} },
}));
jest.mock('@engine/pathfinding/visual-los', () => ({
  hasVisualLos: () => true,
}));

import { GameObjectManager } from '@engine/managers/GameObjectManager';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';
import { AutoPauseState } from '@engine/enums/engine/AutoPauseState';

/** Mirrors Creature.hasSeenObject (object || objectId + SEEN). */
function hasSeenObject(
  perceptionList: { object?: unknown; objectId?: number; data: number }[],
  object: { id: number }
): boolean {
  const entry = perceptionList.find(
    (o) => o.object === object || o.objectId === object.id
  );
  return !!(entry && (entry.data & PerceptionMask.SEEN));
}

function makeCreature(partial: Record<string, unknown> = {}) {
  return {
    id: 43,
    objectType: GameObjectType.Creature,
    area: {},
    isDead: () => false,
    isRetainedCorpse: false,
    isHostile: () => true,
    hasLineOfSight: () => false,
    hasSeenObject: undefined as ((o: unknown) => boolean) | undefined,
    doSpotDetection: undefined as ((o: unknown) => boolean) | undefined,
    ...partial,
  };
}

function stubPassiveSelectionPool(around: any[]) {
  const origGet = GameObjectManager.GetSelectableObjectsInRange;
  const origHostile = GameObjectManager.isNearestHostile;
  const origCanSee = GameObjectManager.canSeeObject;
  const origShow = GameObjectManager.showObject;
  const shown: { obj: any; lookAt: boolean; cam: boolean }[] = [];

  GameObjectManager.GetSelectableObjectsInRange = (() => {
    (GameObjectManager as any).playerSelectableObjects = around;
    return around;
  }) as any;
  GameObjectManager.isNearestHostile = ((obj: any) => around.includes(obj)) as any;
  GameObjectManager.canSeeObject = ((_: any, obj: any) => around.includes(obj)) as any;
  GameObjectManager.showObject = ((obj: any, lookAt: boolean, cam: boolean) => {
    shown.push({ obj, lookAt, cam });
    selectedObject = obj;
  }) as any;

  return {
    shown,
    restore(){
      GameObjectManager.GetSelectableObjectsInRange = origGet;
      GameObjectManager.isNearestHostile = origHostile;
      GameObjectManager.canSeeObject = origCanSee;
      GameObjectManager.showObject = origShow;
    },
  };
}

describe('hasSeenObject objectId match (save PerceptionList)', () => {
  it('treats unresolved SEEN ObjectId as seen (oid 43)', () => {
    const enemy = { id: 43 };
    const list = [
      { object: undefined, objectId: 43, data: PerceptionMask.SEEN },
    ];
    expect(hasSeenObject(list, enemy)).toBe(true);
  });

  it('does not treat HEARD-only ObjectId as seen', () => {
    const enemy = { id: 43 };
    const list = [
      { object: undefined, objectId: 43, data: PerceptionMask.HEARD },
    ];
    expect(hasSeenObject(list, enemy)).toBe(false);
  });
});

describe('GameObjectManager.canSeeObject', () => {
  beforeEach(() => {
    GameObjectManager.Reset();
  });

  it('queries LOS from player to target with ignorePerceptionRange', () => {
    const playerLos = jest.fn(() => true);
    const enemyLos = jest.fn(() => false);
    const player = makeCreature({
      id: 1,
      hasLineOfSight: playerLos,
    });
    const enemy = makeCreature({
      id: 43,
      hasLineOfSight: enemyLos,
      perceptionRange: { primaryRange: 5, secondaryRange: 10 },
    });

    const result = GameObjectManager.canSeeObject(player as any, enemy as any);

    expect(result).toBe(true);
    expect(playerLos).toHaveBeenCalledWith(
      enemy,
      30,
      { ignorePerceptionRange: true, eyeHeight: 1.5 },
    );
    expect(enemyLos).not.toHaveBeenCalled();
  });

  it('returns false when player LOS fails even if enemy LOS would succeed', () => {
    const player = makeCreature({
      id: 1,
      hasLineOfSight: () => false,
    });
    const enemy = makeCreature({
      id: 43,
      hasLineOfSight: () => true,
    });

    expect(GameObjectManager.canSeeObject(player as any, enemy as any)).toBe(false);
  });
});

describe('GameObjectManager.validNearestObjectType', () => {
  beforeEach(() => {
    GameObjectManager.Reset();
  });

  it('includes creature when SEEN via hasSeenObject even without LOS', () => {
    const player = makeCreature({
      id: 1,
      isHostile: () => false,
      hasSeenObject: () => true,
      doSpotDetection: () => false,
      hasLineOfSight: () => false,
    });
    const enemy = makeCreature({
      id: 43,
      hasLineOfSight: () => false,
    });
    const result = GameObjectManager.validNearestObjectType(player as any, enemy as any);
    expect(result.ok).toBe(true);
    expect(result.hostile).toBe(true);
  });

  it('includes creature via doSpotDetection without LOS when not SEEN', () => {
    const player = makeCreature({
      id: 1,
      isHostile: () => false,
      hasSeenObject: () => false,
      doSpotDetection: () => true,
      hasLineOfSight: () => false,
    });
    const enemy = makeCreature({ id: 43, hasLineOfSight: () => false });
    const result = GameObjectManager.validNearestObjectType(player as any, enemy as any);
    expect(result.ok).toBe(true);
    expect(result.hostile).toBe(true);
  });

  it('excludes creature when neither SEEN nor DoSpotDetection', () => {
    const player = makeCreature({
      id: 1,
      isHostile: () => false,
      hasSeenObject: () => false,
      doSpotDetection: () => false,
      hasLineOfSight: () => true,
    });
    const enemy = makeCreature({ id: 43, hasLineOfSight: () => true });
    const result = GameObjectManager.validNearestObjectType(player as any, enemy as any);
    expect(result.ok).toBe(false);
  });
});

describe('DoPassiveSelection Enemy Sighted rising edge', () => {
  beforeEach(() => {
    GameObjectManager.Reset();
    mockSignalAutoPause.mockClear();
    clientCombatMode = false;
    selectedObject = undefined;
  });

  it('force-picks first CanSee hostile on rising edge even in combat with sticky', () => {
    const enemy43 = makeCreature({ id: 43 });
    const stickyOther = makeCreature({ id: 99 });
    // oid 43 first in around list — must steal sticky 99 on rising edge
    const stub = stubPassiveSelectionPool([enemy43, stickyOther]);

    selectedObject = stickyOther;
    clientCombatMode = true;

    GameObjectManager.doPassiveSelection(makeCreature({ id: 1 }) as any, 0.016);
    stub.restore();

    expect(stub.shown.length).toBeGreaterThan(0);
    expect(stub.shown[stub.shown.length - 1].obj).toBe(enemy43);
    expect(stub.shown[stub.shown.length - 1].lookAt).toBe(true);
    expect(stub.shown[stub.shown.length - 1].cam).toBe(true);
    expect(mockSignalAutoPause).not.toHaveBeenCalled();
  });

  it('signals EnemySighted auto-pause when not in combat mode', () => {
    const enemy43 = makeCreature({ id: 43 });
    const stub = stubPassiveSelectionPool([enemy43]);

    clientCombatMode = false;
    selectedObject = undefined;

    GameObjectManager.doPassiveSelection(makeCreature({ id: 1 }) as any, 0.016);
    stub.restore();

    expect(mockSignalAutoPause).toHaveBeenCalledWith(AutoPauseState.EnemySighted);
    expect(stub.shown[stub.shown.length - 1].obj).toBe(enemy43);
  });
});
