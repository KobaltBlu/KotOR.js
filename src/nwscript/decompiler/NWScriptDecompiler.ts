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
import { nwscriptDecompilerDebug, nwscriptDecompilerDebugEnabled } from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import { applyNwscriptDecompilerCleanup } from "@/nwscript/decompiler/NWScriptDecompilerCleanupPass";

/** Result of {@link NWScriptDecompiler.buildProgramAst} (phases through AST + cleanup, no NSS emit). */
export type NWScriptBuildProgramAstResult =
  | { ok: true; ast: NWScriptProgramNode }
  | { ok: false; error: string };

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

  constructor(script: NWScript) {
    this.script = script;
  }

  /**
   * Decompile the script from NCS to NSS
   *
   * Pipeline (Option A — ControlNode-first), loosely mirroring NCSDecomp phases:
   * CFG (positions + edges + unreachability) ≈ SetPositions / SetDestinations / SetDeadCode;
   * Natural loops use dominance back edges plus procedure-local backward unconditional {@code JMP}
   * hints when entry dominance misses a latch (see {@link NWScriptControlFlowGraph.procedureLatchEdges});
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
      return { ok: false, error: msg };
    }
  }

  decompile(): string {
    const astResult = this.buildProgramAst();
    if (astResult.ok === false) {
      if (astResult.error === "No instructions found") {
        return "// Error: No instructions found";
      }
      if (astResult.error === "No entry block found") {
        return "// Error: No entry block found";
      }
      return `// Error during decompilation: ${astResult.error}`;
    }

    try {
      nwscriptDecompilerDebug("Generating NSS source code...");
      this.codeGenerator = new NWScriptASTCodeGenerator();
      const nssSource = this.codeGenerator.generate(astResult.ast);
      const header = this.generateHeader();
      return header + '\n\n' + nssSource;
    } catch (error) {
      console.error('Decompilation error:', error);
      return `// Error while reconstructing NSS: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Phases 1–6 shared by {@link decompile} and {@link buildProgramAst}.
   */
  private runPhasesThroughAst(): NWScriptBuildProgramAstResult {
    if (!this.script.instructions || this.script.instructions.size === 0) {
      return { ok: false, error: 'No instructions found' };
    }

    nwscriptDecompilerDebug('Building control flow graph...');
    this.cfg = new NWScriptControlFlowGraph(this.script);
    this.cfg.build();
    nwscriptDecompilerDebug('CFG built successfully');

    if (!this.cfg.entryBlock) {
      return { ok: false, error: 'No entry block found' };
    }

    nwscriptDecompilerDebug('Analyzing global variables...');
    this.globalVarAnalyzer = new NWScriptGlobalVariableAnalyzer(this.script, this.cfg);
    const globalInits = this.globalVarAnalyzer.analyze();

    nwscriptDecompilerDebug('Analyzing local variables...');
    this.localVarAnalyzer = new NWScriptLocalVariableAnalyzer(this.script, globalInits);
    const localInits = this.localVarAnalyzer.analyze();

    nwscriptDecompilerDebug('Analyzing functions...');
    this.functionAnalyzer = new NWScriptFunctionAnalyzer(this.cfg, globalInits);
    const functions = this.functionAnalyzer.analyze();

    nwscriptDecompilerDebug('Building control structures...');
    this.structureBuilder = new NWScriptControlStructureBuilder(this.cfg);
    this.structureBuilder.analyze();

    const mainFunction = functions.find(f => f.isMain);
    const functionEntryBlock = mainFunction?.entryBlock || this.cfg.entryBlock;
    nwscriptDecompilerDebug(`[Decompiler] Building ControlNode tree from function entry block ${functionEntryBlock.id} (CFG entry block is ${this.cfg.entryBlock.id})`);

    const controlNodeTree = this.structureBuilder.buildProcedure(functionEntryBlock);
    nwscriptDecompilerDebug('ControlNode tree built successfully');
    nwscriptDecompilerDebug(`[Decompiler] CFG has ${this.cfg.blocks.size} blocks`);
    nwscriptDecompilerDebug(`[Decompiler] Main function has ${mainFunction?.bodyBlocks.length || 0} body blocks`);
    nwscriptDecompilerDebug(`[Decompiler] ControlNode tree type: ${controlNodeTree.type}`);

    nwscriptDecompilerDebug('Converting ControlNode tree to AST...');
    this.astConverter = new NWScriptControlNodeToASTConverter(
      this.cfg,
      functions,
      globalInits,
      localInits
    );
    const ast = this.astConverter.convertToAST(controlNodeTree, this.structureBuilder);
    applyNwscriptDecompilerCleanup(ast, { cfg: this.cfg, functions });
    nwscriptDecompilerDebug('AST built successfully');
    if (nwscriptDecompilerDebugEnabled()) {
      console.log('AST JSON:', JSON.stringify(NWScriptAST.toJSON(ast), null, 2));
    }

    return { ok: true, ast };
  }

  /**
   * Generate header comment for decompiled code
   */
  private generateHeader(): string {
    const lines: string[] = [];
    lines.push('// NSS source (reconstructed from compiled script)');
    lines.push(`// Original script: ${this.script.name || 'unknown'}`);
    lines.push('//');
    lines.push('// NOTE: Reconstructed from bytecode. Variable names and structure');
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
