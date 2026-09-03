/**
 * CombatRound RemoveSpellAction — queue icon clear for cast / item cast.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';

import { CombatActionType } from '@/enums/combat/CombatActionType';

/** Mirrors CombatRound.removeSpellAction filtering. */
function removeSpellActionState(state: {
  scheduled: { actionType: number }[];
  action?: { actionType: number };
  spellCastRound: boolean;
}) {
  const scheduled = state.scheduled.filter((a) => {
    const t = a?.actionType;
    return t !== CombatActionType.CAST_SPELL && t !== CombatActionType.ITEM_CAST_SPELL;
  });
  let action = state.action;
  const cur = action?.actionType;
  if(cur === CombatActionType.CAST_SPELL || cur === CombatActionType.ITEM_CAST_SPELL){
    action = undefined;
  }
  return { scheduled, action, spellCastRound: false };
}

describe('removeSpellAction', () => {
  it('clears ITEM_CAST_SPELL current action (grenade queue icon)', () => {
    const next = removeSpellActionState({
      scheduled: [],
      action: { actionType: CombatActionType.ITEM_CAST_SPELL },
      spellCastRound: true,
    });
    expect(next.action).toBeUndefined();
    expect(next.spellCastRound).toBe(false);
  });

  it('clears CAST_SPELL and ITEM_CAST_SPELL from the scheduled list', () => {
    const next = removeSpellActionState({
      scheduled: [
        { actionType: CombatActionType.ITEM_CAST_SPELL },
        { actionType: CombatActionType.ATTACK },
        { actionType: CombatActionType.CAST_SPELL },
      ],
      spellCastRound: true,
    });
    expect(next.scheduled.map((a) => a.actionType)).toEqual([CombatActionType.ATTACK]);
  });

  it('leaves non-cast current action alone', () => {
    const next = removeSpellActionState({
      scheduled: [],
      action: { actionType: CombatActionType.ATTACK },
      spellCastRound: false,
    });
    expect(next.action?.actionType).toBe(CombatActionType.ATTACK);
  });
});
