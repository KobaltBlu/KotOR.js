import { describe, expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import { OP_CONST, OP_CPDOWNSP, OP_MOVSP, OP_NOP, OP_RSADD } from '@/nwscript/NWScriptOPCodes';
import { NWScriptLocalVariableAnalyzer } from '@/nwscript/decompiler/NWScriptLocalVariableAnalyzer';

function linkedScript(instructions: NWScriptInstruction[]): NWScript {
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  return { instructions: new Map(instructions.map(value => [value.address, value])) } as NWScript;
}

describe('NWScriptLocalVariableAnalyzer', () => {
  test('does not classify a JSR return reservation as a local declaration', () => {
    const reservation = {
      code: OP_RSADD,
      type: NWScriptDataType.FLOAT,
      address: 10,
    } as NWScriptInstruction;
    const analyzer = new NWScriptLocalVariableAnalyzer(
      linkedScript([reservation]),
      [],
      new Set([reservation.address])
    );

    expect(analyzer.analyze()).toEqual([]);
  });

  test('preserves explicit OBJECT_SELF and OBJECT_INVALID initializers', () => {
    const rsadd = { code: OP_RSADD, type: NWScriptDataType.OBJECT, address: 0 } as NWScriptInstruction;
    const constant = {
      code: OP_CONST,
      type: NWScriptDataType.OBJECT,
      object: 0,
      address: 2,
    } as NWScriptInstruction;
    const write = {
      code: OP_CPDOWNSP,
      type: 1,
      offset: -8,
      size: 4,
      address: 8,
    } as NWScriptInstruction;
    const cleanup = {
      code: OP_MOVSP,
      type: 0,
      offset: -4,
      address: 16,
    } as NWScriptInstruction;

    const [init] = new NWScriptLocalVariableAnalyzer(
      linkedScript([rsadd, constant, write, cleanup])
    ).analyze();

    expect(init.hasInitializer).toBe(true);
    expect(init.initialValue).toBe(0);
    expect(init.dataType).toBe(NWScriptDataType.OBJECT);
  });

  test('finds a valid initializer without an arbitrary instruction lookahead cap', () => {
    const rsadd = {
      code: OP_RSADD,
      type: NWScriptDataType.INTEGER,
      address: 0,
    } as NWScriptInstruction;
    const padding = Array.from({ length: 150 }, (_, index) => ({
      code: OP_NOP,
      type: 0,
      address: 2 + index * 2,
    } as NWScriptInstruction));
    const write = {
      code: OP_CPDOWNSP,
      type: 1,
      offset: -8,
      size: 4,
      address: 302,
    } as NWScriptInstruction;
    const cleanup = {
      code: OP_MOVSP,
      type: 0,
      offset: -4,
      address: 310,
    } as NWScriptInstruction;

    const [init] = new NWScriptLocalVariableAnalyzer(
      linkedScript([rsadd, ...padding, write, cleanup])
    ).analyze();

    expect(init.hasInitializer).toBe(true);
    expect(init.initializerWriteAddress).toBe(write.address);
  });
});
