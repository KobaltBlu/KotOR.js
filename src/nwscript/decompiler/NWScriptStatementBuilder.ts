import type { NWScriptControlFlowGraph } from "./NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "./NWScriptExpression";
import type { NWScriptControlStructure } from "./NWScriptControlStructureBuilder";
import { NWScriptStackSimulator } from "./NWScriptStackSimulator";
import { NWScriptExpressionBuilder } from "./NWScriptExpressionBuilder";
import { NWScriptORChainDetector } from "./NWScriptORChainDetector";
import { NWScriptANDChainDetector } from "./NWScriptANDChainDetector";
import type { NWScriptGlobalInit } from "./NWScriptGlobalVariableAnalyzer";
import { OP_STORE_STATE, OP_STORE_STATEALL, OP_JMP, OP_RETN, OP_ACTION, OP_JZ, OP_JNZ, OP_CPDOWNSP, OP_RSADD, OP_MOVSP } from '../NWScriptOPCodes';
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

/**
 * Represents a high-level statement in the decompiled code
 */
export interface NWScriptStatement {
  type: 'expression' | 'assignment' | 'return' | 'if' | 'while' | 'doWhile' | 'for' | 'block';
  expression?: NWScriptExpression;
  variableName?: string;
  isGlobal?: boolean;
  condition?: NWScriptExpression;
  body?: NWScriptStatement[];
  elseBody?: NWScriptStatement[];
  init?: NWScriptStatement;
  increment?: NWScriptStatement;
  statements?: NWScriptStatement[];
}

/**
 * Represents a processed basic block with high-level statements
 */
export interface NWScriptProcessedBlock {
  block: NWScriptBasicBlock;
  statements: NWScriptStatement[];
  entryPoint: boolean; // Whether this is an entry point for a control structure
  exitPoint: boolean; // Whether this is an exit point for a control structure
}

/**
 * Processes the Control Flow Graph into high-level statements.
 * This layer sits between the CFG and the code generator, converting
 * low-level instructions into structured statements.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptStatementBuilder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptStatementBuilder {
  private cfg: NWScriptControlFlowGraph;
  private structures: NWScriptControlStructure[] = [];
  private processedBlocks: Map<NWScriptBasicBlock, NWScriptProcessedBlock> = new Map();
  private pendingNestedCalls: Map<number, NWScriptExpression> = new Map();
  private stackSimulator: NWScriptStackSimulator;
  private expressionBuilder: NWScriptExpressionBuilder;
  private globalInits: NWScriptGlobalInit[] = [];
  private localInits: import('./NWScriptLocalVariableAnalyzer').NWScriptLocalInit[] = [];
  
  /**
   * Map from block to structure that contains it
   */
  private blockToStructure: Map<NWScriptBasicBlock, NWScriptControlStructure> = new Map();
  
  /**
   * Map from structure to its condition expression (cached)
   */
  private structureConditions: Map<NWScriptControlStructure, NWScriptExpression | null> = new Map();

  /**
   * Current function parameters (for condition extraction)
   */
  private currentFunctionParameters: import('./NWScriptFunctionAnalyzer').NWScriptFunctionParameter[] = [];
  
  /**
   * OR chain detector for simplifying OR expressions
   */
  private orChainDetector: NWScriptORChainDetector = new NWScriptORChainDetector();
  
  /**
   * AND chain detector for simplifying AND expressions
   */
  private andChainDetector: NWScriptANDChainDetector = new NWScriptANDChainDetector();

  constructor(
    cfg: NWScriptControlFlowGraph, 
    structures: NWScriptControlStructure[] = [], 
    globalInits: NWScriptGlobalInit[] = [],
    localInits: import('./NWScriptLocalVariableAnalyzer').NWScriptLocalInit[] = []
  ) {
    this.cfg = cfg;
    this.structures = structures;
    this.globalInits = globalInits;
    this.localInits = localInits;
    this.stackSimulator = new NWScriptStackSimulator();
    this.expressionBuilder = new NWScriptExpressionBuilder();
    this.buildBlockToStructureMap();
    this.setupGlobalVariableMapping();
    this.setupLocalVariableMapping();
  }
  
  /**
   * Set global variable initializations (for updating after initial construction)
   */
  setGlobalInits(globalInits: NWScriptGlobalInit[]): void {
    this.globalInits = globalInits;
    this.setupGlobalVariableMapping();
  }
  
  /**
   * Setup global variable mapping for stack simulator and expression builder
   */
  private setupGlobalVariableMapping(): void {
    // Create mapping from BP offset to global variable info
    const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      const varName = `globalVar_${i}`;
      // Use signed offset for map key (all stack offsets are negative)
      const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
      globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
    }
    
    // Set global variable mapping in stack simulator and expression builder
    this.stackSimulator.setGlobalVariables(globalVarMap);
    this.expressionBuilder.setGlobalVariables(globalVarMap);
  }
  
  /**
   * Setup local variable mapping for stack simulator and expression builder
   * CRITICAL: CPTOPSP offsets differ from CPDOWNSP offsets due to stack pointer movement
   * Pattern: Each RSADD -> CPDOWNSP -8 -> MOVSP -4 sequence moves SP down by 4
   * So CPTOPSP offsets are: first var at -12, second at -4, third at -8, etc.
   */
  /**
   * @deprecated This method uses non-stack-aware heuristics and hardcoded offset patterns.
   * The current decompiler pipeline uses stack-aware variable resolution via variableStackPositions maps.
   * This method is kept for backward compatibility but should not be used in new code.
   * 
   * NOTE: This class (NWScriptStatementBuilder) is not used in the current ControlNode-first pipeline.
   * Variable resolution is handled by NWScriptStackSimulator and NWScriptExpressionBuilder using
   * dynamic stack position tracking.
   */
  private setupLocalVariableMapping(): void {
    // WARNING: This method uses hardcoded offset patterns and heuristics, not stack-aware tracking.
    // It should not be used in the current decompiler pipeline.
    // Create mapping from SP offset to local variable info
    const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    
    // NON-STACK-AWARE: This uses hardcoded patterns and heuristics
    // The current pipeline should use stack-aware resolution instead
    const numVars = this.localInits.length;
    
    for (let i = 0; i < this.localInits.length; i++) {
      const init = this.localInits[i];
      const varName = `localVar_${i + 1}`; // Match AST builder naming (localVar_1, localVar_2, etc.)
      
      // NON-STACK-AWARE: Hardcoded offset calculations based on patterns
      // This should be replaced with actual stack state tracking
      let cptopspOffset: number;
      if (numVars === 3) {
        // Hardcoded pattern: -12, -4, -8
        const offsets = [0xFFFFFFF4, 0xFFFFFFFC, 0xFFFFFFF8]; // -12, -4, -8
        cptopspOffset = offsets[i];
      } else if (numVars === 2) {
        // Hardcoded pattern: -8, -4
        const offsets = [0xFFFFFFF8, 0xFFFFFFFC]; // -8, -4
        cptopspOffset = offsets[i];
      } else {
        // Heuristic-based calculation (still not stack-aware)
        const offsetSigned = -8 - (numVars - i - 1) * 4;
        cptopspOffset = offsetSigned < 0 ? offsetSigned + 0x100000000 : offsetSigned;
      }
      
      localVarMap.set(cptopspOffset, { name: varName, dataType: init.dataType });
      
      // Also map the CPDOWNSP offset in case it's used
      localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
    }
    
    // Set local variable mapping in stack simulator and expression builder
    this.stackSimulator.setLocalVariables(localVarMap);
    this.expressionBuilder.setLocalVariables(localVarMap);
  }

  /**
   * Set structures (for updating after initial construction)
   */
  setStructures(structures: NWScriptControlStructure[]): void {
    this.structures = structures;
    this.buildBlockToStructureMap();
    this.structureConditions.clear(); // Clear cached conditions
  }

  /**
   * Build mapping from blocks to structures that contain them
   */
  private buildBlockToStructureMap(): void {
    this.blockToStructure.clear();
    
    const addStructureBlocks = (structure: NWScriptControlStructure) => {
      // Map header block
      this.blockToStructure.set(structure.headerBlock, structure);
      
      // Map body blocks
      for (const block of structure.bodyBlocks) {
        this.blockToStructure.set(block, structure);
      }
      
      // Map else blocks
      if (structure.elseBlocks) {
        for (const block of structure.elseBlocks) {
          this.blockToStructure.set(block, structure);
        }
      }
      
      // Map exit block
      if (structure.exitBlock) {
        this.blockToStructure.set(structure.exitBlock, structure);
      }
      
      // Map condition block (for for loops)
      if (structure.conditionBlock) {
        this.blockToStructure.set(structure.conditionBlock, structure);
      }
      
      // Map increment block (for for loops)
      if (structure.incrementBlock) {
        this.blockToStructure.set(structure.incrementBlock, structure);
      }
      
      // Recursively handle nested structures
      for (const nested of structure.nestedStructures) {
        addStructureBlocks(nested);
      }
    };
    
    for (const structure of this.structures) {
      addStructureBlocks(structure);
    }
  }

  /**
   * Get the structure that contains a given block
   */
  getStructureForBlock(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    return this.blockToStructure.get(block) || null;
  }

  /**
   * Extract condition expression from a structure's header block
   * IMPROVED: Detects and simplifies OR chains
   */
  extractConditionExpression(structure: NWScriptControlStructure): NWScriptExpression | null {
    // Check cache first
    if (this.structureConditions.has(structure)) {
      return this.structureConditions.get(structure) || null;
    }

    const headerBlock = structure.headerBlock;
    if (!headerBlock.conditionInstruction) {
      this.structureConditions.set(structure, null);
      return null;
    }

    // IMPROVEMENT: Try AND chain detection first (before OR chain)
    this.andChainDetector.setFunctionParameters(this.currentFunctionParameters);
    this.andChainDetector.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    this.andChainDetector.setLocalVariables(this.stackSimulator.getLocalVariables());
    const andChainExpr = this.andChainDetector.detectANDChain(headerBlock);
    if (andChainExpr) {
      // Found an AND chain - use it
      this.structureConditions.set(structure, andChainExpr);
      return andChainExpr;
    }

    // IMPROVEMENT: Try OR chain detection
    this.orChainDetector.setFunctionParameters(this.currentFunctionParameters);
    // OR chain detector doesn't have setGlobalVariables/setLocalVariables yet, but it should use ExpressionBuilder
    const orChainExpr = this.orChainDetector.detectORChain(headerBlock);
    if (orChainExpr) {
      // Found an OR chain - use it
      this.structureConditions.set(structure, orChainExpr);
      return orChainExpr;
    }

    // Fallback to standard condition extraction
    // Create a temporary expression builder to extract the condition
    const conditionBuilder = new NWScriptExpressionBuilder();
    // Set function parameters for proper variable name mapping
    conditionBuilder.setFunctionParameters(this.currentFunctionParameters);
    conditionBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    conditionBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
    const conditionInstr = headerBlock.conditionInstruction;
    
    // Process instructions in the header block up to (but not including) the condition instruction
    // This builds up the stack with the condition value
    for (const instr of headerBlock.instructions) {
      if (instr === conditionInstr) {
        break; // Stop before the conditional jump
      }
      conditionBuilder.processInstruction(instr);
    }
    
    // The condition should be on top of the stack
    const conditionExpr = conditionBuilder.pop();
    
    if (conditionExpr) {
      // IMPROVEMENT: Try to simplify the expression (in case it's an AND/OR chain that wasn't detected)
      // Try AND simplification first, then OR
      let simplified = this.andChainDetector.simplifyExpression(conditionExpr);
      simplified = this.orChainDetector.simplifyExpression(simplified);
      this.structureConditions.set(structure, simplified);
      return simplified;
    }

    // Fallback: try to build condition from the condition instruction's context
    // This might require looking at the stack state before the condition
    this.structureConditions.set(structure, null);
    return null;
  }

  /**
   * Extract condition expression from a block (if it's a conditional block)
   * IMPROVED: Detects and simplifies OR chains
   */
  extractConditionFromBlock(block: NWScriptBasicBlock): NWScriptExpression | null {
    if (block.exitType !== 'conditional' || !block.conditionInstruction) {
      return null;
    }

    // Check if this block is part of a structure
    const structure = this.getStructureForBlock(block);
    if (structure) {
      return this.extractConditionExpression(structure);
    }

    // IMPROVEMENT: Try AND chain detection first (before OR chain)
    this.andChainDetector.setFunctionParameters(this.currentFunctionParameters);
    this.andChainDetector.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    this.andChainDetector.setLocalVariables(this.stackSimulator.getLocalVariables());
    const andChainExpr = this.andChainDetector.detectANDChain(block);
    if (andChainExpr) {
      // Found an AND chain - use it
      return andChainExpr;
    }

    // IMPROVEMENT: Try OR chain detection
    this.orChainDetector.setFunctionParameters(this.currentFunctionParameters);
    // TODO: Add setGlobalVariables/setLocalVariables to OR chain detector
    const orChainExpr = this.orChainDetector.detectORChain(block);
    if (orChainExpr) {
      // Found an OR chain - use it
      return orChainExpr;
    }

    // Fallback to standard condition extraction
    // Otherwise, extract directly from the block
    const conditionBuilder = new NWScriptExpressionBuilder();
    // Set function parameters for proper variable name mapping
    conditionBuilder.setFunctionParameters(this.currentFunctionParameters);
    conditionBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    conditionBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
    const conditionInstr = block.conditionInstruction;
    
    // Process instructions up to the condition instruction
    for (const instr of block.instructions) {
      if (instr === conditionInstr) {
        break;
      }
      conditionBuilder.processInstruction(instr);
    }
    
    const conditionExpr = conditionBuilder.pop();
    if (conditionExpr) {
      // IMPROVEMENT: Try to simplify the expression (AND first, then OR)
      let simplified = this.andChainDetector.simplifyExpression(conditionExpr);
      simplified = this.orChainDetector.simplifyExpression(simplified);
      return simplified;
    }
    
    return null;
  }

  /**
   * Process all blocks in the CFG into high-level statements
   */
  processBlocks(): Map<NWScriptBasicBlock, NWScriptProcessedBlock> {
    // CRITICAL FIX: Don't clear processedBlocks - it may already contain blocks
    // processed by processBlocksForFunction(). Only clear pendingNestedCalls.
    this.pendingNestedCalls.clear();

    // Process blocks in topological order
    // Only process blocks that haven't been processed yet (e.g., blocks outside functions)
    const blocks = this.cfg.getTopologicalOrder();

    for (const block of blocks) {
      if (!this.processedBlocks.has(block)) {
        this.processBlock(block);
      }
    }

    return this.processedBlocks;
  }

  /**
   * Process blocks for a specific function context
   * This maintains stack state across blocks within the same function
   * 
   * CRITICAL FIX: Process blocks in CFG execution order (topological/dominance order)
   * to ensure predecessors are processed before successors.
   */
  processBlocksForFunction(functionBlocks: NWScriptBasicBlock[], parameters: import('./NWScriptFunctionAnalyzer').NWScriptFunctionParameter[] = []): void {
    // Clear stack for new function
    this.stackSimulator.clear();
    this.pendingNestedCalls.clear();

    // Store current function parameters (for condition extraction)
    this.currentFunctionParameters = parameters;

    // Set function parameters for variable name mapping (StackSimulator only)
    // ExpressionBuilder parameters are set on-demand during condition extraction
    this.stackSimulator.setFunctionParameters(parameters);

    // CRITICAL FIX: Process blocks in CFG execution order, not arbitrary order
    // Use topological order to ensure predecessors are processed before successors
    // Filter to only include blocks that belong to this function
    const functionBlockSet = new Set(functionBlocks);
    const allBlocks = this.cfg.getTopologicalOrder();
    const orderedFunctionBlocks = allBlocks.filter(block => functionBlockSet.has(block));

    // Track stack state per block for merge point handling
    // Note: We track stack pointer and size, but full stack contents are complex to restore
    // This is a limitation without full SSA - proper solution would use phi-nodes
    const blockStackStates = new Map<NWScriptBasicBlock, { sp: number, size: number }>();

    for (const block of orderedFunctionBlocks) {
      if (this.processedBlocks.has(block)) {
        continue;
      }

      // CRITICAL FIX: Handle merge points (blocks with multiple predecessors)
      // At merge points, we need to reconstruct stack state from the dominator
      // Without full SSA, we can't perfectly restore stack state, but we can:
      // 1. Clear the stack (conservative approach)
      // 2. Or try to reconstruct from dominator (if stack sizes match)
      if (block.predecessors.size > 1) {
        // This is a merge point - reconstruct stack state from immediate dominator
        const idom = this.cfg.getImmediateDominator(block);
        if (idom && blockStackStates.has(idom)) {
          // For now, we clear the stack at merge points
          // This is conservative but safe - the block's instructions will rebuild the stack
          // A proper SSA implementation would use phi-nodes to merge values
          this.stackSimulator.clear();
        } else {
          // No dominator state available - clear stack to be safe
          this.stackSimulator.clear();
        }
      }

      // Process the block
      this.processBlock(block);

      // Save stack state after processing block (for future merge point handling)
      const stackStateAfter = {
        sp: this.stackSimulator.getStackPointer(),
        size: this.stackSimulator.getStackSize()
      };
      blockStackStates.set(block, stackStateAfter);
    }
  }

  /**
   * Process a single basic block into statements
   */
  private processBlock(block: NWScriptBasicBlock): NWScriptProcessedBlock {
    const statements: NWScriptStatement[] = [];
    
    // Reset stack simulator for this block (or maintain state across blocks in a function)
    // For now, we'll maintain state across blocks within the same function context
    
    // First pass: identify STORE_STATE+JMP patterns and extract nested calls
    this.identifyNestedCalls(block);

    // Second pass: process instructions into statements
    const skipAddresses = this.getSkipAddresses(block);
    
    for (let i = 0; i < block.instructions.length; i++) {
      const instruction = block.instructions[i];
      
      // Skip addresses marked for skipping (nested call code)
      if (skipAddresses.has(instruction.address)) {
        continue;
      }

      // Check if this instruction is at a JMP target that has a pending nested call
      if (this.pendingNestedCalls.has(instruction.address)) {
        const nestedCall = this.pendingNestedCalls.get(instruction.address);
        if (nestedCall) {
          // Push nested call onto stack (only StackSimulator, ExpressionBuilder is for conditions only)
          this.stackSimulator.push(nestedCall, instruction.address);
          this.pendingNestedCalls.delete(instruction.address);
        }
      }

      // For CPDOWNSP, check if it's a return value BEFORE processing
      // (because processing will consume the value from the stack)
      let isReturnValueWrite = false;
      let returnValueExpr: NWScriptExpression | null = null;
      
      if (instruction.code === OP_CPDOWNSP) {
        const offset = instruction.offset || 0;
        const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
        
        // Check if this is a return value write (CPDOWNSP to return location, followed by MOVSP and JMP to RETN)
        isReturnValueWrite = this.isReturnValueWrite(instruction, block);
        
        if (isReturnValueWrite) {
          // The value should be on the stack BEFORE processing CPDOWNSP
          const returnValue = this.stackSimulator.peek();
          if (returnValue) {
            returnValueExpr = returnValue.expression;
          }
        }
      }

      // Process instruction through stack simulator
      // NOTE: ExpressionBuilder is only used for condition extraction, not main processing
      // Using only StackSimulator here to avoid redundancy and potential inconsistencies
      const expr = this.stackSimulator.processInstruction(instruction);

      // Generate statement based on instruction type
      // For ACTION calls, we need to check the stack after processing
      // because handleAction pushes the result onto the stack
      if (instruction.code === OP_ACTION) {
        // The expression might be on the stack (for non-void functions)
        // or returned directly (for void functions)
        let actionExpr = expr;
        if (!actionExpr) {
          // For non-void functions, the result is pushed onto the stack
          // Check if it's there
          const stackTop = this.stackSimulator.peek();
          if (stackTop && stackTop.expression.type === NWScriptExpressionType.FUNCTION_CALL) {
            actionExpr = stackTop.expression;
          }
        }
        
        const statement = this.createStatement(instruction, actionExpr, block);
        if (statement) {
          statements.push(statement);
        }
      } else if (instruction.code === OP_CPDOWNSP) {
        // Handle return value writes
        if (isReturnValueWrite && returnValueExpr) {
          statements.push({
            type: 'return',
            expression: returnValueExpr
          });
        } else {
          // Check if this CPDOWNSP writes to a reserved variable space (offset -8)
          // Pattern: RSADD -> [expressions] -> CPDOWNSP -8 -> MOVSP -4
          const offset = instruction.offset || 0;
          const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
          
          if (offsetSigned === -8 && instruction.size === 4) {
            // This is writing to a reserved variable space
            // Look backwards in the block to find the most recent RSADD
            let rsaddInstr: NWScriptInstruction | null = null;
            let current = instruction.prevInstr;
            
            while (current && current.address >= block.startInstruction.address) {
              if (current.code === OP_RSADD) {
                rsaddInstr = current;
                break;
              }
              current = current.prevInstr;
            }
            
            // If we found an RSADD and there's a value on the stack, create an assignment
            if (rsaddInstr && this.stackSimulator.peek()) {
              const stackTop = this.stackSimulator.peek();
              if (stackTop) {
                // OPTIMIZATION: Directly create assignment statement without calling createStatement
                // This avoids unnecessary expression statement creation
                statements.push({
                  type: 'assignment',
                  variableName: `__var_${rsaddInstr.address}__`, // Temporary name, will be resolved in AST builder
                  expression: stackTop.expression,
                  isGlobal: false
                });
              }
            }
          } else {
            // Regular CPDOWNSP - use standard createStatement
            const statement = this.createStatement(instruction, expr, block);
            if (statement) {
              statements.push(statement);
            }
          }
        }
      } else {
        // For other non-ACTION instructions, use the standard createStatement
        const statement = this.createStatement(instruction, expr, block);
        if (statement) {
          statements.push(statement);
        }
      }
    }

    // Handle block exit (return statement)
    // If we already have a return statement from CPDOWNSP detection, keep it
    // Otherwise, check if there's a return value on the stack
    if (block.exitType === 'return') {
      const hasReturn = statements.some(stmt => stmt.type === 'return');
      
      if (!hasReturn) {
        // Check if there's a value on the stack that looks like an intentional return value
        const returnItem = this.stackSimulator.pop();
        if (returnItem) {
          // Only return if it's a function call result, variable, or constant
          // Don't return leftover values from initialization
          const isIntentionalReturn = 
            returnItem.expression.type === NWScriptExpressionType.FUNCTION_CALL ||
            returnItem.expression.type === NWScriptExpressionType.VARIABLE ||
            (returnItem.expression.type === NWScriptExpressionType.CONSTANT && 
             // Don't return string constants that look like global variable names
             !(typeof returnItem.expression.value === 'string' && 
               (returnItem.expression.value.startsWith('end_') || 
                returnItem.expression.value.startsWith('g_'))));
          
          if (isIntentionalReturn) {
            statements.push({
              type: 'return',
              expression: returnItem.expression
            });
          } else {
            // If not intentional, push it back
            this.stackSimulator.push(returnItem.expression, returnItem.address);
          }
        }
      }
    }

    const processed: NWScriptProcessedBlock = {
      block: block,
      statements: statements,
      entryPoint: block.isEntry || this.cfg.subroutineEntries.has(block.startInstruction.address),
      exitPoint: block.isExit
    };

    this.processedBlocks.set(block, processed);
    return processed;
  }

  /**
   * Identify STORE_STATE+JMP patterns and extract nested calls
   */
  private identifyNestedCalls(block: NWScriptBasicBlock): void {
    for (const instruction of block.instructions) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        const nextInstr = instruction.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP && nextInstr.offset) {
          const nestedCall = this.extractNestedCall(instruction, nextInstr);
          if (nestedCall) {
            const jmpTarget = nextInstr.address + nextInstr.offset;
            this.pendingNestedCalls.set(jmpTarget, nestedCall);
          }
        }
      }
    }
  }

  /**
   * Extract nested ACTION call from STORE_STATE + JMP pattern
   * The nested call code is between the JMP instruction and the RETN that ends it
   */
  private extractNestedCall(storeState: NWScriptInstruction, jmp: NWScriptInstruction): NWScriptExpression | null {
    if (!jmp.offset) return null;
    
    const jmpTarget = jmp.address + jmp.offset;
    const nestedSimulator = new NWScriptStackSimulator();
    let current = jmp.nextInstr;
    let lastActionExpr: NWScriptExpression | null = null;
    
    // Process instructions until we hit RETN (which ends the nested call)
    // The RETN should be before the jmpTarget
    while (current) {
      // Stop if we've reached or passed the JMP target
      if (current.address >= jmpTarget) {
        break;
      }
      
      // Stop at RETN (this ends the nested call)
      if (current.code === OP_RETN) {
        // Don't process RETN - the result should already be on the stack from the last ACTION
        break;
      }
      
      // Skip STORE_STATE and JMP instructions (they're control flow, not part of the expression)
      if (current.code === OP_STORE_STATE || current.code === OP_JMP) {
        current = current.nextInstr;
        continue;
      }
      
      // Process all other instructions (CONST, ACTION, etc.)
      const expr = nestedSimulator.processInstruction(current);
      if (current.code === OP_ACTION && expr) {
        // Track the last ACTION call - this is likely the nested call result
        lastActionExpr = expr;
      }
      current = current.nextInstr;
    }
    
    // The nested call result should be on the stack (pushed by the last ACTION)
    // If not, try to get it from the last ACTION expression we tracked
    const stackItem = nestedSimulator.pop();
    if (stackItem) {
      return stackItem.expression;
    }
    
    // Fallback: use the last ACTION expression
    return lastActionExpr;
  }

  /**
   * Get addresses to skip (nested call code between STORE_STATE+JMP and JMP target)
   */
  private getSkipAddresses(block: NWScriptBasicBlock): Set<number> {
    const skipAddresses = new Set<number>();
    
    for (const instruction of block.instructions) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        const nextInstr = instruction.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP && nextInstr.offset) {
          const jmpTarget = nextInstr.address + nextInstr.offset;
          let current = nextInstr.nextInstr;
          while (current && current.address < jmpTarget) {
            skipAddresses.add(current.address);
            if (current.code === OP_RETN) {
              break;
            }
            current = current.nextInstr;
          }
        }
      }
    }
    
    return skipAddresses;
  }

  /**
   * Create a statement from an instruction and its expression
   */
  private createStatement(
    instruction: NWScriptInstruction,
    expr: NWScriptExpression | null,
    block: NWScriptBasicBlock
  ): NWScriptStatement | null {
    // Handle ACTION calls
    if (instruction.code === OP_ACTION) {
      // Always try to get the expression - it should be on the stack after processing
      let actionExpr = expr;
      
      // If expr is null, try to get it from the stack (it was pushed by handleAction)
      if (!actionExpr) {
        const stackTop = this.stackSimulator.peek();
        if (stackTop && stackTop.expression.type === NWScriptExpressionType.FUNCTION_CALL) {
          actionExpr = stackTop.expression;
        } else {
          // StackSimulator should have the expression - if not, it's likely void
          // No need for ExpressionBuilder fallback (it's only for condition extraction)
        }
      }

      // If we still don't have an expression, try to build it from the instruction
      if (!actionExpr && instruction.actionDefinition) {
        const actionDef = instruction.actionDefinition;
        const argCount = instruction.argCount || 0;
        const args: NWScriptExpression[] = [];
        
        // Get arguments from the stack (they should be there before the ACTION call)
        // We need to look at the stack before the ACTION processed
        // Actually, the arguments were already popped by handleAction, so we can't get them here
        // But we can still create a statement with the function name
        const functionName = actionDef.name || `Action_${instruction.action}`;
        const returnType = actionDef.type || NWScriptDataType.VOID;
        
        actionExpr = NWScriptExpression.functionCall(functionName, args, returnType);
      }

      if (actionExpr) {
        // For void functions, always generate as statement
        if (actionExpr.dataType === NWScriptDataType.VOID) {
          return {
            type: 'expression',
            expression: actionExpr
          };
        } else {
          // For non-void functions, check if result is used or discarded
          const nextInstr = instruction.nextInstr;
          
          // Check if next instruction discards the result
          const isDiscarded = nextInstr && (
            nextInstr.code === 0x1B || // MOVSP (cleanup, result discarded)
            (nextInstr.code === 0x20 && block.exitType === 'return') // RETN (return value)
          );
          
          if (isDiscarded && nextInstr.code === 0x20) {
            // Return statement
            return {
              type: 'return',
              expression: actionExpr
            };
          } else {
            // Always generate as statement - even if result is used, we still need to show the call
            // The result will be on the stack and consumed by subsequent instructions
            return {
              type: 'expression',
              expression: actionExpr
            };
          }
        }
      }
    }

    // Other instruction types can be handled here as needed
    return null;
  }

  /**
   * Get processed block for a basic block
   */
  getProcessedBlock(block: NWScriptBasicBlock): NWScriptProcessedBlock | null {
    return this.processedBlocks.get(block) || null;
  }

  /**
   * Check if a CPDOWNSP instruction is writing a return value
   * Pattern: CONSTI <value> -> CPDOWNSP <return_offset> -> MOVSP -> JMP -> RETN
   */
  private isReturnValueWrite(cpdownsp: NWScriptInstruction, block: NWScriptBasicBlock): boolean {
    // Return values are written to offsets that are NOT -8 (which is for local variables)
    const offset = cpdownsp.offset || 0;
    const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
    
    // If it's -8, it's a local variable assignment, not a return
    if (offsetSigned === -8) {
      return false;
    }
    
    // Check if there's a value on the stack (the return value)
    if (!this.stackSimulator.peek()) {
      return false;
    }
    
    // Check if the next instruction is MOVSP (cleanup) followed by JMP
    // This pattern indicates a return value write
    let current = cpdownsp.nextInstr;
    let foundMovsp = false;
    let foundJmp = false;
    let jmpTarget: number | null = null;
    
    while (current && current.address <= block.endInstruction.address) {
      if (current.code === OP_MOVSP) {
        foundMovsp = true;
      } else if (current.code === OP_JMP && foundMovsp && current.offset !== undefined) {
        foundJmp = true;
        jmpTarget = current.address + current.offset;
        break;
      } else if (current.code === OP_RETN) {
        // Direct RETN after MOVSP (no JMP)
        if (foundMovsp) {
          return true;
        }
        break;
      }
      current = current.nextInstr;
    }
    
    // If we found MOVSP and JMP, check if the JMP target is a RETN block
    if (foundMovsp && foundJmp && jmpTarget !== null) {
      const targetBlock = this.cfg.getBlockForAddress(jmpTarget);
      if (targetBlock && targetBlock.exitType === 'return') {
        return true;
      }
      // Also check if the target block ends with RETN
      if (targetBlock && targetBlock.endInstruction && targetBlock.endInstruction.code === OP_RETN) {
        return true;
      }
    }
    
    // Also check if the block itself ends with RETN
    if (block.exitType === 'return' && foundMovsp) {
      return true;
    }
    
    return false;
  }

  /**
   * Get all processed blocks
   */
  getProcessedBlocks(): Map<NWScriptBasicBlock, NWScriptProcessedBlock> {
    return this.processedBlocks;
  }

  /**
   * Get condition expression for a structure (cached)
   */
  getConditionExpression(structure: NWScriptControlStructure): NWScriptExpression | null {
    if (!this.structureConditions.has(structure)) {
      this.extractConditionExpression(structure);
    }
    return this.structureConditions.get(structure) || null;
  }

  /**
   * Get all structures
   */
  getStructures(): NWScriptControlStructure[] {
    return this.structures;
  }

  /**
   * Check if a block is a structure header
   */
  isStructureHeader(block: NWScriptBasicBlock): boolean {
    for (const structure of this.structures) {
      if (structure.headerBlock === block) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a block is part of a structure body
   */
  isStructureBody(block: NWScriptBasicBlock): boolean {
    for (const structure of this.structures) {
      if (structure.bodyBlocks.includes(block)) {
        return true;
      }
      if (structure.elseBlocks?.includes(block)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get statements for blocks in a structure's body
   */
  getStatementsForStructureBody(structure: NWScriptControlStructure, isElse: boolean = false): NWScriptStatement[] {
    const blocks = isElse ? (structure.elseBlocks || []) : structure.bodyBlocks;
    const statements: NWScriptStatement[] = [];
    
    for (const block of blocks) {
      const processed = this.processedBlocks.get(block);
      if (processed) {
        statements.push(...processed.statements);
      }
    }
    
    return statements;
  }

  /**
   * Process blocks with structure awareness
   * This method processes blocks while being aware of which blocks belong to structures
   */
  processBlocksWithStructures(): Map<NWScriptBasicBlock, NWScriptProcessedBlock> {
    this.processedBlocks.clear();
    this.pendingNestedCalls.clear();

    // Process blocks in topological order
    const blocks = this.cfg.getTopologicalOrder();

    for (const block of blocks) {
      if (!this.processedBlocks.has(block)) {
        // Check if this block is a structure header
        const structure = this.getStructureForBlock(block);
        if (structure && structure.headerBlock === block) {
          // Extract condition expression for this structure
          this.extractConditionExpression(structure);
        }
        
        // Process the block normally
        this.processBlock(block);
      }
    }

    return this.processedBlocks;
  }
}

