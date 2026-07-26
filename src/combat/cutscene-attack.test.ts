/**
 * CutsceneAttack / resultsCalculated combat-round alignment.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

const animRows: Record<number, { name: string }> = {
  416: { name: '2HS_Perform_Flurry_3' },
  239: { name: 'RF_Attack_1' },
};

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: {
      datatables: new Map([
        [
          'animations',
          {
            rows: animRows,
            getByID: (id: number) => animRows[id],
          },
        ],
      ]),
    },
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: (name: string) => (name ? { name } : undefined),
  },
}));

import { CombatRoundAction, resolveAnimations2DARow } from '@/combat/CombatRoundAction';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { AttackResult } from '@/enums/combat/AttackResult';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

describe('resolveAnimations2DARow', () => {
  it('resolves CutsceneAttack nAnimation as animations.2da row', () => {
    const row = resolveAnimations2DARow(416);
    expect(row?.name).toBe('2HS_Perform_Flurry_3');
  });

  it('returns undefined for missing rows', () => {
    expect(resolveAnimations2DARow(-1)).toBeUndefined();
    expect(resolveAnimations2DARow(99999)).toBeUndefined();
  });
});

describe('AddCutsceneAttackAction field contract', () => {
  it('mirrors retail AddCutsceneAttackAction @ 004d3810', () => {
    const action = new CombatRoundAction();
    action.actionType = CombatActionType.ATTACK;
    action.animation = ModuleCreatureAnimState.ATTACK;
    // Retail (combatStretch + 3000) / 2
    action.animationTime = Math.floor((0 + 3000) / 2);
    action.resultsCalculated = true;
    action.attackAnimation = 416;
    action.attackResult = AttackResult.CRITICAL_HIT;
    action.attackDamage = 500;

    expect(action.actionType).toBe(1);
    expect(action.animation).toBe(0x2719);
    expect(action.animationTime).toBe(1500);
    expect(action.resultsCalculated).toBe(true);
    expect(action.resolved).toBe(false);
    expect(action.attackAnimation).toBe(416);
    expect(action.attackResult).toBe(AttackResult.CRITICAL_HIT);
    expect(action.attackDamage).toBe(500);
  });

  it('calculateAttackAnimation uses attackAnimation row when resultsCalculated', () => {
    const owner = {
      objectType: 1 << 3, // ModuleObjectType.ModuleCreature
      getCombatAnimationAttackType: () => 'm',
      getCombatAnimationWeaponType: () => 1,
      isDuelingObject: () => false,
    };
    const action = new CombatRoundAction(owner as any);
    action.resultsCalculated = true;
    action.attackAnimation = 416;
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('2HS_Perform_Flurry_3');
    expect(action.twoDAAnimation?.name).toBe('2HS_Perform_Flurry_3');
  });

  it('ActionCombat-style params pack resultsCalculated + row/result/damage', () => {
    const action = new CombatRoundAction();
    action.resultsCalculated = true;
    action.attackAnimation = 239;
    action.attackResult = AttackResult.HIT_SUCCESSFUL;
    action.attackDamage = 12;

    const param0 = action.resultsCalculated ? 1 : 0;
    const param7 = action.resultsCalculated ? action.attackAnimation : 0;
    const param8 = action.resultsCalculated ? action.attackResult : 4;
    const param9 = action.resultsCalculated ? action.attackDamage : 0;

    expect(param0).toBe(1);
    expect(param7).toBe(239);
    expect(param8).toBe(AttackResult.HIT_SUCCESSFUL);
    expect(param9).toBe(12);
  });
});

describe('CutsceneMove combat action type', () => {
  it('uses ATTACK_CUTSCENE_MOVE = 0xC with move position and run flag', () => {
    const action = new CombatRoundAction();
    action.actionType = CombatActionType.ATTACK_CUTSCENE_MOVE;
    action.moveToPosition = { x: 1, y: 2, z: 3 };
    action.shouldRun = 1;
    expect(action.actionType).toBe(12);
    expect(action.moveToPosition).toEqual({ x: 1, y: 2, z: 3 });
    expect(action.shouldRun).toBe(1);
  });
});
