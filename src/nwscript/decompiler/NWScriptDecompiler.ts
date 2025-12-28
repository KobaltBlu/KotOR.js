import type { NWScript } from "../NWScript";
import { NWScriptControlFlowGraph } from "./NWScriptControlFlowGraph";
import { NWScriptControlStructureBuilder } from "./NWScriptControlStructureBuilder";
import { NWScriptFunctionAnalyzer } from "./NWScriptFunctionAnalyzer";
import { NWScriptASTCodeGenerator } from "./NWScriptASTCodeGenerator";
import { NWScriptGlobalVariableAnalyzer } from "./NWScriptGlobalVariableAnalyzer";
import { NWScriptLocalVariableAnalyzer } from "./NWScriptLocalVariableAnalyzer";
import { NWScriptControlNodeToASTConverter } from "./NWScriptControlNodeToASTConverter";
import { NWScriptAST } from "./NWScriptAST";

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

      console.log('Building control flow graph...');
      this.cfg = new NWScriptControlFlowGraph(this.script);
      this.cfg.build();
      console.log('CFG built successfully');

      if (!this.cfg.entryBlock) {
        return '// Error: No entry block found';
      }

      console.log(JSON.stringify(this.cfg.toJSON(), null, 2));

      // Phase 2: Analyze global variable initializations
      console.log('Analyzing global variables...');
      this.globalVarAnalyzer = new NWScriptGlobalVariableAnalyzer(this.script, this.cfg);
      const globalInits = this.globalVarAnalyzer.analyze();
      console.log(`Found ${globalInits.length} global variables`);
      console.log(globalInits);

      // Phase 3: Analyze local variable initializations
      console.log('Analyzing local variables...');
      this.localVarAnalyzer = new NWScriptLocalVariableAnalyzer(this.script, globalInits);
      const localInits = this.localVarAnalyzer.analyze();
      console.log(`Found ${localInits.length} local variables`);
      console.log(localInits);

      // Phase 4: Analyze Functions
      console.log('Analyzing functions...');
      this.functionAnalyzer = new NWScriptFunctionAnalyzer(this.cfg, globalInits);
      const functions = this.functionAnalyzer.analyze();
      console.log(`Found ${functions.length} functions`);
      console.log(functions);

      // Phase 5: Build Control Structures and ControlNode Tree
      console.log('Building control structures...');
      this.structureBuilder = new NWScriptControlStructureBuilder(this.cfg);
      this.structureBuilder.analyze();
      console.log(JSON.stringify(this.structureBuilder.toJSON(), null, 2));
      
      // Use the main function's entry block, not the CFG entry block
      // The CFG entry block is the JSR caller, but we need the actual function entry block
      const mainFunction = functions.find(f => f.isMain);
      const functionEntryBlock = mainFunction?.entryBlock || this.cfg.entryBlock;
      console.log(`[Decompiler] Building ControlNode tree from function entry block ${functionEntryBlock.id} (CFG entry block is ${this.cfg.entryBlock.id})`);
      
      const controlNodeTree = this.structureBuilder.buildProcedure(functionEntryBlock);
      console.log('ControlNode tree built successfully');
      console.log(`[Decompiler] CFG has ${this.cfg.blocks.size} blocks`);
      console.log(`[Decompiler] Main function has ${mainFunction?.bodyBlocks.length || 0} body blocks`);
      console.log(`[Decompiler] ControlNode tree type: ${controlNodeTree.type}`);

      // Phase 6: Convert ControlNode Tree to AST
      console.log('Converting ControlNode tree to AST...');
      this.astConverter = new NWScriptControlNodeToASTConverter(
        this.cfg,
        functions,
        globalInits,
        localInits
      );
      const ast = this.astConverter.convertToAST(controlNodeTree, this.structureBuilder);
      console.log('AST built successfully');
      console.log('AST JSON:', JSON.stringify(NWScriptAST.toJSON(ast), null, 2));

      // Phase 7: Generate NSS Code from AST
      console.log('Generating NSS source code...');
      this.codeGenerator = new NWScriptASTCodeGenerator();
      const nssSource = this.codeGenerator.generate(ast);

      // Add header comment
      const header = this.generateHeader();
      return header + '\n\n' + nssSource;
    } catch (error) {
      console.error('Decompilation error:', error);
      return `// Error during decompilation: ${error instanceof Error ? error.message : String(error)}`;
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
