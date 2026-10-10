/**
 * Lightweight CreatureStatsService unit coverage.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { CreatureStatsService } from '@engine/module/creature/CreatureStatsService';
import { createTestRuntimeContext } from '@engine/runtime/context';

describe('CreatureStatsService', () => {
  it('getSTR / getDEX round-trip raw ability scores when bonuses are skipped', () => {
    const host = {
      str: 14,
      dex: 12,
      equipment: {},
    };
    const service = new CreatureStatsService(host as any, createTestRuntimeContext());

    expect(service.getSTR(false)).toBe(14);
    expect(service.getDEX(false)).toBe(12);

    host.str = 18;
    host.dex = 8;
    expect(service.getSTR(false)).toBe(18);
    expect(service.getDEX(false)).toBe(8);
  });
});
