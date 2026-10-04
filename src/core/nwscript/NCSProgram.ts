import { BinaryReader } from "@core/binary/BinaryReader";
import { Endians } from "@core/enums/resource/Endians";
import type { INWScriptDefAction } from "@core/interface/nwscript/INWScriptDefAction";
import { NWScriptInstruction } from "@core/nwscript/NWScriptInstruction";
import { OP_T } from "@core/nwscript/NWScriptOPCodes";
import { parseNcsInstruction } from "@core/nwscript/parseNcsInstruction";

export interface NCSProgramOptions {
  /** Optional action table used while decoding ACTION opcodes. */
  actionsMap?: { [key: number]: INWScriptDefAction };
}

/**
 * Parsed NCS bytecode program (header + instruction map).
 * Game-agnostic: no GameState, instances, or resource loading.
 */
export class NCSProgram {
  name: string = '';
  prog: number = OP_T;
  progSize: number = 0;
  code: Uint8Array = new Uint8Array();
  instructions: Map<number, NWScriptInstruction> = new Map();
  isVerified: boolean = false;
  actionsMap: { [key: number]: INWScriptDefAction } = {};

  constructor(data?: Uint8Array, options: NCSProgramOptions = {}) {
    this.actionsMap = options.actionsMap ?? {};
    if (data instanceof Uint8Array) {
      const textDecoder = new TextDecoder();
      if (textDecoder.decode(data.slice(0, 8)) === 'NCS V1.0') {
        this.init(data);
      }
    }
  }

  verifyNCS(reader: BinaryReader): boolean {
    reader.seek(0);
    if (this.isVerified || reader.readChars(8) === 'NCS V1.0') {
      return (this.isVerified = true);
    }
    return false;
  }

  /**
   * @param progSize - Provided for ScriptSituation payloads that omit the NCS header.
   */
  init(data: Uint8Array, progSize?: number): void {
    this.instructions = new Map();
    let reader = new BinaryReader(data, Endians.BIG);

    this.prog = OP_T;
    this.code = data;
    this.progSize = progSize;

    if (!progSize) {
      reader.skip(8);
      this.prog = reader.readByte();
      if (this.prog !== OP_T) {
        throw new Error(`Invalid program type, expected OP_T (0x42) but got ${this.prog}`);
      }
      this.progSize = reader.readUInt32();
      reader = reader.slice(13, this.progSize);
      this.code = reader.buffer;
      this.progSize = this.code.length;
    }

    let instrIdx = 0;
    let lastInstruction: NWScriptInstruction = null;
    while (reader.position < this.progSize) {
      lastInstruction = this.parseInstruction(reader, lastInstruction, instrIdx++);
    }

    reader.position = 0;
  }

  parseInstruction(
    reader: BinaryReader,
    lastInstruction: NWScriptInstruction,
    index: number
  ): NWScriptInstruction {
    const instruction = parseNcsInstruction(reader, lastInstruction, index, this.actionsMap);
    this.instructions.set(instruction.address, instruction);
    return instruction;
  }

  toAssembly(): string {
    if (!this.instructions || this.instructions.size === 0) {
      return '';
    }
    const sortedInstructions = Array.from(this.instructions.values()).sort(
      (a, b) => a.address - b.address
    );
    return sortedInstructions.map((instr) => instr.toAssemblyString()).join('\n');
  }
}
