import type { NWScript } from "@/nwscript/NWScript";
import { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import { NWScriptControlStructureBuilder } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import { NWScriptFunctionAnalyzer } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { NWScriptASTCodeGenerator } from "@/nwscript/decompiler/NWScriptASTCodeGenerator";
import { NWScriptGlobalVariableAnalyzer } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import { NWScriptLocalVariableAnalyzer } from "@/nwscript/decompiler/NWScriptLocalVariableAnalyzer";
import { NWScriptControlNodeToASTConverter } from "@/nwscript/decompiler/NWScriptControlNodeToASTConverter";
import { NWScriptAST } from "@/nwscript/decompiler/NWScriptAST";
import type { NWScriptProgramNode } from "@/nwscript/decompiler/NWScriptAST";
import {
  nwscriptDecompilerDebug,
  nwscriptDecompilerDebugEnabled,
  nwscriptDecompilerNowMs,
  nwscriptDecompilerProfileEnabled,
  type NWScriptDecompilerPhaseTimings,
} from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import { applyNwscriptDecompilerCleanup } from "@/nwscript/decompiler/NWScriptDecompilerCleanupPass";
import { collectJsrReturnReservationAddresses } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  createEmptyNssCodeLineMap,
  shiftNssCodeLineMap,
  type NssCodeLineMap,
} from "@/nwscript/inspect/nssCodeLineMap";

/** Result of {@link NWScriptDecompiler.buildProgramAst} (phases through AST + cleanup, no NSS emit). */
export type NWScriptBuildProgramAstResult =
  | { ok: true; ast: NWScriptProgramNode }
  | { ok: false; error: string };

/** Result of {@link NWScriptDecompiler.decompileWithLineMap}. */
export type NWScriptDecompileResult = {
  nss: string;
  lineMap: NssCodeLineMap;
  functions: Array<{ codeOffset: number; name: string }>;
};

/**
 * Main decompiler orchestrator.
 * Coordinates all decompilation phases to convert NCS bytecode to NSS source.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptDecompiler.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptDecompiler {
  private script: NWScript;
  private cfg: NWScriptControlFlowGraph | null = null;
  private structureBuilder: NWScriptControlStructureBuilder | null = null;
  private functionAnalyzer: NWScriptFunctionAnalyzer | null = null;
  private globalVarAnalyzer: NWScriptGlobalVariableAnalyzer | null = null;
  private localVarAnalyzer: NWScriptLocalVariableAnalyzer | null = null;
  private astConverter: NWScriptControlNodeToASTConverter | null = null;
  private codeGenerator: NWScriptASTCodeGenerator | null = null;

  /** Wall-clock phase timings from the last {@link decompile} / {@link buildProgramAst} call. */
  lastProfile: NWScriptDecompilerPhaseTimings | null = null;

  constructor(script: NWScript) {
    this.script = script;
  }

  /**
   * Decompile the script from NCS to NSS
   *
   * Pipeline (Option A — ControlNode-first), loosely mirroring NCSDecomp phases:
   * CFG (positions + edges + unreachability) ≈ SetPositions / SetDestinations / SetDeadCode;
   * Natural loops use dominance back edges computed independently for each procedure;
   * {@link NWScriptFunctionAnalyzer} ≈ prototype + arity; structure builder ≈ control recovery;
   * AST + cleanup hook ≈ MainPass + CleanupPass.
   */
  /**
   * Run decompilation through the NWScript AST (CFG → structure → ControlNode → AST + cleanup).
   * Does not run the code generator; use for tests and tooling that care about tree shape.
   */
  buildProgramAst(): NWScriptBuildProgramAstResult {
    try {
      return this.runPhasesThroughAst();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Decompilation error (AST build):", error);
      this.finishProfile();
      return { ok: false, error: msg };
    }
  }

  decompile(): string {
    return this.decompileWithLineMap().nss;
  }

  decompileWithLineMap(): NWScriptDecompileResult {
    const astResult = this.buildProgramAst();
    if (astResult.ok === false) {
      let nss = `// Error during decompilation: ${astResult.error}`;
      if (astResult.error === "No instructions found") {
        nss = "// Error: No instructions found";
      } else if (astResult.error === "No entry block found") {
        nss = "// Error: No entry block found";
      }
      return { nss, lineMap: createEmptyNssCodeLineMap(), functions: [] };
    }

    try {
      nwscriptDecompilerDebug("Generating NSS source code...");
      const result = this.measurePhase('codegen', () => {
        this.codeGenerator = new NWScriptASTCodeGenerator();
        const nssSource = this.codeGenerator.generate(astResult.ast);
        const header = this.generateHeader();
        const prefix = header + '\n\n';
        const lineDelta = prefix.split('\n').length - 1;
        const nss = prefix + nssSource;
        const lineMap = shiftNssCodeLineMap(this.codeGenerator.lastLineMap, lineDelta);
        const functions = astResult.ast.functions
          .filter((func) => func.location?.startAddress != null)
          .map((func) => ({
            codeOffset: func.location!.startAddress as number,
            name: func.name,
          }));
        return { nss, lineMap, functions };
      });
      this.finishProfile();
      return result;
    } catch (error) {
      console.error('Decompilation error:', error);
      this.finishProfile();
      return {
        nss: `// Error during decompilation: ${error instanceof Error ? error.message : String(error)}`,
        lineMap: createEmptyNssCodeLineMap(),
        functions: [],
      };
    }
  }

  /**
   * Phases 1–6 shared by {@link decompile} and {@link buildProgramAst}.
   */
  private runPhasesThroughAst(): NWScriptBuildProgramAstResult {
    this.beginProfile();
    if (!this.script.instructions || this.script.instructions.size === 0) {
      this.finishProfile();
      return { ok: false, error: 'No instructions found' };
    }

    nwscriptDecompilerDebug('Building control flow graph...');
    this.cfg = new NWScriptControlFlowGraph(this.script);
    this.measurePhase('cfg', () => this.cfg!.build());
    this.mergeCfgSubsteps();
    nwscriptDecompilerDebug('CFG built successfully');

    if (!this.cfg.entryBlock) {
      this.finishProfile();
      return { ok: false, error: 'No entry block found' };
    }

    nwscriptDecompilerDebug('Analyzing global variables...');
    this.globalVarAnalyzer = new NWScriptGlobalVariableAnalyzer(this.script, this.cfg);
    let globalInits = this.measurePhase('globals', () => this.globalVarAnalyzer!.analyze());

    nwscriptDecompilerDebug('Analyzing functions...');
    this.functionAnalyzer = new NWScriptFunctionAnalyzer(this.cfg, globalInits);
    let functions = this.measurePhase('functions.pass1', () => this.functionAnalyzer!.analyze());

    // A preliminary function ABI is needed to simulate JSRs in global initializer expressions.
    // Rebuild signatures once the exact SAVEBP frame has removed transient return reservations.
    globalInits = this.measurePhase('globals.recover1', () =>
      this.globalVarAnalyzer!.recoverInitializerExpressions(functions)
    );
    this.functionAnalyzer = new NWScriptFunctionAnalyzer(this.cfg, globalInits);
    functions = this.measurePhase('functions.pass2', () => this.functionAnalyzer!.analyze());
    globalInits = this.measurePhase('globals.recover2', () =>
      this.globalVarAnalyzer!.recoverInitializerExpressions(functions)
    );

    nwscriptDecompilerDebug('Analyzing local variables...');
    this.localVarAnalyzer = new NWScriptLocalVariableAnalyzer(
      this.script,
      globalInits,
      collectJsrReturnReservationAddresses(functions, this.script)
    );
    const localInits = this.measurePhase('locals', () => this.localVarAnalyzer!.analyze());

    nwscriptDecompilerDebug('Building control structures...');
    this.structureBuilder = new NWScriptControlStructureBuilder(this.cfg);
    this.measurePhase('structures.analyze', () => this.structureBuilder!.analyze());

    const mainFunction = functions.find(f => f.isMain);
    const functionEntryBlock = mainFunction?.entryBlock || this.cfg.entryBlock;
    nwscriptDecompilerDebug(`[Decompiler] Building ControlNode tree from function entry block ${functionEntryBlock.id} (CFG entry block is ${this.cfg.entryBlock.id})`);

    const controlNodeTree = this.measurePhase('structures.buildProcedure', () =>
      this.structureBuilder!.buildProcedure(functionEntryBlock)
    );
    const coverage = this.structureBuilder!.auditLastProcedure(controlNodeTree);
    if (
      coverage &&
      (coverage.missing.length > 0 || coverage.duplicate.length > 0) &&
      nwscriptDecompilerDebugEnabled()
    ) {
      nwscriptDecompilerDebug(
        `[Decompiler] ControlNode coverage gaps: missing=${coverage.missing.map(b => b.id).join(',') || 'none'} duplicate=${coverage.duplicate.map(b => b.id).join(',') || 'none'}`
      );
    }
    nwscriptDecompilerDebug('ControlNode tree built successfully');
    nwscriptDecompilerDebug(`[Decompiler] CFG has ${this.cfg.blocks.size} blocks`);
    nwscriptDecompilerDebug(`[Decompiler] Main function has ${mainFunction?.bodyBlocks.length || 0} body blocks`);
    nwscriptDecompilerDebug(`[Decompiler] ControlNode tree type: ${controlNodeTree.type}`);

    nwscriptDecompilerDebug('Converting ControlNode tree to AST...');
    const ast = this.measurePhase('ast', () => {
      this.astConverter = new NWScriptControlNodeToASTConverter(
        this.cfg!,
        functions,
        globalInits,
        localInits
      );
      return this.astConverter.convertToAST(controlNodeTree, this.structureBuilder!);
    });
    this.measurePhase('cleanup', () => {
      applyNwscriptDecompilerCleanup(ast, { cfg: this.cfg!, functions });
    });
    nwscriptDecompilerDebug('AST built successfully');
    if (nwscriptDecompilerDebugEnabled()) {
      console.log('AST JSON:', JSON.stringify(NWScriptAST.toJSON(ast), null, 2));
    }

    this.finishProfile();
    return { ok: true, ast };
  }

  private profileStartMs = 0;

  private beginProfile(): void {
    this.lastProfile = {
      scriptName: this.script.name || 'unknown',
      instructionCount: this.script.instructions?.size || 0,
      blockCount: 0,
      totalMs: 0,
      phases: {},
      cfg: {},
    };
    this.profileStartMs = nwscriptDecompilerNowMs();
  }

  private measurePhase<T>(name: string, fn: () => T): T {
    const start = nwscriptDecompilerNowMs();
    if (nwscriptDecompilerProfileEnabled()) {
      console.log(`[NWScriptDecompiler] start ${name}`);
    }
    const result = fn();
    if (this.lastProfile) {
      this.lastProfile.phases[name] = nwscriptDecompilerNowMs() - start;
    }
    return result;
  }

  private mergeCfgSubsteps(): void {
    if (!this.lastProfile || !this.cfg) return;
    this.lastProfile.cfg = { ...this.cfg.lastBuildTimings };
    this.lastProfile.blockCount = this.cfg.blocks.size;
  }

  private finishProfile(): void {
    if (!this.lastProfile) return;
    this.lastProfile.totalMs = nwscriptDecompilerNowMs() - this.profileStartMs;
    if (this.cfg) {
      this.lastProfile.blockCount = this.cfg.blocks.size;
    }
    if (nwscriptDecompilerProfileEnabled()) {
      console.log('[NWScriptDecompiler profile]', JSON.stringify(this.lastProfile, null, 2));
    }
  }

  /**
   * Generate header comment for decompiled code
   */
  private generateHeader(): string {
    const lines: string[] = [];
    lines.push('// Decompiled NSS source');
    lines.push(`// Original script: ${this.script.name || 'unknown'}`);
    lines.push('//');
    lines.push('// NOTE: This is decompiled code. Variable names and structure');
    lines.push('// may not match the original source exactly.');
    lines.push('//');
    return lines.join('\n');
  }

  /**
   * Get the control flow graph (after decompilation)
   */
  getControlFlowGraph(): NWScriptControlFlowGraph | null {
    return this.cfg;
  }

  /**
   * Get control structures (after decompilation)
   */
  getControlStructures() {
    return this.structureBuilder?.getStructures() || [];
  }

  /**
   * Get functions (after decompilation)
   */
  getFunctions() {
    return this.functionAnalyzer?.getFunctions() || [];
  }

  /**
   * Get global variable analyzer (after decompilation)
   */
  getGlobalVariableAnalyzer(): NWScriptGlobalVariableAnalyzer | null {
    return this.globalVarAnalyzer;
  }

  /**
   * Get local variable analyzer (after decompilation)
   */
  getLocalVariableAnalyzer(): NWScriptLocalVariableAnalyzer | null {
    return this.localVarAnalyzer;
  }
}
