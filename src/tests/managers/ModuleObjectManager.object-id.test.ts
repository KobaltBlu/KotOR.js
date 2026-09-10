/**
 * Retail-aligned object id pools —
 * AddInternalObject (char vs module) / AddObjectAtPos (no overwrite).
 * @jest-environment node
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals';

jest.mock('@/managers/PartyManager', () => ({
  PartyManager: { party: [], Player: undefined },
}));
jest.mock('@/GameState', () => ({
  GameState: {
    CursorManager: { isClientCombatMode: () => false },
    module: undefined,
  },
}));
jest.mock('@/engine/FollowerCamera', () => ({ FollowerCamera: {} }));
jest.mock('@/managers/ResolutionManager', () => ({
  ResolutionManager: { addResolution: () => {} },
}));
jest.mock('@/engine/pathfinding/clear-line-of-sight', () => ({
  clearLineOfSight: () => true,
}));

import { ModuleObjectManager } from '@/managers/ModuleObjectManager';
import { ModuleObjectConstant } from '@/enums/module/ModuleObjectConstant';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';
import { AILevel } from '@/enums/module/AILevel';

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
    objectType: partial.objectType ?? ModuleObjectType.ModuleCreature,
    aiLevel: AILevel.INVALID,
    template: undefined,
    getTag: () => partial.tag || '',
  };
}

describe('ModuleObjectManager object id pools', () => {
  beforeEach(() => {
    ModuleObjectManager.ObjectList.clear();
    ModuleObjectManager.tagLookup.length = 0;
    ModuleObjectManager.Reset();
  });

  test('PC without id gets char-pool PLAYER_ID', () => {
    const pc = makeObj({
      isPlayer: true,
      objectType: ModuleObjectType.ModulePlayer,
    });
    ModuleObjectManager.AddObjectById(pc);
    expect(pc.id).toBe(ModuleObjectConstant.PLAYER_ID);
    expect(ModuleObjectManager.ObjectList.get(pc.id)).toBe(pc);
    expect(ModuleObjectManager.isCharPoolId(pc.id)).toBe(true);
  });

  test('companion without id gets module-pool id (not PLAYER_ID)', () => {
    const companion = makeObj({});
    ModuleObjectManager.AddObjectById(companion);
    expect(companion.id).not.toBe(ModuleObjectConstant.PLAYER_ID);
    expect(ModuleObjectManager.isCharPoolId(companion.id)).toBe(false);
    expect(companion.id).toBeGreaterThanOrEqual(0x100);
  });

  test('companion colliding on PLAYER_ID does not overwrite PC', () => {
    const pc = makeObj({
      id: ModuleObjectConstant.PLAYER_ID,
      isPlayer: true,
      objectType: ModuleObjectType.ModulePlayer,
    });
    ModuleObjectManager.AddObjectById(pc);

    const companion = makeObj({
      id: ModuleObjectConstant.PLAYER_ID,
      tag: 'end_trask',
    });
    ModuleObjectManager.AddObjectById(companion);

    expect(ModuleObjectManager.ObjectList.get(ModuleObjectConstant.PLAYER_ID)).toBe(pc);
    expect(companion.id).not.toBe(pc.id);
    expect(ModuleObjectManager.ObjectList.get(companion.id)).toBe(companion);
    // Requested id was char-pool → realloc stays in char pool (AddObjectAtPos).
    expect(ModuleObjectManager.isCharPoolId(companion.id)).toBe(true);
  });

  test('re-registering the same instance keeps its id', () => {
    const obj = makeObj({});
    ModuleObjectManager.AddObjectById(obj);
    const firstId = obj.id;
    ModuleObjectManager.AddObjectById(obj);
    expect(obj.id).toBe(firstId);
    expect(ModuleObjectManager.ObjectList.get(firstId)).toBe(obj);
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
