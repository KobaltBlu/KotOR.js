import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  OP_RETN,
  OP_JSR,
  OP_JMP,
  OP_ACTION,
  OP_STORE_STATE,
  OP_STORE_STATEALL,
} from "@/nwscript/NWScriptOPCodes";

/**
 * STORE_STATE + following JMP: the linear span (JMP.next .. JMP target) is the **action thunk** —
 * not a normal subroutine. Policy shared with {@link NWScriptControlFlowGraph.identifyStoreStateJmpTargets},
 * {@link NWScriptFunctionAnalyzer.identifyNestedCallCode}, and {@link NWScriptStatementBuilder.extractNestedCall}:
 * - Thunk bytes are skipped for “real” control-flow / variable analysis where appropriate.
 * - {@link buildDelayCommandThunkCalleeByActionAddress} finds the first OP_JSR in that span for DelayCommand’s script arg.
 */

/** Skip inlined thunk bytecode between STORE_STATE's JMP successor and its jump target (linear layout). */
export function computeInlinedThunkSkipAddresses(script: NWScript): Set<number> {
  const skip = new Set<number>();
  for (const instruction of script.instructions.values()) {
    if (instruction.code !== OP_STORE_STATE && instruction.code !== OP_STORE_STATEALL) {
      continue;
    }
    const nextInstr = instruction.nextInstr;
    if (!nextInstr || nextInstr.code !== OP_JMP || nextInstr.offset === undefined) {
      continue;
    }
    const jmpTarget = nextInstr.address + nextInstr.offset;
    let current: NWScriptInstruction | null | undefined = nextInstr.nextInstr;
    while (current && current.address < jmpTarget) {
      skip.add(current.address);
      if (current.code === OP_RETN) {
        break;
      }
      current = current.nextInstr;
    }
  }
  return skip;
}

/** Map DelayCommand ACTION instr address → void script callee expression (`Name()`). */
export function buildDelayCommandThunkCalleeByActionAddress(
  script: NWScript,
  functions: NWScriptFunction[],
  delayCommandActionPredicate: (instruction: NWScriptInstruction) => boolean
): Map<number, NWScriptExpression> {
  const entryPcToFn = new Map<number, NWScriptFunction>();
  for (const f of functions) {
    if (!f.isMain) {
      entryPcToFn.set(f.entryBlock.startInstruction.address, f);
    }
  }

  const map = new Map<number, NWScriptExpression>();

  for (const instruction of script.instructions.values()) {
    if (instruction.code !== OP_ACTION || !delayCommandActionPredicate(instruction)) {
      continue;
    }

    let storeStateInstr: NWScriptInstruction | undefined;
    let jmpInstr: NWScriptInstruction | undefined;
    let cur: NWScriptInstruction | null | undefined = instruction.prevInstr;
    let steps = 0;
    while (cur && steps++ < 512) {
      if (
        cur.code === OP_STORE_STATE ||
        cur.code === OP_STORE_STATEALL
      ) {
        const nxt = cur.nextInstr;
        if (nxt && nxt.code === OP_JMP && nxt.offset !== undefined) {
          storeStateInstr = cur;
          jmpInstr = nxt;
          break;
        }
      }
      cur = cur.prevInstr;
    }

    if (!storeStateInstr || !jmpInstr || jmpInstr.offset === undefined) {
      continue;
    }

    const jmpTarget = jmpInstr.address + jmpInstr.offset;
    let thunkPc: NWScriptInstruction | null | undefined = jmpInstr.nextInstr;
    while (thunkPc && thunkPc.address < jmpTarget) {
      if (thunkPc.code === OP_JSR && thunkPc.offset !== undefined) {
        const calleePc = thunkPc.address + thunkPc.offset;
        const callee = entryPcToFn.get(calleePc);
        const name = callee?.name ?? `sub_${calleePc.toString(16)}`;
        map.set(instruction.address, NWScriptExpression.functionCall(name, [], NWScriptDataType.VOID));
        break;
      }
      thunkPc = thunkPc.nextInstr;
    }
  }

  return map;
}
