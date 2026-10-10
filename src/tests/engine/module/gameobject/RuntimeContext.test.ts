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
});
