import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScriptFunctionParameter } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { JsrUserRoutineMeta } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import {
  NWScriptStackSimulator,
  type NWScriptGlobalAggregateLayout,
} from "@/nwscript/decompiler/NWScriptStackSimulator";

/**
 * Compatibility facade for older expression-recovery callers.
 *
 * Expression recovery and full stack simulation used to contain separate opcode interpreters.
 * They disagreed about argument order, result types, vector widths, and underflow behavior. This
 * facade deliberately delegates to the canonical simulator so every recovery path applies the
 * same NCS semantics.
 */
export class NWScriptExpressionBuilder {
  private readonly simulator = new NWScriptStackSimulator();

  setJsrCalleeArgSlotsByEntryPc(map: Map<number, number>): void {
    this.simulator.setJsrCalleeArgSlotsByEntryPc(map);
  }

  setJsrUserRoutineMetaByEntryPc(map: Map<number, JsrUserRoutineMeta>): void {
    this.simulator.setJsrUserRoutineMetaByEntryPc(map);
  }

  processInstruction(instruction: NWScriptInstruction): NWScriptExpression | null {
    return this.simulator.processInstruction(instruction);
  }

  push(expression: NWScriptExpression): void {
    this.simulator.push(expression, -1);
  }

  pop(): NWScriptExpression | null {
    return this.simulator.pop()?.expression ?? null;
  }

  peek(): NWScriptExpression | null {
    return this.simulator.peek()?.expression ?? null;
  }

  clear(): void {
    this.simulator.clear();
  }

  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.simulator.setFunctionParameters(parameters);
  }

  setGlobalVariables(globalVars: Map<number, { name: string; dataType: NWScriptDataType }>): void {
    this.simulator.setGlobalVariables(globalVars);
  }

  setGlobalAggregateLayouts(layouts: Map<number, NWScriptGlobalAggregateLayout>): void {
    this.simulator.setGlobalAggregateLayouts(layouts);
  }

  setLocalVariables(localVars: Map<number, { name: string; dataType: NWScriptDataType }>): void {
    this.simulator.setLocalVariables(localVars);
  }

  setVariableStackPositions(positions: Map<number, number>): void {
    this.simulator.setVariableStackPositions(positions);
  }

  setLocalVariableAllocationIndices(indices: Map<number, number>): void {
    this.simulator.setLocalVariableAllocationIndices(indices);
  }

  setVectorLocalAllocationStarts(starts: Set<number>): void {
    this.simulator.setVectorLocalAllocationStarts(starts);
  }

  setStructureLocalLayouts(layouts: Map<number, NWScriptDataType[]>): void {
    this.simulator.setStructureLocalLayouts(layouts);
  }

  setVariableTypeObserver(
    observer?: (name: string, dataType: NWScriptDataType) => void
  ): void {
    this.simulator.setVariableTypeObserver(observer);
  }

  setLocalVariableInits(
    inits: Array<{
      offset: number;
      dataType: NWScriptDataType;
      hasInitializer: boolean;
      initialValue?: any;
    }>
  ): void {
    this.simulator.setLocalVariableInits(inits);
  }

  setStackPointer(stackPointer: number): void {
    this.simulator.setProgramStackPointer(stackPointer);
  }

  getStackSize(): number {
    return this.simulator.getStackSize();
  }
}
