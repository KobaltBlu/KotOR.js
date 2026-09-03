import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { INWScriptDefAction } from '@/interface/nwscript/INWScriptDefAction';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import {
  OP_ACTION,
  OP_CPDOWNBP,
  OP_CPDOWNSP,
  OP_CPTOPBP,
  OP_CPTOPSP,
  OP_CONST,
  OP_DECIBP,
  OP_DECISP,
  OP_DESTRUCT,
  OP_EQUAL,
  OP_INCIBP,
  OP_INCISP,
  OP_JMP,
  OP_JNZ,
  OP_JSR,
  OP_JZ,
  OP_MOVSP,
  OP_NEQUAL,
  OP_STORE_STATE,
  OP_T,
} from '@/nwscript/NWScriptOPCodes';
import { NWScriptDecompiler } from '@/nwscript/decompiler/NWScriptDecompiler';
import { NWScriptControlFlowGraph } from '@/nwscript/decompiler/NWScriptControlFlowGraph';
import { NWScriptFunctionAnalyzer } from '@/nwscript/decompiler/NWScriptFunctionAnalyzer';
import { NWScriptGlobalVariableAnalyzer } from '@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer';
import { inferSubroutineCallAbiFromCallSites } from '@/nwscript/decompiler/NWScriptArgumentStackLayout';

interface CompileResult {
  ok: boolean;
  error: string;
  bytecode: Uint8Array;
}

interface ExternalCompiler {
  addSources(sources: Record<string, string | Uint8Array>, resType?: number): ExternalCompiler;
  compile(name: string, source?: string): CompileResult;
  disassemble(ncs: Uint8Array): string;
  dispose(): void;
}

interface ExternalCompilerModule {
  NWScriptCompiler: {
    create(options: {
      languageSpec: string;
      optimizationFlags: number;
    }): Promise<ExternalCompiler>;
  };
  OptimizationFlags: {
    O0: number;
    O3: number;
  };
}

const compilerModulePath = process.env.NWSCRIPT_WASM_MODULE;
const languageSpecPath = process.env.NWSCRIPT_LANGUAGE_SPEC;
const describeWithCompiler = compilerModulePath && languageSpecPath ? describe : describe.skip;

let actions: Record<number, INWScriptDefAction> = {
  1: { name: 'PrintString', comment: '', type: NWScriptDataType.VOID, args: [NWScriptDataType.STRING] },
  2: {
    name: 'PrintFloat',
    comment: '',
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.FLOAT, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER],
  },
  4: { name: 'PrintInteger', comment: '', type: NWScriptDataType.VOID, args: [NWScriptDataType.INTEGER] },
  5: { name: 'PrintObject', comment: '', type: NWScriptDataType.VOID, args: [NWScriptDataType.OBJECT] },
  6: {
    name: 'AssignCommand',
    comment: '',
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.ACTION],
  },
  7: {
    name: 'DelayCommand',
    comment: '',
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.FLOAT, NWScriptDataType.ACTION],
  },
  141: {
    name: 'PrintVector',
    comment: '',
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.VECTOR, NWScriptDataType.INTEGER],
  },
  142: {
    name: 'Vector',
    comment: '',
    type: NWScriptDataType.VECTOR,
    args: [NWScriptDataType.FLOAT, NWScriptDataType.FLOAT, NWScriptDataType.FLOAT],
  },
};

const dataTypesBySourceName: Record<string, NWScriptDataType> = {
  void: NWScriptDataType.VOID,
  int: NWScriptDataType.INTEGER,
  float: NWScriptDataType.FLOAT,
  string: NWScriptDataType.STRING,
  object: NWScriptDataType.OBJECT,
  vector: NWScriptDataType.VECTOR,
  action: NWScriptDataType.ACTION,
  object_id: NWScriptDataType.OBJECT,
  effect: NWScriptDataType.EFFECT,
  event: NWScriptDataType.EVENT,
  location: NWScriptDataType.LOCATION,
  talent: NWScriptDataType.TALENT,
};

function splitParameters(parameters: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < parameters.length; index++) {
    const char = parameters[index];
    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth--;
    else if (char === ',' && depth === 0) {
      result.push(parameters.slice(start, index));
      start = index + 1;
    }
  }
  const tail = parameters.slice(start).trim();
  if (tail) result.push(tail);
  return result;
}

/** Parse the numbered engine-action ABI directly from nwscript.nss. */
function parseActionDefinitions(languageSpec: string): Record<number, INWScriptDefAction> {
  const marker = languageSpec.indexOf('string sLanguage = "nwscript";');
  if (marker < 0) throw new Error('nwscript language marker is missing');
  const declarations = languageSpec
    .slice(marker)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  const typeNames = Object.keys(dataTypesBySourceName).join('|');
  const declarationPattern = new RegExp(
    `\\b(${typeNames})\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\(([\\s\\S]*?)\\)\\s*;`,
    'g'
  );
  const parsed: Record<number, INWScriptDefAction> = {};
  let match: RegExpExecArray | null;
  let actionId = 0;
  while ((match = declarationPattern.exec(declarations)) !== null) {
    const [, returnType, name, rawParameters] = match;
    const args = splitParameters(rawParameters).map(parameter => {
      const typeName = parameter.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\b/)?.[1];
      const dataType = typeName ? dataTypesBySourceName[typeName.toLowerCase()] : undefined;
      if (dataType === undefined) {
        throw new Error(`Unknown action parameter type in ${name}: ${parameter.trim()}`);
      }
      return dataType;
    });
    parsed[actionId++] = {
      name,
      comment: '',
      type: dataTypesBySourceName[returnType],
      args,
    };
  }
  if (actionId < 700) {
    throw new Error(`Only parsed ${actionId} engine actions from nwscript.nss`);
  }
  return parsed;
}

function findNssFiles(root: string): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.nss')) files.push(path);
    }
  };
  visit(root);
  return files;
}

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Lightweight, runtime-independent NCS decoder used by the external compiler gate. */
function decodeNcs(bytecode: Uint8Array): NWScript {
  const signature = new TextDecoder('latin1').decode(bytecode.slice(0, 8));
  if (signature !== 'NCS V1.0' || bytecode.length < 13 || bytecode[8] !== OP_T) {
    throw new Error('Invalid NCS header');
  }
  const header = new DataView(bytecode.buffer, bytecode.byteOffset, bytecode.byteLength);
  const declaredSize = header.getUint32(9, false);
  if (declaredSize !== bytecode.length) {
    throw new Error(`NCS size mismatch: header=${declaredSize}, actual=${bytecode.length}`);
  }

  const code = bytecode.slice(13);
  const view = new DataView(code.buffer, code.byteOffset, code.byteLength);
  const instructions = new Map<number, NWScriptInstruction>();
  let offset = 0;
  let index = 0;
  let previous: NWScriptInstruction | undefined;
  const requireBytes = (count: number) => {
    if (offset + count > code.length) throw new Error(`Truncated NCS operand at code offset ${offset}`);
  };
  const u8 = () => { requireBytes(1); const value = view.getUint8(offset); offset += 1; return value; };
  const u16 = () => { requireBytes(2); const value = view.getUint16(offset, false); offset += 2; return value; };
  const i16 = () => { requireBytes(2); const value = view.getInt16(offset, false); offset += 2; return value; };
  const i32 = () => { requireBytes(4); const value = view.getInt32(offset, false); offset += 4; return value; };
  const f32 = () => { requireBytes(4); const value = view.getFloat32(offset, false); offset += 4; return value; };

  while (offset < code.length) {
    const address = offset;
    const opCode = u8();
    const opType = opCode === OP_T ? i32() : u8();
    const instruction = {
      code: opCode,
      type: opCode === OP_T ? 0 : opType,
      address,
      index: index++,
      codeName: `OP_${opCode.toString(16).padStart(2, '0')}`,
      prevInstr: previous,
    } as NWScriptInstruction;

    if (previous) previous.nextInstr = instruction;

    switch (opCode) {
      case OP_CPDOWNSP:
      case OP_CPTOPSP:
      case OP_CPDOWNBP:
      case OP_CPTOPBP:
        instruction.offset = i32();
        instruction.size = i16();
        break;
      case OP_CONST:
        if (instruction.type === NWScriptDataType.INTEGER) instruction.integer = i32();
        else if (instruction.type === NWScriptDataType.FLOAT) instruction.float = f32();
        else if (instruction.type === NWScriptDataType.STRING) {
          const length = u16();
          requireBytes(length);
          instruction.string = new TextDecoder('latin1').decode(code.slice(offset, offset + length));
          offset += length;
        } else if (instruction.type === NWScriptDataType.OBJECT) instruction.object = i32();
        else throw new Error(`Unsupported CONST type ${instruction.type} at ${address}`);
        break;
      case OP_ACTION:
        instruction.action = u16();
        instruction.argCount = u8();
        instruction.actionDefinition = actions[instruction.action];
        break;
      case OP_EQUAL:
      case OP_NEQUAL:
        if (instruction.type === NWScriptDataType.STRUCTURE) instruction.sizeOfStructure = u16();
        break;
      case OP_MOVSP:
      case OP_JMP:
      case OP_JSR:
      case OP_JZ:
      case OP_DECISP:
      case OP_INCISP:
      case OP_JNZ:
      case OP_DECIBP:
      case OP_INCIBP:
        instruction.offset = i32();
        break;
      case OP_DESTRUCT:
        instruction.sizeToDestroy = i16();
        instruction.offsetToSaveElement = i16();
        instruction.sizeOfElementToSave = i16();
        break;
      case OP_STORE_STATE:
        instruction.bpOffset = i32();
        instruction.spOffset = i32();
        break;
      case OP_T:
        instruction.size = opType;
        break;
    }

    instruction.instructionSize = offset - address;
    instructions.set(address, instruction);
    previous = instruction;
  }

  return { instructions, name: '' } as NWScript;
}

// Keep the external compiler optional: CI/unit tests do not need to download a toolchain,
// while maintainers can run the same semantic round-trip gate against any compatible build.
describeWithCompiler('NWScriptDecompiler compiler round trips', () => {
  let compiler: ExternalCompiler;

  beforeAll(async () => {
    const dynamicImport = new Function('specifier', 'return import(specifier);') as (
      specifier: string
    ) => Promise<ExternalCompilerModule>;
    const module = await dynamicImport(compilerModulePath as string);
    const languageSpec = readFileSync(languageSpecPath as string, 'utf8');
    actions = parseActionDefinitions(languageSpec);
    expect(actions[1]?.name).toBe('PrintString');
    expect(actions[141]?.name).toBe('PrintVector');
    compiler = await module.NWScriptCompiler.create({
      languageSpec,
      optimizationFlags: process.env.NWSCRIPT_OPTIMIZATION === 'O3'
        ? module.OptimizationFlags.O3
        : module.OptimizationFlags.O0,
    });
  });

  afterAll(() => compiler?.dispose());

  function compile(name: string, source: string): Uint8Array {
    const result = compiler.compile(name, source);
    if (!result.ok) {
      throw new Error(`${name}: ${result.error}`);
    }
    return result.bytecode;
  }

  function roundTrip(name: string, source: string, requireExact = true): string {
    const ncs = compile(name, source);
    if (process.env.NWSCRIPT_DUMP_CASE === name) {
      console.log(compiler.disassemble(ncs));
    }
    const script = decodeNcs(ncs);
    script.name = name;
    const decompiler = new NWScriptDecompiler(script);
    const decompiled = decompiler.decompile();
    if (process.env.NWSCRIPT_DUMP_CASE === name) {
      const cfg = decompiler.getControlFlowGraph();
      console.log(JSON.stringify({
        functions: decompiler.getFunctions().map(func => ({
          entry: `0x${func.entryBlock.startInstruction.address.toString(16)}`,
          name: func.name,
          returnType: NWScriptDataType[func.returnType],
          parameters: func.parameters.map(parameter => ({
            type: NWScriptDataType[parameter.dataType],
            offset: parameter.offset,
            stackSlots: parameter.stackSlots,
            fields: parameter.structureFieldTypes?.map(type => NWScriptDataType[type]),
          })),
        })),
        subroutineEntries: [...(cfg?.subroutineEntries.keys() ?? [])].map(address => `0x${address.toString(16)}`),
        callbackEntries: [...(cfg?.callbackEntries.keys() ?? [])].map(address => `0x${address.toString(16)}`),
        storeStateJmpTargets: [...(cfg?.storeStateJmpTargets ?? [])].map(address => `0x${address.toString(16)}`),
        blocks: cfg?.getBlocksInOrder().map(block => ({
          id: block.id,
          start: `0x${block.startInstruction.address.toString(16)}`,
          end: `0x${block.endInstruction.address.toString(16)}`,
          exitType: block.exitType,
          successors: cfg.getIntraProceduralSuccessors(block, false).map(successor => ({
            id: successor.id,
            edge: cfg.getEdge(block, successor)?.type,
          })),
        })),
      }, null, 2));
      console.log(JSON.stringify(decompiler.getControlStructures().map(structure => ({
        type: structure.type,
        header: structure.headerBlock?.id,
        body: structure.bodyBlocks?.map(block => block.id),
        else: structure.elseBlocks?.map(block => block.id),
        increment: structure.incrementBlock?.id,
        init: structure.initBlock?.id,
        exit: structure.exitBlock?.id,
      })), null, 2));
      console.log(decompiled);
    }

    expect(decompiled).not.toContain('// Error during decompilation:');
    expect(decompiled).not.toContain('__NCS_DECOMPILER_');
    expect(decompiled).not.toContain('__NCS_ACTION_');

    const rebuilt = compiler.compile(`${name}_rebuilt`, decompiled);
    if (!rebuilt.ok) {
      throw new Error(`${name} decompiled source did not compile: ${rebuilt.error}\n${decompiled}`);
    }
    if (process.env.NWSCRIPT_DUMP_CASE === name) {
      console.log(compiler.disassemble(rebuilt.bytecode));
    }
    expect(rebuilt.ok).toBe(true);
    // O3 legitimately folds immutable locals into their uses. Reconstructed source can therefore
    // be semantically identical and recompilable while producing a different stack layout.
    if (requireExact && process.env.NWSCRIPT_OPTIMIZATION !== 'O3') {
      expect(Buffer.from(rebuilt.bytecode).equals(Buffer.from(ncs))).toBe(true);
    }
    return decompiled;
  }

  test.each([
    {
      name: 'literals_and_calls',
      source: `
        void main() {
          int i = 7;
          float f = 1.25;
          string s = "hello";
          object o = OBJECT_SELF;
          vector v = Vector(1.0, 2.0, 3.0);
          PrintInteger(i);
          PrintFloat(f);
          PrintString(s);
          PrintObject(o);
          PrintVector(v, FALSE);
        }
      `,
    },
    {
      name: 'operators',
      source: `
        void main() {
          int a = 7;
          int b = 3;
          float x = 2.5;
          PrintInteger(a + b);
          PrintInteger(a - b);
          PrintInteger(a * b);
          PrintInteger(a / b);
          PrintInteger(a % b);
          PrintInteger((a << 1) | (b & 1));
          PrintInteger((a >> 1) ^ ~b);
          PrintInteger(a > b && b != 0);
          PrintInteger(a <= b || !b);
          PrintFloat(x * 2.0);
        }
      `,
    },
    {
      name: 'structured_control_flow',
      source: `
        void main() {
          int i;
          for (i = 0; i < 5; i++) {
            if (i == 1) continue;
            if (i == 4) break;
            PrintInteger(i);
          }
          while (i > 0) {
            i--;
          }
          do {
            i++;
          } while (i < 2);
          if (i == 2) {
            PrintString("yes");
          } else {
            PrintString("no");
          }
        }
      `,
    },
    {
      name: 'nested_short_circuit_and',
      source: `
        void main() {
          int a = 1;
          int b = 2;
          float c = 0.25;
          float d = 0.75;
          if (((a > 0 && b > 0) && ((c < 0.5) && (d > 0.0)))) {
            PrintString("all true");
          }
        }
      `,
    },
    {
      name: 'switch_control_flow',
      source: `
        void main() {
          int value = 2;
          switch (value) {
            case 1:
              PrintString("one");
              break;
            case 2:
              PrintString("two");
            case 3:
              PrintString("three");
              break;
            default:
              PrintString("other");
              break;
          }
          PrintInteger(value);
        }
      `,
    },
    {
      name: 'nested_and_large_switch_control_flow',
      requireExact: false,
      source: `
        void main() {
          int choice = Random(4);
          int mode = Random(2);
          int result = 0;
          int mapped = 0;

          if (choice > 0) {
            switch (choice) {
              case 1:
                switch (mode) {
                  case 0: result = 10; break;
                  case 1: result = 11; break;
                }
                break;
              case 2:
                if (mode == 0) result = 20;
                if (mode == 1) {
                  if (result == 0) result = 21;
                  else result = 22;
                }
                break;
              case 3:
                switch (mode) {
                  case 0: result = 30; break;
                  case 1: result = 31; break;
                }
                break;
            }
          } else {
            result = -1;
          }

          switch (result) {
            case 10: mapped = 110; break;
            case 11: mapped = 111; break;
            case 20: mapped = 120; break;
            case 21: mapped = 121; break;
            case 22: mapped = 122; break;
            case 30: mapped = 130; break;
            case 31: mapped = 131; break;
          }
          PrintInteger(mapped);
        }
      `,
    },
    {
      name: 'switch_with_more_than_sixty_four_cases',
      requireExact: false,
      source: `
        void main() {
          int value = Random(80);
          switch (value) {
            ${Array.from({ length: 80 }, (_, value) =>
              `case ${value}: PrintInteger(${value}); break;`
            ).join('\n            ')}
            default: PrintInteger(-1); break;
          }
        }
      `,
    },
    {
      name: 'user_functions',
      source: `
        int Add(int a, int b) {
          return a + b;
        }

        vector MakeVector(float x, float y, float z) {
          return Vector(x, y, z);
        }

        void main() {
          PrintInteger(Add(2, 3));
          PrintVector(MakeVector(1.0, 2.0, 3.0), FALSE);
        }
      `,
    },
    {
      name: 'user_call_local_type_alignment',
      requireExact: false,
      source: `
        int InitialValue() {
          return 3;
        }

        void main() {
          int fromUserCall = InitialValue();
          int counter = 0;
          counter++;
          PrintInteger(fromUserCall + counter);
        }
      `,
    },
    {
      name: 'user_function_abi_with_action_thunk_and_nested_call_argument',
      requireExact: false,
      source: `
        int Validate(object target) {
          AssignCommand(target, PrintString("queued"));
          return GetIsObjectValid(target);
        }

        int Forward(object target) {
          return Validate(target);
        }

        int ForwardAgain(object target) {
          return Forward(target);
        }

        void main() {
          PrintInteger(ForwardAgain(GetFirstPC()));
        }
      `,
    },
    {
      name: 'nonvoid_shared_return_epilogue',
      requireExact: false,
      source: `
        int Classify(int value) {
          if (value > 1) {
            if (value > 2) {
              return 3;
            }
            return 2;
          }
          return 0;
        }

        void main() {
          PrintInteger(Classify(3));
        }
      `,
    },
    {
      name: 'globals',
      source: `
        int gCount = 2;
        string gLabel = "global";

        void Increment() {
          gCount++;
        }

        void main() {
          Increment();
          PrintInteger(gCount);
          PrintString(gLabel);
        }
      `,
    },
    {
      name: 'dynamic_global_initializers',
      requireExact: false,
      source: `
        object gObject = GetFirstPC();
        int gValid = GetIsObjectValid(gObject);

        void main() {
          PrintObject(gObject);
          PrintInteger(gValid);
        }
      `,
    },
    {
      name: 'dynamic_global_vector_and_engine_structure',
      requireExact: false,
      source: `
        vector gPosition = GetPosition(OBJECT_SELF);
        effect gEffect = EffectHeal(1);

        void main() {
          PrintVector(gPosition, FALSE);
          ApplyEffectToObject(DURATION_TYPE_INSTANT, gEffect, OBJECT_SELF, 0.0);
        }
      `,
    },
    {
      name: 'dynamic_global_aggregate_dependency',
      requireExact: false,
      source: `
        vector gPosition = GetPosition(OBJECT_SELF);
        float gHeight = gPosition.z;

        void main() {
          PrintVector(gPosition, FALSE);
          PrintFloat(gHeight);
        }
      `,
    },
    {
      name: 'user_function_global_initializer',
      requireExact: false,
      source: `
        int MakeGlobalValue() {
          return 7;
        }

        int gValue = MakeGlobalValue();

        void main() {
          PrintInteger(gValue);
        }
      `,
    },
    {
      name: 'user_struct_global_initializer',
      requireExact: false,
      source: `
        struct Pair {
          int count;
          object target;
        };

        struct Pair MakeGlobalPair() {
          struct Pair value;
          value.count = 7;
          value.target = OBJECT_SELF;
          return value;
        }

        struct Pair gPair = MakeGlobalPair();

        void main() {
          PrintInteger(gPair.count);
          PrintObject(gPair.target);
        }
      `,
    },
    {
      name: 'flattened_global_struct_fields',
      requireExact: false,
      source: `
        struct Pair {
          int left;
          object target;
          int right;
        };

        struct Pair gPair;

        void main() {
          gPair.left = 2;
          gPair.target = OBJECT_SELF;
          gPair.right = 3;
          PrintInteger(gPair.left + gPair.right);
          PrintObject(gPair.target);
        }
      `,
    },
    {
      name: 'global_struct_assignment_and_equality',
      requireExact: false,
      source: `
        struct Pair {
          int count;
          object target;
        };

        struct Pair gLeft;
        struct Pair gRight;

        void main() {
          gLeft.count = 2;
          gLeft.target = OBJECT_SELF;
          gRight = gLeft;
          if (gRight == gLeft) {
            PrintInteger(gRight.count);
            PrintObject(gRight.target);
          }
        }
      `,
    },
    {
      name: 'global_vector_storage_and_components',
      requireExact: false,
      source: `
        vector gPosition;

        void main() {
          gPosition = GetPosition(OBJECT_SELF);
          gPosition.z = gPosition.z + 2.0;
          PrintVector(gPosition, FALSE);
        }
      `,
    },
    {
      name: 'all_float_global_struct_equality',
      requireExact: false,
      source: `
        struct Triple {
          float first;
          float second;
          float third;
        };

        struct Triple gTriple;

        void main() {
          gTriple.first = 1.0;
          gTriple.second = 2.0;
          gTriple.third = 3.0;
          if (gTriple == gTriple) {
            PrintFloat(gTriple.second);
          }
        }
      `,
    },
    {
      name: 'flattened_local_struct_fields',
      requireExact: false,
      source: `
        struct Pair {
          int left;
          object target;
          int right;
        };

        void main() {
          struct Pair localPair;
          localPair.left = 2;
          localPair.target = OBJECT_SELF;
          localPair.right = 3;
          PrintInteger(localPair.left + localPair.right);
          PrintObject(localPair.target);
        }
      `,
    },
    {
      name: 'local_struct_assignment_and_equality',
      requireExact: false,
      source: `
        struct Pair {
          int count;
          object target;
        };

        void main() {
          struct Pair left;
          struct Pair right;
          left.count = 2;
          left.target = OBJECT_SELF;
          right = left;
          if (right == left) {
            PrintInteger(right.count);
            PrintObject(right.target);
          }
        }
      `,
    },
    {
      name: 'user_struct_parameter_and_return',
      requireExact: false,
      source: `
        struct Pair {
          int count;
          object target;
        };

        struct Pair MakePair(int count, object target) {
          struct Pair result;
          result.count = count;
          result.target = target;
          return result;
        }

        int ReadPair(struct Pair value) {
          PrintObject(value.target);
          return value.count;
        }

        void main() {
          struct Pair localPair = MakePair(7, OBJECT_SELF);
          PrintInteger(ReadPair(localPair));
        }
      `,
    },
    {
      name: 'global_struct_parameter_return_and_forwarding',
      requireExact: false,
      source: `
        struct Pair {
          int count;
          object target;
        };

        struct Pair gPair;

        struct Pair MakePair(int count, object target) {
          struct Pair result;
          result.count = count;
          result.target = target;
          return result;
        }

        struct Pair ForwardPair(struct Pair value) {
          return MakePair(value.count + 1, value.target);
        }

        int ReadPair(struct Pair value) {
          PrintObject(value.target);
          return value.count;
        }

        void main() {
          gPair.count = 7;
          gPair.target = OBJECT_SELF;
          gPair = ForwardPair(gPair);
          PrintInteger(ReadPair(gPair));
        }
      `,
    },
    {
      name: 'action_thunks',
      source: `
        void main() {
          AssignCommand(OBJECT_SELF, PrintString("assigned"));
          DelayCommand(0.25, PrintString("delayed"));
        }
      `,
    },
    {
      name: 'engine_structure_locals',
      requireExact: false,
      source: `
        void main() {
          effect localEffect = EffectVisualEffect(0);
          event localEvent = EventUserDefined(1);
          location localLocation = GetLocation(OBJECT_SELF);
          talent localTalent = TalentSpell(0);
          ApplyEffectToObject(DURATION_TYPE_INSTANT, localEffect, OBJECT_SELF);
          SignalEvent(OBJECT_SELF, localEvent);
          AssignCommand(OBJECT_SELF, ActionJumpToLocation(localLocation));
          PrintInteger(GetIsTalentValid(localTalent));
        }
      `,
    },
    {
      name: 'vector_component_assignment',
      requireExact: false,
      source: `
        void main() {
          vector position = GetPosition(OBJECT_SELF);
          position.z = position.z + 2.0;
          PrintVector(position, FALSE);
        }
      `,
    },
    {
      name: 'uninitialized_vector_component_assignments',
      requireExact: false,
      source: `
        void main() {
          vector position;
          position.x = 1.0;
          position.y = 2.0;
          position.z = 3.0;
          PrintVector(position, FALSE);
        }
      `,
    },
    {
      name: 'starting_conditional',
      source: `
        int StartingConditional() {
          return GetIsObjectValid(OBJECT_SELF);
        }
      `,
    },
    {
      name: 'conditional_object_assignment',
      requireExact: false,
      source: `
        void main() {
          string tag = GetModuleName();
          object target;
          if (tag == "") {
            target = OBJECT_SELF;
          } else {
            target = GetObjectByTag(tag, 0);
          }
          PrintObject(target);
        }
      `,
    },
  ])('$name recompiles after decompilation', ({ name, source, requireExact }) => {
    const decompiled = roundTrip(name, source, requireExact ?? true);
    if (name === 'literals_and_calls' && process.env.NWSCRIPT_OPTIMIZATION === 'O3') {
      expect(decompiled).toContain('PrintInteger(7);');
      expect(decompiled).toContain('PrintFloat(1.25f');
      expect(decompiled).toContain('PrintString("hello");');
      expect(decompiled).toContain('PrintObject(OBJECT_SELF);');
      expect(decompiled).toContain('PrintVector(');
    }
    if (name === 'operators') {
      for (const operator of ['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^', '&&', '||']) {
        expect(decompiled).toContain(` ${operator} `);
      }
    }
    if (name === 'structured_control_flow') {
      expect(decompiled).toContain('continue;');
      expect(decompiled).toContain('break;');
      expect(decompiled).toContain('while (');
      expect(decompiled).toContain('do\n');
    }
    if (name === 'nested_short_circuit_and') {
      expect(decompiled.match(/&&/g)).toHaveLength(3);
      expect(decompiled).toContain('PrintString("all true");');
    }
    if (name === 'dynamic_global_initializers') {
      expect(decompiled).toContain('object globalVar_0 = GetFirstPC();');
      expect(decompiled).toContain('int globalVar_1 = GetIsObjectValid(globalVar_0);');
    }
    if (name === 'dynamic_global_vector_and_engine_structure') {
      expect(decompiled).toContain('vector globalVar_0 = GetPosition(OBJECT_SELF);');
      expect(decompiled).toMatch(/effect globalVar_3 = EffectHeal\(1\);/);
    }
    if (name === 'dynamic_global_aggregate_dependency') {
      expect(decompiled).toContain('vector globalVar_0 = GetPosition(OBJECT_SELF);');
      expect(decompiled).toContain('float globalVar_3 = globalVar_0.z;');
    }
    if (name === 'user_function_global_initializer') {
      expect(decompiled).toMatch(/int globalVar_0 = sub\d+\(\);/);
    }
    if (name === 'user_struct_global_initializer') {
      expect(decompiled).toMatch(/struct decompiled_struct_\d+ globalVar_0 = sub\d+\(\);/);
    }
    if (name === 'switch_control_flow') {
      expect(decompiled.match(/\bcase\s+\d+:/g)).toHaveLength(3);
      expect(decompiled).toMatch(/case 2:[\s\S]*PrintString\("two"\);[\s\S]*case 3:/);
      expect(decompiled).toContain('default:');
    }
    if (name === 'conditional_object_assignment') {
      const trueAssignment = decompiled.indexOf('= OBJECT_SELF;');
      const elseKeyword = decompiled.indexOf('else', trueAssignment);
      const falseAssignment = decompiled.indexOf('= GetObjectByTag(', elseKeyword);
      expect(trueAssignment).toBeGreaterThanOrEqual(0);
      expect(elseKeyword).toBeGreaterThan(trueAssignment);
      expect(falseAssignment).toBeGreaterThan(elseKeyword);
    }
    if (name === 'nested_and_large_switch_control_flow') {
      expect(decompiled.match(/\bswitch\s*\(/g)).toHaveLength(4);
      expect(decompiled.match(/\bbreak;/g)).toHaveLength(14);
      expect(decompiled).toContain('case 31:');
      expect(decompiled.indexOf('case 31:')).toBeLessThan(decompiled.indexOf('PrintInteger('));
    }
    if (name === 'switch_with_more_than_sixty_four_cases') {
      expect(decompiled.match(/\bcase\s+\d+:/g)).toHaveLength(80);
      expect(decompiled.match(/\bbreak;/g)).toHaveLength(81);
    }
    if (name === 'vector_component_assignment') {
      expect(decompiled).toMatch(/localVar_0\.z\s*=\s*\(localVar_0\.z\s*\+\s*2\.0f\);/);
      expect(decompiled).not.toMatch(/\blocalVar_[12]\s*=/);
    }
    if (name === 'uninitialized_vector_component_assignments') {
      expect(decompiled).toContain('localVar_0.x = 1.0f;');
      expect(decompiled).toContain('localVar_0.y = 2.0f;');
      expect(decompiled).toContain('localVar_0.z = 3.0f;');
      expect(decompiled).not.toMatch(/\blocalVar_[12]\s*=/);
    }
  });

  const corpusRoot = process.env.NWSCRIPT_CORPUS_ROOT;
  const corpusTest = corpusRoot ? test : test.skip;
  corpusTest('retail source corpus decompiles to compilable NSS', () => {
    const limit = Number.parseInt(process.env.NWSCRIPT_CORPUS_LIMIT ?? '100', 10);
    const offset = Number.parseInt(process.env.NWSCRIPT_CORPUS_OFFSET ?? '0', 10);
    const filter = process.env.NWSCRIPT_CORPUS_FILTER;
    const requireExact = process.env.NWSCRIPT_CORPUS_REQUIRE_EXACT === '1';
    const candidates = findNssFiles(corpusRoot as string)
      .map(path => ({ path, source: readFileSync(path, 'utf8') }))
      .filter(({ source }) =>
        !/^\s*#\s*include\b/m.test(source) &&
        (/\bvoid\s+main\s*\(/.test(source) || /\bint\s+StartingConditional\s*\(/.test(source))
      )
      .filter(({ path }) => !filter || path.includes(filter))
      .sort((left, right) => stableHash(left.path) - stableHash(right.path))
      .slice(offset, offset + limit);

    const failures: string[] = [];
    const recordFailure = (failure: string) => {
      failures.push(failure);
      if (process.env.NWSCRIPT_CORPUS_LOG === '1') console.log(`CORPUS FAILURE: ${failure}`);
    };
    let compiled = 0;
    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      if (process.env.NWSCRIPT_CORPUS_LOG === '1') {
        console.log(`CORPUS ${offset + index + 1}: ${candidate.path}`);
      }
      const name = `corpus_${index.toString(36)}`;
      let original: Uint8Array;
      try {
        original = compile(name, candidate.source);
      } catch (error) {
        recordFailure(`${candidate.path}: original compile failed: ${String(error)}`);
        continue;
      }
      compiled++;
      try {
        const script = decodeNcs(original);
        script.name = name;
        if (process.env.NWSCRIPT_ANALYZE_ONLY === '1') {
          const cfg = new NWScriptControlFlowGraph(script);
          cfg.build();
          const globalInits = new NWScriptGlobalVariableAnalyzer(script, cfg).analyze();
          const functions = new NWScriptFunctionAnalyzer(cfg, globalInits).analyze();
          const inspectEntry = Number.parseInt(process.env.NWSCRIPT_INSPECT_ENTRY ?? '', 0);
          console.log(JSON.stringify({
            scalarCallAbi: Number.isFinite(inspectEntry)
              ? inferSubroutineCallAbiFromCallSites(script, inspectEntry, 4)
              : null,
            vectorCallAbi: Number.isFinite(inspectEntry)
              ? inferSubroutineCallAbiFromCallSites(script, inspectEntry, 12)
              : null,
            functions: functions
            .filter(func => !Number.isFinite(inspectEntry) || func.entryBlock.startInstruction.address === inspectEntry)
            .map(func => ({
              entry: `0x${func.entryBlock.startInstruction.address.toString(16)}`,
              name: func.name,
              returnType: NWScriptDataType[func.returnType],
              parameters: func.parameters.map(parameter => ({
                type: NWScriptDataType[parameter.dataType],
                offset: parameter.offset,
                viaSp: parameter.resolvedViaSpOperand ?? false,
              })),
              terminalBlocks: func.bodyBlocks
                .filter(block => block.endInstruction.codeName === 'RETN')
                .map(block => ({
                  start: `0x${block.startInstruction.address.toString(16)}`,
                  instructions: block.instructions.map(instruction => ({
                    address: `0x${instruction.address.toString(16)}`,
                    opcode: instruction.codeName,
                    offset: instruction.offset,
                    size: instruction.size,
                  })),
                })),
              returnWrites: func.bodyBlocks.flatMap(block => block.instructions
                .filter(instruction => instruction.code === OP_CPDOWNSP)
                .map(instruction => ({
                  address: `0x${instruction.address.toString(16)}`,
                  offset: instruction.offset,
                  size: instruction.size,
                  followingOpcodes: block.instructions
                    .slice(block.instructions.indexOf(instruction) + 1)
                    .map(tail => tail.codeName),
                }))),
            })),
          }, null, 2));
          continue;
        }
        const decompiler = new NWScriptDecompiler(script);
        const decompiled = decompiler.decompile();
        if (process.env.NWSCRIPT_DUMP_CORPUS === '1') {
          console.log(candidate.path);
          console.log(candidate.source);
          console.log(compiler.disassemble(original));
          console.log(JSON.stringify(decompiler.getControlStructures().map(structure => ({
            type: structure.type,
            header: structure.headerBlock?.id,
            body: structure.bodyBlocks?.map(block => block.id),
            else: structure.elseBlocks?.map(block => block.id),
            increment: structure.incrementBlock?.id,
            condition: structure.conditionBlock?.id,
            exit: structure.exitBlock?.id,
          })), null, 2));
          console.log(decompiled);
        }
        const sentinelMatches = Array.from(
          decompiled.matchAll(/__NCS_(?:DECOMPILER|ACTION)_[A-Z0-9_]+|\/\/ Error during decompilation:[^\n]*/g)
        );
        if (sentinelMatches.length > 0) {
          const contexts = sentinelMatches.slice(0, 5).map(match => {
            const index = match.index ?? 0;
            return decompiled
              .slice(Math.max(0, index - 120), Math.min(decompiled.length, index + match[0].length + 120))
              .replace(/\s+/g, ' ')
              .trim();
          });
          throw new Error(`decompiler emitted error sentinel(s): ${contexts.join(' | ')}`);
        }
        const rebuilt = compiler.compile(`${name}_rebuilt`, decompiled);
        if (!rebuilt.ok) {
          const reportedLine = /\((\d+)\)/.exec(rebuilt.error)?.[1];
          const line = reportedLine ? Number.parseInt(reportedLine, 10) : Number.NaN;
          const sourceLines = decompiled.split(/\r?\n/);
          const context = Number.isFinite(line)
            ? sourceLines
                .slice(Math.max(0, line - 4), Math.min(sourceLines.length, line + 3))
                .map((sourceLine, index) => `${Math.max(1, line - 3) + index}: ${sourceLine}`)
                .join(' | ')
            : '';
          throw new Error(`rebuilt compile failed: ${rebuilt.error}${context ? `; ${context}` : ''}`);
        }
        if (
          requireExact &&
          !Buffer.from(rebuilt.bytecode).equals(Buffer.from(original))
        ) {
          throw new Error('rebuilt bytecode differs');
        }
      } catch (error) {
        recordFailure(`${candidate.path}: ${String(error)}`);
      }
      if (failures.length >= 12) break;
    }

    expect(failures).toEqual([]);
    expect(compiled).toBe(candidates.length);
  }, 900_000);
});
