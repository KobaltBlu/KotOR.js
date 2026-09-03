import { describe, expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { INWScriptDefAction } from '@/interface/nwscript/INWScriptDefAction';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import {
  OP_ACTION,
  OP_CONST,
  OP_CPDOWNSP,
  OP_CPTOPBP,
  OP_CPTOPSP,
  OP_INCISP,
  OP_JMP,
  OP_JSR,
  OP_JZ,
  OP_MOVSP,
  OP_RETN,
  OP_RSADD,
} from '@/nwscript/NWScriptOPCodes';
import { NWScriptDecompiler } from '@/nwscript/decompiler/NWScriptDecompiler';

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

describe('NWScriptDecompiler integration', () => {
  test('runs the complete pipeline and preserves engine call argument order', () => {
    const printPair: INWScriptDefAction = {
      name: 'PrintPair',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.INTEGER, NWScriptDataType.STRING],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 20 }),
      instruction(OP_RETN, 0, 6, 2),
      // Reverse-order argument pushes leave the first formal argument at TOS.
      instruction(OP_CONST, NWScriptDataType.STRING, 20, 7, { string: 'ok' }),
      instruction(OP_CONST, NWScriptDataType.INTEGER, 27, 6, { integer: 7 }),
      instruction(OP_ACTION, 0, 33, 5, {
        action: 900,
        argCount: 2,
        actionDefinition: printPair,
      }),
      instruction(OP_RETN, 0, 38, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('void main()');
    expect(source).toContain('PrintPair(7, "ok");');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('keeps mutually exclusive branch evaluation isolated through the AST pipeline', () => {
    const printText: INWScriptDefAction = {
      name: 'PrintText',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.STRING],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 20 }),
      instruction(OP_RETN, 0, 6, 2),
      instruction(OP_CONST, NWScriptDataType.INTEGER, 20, 6, { integer: 1 }),
      instruction(OP_JZ, 0, 26, 6, { offset: 24 }),
      instruction(OP_CONST, NWScriptDataType.STRING, 32, 7, { string: 'yes' }),
      instruction(OP_ACTION, 0, 39, 5, {
        action: 901,
        argCount: 1,
        actionDefinition: printText,
      }),
      instruction(OP_JMP, 0, 44, 6, { offset: 17 }),
      instruction(OP_CONST, NWScriptDataType.STRING, 50, 6, { string: 'no' }),
      instruction(OP_ACTION, 0, 56, 5, {
        action: 901,
        argCount: 1,
        actionDefinition: printText,
      }),
      instruction(OP_RETN, 0, 61, 2),
    ]);

    const decompiler = new NWScriptDecompiler(script);
    const source = decompiler.decompile();

    expect(source).toContain('if (1)');
    expect(source).toContain('PrintText("yes");');
    expect(source).toContain('PrintText("no");');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
    expect(
      decompiler.getControlFlowGraph()?.getBlockForAddress(50)?.instructions.map(value => value.address)
    ).toEqual([50, 56]);
  });

  test('models a typed user-function frame through return and argument cleanup', () => {
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 100 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_RSADD, NWScriptDataType.FLOAT, 100, 2),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 102, 6, { float: 7 }),
      instruction(OP_JSR, 0, 108, 6, { offset: 92 }),
      instruction(OP_MOVSP, 0, 114, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 120, 2),

      instruction(OP_CPTOPBP, 1, 200, 8, { offset: -4, size: 4 }),
      instruction(OP_CPDOWNSP, 1, 208, 8, { offset: -12, size: 4 }),
      instruction(OP_MOVSP, 0, 216, 6, { offset: -4 }),
      instruction(OP_MOVSP, 0, 222, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 228, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('float sub1(float floatParam1)');
    expect(source).toContain('return floatParam1;');
    expect(source).toContain('sub1(7.0f);');
    expect(source).not.toContain('// Error during decompilation:');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('keeps multi-parameter user calls and callee frame reads in formal order', () => {
    const printPair: INWScriptDefAction = {
      name: 'PrintPair',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.INTEGER, NWScriptDataType.STRING],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 100 }),
      instruction(OP_RETN, 0, 6, 2),

      // Caller pushes the second formal first, leaving formal one at TOS.
      instruction(OP_CONST, NWScriptDataType.STRING, 100, 7, { string: 'ok' }),
      instruction(OP_CONST, NWScriptDataType.INTEGER, 107, 6, { integer: 7 }),
      instruction(OP_JSR, 0, 113, 6, { offset: 87 }),
      instruction(OP_RETN, 0, 119, 2),

      // Both reads use -8 because the first copy changes SP. Their frame positions differ.
      instruction(OP_CPTOPSP, 1, 200, 8, { offset: -8, size: 4 }),
      instruction(OP_CPTOPSP, 1, 208, 8, { offset: -8, size: 4 }),
      instruction(OP_ACTION, 0, 216, 5, {
        action: 903,
        argCount: 2,
        actionDefinition: printPair,
      }),
      instruction(OP_MOVSP, 0, 221, 6, { offset: -8 }),
      instruction(OP_RETN, 0, 227, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('void sub1(int intParam1, string stringParam2)');
    expect(source).toContain('PrintPair(intParam1, stringParam2);');
    expect(source).toContain('sub1(7, "ok");');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('normalizes changing CPTOPSP operands for mixed-width user parameters', () => {
    const printVectorInt: INWScriptDefAction = {
      name: 'PrintVectorInt',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.VECTOR, NWScriptDataType.INTEGER],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 100 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_CONST, NWScriptDataType.INTEGER, 100, 6, { integer: 9 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 106, 6, { float: 1 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 112, 6, { float: 2 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 118, 6, { float: 3 }),
      instruction(OP_JSR, 0, 124, 6, { offset: 76 }),
      instruction(OP_RETN, 0, 130, 2),

      instruction(OP_CPTOPSP, 1, 200, 8, { offset: -16, size: 4 }),
      instruction(OP_CPTOPSP, 1, 208, 8, { offset: -16, size: 12 }),
      instruction(OP_ACTION, 0, 216, 5, {
        action: 904,
        argCount: 2,
        actionDefinition: printVectorInt,
      }),
      instruction(OP_MOVSP, 0, 221, 6, { offset: -16 }),
      instruction(OP_RETN, 0, 227, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('void sub1(vector vectorParam1, int intParam2)');
    expect(source).toContain('PrintVectorInt(vectorParam1, intParam2);');
    expect(source).toContain('sub1(Vector(1.0f, 2.0f, 3.0f), 9);');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('preserves a three-slot vector return across caller and callee frames', () => {
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 100 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_RSADD, NWScriptDataType.FLOAT, 100, 2),
      instruction(OP_RSADD, NWScriptDataType.FLOAT, 102, 2),
      instruction(OP_RSADD, NWScriptDataType.FLOAT, 104, 2),
      instruction(OP_JSR, 0, 106, 6, { offset: 94 }),
      instruction(OP_MOVSP, 0, 112, 6, { offset: -12 }),
      instruction(OP_RETN, 0, 118, 2),

      instruction(OP_CONST, NWScriptDataType.FLOAT, 200, 6, { float: 1 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 206, 6, { float: 2 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 212, 6, { float: 3 }),
      instruction(OP_CPDOWNSP, 1, 218, 8, { offset: -24, size: 12 }),
      instruction(OP_MOVSP, 0, 226, 6, { offset: -12 }),
      instruction(OP_RETN, 0, 232, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('vector sub1()');
    expect(source).toContain('return Vector(1.0f, 2.0f, 3.0f);');
    expect(source).toContain('sub1();');
    expect(source).not.toContain('// Error during decompilation:');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('emits a literal local initializer once and resolves its later stack read', () => {
    const printInt: INWScriptDefAction = {
      name: 'PrintInt',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.INTEGER],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 20 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_RSADD, NWScriptDataType.INTEGER, 20, 2),
      instruction(OP_CONST, NWScriptDataType.INTEGER, 22, 6, { integer: 5 }),
      instruction(OP_CPDOWNSP, 1, 28, 8, { offset: -8, size: 4 }),
      instruction(OP_MOVSP, 0, 36, 6, { offset: -4 }),
      instruction(OP_CPTOPSP, 1, 42, 8, { offset: -4, size: 4 }),
      instruction(OP_ACTION, 0, 50, 5, {
        action: 902,
        argCount: 1,
        actionDefinition: printInt,
      }),
      instruction(OP_MOVSP, 0, 55, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 61, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('int localVar_0 = 5;');
    expect(source).toContain('PrintInt(localVar_0);');
    expect(source.match(/localVar_0 = 5/g)).toHaveLength(1);
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });

  test('recovers an O3 mutable CONST stack slot as a declared local', () => {
    const printInt: INWScriptDefAction = {
      name: 'PrintInt',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.INTEGER],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 20 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_CONST, NWScriptDataType.INTEGER, 20, 6, { integer: 0 }),
      instruction(OP_CPTOPSP, 1, 26, 8, { offset: -4, size: 4 }),
      instruction(OP_INCISP, NWScriptDataType.INTEGER, 34, 6, { offset: -8 }),
      instruction(OP_MOVSP, 0, 40, 6, { offset: -4 }),
      instruction(OP_CPTOPSP, 1, 46, 8, { offset: -4, size: 4 }),
      instruction(OP_ACTION, 0, 54, 5, {
        action: 906,
        argCount: 1,
        actionDefinition: printInt,
      }),
      instruction(OP_MOVSP, 0, 59, 6, { offset: -4 }),
      instruction(OP_RETN, 0, 65, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('int localVar_0 = 0;');
    expect(source).toContain('localVar_0++;');
    expect(source).toContain('PrintInt(localVar_0);');
    expect(source).not.toContain('sp_-');
  });

  test('groups three RSADDF slots into one vector local when 12-byte accesses prove it', () => {
    const printVector: INWScriptDefAction = {
      name: 'PrintVector',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.VECTOR],
    };
    const script = linkedScript([
      instruction(OP_JSR, 0, 0, 6, { offset: 20 }),
      instruction(OP_RETN, 0, 6, 2),

      instruction(OP_RSADD, NWScriptDataType.FLOAT, 20, 2),
      instruction(OP_RSADD, NWScriptDataType.FLOAT, 22, 2),
      instruction(OP_RSADD, NWScriptDataType.FLOAT, 24, 2),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 26, 6, { float: 1 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 32, 6, { float: 2 }),
      instruction(OP_CONST, NWScriptDataType.FLOAT, 38, 6, { float: 3 }),
      instruction(OP_CPDOWNSP, 1, 44, 8, { offset: -24, size: 12 }),
      instruction(OP_MOVSP, 0, 52, 6, { offset: -12 }),
      instruction(OP_CPTOPSP, 1, 58, 8, { offset: -12, size: 12 }),
      instruction(OP_ACTION, 0, 66, 5, {
        action: 905,
        argCount: 1,
        actionDefinition: printVector,
      }),
      instruction(OP_MOVSP, 0, 71, 6, { offset: -12 }),
      instruction(OP_RETN, 0, 77, 2),
    ]);

    const source = new NWScriptDecompiler(script).decompile();

    expect(source).toContain('vector localVar_0;');
    expect(source).toContain('localVar_0 = Vector(1.0f, 2.0f, 3.0f);');
    expect(source).toContain('PrintVector(localVar_0);');
    expect(source).not.toContain('localVar_1');
    expect(source).not.toContain('localVar_2');
    expect(source).not.toContain('__NCS_DECOMPILER_UNKNOWN_VALUE__');
  });
});
