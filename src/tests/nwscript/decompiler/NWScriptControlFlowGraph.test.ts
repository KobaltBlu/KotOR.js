import { describe, expect, test } from '@jest/globals';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import { OP_CONST, OP_JMP, OP_JSR, OP_JZ, OP_RETN } from '@/nwscript/NWScriptOPCodes';
import { NWScriptControlFlowGraph } from '@/nwscript/decompiler/NWScriptControlFlowGraph';

function makeInstruction(
  code: number,
  address: number,
  instructionSize: number,
  offset?: number
): NWScriptInstruction {
  const instruction = {
    code,
    type: 0,
    address,
    instructionSize,
    codeName: `OP_${code}`,
  } as NWScriptInstruction;
  if (offset !== undefined) instruction.offset = offset;
  return instruction;
}

function scriptWithSubroutineLoop(): NWScript {
  const instructions = [
    makeInstruction(OP_JSR, 0, 6, 20),
    makeInstruction(OP_RETN, 6, 2),
    makeInstruction(OP_CONST, 20, 6),
    makeInstruction(OP_JZ, 26, 6, 12),
    makeInstruction(OP_JMP, 32, 6, 0xfffffff4),
    makeInstruction(OP_RETN, 38, 2),
  ];
  instructions[2].integer = 1;

  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }

  return {
    instructions: new Map(instructions.map(instruction => [instruction.address, instruction])),
  } as NWScript;
}

describe('NWScriptControlFlowGraph procedure boundaries', () => {
  test('CALL edges do not contaminate callee dominators or natural loops', () => {
    const graph = new NWScriptControlFlowGraph(scriptWithSubroutineLoop());
    graph.build();

    const caller = graph.getBlockForAddress(0)!;
    const continuation = graph.getBlockForAddress(6)!;
    const loopHeader = graph.getBlockForAddress(20)!;
    const loopLatch = graph.getBlockForAddress(32)!;

    expect(graph.getIntraProceduralPredecessors(loopHeader)).toEqual([loopLatch]);
    expect(loopHeader.dominators).toEqual(new Set([loopHeader]));
    expect(graph.dominates(loopHeader, loopLatch)).toBe(true);
    expect(graph.getNaturalLoop(loopHeader)).toEqual(new Set([loopHeader, loopLatch]));
    expect(graph.getNaturalLoop(loopHeader).has(caller)).toBe(false);

    expect(continuation.dominators.has(caller)).toBe(true);
    expect(caller.postDominators.has(continuation)).toBe(true);
    expect(caller.postDominators.has(loopHeader)).toBe(false);
  });

  test('does not invent post-dominators for a procedure with no exit', () => {
    const jump = makeInstruction(OP_JMP, 0, 6, 0);
    const graph = new NWScriptControlFlowGraph({
      instructions: new Map([[0, jump]]),
    } as NWScript);

    graph.build();

    const block = graph.getBlockForAddress(0)!;
    expect(block.postDominators).toEqual(new Set([block]));
    expect(graph.getNaturalLoop(block)).toEqual(new Set([block]));
  });
});
