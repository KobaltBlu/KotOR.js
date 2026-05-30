import { describe, expect, it } from '@jest/globals';
import { OP_ACTION, OP_CONST, OP_T } from '@/nwscript/NWScriptOPCodes';

/**
 * Opcode values follow the shared NCS/NWScript layout (see NWScriptOPCodes.ts).
 * ACTION must not collide with CONST; program marker OP_T stays at file offset 8.
 */
describe('NWScriptOPCodes', () => {
  it('uses 0x04 for CONST and 0x05 for ACTION', () => {
    expect(OP_CONST).toBe(0x04);
    expect(OP_ACTION).toBe(0x05);
    expect(OP_CONST).not.toBe(OP_ACTION);
  });

  it('uses 0x42 for the NCS program-size sentinel (OP_T)', () => {
    expect(OP_T).toBe(0x42);
  });
});
