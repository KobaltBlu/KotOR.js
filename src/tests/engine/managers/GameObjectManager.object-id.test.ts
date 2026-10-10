/**
 * Object id pools —
 * char vs module assignment / no overwrite on collision.
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@engine/managers/PartyManager', () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    CursorManager: { isClientCombatMode: () => false },
    module: undefined,
  },
}));
jest.mock('@engine/render/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@engine/managers/ResolutionManager', () => ({
  ResolutionManager: { addResolution: () => {} },
}));
jest.mock('@engine/pathfinding/visual-los', () => ({
  hasVisualLos: () => true,
}));

import { GameObjectManager } from '@engine/managers/GameObjectManager';
import { GameObjectConstant } from '@core/enums/module/GameObjectConstant';
import { GameObjectType } from '@core/enums/module/GameObjectType';
import { AILevel } from '@core/enums/module/AILevel';

function makeObj(partial: {
  id?: number;
  isPlayer?: boolean;
  objectType?: number;
  tag?: string;
}): any {
  return {
    id: partial.id,
    isPlayer: !!partial.isPlayer,
    isPM: false,
    objectType: partial.objectType ?? GameObjectType.Creature,
    aiLevel: AILevel.INVALID,
    template: undefined,
    getTag: () => partial.tag || '',
  };
}

describe('GameObjectManager object id pools', () => {
  beforeEach(() => {
    GameObjectManager.ObjectList.clear();
    GameObjectManager.tagLookup.length = 0;
    GameObjectManager.Reset();
  });

  test('PC without id gets char-pool PLAYER_ID', () => {
    const pc = makeObj({
      isPlayer: true,
      objectType: GameObjectType.PlayerCharacter,
    });
    GameObjectManager.AddObjectById(pc);
    expect(pc.id).toBe(GameObjectConstant.PLAYER_ID);
    expect(GameObjectManager.ObjectList.get(pc.id)).toBe(pc);
    expect(GameObjectManager.isCharPoolId(pc.id)).toBe(true);
  });

  test('companion without id gets module-pool id (not PLAYER_ID)', () => {
    const companion = makeObj({});
    GameObjectManager.AddObjectById(companion);
    expect(companion.id).not.toBe(GameObjectConstant.PLAYER_ID);
    expect(GameObjectManager.isCharPoolId(companion.id)).toBe(false);
    expect(companion.id).toBeGreaterThanOrEqual(0x100);
  });

  test('companion colliding on PLAYER_ID does not overwrite PC', () => {
    const pc = makeObj({
      id: GameObjectConstant.PLAYER_ID,
      isPlayer: true,
      objectType: GameObjectType.PlayerCharacter,
    });
    GameObjectManager.AddObjectById(pc);

    const companion = makeObj({
      id: GameObjectConstant.PLAYER_ID,
      tag: 'end_trask',
    });
    GameObjectManager.AddObjectById(companion);

    expect(GameObjectManager.ObjectList.get(GameObjectConstant.PLAYER_ID)).toBe(pc);
    expect(companion.id).not.toBe(pc.id);
    expect(GameObjectManager.ObjectList.get(companion.id)).toBe(companion);
    // Requested id was char-pool → realloc stays in char pool (AddObjectAtPos).
    expect(GameObjectManager.isCharPoolId(companion.id)).toBe(true);
  });

  test('re-registering the same instance keeps its id', () => {
    const obj = makeObj({});
    GameObjectManager.AddObjectById(obj);
    const firstId = obj.id;
    GameObjectManager.AddObjectById(obj);
    expect(obj.id).toBe(firstId);
    expect(GameObjectManager.ObjectList.get(firstId)).toBe(obj);
  });
});

/** Mirrors ActionItemCastSpell self-id owner bind. */
function resolveItemCastTarget(
  owner: { id: number },
  rawTargetId: number | undefined,
  resolvedById: { id: number } | undefined
): { id: number } {
  if(rawTargetId != null && rawTargetId === owner.id){
    return owner;
  }
  return resolvedById || owner;
}

describe('ActionItemCastSpell self id owner bind', () => {
  it('binds owner when DWORD id matches owner even if lookup returns companion', () => {
    const owner = { id: 0x7fffffff };
    const companion = { id: 0x7fffffff };
    expect(resolveItemCastTarget(owner, owner.id, companion)).toBe(owner);
  });

  it('uses resolved object when DWORD id differs from owner', () => {
    const owner = { id: 0x7fffffff };
    const target = { id: 0x200 };
    expect(resolveItemCastTarget(owner, target.id, target)).toBe(target);
  });
});
