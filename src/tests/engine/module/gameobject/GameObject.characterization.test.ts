/**
 * Focused characterization of stateful GameObject helpers.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    GameObjectManager: { RemoveObject: jest.fn() },
    module: undefined as any,
  },
}));
jest.mock('@engine/nwscript/NWScript', () => ({ NWScript: {} }));

import { GameObject } from '@engine/module/GameObject';
import type { Item } from '@engine/module/Item';

function makeItem(tag: string, stack: number, maxStack = 10): Item {
  let stackSize = stack;
  const item: any = {
    baseItem: { stacking: maxStack },
    load: jest.fn(),
    getTag: () => tag,
    getStackSize: () => stackSize,
    setStackSize: (value: number) => { stackSize = value; },
  };
  item.clone = jest.fn(() => makeItem(tag, stackSize, maxStack));
  return item as Item;
}

describe('GameObject characterization', () => {
  it('merges matching inventory stacks and retains overflow', () => {
    const owner = new GameObject();
    const existing = makeItem('medpac', 8);
    const incoming = makeItem('MEDPAC', 5);
    owner.inventory.push(existing);

    expect(owner.addItem(incoming)).toBe(incoming);
    expect(existing.getStackSize()).toBe(10);
    expect(incoming.getStackSize()).toBe(3);
    expect(owner.inventory).toEqual([existing, incoming]);
  });

  it('removes from the first matching stack and returns a clone', () => {
    const owner = new GameObject();
    const item = makeItem('parts', 5);
    owner.inventory.push(item);

    const removed = owner.removeItem(item, 2);

    expect(item.getStackSize()).toBe(3);
    expect(removed).not.toBe(item);
    expect(removed.getStackSize()).toBe(3);
    expect(owner.inventory).toEqual([item]);
  });

  it('tracks trap detection by object id without duplicates', () => {
    const trap = new GameObject();
    const detector = { id: 42 } as GameObject;

    expect(trap.setTrapDetectedBy(detector)).toBe(true);
    expect(trap.setTrapDetectedBy(detector)).toBe(true);
    expect(trap.trapDetectedByIds).toEqual([42]);
    expect(trap.isTrapDetectedBy(detector)).toBe(true);
    expect(trap.isTrapDetectedBy({ id: 7 } as GameObject)).toBe(false);
  });

  it('removes effects once and preserves persistent duration classes on clear', () => {
    const owner = new GameObject();
    const temporary: any = { type: 1, subType: 0, onRemove: jest.fn() };
    const equipped: any = {
      type: 2,
      subType: 0,
      getDurationType: () => 3,
      onRemove: jest.fn(),
    };
    owner.effects = [temporary, equipped];

    owner.removeEffect(temporary);
    owner.removeEffect(temporary);
    expect(temporary.onRemove).toHaveBeenCalledTimes(1);

    owner.effects.unshift(temporary);
    owner.clearAllEffects();
    expect(owner.effects).toEqual([equipped]);
    expect(temporary.onRemove).toHaveBeenCalledTimes(2);
    expect(equipped.onRemove).not.toHaveBeenCalled();
  });

  it('resets destruction timing when the pending flag changes', () => {
    const owner = new GameObject();
    owner.timeSinceDestroyStarted = 4;

    owner.setWillDestroy(true);

    expect(owner.willDestroy).toBe(true);
    expect(owner.destroyed).toBe(false);
    expect(owner.timeSinceDestroyStarted).toBe(0);
  });
});
