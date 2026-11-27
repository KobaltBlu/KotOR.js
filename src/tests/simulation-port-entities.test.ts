import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/GameState', () => ({ GameState: {} }));
// These invariants do not touch disk, load models or run scripts. Keep those
// browser boundaries out of the Node test; ModuleItem/ModuleObject stay real.
jest.mock('@/utility/GameFileSystem', () => ({ GameFileSystem: {} }));
jest.mock('@/loaders/ResourceLoader', () => ({ ResourceLoader: {} }));
jest.mock('@/loaders', () => ({ MDLLoader: {}, ResourceLoader: {} }));
jest.mock('@/odyssey', () => ({
  OdysseyModel: class {}, OdysseyModelAnimation: class {}, OdysseyWalkMesh: class {},
}));
jest.mock('@/three/odyssey', () => ({
  OdysseyModel3D: class {}, OdysseyObject3D: class {}, OdysseyLightsaberEffect: class {},
}));
jest.mock('@/nwscript/NWScript', () => ({ NWScript: class {} }));
jest.mock('@/nwscript/NWScriptInstance', () => ({ NWScriptInstance: class {} }));
jest.mock('@/nwscript/events', () => ({ NWScriptEvent: class {} }));
jest.mock('@/engine/CollisionManager', () => ({ CollisionManager: class {} }));
jest.mock('@/combat', () => ({ CombatRound: class {}, CombatRoundAction: class {} }));

import { ModuleItem } from '@/module/ModuleItem';
import { ModuleObject } from '@/module/ModuleObject';
import { GameEffectType } from '@/enums/effects/GameEffectType';

function item(stackSize: unknown = 1): ModuleItem {
  const result = Object.create(ModuleItem.prototype) as ModuleItem;
  result.template = { RootNode: { hasField: () => false } } as any;
  result.stackSize = stackSize;
  result.baseItem = { stacking: 99 } as any;
  result.properties = [];
  return result;
}

describe('ported entity invariants', () => {
  test('clearAllEffects handles an empty list and removes multiple effects once', () => {
    const owner = Object.create(ModuleObject.prototype) as ModuleObject;
    owner.effects = [];
    expect(() => owner.clearAllEffects()).not.toThrow();
    const effects = [{ onRemove: jest.fn() }, { onRemove: jest.fn() }];
    owner.effects = [...effects] as any;
    owner.clearAllEffects();
    expect(owner.effects).toEqual([]);
    for (const effect of effects) expect(effect.onRemove).toHaveBeenCalledTimes(1);
  });

  test('clearAllEffects tolerates callbacks removing siblings and re-entering cleanup', () => {
    const owner = Object.create(ModuleObject.prototype) as ModuleObject;
    const last = { onRemove: jest.fn() };
    const middle = { onRemove: jest.fn(() => owner.clearAllEffects()) };
    const first = { onRemove: jest.fn(() => owner.removeEffect(last as any)) };
    owner.effects = [first, middle, last] as any;
    owner.clearAllEffects();
    expect(owner.effects).toEqual([]);
    for (const effect of [first, middle, last]) expect(effect.onRemove).toHaveBeenCalledTimes(1);
  });

  test('clearAllEffects invalidates pending visual application and runs removal lifecycle', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const effect = {
      type: GameEffectType.EffectVisualEffect,
      setAttachedObject: jest.fn(),
      loadModel: () => pending,
      onApply: jest.fn(),
      onRemove: jest.fn(),
    };
    const owner = Object.create(ModuleObject.prototype) as ModuleObject;
    owner.effects = [];
    owner.addEffect(effect as any);
    owner.clearAllEffects();
    expect(effect.onRemove).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    await Promise.resolve();
    expect(effect.onApply).not.toHaveBeenCalled();
    expect(owner.effects).toEqual([]);
  });

  test('item stack counts are finite WORD-sized positive integers', () => {
    const instance = item();
    for (const invalid of [NaN, Infinity, -Infinity, 0, -2, undefined]) {
      expect(instance.setStackSize(invalid as number)).toBe(1);
      expect(instance.getStackSize()).toBe(1);
    }
    expect(instance.setStackSize(3.9)).toBe(3);
    expect(instance.setStackSize(100000)).toBe(65535);
  });

  test('items with different properties do not stack despite matching tags', () => {
    const left = item();
    const right = item();
    left.tag = right.tag = 'medpac';
    expect(left.canStackWith(right)).toBe(true);
    right.charges = 4;
    expect(left.canStackWith(right)).toBe(false);
    right.charges = left.charges;
    right.properties = [{ propertyName: 1, costValue: 4 }] as any;
    expect(left.canStackWith(right)).toBe(false);
  });

  test('non-stackable base items never merge', () => {
    const left = item();
    const right = item();
    left.baseItem = { stacking: 1 } as any;
    expect(left.canStackWith(right)).toBe(false);
  });

  test('removed async effects do not apply when their model finishes loading', async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const onApply = jest.fn();
    const effect = {
      type: GameEffectType.EffectVisualEffect,
      setAttachedObject: jest.fn(),
      loadModel: () => pending,
      onApply,
    };
    const owner = Object.create(ModuleObject.prototype) as ModuleObject;
    owner.effects = [];
    owner.addEffect(effect as any);
    owner.effects.length = 0;
    finish();
    await pending;
    await Promise.resolve();
    expect(onApply).not.toHaveBeenCalled();
  });

  test('a failing asynchronous onApply is not retried as a model-load failure', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onApply = jest.fn(() => { throw new Error('apply failure'); });
    const effect = {
      type: GameEffectType.EffectVisualEffect,
      setAttachedObject: jest.fn(),
      loadModel: () => Promise.resolve(),
      onApply,
    };
    try {
      const owner = Object.create(ModuleObject.prototype) as ModuleObject;
      owner.effects = [];
      owner.addEffect(effect as any);
      await Promise.resolve();
      await Promise.resolve();
      expect(onApply).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
});
