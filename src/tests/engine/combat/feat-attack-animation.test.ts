/**
 * Live melee combat feats must use GetClientMeleeAnimation-style f*aN names.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: { get: () => undefined } },
  },
}));

jest.mock('@engine/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: (name: string) => ({ name }),
  },
}));

jest.mock('@core/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (obj: unknown) => !!obj,
    InstanceOf: () => true,
  },
}));

import { CombatRoundAction } from '@engine/combat/CombatRoundAction';
import { CombatFeatType } from '@core/enums/combat/CombatFeatType';

function makeAction(featId?: number, wield = 1) {
  const owner = {
    getCombatAnimationAttackType: () => 'm',
    getCombatAnimationWeaponType: () => wield,
    isDuelingObject: () => false,
  };
  const action = new CombatRoundAction(owner as any);
  action.target = { id: 2 } as any;
  if(featId != null){
    action.setFeat({ id: featId, icon: 'ipowerattack' } as any);
  }
  return action;
}

describe('CombatRoundAction.calculateAttackAnimation feats', () => {
  beforeEach(() => {
    // no-op
  });

  it('uses f1a3 for Power Attack', () => {
    const action = makeAction(CombatFeatType.POWER_ATTACK);
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('f1a3');
  });

  it('uses f1a2 for Flurry', () => {
    const action = makeAction(CombatFeatType.FLURRY);
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('f1a2');
  });

  it('uses f1a1 for Critical Strike', () => {
    const action = makeAction(CombatFeatType.CRITICAL_STRIKE);
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('f1a1');
  });

  it('uses basic m1a1 without a feat', () => {
    const action = makeAction();
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('m1a1');
  });

  it.each([
    [CombatFeatType.FORCE_JUMP, 2, 'f2a4'],
    [CombatFeatType.FORCE_JUMP_ADVANCED, 3, 'f3a4'],
    [CombatFeatType.FORCE_JUMP_MASTERY, 4, 'f4a4'],
  ])('Force Jump feat %i with wield %i leaps with %s', (featId, wield, name) => {
    // The jump stamps only featId on the round action (no talent object).
    const action = makeAction(undefined, wield);
    action.featId = featId;
    action.calculateAttackAnimation();
    expect(action.animationName).toBe(name);
  });

  it('Force Jump without a lightsaber wield falls back to a basic attack', () => {
    const action = makeAction(undefined, 1);
    action.featId = CombatFeatType.FORCE_JUMP;
    action.calculateAttackAnimation();
    expect(action.animationName).toBe('m1a1');
  });
});
