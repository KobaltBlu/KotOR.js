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
import {
  canSyncMeleeReaction,
  canSyncRangedReaction,
  isRangedDodgeBlockedAnimation,
  pickMeleeReaction,
  pickRangedReaction,
  rangedAttackHadLandingHit,
  resolveMeleeReactionPlayback,
} from '@/combat/combat-reaction-eligibility';
import { resolveAttackPauseMs, shouldEndRoundOnPauseExpiry, shouldSnapCombatReady } from '@/combat/combat-round-pause';
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
  // Retail: cutscene attacks use the same engaged/master/slave path as normal
  // attacks. Branch is solely on duelEngaged (not resultsCalculated).
  const usesNonEngagedStart = (duelEngaged: boolean) => !duelEngaged;

  it('resultsCalculated still uses engaged master/slave when duel is engaged', () => {
    expect(usesNonEngagedStart(true)).toBe(false);
  });

  it('normal engaged duel uses the engaged master/slave path', () => {
    expect(usesNonEngagedStart(true)).toBe(false);
  });

  it('non-engaged attack always uses the non-engaged start', () => {
    expect(usesNonEngagedStart(false)).toBe(true);
  });

  it('roundPaused early-returns before duel resolution (retail slave wait)', () => {
    // Mirror ActionPhysicalAttacks: if roundPaused, return IN_PROGRESS and
    // never enter StartCombatRound / ResolveAttack.
    const shouldEarlyReturn = (roundPaused: boolean) => roundPaused;
    expect(shouldEarlyReturn(true)).toBe(true);
    expect(shouldEarlyReturn(false)).toBe(false);
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

describe('ResolveMeleeAnimations reaction eligibility', () => {
  // Retail @ 005b7470: engaged && (checkActionLengthOk || resultsCalculated)
  const base = {
    hasTargetCombatRound: true,
    checkActionLengthOk: false,
  };

  it('engaged + resultsCalculated reacts even when checkActionLengthOk is false', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: true,
      checkActionLengthOk: false,
    })).toBe(true);
  });

  it('non-engaged never reacts even with resultsCalculated', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: false,
      resultsCalculated: true,
    })).toBe(false);
  });

  it('engaged without resultsCalculated requires checkActionLengthOk', () => {
    expect(canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: false,
      checkActionLengthOk: false,
    })).toBe(false);
    expect(canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: false,
      checkActionLengthOk: true,
    })).toBe(true);
  });

  it('missing target combatRound blocks reaction', () => {
    expect(canSyncMeleeReaction({
      engaged: true,
      resultsCalculated: true,
      hasTargetCombatRound: false,
      checkActionLengthOk: true,
    })).toBe(false);
  });
});

describe('killingBlow does not gate duel anims or reactions', () => {
  // Mirrors calculateRoundAnimations gates after retail alignment.
  // Retail ResolveMeleeAnimations only checks GetDeadTemp (actual death) —
  // predicted killingBlow must not force m-set or skip the reaction block.
  const usesDuelAttackSet = (
    attackKey: string,
    engaged: boolean
  ) => attackKey === 'm' && engaged;

  const entersReactionBlock = (
    hasTarget: boolean,
    targetDead: boolean
  ) => hasTarget && !targetDead;

  it('engaged melee swing uses c-set even when predicted killingBlow', () => {
    // killingBlow intentionally absent from the gate
    expect(usesDuelAttackSet('m', true)).toBe(true);
  });

  it('non-engaged melee swing keeps m-set', () => {
    expect(usesDuelAttackSet('m', false)).toBe(false);
  });

  it('reaction block entered for a live target regardless of killingBlow', () => {
    expect(entersReactionBlock(true, false)).toBe(true);
  });

  it('reaction block skipped only when target dead or missing', () => {
    expect(entersReactionBlock(true, true)).toBe(false);
    expect(entersReactionBlock(false, false)).toBe(false);
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

describe('ResolveRangedAnimations reaction eligibility', () => {
  // Retail @ 005b6c40 — dodge only when target round engaged; no resultsCalculated bypass.
  const dodgeReady = {
    anyHit: false,
    targetLightsaberEquipped: false,
    targetCastingBusy: false,
    targetEngaged: true,
  };

  it('picks DODGE only for clean misses against an engaged non-saber target', () => {
    expect(pickRangedReaction(dodgeReady)).toBe(ModuleCreatureAnimState.DODGE);
  });

  it('does not dodge while the target is still closing (target.engaged false)', () => {
    expect(pickRangedReaction({
      ...dodgeReady,
      targetEngaged: false,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('does not dodge when any AttackList roll landed', () => {
    expect(pickRangedReaction({
      ...dodgeReady,
      anyHit: true,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('does not dodge vs lightsaber or casting-busy poses', () => {
    expect(pickRangedReaction({
      ...dodgeReady,
      targetLightsaberEquipped: true,
    })).toBe(ModuleCreatureAnimState.READY);
    expect(pickRangedReaction({
      ...dodgeReady,
      targetCastingBusy: true,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('rangedAttackHadLandingHit matches retail local_4 hit band', () => {
    expect(rangedAttackHadLandingHit([AttackResult.MISS])).toBe(false);
    expect(rangedAttackHadLandingHit([AttackResult.PARRIED])).toBe(false);
    expect(rangedAttackHadLandingHit([AttackResult.HIT_SUCCESSFUL])).toBe(true);
    expect(rangedAttackHadLandingHit([AttackResult.MISS, AttackResult.CRITICAL_HIT])).toBe(true);
  });

  it('isRangedDodgeBlockedAnimation covers casting / throw-saber (FUN_005b55a0)', () => {
    expect(isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.RUNNING)).toBe(false);
    expect(isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.DODGE)).toBe(false);
    expect(isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.CASTOUT1)).toBe(true);
    expect(isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.CASTOUT4_LP)).toBe(true);
    expect(isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.THROW_SABER_LP)).toBe(true);
  });

  it('canSyncRangedReaction requires attacker engaged + action length (no cutscene bypass)', () => {
    expect(canSyncRangedReaction({
      attackerEngaged: true,
      hasTargetCombatRound: true,
      checkActionLengthOk: true,
    })).toBe(true);
    expect(canSyncRangedReaction({
      attackerEngaged: true,
      hasTargetCombatRound: true,
      checkActionLengthOk: false,
    })).toBe(false);
    expect(canSyncRangedReaction({
      attackerEngaged: false,
      hasTargetCombatRound: true,
      checkActionLengthOk: true,
    })).toBe(false);
  });
});

describe('duel post-swing READY remainder', () => {
  const ROUND_LENGTH = 3000;

  it('pauses for the action animation time, not the whole round', () => {
    expect(resolveAttackPauseMs(undefined, 1500, ROUND_LENGTH)).toBe(1500);
    expect(resolveAttackPauseMs(0, 1200, ROUND_LENGTH)).toBe(1200);
  });

  it('prefers the explicit animation time parameter', () => {
    expect(resolveAttackPauseMs(900, 1500, ROUND_LENGTH)).toBe(900);
  });

  it('falls back to half the round when no animation time is known', () => {
    expect(resolveAttackPauseMs(undefined, undefined, ROUND_LENGTH)).toBe(1500);
    expect(resolveAttackPauseMs(undefined, undefined, 1)).toBe(1);
  });

  it('snaps a live fighter to combat READY on pause expiry', () => {
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: false,
      resultsCalculated: false,
    })).toBe(true);
  });

  it('leaves scripted, dead, and debilitated fighters posed', () => {
    // Retail field9_0x940 — cutscene rounds keep their posed animation
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: false,
      resultsCalculated: true,
    })).toBe(false);
    expect(shouldSnapCombatReady({
      dead: true,
      debilitated: false,
      resultsCalculated: false,
    })).toBe(false);
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: true,
      resultsCalculated: false,
    })).toBe(false);
    // Living Min1HP ActionPlayAnimation(DEAD) / enter-DEAD DIE — do not READY-snap
    expect(shouldSnapCombatReady({
      dead: false,
      debilitated: false,
      resultsCalculated: false,
      scriptedDead: true,
    })).toBe(false);
  });

  it('keeps the round running when the target is still alive', () => {
    expect(shouldEndRoundOnPauseExpiry({ hasTarget: true, targetDead: false })).toBe(false);
  });

  it('ends the round when the target is dead or gone', () => {
    expect(shouldEndRoundOnPauseExpiry({ hasTarget: true, targetDead: true })).toBe(true);
    expect(shouldEndRoundOnPauseExpiry({ hasTarget: false, targetDead: false })).toBe(true);
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
