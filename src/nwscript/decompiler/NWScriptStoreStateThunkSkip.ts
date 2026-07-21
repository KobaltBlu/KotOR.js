import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { buildJsrCalleeArgSlotsByEntryPc } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  OP_RETN,
  OP_JSR,
  OP_JMP,
  OP_ACTION,
  OP_STORE_STATE,
  OP_STORE_STATEALL,
  OP_CPTOPSP,
  OP_CPTOPBP,
  OP_CONST,
} from "@/nwscript/NWScriptOPCodes";

/**
 * STORE_STATE + following JMP: the linear span (JMP.next .. JMP target) is the **action thunk** —
 * not a normal subroutine. Policy shared with {@link NWScriptControlFlowGraph.identifyStoreStateJmpTargets},
 * {@link NWScriptFunctionAnalyzer.identifyNestedCallCode}, and {@link NWScriptStatementBuilder.extractNestedCall}:
 * - Thunk bytes are skipped for “real” control-flow / variable analysis where appropriate.
 * - {@link buildDelayCommandThunkCalleeByActionAddress} recovers DelayCommand’s script arg from that span
 *   (nested AssignCommand ACTION, else ACTION/JSR with args via mini-sim).
 */

/** DelayCommand second-arg recovery for {@link NWScriptStackSimulator}. */
export type DelayCommandThunkArg =
  | { type: "expression"; expression: NWScriptExpression }
  | {
      type: "assignCommand";
      /** CPTOP or CONST that supplies AssignCommand's object subject */
      objectInstr: NWScriptInstruction;
      nestedScript: NWScriptExpression;
    };

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

function isStoreStateJmpPair(
  instr: NWScriptInstruction
): { store: NWScriptInstruction; jmp: NWScriptInstruction } | null {
  if (instr.code !== OP_STORE_STATE && instr.code !== OP_STORE_STATEALL) {
    return null;
  }
  const nxt = instr.nextInstr;
  if (!nxt || nxt.code !== OP_JMP || nxt.offset === undefined) {
    return null;
  }
  return { store: instr, jmp: nxt };
}

function signedOffset(offset: number | undefined): number {
  if (offset === undefined) {
    return 0;
  }
  return offset > 0x7fffffff ? offset - 0x100000000 : offset;
}

/** CONST → expression (object 0/1 map via {@link NWScriptExpression.toNSS}). */
function recoverThunkConstExpression(instruction: NWScriptInstruction): NWScriptExpression {
  switch (instruction.type) {
    case NWScriptDataType.INTEGER:
    case 3:
      return NWScriptExpression.constant(
        instruction.integer ?? instruction.value ?? 0,
        NWScriptDataType.INTEGER
      );
    case NWScriptDataType.FLOAT:
    case 4:
      return NWScriptExpression.constant(
        instruction.float ?? instruction.value ?? 0,
        NWScriptDataType.FLOAT
      );
    case NWScriptDataType.STRING:
    case 5:
      return NWScriptExpression.constant(
        instruction.string ?? instruction.value ?? "",
        NWScriptDataType.STRING
      );
    case NWScriptDataType.OBJECT:
    case 6: {
      const raw =
        instruction.object ??
        instruction.integer ??
        instruction.value ??
        0;
      return NWScriptExpression.constant(raw, NWScriptDataType.OBJECT);
    }
    default:
      return NWScriptExpression.constant(
        instruction.integer ?? instruction.value ?? 0,
        NWScriptDataType.INTEGER
      );
  }
}

/** Best-effort CPTOPSP/CPTOPBP → localVar_* / globalVar_* label from signed offset. */
function recoverThunkCptopExpression(instruction: NWScriptInstruction): NWScriptExpression {
  const off = signedOffset(instruction.offset);
  const isGlobal = instruction.code === OP_CPTOPBP;
  let idx: number;
  if (off < 0 && off % 4 === 0) {
    idx = Math.abs(off) / 4 - 1;
  } else if (off >= 0 && off % 4 === 0) {
    idx = off / 4;
  } else {
    idx = Math.abs(off);
  }
  if (idx < 0) {
    idx = 0;
  }
  const name = isGlobal ? `globalVar_${idx}` : `localVar_${idx}`;
  return NWScriptExpression.variable(name, NWScriptDataType.OBJECT, isGlobal);
}

/**
 * Pop `argCount` expressions matching {@link NWScriptStackSimulator.handleAction} /
 * {@link NWScriptStackSimulator.handleJsr} (unshift then reverse).
 */
function popThunkArgs(stack: NWScriptExpression[], argCount: number): NWScriptExpression[] {
  const args: NWScriptExpression[] = [];
  let n = Math.min(Math.max(argCount, 0), stack.length);
  while (n > 0) {
    const item = stack.pop();
    if (item) {
      args.unshift(item);
    }
    n--;
  }
  args.reverse();
  return args;
}

/**
 * Linear mini-sim of a STORE_STATE thunk span: CONST / CPTOP* / ACTION / JSR.
 * Prefers the last void ACTION before RETN; otherwise the last void JSR callee call.
 */
function recoverThunkScriptExpression(
  jmpInstr: NWScriptInstruction,
  jmpTarget: number,
  entryPcToFn: Map<number, NWScriptFunction>,
  jsrArgSlotsByEntryPc: Map<number, number>
): NWScriptExpression | null {
  const stack: NWScriptExpression[] = [];
  let lastVoidAction: NWScriptExpression | null = null;
  let lastVoidJsr: NWScriptExpression | null = null;
  let thunkPc: NWScriptInstruction | null | undefined = jmpInstr.nextInstr;

  while (thunkPc && thunkPc.address < jmpTarget) {
    // Nested STORE_STATE: skip its inlined span (do not mini-sim nested bytes here)
    const nested = isStoreStateJmpPair(thunkPc);
    if (nested && nested.jmp.offset !== undefined) {
      const nestedEnd = nested.jmp.address + nested.jmp.offset;
      let skip = nested.jmp.nextInstr;
      while (skip && skip.address < nestedEnd) {
        skip = skip.nextInstr;
      }
      thunkPc = skip;
      continue;
    }

    if (thunkPc.code === OP_CONST) {
      stack.push(recoverThunkConstExpression(thunkPc));
      thunkPc = thunkPc.nextInstr;
      continue;
    }

    if (thunkPc.code === OP_CPTOPSP || thunkPc.code === OP_CPTOPBP) {
      stack.push(recoverThunkCptopExpression(thunkPc));
      thunkPc = thunkPc.nextInstr;
      continue;
    }

    if (thunkPc.code === OP_ACTION) {
      const rawArgCount = thunkPc.argCount ?? 0;
      const argCount = Math.min(Math.max(rawArgCount, 0), 48);
      const args = popThunkArgs(stack, argCount);
      const name =
        thunkPc.actionDefinition?.name ||
        (thunkPc.action !== undefined ? `Action_${thunkPc.action}` : "Action");
      const returnType =
        (thunkPc.actionDefinition?.type as NWScriptDataType | undefined) ??
        NWScriptDataType.VOID;
      const expr = NWScriptExpression.functionCall(name, args, returnType);
      if (returnType !== NWScriptDataType.VOID) {
        stack.push(expr);
      } else {
        lastVoidAction = expr;
      }
      thunkPc = thunkPc.nextInstr;
      continue;
    }

    if (thunkPc.code === OP_JSR && thunkPc.offset !== undefined) {
      const calleePc = thunkPc.address + thunkPc.offset;
      const callee = entryPcToFn.get(calleePc);
      const name = callee?.name ?? `sub_${calleePc.toString(16)}`;
      const returnType = callee?.returnType ?? NWScriptDataType.VOID;
      let slots = jsrArgSlotsByEntryPc.get(calleePc) ?? 0;
      if (slots <= 0 && callee?.parameters?.length) {
        slots = callee.parameters.length;
      }
      if (slots <= 0 && stack.length > 0) {
        // Fallback: treat remaining pushes since last call as args
        slots = stack.length;
      }
      const args = popThunkArgs(stack, slots);
      const expr = NWScriptExpression.functionCall(name, args, returnType);
      if (returnType !== NWScriptDataType.VOID) {
        stack.push(expr);
      } else {
        lastVoidJsr = expr;
      }
      thunkPc = thunkPc.nextInstr;
      continue;
    }

    if (thunkPc.code === OP_RETN) {
      break;
    }

    thunkPc = thunkPc.nextInstr;
  }

  return lastVoidAction ?? lastVoidJsr;
}

function findObjectSubjectInstr(before: NWScriptInstruction): NWScriptInstruction | null {
  let p: NWScriptInstruction | null | undefined = before.prevInstr;
  let steps = 0;
  while (p && steps++ < 32) {
    if (p.code === OP_CPTOPSP || p.code === OP_CPTOPBP) {
      return p;
    }
    if (p.code === OP_CONST) {
      return p;
    }
    if (
      p.code === OP_ACTION ||
      p.code === OP_JSR ||
      p.code === OP_RETN ||
      p.code === OP_STORE_STATE ||
      p.code === OP_STORE_STATEALL
    ) {
      break;
    }
    p = p.prevInstr;
  }
  return null;
}

function findOuterStoreStateJmp(
  actionInstr: NWScriptInstruction
): { store: NWScriptInstruction; jmp: NWScriptInstruction; jmpTarget: number } | null {
  let storeStateInstr: NWScriptInstruction | undefined;
  let jmpInstr: NWScriptInstruction | undefined;
  let bestJmpTarget = -1;
  let cur: NWScriptInstruction | null | undefined = actionInstr.prevInstr;
  let steps = 0;
  // Prefer the STORE_STATE whose JMP lands closest before this ACTION (outer thunk).
  // Nested AssignCommand / ActionDoCommand STORE_STATE also sits behind us but jumps earlier.
  while (cur && steps++ < 512) {
    const pair = isStoreStateJmpPair(cur);
    if (pair && pair.jmp.offset !== undefined) {
      const jmpTarget = pair.jmp.address + pair.jmp.offset;
      if (jmpTarget <= actionInstr.address && jmpTarget >= bestJmpTarget) {
        bestJmpTarget = jmpTarget;
        storeStateInstr = pair.store;
        jmpInstr = pair.jmp;
      }
    }
    cur = cur.prevInstr;
  }
  if (!storeStateInstr || !jmpInstr || jmpInstr.offset === undefined) {
    return null;
  }
  return {
    store: storeStateInstr,
    jmp: jmpInstr,
    jmpTarget: jmpInstr.address + jmpInstr.offset,
  };
}

function findInnerStoreStateJmp(
  actionInstr: NWScriptInstruction,
  afterAddress: number
): { store: NWScriptInstruction; jmp: NWScriptInstruction } | null {
  let back: NWScriptInstruction | null | undefined = actionInstr.prevInstr;
  let backSteps = 0;
  while (back && back.address > afterAddress && backSteps++ < 256) {
    const pair = isStoreStateJmpPair(back);
    if (pair) {
      return pair;
    }
    back = back.prevInstr;
  }
  return null;
}

/**
 * Map DelayCommand ACTION instr address → recovered second argument
 * (`Name()`, nested `AssignCommand(o, …)`, or nested `ActionDoCommand(…)`).
 */
export function buildDelayCommandThunkCalleeByActionAddress(
  script: NWScript,
  functions: NWScriptFunction[],
  delayCommandActionPredicate: (instruction: NWScriptInstruction) => boolean
): Map<number, DelayCommandThunkArg> {
  const entryPcToFn = new Map<number, NWScriptFunction>();
  for (const f of functions) {
    if (!f.isMain) {
      entryPcToFn.set(f.entryBlock.startInstruction.address, f);
    }
  }
  const jsrArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, script);

  const map = new Map<number, DelayCommandThunkArg>();

  for (const instruction of script.instructions.values()) {
    if (instruction.code !== OP_ACTION || !delayCommandActionPredicate(instruction)) {
      continue;
    }

    const outer = findOuterStoreStateJmp(instruction);
    if (!outer) {
      continue;
    }
    const { jmp: jmpInstr, jmpTarget } = outer;
    let thunkPc: NWScriptInstruction | null | undefined = jmpInstr.nextInstr;
    let found: DelayCommandThunkArg | undefined;

    while (thunkPc && thunkPc.address < jmpTarget) {
      // Nested AssignCommand (action 6) with its own STORE_STATE thunk
      if (
        thunkPc.code === OP_ACTION &&
        (thunkPc.actionDefinition?.name === "AssignCommand" || thunkPc.action === 6)
      ) {
        const inner = findInnerStoreStateJmp(thunkPc, jmpInstr.address);
        if (inner && inner.jmp.offset !== undefined) {
          const nestedEnd = inner.jmp.address + inner.jmp.offset;
          const nestedScript =
            recoverThunkScriptExpression(
              inner.jmp,
              nestedEnd,
              entryPcToFn,
              jsrArgSlotsByEntryPc
            ) ??
            NWScriptExpression.functionCall("/*thunk*/", [], NWScriptDataType.VOID);
          const objectInstr =
            findObjectSubjectInstr(thunkPc) ?? findObjectSubjectInstr(inner.store);
          if (objectInstr) {
            found = {
              type: "assignCommand",
              objectInstr,
              nestedScript,
            };
            break;
          }
        }
      }

      // Nested ActionDoCommand (action 294) with its own STORE_STATE thunk
      if (
        thunkPc.code === OP_ACTION &&
        (thunkPc.actionDefinition?.name === "ActionDoCommand" || thunkPc.action === 294)
      ) {
        const inner = findInnerStoreStateJmp(thunkPc, jmpInstr.address);
        if (inner && inner.jmp.offset !== undefined) {
          const nestedEnd = inner.jmp.address + inner.jmp.offset;
          const nestedScript =
            recoverThunkScriptExpression(
              inner.jmp,
              nestedEnd,
              entryPcToFn,
              jsrArgSlotsByEntryPc
            ) ??
            NWScriptExpression.functionCall("/*thunk*/", [], NWScriptDataType.VOID);
          found = {
            type: "expression",
            expression: NWScriptExpression.functionCall(
              "ActionDoCommand",
              [nestedScript],
              NWScriptDataType.VOID
            ),
          };
          break;
        }
      }

      thunkPc = thunkPc.nextInstr;
    }

    if (!found) {
      const expr = recoverThunkScriptExpression(
        jmpInstr,
        jmpTarget,
        entryPcToFn,
        jsrArgSlotsByEntryPc
      );
      if (expr) {
        found = { type: "expression", expression: expr };
      }
    }

    if (found) {
      map.set(instruction.address, found);
    }
  }

  return map;
}

/**
 * Map ActionDoCommand ACTION instr address → recovered action argument (`ClearAllActions()`, etc.).
 */
export function buildActionDoCommandThunkArgByActionAddress(
  script: NWScript,
  functions: NWScriptFunction[]
): Map<number, NWScriptExpression> {
  const entryPcToFn = new Map<number, NWScriptFunction>();
  for (const f of functions) {
    if (!f.isMain) {
      entryPcToFn.set(f.entryBlock.startInstruction.address, f);
    }
  }
  const jsrArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, script);
  const map = new Map<number, NWScriptExpression>();

  for (const instruction of script.instructions.values()) {
    if (
      instruction.code !== OP_ACTION ||
      !(
        instruction.actionDefinition?.name === "ActionDoCommand" ||
        instruction.action === 294
      )
    ) {
      continue;
    }
    const outer = findOuterStoreStateJmp(instruction);
    if (!outer) {
      continue;
    }
    const expr = recoverThunkScriptExpression(
      outer.jmp,
      outer.jmpTarget,
      entryPcToFn,
      jsrArgSlotsByEntryPc
    );
    if (expr) {
      map.set(instruction.address, expr);
    }
  }

  return map;
}

/**
 * Map AssignCommand ACTION instr address → recovered action argument (`ActionOpenDoor(o)`, etc.).
 * Standalone AssignCommand (not nested under DelayCommand) uses the same STORE_STATE+JMP island.
 */
export function buildAssignCommandThunkArgByActionAddress(
  script: NWScript,
  functions: NWScriptFunction[]
): Map<number, NWScriptExpression> {
  const entryPcToFn = new Map<number, NWScriptFunction>();
  for (const f of functions) {
    if (!f.isMain) {
      entryPcToFn.set(f.entryBlock.startInstruction.address, f);
    }
  }
  const jsrArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, script);
  const map = new Map<number, NWScriptExpression>();

  for (const instruction of script.instructions.values()) {
    if (
      instruction.code !== OP_ACTION ||
      !(
        instruction.actionDefinition?.name === "AssignCommand" ||
        instruction.action === 6
      )
    ) {
      continue;
    }
    const outer = findOuterStoreStateJmp(instruction);
    if (!outer) {
      continue;
    }
    const expr = recoverThunkScriptExpression(
      outer.jmp,
      outer.jmpTarget,
      entryPcToFn,
      jsrArgSlotsByEntryPc
    );
    if (expr) {
      map.set(instruction.address, expr);
    }
  }

  return map;
}
