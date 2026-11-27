/**
 * Runtime context defaults used by isolated GameObject tests.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import {
  createTestRuntimeContext,
  getDefaultRuntimeContext,
  setDefaultRuntimeContext,
} from '@engine/runtime/context';

describe('GameObject runtime context', () => {
  it('provides deterministic effect ids and an in-memory object registry', () => {
    const context = createTestRuntimeContext();
    const object = { id: 17 };

    context.register(object);

    expect(context.getById(17)).toBe(object);
    expect(context.nextEffectId()).toBe(1);
    expect(context.nextEffectId()).toBe(2);
    context.remove(object);
    expect(context.getById(17)).toBeUndefined();
  });

  it('supports replacing and restoring the strangler default', () => {
    const previous = getDefaultRuntimeContext();
    const replacement = createTestRuntimeContext({
      isReadyToProcessEvents: () => true,
    });

    setDefaultRuntimeContext(replacement);
    expect(getDefaultRuntimeContext()).toBe(replacement);
    expect(getDefaultRuntimeContext().isReadyToProcessEvents()).toBe(true);

    setDefaultRuntimeContext(previous);
  });

  it('exposes game key, AI scheduler, rules, save-load, and deserialize helpers', () => {
    const rules = { traps: [] };
    const scheduler = { update: () => undefined };
    const context = createTestRuntimeContext({
      getGameKey: () => 'k2',
      getAiScheduler: () => scheduler,
      getSWRuleSet: () => rules,
      isLoadingSave: () => true,
      actionFromStruct: (struct: any) => ({ kind: 'action', struct }),
      effectFromStruct: (struct: any) => ({ kind: 'effect', struct }),
      getControlledNpcIndex: () => 2,
    });

    expect(context.getGameKey()).toBe('k2');
    expect(context.getAiScheduler()).toBe(scheduler);
    expect(context.getSWRuleSet()).toBe(rules);
    expect(context.getRules()).toBe(rules);
    expect(context.isLoadingSave()).toBe(true);

    const deserialize = context.toDeserializeContext();
    expect(deserialize.gameKey).toBe('k2');
    expect(deserialize.controlledNpcIndex).toBe(2);
    expect(deserialize.actionFromStruct?.({ id: 1 })).toEqual({ kind: 'action', struct: { id: 1 } });
    expect(deserialize.effectFromStruct?.({ id: 2 })).toEqual({ kind: 'effect', struct: { id: 2 } });
  });
});
