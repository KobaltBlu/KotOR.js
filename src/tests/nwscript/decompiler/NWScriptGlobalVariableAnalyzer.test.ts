import { expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import {
  OP_ACTION,
  OP_CONST,
  OP_CPDOWNSP,
  OP_CPTOPSP,
  OP_MOVSP,
  OP_RSADD,
} from '@/nwscript/NWScriptOPCodes';
import { NWScriptGlobalVariableAnalyzer } from '@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer';

test('global analysis preserves explicit object constants', () => {
  const instructions = [
    { code: OP_RSADD, type: NWScriptDataType.OBJECT, address: 0 },
    { code: OP_CONST, type: NWScriptDataType.OBJECT, object: 1, address: 2 },
    { code: OP_CPDOWNSP, type: 1, offset: -8, size: 4, address: 8 },
    { code: OP_MOVSP, type: 0, offset: -4, address: 16 },
  ] as NWScriptInstruction[];
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  const script = {
    instructions: new Map(instructions.map(instruction => [instruction.address, instruction])),
  } as NWScript;

  const [global] = new NWScriptGlobalVariableAnalyzer(script).analyze();

  expect(global.hasInitializer).toBe(true);
  expect(global.initialValue).toBe(1);
  expect(global.dataType).toBe(NWScriptDataType.OBJECT);
  expect(global.offset).toBe(-4);
});

test('global analysis recovers O3 constants left directly on the SAVEBP frame', () => {
  const instructions = [
    { code: OP_CONST, type: NWScriptDataType.INTEGER, integer: 2, address: 0 },
    { code: OP_CONST, type: NWScriptDataType.STRING, string: 'global', address: 6 },
  ] as NWScriptInstruction[];
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  const script = {
    instructions: new Map(instructions.map(instruction => [instruction.address, instruction])),
  } as NWScript;

  const globals = new NWScriptGlobalVariableAnalyzer(script).analyze();

  expect(globals).toMatchObject([
    {
      offset: -8,
      dataType: NWScriptDataType.INTEGER,
      initialValue: 2,
      hasInitializer: true,
    },
    {
      offset: -4,
      dataType: NWScriptDataType.STRING,
      initialValue: 'global',
      hasInitializer: true,
    },
  ]);
});

test('global analysis preserves dynamic initializers and references to earlier globals', () => {
  const instructions = [
    { code: OP_RSADD, type: NWScriptDataType.OBJECT, address: 0 },
    {
      code: OP_ACTION,
      type: 0,
      action: 1,
      argCount: 0,
      actionDefinition: {
        name: 'GetFirstPC',
        comment: '',
        type: NWScriptDataType.OBJECT,
        args: [],
      },
      address: 2,
    },
    { code: OP_CPDOWNSP, type: 1, offset: -8, size: 4, address: 7 },
    { code: OP_MOVSP, type: 0, offset: -4, address: 15 },
    { code: OP_RSADD, type: NWScriptDataType.INTEGER, address: 21 },
    { code: OP_CPTOPSP, type: 1, offset: -8, size: 4, address: 23 },
    {
      code: OP_ACTION,
      type: 0,
      action: 2,
      argCount: 1,
      actionDefinition: {
        name: 'GetIsObjectValid',
        comment: '',
        type: NWScriptDataType.INTEGER,
        args: [NWScriptDataType.OBJECT],
      },
      address: 31,
    },
    { code: OP_CPDOWNSP, type: 1, offset: -8, size: 4, address: 36 },
    { code: OP_MOVSP, type: 0, offset: -4, address: 44 },
  ] as NWScriptInstruction[];
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  const script = {
    instructions: new Map(instructions.map(instruction => [instruction.address, instruction])),
  } as NWScript;

  const analyzer = new NWScriptGlobalVariableAnalyzer(script);
  analyzer.analyze();
  const globals = analyzer.recoverInitializerExpressions();

  expect(globals).toHaveLength(2);
  expect(globals[0].initialExpression?.toNSS()).toBe('GetFirstPC()');
  expect(globals[1].initialExpression?.toNSS()).toBe('GetIsObjectValid(globalVar_0)');
});
