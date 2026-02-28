

import { NWScriptAST } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptASTCodeGenerator } from "@/nwscript/decompiler/NWScriptASTCodeGenerator";
import { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import { NWScriptControlNodeToASTConverter } from "@/nwscript/decompiler/NWScriptControlNodeToASTConverter";
import { NWScriptControlStructureBuilder } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import { NWScriptFunctionAnalyzer } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { NWScriptGlobalVariableAnalyzer } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import { NWScriptLocalVariableAnalyzer } from "@/nwscript/decompiler/NWScriptLocalVariableAnalyzer";
import type { NWScript } from "@/nwscript/NWScript";
import { createScopedLogger, LogScope } from "@/utility/Logger";


const log = createScopedLogger(LogScope.NWScript);

/**
 * NCS-to-NSS conversion orchestrator.
 * Coordinates analysis phases to convert NCS bytecode to NSS source.
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
   * Pipeline (Option A - ControlNode-First):
   * CFG -> StructureBuilder -> Variable Analyzers -> Function Analyzer -> 
   * ControlNode Tree -> AST Converter -> Code Generator
   */
  decompile(): string {
    try {
      // Phase 1: Build Control Flow Graph
      if (!this.script.instructions || this.script.instructions.size === 0) {
        return '// Error: No instructions found';
      }

      log.info('Building control flow graph...');
      this.cfg = new NWScriptControlFlowGraph(this.script);
      this.cfg.build();
      log.info('CFG built successfully');

      if (!this.cfg.entryBlock) {
        return '// Error: No entry block found';
      }

      // log.info(JSON.stringify(this.cfg.toJSON(), null, 2));

      // Phase 2: Analyze global variable initializations
      log.info('Analyzing global variables...');
      this.globalVarAnalyzer = new NWScriptGlobalVariableAnalyzer(this.script, this.cfg);
      const globalInits = this.globalVarAnalyzer.analyze();
      // log.info(`Found ${globalInits.length} global variables`);
      // log.info(JSON.stringify(globalInits, null, 2));

      // Phase 3: Analyze local variable initializations
      log.info('Analyzing local variables...');
      this.localVarAnalyzer = new NWScriptLocalVariableAnalyzer(this.script, globalInits);
      const localInits = this.localVarAnalyzer.analyze();
      // log.info(`Found ${localInits.length} local variables`);
      // log.info(JSON.stringify(localInits, null, 2));

      // Phase 4: Analyze Functions
      log.info('Analyzing functions...');
      this.functionAnalyzer = new NWScriptFunctionAnalyzer(this.cfg, globalInits);
      const functions = this.functionAnalyzer.analyze();
      // log.info(`Found ${functions.length} functions`);
      // log.info(JSON.stringify(functions, null, 2));

      // Phase 5: Build Control Structures and ControlNode Tree
      log.info('Building control structures...');
      this.structureBuilder = new NWScriptControlStructureBuilder(this.cfg);
      this.structureBuilder.analyze();
      // log.info(JSON.stringify(this.structureBuilder.toJSON(), null, 2));
      
      // Use the main function's entry block, not the CFG entry block
      // The CFG entry block is the JSR caller, but we need the actual function entry block
      const mainFunction = functions.find(f => f.isMain);
      const functionEntryBlock = mainFunction?.entryBlock || this.cfg.entryBlock;
      log.info(`[Decompiler] Building ControlNode tree from function entry block ${functionEntryBlock.id} (CFG entry block is ${this.cfg.entryBlock.id})`);
      
      const controlNodeTree = this.structureBuilder.buildProcedure(functionEntryBlock);
      log.info('ControlNode tree built successfully');
      log.info(`[Decompiler] CFG has ${this.cfg.blocks.size} blocks`);
      log.info(`[Decompiler] Main function has ${mainFunction?.bodyBlocks.length || 0} body blocks`);
      log.info(`[Decompiler] ControlNode tree type: ${controlNodeTree.type}`);

      // Phase 6: Convert ControlNode Tree to AST
      log.info('Converting ControlNode tree to AST...');
      this.astConverter = new NWScriptControlNodeToASTConverter(
        this.cfg,
        functions,
        globalInits,
        localInits
      );
      const ast = this.astConverter.convertToAST(controlNodeTree, this.structureBuilder);
      log.info('AST built successfully');
      log.info('AST JSON:', JSON.stringify(NWScriptAST.toJSON(ast), null, 2));

      // Phase 7: Generate NSS Code from AST
      log.info('Generating NSS source code...');
      this.codeGenerator = new NWScriptASTCodeGenerator();
      const nssSource = this.codeGenerator.generate(ast);

      // Add header comment
      const header = this.generateHeader();
      return header + '\n\n' + nssSource;
    } catch (error) {
      log.error('Decompilation error:', error);
      return `// Error during conversion: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Generate header comment for reconstructed script output
   */
  private generateHeader(): string {
    const lines: string[] = [];
    lines.push('// Reconstructed NSS source');
    lines.push(`// Original script: ${this.script.name || 'unknown'}`);
    lines.push('//');
    lines.push('// NOTE: This is reconstructed script output. Variable names and structure');
    lines.push('// may not match the original source exactly.');
    lines.push('//');
    return lines.join('\n');
  }

  /**
   * Get the control flow graph (after analysis)
   */
  getControlFlowGraph(): NWScriptControlFlowGraph | null {
    return this.cfg;
  }

  /**
   * Get control structures (after analysis)
   */
  getControlStructures() {
    return this.structureBuilder?.getStructures() || [];
  }

  /**
   * Get functions (after analysis)
   */
  getFunctions() {
    return this.functionAnalyzer?.getFunctions() || [];
  }

  /**
   * Get global variable analyzer (after analysis)
   */
  getGlobalVariableAnalyzer(): NWScriptGlobalVariableAnalyzer | null {
    return this.globalVarAnalyzer;
  }

  /**
   * Get local variable analyzer (after analysis)
   */
  getLocalVariableAnalyzer(): NWScriptLocalVariableAnalyzer | null {
    return this.localVarAnalyzer;
  }
}
