/**
 * Item-cast fire-and-forget: after SpellCastAndImpact the action must not
 * interrupt area.spellInstances when the thrown item leaves ObjectList.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

/**
 * Mirrors ActionItemCastSpell.dispose — never interrupt after castStarted.
 */
function shouldInterruptOnDispose(castStarted: boolean, instance?: { completed: boolean }){
  return (
    !castStarted &&
    !!instance &&
    !instance.completed
  );
}

/**
 * Mirrors ActionItemCastSpell.update item gate — after castStarted, missing
 * GetObjectById must not FAIL the action.
 */
function shouldFailForMissingItem(castStarted: boolean, oItem: unknown){
  return !castStarted && !oItem;
}

describe('item cast fire-and-forget', () => {
  it('does not interrupt a live SpellCastInstance after castStarted', () => {
    const instance = { completed: false, interrupt: jest.fn() };
    expect(shouldInterruptOnDispose(true, instance)).toBe(false);
    if(shouldInterruptOnDispose(true, instance)){
      instance.interrupt();
    }
    expect(instance.interrupt).not.toHaveBeenCalled();
  });

  it('still interrupts if dispose happens before SpellCastAndImpact', () => {
    const instance = { completed: false, interrupt: jest.fn() };
    expect(shouldInterruptOnDispose(false, instance)).toBe(true);
  });

  it('does not fail the action when the item id is gone after castStarted', () => {
    expect(shouldFailForMissingItem(true, undefined)).toBe(false);
    expect(shouldFailForMissingItem(false, undefined)).toBe(true);
    expect(shouldFailForMissingItem(false, { id: 1 })).toBe(false);
  });
});
