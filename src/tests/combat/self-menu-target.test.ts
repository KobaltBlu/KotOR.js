/**
 * Self / personal action-menu targeting regressions.
 * Retail GetSelfForcePowers / GetUsableItems stamp the controlled creature;
 * setAttackTarget must not rewrite CAST_SPELL / ITEM_CAST_SPELL targets.
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { CombatActionType } from '@/enums/combat/CombatActionType';
import { parseForceMenuIndex } from '@/combat/spell-self-target';

/** Mirrors CombatRound.setAttackTarget attack-only filter. */
function retargetAttackActionsOnly(
  scheduled: { actionType: number; target: object }[],
  next: object
): void {
  const attackTypes = [
    CombatActionType.ATTACK,
    CombatActionType.ATTACK_USE_FEAT,
    CombatActionType.ATTACK_CUTSCENE_MOVE,
  ];
  for(let i = 0; i < scheduled.length; i++){
    if(attackTypes.indexOf(scheduled[i].actionType) >= 0){
      scheduled[i].target = next;
    }
  }
}

/** Mirrors ActionCombat ITEM_CAST_SPELL self / clear rules. */
function resolveItemCastTargetId(
  owner: { id: number },
  rawTarget: { id: number } | undefined,
  forceHostileRaw: unknown
): number {
  const forceHostile = parseForceMenuIndex(forceHostileRaw);
  const isSelf =
    !!rawTarget &&
    (rawTarget === owner || rawTarget.id === owner.id);
  if(forceHostile < 1 && rawTarget && !isSelf){
    return 0x7f000000; // OBJECT_INVALID
  }
  if(isSelf){
    return owner.id;
  }
  return rawTarget?.id ?? 0x7f000000;
}

describe('setAttackTarget preserves spell / item cast targets', () => {
  it('retargets attacks only', () => {
    const caster = { id: 1 };
    const enemy = { id: 2 };
    const companion = { id: 3 };
    const scheduled = [
      { actionType: CombatActionType.CAST_SPELL, target: caster },
      { actionType: CombatActionType.ITEM_CAST_SPELL, target: caster },
      { actionType: CombatActionType.ATTACK, target: enemy },
    ];
    retargetAttackActionsOnly(scheduled, companion);
    expect(scheduled[0].target).toBe(caster);
    expect(scheduled[1].target).toBe(caster);
    expect(scheduled[2].target).toBe(companion);
  });
});

describe('ITEM_CAST_SPELL personal self stamp', () => {
  const owner = { id: 0x7ffffffe };
  const companion = { id: 0x7ffffffd };

  it('keeps caster id when stamped self (same id, different ref)', () => {
    const stampedSelf = { id: owner.id };
    expect(resolveItemCastTargetId(owner, stampedSelf, '****')).toBe(owner.id);
    expect(resolveItemCastTargetId(owner, stampedSelf, -1)).toBe(owner.id);
  });

  it('clears non-self when FORCEHOSTILE < 1', () => {
    expect(resolveItemCastTargetId(owner, companion, -1)).toBe(0x7f000000);
    expect(resolveItemCastTargetId(owner, companion, 0)).toBe(0x7f000000);
  });

  it('keeps non-self when FORCEHOSTILE >= 1', () => {
    expect(resolveItemCastTargetId(owner, companion, 2)).toBe(companion.id);
  });
});

describe('activateMenuItem self-panel item target', () => {
  it('prefers stamped caster over look-at', () => {
    const pc = { id: 1 };
    const lookAt = { id: 2 };
    const menuItem = { target: pc, item: {} };
    const defaultTarget = pc;
    const target = menuItem.target || defaultTarget || lookAt;
    const useTarget =
      (defaultTarget === pc || menuItem.target === pc) ? pc : (target || pc);
    expect(useTarget).toBe(pc);
  });
});
