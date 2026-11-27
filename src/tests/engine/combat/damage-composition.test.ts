/**
 * Damage composition: combat-mode Power Attack + Massive Criticals.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: {
        get: (name: string) => {
          if(name === 'iprp_damagecost'){
            return {
              rows: {
                6: { numdice: '1', die: '6' },
              },
            };
          }
          return undefined;
        },
      },
    },
  },
}));

import { CombatAttackData } from '@engine/combat/CombatAttackData';
import { CombatMode } from '@core/enums/combat/CombatMode';
import { ModuleItemProperty } from '@core/enums/module/ModuleItemProperty';

describe('getCombatModeDamageBonus', () => {
  it('maps mode 2 → +5 and mode 3 → +10 (GetDamageBonus)', () => {
    expect(CombatAttackData.getCombatModeDamageBonus({ combatMode: CombatMode.NONE } as any)).toBe(0);
    expect(CombatAttackData.getCombatModeDamageBonus({ combatMode: CombatMode.MODE_2 } as any)).toBe(5);
    expect(CombatAttackData.getCombatModeDamageBonus({ combatMode: CombatMode.MODE_3 } as any)).toBe(10);
  });
});

describe('getMassiveCriticalBonus', () => {
  it('returns 0 when the weapon has no Massive Criticals property', () => {
    expect(CombatAttackData.getMassiveCriticalBonus(undefined)).toBe(0);
    expect(CombatAttackData.getMassiveCriticalBonus({ properties: [] } as any)).toBe(0);
  });

  it('resolves flat iprp_damagecost codes 1–5 once', () => {
    const weapon = {
      properties: [{
        isUseable: () => true,
        is: (p: number) => p === ModuleItemProperty.Massive_Criticals,
        costValue: 3,
      }],
    };
    expect(CombatAttackData.getMassiveCriticalBonus(weapon as any)).toBe(3);
  });
});
