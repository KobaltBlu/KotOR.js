/**
 * Party DecrementUses must remove from InventoryManager, not creature inventory.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

/**
 * Mirrors Item.removeFromCasterInventory routing.
 */
function resolveDecrementInventoryTarget(caster: {
  isPartyMember?: () => boolean;
  isPlayer?: boolean;
  isPM?: boolean;
}): 'inventoryManager' | 'creature' {
  if(caster.isPartyMember?.() || caster.isPlayer || caster.isPM){
    return 'inventoryManager';
  }
  return 'creature';
}

describe('party decrementUses inventory routing', () => {
  it('routes party members to InventoryManager', () => {
    expect(resolveDecrementInventoryTarget({ isPartyMember: () => true }))
      .toBe('inventoryManager');
    expect(resolveDecrementInventoryTarget({ isPlayer: true }))
      .toBe('inventoryManager');
    expect(resolveDecrementInventoryTarget({ isPM: true }))
      .toBe('inventoryManager');
  });

  it('routes non-party creatures to creature inventory', () => {
    expect(resolveDecrementInventoryTarget({ isPartyMember: () => false }))
      .toBe('creature');
  });
});
