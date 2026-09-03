import { describe, expect, test } from "@jest/globals";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { OP_ACTION, OP_ADD, OP_CONST, OP_CPTOPSP, OP_DESTRUCT, OP_JSR, OP_MOVSP, OP_MUL, OP_RSADD } from "@/nwscript/NWScriptOPCodes";
import {
  inferSubroutineCallAbiFromCallSites,
  inferSubroutineReturnTypeFromCallSites,
  instructionForwardStackSlotDelta,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  actionArgumentStackSlots,
  getBinaryResultDataType,
  stackSlotsForByteSize,
  stackSlotsForDataType,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import { NWScriptStackSimulator } from "@/nwscript/decompiler/NWScriptStackSimulator";
import { NWScriptAST } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { refineNwscriptAstFunctionParameterTypes } from "@/nwscript/decompiler/NWScriptDecompilerTypeRefinementPass";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";

describe('canonical NCS opcode semantics', () => {
  test('tracks physical widths for scalar, vector, void, and action values', () => {
    expect(stackSlotsForDataType(NWScriptDataType.INTEGER)).toBe(1);
    expect(stackSlotsForDataType(NWScriptDataType.VECTOR)).toBe(3);
    expect(stackSlotsForDataType(NWScriptDataType.VOID)).toBe(0);
    expect(stackSlotsForDataType(NWScriptDataType.ACTION)).toBe(0);
    expect(() => stackSlotsForByteSize(undefined, 'DESTRUCT')).toThrow('missing');
    expect(() => stackSlotsForByteSize(6, 'CPTOP')).toThrow('four-byte-aligned');
  });

  test('decodes mixed and vector arithmetic result types', () => {
    expect(getBinaryResultDataType(0x20)).toBe(NWScriptDataType.INTEGER);
    expect(getBinaryResultDataType(0x21)).toBe(NWScriptDataType.FLOAT);
    expect(getBinaryResultDataType(0x25)).toBe(NWScriptDataType.FLOAT);
    expect(getBinaryResultDataType(0x26)).toBe(NWScriptDataType.FLOAT);
    expect(getBinaryResultDataType(0x3a)).toBe(NWScriptDataType.VECTOR);
    expect(getBinaryResultDataType(0x3b)).toBe(NWScriptDataType.VECTOR);
    expect(getBinaryResultDataType(0x3c)).toBe(NWScriptDataType.VECTOR);
  });

  test('counts action argument slots from the signature rather than argCount alone', () => {
    const action: INWScriptDefAction = {
      name: 'VectorAndInt',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.VECTOR, NWScriptDataType.INTEGER],
    };
    expect(actionArgumentStackSlots(action, 2)).toBe(4);
    expect(actionArgumentStackSlots(action, 3)).toBeNull();
  });

  test('computes width-aware instruction stack deltas', () => {
    const vectorAction: INWScriptDefAction = {
      name: 'VectorIdentity',
      comment: '',
      type: NWScriptDataType.VECTOR,
      args: [NWScriptDataType.VECTOR],
    };
    expect(instructionForwardStackSlotDelta({
      code: OP_CPTOPSP,
      size: 12,
    } as NWScriptInstruction)).toBe(3);
    expect(instructionForwardStackSlotDelta({
      code: OP_ACTION,
      argCount: 1,
      actionDefinition: vectorAction,
    } as NWScriptInstruction)).toBe(0);
    expect(instructionForwardStackSlotDelta({
      code: OP_MUL,
      type: 0x3b,
    } as NWScriptInstruction)).toBe(-1);
    expect(instructionForwardStackSlotDelta({
      code: OP_DESTRUCT,
      sizeToDestroy: 12,
      sizeOfElementToSave: 4,
    } as NWScriptInstruction)).toBe(-2);
    expect(instructionForwardStackSlotDelta({
      code: OP_MOVSP,
      offset: 0xfffffffc,
    } as NWScriptInstruction)).toBe(-1);
    expect(instructionForwardStackSlotDelta({
      code: OP_ADD,
      type: 0x22,
    } as NWScriptInstruction)).toBeNull();
  });

  test('normalizes raw unsigned offsets to signed int32', () => {
    expect(toSignedInt32(0xfffffffc)).toBe(-4);
    expect(toSignedInt32(-4)).toBe(-4);
    expect(toSignedInt32(12)).toBe(12);
  });

  test('reports scalar parameter types discovered at typed consumers', () => {
    const simulator = new NWScriptStackSimulator();
    const observations: Array<[string, NWScriptDataType]> = [];
    simulator.setVariableTypeObserver((name, dataType) => observations.push([name, dataType]));
    simulator.initializeFunctionFrame(NWScriptDataType.VOID, [{
      name: 'intParam1',
      dataType: NWScriptDataType.INTEGER,
      offset: -4,
      resolvedViaSpOperand: true,
    }]);
    simulator.processInstruction({
      code: OP_CPTOPSP,
      codeName: 'CPTOPSP',
      address: 0,
      offset: 0xfffffffc,
      size: 4,
    } as NWScriptInstruction);
    simulator.processInstruction({
      code: OP_ACTION,
      codeName: 'ACTION',
      address: 8,
      argCount: 1,
      actionDefinition: {
        name: 'GetIsObjectValid',
        comment: '',
        type: NWScriptDataType.INTEGER,
        args: [NWScriptDataType.OBJECT],
      },
    } as NWScriptInstruction);
    expect(observations).toContainEqual(['intParam1', NWScriptDataType.OBJECT]);
  });

  test('propagates late callee type evidence through forwarded user parameters', () => {
    const callerParameter = { name: 'intParam1', dataType: NWScriptDataType.INTEGER, offset: -4 };
    const calleeParameter = { name: 'intParam1', dataType: NWScriptDataType.OBJECT, offset: -4 };
    const callerBody = NWScriptAST.createBlock([
      NWScriptAST.createExpressionStatement(
        NWScriptExpression.functionCall(
          'sub2',
          [NWScriptExpression.variable('intParam1', NWScriptDataType.INTEGER)],
          NWScriptDataType.VOID
        )
      ),
    ]);
    const calleeBody = NWScriptAST.createBlock([]);
    const caller = NWScriptAST.createFunction(
      'sub1',
      NWScriptDataType.VOID,
      [{ name: 'intParam1', type: NWScriptDataType.INTEGER }],
      callerBody
    );
    const callee = NWScriptAST.createFunction(
      'sub2',
      NWScriptDataType.VOID,
      [{ name: 'intParam1', type: NWScriptDataType.INTEGER }],
      calleeBody
    );
    const ast = NWScriptAST.createProgram([], [caller, callee]);
    const functions = [
      { name: 'sub1', parameters: [callerParameter] },
      { name: 'sub2', parameters: [calleeParameter] },
    ] as NWScriptFunction[];

    refineNwscriptAstFunctionParameterTypes(ast, functions);

    expect(caller.parameters[0].type).toBe(NWScriptDataType.OBJECT);
    expect(callee.parameters[0].type).toBe(NWScriptDataType.OBJECT);
    expect(callerParameter.dataType).toBe(NWScriptDataType.OBJECT);
    expect(callerBody.statements[0]).toMatchObject({
      expression: {
        arguments: [{ dataType: NWScriptDataType.OBJECT }],
      },
    });
  });

  test('infers a scalar user-function return reservation below its arguments', () => {
    const reservation = { code: OP_RSADD, type: NWScriptDataType.FLOAT, address: 0 } as NWScriptInstruction;
    const argument = {
      code: OP_CONST,
      type: NWScriptDataType.INTEGER,
      address: 2,
      prevInstr: reservation,
    } as NWScriptInstruction;
    const jsr = {
      code: OP_JSR,
      type: 0,
      address: 8,
      offset: 92,
      prevInstr: argument,
    } as NWScriptInstruction;
    const script = { instructions: new Map([[jsr.address, jsr]]) } as NWScript;

    expect(inferSubroutineReturnTypeFromCallSites(script, 100, 1, 4))
      .toBe(NWScriptDataType.FLOAT);
    expect(inferSubroutineCallAbiFromCallSites(script, 100, 4)).toEqual({
      parameterSlots: 1,
      returnType: NWScriptDataType.FLOAT,
    });

    // Decoders may expose a backward relative operand as its raw unsigned uint32 value.
    jsr.address = 200;
    jsr.offset = 0xffffff9c;
    script.instructions = new Map([[jsr.address, jsr]]);
    expect(inferSubroutineCallAbiFromCallSites(script, 100, 4)).toEqual({
      parameterSlots: 1,
      returnType: NWScriptDataType.FLOAT,
    });
  });

  test('infers a three-slot vector user-function return reservation', () => {
    const reservations = [0, 2, 4].map(address => ({
      code: OP_RSADD,
      type: NWScriptDataType.FLOAT,
      address,
    } as NWScriptInstruction));
    reservations[1].prevInstr = reservations[0];
    reservations[2].prevInstr = reservations[1];
    const jsr = {
      code: OP_JSR,
      type: 0,
      address: 6,
      offset: 94,
      prevInstr: reservations[2],
    } as NWScriptInstruction;
    const script = { instructions: new Map([[jsr.address, jsr]]) } as NWScript;

    expect(inferSubroutineReturnTypeFromCallSites(script, 100, 0, 12))
      .toBe(NWScriptDataType.VECTOR);
  });
});
