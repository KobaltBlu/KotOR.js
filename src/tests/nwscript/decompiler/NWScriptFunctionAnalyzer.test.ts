import { describe, expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import {
  OP_CONST,
  OP_CPDOWNSP,
  OP_CPTOPBP,
  OP_JSR,
  OP_MOVSP,
  OP_RETN,
  OP_RSADD,
} from '@/nwscript/NWScriptOPCodes';
import { NWScriptControlFlowGraph } from '@/nwscript/decompiler/NWScriptControlFlowGraph';
import { NWScriptFunctionAnalyzer } from '@/nwscript/decompiler/NWScriptFunctionAnalyzer';

function instruction(
  code: number,
  type: number,
  address: number,
  instructionSize: number,
  fields: Partial<NWScriptInstruction> = {}
): NWScriptInstruction {
  return {
    code,
    type,
    address,
    instructionSize,
    codeName: `OP_${code}`,
    ...fields,
  } as NWScriptInstruction;
}

function linkedScript(instructions: NWScriptInstruction[]): NWScript {
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  return {
    instructions: new Map(instructions.map(value => [value.address, value])),
  } as NWScript;
}

describe('NWScriptFunctionAnalyzer signatures', () => {
  test('requires matching callee return writes and caller reservations', () => {
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 100 }),
      instruction(OP_RETN, 0, 6, 2),

      // main: reserve float result, push one float argument, call subroutine, discard result.
      instruction(OP_RSADD, NWScriptDataType.FLOAT, 100, 2),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 102, 6, { float: 7 }),
      instruction(OP_JSR, 0, 108, 6, { offset: 92 }),
      instruction(OP_MOVSP, 0, 114, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 120, 2),

      // CPTOPBP's generic type byte does not identify the scalar source type.
      instruction(OP_CPTOPBP, 1, 200, 8, { offset: -4, size: 4 }),
      instruction(OP_CPDOWNSP, 1, 208, 8, { offset: -12, size: 4 }),
      instruction(OP_MOVSP, 0, 216, 6, { offset: -4 }),
      instruction(OP_MOVSP, 0, 222, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 228, 2),
    ]);
    const graph = new NWScriptControlFlowGraph(script);
    graph.build();

    const functions = new NWScriptFunctionAnalyzer(graph).analyze();
    const subroutine = functions.find(func => func.entryBlock.startInstruction.address === 200);

    expect(subroutine?.parameters).toHaveLength(1);
    expect(subroutine?.parameters[0].dataType).toBe(NWScriptDataType.FLOAT);
    expect(subroutine?.returnType).toBe(NWScriptDataType.FLOAT);
  });
});
