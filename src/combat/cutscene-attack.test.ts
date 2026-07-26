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
import { resolveMasterState } from '@/combat/combat-dueling';
import { canSyncMeleeReaction, pickMeleeReaction, resolveMeleeReactionPlayback } from '@/combat/combat-reaction-eligibility';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { AttackResult } from '@/enums/combat/AttackResult';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';
import { ModuleObjectType } from '@/enums/module/ModuleObjectType';

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

describe('CutsceneAttack duel timing', () => {
  // Mirror the ActionPhysicalAttacks branch decision: engaged duels only
  // enter master/slave pairing when the round is NOT a scripted cutscene swing.
  const usesNonEngagedStart = (
    duelEngaged: boolean,
    resultsCalculated: boolean
  ) => !duelEngaged || resultsCalculated;

  it('resultsCalculated forces non-engaged start even when duel is engaged', () => {
    expect(usesNonEngagedStart(true, true)).toBe(true);
  });

  it('normal engaged duel still uses the engaged master/slave path', () => {
    expect(usesNonEngagedStart(true, false)).toBe(false);
  });

  it('non-engaged attack always uses the non-engaged start', () => {
    expect(usesNonEngagedStart(false, false)).toBe(true);
  });

  it('resolveMasterState yields when partner already masters this pair', () => {
    const attacker: any = { objectType: ModuleObjectType.ModuleCreature };
    const target: any = {
      objectType: ModuleObjectType.ModuleCreature,
      combatRound: { engaged: true, master: true, duelPartner: attacker },
      combatData: { lastAttackTarget: attacker },
    };
    // Without the guard, targetLastAttack === attacker would return master=true
    expect(resolveMasterState(attacker, target, true)).toBe(false);
  });

  it('resolveMasterState still masters when partner is not driving the pair', () => {
    const attacker: any = { objectType: ModuleObjectType.ModuleCreature };
    const target: any = {
      objectType: ModuleObjectType.ModuleCreature,
      combatRound: { engaged: false, master: false, duelPartner: undefined },
      combatData: { lastAttackTarget: attacker },
    };
    expect(resolveMasterState(attacker, target, true)).toBe(true);
  });

  it('resolveMasterState returns false when not engaged', () => {
    const attacker: any = { objectType: ModuleObjectType.ModuleCreature };
    const target: any = { objectType: ModuleObjectType.ModuleCreature };
    expect(resolveMasterState(attacker, target, false)).toBe(false);
  });
});

describe('CutsceneAttack force-react eligibility', () => {
  const base = {
    hasTargetCombatRound: true,
    checkActionLengthOk: false,
    attackResult: AttackResult.MISS,
    targetAnimIndex: ModuleCreatureAnimState.ATTACK,
    targetLastAttackIsAttacker: false,
  };

  it('resultsCalculated forces react even when non-engaged and mid-swing', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: false,
      resultsCalculated: true,
    })).toBe(true);
  });

  it('non-cutscene unengaged does not force-react while mid-swing', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: false,
      resultsCalculated: false,
    })).toBe(false);
  });

  it('non-cutscene unengaged reacts when idle and targeting attacker', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: false,
      resultsCalculated: false,
      targetAnimIndex: ModuleCreatureAnimState.READY,
      targetLastAttackIsAttacker: true,
    })).toBe(true);
  });

  it('engaged duel still reacts on hit without resultsCalculated', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: false,
      attackResult: AttackResult.HIT_SUCCESSFUL,
    })).toBe(true);
  });
});

describe('CutsceneAttack hit DAMAGE reaction playback', () => {
  it('pickMeleeReaction maps landing hits to DAMAGE', () => {
    expect(pickMeleeReaction(AttackResult.HIT_SUCCESSFUL)).toBe(ModuleCreatureAnimState.DAMAGE);
    expect(pickMeleeReaction(AttackResult.CRITICAL_HIT)).toBe(ModuleCreatureAnimState.DAMAGE);
    expect(pickMeleeReaction(AttackResult.AUTOMATIC_HIT)).toBe(ModuleCreatureAnimState.DAMAGE);
  });

  it('pickMeleeReaction maps miss/parry to dodge/parry', () => {
    expect(pickMeleeReaction(AttackResult.MISS)).toBe(ModuleCreatureAnimState.DODGE);
    expect(pickMeleeReaction(AttackResult.PARRIED)).toBe(ModuleCreatureAnimState.PARRY);
  });

  it('prefers mapped clip when present', () => {
    expect(resolveMeleeReactionPlayback({ name: 'g2d1' })).toEqual({ mode: 'mapped' });
  });

  it('falls back to setAnimationState when mapped clip is missing', () => {
    // Never flip only index — that leaves a stale ATTACK clip on the defender
    expect(resolveMeleeReactionPlayback(undefined)).toEqual({ mode: 'setAnimationState' });
    expect(resolveMeleeReactionPlayback(null)).toEqual({ mode: 'setAnimationState' });
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
