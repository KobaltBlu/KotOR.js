/**
 * Lightweight CreaturePerceptionService unit coverage.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { CreaturePerceptionService } from '@engine/module/creature/CreaturePerceptionService';
import { PerceptionMask } from '@engine/enums/engine/PerceptionMask';
import { createTestRuntimeContext } from '@engine/runtime/context';

function makeHost(overrides: Record<string, unknown> = {}) {
  return {
    perceptionList: [] as Array<{ object?: unknown; objectId?: number; data: number }>,
    ...overrides,
  };
}

describe('CreaturePerceptionService', () => {
  it('hasSeenObject treats self as seen and checks perceptionList SEEN bit', () => {
    const host = makeHost();
    const service = new CreaturePerceptionService(host as any, createTestRuntimeContext());
    const other = { id: 42 };

    expect(service.hasSeenObject(host as any)).toBe(true);
    expect(service.hasSeenObject(other as any)).toBe(false);

    host.perceptionList.push({ object: other, objectId: 42, data: PerceptionMask.HEARD });
    expect(service.hasSeenObject(other as any)).toBe(false);

    host.perceptionList[0].data = PerceptionMask.SEEN;
    expect(service.hasSeenObject(other as any)).toBe(true);
  });

  it('updatePerceptionList returns early when the host is dead', () => {
    const host = makeHost({
      isDead: () => true,
      perceptionTimer: 0,
    });
    const service = new CreaturePerceptionService(host as any, createTestRuntimeContext({
      isReadyToProcessEvents: () => true,
    }));

    expect(service.updatePerceptionList(1)).toBe(true);
    expect(host.perceptionTimer).toBe(0);
  });
});
