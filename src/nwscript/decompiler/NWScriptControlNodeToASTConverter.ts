import type { ControlNode, BasicBlockNode, IfNode, IfElseNode, WhileNode, DoWhileNode, ForNode, SwitchNode, SequenceNode } from "./NWScriptControlStructureBuilder";
import type { NWScriptControlFlowGraph } from "./NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptFunction } from "./NWScriptFunctionAnalyzer";
import type { NWScriptGlobalInit } from "./NWScriptGlobalVariableAnalyzer";
import type { NWScriptLocalInit } from "./NWScriptLocalVariableAnalyzer";
import type { NWScriptControlStructureBuilder } from "./NWScriptControlStructureBuilder";
import { NWScriptAST, NWScriptASTNodeType, type NWScriptASTNode, type NWScriptProgramNode, type NWScriptFunctionNode, type NWScriptBlockNode, type NWScriptIfNode, type NWScriptIfElseNode, type NWScriptWhileNode, type NWScriptDoWhileNode, type NWScriptForNode, type NWScriptSwitchNode, type NWScriptSwitchCaseNode, type NWScriptSwitchDefaultNode, type NWScriptExpressionStatementNode, type NWScriptAssignmentNode, type NWScriptReturnNode, type NWScriptBreakNode, type NWScriptContinueNode } from "./NWScriptAST";
import { NWScriptExpressionBuilder } from "./NWScriptExpressionBuilder";
import { NWScriptStackSimulator } from "./NWScriptStackSimulator";
import { NWScriptExpression } from "./NWScriptExpression";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import { OP_RETN, OP_JMP, OP_CPDOWNSP, OP_MOVSP, OP_RSADD, OP_CPTOPSP } from '../NWScriptOPCodes';
import type { NWScriptInstruction } from '../NWScriptInstruction';

/**
 * Converts ControlNode tree to NWScriptASTNode tree.
 * This is the bridge between the control flow structure and the abstract syntax tree.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptControlNodeToASTConverter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptControlNodeToASTConverter {
  private cfg: NWScriptControlFlowGraph;
  private functions: NWScriptFunction[];
  private globalInits: NWScriptGlobalInit[];
  private localInits: NWScriptLocalInit[];
  private expressionBuilder: NWScriptExpressionBuilder;
  private stackSimulator: NWScriptStackSimulator;
  
  /**
   * Map from blocks to their function context (for variable resolution)
   */
  private blockToFunction: Map<NWScriptBasicBlock, NWScriptFunction | null> = new Map();
  
  /**
   * Map from blocks to statements (cached)
   */
  private blockStatements: Map<NWScriptBasicBlock, NWScriptASTNode[]> = new Map();
  
  /**
   * Map from RETN blocks to their return value expressions
   * Used to preserve return values across blocks
   */
  private returnValueExpressions: Map<NWScriptBasicBlock, NWScriptExpression> = new Map();
  
  /**
   * Track where variables live on the stack per function
   * Maps function -> stack position -> variable index
   * Key: stack position (absolute address where variable lives)
   * Value: variable index in localInits array
   */
  private functionVariableStackPositions: Map<NWScriptFunction | null, Map<number, number>> = new Map();
  
  /**
   * Track variable allocations per function
   * Maps function to the number of variables allocated so far
   */
  private functionVariableCounts: Map<NWScriptFunction | null, number> = new Map();
  
  /**
   * Track the current function being processed
   * Used to maintain stack state across blocks
   */
  private currentFunction: NWScriptFunction | null = null;
  
  /**
   * Track if stack has been initialized for current function
   * Prevents re-initialization when processing multiple blocks
   */
  private functionStackInitialized: Set<NWScriptFunction | null> = new Set();

  constructor(
    cfg: NWScriptControlFlowGraph,
    functions: NWScriptFunction[] = [],
    globalInits: NWScriptGlobalInit[] = [],
    localInits: NWScriptLocalInit[] = []
  ) {
    this.cfg = cfg;
    this.functions = functions;
    this.globalInits = globalInits;
    this.localInits = localInits;
    
    // Initialize expression builder and stack simulator with variable mappings
    this.expressionBuilder = new NWScriptExpressionBuilder();
    this.stackSimulator = new NWScriptStackSimulator();
    
    this.setupVariableMappings();
    this.buildBlockToFunctionMap();
  }

  /**
   * Setup variable mappings for expression builder and stack simulator
   */
  private setupVariableMappings(): void {
    // Setup global variables
    const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      const varName = `globalVar_${i}`;
      const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
      globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
    }
    this.expressionBuilder.setGlobalVariables(globalVarMap);
    this.stackSimulator.setGlobalVariables(globalVarMap);
    
    // Setup local variables (per function)
    // This will be done per-function when processing
  }

  /**
   * Set function parameters for expression builder and stack simulator
   */
  private setFunctionParametersForBuilders(func: NWScriptFunction): void {
    // Both ExpressionBuilder and StackSimulator expect an array
    this.expressionBuilder.setFunctionParameters(func.parameters);
    this.stackSimulator.setFunctionParameters(func.parameters);
  }

  /**
   * Build map from blocks to their containing function
   */
  private buildBlockToFunctionMap(): void {
    this.blockToFunction.clear();
    
    for (const func of this.functions) {
      for (const block of func.bodyBlocks) {
        this.blockToFunction.set(block, func);
      }
    }
  }

  /**
   * Convert ControlNode tree to AST Program node
   * @param mainControlNode The ControlNode tree for the main function
   * @param structureBuilder The structure builder (needed to build ControlNode trees for functions)
   */
  convertToAST(mainControlNode: ControlNode, structureBuilder: NWScriptControlStructureBuilder): NWScriptProgramNode {
    // Build global variable declarations
    const globalVars = this.buildGlobalVariableDeclarations();
    
    // Build function nodes (including main function)
    // The main function should be output as a function, not as mainBody
    const functionNodes = this.buildFunctionNodes(structureBuilder, mainControlNode);
    
    // Main body should only be used if there's code outside of functions
    // For now, we'll leave it undefined since all code is in functions
    const mainBody: NWScriptBlockNode | undefined = undefined;
    
    // Create program node
    const program = NWScriptAST.createProgram(globalVars, functionNodes, mainBody);
    
    // Build parent relationships
    NWScriptAST.buildParentRelationships(program);
    
    return program;
  }

  /**
   * Convert a ControlNode to an AST Block node
   */
  convertControlNodeToBlock(controlNode: ControlNode, functionContext: NWScriptFunction | null): NWScriptBlockNode {
    const statements: NWScriptASTNode[] = [];
    
    // Initialize stack state for this function if not already done
    // This ensures stack state persists across blocks within the same function
    if (functionContext !== this.currentFunction) {
      // New function - reset stack state
      this.currentFunction = functionContext;
      this.stackSimulator.clear();
      this.functionStackInitialized.delete(functionContext);
      
      // Initialize variable tracking for this function
      if (!this.functionVariableCounts.has(functionContext)) {
        this.functionVariableCounts.set(functionContext, 0);
      }
      if (!this.functionVariableStackPositions.has(functionContext)) {
        this.functionVariableStackPositions.set(functionContext, new Map());
      }
    }
    
    // Setup function context for variable resolution
    if (functionContext && !this.functionStackInitialized.has(functionContext)) {
      this.setupFunctionContext(functionContext);
      this.functionStackInitialized.add(functionContext);
    }
    
    // Convert the control node to statements
    this.convertControlNode(controlNode, functionContext, statements);
    
    return NWScriptAST.createBlock(statements);
  }

  /**
   * Convert a ControlNode to AST nodes (recursive)
   */
  private convertControlNode(
    controlNode: ControlNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    console.log(`[ControlNode] Converting ${controlNode.type} node`);
    switch (controlNode.type) {
      case 'basic_block':
        console.log(`[ControlNode] Processing basic_block node, block ID: ${controlNode.block.id}, instructions: ${controlNode.block.instructions.length}`);
        this.convertBasicBlock(controlNode, functionContext, statements);
        break;
      
      case 'if':
        // CRITICAL: Process header block first to handle RSADD and assignments
        // The header block may contain variable declarations before the condition
        // We need to process these BEFORE the if statement is created
        const ifNode = controlNode as IfNode;
        if (ifNode.condition.type === 'basic_block') {
          const headerBlock = ifNode.condition.block;
          const conditionInstr = headerBlock.conditionInstruction;
          
          if (conditionInstr) {
            // Process instructions BEFORE the condition instruction
            // These are variable declarations, assignments, etc.
            const preConditionInstructions = headerBlock.instructions.filter(instr => 
              instr.address < conditionInstr.address
            );
            
            if (preConditionInstructions.length > 0) {
              console.log(`[ControlNode] Processing ${preConditionInstructions.length} pre-condition instructions in if header block ${headerBlock.id}`);
              
              // Process these instructions using convertBasicBlock logic
              // But we need to process them in the context of the current function
              // Create a temporary basic block node for just the pre-condition instructions
              // Actually, we should just process them directly using the same logic as convertBasicBlock
              
              // Get variable tracking maps
              const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
              
              // Initialize if needed
              if (!this.functionVariableCounts.has(functionContext)) {
                this.functionVariableCounts.set(functionContext, 0);
              }
              if (!this.functionVariableStackPositions.has(functionContext)) {
                this.functionVariableStackPositions.set(functionContext, new Map());
              }
              
              const preConditionStatements: NWScriptASTNode[] = [];
              
              // Process each pre-condition instruction
              for (const instr of preConditionInstructions) {
                // Track RSADD BEFORE processing
                let isRsadd = false;
                if (instr.code === OP_RSADD) {
                  isRsadd = true;
                  const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
                  const currentCount = this.functionVariableCounts.get(functionContext) || 0;
                  
                  console.log(`[RSADD] Address: 0x${instr.address.toString(16).padStart(8, '0')}, SP before: ${stackPosBeforeRsadd}, Variable index: ${currentCount}`);
                  
                  variableStackPositions.set(stackPosBeforeRsadd, currentCount);
                  this.functionVariableCounts.set(functionContext, currentCount + 1);
                  
                  // Process RSADD instruction
                  this.stackSimulator.processInstruction(instr);
                  continue; // Skip creating statements for RSADD
                }
                
                // Check for CPDOWNSP assignments
                // CRITICAL: Calculate target position BEFORE processing the instruction
                // CPDOWNSP writes to stack[SP + offset] where SP is BEFORE the instruction
                if (instr.code === OP_CPDOWNSP) {
                  // Get SP BEFORE processing the instruction
                  const spBefore = this.stackSimulator.getStackPointer();
                  const offset = instr.offset || 0;
                  const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                  const targetStackPos = spBefore + offsetSigned;
                  
                  // Now process the instruction
                  const processedExpr = this.stackSimulator.processInstruction(instr);
                  const valueExpr = processedExpr || this.stackSimulator.peek()?.expression;
                  if (valueExpr) {
                    console.log(`[CPDOWNSP] Pre-condition: Address: 0x${instr.address.toString(16).padStart(8, '0')}, SP before: ${spBefore}, Offset: ${offsetSigned}, Target pos: ${targetStackPos}`);
                    console.log(`[CPDOWNSP] Pre-condition: Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
                    
                    const varIndex = variableStackPositions.get(targetStackPos);
                    console.log(`[CPDOWNSP] Pre-condition: Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
                    
                    if (varIndex !== undefined && varIndex >= 0 && varIndex < this.localInits.length) {
                      const varName = `localVar_${varIndex}`;
                      console.log(`[CPDOWNSP] Pre-condition: ✓ Creating assignment: ${varName} = <expression>`);
                      preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                      continue;
                    }
                    
                    // Try nearby positions
                    for (let delta = -4; delta <= 4; delta += 4) {
                      const nearbyPos = targetStackPos + delta;
                      const nearbyVarIndex = variableStackPositions.get(nearbyPos);
                      if (nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < this.localInits.length) {
                        const varName = `localVar_${nearbyVarIndex}`;
                        console.log(`[CPDOWNSP] Pre-condition: ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${varName}`);
                        preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                        continue;
                      }
                    }
                    
                    // Fallback
                    if (offsetSigned === -8) {
                      const varCount = this.functionVariableCounts.get(functionContext) || 0;
                      if (varCount > 0) {
                        const fallbackVarIndex = varCount - 1;
                        if (fallbackVarIndex >= 0 && fallbackVarIndex < this.localInits.length) {
                          const varName = `localVar_${fallbackVarIndex}`;
                          console.log(`[CPDOWNSP] Pre-condition: ✓ Using fallback variable: ${varName}`);
                          preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                          continue;
                        }
                      }
                    }
                    
                    console.log(`[CPDOWNSP] Pre-condition: ✗ No variable found for assignment at position ${targetStackPos}`);
                  }
                  continue; // Skip adding as expression statement
                }
                
                // Process other instructions
                const expr = this.stackSimulator.processInstruction(instr);
                
                // Skip creating expression statements for intermediate values in pre-condition processing
                // These are typically:
                // - String constants (function parameters)
                // - Function call results that will be assigned
                // - Intermediate expressions that are part of larger expressions
                // We only want to output statements that are meaningful (assignments, function calls with side effects, etc.)
                // For now, skip all expression statements in pre-condition processing
                // They will be handled as part of assignments or condition extraction
                // The condition expression will be extracted separately
              }
              
              // Add pre-condition statements to parent
              statements.push(...preConditionStatements);
              console.log(`[ControlNode] Added ${preConditionStatements.length} pre-condition statements before if`);
            }
          }
        }
        
        // Now create the if node (condition extraction will work correctly)
        // But we need to prevent duplicate processing of the header block
        statements.push(this.convertIfNode(controlNode, functionContext));
        break;
      
      case 'if_else':
        statements.push(this.convertIfElseNode(controlNode, functionContext));
        break;
      
      case 'while':
        statements.push(this.convertWhileNode(controlNode, functionContext));
        break;
      
      case 'do_while':
        statements.push(this.convertDoWhileNode(controlNode, functionContext));
        break;
      
      case 'for':
        statements.push(this.convertForNode(controlNode, functionContext));
        break;
      
      case 'switch':
        statements.push(this.convertSwitchNode(controlNode, functionContext));
        break;
      
      case 'sequence':
        // Convert each node in sequence
        console.log(`[ControlNode] Processing sequence node with ${controlNode.nodes.length} nodes`);
        for (let i = 0; i < controlNode.nodes.length; i++) {
          console.log(`[ControlNode] Sequence node ${i + 1}/${controlNode.nodes.length}: ${controlNode.nodes[i].type}`);
          this.convertControlNode(controlNode.nodes[i], functionContext, statements);
        }
        break;
    }
  }

  /**
   * Convert a basic block to AST statements
   */
  private convertBasicBlock(
    blockNode: BasicBlockNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    const block = blockNode.block;
    
    // Check if we've already processed this block
    if (this.blockStatements.has(block)) {
      statements.push(...this.blockStatements.get(block)!);
      return;
    }
    
    // Setup function context if available
    if (!functionContext) {
      functionContext = this.blockToFunction.get(block) || null;
      if (functionContext) {
        this.setupFunctionContext(functionContext);
      }
    }
    
    // Process instructions in the block
    const blockStatements: NWScriptASTNode[] = [];
    
    // IMPORTANT: Do NOT clear the stack simulator between blocks in the same function
    // Stack state must persist across blocks so that:
    // 1. Variables allocated in earlier blocks remain accessible
    // 2. Stack positions remain consistent
    // 3. Variable-to-stack-position mappings remain valid
    // 
    // Stack is only cleared when entering a new function (handled in convertControlNodeToBlock)
    
    // Ensure function context is set up (should already be done, but double-check)
    if (functionContext && !this.functionStackInitialized.has(functionContext)) {
      this.setupFunctionContext(functionContext);
      this.functionStackInitialized.add(functionContext);
    }
    
    // Initialize variable tracking for this function if not already set
    if (!this.functionVariableCounts.has(functionContext)) {
      this.functionVariableCounts.set(functionContext, 0);
    }
    if (!this.functionVariableStackPositions.has(functionContext)) {
      this.functionVariableStackPositions.set(functionContext, new Map());
    }
    
    // Get the variable stack positions map for this function
    const variableStackPositions = this.functionVariableStackPositions.get(functionContext)!;
    
    console.log(`[Block] Processing block ${block.id} (${block.instructions.length} instructions), Function: ${functionContext?.name || 'main'}`);
    console.log(`[Block] Initial stack state - SP: ${this.stackSimulator.getStackPointer()}, Stack size: ${this.stackSimulator.getStackSize()}`);
    console.log(`[Block] Variable count: ${this.functionVariableCounts.get(functionContext) || 0}`);
    console.log(`[Block] Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', ') || 'none');
    
    // Track if we're processing a return value assignment
    let returnValueExpr: NWScriptExpression | undefined = undefined;
    let retnBlock: NWScriptBasicBlock | null = null;
    
    console.log(`[Block] Block ${block.id} instructions:`, block.instructions.map(instr => `0x${instr.address.toString(16).padStart(8, '0')} ${instr.code === OP_RSADD ? 'RSADD' : instr.code === OP_CPDOWNSP ? 'CPDOWNSP' : 'other'}`).join(', '));
    
    for (let i = 0; i < block.instructions.length; i++) {
      const instruction = block.instructions[i];
      
      // Track variable allocations (RSADD reserves space for a variable)
      // IMPORTANT: Do this BEFORE processing the instruction, so we capture the stack position
      // where the variable will live (before RSADD pushes the default value)
      let isRsadd = false;
      if (instruction.code === OP_RSADD) {
        isRsadd = true;
        // RSADD pushes a default value onto the stack (0, 0.0, '', etc.)
        // The variable lives at the current stack position (before RSADD executes)
        // After RSADD, SP moves up by 4, and the variable is at the old SP position
        const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
        const currentCount = this.functionVariableCounts.get(functionContext) || 0;
        
        console.log(`[RSADD] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${stackPosBeforeRsadd}, Variable index: ${currentCount}, Function: ${functionContext?.name || 'main'}`);
        
        // Record where this variable lives on the stack
        // Variable index = currentCount (0-based)
        variableStackPositions.set(stackPosBeforeRsadd, currentCount);
        this.functionVariableCounts.set(functionContext, currentCount + 1);
        
        console.log(`[RSADD] Recorded variable ${currentCount} at stack position ${stackPosBeforeRsadd}`);
        console.log(`[RSADD] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
      }
      
      // Process instruction through stack simulator
      // This ensures the stack state is correct when we check for return values
      const expr = this.stackSimulator.processInstruction(instruction);
      
      // Skip creating statements for RSADD (it's just variable allocation)
      if (isRsadd) {
        continue;
      }
      
      // Check if this is a return value write (CPDOWNSP followed by MOVSP and RETN)
      let isReturnWrite = false;
      if (instruction.code === OP_CPDOWNSP) {
        isReturnWrite = this.isReturnValueWrite(instruction, block, i);
        if (isReturnWrite) {
          // This is a return value assignment - the expression should be on the stack
          // CPDOWNSP keeps the value on the stack, so we can get it after processing
          returnValueExpr = this.stackSimulator.peek()?.expression;
          
          // Find the RETN block that this return value is for
          if (i + 2 < block.instructions.length) {
            const nextInstr = block.instructions[i + 2];
            if (nextInstr.code === OP_RETN) {
              retnBlock = block;
            } else if (nextInstr.code === OP_JMP && nextInstr.offset !== undefined) {
              const jmpTarget = nextInstr.address + nextInstr.offset;
              retnBlock = this.cfg.getBlockForAddress(jmpTarget);
            }
          } else {
            // Check successors for RETN
            for (const successor of block.successors) {
              if (successor.exitType === 'return' || 
                  (successor.endInstruction && successor.endInstruction.code === OP_RETN)) {
                retnBlock = successor;
                break;
              }
            }
          }
          
          // Store the return value expression for the RETN block
          if (retnBlock && returnValueExpr) {
            this.returnValueExpressions.set(retnBlock, returnValueExpr);
          }
        }
      }
      
      // Check for special instructions
      if (instruction.code === OP_RETN) {
        // Return statement
        // First check if we have a saved return value expression for this block
        let returnExpr = this.returnValueExpressions.get(block);
        if (!returnExpr) {
          // Fallback: use the expression from the current block or peek at stack
          returnExpr = returnValueExpr || this.stackSimulator.peek()?.expression || undefined;
        }
        blockStatements.push(NWScriptAST.createReturn(returnExpr));
        // RETN pops the return value, so we need to pop it
        this.stackSimulator.pop();
        // Clean up
        this.returnValueExpressions.delete(block);
        returnValueExpr = undefined; // Reset
        continue;
      }
      
      // Skip creating statements for return value assignments (they're handled by RETN)
      if (isReturnWrite) {
        // Don't create an assignment statement - this is the return value
        // The expression was already saved above, and will be used when we hit RETN
        continue;
      }
      
      // Check if CPDOWNSP is writing to a local variable (assignment)
      if (instruction.code === OP_CPDOWNSP && !isReturnWrite) {
        // CRITICAL: CPDOWNSP writes to stack[SP + offset] where SP is BEFORE the instruction
        // Calculate the target position BEFORE processing the instruction
        const spBefore = this.stackSimulator.getStackPointer();
        const offset = instruction.offset || 0;
        const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
        const targetStackPos = spBefore + offsetSigned;
        
        console.log(`[CPDOWNSP] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${spBefore}, Offset: ${offsetSigned} (0x${offset.toString(16)}), Target pos: ${targetStackPos}`);
        
        // Now process the instruction (this may modify the stack)
        const processedExpr = this.stackSimulator.processInstruction(instruction);
        
        console.log(`[CPDOWNSP] Stack size after: ${this.stackSimulator.getStackSize()}, Has expr: ${!!processedExpr}`);
        
        // Get the expression from the stack (CPDOWNSP copies from top of stack)
        // If processedExpr is null, try to get it from the stack
        const valueExpr = processedExpr || this.stackSimulator.peek()?.expression;
        
        if (!valueExpr) {
          console.log(`[CPDOWNSP] No expression found - skipping assignment`);
          // No value to assign - skip
          continue;
        }
        
        console.log(`[CPDOWNSP] Expression type: ${valueExpr.type}, Value: ${JSON.stringify(valueExpr).substring(0, 100)}`);
        console.log(`[CPDOWNSP] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
        
        // Look up which variable lives at this stack position
        const varIndex = variableStackPositions.get(targetStackPos);
        
        console.log(`[CPDOWNSP] Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
        
        if (varIndex !== undefined && varIndex >= 0 && varIndex < this.localInits.length) {
          // This is an assignment to a local variable
          const varName = `localVar_${varIndex}`;
          console.log(`[CPDOWNSP] ✓ Creating assignment: ${varName} = <expression>`);
          blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
          continue;
        }
        
        console.log(`[CPDOWNSP] No exact match at position ${targetStackPos}, trying nearby positions...`);
        
        // Fallback: If we didn't find it by exact stack position, try nearby positions
        // Sometimes stack positions might be off by a few bytes due to intermediate operations
        // Check positions within ±4 bytes
        for (let delta = -4; delta <= 4; delta += 4) {
          const nearbyPos = targetStackPos + delta;
          const nearbyVarIndex = variableStackPositions.get(nearbyPos);
          if (nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < this.localInits.length) {
            const varName = `localVar_${nearbyVarIndex}`;
            console.log(`[CPDOWNSP] ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${varName}`);
            blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
            continue;
          }
        }
        
        // Last resort fallback: CPDOWNSP -8 typically writes to the most recently allocated variable
        if (offsetSigned === -8) {
          const varCount = this.functionVariableCounts.get(functionContext) || 0;
          console.log(`[CPDOWNSP] Using fallback heuristic: offset -8, var count: ${varCount}`);
          if (varCount > 0) {
            const fallbackVarIndex = varCount - 1;
            if (fallbackVarIndex >= 0 && fallbackVarIndex < this.localInits.length) {
              const varName = `localVar_${fallbackVarIndex}`;
              console.log(`[CPDOWNSP] ✓ Using fallback variable: ${varName}`);
              blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
              continue;
            }
          }
        }
        
        console.log(`[CPDOWNSP] ✗ No variable found for assignment at position ${targetStackPos}`);
      }
      
      // Check if CPTOPSP is reading from a local variable
      // Note: The expression from stackSimulator should already have the correct variable name
      // if the localVariables map is set up correctly. Variable reads are typically intermediate
      // values that are part of larger expressions, so we don't need to create statements for them.
      if (instruction.code === OP_CPTOPSP && expr) {
        // CPTOPSP reads a variable and pushes it to the stack
        // This is typically an intermediate value used in a larger expression
        // We don't create a statement for it - it will be part of the expression that uses it
        // Skip creating a statement for variable reads
        continue;
      }
      
      // Check for break/continue (these would be in JMP instructions to specific targets)
      // For now, we'll handle these when we process control structures
      
      // If we got an expression, it might be an assignment or expression statement
      // However, we should filter out intermediate expressions that are:
      // - String constants (function parameters)
      // - Variable reads (intermediate values)
      // - Simple integer constants (0, 1) that are intermediate values
      // - Binary operations that are intermediate (part of larger expressions)
      if (expr) {
        // Skip string constants (they're typically function parameters)
        if (expr.type === 'constant' && expr.dataType === NWScriptDataType.STRING) {
          continue;
        }
        
        // Skip variable reads - they're intermediate values used in larger expressions
        // Variable reads are typically intermediate - skip them
        if (expr.type === 'variable') {
          continue;
        }
        
        // Skip simple integer constants that are likely intermediate values
        if (expr.type === 'constant' && expr.dataType === NWScriptDataType.INTEGER && 
            (expr.value === 0 || expr.value === 1)) {
          // These are often intermediate values (like comparison results, boolean values)
          continue;
        }
        
        // Skip binary operations, comparisons, and logical operations
        // These are typically intermediate (part of conditions or larger expressions)
        if (expr.type === 'binary_op' || expr.type === 'comparison' || expr.type === 'logical') {
          // Binary operations, comparisons, and logical operations are typically intermediate
          // They'll be part of conditions, assignments, or other expressions
          continue;
        }
        
        // For function calls, create an expression statement (they might have side effects)
        // Most other expression types are intermediate values and should be skipped
        if (expr.type === 'function_call') {
          blockStatements.push(NWScriptAST.createExpressionStatement(expr));
        }
        // For other expression types, be conservative and skip them
        // Most expressions are intermediate values
      }
    }
    
    // Cache the statements
    this.blockStatements.set(block, blockStatements);
    statements.push(...blockStatements);
  }

  /**
   * Convert IfNode to AST
   */
  private convertIfNode(node: IfNode, functionContext: NWScriptFunction | null): NWScriptIfNode {
    // NOTE: Pre-condition instructions (RSADD, CPDOWNSP, etc.) are already processed
    // in convertControlNode before this method is called. We only need to extract the condition.
    // DO NOT process the header block again here - it would duplicate work and corrupt stack state.
    
    // Extract condition from condition block
    // The stack state should already be correct from pre-condition processing
    const condition = this.extractConditionFromBlock(node.condition, functionContext);
    
    // Convert body
    const thenBody = this.convertControlNodeToBlock(node.body, functionContext);
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    return NWScriptAST.createIf(condition, thenBody, undefined, headerBlock) as NWScriptIfNode;
  }

  /**
   * Convert IfElseNode to AST
   */
  private convertIfElseNode(node: IfElseNode, functionContext: NWScriptFunction | null): NWScriptIfElseNode {
    // Extract condition from condition block
    const condition = this.extractConditionFromBlock(node.condition, functionContext);
    
    // Convert bodies
    const thenBody = this.convertControlNodeToBlock(node.thenBody, functionContext);
    const elseBody = this.convertControlNodeToBlock(node.elseBody, functionContext);
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    return NWScriptAST.createIf(condition, thenBody, elseBody, headerBlock) as NWScriptIfElseNode;
  }

  /**
   * Convert WhileNode to AST
   */
  private convertWhileNode(node: WhileNode, functionContext: NWScriptFunction | null): NWScriptWhileNode {
    // Extract condition from condition block
    const condition = this.extractConditionFromBlock(node.condition, functionContext);
    
    // Convert body
    const body = this.convertControlNodeToBlock(node.body, functionContext);
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    return NWScriptAST.createWhile(condition, body, headerBlock);
  }

  /**
   * Convert DoWhileNode to AST
   */
  private convertDoWhileNode(node: DoWhileNode, functionContext: NWScriptFunction | null): NWScriptDoWhileNode {
    // Extract condition from condition block
    const condition = this.extractConditionFromBlock(node.condition, functionContext);
    
    // Convert body
    const body = this.convertControlNodeToBlock(node.body, functionContext);
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    // Note: createDoWhile signature is: (body, condition, headerBlock?)
    return NWScriptAST.createDoWhile(body, condition, headerBlock);
  }

  /**
   * Convert ForNode to AST
   */
  private convertForNode(node: ForNode, functionContext: NWScriptFunction | null): NWScriptForNode {
    // Extract condition from condition block
    const condition = this.extractConditionFromBlock(node.condition, functionContext);
    
    // Convert init, body, and increment
    const init = node.init ? this.convertControlNodeToBlock(node.init, functionContext) : undefined;
    const body = this.convertControlNodeToBlock(node.body, functionContext);
    const increment = node.increment ? this.convertControlNodeToBlock(node.increment, functionContext) : undefined;
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    // Note: createFor signature is: (body, init?, condition?, increment?, headerBlock?)
    return NWScriptAST.createFor(body, init, condition, increment, headerBlock);
  }

  /**
   * Convert SwitchNode to AST
   */
  private convertSwitchNode(node: SwitchNode, functionContext: NWScriptFunction | null): NWScriptSwitchNode {
    // Extract expression from expression block
    const expression = this.extractExpressionFromBlock(node.expression, functionContext);
    
    // Convert cases
    const cases: NWScriptSwitchCaseNode[] = [];
    for (const switchCase of node.cases) {
      const caseBody = this.convertControlNodeToBlock(switchCase.body, functionContext);
      // createSwitchCase expects an expression for the value
      const caseValueExpr = NWScriptExpression.constant(switchCase.value, NWScriptDataType.INTEGER);
      cases.push(NWScriptAST.createSwitchCase(caseValueExpr, caseBody));
    }
    
    // Convert default case
    const defaultCase = node.defaultCase 
      ? NWScriptAST.createSwitchDefault(this.convertControlNodeToBlock(node.defaultCase, functionContext))
      : undefined;
    
    // Get header block for metadata (if expression is a basic block)
    const headerBlock = node.expression.type === 'basic_block' ? node.expression.block : undefined;
    
    return NWScriptAST.createSwitch(expression, cases, defaultCase, headerBlock);
  }

  /**
   * Extract condition expression from a condition ControlNode
   */
  private extractConditionFromBlock(
    conditionNode: ControlNode,
    functionContext: NWScriptFunction | null
  ): import('./NWScriptExpression').NWScriptExpression {
    // If it's a basic block, extract condition from the block
    if (conditionNode.type === 'basic_block') {
      const block = conditionNode.block;
      
      // Setup function context
      if (!functionContext) {
        functionContext = this.blockToFunction.get(block) || null;
        if (functionContext) {
          this.setupFunctionContext(functionContext);
        }
      }
      
      // Find the condition instruction (JZ/JNZ)
      if (block.conditionInstruction) {
        // CRITICAL: Do NOT clear the stack here - pre-condition instructions have already
        // been processed and the stack state is correct. The condition expression should
        // already be on the stack from pre-condition processing.
        // 
        // However, there might be instructions between the last pre-condition instruction
        // and the condition instruction that build up the condition expression. We need
        // to process those, but we don't know which instructions were pre-condition ones.
        // 
        // For now, let's check if the condition is already on the stack. If not, we'll
        // need to process instructions from the last pre-condition instruction to the condition.
        // But since we don't track which instructions were pre-condition, we'll process
        // from the beginning of the block to the condition, which will re-process
        // pre-condition instructions. This is not ideal, but it should work.
        // 
        // Actually, a better approach: Since pre-condition instructions were already
        // processed, the stack should have the condition value on it. Let's check first.
        const conditionInstr = block.conditionInstruction;
        
        // Check if condition is already on the stack
        const stackTop = this.stackSimulator.peek();
        if (stackTop) {
          // The condition is already on the stack from pre-condition processing
          console.log(`[extractConditionFromBlock] Condition already on stack from pre-condition processing`);
          return stackTop.expression;
        }
        
        // If not on stack, we need to process instructions that build the condition.
        // Since we don't know which instructions were pre-condition, we'll process
        // from the beginning to the condition. This will re-process pre-condition
        // instructions, but that's okay - they should be idempotent (RSADD, CPDOWNSP, etc.).
        // Actually, this might cause issues. Let's process from the last instruction
        // before the condition to the condition.
        const conditionIndex = block.instructions.indexOf(conditionInstr);
        if (conditionIndex > 0) {
          // Process instructions from the last instruction before the condition
          // This assumes the condition expression is built by the last few instructions
          // before the condition instruction
          const lastInstrBeforeCondition = block.instructions[conditionIndex - 1];
          
          // Process from the last instruction before condition to the condition
          // Actually, let's just process the last instruction before the condition
          // and see if that gives us the condition on the stack
          this.stackSimulator.processInstruction(lastInstrBeforeCondition);
          
          const stackTopAfter = this.stackSimulator.peek();
          if (stackTopAfter) {
            return stackTopAfter.expression;
          }
        }
        
        // Fallback: process all instructions up to the condition
        // This will re-process pre-condition instructions, but should work
        for (const instr of block.instructions) {
          if (instr === conditionInstr) {
            break;
          }
          this.stackSimulator.processInstruction(instr);
        }
        
        // The condition should now be on the stack
        const stackTopFinal = this.stackSimulator.peek();
        if (stackTopFinal) {
          return stackTopFinal.expression;
        }
      }
    }
    
    // Fallback: return a default expression
    return NWScriptExpression.constant(1, NWScriptDataType.INTEGER);
  }

  /**
   * Extract expression from a block (for switch expressions)
   */
  private extractExpressionFromBlock(
    expressionNode: ControlNode,
    functionContext: NWScriptFunction | null
  ): import('./NWScriptExpression').NWScriptExpression {
    // Similar to extractConditionFromBlock but for switch expressions
    if (expressionNode.type === 'basic_block') {
      const block = expressionNode.block;
      
      // Setup function context
      if (!functionContext) {
        functionContext = this.blockToFunction.get(block) || null;
        if (functionContext) {
          this.setupFunctionContext(functionContext);
        }
      }
      
      // Process all instructions in the block
      this.stackSimulator.clear();
      if (functionContext) {
        this.setupFunctionContext(functionContext);
      }
      for (const instr of block.instructions) {
        this.stackSimulator.processInstruction(instr);
      }
      
      // The expression should be on the stack
      const stackTop = this.stackSimulator.peek();
      if (stackTop) {
        // stackTop.expression is already an NWScriptExpression
        return stackTop.expression;
      }
    }
    
    // Fallback: return a default expression
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Setup function context for variable resolution
   */
  private setupFunctionContext(func: NWScriptFunction): void {
    // Setup local variables for this function
    // CRITICAL: The localVariables map in StackSimulator is keyed by CPTOPSP offset (unsigned)
    // We need to map CPTOPSP offsets to variable names based on where variables live on the stack
    // 
    // CPTOPSP offsets are calculated based on the stack state:
    // - Each variable allocation: RSADD -> CPDOWNSP -8 -> MOVSP -4
    // - After n variables, SP has moved down by n*4 bytes
    // - CPTOPSP offsets for reading: -8 - (numVars - i - 1)*4
    //   For 3 vars: -12, -4, -8 (for vars 0, 1, 2)
    const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    
    const numVars = this.localInits.length;
    
    for (let i = 0; i < this.localInits.length; i++) {
      const init = this.localInits[i];
      const varName = `localVar_${i}`;
      
      // Map by the CPDOWNSP offset (for writes) - convert to unsigned
      const cpdownspOffset = init.offset;
      const cpdownspOffsetUnsigned = cpdownspOffset > 0x7FFFFFFF ? cpdownspOffset - 0x100000000 : cpdownspOffset;
      localVarMap.set(cpdownspOffset, { name: varName, dataType: init.dataType });
      
      // Calculate CPTOPSP offset based on variable index and total count
      // After variable i is allocated, SP has moved down by (i+1)*4 bytes
      // When reading variable i, CPTOPSP offset = -8 - (numVars - i - 1)*4
      let cptopspOffset: number;
      if (numVars === 3) {
        // Common pattern: -12, -4, -8
        const offsets = [0xFFFFFFF4, 0xFFFFFFFC, 0xFFFFFFF8]; // -12, -4, -8
        cptopspOffset = offsets[i];
      } else if (numVars === 2) {
        // Pattern: -8, -4
        const offsets = [0xFFFFFFF8, 0xFFFFFFFC]; // -8, -4
        cptopspOffset = offsets[i];
      } else if (numVars === 4) {
        // Pattern: -16, -12, -4, -8
        const offsets = [0xFFFFFFF0, 0xFFFFFFF4, 0xFFFFFFFC, 0xFFFFFFF8]; // -16, -12, -4, -8
        cptopspOffset = offsets[i];
      } else {
        // General case: calculate based on stack movement
        // After i variables, SP moved down by i*4
        // CPTOPSP offset = -8 - (numVars - i - 1)*4
        const offsetSigned = -8 - (numVars - i - 1) * 4;
        cptopspOffset = offsetSigned < 0 ? offsetSigned + 0x100000000 : offsetSigned;
      }
      
      // Map CPTOPSP offset (unsigned) to variable name
      localVarMap.set(cptopspOffset, { name: varName, dataType: init.dataType });
      
      // Also map common alternative offsets that might be used
      // Sometimes the compiler uses slightly different offsets
      const alternativeOffsets = [
        0xFFFFFFFC, // -4
        0xFFFFFFF8, // -8
        0xFFFFFFF4, // -12
        0xFFFFFFF0, // -16
      ];
      if (i < alternativeOffsets.length) {
        localVarMap.set(alternativeOffsets[i], { name: varName, dataType: init.dataType });
      }
    }
    
    this.expressionBuilder.setLocalVariables(localVarMap);
    this.stackSimulator.setLocalVariables(localVarMap);
    
    // Setup function parameters
    this.setFunctionParametersForBuilders(func);
  }

  /**
   * Build global variable declarations
   */
  private buildGlobalVariableDeclarations(): import('./NWScriptAST').NWScriptGlobalVariableDeclarationNode[] {
    return this.globalInits.map((init, index) => {
      const name = `globalVar_${index}`;
      const initializer = init.hasInitializer && init.initialValue !== undefined
        ? NWScriptExpression.constant(init.initialValue, init.dataType)
        : undefined;
      
      return NWScriptAST.createGlobalVariableDeclaration(name, init.dataType, initializer);
    });
  }

  /**
   * Build function nodes from functions
   * @param mainControlNode The ControlNode tree for the main function (if it exists)
   */
  private buildFunctionNodes(structureBuilder: NWScriptControlStructureBuilder, mainControlNode?: ControlNode): NWScriptFunctionNode[] {
    const functionNodes: NWScriptFunctionNode[] = [];
    
    // First, add the main function if it exists
    const mainFunction = this.functions.find(f => f.isMain);
    if (mainFunction && mainControlNode) {
      const body = this.convertControlNodeToBlock(mainControlNode, mainFunction);
      const locals = this.buildLocalVariableDeclarations(mainFunction);
      functionNodes.push(NWScriptAST.createFunction(
        mainFunction.name,
        mainFunction.returnType,
        mainFunction.parameters.map(p => ({ name: p.name, type: p.dataType })),
        body,
        locals,
        mainFunction.entryBlock
      ));
    }
    
    // Then add all other functions
    return this.functions
      .filter(func => !func.isMain) // Exclude main function (already added)
      .map(func => {
        // Build ControlNode tree for this function
        const functionControlNode = structureBuilder.buildProcedure(func.entryBlock);
        
        // Convert ControlNode tree to block
        const body = this.convertControlNodeToBlock(functionControlNode, func);
        
        // Build local variable declarations
        const locals = this.buildLocalVariableDeclarations(func);
        
        return NWScriptAST.createFunction(
          func.name,
          func.returnType,
          func.parameters.map(p => ({ name: p.name, type: p.dataType })), // dataType -> type mapping
          body, // body comes before locals
          locals,
          func.entryBlock
        );
      })
      .concat(functionNodes); // Add main function at the end
  }

  /**
   * Build local variable declarations for a function
   */
  private buildLocalVariableDeclarations(func: NWScriptFunction): import('./NWScriptAST').NWScriptVariableDeclarationNode[] {
    // TODO: Filter local variables by function (currently all locals are assigned to all functions)
    return this.localInits.map((init, index) => {
      const name = `localVar_${index}`;
      const initializer = init.hasInitializer && init.initialValue !== undefined
        ? NWScriptExpression.constant(init.initialValue, init.dataType)
        : undefined;
      
      return NWScriptAST.createVariableDeclaration(name, init.dataType, initializer);
    });
  }

  /**
   * Check if a CPDOWNSP instruction is writing a return value
   * Pattern: CPDOWNSP -> MOVSP -> (JMP ->) RETN
   */
  private isReturnValueWrite(cpdownsp: NWScriptInstruction, block: NWScriptBasicBlock, cpdownspIndex: number): boolean {
    // Check if CPDOWNSP is followed by MOVSP
    if (cpdownspIndex + 1 >= block.instructions.length) {
      return false;
    }
    
    const movsp = block.instructions[cpdownspIndex + 1];
    if (movsp.code !== OP_MOVSP) {
      return false;
    }
    
    // Check if MOVSP is followed by RETN or JMP to RETN
    if (cpdownspIndex + 2 < block.instructions.length) {
      const nextInstr = block.instructions[cpdownspIndex + 2];
      if (nextInstr.code === OP_RETN) {
        return true;
      }
      if (nextInstr.code === OP_JMP && nextInstr.offset !== undefined) {
        // Check if JMP targets a RETN block
        const jmpTarget = nextInstr.address + nextInstr.offset;
        const targetBlock = this.cfg.getBlockForAddress(jmpTarget);
        if (targetBlock) {
          // Check if target block ends with RETN
          if (targetBlock.endInstruction && targetBlock.endInstruction.code === OP_RETN) {
            return true;
          }
          // Check if target block starts with RETN
          if (targetBlock.instructions.length > 0 && targetBlock.instructions[0].code === OP_RETN) {
            return true;
          }
        }
      }
    }
    
    // Check successors for RETN
    for (const successor of block.successors) {
      if (successor.exitType === 'return' || 
          (successor.endInstruction && successor.endInstruction.code === OP_RETN)) {
        return true;
      }
    }
    
    return false;
  }
}

