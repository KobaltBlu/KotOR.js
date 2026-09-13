/**
 * CreatureClass BAB/AC indexing — CLS_ATK / acbonus rows are level-1.
 * @jest-environment node
 */
import { describe, expect, test, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    SWRuleSet: { classes: [], attackBonusTables: new Map() },
    TwoDAManager: { datatables: new Map() },
  },
}));

import { CreatureClass } from '@/combat/CreatureClass';
import { SWAttackBonus } from '@/engine/rules/SWAttackBonus';

describe('CreatureClass.getBaseAttackBonus', () => {
  test('indexes attackBonuses at level-1 and survives L20', () => {
    const cls = new CreatureClass();
    cls.attackBonuses = Array.from({ length: 20 }, (_, i) => {
      const row = new SWAttackBonus();
      row.bab = i + 1;
      return row;
    });

    cls.setLevel(1);
    expect(cls.getBaseAttackBonus()).toBe(1);

    cls.setLevel(20);
    expect(cls.getBaseAttackBonus()).toBe(20);
  });

  test('returns 0 when level is 0 or table row missing', () => {
    const cls = new CreatureClass();
    cls.attackBonuses = [];
    cls.setLevel(0);
    expect(cls.getBaseAttackBonus()).toBe(0);
    cls.setLevel(5);
    expect(cls.getBaseAttackBonus()).toBe(0);
  });

  test('getACBonus uses level-1 indexing', () => {
    const cls = new CreatureClass();
    cls.acbonuses = Array.from({ length: 20 }, (_, i) => i);
    cls.setLevel(20);
    expect(cls.getACBonus()).toBe(19);
  });
});
