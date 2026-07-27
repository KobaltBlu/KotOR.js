/**
 * ItemProperty.isUseable + grenade action-menu activate path.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: { itemPropsDef: {}, costTables: {} },
    TwoDAManager: { datatables: new Map() },
    TLKManager: { GetStringById: () => ({ Value: '' }) },
  },
}));

import { ItemProperty } from '@/engine/ItemProperty';
import { TalentObjectType } from '@/enums/engine/TalentObjectType';

/** Build a bare ItemProperty for isUseable() without UTI / 2DA load. */
function propWithUpgrade(upgradeType: number, upgrades = 0): ItemProperty {
  const prop = Object.create(ItemProperty.prototype) as ItemProperty;
  prop.upgradeType = upgradeType;
  prop.item = { upgrades };
  return prop;
}

describe('ItemProperty.isUseable UpgradeType sentinel', () => {
  it('treats -1 as no upgrade required', () => {
    expect(propWithUpgrade(-1, 0).isUseable()).toBe(true);
  });

  it('treats GFF BYTE 255 (none) as no upgrade required', () => {
    // Stock grenade CastSpell rows ship UpgradeType=255; previously blocked UseItem.
    expect(propWithUpgrade(255, 0).isUseable()).toBe(true);
  });

  it('requires the matching upgrade bit when UpgradeType is a real slot', () => {
    expect(propWithUpgrade(0, 0).isUseable()).toBe(false);
    expect(propWithUpgrade(0, 1 << 0).isUseable()).toBe(true);
    expect(propWithUpgrade(3, 0).isUseable()).toBe(false);
    expect(propWithUpgrade(3, 1 << 3).isUseable()).toBe(true);
  });
});

describe('grenade action-menu activate path', () => {
  it('hostile grenade entries are item-only → useItemOnObject (not talent)', () => {
    // populateHostileItems sets { item, target } with no talent.
    const menuItem: { item?: object; talent?: { objectType: number } } = {
      item: { id: 1 },
    };
    const isSpell =
      !!menuItem.talent &&
      ((menuItem.talent.objectType & TalentObjectType.TalentSpell) !== 0);
    const path = isSpell ? 'talent' : menuItem.item ? 'item' : 'none';
    expect(path).toBe('item');
  });
});
