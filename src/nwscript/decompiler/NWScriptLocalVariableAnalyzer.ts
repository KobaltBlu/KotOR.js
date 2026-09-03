import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  OP_ACTION,
  OP_CONST,
  OP_CPDOWNSP,
  OP_JMP,
  OP_JNZ,
  OP_JSR,
  OP_JZ,
  OP_MOVSP,
  OP_NEG,
  OP_NOP,
  OP_RESTOREBP,
  OP_RETN,
  OP_RSADD,
  OP_SAVEBP,
} from "@/nwscript/NWScriptOPCodes";
import { inferActionReturnFromStoreCleanup } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  getUnaryDataType,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";

/** Represents a detected local variable allocation and optional declaration initializer. */
export interface NWScriptLocalInit {
  offset: number;
  dataType: NWScriptDataType;
  initialValue: any;
  hasInitializer: boolean;
  instructionAddress: number;
  /** CPDOWNSP whose value is represented directly on the declaration, when known. */
  initializerWriteAddress?: number;
}

/**
 * Recovers source local allocations from RSADD sites.
 *
 * Initializer recognition follows the compiler's straight-line stack lifetime rather than a
 * fixed byte/instruction window: RSADD reserves the variable, an expression leaves one scalar
 * value, CPDOWNSP -8 stores it, and MOVSP -4 discards the temporary. Control flow, a completed
 * stack lifetime, a new source allocation, or a void call are semantic barriers.
 */
export class NWScriptLocalVariableAnalyzer {
  private script: NWScript;
  private localInits: NWScriptLocalInit[] = [];
  private processedAddresses: Set<number> = new Set();
  private globalInitAddresses: Set<number> = new Set();
  private ignoredAllocationAddresses: Set<number>;

  constructor(
    script: NWScript,
    globalInits: NWScriptGlobalInit[] = [],
    ignoredAllocationAddresses: Set<number> = new Set()
  ) {
    this.script = script;
    this.ignoredAllocationAddresses = ignoredAllocationAddresses;
    for (const globalInit of globalInits) {
      this.globalInitAddresses.add(globalInit.instructionAddress);
    }
  }

  analyze(): NWScriptLocalInit[] {
    this.localInits = [];
    this.processedAddresses.clear();

    if (!this.script.instructions) return [];

    const sortedInstructions = Array.from(this.script.instructions.values())
      .sort((left, right) => left.address - right.address);
    for (const rsadd of sortedInstructions) {
      if (
        rsadd.code !== OP_RSADD ||
        this.globalInitAddresses.has(rsadd.address) ||
        this.ignoredAllocationAddresses.has(rsadd.address)
      ) {
        continue;
      }

      const dataType = this.dataTypeForAllocation(rsadd);
      if (dataType === null) continue;

      const pattern = this.findScalarInitializerPattern(rsadd);
      const literal = pattern
        ? this.recoverImmediateLiteral(rsadd, pattern.write, dataType)
        : undefined;
      this.localInits.push({
        offset: pattern?.write.offset ?? 0,
        dataType,
        initialValue: literal,
        hasInitializer: pattern !== null,
        instructionAddress: rsadd.address,
        initializerWriteAddress: pattern?.write.address,
      });

      this.processedAddresses.add(rsadd.address);
      if (pattern) this.markLinearRange(rsadd.nextInstr, pattern.cleanup);
    }

    return this.localInits;
  }

  private findScalarInitializerPattern(
    rsadd: NWScriptInstruction
  ): { write: NWScriptInstruction; cleanup: NWScriptInstruction } | null {
    let current: NWScriptInstruction | null | undefined = rsadd.nextInstr;
    const visited = new Set<number>();
    let hasPendingJsrReservation = false;

    while (current && !visited.has(current.address)) {
      visited.add(current.address);

      if (current.code === OP_RSADD) {
        if (this.ignoredAllocationAddresses.has(current.address)) {
          hasPendingJsrReservation = true;
          current = current.nextInstr;
          continue;
        }
        return null;
      }

      if (current.code === OP_CPDOWNSP) {
        if (toSignedInt32(current.offset) !== -8 || current.size !== 4) return null;
        const cleanup = this.nextNonNop(current.nextInstr);
        return cleanup?.code === OP_MOVSP && toSignedInt32(cleanup.offset) === -4
          ? { write: current, cleanup }
          : null;
      }

      if (
        current.code === OP_MOVSP ||
        current.code === OP_JMP ||
        current.code === OP_JZ ||
        current.code === OP_JNZ ||
        current.code === OP_RETN ||
        current.code === OP_SAVEBP ||
        current.code === OP_RESTOREBP
      ) {
        return null;
      }

      if (current.code === OP_ACTION) {
        const declaredVoid = current.actionDefinition?.type === NWScriptDataType.VOID;
        if (declaredVoid && !inferActionReturnFromStoreCleanup(current)) {
          return null;
        }
        current = current.nextInstr;
        continue;
      }

      if (current.code === OP_JSR) {
        if (!hasPendingJsrReservation) return null;
        hasPendingJsrReservation = false;
      }

      current = current.nextInstr;
    }
    return null;
  }

  private recoverImmediateLiteral(
    rsadd: NWScriptInstruction,
    write: NWScriptInstruction,
    dataType: NWScriptDataType
  ): string | number | undefined {
    const constant = rsadd.nextInstr;
    if (
      !constant ||
      constant.code !== OP_CONST ||
      getUnaryDataType(constant.type) !== dataType
    ) {
      return undefined;
    }

    let cursor: NWScriptInstruction | null | undefined = constant.nextInstr;
    let negate = false;
    if (cursor?.code === OP_NEG) {
      negate = true;
      cursor = cursor.nextInstr;
    }
    cursor = this.nextNonNop(cursor);
    if (cursor !== write) return undefined;

    let value: string | number | undefined;
    if (dataType === NWScriptDataType.INTEGER) value = constant.integer;
    else if (dataType === NWScriptDataType.FLOAT) value = constant.float;
    else if (dataType === NWScriptDataType.STRING) value = constant.string;
    else if (dataType === NWScriptDataType.OBJECT) value = constant.object;
    if (value === undefined) return undefined;

    return negate && typeof value === 'number' ? -value : value;
  }

  private nextNonNop(
    start: NWScriptInstruction | null | undefined
  ): NWScriptInstruction | null {
    let current = start;
    const visited = new Set<number>();
    while (current && current.code === OP_NOP && !visited.has(current.address)) {
      visited.add(current.address);
      current = current.nextInstr;
    }
    return current ?? null;
  }

  private markLinearRange(
    start: NWScriptInstruction | null | undefined,
    end: NWScriptInstruction
  ): void {
    let current = start;
    const visited = new Set<number>();
    while (current && !visited.has(current.address)) {
      visited.add(current.address);
      this.processedAddresses.add(current.address);
      if (current === end) break;
      current = current.nextInstr;
    }
  }

  private dataTypeForAllocation(instruction: NWScriptInstruction): NWScriptDataType | null {
    const dataType = getUnaryDataType(instruction.type);
    return dataType === null ||
      dataType === NWScriptDataType.VOID ||
      dataType === NWScriptDataType.VECTOR ||
      dataType === NWScriptDataType.STRUCTURE
      ? null
      : dataType;
  }

  getLocalInits(): NWScriptLocalInit[] {
    return this.localInits;
  }

  isInitializationInstruction(address: number): boolean {
    return this.processedAddresses.has(address);
  }

  getInitForOffset(offset: number): NWScriptLocalInit | null {
    return this.localInits.find(init => init.offset === offset) || null;
  }
}
