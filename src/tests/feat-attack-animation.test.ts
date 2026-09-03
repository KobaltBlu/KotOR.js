/**
 * Live melee combat feats must use GetClientMeleeAnimation-style f*aN names.
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/GameState', () => ({
  GameState: {
    TwoDAManager: { datatables: { get: () => undefined } },
  },
}));

jest.mock('@/odyssey', () => ({
  OdysseyModelAnimation: {
    GetAnimation2DA: (name: string) => ({ name }),
  },
}));

jest.mock('@/utility/BitWise', () => ({
  BitWise: {
    InstanceOfObject: (obj: unknown) => !!obj,
  },
}));

import { CombatRoundAction } from '@/combat/CombatRoundAction';
import { CombatFeatType } from '@/enums/combat/CombatFeatType';

function makeAction(featId?: number) {
  const owner = {
    getCombatAnimationAttackType: () => 'm',
    getCombatAnimationWeaponType: () => 1,
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
});
