/**
 * Lightweight CreatureEquipmentService unit coverage.
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@engine/runtime/GameState', () => ({ GameState: {} }));

import { CreatureEquipmentService } from '@engine/module/creature/CreatureEquipmentService';
import { ModuleCreatureArmorSlot } from '@core/enums/module/ModuleCreatureArmorSlot';
import { createTestRuntimeContext } from '@engine/runtime/context';

describe('CreatureEquipmentService', () => {
  it('GetItemInSlot returns equipped items and undefined for empty slots', () => {
    const helmet = { tag: 'g_a_helmet01' };
    const host = {
      equipment: {
        HEAD: helmet,
        ARMOR: undefined,
        ARMS: undefined,
        RIGHTHAND: undefined,
        LEFTHAND: undefined,
        LEFTARMBAND: undefined,
        RIGHTARMBAND: undefined,
        IMPLANT: undefined,
        BELT: undefined,
        CLAW1: undefined,
        CLAW2: undefined,
        CLAW3: undefined,
        HIDE: undefined,
        RIGHTHAND2: undefined,
        LEFTHAND2: undefined,
      },
    };
    const service = new CreatureEquipmentService(host as any, createTestRuntimeContext());

    expect(service.GetItemInSlot(ModuleCreatureArmorSlot.HEAD)).toBe(helmet);
    expect(service.GetItemInSlot(ModuleCreatureArmorSlot.ARMOR)).toBeUndefined();
    expect(service.GetItemInSlot(ModuleCreatureArmorSlot.RIGHTHAND)).toBeUndefined();
  });
});
