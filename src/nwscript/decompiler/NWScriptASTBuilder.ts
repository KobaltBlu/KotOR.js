import type { NWScriptControlFlowGraph } from "./NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptControlStructure } from "./NWScriptControlStructureBuilder";
import type { NWScriptFunction } from "./NWScriptFunctionAnalyzer";
import type { NWScriptStatement } from "./NWScriptStatementBuilder";
import type { NWScriptProcessedBlock } from "./NWScriptStatementBuilder";
import { NWScriptExpression } from "./NWScriptExpression";
import type { NWScriptGlobalInit } from "./NWScriptGlobalVariableAnalyzer";
import type { NWScriptLocalInit } from "./NWScriptLocalVariableAnalyzer";
import { ControlStructureType } from "./NWScriptControlStructureBuilder";
import { NWScriptAST, NWScriptASTNodeType, type NWScriptASTNode, type NWScriptASTNodeUnion } from "./NWScriptAST";
import type {
  NWScriptProgramNode,
  NWScriptFunctionNode,
  NWScriptBlockNode,
  NWScriptIfNode,
  NWScriptIfElseNode,
  NWScriptWhileNode,
  NWScriptDoWhileNode,
  NWScriptForNode,
  NWScriptSwitchNode,
  NWScriptSwitchCaseNode,
  NWScriptSwitchDefaultNode,
  NWScriptExpressionStatementNode,
  NWScriptAssignmentNode,
  NWScriptReturnNode,
  NWScriptBreakNode,
  NWScriptContinueNode,
  NWScriptVariableDeclarationNode,
  NWScriptGlobalVariableDeclarationNode
} from "./NWScriptAST";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

/**
 * Builds an Abstract Syntax Tree (AST) from control structures and statements.
 * Combines the output of StructureBuilder and StatementBuilder into a unified tree.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptASTBuilder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptASTBuilder {
  private cfg: NWScriptControlFlowGraph;
  private structures: NWScriptControlStructure[];
  private functions: NWScriptFunction[];
  private processedBlocks: Map<NWScriptBasicBlock, NWScriptProcessedBlock>;
  private globalInits: NWScriptGlobalInit[];
  private localInits: NWScriptLocalInit[];
  
  /**
   * Map from blocks to statements (for quick lookup)
   */
  private blockStatements: Map<NWScriptBasicBlock, NWScriptStatement[]> = new Map();
  
  /**
   * Map from structures to their AST nodes (for tracking)
   */
  private structureToASTNode: Map<NWScriptControlStructure, NWScriptASTNode> = new Map();
  
  /**
   * Set of blocks that are part of structures (to avoid duplicate processing)
   */
  private structureBlocks: Set<NWScriptBasicBlock> = new Set();
  
  /**
   * Function that provides condition expressions (from StatementBuilder)
   */
  private getConditionExpression?: (structure: NWScriptControlStructure) => NWScriptExpression | null;
  
  /**
   * Function that extracts conditions from blocks (from StatementBuilder)
   */
  private getConditionFromBlock?: (block: NWScriptBasicBlock) => NWScriptExpression | null;

  constructor(
    cfg: NWScriptControlFlowGraph,
    structures: NWScriptControlStructure[],
    functions: NWScriptFunction[],
    processedBlocks: Map<NWScriptBasicBlock, NWScriptProcessedBlock>,
    globalInits: NWScriptGlobalInit[] = [],
    localInits: NWScriptLocalInit[] = [],
    getConditionExpression?: (structure: NWScriptControlStructure) => NWScriptExpression | null,
    getConditionFromBlock?: (block: NWScriptBasicBlock) => NWScriptExpression | null
  ) {
    this.cfg = cfg;
    this.structures = structures;
    this.functions = functions;
    this.processedBlocks = processedBlocks;
    this.globalInits = globalInits;
    this.localInits = localInits;
    this.getConditionExpression = getConditionExpression;
    this.getConditionFromBlock = getConditionFromBlock;
    
    this.buildBlockStatementsMap();
    this.buildStructureBlocksSet();
  }

  /**
   * Build the complete AST from structures and statements
   */
  build(): NWScriptProgramNode {
    // Build global variable declarations
    const globalVars = this.buildGlobalVariableDeclarations();
    
    // Build function nodes
    const functionNodes = this.buildFunctionNodes();
    
    // Build main body (if there's code outside functions)
    const mainBody = this.buildMainBody();
    
    // Create program node
    const program = NWScriptAST.createProgram(globalVars, functionNodes, mainBody);
    
    // Build parent relationships
    NWScriptAST.buildParentRelationships(program);
    
    return program;
  }

  /**
   * Build block-to-statements map for quick lookup
   */
  private buildBlockStatementsMap(): void {
    this.blockStatements.clear();
    for (const [block, processed] of this.processedBlocks) {
      this.blockStatements.set(block, processed.statements);
    }
  }

  /**
   * Build set of all blocks that are part of structures
   */
  private buildStructureBlocksSet(): void {
    this.structureBlocks.clear();
    
    const addStructureBlocks = (structure: NWScriptControlStructure) => {
      this.structureBlocks.add(structure.headerBlock);
      structure.bodyBlocks.forEach(b => this.structureBlocks.add(b));
      structure.elseBlocks?.forEach(b => this.structureBlocks.add(b));
      if (structure.exitBlock) {
        this.structureBlocks.add(structure.exitBlock);
      }
      if (structure.conditionBlock) {
        this.structureBlocks.add(structure.conditionBlock);
      }
      if (structure.incrementBlock) {
        this.structureBlocks.add(structure.incrementBlock);
      }
      
      // Recursively handle nested structures
      structure.nestedStructures.forEach(nested => addStructureBlocks(nested));
    };
    
    this.structures.forEach(structure => addStructureBlocks(structure));
  }

  /**
   * Build global variable declaration nodes
   */
  private buildGlobalVariableDeclarations(): NWScriptGlobalVariableDeclarationNode[] {
    const declarations: NWScriptGlobalVariableDeclarationNode[] = [];
    
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      // Only create initializer if hasInitializer is true AND initialValue is defined
      // If hasInitializer is false, the variable is unassigned (RSADD without CPDOWNSP)
      const decl = NWScriptAST.createGlobalVariableDeclaration(
        `globalVar_${i}`,
        init.dataType,
        init.hasInitializer && init.initialValue !== undefined
          ? this.valueToExpression(init.initialValue, init.dataType)
          : undefined
      );
      
      // Set location if available
      if (init.instructionAddress !== undefined) {
        decl.location = {
          startAddress: init.instructionAddress,
          endAddress: init.instructionAddress // Will be updated if we have instruction size
        };
      }
      
      declarations.push(decl);
    }
    
    return declarations;
  }

  /**
   * Build function nodes
   */
  private buildFunctionNodes(): NWScriptFunctionNode[] {
    const functionNodes: NWScriptFunctionNode[] = [];
    
    for (const func of this.functions) {
      // Build local variable declarations
      const locals = this.buildLocalVariableDeclarations(func);
      
      // Build function body
      const body = this.buildFunctionBody(func);
      
      // Convert function parameters to AST format (dataType -> type)
      const astParameters = (func.parameters || []).map(param => ({
        name: param.name,
        type: param.dataType
      }));
      
      // Create function node
      const funcNode = NWScriptAST.createFunction(
        func.name || `function_${func.entryBlock.startInstruction.address}`,
        func.returnType || NWScriptDataType.VOID,
        astParameters,
        body,
        locals,
        func.entryBlock
      );
      
      // Set location
      if (func.entryBlock) {
        funcNode.location = {
          startBlock: func.entryBlock,
          endBlock: func.returnBlock || undefined,
          startAddress: func.entryBlock.startInstruction.address,
          endAddress: func.returnBlock 
            ? func.returnBlock.endInstruction.address + func.returnBlock.endInstruction.instructionSize
            : undefined
        };
      }
      
      functionNodes.push(funcNode);
    }
    
    return functionNodes;
  }

  /**
   * Build local variable declarations for a function
   * OPTIMIZATION: Merge variable declarations with assignment statements
   */
  private buildLocalVariableDeclarations(func: NWScriptFunction): NWScriptVariableDeclarationNode[] {
    const declarations: NWScriptVariableDeclarationNode[] = [];
    
    // Build set of global initialization addresses to exclude
    const globalInitAddresses = new Set<number>();
    for (const globalInit of this.globalInits) {
      globalInitAddresses.add(globalInit.instructionAddress);
    }
    
    // Find local inits that belong to this function
    const funcBlocks = new Set(func.bodyBlocks);
    
    // Build map of RSADD addresses to assignment statements
    // This allows us to merge declarations with assignments
    const assignmentMap = new Map<number, NWScriptExpression>();
    for (const block of func.bodyBlocks) {
      const blockStatements = this.blockStatements.get(block) || [];
      for (const stmt of blockStatements) {
        if (stmt.type === 'assignment' && stmt.variableName) {
          // Check if this is a temporary variable name from CPDOWNSP pattern
          const match = stmt.variableName.match(/^__var_(\d+)__$/);
          if (match) {
            const rsaddAddress = parseInt(match[1], 10);
            if (stmt.expression) {
              assignmentMap.set(rsaddAddress, stmt.expression);
            }
          }
        }
      }
    }
    
    for (let i = 0; i < this.localInits.length; i++) {
      const init = this.localInits[i];
      
      // Skip if this is actually a global variable initialization
      if (globalInitAddresses.has(init.instructionAddress)) {
        continue;
      }
      
      // Check if this local init is within the function's blocks
      if (init.instructionAddress !== undefined) {
        const block = this.cfg.getBlockForAddress(init.instructionAddress);
        if (block && funcBlocks.has(block)) {
          // OPTIMIZATION: Check if there's an assignment statement for this variable
          // If so, use it as the initializer instead of the constant value
          let initializer: NWScriptExpression | undefined = undefined;
          
          if (init.hasInitializer) {
            // First, check if there's an assignment statement (for nested ACTION calls, etc.)
            const assignmentExpr = assignmentMap.get(init.instructionAddress);
            if (assignmentExpr) {
              initializer = assignmentExpr;
            } else if (init.initialValue !== undefined) {
              // Fall back to constant value if available
              initializer = this.valueToExpression(init.initialValue, init.dataType);
            }
          }
          
          const decl = NWScriptAST.createVariableDeclaration(
            `localVar_${i}`,
            init.dataType,
            initializer
          );
          
          decl.location = {
            startAddress: init.instructionAddress,
            endAddress: init.instructionAddress // Will be updated if we have instruction size
          };
          
          declarations.push(decl);
        }
      }
    }
    
    return declarations;
  }

  /**
   * Build function body as a block node
   * CRITICAL FIX: Sort blocks by CFG execution order to ensure correct statement ordering
   */
  private buildFunctionBody(func: NWScriptFunction): NWScriptBlockNode {
    const statements: NWScriptASTNode[] = [];
    const processedBlocks = new Set<NWScriptBasicBlock>();
    const isVoidFunction = func.returnType === NWScriptDataType.VOID;
    let hasEncounteredReturn = false;
    
    // CRITICAL FIX: Sort blocks by CFG execution order (topological order)
    // This ensures statements are generated in the correct execution order
    const bodyBlockSet = new Set(func.bodyBlocks);
    const allOrderedBlocks = this.cfg.getTopologicalOrder();
    const orderedBodyBlocks = allOrderedBlocks.filter(block => bodyBlockSet.has(block));
    
    // Process blocks in execution order, handling control structures
    for (const block of orderedBodyBlocks) {
      if (processedBlocks.has(block)) {
        continue;
      }
      
      // Check if we've already encountered a return statement
      // If so, check if this block is reachable after that return
      if (hasEncounteredReturn) {
        // Check if this block is reachable from any block before the return
        // by checking if it's post-dominated by the return block
        // For now, we'll use a simple heuristic: if the block is not part of a control structure
        // and comes after a return, it's likely unreachable
        const structure = this.findStructureForBlock(block);
        if (!structure) {
          // This is a regular block after a return - likely unreachable
          // Skip it unless it's reachable via other paths (e.g., in an if-else)
          // We can check if any predecessor is before the return point
          let isReachable = false;
          for (const pred of block.predecessors) {
            // If any predecessor hasn't been processed yet, it might be reachable
            // This is a simple heuristic - a more accurate approach would use post-dominator analysis
            if (!processedBlocks.has(pred) && !hasEncounteredReturn) {
              isReachable = true;
              break;
            }
          }
          if (!isReachable) {
            // Skip unreachable block after return
            continue;
          }
        }
      }
      
      // Check if this block is part of a control structure
      const structure = this.findStructureForBlock(block);
      if (structure && !this.structureToASTNode.has(structure)) {
        // Build the structure as an AST node
        const structureNode = this.buildControlStructure(structure, processedBlocks);
        if (structureNode) {
          statements.push(structureNode);
          this.structureToASTNode.set(structure, structureNode);
        }
      } else if (!this.structureBlocks.has(block)) {
        // Regular block - convert statements to AST nodes
        const blockStatements = this.blockStatements.get(block) || [];
        for (const stmt of blockStatements) {
          // OPTIMIZATION: Skip assignment statements that were merged into variable declarations
          // These are assignments with temporary names like __var_${address}__
          if (stmt.type === 'assignment' && stmt.variableName) {
            const match = stmt.variableName.match(/^__var_(\d+)__$/);
            if (match) {
              // This assignment was merged into a variable declaration, skip it
              continue;
            }
          }
          
          // Check if this is a return statement
          if (stmt.type === 'return') {
            hasEncounteredReturn = true;
            // For void functions, skip return statements without values
            if (isVoidFunction && !stmt.expression) {
              continue;
            }
          }
          
          const astNode = this.statementToASTNode(stmt);
          if (astNode) {
            statements.push(astNode);
          }
        }
        processedBlocks.add(block);
      }
    }
    
    return NWScriptAST.createBlock(statements);
  }

  /**
   * Build main body (code outside functions, if any)
   */
  private buildMainBody(): NWScriptBlockNode | undefined {
    if (!this.cfg.entryBlock) {
      return undefined;
    }
    
    // Check if entry block is part of a function
    for (const func of this.functions) {
      if (func.entryBlock === this.cfg.entryBlock) {
        return undefined; // Entry is a function, no main body
      }
    }
    
    // Build statements from entry block and following blocks
    const statements: NWScriptASTNode[] = [];
    const processedBlocks = new Set<NWScriptBasicBlock>();
    const visited = new Set<NWScriptBasicBlock>();
    
    const processBlock = (block: NWScriptBasicBlock) => {
      if (visited.has(block) || processedBlocks.has(block)) {
        return;
      }
      visited.add(block);
      
      // Check if this block is part of a function
      for (const func of this.functions) {
        if (func.bodyBlocks.includes(block)) {
          return; // Skip function blocks
        }
      }
      
      // Check if this block is part of a control structure
      const structure = this.findStructureForBlock(block);
      if (structure && !this.structureToASTNode.has(structure)) {
        const structureNode = this.buildControlStructure(structure, processedBlocks);
        if (structureNode) {
          statements.push(structureNode);
          this.structureToASTNode.set(structure, structureNode);
        }
      } else if (!this.structureBlocks.has(block)) {
        const blockStatements = this.blockStatements.get(block) || [];
        for (const stmt of blockStatements) {
          const astNode = this.statementToASTNode(stmt);
          if (astNode) {
            statements.push(astNode);
          }
        }
        processedBlocks.add(block);
      }
      
      // Process successors
      for (const successor of block.successors) {
        processBlock(successor);
      }
    };
    
    processBlock(this.cfg.entryBlock);
    
    return statements.length > 0 ? NWScriptAST.createBlock(statements) : undefined;
  }

  /**
   * Find the structure that contains a given block
   */
  private findStructureForBlock(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    for (const structure of this.structures) {
      if (this.blockInStructure(block, structure)) {
        return structure;
      }
    }
    return null;
  }

  /**
   * Check if a block is part of a structure (including nested)
   * Uses a visited set to prevent infinite recursion
   */
  private blockInStructure(block: NWScriptBasicBlock, structure: NWScriptControlStructure, visited: Set<NWScriptControlStructure> = new Set()): boolean {
    // Prevent infinite recursion by tracking visited structures
    if (visited.has(structure)) {
      return false;
    }
    visited.add(structure);
    
    if (structure.headerBlock === block) return true;
    if (structure.bodyBlocks.includes(block)) return true;
    if (structure.elseBlocks?.includes(block)) return true;
    if (structure.exitBlock === block) return true;
    if (structure.conditionBlock === block) return true;
    if (structure.incrementBlock === block) return true;
    
    // Check nested structures (pass visited set to prevent cycles)
    for (const nested of structure.nestedStructures) {
      if (this.blockInStructure(block, nested, visited)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Build a control structure as an AST node
   */
  private buildControlStructure(
    structure: NWScriptControlStructure,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptASTNode | null {
    // Mark structure blocks as processed
    processedBlocks.add(structure.headerBlock);
    if (structure.exitBlock) {
      processedBlocks.add(structure.exitBlock);
    }
    
    // Get condition expression
    let condition: NWScriptExpression | null = null;
    if (this.getConditionExpression) {
      condition = this.getConditionExpression(structure);
    }
    
    // If no condition and we need one, try to extract it
    if (!condition && structure.headerBlock.conditionInstruction) {
      // Try to build condition from header block
      condition = this.extractConditionFromBlock(structure.headerBlock);
    }
    
    switch (structure.type) {
      case ControlStructureType.IF:
      case ControlStructureType.IF_ELSE:
        return this.buildIfStructure(structure, condition, processedBlocks);
      
      case ControlStructureType.WHILE:
        return this.buildWhileStructure(structure, condition, processedBlocks);
      
      case ControlStructureType.DO_WHILE:
        return this.buildDoWhileStructure(structure, condition, processedBlocks);
      
      case ControlStructureType.FOR:
        return this.buildForStructure(structure, condition, processedBlocks);
      
      case ControlStructureType.SWITCH:
        return this.buildSwitchStructure(structure, processedBlocks);
      
      default:
        return null;
    }
  }

  /**
   * Build if/if-else structure
   */
  private buildIfStructure(
    structure: NWScriptControlStructure,
    condition: NWScriptExpression | null,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptIfNode | NWScriptIfElseNode | null {
    // Don't create a fallback condition - if we can't extract it, return null
    // This prevents generating incorrect if (1) statements
    if (!condition) {
      // Try one more time to extract from the block directly
      if (this.getConditionFromBlock) {
        condition = this.getConditionFromBlock(structure.headerBlock);
      }
      // If still null, we can't build a valid if statement
      if (!condition) {
        return null;
      }
    }
    
    // Build then body
    const thenBody = this.buildStructureBody(structure.bodyBlocks, processedBlocks, structure);
    
    // Build else body (if present)
    const elseBody = structure.elseBlocks && structure.elseBlocks.length > 0
      ? this.buildStructureBody(structure.elseBlocks, processedBlocks, structure)
      : undefined;
    
    // Use createIf which handles both if and if-else
    const ifNode = elseBody 
      ? NWScriptAST.createIf(condition, thenBody, elseBody, structure.headerBlock) as NWScriptIfElseNode
      : NWScriptAST.createIf(condition, thenBody, undefined, structure.headerBlock) as NWScriptIfNode;
    
    // Handle nested structures
    if (structure.nestedStructures.length > 0) {
      this.addNestedStructures(ifNode, structure, processedBlocks);
    }
    
    // Set location
    ifNode.location = {
      startBlock: structure.headerBlock,
      endBlock: structure.exitBlock,
      startAddress: structure.headerBlock.startInstruction.address,
      endAddress: structure.exitBlock 
        ? structure.exitBlock.endInstruction.address + structure.exitBlock.endInstruction.instructionSize
        : undefined
    };
    
    return ifNode;
  }

  /**
   * Build while loop structure
   */
  private buildWhileStructure(
    structure: NWScriptControlStructure,
    condition: NWScriptExpression | null,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptWhileNode | null {
    if (!condition) {
      condition = NWScriptExpression.constant(1, NWScriptDataType.INTEGER);
    }
    
    const body = this.buildStructureBody(structure.bodyBlocks, processedBlocks, structure);
    const whileNode = NWScriptAST.createWhile(condition, body, structure.headerBlock);
    
    // Handle nested structures
    if (structure.nestedStructures.length > 0) {
      this.addNestedStructures(whileNode, structure, processedBlocks);
    }
    
    // Set location
    whileNode.location = {
      startBlock: structure.headerBlock,
      endBlock: structure.exitBlock,
      startAddress: structure.headerBlock.startInstruction.address,
      endAddress: structure.exitBlock 
        ? structure.exitBlock.endInstruction.address + structure.exitBlock.endInstruction.instructionSize
        : undefined
    };
    
    return whileNode;
  }

  /**
   * Build do-while loop structure
   */
  private buildDoWhileStructure(
    structure: NWScriptControlStructure,
    condition: NWScriptExpression | null,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptDoWhileNode | null {
    if (!condition) {
      condition = NWScriptExpression.constant(1, NWScriptDataType.INTEGER);
    }
    
    const body = this.buildStructureBody(structure.bodyBlocks, processedBlocks, structure);
    const doWhileNode = NWScriptAST.createDoWhile(body, condition, structure.headerBlock);
    
    // Handle nested structures
    if (structure.nestedStructures.length > 0) {
      this.addNestedStructures(doWhileNode, structure, processedBlocks);
    }
    
    // Set location
    doWhileNode.location = {
      startBlock: structure.headerBlock,
      endBlock: structure.exitBlock,
      startAddress: structure.headerBlock.startInstruction.address,
      endAddress: structure.exitBlock 
        ? structure.exitBlock.endInstruction.address + structure.exitBlock.endInstruction.instructionSize
        : undefined
    };
    
    return doWhileNode;
  }

  /**
   * Build for loop structure
   */
  private buildForStructure(
    structure: NWScriptControlStructure,
    condition: NWScriptExpression | null,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptForNode | null {
    // Build init statement (if present)
    let init: NWScriptASTNode | undefined = undefined;
    if (structure.headerBlock.predecessors.size > 0) {
      // Look for initialization block before header
      for (const pred of structure.headerBlock.predecessors) {
        if (!pred.isLoopBody && pred !== structure.headerBlock) {
          const initStatements = this.blockStatements.get(pred) || [];
          if (initStatements.length > 0) {
            const initNode = this.statementToASTNode(initStatements[0]);
            if (initNode) {
              init = initNode;
            }
          }
        }
      }
    }
    
    // Build increment statement (if present)
    let increment: NWScriptASTNode | undefined = undefined;
    if (structure.incrementBlock) {
      const incStatements = this.blockStatements.get(structure.incrementBlock) || [];
      if (incStatements.length > 0) {
        const incNode = this.statementToASTNode(incStatements[0]);
        if (incNode) {
          increment = incNode;
        }
      }
    }
    
    const body = this.buildStructureBody(structure.bodyBlocks, processedBlocks, structure);
    const forNode = NWScriptAST.createFor(body, init, condition || undefined, increment, structure.headerBlock);
    
    // Handle nested structures
    if (structure.nestedStructures.length > 0) {
      this.addNestedStructures(forNode, structure, processedBlocks);
    }
    
    // Set location
    forNode.location = {
      startBlock: structure.headerBlock,
      endBlock: structure.exitBlock,
      startAddress: structure.headerBlock.startInstruction.address,
      endAddress: structure.exitBlock 
        ? structure.exitBlock.endInstruction.address + structure.exitBlock.endInstruction.instructionSize
        : undefined
    };
    
    return forNode;
  }

  /**
   * Build switch structure
   */
  private buildSwitchStructure(
    structure: NWScriptControlStructure,
    processedBlocks: Set<NWScriptBasicBlock>
  ): NWScriptSwitchNode | null {
    // Switch is not fully implemented in StructureBuilder yet
    // This is a placeholder
    const expression = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    const cases: NWScriptSwitchCaseNode[] = [];
    const body = this.buildStructureBody(structure.bodyBlocks, processedBlocks, structure);
    
    // For now, create a simple switch with no cases
    const switchNode = NWScriptAST.createSwitch(expression, cases, undefined, structure.headerBlock);
    
    // Set location
    switchNode.location = {
      startBlock: structure.headerBlock,
      endBlock: structure.exitBlock,
      startAddress: structure.headerBlock.startInstruction.address,
      endAddress: structure.exitBlock 
        ? structure.exitBlock.endInstruction.address + structure.exitBlock.endInstruction.instructionSize
        : undefined
    };
    
    return switchNode;
  }

  /**
   * Build body for a structure from its blocks
   * CRITICAL FIX: Sort blocks by CFG execution order to ensure correct statement ordering
   */
  private buildStructureBody(
    blocks: NWScriptBasicBlock[],
    processedBlocks: Set<NWScriptBasicBlock>,
    parentStructure?: NWScriptControlStructure
  ): NWScriptBlockNode {
    const statements: NWScriptASTNode[] = [];
    
    // CRITICAL FIX: Sort blocks by CFG execution order (topological order)
    // This ensures statements are generated in the correct execution order
    const blockSet = new Set(blocks);
    const allOrderedBlocks = this.cfg.getTopologicalOrder();
    const orderedBlocks = allOrderedBlocks.filter(block => blockSet.has(block));
    
    for (const block of orderedBlocks) {
      if (processedBlocks.has(block)) {
        continue;
      }
      
      // Check if this block is part of a nested structure
      const nestedStructure = this.findStructureForBlock(block);
      if (nestedStructure && nestedStructure !== parentStructure) {
        // Check if this nested structure is actually nested within the parent
        // (not just a different top-level structure)
        const isNested = parentStructure 
          ? this.isStructureNestedIn(nestedStructure, parentStructure)
          : false;
        
        if (isNested || !parentStructure) {
          // This is a nested structure - build it
          if (!this.structureToASTNode.has(nestedStructure)) {
            const nestedNode = this.buildControlStructure(nestedStructure, processedBlocks);
            if (nestedNode) {
              statements.push(nestedNode);
              this.structureToASTNode.set(nestedStructure, nestedNode);
            }
          }
          continue; // Skip processing this block as a regular statement
        }
      }
      
      // Regular block - convert statements
      // Exclude structure blocks (header, exit) but include body blocks
      // The header block's condition is extracted separately, and its statements
      // (if any before the condition) are part of the condition expression
      if (!this.structureBlocks.has(block)) {
        const blockStatements = this.blockStatements.get(block) || [];
        for (const stmt of blockStatements) {
          const astNode = this.statementToASTNode(stmt);
          if (astNode) {
            statements.push(astNode);
          }
        }
        processedBlocks.add(block);
      } else if (block === blocks[0] && parentStructure && block !== parentStructure.headerBlock && block !== parentStructure.exitBlock) {
        // Special case: first block in body that's marked as structure block
        // but isn't the header or exit - might be a condition block for loops
        const blockStatements = this.blockStatements.get(block) || [];
        for (const stmt of blockStatements) {
          const astNode = this.statementToASTNode(stmt);
          if (astNode) {
            statements.push(astNode);
          }
        }
        processedBlocks.add(block);
      }
    }
    
    return NWScriptAST.createBlock(statements);
  }

  /**
   * Find parent structure for a nested structure
   */
  private findParentStructure(structure: NWScriptControlStructure): NWScriptControlStructure | null {
    for (const parent of this.structures) {
      if (parent.nestedStructures.includes(structure)) {
        return parent;
      }
      // Check recursively
      for (const nested of parent.nestedStructures) {
        if (nested.nestedStructures.includes(structure)) {
          return nested;
        }
      }
    }
    return null;
  }

  /**
   * Check if a structure is nested within another structure
   */
  private isStructureNestedIn(nested: NWScriptControlStructure, parent: NWScriptControlStructure, visited: Set<NWScriptControlStructure> = new Set()): boolean {
    // Prevent infinite recursion
    if (visited.has(parent)) {
      return false;
    }
    visited.add(parent);
    
    // Check if nested structure's blocks are all within parent structure
    const parentBlocks = new Set<NWScriptBasicBlock>();
    parentBlocks.add(parent.headerBlock);
    parent.bodyBlocks.forEach(b => parentBlocks.add(b));
    parent.elseBlocks?.forEach(b => parentBlocks.add(b));
    if (parent.exitBlock) parentBlocks.add(parent.exitBlock);
    if (parent.conditionBlock) parentBlocks.add(parent.conditionBlock);
    if (parent.incrementBlock) parentBlocks.add(parent.incrementBlock);
    
    // Check if nested structure's header is in parent
    if (!parentBlocks.has(nested.headerBlock)) {
      // Check nested structures of parent
      for (const parentNested of parent.nestedStructures) {
        if (this.isStructureNestedIn(nested, parentNested, visited)) {
          return true;
        }
      }
      return false;
    }
    
    // Check if all nested structure's blocks are in parent
    if (!parentBlocks.has(nested.headerBlock)) return false;
    if (!nested.bodyBlocks.every(b => parentBlocks.has(b))) return false;
    if (nested.elseBlocks && !nested.elseBlocks.every(b => parentBlocks.has(b))) return false;
    if (nested.exitBlock && !parentBlocks.has(nested.exitBlock)) return false;
    
    return true;
  }

  /**
   * Add nested structures to a parent AST node
   */
  private addNestedStructures(
    parentNode: NWScriptASTNode,
    structure: NWScriptControlStructure,
    processedBlocks: Set<NWScriptBasicBlock>
  ): void {
    // Nested structures are already handled in buildStructureBody
    // This method is for future enhancements if needed
  }

  /**
   * Convert a statement to an AST node
   */
  private statementToASTNode(stmt: NWScriptStatement): NWScriptASTNode | null {
    switch (stmt.type) {
      case 'expression':
        if (stmt.expression) {
          return NWScriptAST.createExpressionStatement(stmt.expression);
        }
        return null;
      
      case 'assignment':
        if (stmt.variableName && stmt.expression) {
          return NWScriptAST.createAssignment(
            stmt.variableName,
            stmt.expression,
            stmt.isGlobal || false
          );
        }
        return null;
      
      case 'return':
        return NWScriptAST.createReturn(stmt.expression || undefined);
      
      case 'block':
        if (stmt.statements) {
          const blockStatements = stmt.statements
            .map(s => this.statementToASTNode(s))
            .filter((n): n is NWScriptASTNode => n !== null);
          return NWScriptAST.createBlock(blockStatements);
        }
        return null;
      
      // Control structures in statements are handled separately
      case 'if':
      case 'while':
      case 'doWhile':
      case 'for':
        // These should be handled by structure builder, not here
        return null;
      
      default:
        return null;
    }
  }

  /**
   * Extract condition expression from a block
   */
  private extractConditionFromBlock(block: NWScriptBasicBlock): NWScriptExpression | null {
    if (!block.conditionInstruction) {
      return null;
    }
    
    // Use StatementBuilder's method if available
    if (this.getConditionFromBlock) {
      return this.getConditionFromBlock(block);
    }
    
    // Fallback: return null (don't use placeholder constant)
    return null;
  }

  /**
   * Convert a value to an expression
   */
  private valueToExpression(value: any, dataType: NWScriptDataType): NWScriptExpression {
    return NWScriptExpression.constant(value, dataType);
  }
}

