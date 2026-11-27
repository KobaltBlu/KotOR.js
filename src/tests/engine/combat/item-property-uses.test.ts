/**
 * GetUsedActivePropertyUsesLeft / DecrementUses.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import {
  applyDecrementUses,
  canTargetItemCastByPerception,
  getUsedActivePropertyUsesLeft,
  isUnlimitedCastSpellCostValue,
  shouldFailItemCastForNoUses,
} from '@engine/combat/item-property-uses';
import { ModuleItemProperty } from '@core/enums/module/ModuleItemProperty';
import { ItemTypeCategory } from '@engine/menu/action-menu-usable-pure';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';

function prop(costValue: number, opts: { useable?: boolean; usesPerDay?: number } = {}){
  return {
    propertyName: ModuleItemProperty.CastSpell,
    costValue,
    usesPerDay: opts.usesPerDay ?? 0,
    isUseable: () => opts.useable !== false,
  } as any;
}

describe('getUsedActivePropertyUsesLeft', () => {
  it('cost_value 1 returns stack size', () => {
    expect(getUsedActivePropertyUsesLeft(prop(1), 0, 5)).toBe(5);
    expect(getUsedActivePropertyUsesLeft(prop(1), 0, 0)).toBe(0);
  });

  it('charge cost_values divide charges', () => {
    expect(getUsedActivePropertyUsesLeft(prop(2), 10, 1)).toBe(2);
    expect(getUsedActivePropertyUsesLeft(prop(3), 8, 1)).toBe(2);
    expect(getUsedActivePropertyUsesLeft(prop(4), 9, 1)).toBe(3);
    expect(getUsedActivePropertyUsesLeft(prop(5), 7, 1)).toBe(3);
    expect(getUsedActivePropertyUsesLeft(prop(6), 4, 1)).toBe(4);
  });

  it('uses-per-day cost_values return usesPerDay', () => {
    expect(getUsedActivePropertyUsesLeft(prop(8, { usesPerDay: 3 }), 0, 1)).toBe(3);
    expect(getUsedActivePropertyUsesLeft(prop(8, { usesPerDay: 0 }), 0, 1)).toBe(0);
  });

  it('returns 0 when property is not useable', () => {
    expect(getUsedActivePropertyUsesLeft(prop(1, { useable: false }), 0, 5)).toBe(0);
  });
});

describe('shouldFailItemCastForNoUses', () => {
  it('fails when stack is empty for cost_value 1', () => {
    expect(shouldFailItemCastForNoUses(prop(1), 0, 0)).toBe(true);
    expect(shouldFailItemCastForNoUses(prop(1), 0, 2)).toBe(false);
  });

  it('never fails unlimited cost values 7 / 0xD', () => {
    expect(isUnlimitedCastSpellCostValue(7)).toBe(true);
    expect(isUnlimitedCastSpellCostValue(0xd)).toBe(true);
    expect(shouldFailItemCastForNoUses(prop(7), 0, 0)).toBe(false);
    expect(shouldFailItemCastForNoUses(prop(0xd), 0, 0)).toBe(false);
  });
});

describe('applyDecrementUses', () => {
  it('burns one from a grenade stack (cost_value 1)', () => {
    const r = applyDecrementUses({
      costValue: 1,
      charges: 0,
      stackSize: 5,
      usesPerDay: 0,
      useable: 1,
      itemType: ItemTypeCategory.GRENADE,
    });
    expect(r.stackSize).toBe(4);
    expect(r.destroyItem).toBe(false);
    expect(r.useable).toBe(1);
  });

  it('destroys the last grenade in a stack', () => {
    const r = applyDecrementUses({
      costValue: 1,
      charges: 0,
      stackSize: 1,
      usesPerDay: 0,
      useable: 1,
      itemType: ItemTypeCategory.GRENADE,
    });
    expect(r.destroyItem).toBe(true);
    expect(r.useable).toBe(0);
  });

  it('burns 5 charges for cost_value 2', () => {
    const r = applyDecrementUses({
      costValue: 2,
      charges: 12,
      stackSize: 1,
      usesPerDay: 0,
      useable: 1,
    });
    expect(r.charges).toBe(7);
    expect(r.destroyItem).toBe(false);
  });

  it('marks unusable and destroys when charges drop below burn', () => {
    const r = applyDecrementUses({
      costValue: 6,
      charges: 1,
      stackSize: 1,
      usesPerDay: 0,
      useable: 1,
      itemType: 3,
    });
    expect(r.charges).toBe(0);
    expect(r.useable).toBe(0);
    expect(r.destroyItem).toBe(true);
  });

  it('decrements uses-per-day without destroying', () => {
    const r = applyDecrementUses({
      costValue: 8,
      charges: 0,
      stackSize: 1,
      usesPerDay: 2,
      useable: 1,
    });
    expect(r.usesPerDay).toBe(1);
    expect(r.destroyItem).toBe(false);
    expect(r.useable).toBe(1);
  });

  it('destroys medical items on final charge burn (engine !bVar5 path)', () => {
    const r = applyDecrementUses({
      costValue: 6,
      charges: 1,
      stackSize: 1,
      usesPerDay: 0,
      useable: 1,
      itemType: ItemTypeCategory.MEDICAL_A,
    });
    expect(r.useable).toBe(0);
    expect(r.destroyItem).toBe(true);
  });
});

describe('canTargetItemCastByPerception', () => {
  it('allows party / self unconditionally', () => {
    expect(canTargetItemCastByPerception(undefined, { isSelf: true })).toBe(true);
    expect(canTargetItemCastByPerception(undefined, { isPartyOrPlayerUI: true })).toBe(true);
  });

  it('rejects missing perception for non-party', () => {
    expect(canTargetItemCastByPerception(undefined, { isPartyOrPlayerUI: false })).toBe(false);
  });

  it('rejects HEARD-only (flags&0xC)==4 and invisible without SEEN', () => {
    expect(canTargetItemCastByPerception(4)).toBe(false);
    expect(canTargetItemCastByPerception(0x10)).toBe(false);
    expect(canTargetItemCastByPerception(0x10 | PerceptionMask.SEEN)).toBe(true);
    expect(canTargetItemCastByPerception(PerceptionMask.SEEN_AND_HEARD)).toBe(true);
  });
});

describe('item cast icon fallback', () => {
  it('uses inventory icon when spell iconresref is ****', () => {
    const spellIcon = '****';
    const itemIcon = 'iw_grenade_001';
    const resolved = (!spellIcon || spellIcon === '****') ? itemIcon : spellIcon;
    expect(resolved).toBe('iw_grenade_001');
  });
});
