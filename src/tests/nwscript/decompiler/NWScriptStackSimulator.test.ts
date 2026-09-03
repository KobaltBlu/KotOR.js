import { describe, expect, test } from "@jest/globals";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import {
  OP_ACTION,
  OP_ADD,
  OP_BOOLANDII,
  OP_CONST,
  OP_CPTOPSP,
  OP_DESTRUCT,
  OP_JNZ,
  OP_JZ,
  OP_MOVSP,
  OP_RSADD,
} from "@/nwscript/NWScriptOPCodes";
import { NWScriptExpressionBuilder } from "@/nwscript/decompiler/NWScriptExpressionBuilder";
import {
  NWScriptStackAnalysisError,
  NWScriptStackSimulator,
} from "@/nwscript/decompiler/NWScriptStackSimulator";

function instruction(
  code: number,
  type: number = 0,
  values: Partial<NWScriptInstruction> = {}
): NWScriptInstruction {
  return {
    code,
    type,
    address: values.address ?? 0,
    codeName: values.codeName ?? `OP_${code}`,
    ...values,
  } as NWScriptInstruction;
}

function constInt(value: number, address: number = 0): NWScriptInstruction {
  return instruction(OP_CONST, NWScriptDataType.INTEGER, { integer: value, address, codeName: 'CONSTI' });
}

function constFloat(value: number, address: number = 0): NWScriptInstruction {
  return instruction(OP_CONST, NWScriptDataType.FLOAT, { float: value, address, codeName: 'CONSTF' });
}

describe('NWScriptStackSimulator opcode semantics', () => {
  test('MOVSP with a negative offset removes stack values', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(7));

    simulator.processInstruction(instruction(OP_MOVSP, 0, { offset: 0xfffffffc, codeName: 'MOVSP' }));

    expect(simulator.getStackPointer()).toBe(0);
    expect(simulator.getStackSize()).toBe(0);
    expect(simulator.peek()).toBeNull();
  });

  test('seeds a callee frame using return-reservation and reverse-argument layout', () => {
    const simulator = new NWScriptStackSimulator();
    const entrySp = simulator.initializeFunctionFrame(NWScriptDataType.FLOAT, [
      { name: 'nValue', dataType: NWScriptDataType.INTEGER, offset: -4 },
      { name: 'vValue', dataType: NWScriptDataType.VECTOR, offset: -16 },
    ]);

    expect(entrySp).toBe(20);
    expect(simulator.peek()?.expression.toNSS()).toBe('nValue');
    simulator.processInstruction(instruction(OP_MOVSP, 0, { offset: -16, codeName: 'MOVSP' }));
    expect(simulator.getStackPointer()).toBe(4);
    expect(simulator.peek()?.expression.toNSS())
      .toBe('__NCS_DECOMPILER_UNKNOWN_VALUE__ /* caller return-value reservation */');
  });

  test('DESTRUCT preserves a range relative to the bottom of the destroyed region', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(1));
    simulator.processInstruction(constInt(2));
    simulator.processInstruction(constInt(3));

    simulator.processInstruction(instruction(OP_DESTRUCT, 0, {
      codeName: 'DESTRUCT',
      sizeToDestroy: 12,
      offsetToSaveElement: 0,
      sizeOfElementToSave: 4,
    }));

    expect(simulator.getStackPointer()).toBe(4);
    expect(simulator.getStackSlotCount()).toBe(1);
    expect(simulator.peek()?.expression.toNSS()).toBe('1');
  });

  test('CPTOPSP duplicates a represented temporary instead of inventing a variable', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(42));
    simulator.processInstruction(instruction(OP_CPTOPSP, 1, {
      codeName: 'CPTOPSP',
      offset: -4,
      size: 4,
    }));

    const expression = simulator.processInstruction(
      instruction(OP_ADD, 0x20, { codeName: 'ADDII' })
    );
    expect(expression?.toNSS()).toBe('(42 + 42)');
  });

  test.each([OP_JZ, OP_JNZ])('conditional opcode %i consumes its condition', opcode => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(1));

    const condition = simulator.processInstruction(instruction(opcode, 0, { codeName: opcode === OP_JZ ? 'JZ' : 'JNZ' }));

    expect(condition?.toNSS()).toBe('1');
    expect(simulator.getStackPointer()).toBe(0);
    expect(simulator.getStackSize()).toBe(0);
  });

  test('ACTION arguments remain in source order in both recovery APIs', () => {
    const action: INWScriptDefAction = {
      name: 'F',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER],
    };
    const call = instruction(OP_ACTION, 0, {
      codeName: 'ACTION',
      action: 1,
      argCount: 3,
      actionDefinition: action,
    });
    const simulator = new NWScriptStackSimulator();
    const builder = new NWScriptExpressionBuilder();

    // The compiler pushes formal arguments in reverse order, leaving argument one at TOS.
    for (const value of [3, 2, 1]) {
      const constant = constInt(value);
      simulator.processInstruction(constant);
      builder.processInstruction(constant);
    }

    expect(simulator.processInstruction(call)?.toNSS()).toBe('F(1, 2, 3)');
    expect(builder.processInstruction(call)?.toNSS()).toBe('F(1, 2, 3)');
  });

  test('ACTION consumes three physical slots for a vector argument', () => {
    const action: INWScriptDefAction = {
      name: 'PrintVector',
      comment: '',
      type: NWScriptDataType.VOID,
      args: [NWScriptDataType.VECTOR],
    };
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constFloat(1));
    simulator.processInstruction(constFloat(2));
    simulator.processInstruction(constFloat(3));

    const call = simulator.processInstruction(instruction(OP_ACTION, 0, {
      codeName: 'ACTION',
      action: 2,
      argCount: 1,
      actionDefinition: action,
    }));

    expect(call?.toNSS()).toBe('PrintVector(Vector(1.0f, 2.0f, 3.0f))');
    expect(simulator.getStackPointer()).toBe(0);
    expect(simulator.getStackSlotCount()).toBe(0);
  });

  test('keeps an unknown ACTION visible instead of silently dropping the call', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(9));

    const call = simulator.processInstruction(instruction(OP_ACTION, 0, {
      codeName: 'ACTION',
      action: 9999,
      argCount: 1,
    }));

    expect(call?.toNSS()).toBe('__NCS_ACTION_9999__(9)');
    expect(simulator.getStackSlotCount()).toBe(0);
    expect(simulator.getDiagnostics()[0]).toContain('has no signature');
  });

  test('ADDFF produces a float expression', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constFloat(1.5));
    simulator.processInstruction(constFloat(2.5));

    const expression = simulator.processInstruction(instruction(OP_ADD, 0x21, { codeName: 'ADDFF' }));

    expect(expression?.dataType).toBe(NWScriptDataType.FLOAT);
    expect(expression?.toNSS()).toBe('(1.5f + 2.5f)');
  });

  test('keeps BOOLANDII distinct from logical AND', () => {
    const simulator = new NWScriptStackSimulator();
    simulator.processInstruction(constInt(6));
    simulator.processInstruction(constInt(3));

    const expression = simulator.processInstruction(
      instruction(OP_BOOLANDII, 0, { codeName: 'BOOLANDII' })
    );

    expect(expression?.toNSS()).toBe('(6 & 3)');
  });

  test('RSADD uses valid source representations for VM defaults', () => {
    const objectSimulator = new NWScriptStackSimulator();
    objectSimulator.processInstruction(instruction(OP_RSADD, NWScriptDataType.OBJECT, { codeName: 'RSADDO' }));
    expect(objectSimulator.peek()?.expression.toNSS()).toBe('OBJECT_INVALID');

    const effectSimulator = new NWScriptStackSimulator();
    effectSimulator.processInstruction(instruction(OP_RSADD, NWScriptDataType.EFFECT, { codeName: 'RSADDEFFECT' }));
    expect(effectSimulator.peek()?.expression.toNSS())
      .toBe('__NCS_DECOMPILER_UNKNOWN_VALUE__ /* uninitialized EFFECT RSADD value */');
  });

  test('stack underflow is reported instead of fabricating zero operands', () => {
    const simulator = new NWScriptStackSimulator();

    expect(() => simulator.processInstruction(instruction(OP_ADD, 0x20, { codeName: 'ADDII' })))
      .toThrow(NWScriptStackAnalysisError);
  });

  test('merges branch exits by stack shape without retaining the last branch value', () => {
    const simulator = new NWScriptStackSimulator();
    const entry = simulator.takeStackSnapshot();

    simulator.processInstruction(constInt(1));
    const trueExit = simulator.takeStackSnapshot();
    simulator.restoreStackSnapshot(entry);
    simulator.processInstruction(constInt(2));
    const falseExit = simulator.takeStackSnapshot();

    simulator.restoreStackSnapshot(
      simulator.mergeStackSnapshots([trueExit, falseExit], 'if join', entry)
    );

    expect(simulator.peek()?.expression.toNSS())
      .toBe('__NCS_DECOMPILER_UNKNOWN_VALUE__ /* if join: value differs across incoming control-flow edges */');
    expect(simulator.getStackSlotCount()).toBe(1);
  });

  test('uses the entry state when branch exits have incompatible stack shapes', () => {
    const simulator = new NWScriptStackSimulator();
    const entry = simulator.takeStackSnapshot();
    simulator.processInstruction(constInt(1));
    const unbalancedExit = simulator.takeStackSnapshot();

    const merged = simulator.mergeStackSnapshots([entry, unbalancedExit], 'if join', entry);
    simulator.restoreStackSnapshot(merged);

    expect(simulator.getStackSlotCount()).toBe(0);
    expect(simulator.getDiagnostics()).toContain(
      'if join: incoming control-flow edges have incompatible stack shapes'
    );
  });
});
