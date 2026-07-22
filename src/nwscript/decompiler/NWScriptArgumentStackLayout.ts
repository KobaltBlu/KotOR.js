import type { NWScriptFunction, NWScriptFunctionParameter } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  OP_CONST,
  OP_CPTOPSP,
  OP_CPTOPBP,
  OP_JSR,
  OP_JZ,
  OP_JNZ,
  OP_JMP,
  OP_RETN,
  OP_ACTION,
  OP_ADD,
  OP_SUB,
  OP_MUL,
  OP_DIV,
  OP_MODII,
  OP_NEG,
  OP_MOVSP,
  OP_LOGANDII,
  OP_LOGORII,
  OP_BOOLANDII,
  OP_INCORII,
  OP_EXCORII,
  OP_EQUAL,
  OP_NEQUAL,
  OP_GEQ,
  OP_GT,
  OP_LT,
  OP_LEQ,
  OP_SHLEFTII,
  OP_SHRIGHTII,
  OP_USHRIGHTII,
  OP_COMPI,
  OP_NOTI,
  OP_RSADD,
  OP_CPDOWNSP,
  OP_CPDOWNBP,
  OP_SAVEBP,
  OP_RESTOREBP,
  OP_STORE_STATE,
  OP_STORE_STATEALL,
  OP_NOP,
  OP_T,
  OP_DESTRUCT,
  OP_DECISP,
  OP_INCISP,
  OP_DECIBP,
  OP_INCIBP,
} from "@/nwscript/NWScriptOPCodes";

const HARD_STOP_BACKWARDS = new Set<number>([
  OP_JSR,
  OP_JZ,
  OP_JNZ,
  OP_JMP,
  OP_RETN,
  // OP_ACTION is NOT a hard stop: valued actions (GetModule, ObjectToString, …)
  // are part of the arg-expression chain before JSR (k_act_com31 sub1/sub4).
]);

/** Signed int32 from raw offset field */
function signedInt32(off: number): number {
  return off > 0x7fffffff ? off - 0x100000000 : off;
}

/**
 * Restore ACTION argument source order from a top-first pop list.
 * Default NWScript is R-to-L (top = first formal). Some retail sequences push L-to-R
 * with repeated CPTOPSP offsets (e.g. SetLocalBoolean triple −16); detect when the top
 * value's type matches the last formal and not the first.
 */
export function orderActionArgsTopFirst<T extends { dataType: NWScriptDataType }>(
  poppedTopFirst: T[],
  defArgTypes: number[]
): T[] {
  const stackTypes = defArgTypes.filter((t) => t !== 0xff);
  if (poppedTopFirst.length < 2 || stackTypes.length < 2) {
    return poppedTopFirst.slice();
  }
  const firstT = stackTypes[0];
  const lastT = stackTypes[stackTypes.length - 1];
  if (firstT === lastT) {
    return poppedTopFirst.slice();
  }
  const topT = poppedTopFirst[0]?.dataType;
  if (topT === lastT && topT !== firstT) {
    return poppedTopFirst.slice().reverse();
  }
  return poppedTopFirst.slice();
}

/**
 * Approximate dword stack delta (effect on SP-relative stack depth for scalar-heavy code).
 * Returns null when the opcode cannot be modeled safely for inference.
 */
export function instructionForwardStackSlotDelta(ins: NWScriptInstruction): number | null {
  switch (ins.code) {
    case OP_CONST:
    case OP_CPTOPSP:
    case OP_CPTOPBP:
    case OP_RSADD:
      return 1;

    case OP_MOVSP:
      if (ins.offset === undefined) return null;
      return signedInt32(ins.offset) / 4;

    case OP_SAVEBP:
    case OP_RESTOREBP:
    case OP_STORE_STATE:
    case OP_STORE_STATEALL:
    case OP_NOP:
    case OP_T:
    case OP_CPDOWNSP:
    case OP_CPDOWNBP:
    case OP_DECISP:
    case OP_INCISP:
    case OP_DECIBP:
    case OP_INCIBP:
      return 0;

    case OP_NEG:
    case OP_COMPI:
    case OP_NOTI:
      return 0;

    case OP_DESTRUCT:
      return null;

    case OP_JZ:
    case OP_JNZ:
      return -1;

    case OP_ADD:
    case OP_SUB:
    case OP_MUL:
    case OP_DIV:
    case OP_MODII:
    case OP_LOGANDII:
    case OP_LOGORII:
    case OP_BOOLANDII:
    case OP_INCORII:
    case OP_EXCORII:
    case OP_SHLEFTII:
    case OP_SHRIGHTII:
    case OP_USHRIGHTII:
      return -1;

    case OP_EQUAL:
    case OP_NEQUAL:
    case OP_GEQ:
    case OP_GT:
    case OP_LT:
    case OP_LEQ:
      if (ins.type === NWScriptDataType.STRUCTURE) {
        return null;
      }
      return -1;

    case OP_ACTION: {
      const raw = ins.argCount ?? 0;
      const nargs = Math.min(Math.max(raw, 0), 48);
      const def = ins.actionDefinition;
      let ret = 0;
      if (def !== undefined && def.type !== undefined) {
        ret = def.type !== NWScriptDataType.VOID ? 1 : 0;
      } else {
        // Without a def, prefer assuming a scalar return so GetModule/ObjectToString
        // chains still contribute a slot (void actions with args still net ≤ 0).
        ret = 1;
      }
      return -nargs + ret;
    }

    case OP_JSR:
      return null;

    default:
      return null;
  }
}

/**
 * Linear bytecode slice immediately before JSR, up to a control/call barrier.
 * Returns whether the walk stopped on a prior OP_JSR (whose return may still be on stack).
 */
function collectChainBeforeJsr(jsr: NWScriptInstruction): {
  chain: NWScriptInstruction[];
  stoppedOnJsr: boolean;
} {
  const rev: NWScriptInstruction[] = [];
  let cur: NWScriptInstruction | null | undefined = jsr.prevInstr;
  let guard = 240;
  let stoppedOnJsr = false;
  while (cur && guard-- > 0) {
    if (HARD_STOP_BACKWARDS.has(cur.code)) {
      stoppedOnJsr = cur.code === OP_JSR;
      break;
    }
    rev.push(cur);
    cur = cur.prevInstr;
  }
  rev.reverse();
  return { chain: rev, stoppedOnJsr };
}

/** Legacy tally: pushes only (over-counts CPTOP + CONST separated by folded binops — kept as fallback when delta sum fails mid-chain). */
function legacyPushTailCount(chain: NWScriptInstruction[]): number {
  let n = 0;
  for (const ins of chain) {
    if (
      ins.code === OP_CONST ||
      ins.code === OP_CPTOPSP ||
      ins.code === OP_CPTOPBP ||
      // OP_RSADD is return/frame reservation, not an arg push
      // Valued ACTION leaves a slot; count as a push when definition is missing/non-void
      (ins.code === OP_ACTION &&
        (ins.actionDefinition === undefined ||
          ins.actionDefinition.type === undefined ||
          ins.actionDefinition.type !== NWScriptDataType.VOID))
    ) {
      n++;
    }
  }
  return n;
}

/**
 * True when chain starts with CPDOWN(+optional MOVSP) then CPTOP — prior JSR return
 * was stored to a local and re-pushed as the next call's argument (k_act_com31 sub3).
 */
function chainIsReturnAssignThenCptop(chain: NWScriptInstruction[]): boolean {
  if (chain.length < 2) {
    return false;
  }
  let i = 0;
  if (chain[i].code !== OP_CPDOWNSP && chain[i].code !== OP_CPDOWNBP) {
    return false;
  }
  i++;
  if (i < chain.length && chain[i].code === OP_MOVSP) {
    i++;
  }
  if (i >= chain.length) {
    return false;
  }
  return chain[i].code === OP_CPTOPSP || chain[i].code === OP_CPTOPBP;
}

/**
 * Net dword slots on caller stack consumed as arguments immediately before JSR forward execution.
 */
function inferCallerArgSlotsBeforeJsr(jsr: NWScriptInstruction): number {
  const { chain, stoppedOnJsr } = collectChainBeforeJsr(jsr);
  // Prior JSR left a return value that this chain CPDOWN+MOVSP cleans up then CPTOP re-pushes.
  let delta = stoppedOnJsr && chainIsReturnAssignThenCptop(chain) ? 1 : 0;
  for (const ins of chain) {
    // RSADD reserves return/locals on the caller frame — not an argument slot.
    if (ins.code === OP_RSADD) {
      continue;
    }
    const d = instructionForwardStackSlotDelta(ins);
    if (d === null) {
      return Math.max(0, legacyPushTailCount(chain));
    }
    delta += d;
  }
  return Math.max(0, Math.round(delta));
}

/**
 * NWScript/KotOr stack spill size per type (matches {@link NWScriptCompiler.getDataTypeStackLength}).
 */
export function nwscriptDataTypeStackBytes(dataType: NWScriptDataType): number {
  switch (dataType) {
    case NWScriptDataType.VOID:
      return 0;
    case NWScriptDataType.VECTOR:
      return 12;
    default:
      return 4;
  }
}

/** Total bytes callee expects for incoming parameters (sum of spills in declaration order = offset ascending). */
export function nwscriptParametersTotalBytes(parameters: NWScriptFunctionParameter[]): number {
  const sorted = [...parameters].sort((a, b) => a.offset - b.offset);
  let sum = 0;
  for (const p of sorted) {
    sum += nwscriptDataTypeStackBytes(p.dataType);
  }
  return sum;
}

/**
 * Min inferred caller arg slots across all OP_JSR that target callee entryPc.
 *
 * @param shouldCountJsr when set, return false to ignore a call site (e.g. JSR inside a DelayCommand STORE_STATE thunk).
 */
export function inferSubroutineParameterSlotsFromCallSites(
  script: NWScript,
  targetEntryPc: number,
  shouldCountJsr?: (instr: NWScriptInstruction) => boolean
): number {
  let bestMin = Number.POSITIVE_INFINITY;
  for (const instr of script.instructions.values()) {
    if (instr.code !== OP_JSR || instr.offset === undefined) {
      continue;
    }
    if (instr.address + instr.offset !== targetEntryPc) {
      continue;
    }
    if (shouldCountJsr && !shouldCountJsr(instr)) {
      continue;
    }
    bestMin = Math.min(bestMin, inferCallerArgSlotsBeforeJsr(instr));
  }
  return Number.isFinite(bestMin) ? bestMin : 0;
}

/**
 * JSR callee entry PC → caller dword slots to discard after simulated return when modeling expression stack.
 * Includes every bytecode JSR destination (globals loader subs, etc.), merged with analyzer parameter sizes.
 */
export function buildJsrCalleeArgSlotsByEntryPc(functions: NWScriptFunction[], script: NWScript): Map<number, number> {
  const map = new Map<number, number>();

  const allTargets = new Set<number>();
  for (const instr of script.instructions.values()) {
    if (instr.code === OP_JSR && instr.offset !== undefined) {
      allTargets.add(instr.address + instr.offset);
    }
  }

  for (const tgt of allTargets) {
    map.set(tgt, inferSubroutineParameterSlotsFromCallSites(script, tgt));
  }

  for (const f of functions) {
    if (f.isMain) {
      continue;
    }
    const entryPc = f.entryBlock.startInstruction.address;
    const bytes = nwscriptParametersTotalBytes(f.parameters);
    const analyzed = Math.floor(bytes / 4);
    const inferred = map.get(entryPc) ?? 0;
    let slots = analyzed;
    if (analyzed > 0 && inferred > 0) {
      slots = Math.min(analyzed, inferred);
    } else if (analyzed === 0) {
      slots = inferred;
    }
    map.set(entryPc, slots);
  }

  return map;
}

/** Metadata for bytecode JSR targets that map to a decompiled user subroutine (not main / loader thunks). */
export interface JsrUserRoutineMeta {
  name: string;
  returnType: NWScriptDataType;
}

/**
 * Callee entry PC → user subroutine name and return type (for {@code OP_JSR} expression recovery).
 * Excludes {@code isMain}; only entries present in {@link NWScriptFunctionAnalyzer}'s function set.
 */
export function buildJsrUserRoutineMetaByEntryPc(functions: NWScriptFunction[]): Map<number, JsrUserRoutineMeta> {
  const map = new Map<number, JsrUserRoutineMeta>();
  for (const f of functions) {
    if (f.isMain) {
      continue;
    }
    map.set(f.entryBlock.startInstruction.address, {
      name: f.name,
      returnType: f.returnType,
    });
  }
  return map;
}
