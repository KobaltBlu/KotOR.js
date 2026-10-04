import { describe, expect, jest, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import { GFFDataType } from '@/enums/resource/GFFDataType';
import { NWScriptStack } from '@/nwscript/NWScriptStack';
import { CALL_ACTION, CALL_STORE_STATE } from '@/nwscript/NWScriptInstructionSet';
import { GameState } from '@/GameState';
import type { NWScriptInstance } from '@/nwscript/NWScriptInstance';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';

// Keep engine startup/rendering out of these VM and real GFF-structure tests.
jest.mock('@/GameState', () => ({
  GameState: { ModuleObjectManager: { GetObjectById: jest.fn() } },
}));
jest.mock('@/effects/GameEffectFactory', () => ({ GameEffectFactory: {} }));
jest.mock('@/engine/EngineLocation', () => ({ __esModule: true, default: class EngineLocation {} }));
jest.mock('@/nwscript/events/NWScriptEventFactory', () => ({ NWScriptEventFactory: {} }));
jest.mock('@/nwscript/NWScriptSubroutine', () => ({ NWScriptSubroutine: class NWScriptSubroutine {} }));
jest.mock('@/managers/TLKManager', () => ({ TLKManager: {} }));

describe('ported NWScript saved-state regression cases', () => {
  test('writes slot counts once and round-trips scalar/object values through both readers', () => {
    const object = { id: 42 };
    jest.mocked(GameState.ModuleObjectManager.GetObjectById).mockImplementation((id: number) => (
      id === object.id ? object as any : undefined
    ));
    const stack = new NWScriptStack();
    stack.push(-23, NWScriptDataType.INTEGER);
    stack.push(1.25, NWScriptDataType.FLOAT);
    stack.push('saved argument', NWScriptDataType.STRING);
    stack.push(object, NWScriptDataType.OBJECT);
    stack.push(undefined, NWScriptDataType.OBJECT);
    stack.basePointer = 8;

    const saved = stack.saveForEventSituation();
    expect(saved.getFieldByLabel('BasePointer').getValue()).toBe(2);
    expect(saved.getFieldByLabel('StackPointer').getValue()).toBe(5);
    expect(saved.getFieldByLabel('TotalSize').getValue()).toBe(5);
    expect(saved.fields.filter(field => field.label === 'StackPointer')).toHaveLength(1);
    const elements = saved.getFieldByLabel('Stack').getChildStructs();
    expect(elements.map(element => element.getFieldByLabel('Type').getType())).toEqual([
      GFFDataType.BYTE, GFFDataType.BYTE, GFFDataType.BYTE, GFFDataType.BYTE, GFFDataType.BYTE,
    ]);
    expect(elements.map(element => element.getFieldByLabel('Type').getValue())).toEqual([3, 4, 5, 6, 6]);
    expect(elements.map(element => element.getFieldByLabel('Value').getType())).toEqual([
      GFFDataType.INT, GFFDataType.FLOAT, GFFDataType.CEXOSTRING, GFFDataType.DWORD, GFFDataType.DWORD,
    ]);
    expect(elements[4].getFieldByLabel('Value').getValue()).toBe(0x7f000000);

    for (const restored of [NWScriptStack.FromActionStruct(saved), NWScriptStack.FromEventQueueStruct(saved)]) {
      expect(restored.basePointer).toBe(8);
      expect(restored.pointer).toBe(20);
      expect(restored.stack.map(element => element.type)).toEqual([
        NWScriptDataType.INTEGER, NWScriptDataType.FLOAT, NWScriptDataType.STRING,
        NWScriptDataType.OBJECT, NWScriptDataType.OBJECT,
      ]);
      expect(restored.stack.map(element => element.value)).toEqual([-23, 1.25, 'saved argument', object, undefined]);
      expect(restored.stack[3].value).toBe(object);
    }
  });

  test('accepts decimal CHAR type tags from older parsed GFF structures', () => {
    const stack = new NWScriptStack();
    stack.push(27, NWScriptDataType.INTEGER);
    const saved = stack.saveForEventSituation();
    const type = saved.getFieldByLabel('Stack').getChildStructs()[0].getFieldByLabel('Type');
    type.type = GFFDataType.CHAR;
    type.setValue('3');
    expect(NWScriptStack.FromEventQueueStruct(saved).stack[0].value).toBe(27);
  });

  test('serializes null object references as OBJECT_INVALID', () => {
    const stack = new NWScriptStack();
    stack.push(null, NWScriptDataType.OBJECT);
    const saved = stack.saveForEventSituation();
    const value = saved.getFieldByLabel('Stack').getChildStructs()[0].getFieldByLabel('Value');
    expect(value.getValue()).toBe(0x7f000000);
    expect(NWScriptStack.FromEventQueueStruct(saved).stack[0].value).toBeUndefined();
  });

  test('saves an empty stack with explicit TotalSize and restores it', () => {
    const saved = new NWScriptStack().saveForEventSituation();
    expect(saved.getFieldByLabel('BasePointer').getValue()).toBe(0);
    expect(saved.getFieldByLabel('StackPointer').getValue()).toBe(0);
    expect(saved.getFieldByLabel('TotalSize').getValue()).toBe(0);
    expect(saved.getFieldByLabel('Stack').getChildStructs()).toEqual([]);
    expect(NWScriptStack.FromEventQueueStruct(saved).stack).toEqual([]);
    expect(NWScriptStack.FromActionStruct(saved).stack).toEqual([]);
  });

  test('keeps vector physical width in slot-based serialization', () => {
    const stack = new NWScriptStack();
    stack.push({ x: 1, y: 2, z: 3 }, NWScriptDataType.VECTOR);
    const saved = stack.saveForEventSituation();
    expect(saved.getFieldByLabel('StackPointer').getValue()).toBe(3);
    expect(saved.getFieldByLabel('TotalSize').getValue()).toBe(3);
    const restored = NWScriptStack.FromEventQueueStruct(saved);
    expect(restored.pointer).toBe(12);
    expect(restored.stack.map(element => element.value)).toEqual([3, 2, 1]);
    expect(restored.stack.every(element => element.type === NWScriptDataType.FLOAT)).toBe(true);
  });

  test('STORE_STATE derives the deferred address from its encoded offset, not linked instructions', () => {
    const savedScript: any = { stack: new NWScriptStack() };
    const stack = new NWScriptStack();
    stack.push(7, NWScriptDataType.INTEGER);
    stack.basePointer = 4;
    const caller = { id: 10 };
    const vm: any = {
      name: 'deferred_test', stack, state: [], caller,
      enteringObject: { id: 11 }, listenPatternNumber: 3,
      listenPatternSpeaker: { id: 12 }, scriptVar: 99,
      nwscript: { newInstance: () => savedScript },
    };
    // Deliberately omit nextInstr: the encoded relative continuation is sufficient.
    CALL_STORE_STATE.call(vm as NWScriptInstance, { address: 100, type: 16 } as NWScriptInstruction);
    expect(vm.state).toHaveLength(1);
    expect(vm.state[0].offset).toBe(116);
    expect(savedScript.address).toBe(116);
    expect(savedScript.offset).toBe(116);
    expect(savedScript.isStoreState).toBe(true);
    expect(savedScript.stack.pointer).toBe(4);
    expect(savedScript.stack.basePointer).toBe(4);
    expect(savedScript.stack.stack).toEqual(stack.stack);
    expect(savedScript.stack.stack).not.toBe(stack.stack);
    expect(savedScript.caller).toBe(caller);
    expect(savedScript.scriptVar).toBe(99);
    expect(savedScript.enteringObject).toBe(vm.enteringObject);
    expect(savedScript.listenPatternNumber).toBe(3);
    expect(savedScript.listenPatternSpeaker).toBe(vm.listenPatternSpeaker);
  });

  test('an unknown action stops the VM before consuming arguments', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const stack = new NWScriptStack();
      stack.push(7, NWScriptDataType.INTEGER);
      const vm: any = { name: 'unknown_action_test', running: true, stack };
      CALL_ACTION.call(vm as NWScriptInstance, {
        address: 20, action: 99999, argCount: 1, actionDefinition: undefined,
      } as NWScriptInstruction);
      expect(vm.running).toBe(false);
      expect(stack.pointer).toBe(4);
      expect(stack.stack[0].value).toBe(7);
      expect(error).toHaveBeenCalledWith('NWScript CALL_ACTION: missing action definition', expect.objectContaining({
        script: 'unknown_action_test', address: 20, action: 99999, argCount: 1,
      }));
    } finally {
      error.mockRestore();
    }
  });
});
