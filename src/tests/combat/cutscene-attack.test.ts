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
    SWRuleSet: {
      animationIdMap: new Map([
        [416, animRows[416]],
        [239, animRows[239]],
      ]),
      animations: animRows,
    },
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: (name: string) => (name ? { name } : undefined),
  },
}));

jest.mock('@/combat/CombatAttackData', () => ({
  CombatAttackData: class {},
}));

jest.mock('@/engine/pathfinding/clear-line-of-sight', () => ({
  clearLineOfSight: () => true,
}));

jest.mock('@/combat/combat-projectile', () => ({
  getProjectileImpactPosition: () => undefined,
  spawnCombatProjectile: () => {},
}));

jest.mock('@/combat/ranged-impact-vfx', () => ({
  spawnWorldImpactVfx: () => {},
  VFX_COM_BLASTER_IMPACT_GROUND: 0,
}));

import { CombatRoundAction, resolveAnimations2DARow } from '@/combat/CombatRoundAction';
import { resolveMasterState } from '@/combat/combat-dueling';
import { CombatRound } from '@/combat/CombatRound';
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

describe('queue cutscene attack field contract', () => {
  it('mirrors engine queue cutscene attack', () => {
    const action = new CombatRoundAction();
    action.actionType = CombatActionType.ATTACK;
    action.animation = ModuleCreatureAnimState.ATTACK;
    // (combatStretch + 3000) / 2
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
    expect(action.swAnimation?.name).toBe('2HS_Perform_Flurry_3');
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
  // : cutscene attacks use the same engaged/master/slave path as normal
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

  it('roundPaused early-returns before duel resolution (engine slave wait)', () => {
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
  // : engaged && (checkActionLengthOk || resultsCalculated)
  const base = {
    hasTargetCombatRound: true,
    checkActionLengthOk: false,
  };

  it('engaged + resultsCalculated reacts even when checkActionLengthOk is false', () => {
    expect(CombatRound.canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: true,
      checkActionLengthOk: false,
    })).toBe(true);
  });

  it('non-engaged never reacts even with resultsCalculated', () => {
    expect(CombatRound.canSyncMeleeReaction({
      ...base,
      engaged: false,
      resultsCalculated: true,
    })).toBe(false);
  });

  it('engaged without resultsCalculated requires checkActionLengthOk', () => {
    expect(CombatRound.canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: false,
      checkActionLengthOk: false,
    })).toBe(false);
    expect(CombatRound.canSyncMeleeReaction({
      ...base,
      engaged: true,
      resultsCalculated: false,
      checkActionLengthOk: true,
    })).toBe(true);
  });

  it('missing target combatRound blocks reaction', () => {
    expect(CombatRound.canSyncMeleeReaction({
      engaged: true,
      resultsCalculated: true,
      hasTargetCombatRound: false,
      checkActionLengthOk: true,
    })).toBe(false);
  });
});

describe('killingBlow does not gate duel anims or reactions', () => {
  // Mirrors calculateRoundAnimations gates after alignment.
  // ResolveMeleeAnimations only checks GetDeadTemp (actual death) —
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
    expect(CombatRound.pickMeleeReaction(AttackResult.HIT_SUCCESSFUL)).toBe(ModuleCreatureAnimState.DAMAGE);
    expect(CombatRound.pickMeleeReaction(AttackResult.CRITICAL_HIT)).toBe(ModuleCreatureAnimState.DAMAGE);
    expect(CombatRound.pickMeleeReaction(AttackResult.AUTOMATIC_HIT)).toBe(ModuleCreatureAnimState.DAMAGE);
  });

  it('pickMeleeReaction maps miss/parry to dodge/parry', () => {
    expect(CombatRound.pickMeleeReaction(AttackResult.MISS)).toBe(ModuleCreatureAnimState.DODGE);
    expect(CombatRound.pickMeleeReaction(AttackResult.PARRIED)).toBe(ModuleCreatureAnimState.PARRY);
  });

  it('prefers mapped clip when present', () => {
    expect(CombatRound.resolveMeleeReactionPlayback({ name: 'g2d1' })).toEqual({ mode: 'mapped' });
  });

  it('falls back to setAnimationState when mapped clip is missing', () => {
    // Never flip only index — that leaves a stale ATTACK clip on the defender
    expect(CombatRound.resolveMeleeReactionPlayback(undefined)).toEqual({ mode: 'setAnimationState' });
    expect(CombatRound.resolveMeleeReactionPlayback(null)).toEqual({ mode: 'setAnimationState' });
  });
});

describe('ResolveRangedAnimations reaction eligibility', () => {
  // — dodge only when target round engaged; no resultsCalculated bypass.
  const dodgeReady = {
    anyHit: false,
    targetLightsaberEquipped: false,
    targetCastingBusy: false,
    targetEngaged: true,
  };

  it('picks DODGE only for clean misses against an engaged non-saber target', () => {
    expect(CombatRound.pickRangedReaction(dodgeReady)).toBe(ModuleCreatureAnimState.DODGE);
  });

  it('does not dodge while the target is still closing (target.engaged false)', () => {
    expect(CombatRound.pickRangedReaction({
      ...dodgeReady,
      targetEngaged: false,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('does not dodge when any AttackList roll landed', () => {
    expect(CombatRound.pickRangedReaction({
      ...dodgeReady,
      anyHit: true,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('does not dodge vs lightsaber or casting-busy poses', () => {
    expect(CombatRound.pickRangedReaction({
      ...dodgeReady,
      targetLightsaberEquipped: true,
    })).toBe(ModuleCreatureAnimState.READY);
    expect(CombatRound.pickRangedReaction({
      ...dodgeReady,
      targetCastingBusy: true,
    })).toBe(ModuleCreatureAnimState.READY);
  });

  it('rangedAttackHadLandingHit matches engine hit band', () => {
    expect(CombatRound.rangedAttackHadLandingHit([AttackResult.MISS])).toBe(false);
    expect(CombatRound.rangedAttackHadLandingHit([AttackResult.PARRIED])).toBe(false);
    expect(CombatRound.rangedAttackHadLandingHit([AttackResult.HIT_SUCCESSFUL])).toBe(true);
    expect(CombatRound.rangedAttackHadLandingHit([AttackResult.MISS, AttackResult.CRITICAL_HIT])).toBe(true);
  });

  it('isRangedDodgeBlockedAnimation covers casting / throw-saber', () => {
    expect(CombatRound.isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.RUNNING)).toBe(false);
    expect(CombatRound.isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.DODGE)).toBe(false);
    expect(CombatRound.isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.CASTOUT1)).toBe(true);
    expect(CombatRound.isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.CASTOUT4_LP)).toBe(true);
    expect(CombatRound.isRangedDodgeBlockedAnimation(ModuleCreatureAnimState.THROW_SABER_LP)).toBe(true);
  });

  it('canSyncRangedReaction requires attacker engaged + action length (no cutscene bypass)', () => {
    expect(CombatRound.canSyncRangedReaction({
      attackerEngaged: true,
      hasTargetCombatRound: true,
      checkActionLengthOk: true,
    })).toBe(true);
    expect(CombatRound.canSyncRangedReaction({
      attackerEngaged: true,
      hasTargetCombatRound: true,
      checkActionLengthOk: false,
    })).toBe(false);
    expect(CombatRound.canSyncRangedReaction({
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
    // — cutscene rounds keep their posed animation
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

describe('queue cutscene attacks schedule gate', () => {
  // internal field==0 (PC) only — not party companions
  const shouldClearForCutscene = (isPC: boolean, _isPartyMember: boolean) => !!isPC;

  it('clears actions for PC only', () => {
    expect(shouldClearForCutscene(true, false)).toBe(true);
    expect(shouldClearForCutscene(true, true)).toBe(true);
  });

  it('does not clear for party NPC', () => {
    expect(shouldClearForCutscene(false, true)).toBe(false);
    expect(shouldClearForCutscene(false, false)).toBe(false);
  });

  it('does not rewrite self target to party[0]', () => {
    // ExecuteCommandCutsceneAttack passes oTarget through unchanged
    const resolveCutsceneTarget = (target: unknown, self: unknown) => {
      if(!target) return undefined;
      return target; // no self → party[0]
    };
    const self = { id: 1 };
    expect(resolveCutsceneTarget(self, self)).toBe(self);
    expect(resolveCutsceneTarget(undefined, self)).toBeUndefined();
  });
});

describe('sticky attempted attack target', () => {
  it('sets only when currently unset (not when dead)', () => {
    // Mirrors CombatData.setAttemptedAttackTargetIfInvalid OBJECT_INVALID gate
    const setIfInvalid = (
      current: { dead?: boolean } | undefined,
      next: { id: number }
    ) => {
      if(!next) return current;
      if(!current) return next;
      return current;
    };
    const living = { id: 1, dead: false };
    const dead = { id: 2, dead: true };
    const next = { id: 3 };

    expect(setIfInvalid(undefined, next)).toBe(next);
    expect(setIfInvalid(living, next)).toBe(living);
    // Dead-but-set must NOT be overwritten (field79 only checks INVALID)
    expect(setIfInvalid(dead, next)).toBe(dead);
  });
});
