/**
 * DiffSettings weighted damage + party difficultyopt scale.
 * @jest-environment node
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

const mockState: any = {
  TwoDAManager: {
    datatables: {
      get: (name: string) => {
        if(name === 'diffsettings'){
          return {
            rows: {
              3: { name: 'MinPCDamagePercent', dmeasy: '100', easy: '50', normal: '****', hardcore: '****', dmplayers: '****' },
              4: { name: 'MaxNPCDamagePercent', dmeasy: '25', easy: '50', normal: '100', hardcore: '100', dmplayers: '200' },
              5: { name: 'MinHP1', dmeasy: '1', easy: '****', normal: '****', hardcore: '****', dmplayers: '****' },
            },
          };
        }
        if(name === 'difficultyopt'){
          return {
            rows: {
              0: { multiplier: '0.5' },
              1: { multiplier: '1.0' },
              2: { multiplier: '1.5' },
            },
          };
        }
        return undefined;
      },
    },
  },
  SWRuleSet: {
    currentDifficulty: 1,
    difficulty: [
      { multiplier: 0.5 },
      { multiplier: 1.0 },
      { multiplier: 1.5 },
    ],
  },
  PartyManager: { party: [] },
};

jest.mock('@engine/runtime/GameState', () => ({ GameState: mockState }));

import {
  DiffSettingsOption,
  applyPartyDifficultyDamage,
  getDifficultyOption,
  getDifficultyOptMultiplier,
  getWeightedDamageAmount,
  weightWeaponDiceRoll,
} from '@engine/combat/diff-settings';

describe('getDifficultyOption', () => {
  beforeEach(() => {
    mockState.SWRuleSet.currentDifficulty = 1; // easy column
  });

  it('reads MinPCDamagePercent / MaxNPCDamagePercent for the active difficulty', () => {
    expect(getDifficultyOption(DiffSettingsOption.MinPCDamagePercent)).toBe(50);
    expect(getDifficultyOption(DiffSettingsOption.MaxNPCDamagePercent)).toBe(50);
  });

  it('treats **** as 0', () => {
    mockState.SWRuleSet.currentDifficulty = 2; // normal
    expect(getDifficultyOption(DiffSettingsOption.MinPCDamagePercent)).toBe(0);
    expect(getDifficultyOption(DiffSettingsOption.MinHP1)).toBe(0);
  });
});

describe('getWeightedDamageAmount', () => {
  it('returns max weapon dice when PC MinPCDamagePercent is 100', () => {
    expect(getWeightedDamageAmount(3, 8, true, false, 100)).toBe(8);
  });

  it('reduces NPC→PC damage when MaxNPCDamagePercent < 100', () => {
    // roll 6, max 8, pct 50 → 6 - ((100-50)*8)/100 = 6 - 4 = 2
    expect(getWeightedDamageAmount(6, 8, false, true, 50)).toBe(2);
  });

  it('floors NPC→PC reductions at 1', () => {
    expect(getWeightedDamageAmount(1, 8, false, true, 25)).toBe(1);
  });

  it('leaves the roll unchanged when percent is 0', () => {
    expect(getWeightedDamageAmount(5, 8, true, false, 0)).toBe(5);
    expect(getWeightedDamageAmount(5, 8, false, true, 0)).toBe(5);
  });
});

describe('weightWeaponDiceRoll', () => {
  it('applies MinPC when a PC hits a non-party target', () => {
    mockState.SWRuleSet.currentDifficulty = 0; // dmeasy → MinPC 100
    const attacker = { isPC: 1, isPlayer: true } as any;
    const target = { isPartyMember: () => false } as any;
    expect(weightWeaponDiceRoll(3, 8, attacker, target)).toBe(8);
  });

  it('applies MaxNPC when an NPC hits a party member', () => {
    mockState.SWRuleSet.currentDifficulty = 0; // MaxNPC 25
    const attacker = { isPC: 0, isPlayer: false } as any;
    const target = { isPartyMember: () => true, getHP: () => 20 } as any;
    // 6 - ((100-25)*8)/100 = 6 - 6 = 0 → floor 1
    expect(weightWeaponDiceRoll(6, 8, attacker, target)).toBe(1);
  });
});

describe('applyPartyDifficultyDamage', () => {
  it('scales party incoming damage by difficultyopt MULTIPLIER', () => {
    mockState.SWRuleSet.currentDifficulty = 0; // 0.5 + MinHP1
    const target = { isPartyMember: () => true, getHP: () => 20 } as any;
    expect(applyPartyDifficultyDamage(target, 10)).toBe(5);
    expect(getDifficultyOptMultiplier()).toBe(0.5);
  });

  it('clamps with MinHP1 so party HP cannot drop below 1', () => {
    mockState.SWRuleSet.currentDifficulty = 0;
    const target = { isPartyMember: () => true, getHP: () => 3 } as any;
    // 10 * 0.5 = 5, but HP 3 → leave 1 → deal 2
    expect(applyPartyDifficultyDamage(target, 10)).toBe(2);
  });
});
