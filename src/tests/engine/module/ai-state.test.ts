/**
 * Creature AI-state mask and EffectSetAIState.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));
jest.mock('@engine/module/guards/isCreature', () => ({
  isCreature: (o: unknown) => !!o && (o as { __creature?: boolean }).__creature === true,
}));

import {
  AI_STATE_ALL,
  FORCE_PUSH_RECOVERY_AI_STATE,
  canAttackByAIState,
  canUseForcePowersByAIState,
  isFlatFootedByAIState,
  clearAIStateMask,
} from '@engine/module/creature/ai-state';
import { EffectSetAIState } from '@engine/effects/EffectSetAIState';

function creature(){
  const c: any = { __creature: true, aiStateMask: AI_STATE_ALL, effects: [] as any[] };
  return c;
}

function apply(c: any, mask: number){
  const e = new EffectSetAIState();
  e.setInt(0, mask);
  e.setAttachedObject(c);
  e.onApply();
  c.effects.push(e);
  return e;
}

function remove(c: any, e: EffectSetAIState){
  c.effects.splice(c.effects.indexOf(e), 1);
  e.onRemove();
}

describe('AI-state mask', () => {
  it('a fresh creature can attack, use powers and is not flat-footed', () => {
    const c = creature();
    expect(canAttackByAIState(c)).toBe(true);
    expect(canUseForcePowersByAIState(c)).toBe(true);
    expect(isFlatFootedByAIState(c)).toBe(false);
  });

  it('the Force Push recovery mask blocks attacks and powers and leaves the target flat-footed', () => {
    const c = creature();
    const e = apply(c, FORCE_PUSH_RECOVERY_AI_STATE);
    expect(c.aiStateMask).toBe(0xfea1);
    expect(canAttackByAIState(c)).toBe(false);
    expect(canUseForcePowersByAIState(c)).toBe(false);
    expect(isFlatFootedByAIState(c)).toBe(true);
    remove(c, e);
    expect(c.aiStateMask).toBe(AI_STATE_ALL);
  });

  it('removing one effect keeps the bits other SetAIState effects still clear', () => {
    const c = creature();
    const a = apply(c, 0xfff7);
    const b = apply(c, 0xff7b);
    remove(c, b);
    expect(c.aiStateMask).toBe(0xfff7);
    remove(c, a);
    expect(c.aiStateMask).toBe(AI_STATE_ALL);
  });

  it('a dead (cleared) mask stays cleared when an effect ends', () => {
    const c = creature();
    const e = apply(c, FORCE_PUSH_RECOVERY_AI_STATE);
    clearAIStateMask(c);
    remove(c, e);
    expect(c.aiStateMask).toBe(0);
  });
});
