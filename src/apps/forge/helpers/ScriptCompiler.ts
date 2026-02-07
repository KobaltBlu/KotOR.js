/**
 * Forge script compilation/decompilation helper (ported from Holocron script_compiler).
 * Wraps NWScriptParser + NWScriptCompiler to compile NSS → NCS, and NWScript decompiler for NCS → NSS.
 */

import { NWScriptParser } from "../../../nwscript/compiler/NWScriptParser";
import { NWScriptCompiler } from "../../../nwscript/compiler/NWScriptCompiler";
import { NWScript } from "../../../nwscript/NWScript";

export interface ScriptCompileResult {
  success: boolean;
  ncs?: Uint8Array;
  errors?: Array<{ message: string; type?: string }>;
}

/**
 * Compile NSS source to NCS bytes using the built-in KotOR.js compiler.
 * Returns success flag, NCS buffer on success, and parse/compile errors on failure.
 */
export function compileNssToNcs(source: string): ScriptCompileResult {
  try {
    const parser = new NWScriptParser(source);
    const program = parser.program;
    if (!program) {
      return {
        success: false,
        errors: (parser.errors || []).map((e: { message?: string; type?: string }) => ({
          message: (e as { message?: string }).message ?? "Parse error",
          type: (e as { type?: string }).type,
        })),
      };
    }
    const compiler = new NWScriptCompiler(program as any);
    const buffer = compiler.compile();
    if (buffer && buffer.length > 0) {
      return { success: true, ncs: buffer };
    }
    return {
      success: false,
      errors: [{ message: "Compiler returned no output." }],
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      errors: [{ message }],
    };
  }
}

/**
 * Decompile NCS bytecode to NSS source using the built-in KotOR.js decompiler.
 */
export function decompileNcsToNss(ncsBytes: Uint8Array): string {
  const nw = new NWScript();
  return nw.decompile(ncsBytes);
}
