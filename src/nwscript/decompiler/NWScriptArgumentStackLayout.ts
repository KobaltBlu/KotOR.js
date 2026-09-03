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
import {
  actionArgumentStackSlots,
  getArithmeticTypeSignature,
  getComparisonTypeSignature,
  getUnaryDataType,
  stackSlotsForByteSize,
  stackBytesForDataType,
  stackSlotsForDataType,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";

const HARD_STOP_BACKWARDS = new Set<number>([
  OP_JSR,
  OP_JZ,
  OP_JNZ,
  OP_JMP,
  OP_RETN,
  OP_ACTION,
]);

export interface InferredActionReturn {
  dataType: NWScriptDataType;
  stackSlots: number;
}

function nextNonNopInstruction(
  start: NWScriptInstruction | null | undefined
): NWScriptInstruction | null {
  let current = start ?? null;
  const visited = new Set<number>();
  while (current && current.code === OP_NOP && !visited.has(current.address)) {
    visited.add(current.address);
    current = current.nextInstr ?? null;
  }
  return current;
}

/**
 * Compiler rvalue store of an engine ACTION result:
 * `ACTION ; CPDOWNSP <width> ; MOVSP -<width>`.
 *
 * That pair is opcode evidence the ACTION pushed `width` bytes even when the
 * loaded nwscript table is missing the id or lists VOID. Bare `ACTION ; MOVSP`
 * is not this pattern: it is unused-result cleanup or procedure-local teardown.
 */
export function inferActionReturnFromStoreCleanup(
  action: NWScriptInstruction
): InferredActionReturn | null {
  if (action.code !== OP_ACTION) return null;

  const write = nextNonNopInstruction(action.nextInstr);
  const cleanup = write ? nextNonNopInstruction(write.nextInstr) : null;
  if (write?.code !== OP_CPDOWNSP || cleanup?.code !== OP_MOVSP) {
    return null;
  }

  const storeBytes = write.size;
  const cleanupBytes = -toSignedInt32(cleanup.offset);
  if (
    storeBytes === undefined ||
    storeBytes <= 0 ||
    storeBytes % 4 !== 0 ||
    storeBytes !== cleanupBytes
  ) {
    return null;
  }

  const stackSlots = storeBytes / 4;
  const declared = action.actionDefinition?.type;
  if (
    declared !== undefined &&
    declared !== NWScriptDataType.VOID &&
    declared !== NWScriptDataType.ACTION &&
    stackBytesForDataType(declared) === storeBytes
  ) {
    return { dataType: declared, stackSlots };
  }

  let cursor: NWScriptInstruction | null | undefined = action.prevInstr;
  const seen = new Set<number>();
  while (cursor && !seen.has(cursor.address) && seen.size < 16) {
    seen.add(cursor.address);
    if (cursor.code === OP_NOP) {
      cursor = cursor.prevInstr;
      continue;
    }
    if (HARD_STOP_BACKWARDS.has(cursor.code)) {
      break;
    }
    if (cursor.code === OP_RSADD) {
      const allocated = getUnaryDataType(cursor.type);
      if (allocated && stackBytesForDataType(allocated) === storeBytes) {
        return { dataType: allocated, stackSlots };
      }
      break;
    }
    cursor = cursor.prevInstr;
  }

  if (stackSlots === 3) {
    return { dataType: NWScriptDataType.VECTOR, stackSlots };
  }
  return { dataType: NWScriptDataType.INTEGER, stackSlots };
}

function actionReturnStackSlots(ins: NWScriptInstruction): number {
  return inferActionReturnFromStoreCleanup(ins)?.stackSlots
    ?? stackSlotsForDataType(ins.actionDefinition?.type);
}

/**
 * Dword stack delta used for caller/callee signature inference.
 * Returns null when the opcode cannot be modeled safely for inference.
 */
export function instructionForwardStackSlotDelta(ins: NWScriptInstruction): number | null {
  switch (ins.code) {
    case OP_CONST:
    case OP_RSADD:
      return 1;

    case OP_CPTOPSP:
    case OP_CPTOPBP:
      try {
        return stackSlotsForByteSize(ins.size ?? 4, ins.codeName || 'CPTOP');
      } catch {
        return null;
      }

    case OP_MOVSP:
      if (ins.offset === undefined) return null;
      try {
        const offset = toSignedInt32(ins.offset);
        return Math.sign(offset) * stackSlotsForByteSize(Math.abs(offset), 'MOVSP');
      } catch {
        return null;
      }

    case OP_SAVEBP:
    case OP_RESTOREBP:
    case OP_STORE_STATE:
    case OP_STORE_STATEALL:
    case OP_NOP:
    case OP_T:
    case OP_JMP:
    case OP_RETN:
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
      try {
        return -stackSlotsForByteSize(ins.sizeToDestroy, 'DESTRUCT') +
          stackSlotsForByteSize(ins.sizeOfElementToSave, 'DESTRUCT');
      } catch {
        return null;
      }

    case OP_JZ:
    case OP_JNZ:
      return -1;

    case OP_ADD:
    case OP_SUB:
    case OP_MUL:
    case OP_DIV:
    case OP_MODII: {
      const signature = getArithmeticTypeSignature(ins.code, ins.type);
      if (!signature) return null;
      return -stackSlotsForDataType(signature.left) - stackSlotsForDataType(signature.right) +
        stackSlotsForDataType(signature.result);
    }

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
        try {
          const slots = stackSlotsForByteSize(ins.sizeOfStructure, 'structure comparison');
          return -(slots * 2) + 1;
        } catch {
          return null;
        }
      }
      const signature = getComparisonTypeSignature(ins.code, ins.type);
      if (!signature) return null;
      return -stackSlotsForDataType(signature.left) - stackSlotsForDataType(signature.right) + 1;

    case OP_ACTION: {
      const raw = ins.argCount ?? 0;
      const argSlots = ins.actionDefinition
        ? actionArgumentStackSlots(ins.actionDefinition, raw)
        : raw;
      if (argSlots === null) return null;
      return -argSlots + actionReturnStackSlots(ins);
    }

    case OP_JSR:
      return null;

    default:
      return null;
  }
}

/** Linear bytecode slice immediately before JSR, up to a control/call barrier (not including the barrier instruction). */
function collectChainBeforeJsr(jsr: NWScriptInstruction): NWScriptInstruction[] {
  const rev: NWScriptInstruction[] = [];
  let cur: NWScriptInstruction | null | undefined = jsr.prevInstr;
  while (cur) {
    if (HARD_STOP_BACKWARDS.has(cur.code)) {
      break;
    }
    rev.push(cur);
    cur = cur.prevInstr;
  }
  rev.reverse();
  return rev;
}

/**
 * Net dword slots on caller stack consumed as arguments immediately before JSR forward execution.
 */
function inferCallerArgSlotsBeforeJsr(jsr: NWScriptInstruction): number {
  const chain = collectChainBeforeJsr(jsr);
  let delta = 0;
  for (const ins of chain) {
    const d = instructionForwardStackSlotDelta(ins);
    if (d === null) {
      // An unknown opcode/type makes the linear delta unprovable. Do not turn every prior push
      // into a fabricated argument list; callee access analysis remains the authoritative source.
      return 0;
    }
    delta += d;
  }
  return Math.max(0, Math.round(delta));
}

/**
 * NWScript/KotOr stack spill size per type (matches {@link NWScriptCompiler.getDataTypeStackLength}).
 */
export function nwscriptDataTypeStackBytes(dataType: NWScriptDataType): number {
  return stackBytesForDataType(dataType);
}

/** Total bytes callee expects for incoming parameters. */
export function nwscriptParametersTotalBytes(parameters: NWScriptFunctionParameter[]): number {
  let sum = 0;
  for (const p of parameters) {
    sum += (p.stackSlots ?? stackSlotsForDataType(p.dataType)) * 4;
  }
  return sum;
}

function rsaddTypeToDataType(type: number | undefined): NWScriptDataType | null {
  const dataType = getUnaryDataType(type);
  return dataType === NWScriptDataType.VECTOR || dataType === NWScriptDataType.STRUCTURE
    ? null
    : dataType;
}

const RETURN_RESERVATION_BACKWARD_STOPS = new Set<number>([
  OP_JSR,
  OP_JZ,
  OP_JNZ,
  OP_JMP,
  OP_RETN,
]);

export interface JsrReturnReservation {
  dataType: NWScriptDataType;
  instructions: NWScriptInstruction[];
  /** Flattened physical fields when the nominal source type was a user-defined struct. */
  structureFieldTypes?: NWScriptDataType[];
}

export interface SubroutineCallAbiInference {
  parameterSlots: number;
  returnType: NWScriptDataType;
  returnStructureFieldTypes?: NWScriptDataType[];
}

export interface InferredJsrArgument {
  dataType: NWScriptDataType | null;
  stackSlots: number;
}

function instructionResultDataType(instruction: NWScriptInstruction): NWScriptDataType | null {
  switch (instruction.code) {
    case OP_CONST:
      return getUnaryDataType(instruction.type);
    case OP_CPTOPSP:
    case OP_CPTOPBP:
      return instruction.size === 12 ? NWScriptDataType.VECTOR : null;
    case OP_ACTION:
      return instruction.actionDefinition?.type ?? null;
    case OP_ADD:
    case OP_SUB:
    case OP_MUL:
    case OP_DIV:
    case OP_MODII:
      return getArithmeticTypeSignature(instruction.code, instruction.type)?.result ?? null;
    case OP_EQUAL:
    case OP_NEQUAL:
    case OP_GEQ:
    case OP_GT:
    case OP_LT:
    case OP_LEQ:
    case OP_LOGANDII:
    case OP_LOGORII:
    case OP_BOOLANDII:
    case OP_INCORII:
    case OP_EXCORII:
    case OP_SHLEFTII:
    case OP_SHRIGHTII:
    case OP_USHRIGHTII:
      return NWScriptDataType.INTEGER;
    case OP_NEG:
    case OP_COMPI:
    case OP_NOTI:
      return getUnaryDataType(instruction.type);
    default:
      return null;
  }
}

/** Recover formal argument types from the expression roots immediately before a JSR. */
export function inferJsrArgumentTypes(
  jsr: NWScriptInstruction,
  parameters: NWScriptFunctionParameter[]
): Array<NWScriptDataType | null> | null {
  let cursor: NWScriptInstruction | null | undefined = jsr.prevInstr;
  const inferred: Array<NWScriptDataType | null> = [];

  // Formal one is nearest TOS and therefore has the least-negative frame offset.
  for (const parameter of [...parameters].sort((left, right) => right.offset - left.offset)) {
    if (!cursor) return null;
    const expectedSlots = Math.max(
      1,
      parameter.stackSlots ?? stackSlotsForDataType(parameter.dataType)
    );
    const rootType = expectedSlots === 3
      ? NWScriptDataType.VECTOR
      : instructionResultDataType(cursor);
    let contribution = 0;

    while (contribution < expectedSlots && cursor) {
      if (RETURN_RESERVATION_BACKWARD_STOPS.has(cursor.code)) {
        return null;
      }
      const delta = instructionForwardStackSlotDelta(cursor);
      if (delta === null) return null;
      contribution += delta;
      cursor = cursor.prevInstr;
    }

    if (contribution !== expectedSlots) return null;
    inferred.push(rootType === NWScriptDataType.VOID ? null : rootType);
  }

  return inferred;
}

/**
 * Recover a call's formal argument layout when only the callee's total cleanup width is known.
 * The instruction immediately before JSR produces formal one because the compiler pushes
 * source arguments in reverse order. RSADD is deliberately rejected as an argument root: it is
 * a frame allocation or result reservation, never a compiled argument expression.
 */
export function inferJsrArgumentTypesByTotalSlots(
  jsr: NWScriptInstruction,
  totalSlots: number
): InferredJsrArgument[] | null {
  if (!Number.isInteger(totalSlots) || totalSlots < 0) return null;
  if (totalSlots === 0) return [];

  let cursor: NWScriptInstruction | null | undefined = jsr.prevInstr;
  const inferred: InferredJsrArgument[] = [];
  let totalConsumed = 0;

  while (totalConsumed < totalSlots && cursor) {
    if (RETURN_RESERVATION_BACKWARD_STOPS.has(cursor.code) || cursor.code === OP_RSADD) {
      return null;
    }

    const rootType = instructionResultDataType(cursor);
    let rootSlots: number;
    let dataType: NWScriptDataType | null;
    if (rootType !== null && rootType !== NWScriptDataType.VOID) {
      dataType = rootType;
      rootSlots = stackSlotsForDataType(rootType);
    } else if (cursor.code === OP_CPTOPSP || cursor.code === OP_CPTOPBP) {
      try {
        rootSlots = stackSlotsForByteSize(cursor.size ?? 4, cursor.codeName || 'CPTOP');
      } catch {
        return null;
      }
      // Scalar frame copies carry no source datatype in NCS. Treating all of them as integer
      // makes a typed object/string call site conflict with otherwise identical forwarded calls.
      dataType = rootSlots === 3
        ? NWScriptDataType.VECTOR
        : rootSlots > 1
          ? NWScriptDataType.STRUCTURE
          : null;
    } else {
      return null;
    }

    if (rootSlots <= 0 || totalConsumed + rootSlots > totalSlots) return null;

    let contribution = 0;
    while (contribution < rootSlots && cursor) {
      if (RETURN_RESERVATION_BACKWARD_STOPS.has(cursor.code) || cursor.code === OP_RSADD) {
        return null;
      }
      const delta = instructionForwardStackSlotDelta(cursor);
      if (delta === null) return null;
      contribution += delta;
      cursor = cursor.prevInstr;
    }
    if (contribution !== rootSlots) return null;

    inferred.push({ dataType, stackSlots: rootSlots });
    totalConsumed += rootSlots;
  }

  return totalConsumed === totalSlots ? inferred : null;
}

/** Locate the exact RSADD instruction(s) reserved for a user-call result. */
export function findJsrReturnReservation(
  jsr: NWScriptInstruction,
  parameterSlots: number,
  returnBytes: number
): JsrReturnReservation | null {
  let cursor: NWScriptInstruction | null | undefined = jsr.prevInstr;
  let contribution = 0;

  while (contribution < parameterSlots && cursor) {
    if (RETURN_RESERVATION_BACKWARD_STOPS.has(cursor.code)) {
      return null;
    }
    const delta = instructionForwardStackSlotDelta(cursor);
    if (delta === null) {
      return null;
    }
    contribution += delta;
    cursor = cursor.prevInstr;
  }

  if (contribution !== parameterSlots || !cursor) {
    return null;
  }

  const returnSlots = returnBytes / 4;
  const reverseInstructions: NWScriptInstruction[] = [];
  const reverseFieldTypes: NWScriptDataType[] = [];
  for (let slot = 0; slot < returnSlots; slot += 1) {
    if (cursor?.code !== OP_RSADD) return null;
    const fieldType = rsaddTypeToDataType(cursor.type);
    if (fieldType === null) return null;
    reverseInstructions.push(cursor);
    reverseFieldTypes.push(fieldType);
    cursor = cursor.prevInstr;
  }
  const instructions = reverseInstructions.reverse();
  const fieldTypes = reverseFieldTypes.reverse();
  if (returnSlots === 1) {
    return { dataType: fieldTypes[0], instructions };
  }
  if (
    returnSlots === 3 &&
    fieldTypes.every(dataType => dataType === NWScriptDataType.FLOAT)
  ) {
    return { dataType: NWScriptDataType.VECTOR, instructions };
  }
  return {
    dataType: NWScriptDataType.STRUCTURE,
    instructions,
    structureFieldTypes: fieldTypes,
  };
}

/**
 * Recover a non-void routine's scalar/vector return type and argument width together.
 *
 * NCS puts the caller's typed RSADD return reservation immediately below the argument
 * expressions. Walking backward from JSR therefore recovers both pieces of ABI evidence even
 * when a conservative CFG does not assign the callee's shared MOVSP/RETN epilogue to its body.
 * Calls whose argument expression crosses another JSR cannot be proven by this local walk and
 * are ignored; every provable call must agree.
 */
export function inferSubroutineCallAbiFromCallSites(
  script: NWScript,
  targetEntryPc: number,
  returnBytes: number,
  shouldCountJsr?: (instr: NWScriptInstruction) => boolean
): SubroutineCallAbiInference | null {
  if (returnBytes <= 0 || returnBytes % 4 !== 0) return null;

  let consensus: SubroutineCallAbiInference | null = null;
  for (const instruction of script.instructions.values()) {
    if (
      instruction.code !== OP_JSR ||
      instruction.offset === undefined ||
      instruction.address + toSignedInt32(instruction.offset) !== targetEntryPc ||
      (shouldCountJsr && !shouldCountJsr(instruction))
    ) {
      continue;
    }

    let cursor: NWScriptInstruction | null | undefined = instruction.prevInstr;
    let parameterSlots = 0;
    let atCall: SubroutineCallAbiInference | null = null;
    while (cursor) {
      if (cursor.code === OP_RSADD && parameterSlots >= 0) {
        const reservation = findJsrReturnReservation(
          instruction,
          parameterSlots,
          returnBytes
        );
        if (reservation) {
          atCall = {
            parameterSlots,
            returnType: reservation.dataType,
            returnStructureFieldTypes: reservation.structureFieldTypes,
          };
          break;
        }
      }
      if (RETURN_RESERVATION_BACKWARD_STOPS.has(cursor.code)) break;
      const delta = instructionForwardStackSlotDelta(cursor);
      if (delta === null) break;
      parameterSlots += delta;
      cursor = cursor.prevInstr;
    }

    if (!atCall) continue;
    if (
      consensus &&
      (consensus.parameterSlots !== atCall.parameterSlots ||
        consensus.returnType !== atCall.returnType ||
        JSON.stringify(consensus.returnStructureFieldTypes ?? []) !==
          JSON.stringify(atCall.returnStructureFieldTypes ?? []))
    ) {
      return null;
    }
    consensus = atCall;
  }

  return consensus;
}

/**
 * Recover the caller-side return reservation immediately below a JSR's argument expressions.
 * A result is accepted only when every considered call site has the same reservation. This avoids
 * classifying an unrelated local RSADD before a void no-argument call as a function result.
 */
export function inferSubroutineReturnTypeFromCallSites(
  script: NWScript,
  targetEntryPc: number,
  parameterSlots: number,
  returnBytes: number,
  shouldCountJsr?: (instr: NWScriptInstruction) => boolean
): NWScriptDataType {
  if (returnBytes <= 0 || returnBytes % 4 !== 0) {
    return NWScriptDataType.VOID;
  }

  let inferred: NWScriptDataType | null = null;
  let callCount = 0;
  for (const instruction of script.instructions.values()) {
    if (
      instruction.code !== OP_JSR ||
      instruction.offset === undefined ||
      instruction.address + toSignedInt32(instruction.offset) !== targetEntryPc ||
      (shouldCountJsr && !shouldCountJsr(instruction))
    ) {
      continue;
    }

    callCount += 1;
    const atCall = findJsrReturnReservation(
      instruction,
      parameterSlots,
      returnBytes
    )?.dataType ?? null;
    if (atCall === null || (inferred !== null && atCall !== inferred)) {
      return NWScriptDataType.VOID;
    }
    inferred = atCall;
  }

  return callCount > 0 && inferred !== null ? inferred : NWScriptDataType.VOID;
}

/** RSADD addresses that belong to user-function result reservations, not local declarations. */
export function collectJsrReturnReservationAddresses(
  functions: NWScriptFunction[],
  script: NWScript
): Set<number> {
  const addresses = new Set<number>();
  const byEntry = new Map(
    functions
      .filter(func => func.returnType !== NWScriptDataType.VOID)
      .map(func => [func.entryBlock.startInstruction.address, func] as const)
  );

  for (const instruction of script.instructions.values()) {
    if (instruction.code !== OP_JSR || instruction.offset === undefined) continue;
    const func = byEntry.get(
      instruction.address + toSignedInt32(instruction.offset)
    );
    if (!func) continue;
    const reservation = findJsrReturnReservation(
      instruction,
      nwscriptParametersTotalBytes(func.parameters) / 4,
      nwscriptDataTypeStackBytes(func.returnType)
    );
    for (const reserved of reservation?.instructions ?? []) {
      addresses.add(reserved.address);
    }
  }

  return addresses;
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
    if (instr.address + toSignedInt32(instr.offset) !== targetEntryPc) {
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
      allTargets.add(instr.address + toSignedInt32(instr.offset));
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
    // The raw caller delta includes the result reservation placed below argument expressions.
    // Remove it before using call-site inference as a fallback for an otherwise untyped callee.
    const inferred = Math.max(
      0,
      (map.get(entryPc) ?? 0) -
        (f.returnStackSlots ?? stackSlotsForDataType(f.returnType))
    );
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
  returnStackSlots: number;
  returnStructureFieldTypes?: NWScriptDataType[];
  parameters: NWScriptFunctionParameter[];
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
      returnStackSlots:
        f.returnStackSlots ?? stackSlotsForDataType(f.returnType),
      returnStructureFieldTypes: f.returnStructureFieldTypes,
      parameters: [...f.parameters].sort((a, b) => b.offset - a.offset),
    });
  }
  return map;
}
