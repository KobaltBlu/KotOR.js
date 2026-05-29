import type { ControlNode, BasicBlockNode, IfNode, IfElseNode, WhileNode, DoWhileNode, ForNode, SwitchNode, SequenceNode } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import type { NWScriptLocalInit } from "@/nwscript/decompiler/NWScriptLocalVariableAnalyzer";
import type { NWScriptControlStructureBuilder } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import { NWScriptAST, NWScriptASTNodeType, type NWScriptASTNode, type NWScriptProgramNode, type NWScriptFunctionNode, type NWScriptBlockNode, type NWScriptIfNode, type NWScriptIfElseNode, type NWScriptWhileNode, type NWScriptDoWhileNode, type NWScriptForNode, type NWScriptSwitchNode, type NWScriptSwitchCaseNode, type NWScriptSwitchDefaultNode, type NWScriptExpressionStatementNode, type NWScriptAssignmentNode, type NWScriptReturnNode, type NWScriptBreakNode, type NWScriptContinueNode, NWScriptGlobalVariableDeclarationNode, NWScriptVariableDeclarationNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptExpressionBuilder } from "@/nwscript/decompiler/NWScriptExpressionBuilder";
import { NWScriptStackSimulator } from "@/nwscript/decompiler/NWScriptStackSimulator";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { OP_RETN, OP_JMP, OP_CPDOWNSP, OP_MOVSP, OP_RSADD, OP_CPTOPSP, OP_CPTOPBP, OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_LOGANDII, OP_LOGORII, OP_JSR, OP_JZ, OP_JNZ, OP_CONST, OP_ACTION } from "@/nwscript/NWScriptOPCodes";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptANDChainDetector } from "@/nwscript/decompiler/NWScriptANDChainDetector";
import { NWScriptORChainDetector } from "@/nwscript/decompiler/NWScriptORChainDetector";
import { nwscriptDecompilerDebug } from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import {
  buildJsrCalleeArgSlotsByEntryPc,
  buildJsrUserRoutineMetaByEntryPc,
  instructionForwardStackSlotDelta,
  type JsrUserRoutineMeta,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  buildDelayCommandThunkCalleeByActionAddress,
} from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";

type DecompJumpHint =
  | { kind: "loop"; exit: NWScriptBasicBlock | null; header: NWScriptBasicBlock | null; increment: NWScriptBasicBlock | null }
  | { kind: "switch"; exit: NWScriptBasicBlock };
/**
 * Converts ControlNode tree to NWScriptASTNode tree.
 * This is the bridge between the control flow structure and the abstract syntax tree.
 *
 * Dead code: {@link NWScriptBasicBlock.isUnreachable} is set from whole-script CFG reachability and
 * does not always match per-procedure liveness, so we do not skip blocks solely on that flag here
 * (NCSDecomp-style `processCode` gating would need procedure-local reachability).
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
  private andChainDetector: NWScriptANDChainDetector;
  private orChainDetector: NWScriptORChainDetector;
  /** Innermost hints at end — used to classify lone JMP as break / continue vs switch exit / loop inc */
  private jumpHints: DecompJumpHint[] = [];
  
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
   * Map from function to the return value stack position offset
   * The return value position is where RSADD reserved space before the JSR that calls the function
   * This is stored as an offset from the function's entry stack pointer
   * Key: function (null for main function)
   * Value: offset from function entry stack pointer where return value should be written
   */
  private functionReturnValueOffsets: Map<NWScriptFunction | null, number> = new Map();

  /**
   * Map from function to the function entry stack pointer
   * Used to calculate absolute return value position from offset
   */
  private functionEntryStackPointers: Map<NWScriptFunction | null, number> = new Map();

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

  /** Callee JSR pops — shared by main and temp stack/expr simulations. */
  private jsrCalleeArgSlotsByEntryPc: Map<number, number> = new Map();

  private jsrUserRoutineMetaByEntryPc: Map<number, JsrUserRoutineMeta> = new Map();

  /** Prevents emitting the same CFG basic block twice when it appears multiple times in the ControlNode tree. */
  private emittedBasicBlocksInCurrentProcedure: Set<NWScriptBasicBlock> = new Set();

  /**
   * Upper bound (exclusive) for valid `localVar_i` indices when matching CPDOWNSP to RSADD slots.
   * {@link NWScriptLocalVariableAnalyzer} often under-counts (fixed −8 CPDOWNSP pattern); RSADD order in
   * this converter still records every slot in {@link functionVariableCounts}.
   */
  private getDeclaredLocalSlotCount(functionContext: NWScriptFunction | null): number {
    const fromRsadd =
      functionContext != null ? this.functionVariableCounts.get(functionContext) ?? 0 : 0;
    return Math.max(this.localInits.length, fromRsadd);
  }

  private rsaddInstructionTypeToDataType(typeField: number | undefined): NWScriptDataType {
    switch (typeField) {
      case 3:
        return NWScriptDataType.INTEGER;
      case 4:
        return NWScriptDataType.FLOAT;
      case 5:
        return NWScriptDataType.STRING;
      case 6:
        return NWScriptDataType.OBJECT;
      case 0x10:
        return NWScriptDataType.EFFECT;
      case 0x11:
        return NWScriptDataType.EVENT;
      case 0x12:
        return NWScriptDataType.LOCATION;
      case 0x13:
        return NWScriptDataType.TALENT;
      case 0x14:
        return NWScriptDataType.VECTOR;
      case 0x24:
        return NWScriptDataType.STRUCTURE;
      default:
        return NWScriptDataType.INTEGER;
    }
  }

  /**
   * RSADD sites in this function's body (block start address, then linear instruction order).
   * Aligns with {@link functionVariableCounts} / {@code localVar_i} indices for typical linear code.
   */
  private collectOrderedRsaddSitesInFunction(
    func: NWScriptFunction
  ): Array<{ address: number; dataType: NWScriptDataType }> {
    const out: Array<{ address: number; dataType: NWScriptDataType }> = [];
    const blocks = Array.from(func.bodyBlocks).sort(
      (a, b) => a.startInstruction.address - b.startInstruction.address
    );
    for (const block of blocks) {
      for (const instr of block.instructions) {
        if (instr.code === OP_RSADD) {
          out.push({
            address: instr.address,
            dataType: this.rsaddInstructionTypeToDataType(instr.type),
          });
        }
      }
    }
    return out;
  }

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
    this.andChainDetector = new NWScriptANDChainDetector();
    this.orChainDetector = new NWScriptORChainDetector();

    this.jsrCalleeArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, cfg.script);
    this.jsrUserRoutineMetaByEntryPc = buildJsrUserRoutineMetaByEntryPc(functions);
    this.stackSimulator.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    this.stackSimulator.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    this.expressionBuilder.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    this.expressionBuilder.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);

    const delayThunks = buildDelayCommandThunkCalleeByActionAddress(
      cfg.script,
      functions,
      (instr) =>
        instr.actionDefinition?.name === "DelayCommand" || instr.action === 7
    );
    this.stackSimulator.setDelayCommandThunkSecondArg(delayThunks);
    
    this.setupVariableMappings();
    this.buildBlockToFunctionMap();
  }

  private createTempStackSimulator(): NWScriptStackSimulator {
    const s = new NWScriptStackSimulator();
    s.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    s.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    return s;
  }

  private createTempExpressionBuilder(): NWScriptExpressionBuilder {
    const e = new NWScriptExpressionBuilder();
    e.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    e.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    return e;
  }

  /**
   * Setup variable mappings for expression builder and stack simulator
   */
  private setupVariableMappings(): void {
    // Setup global variables
    const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      const varName = `globalVar_${i}`;
      const offsetSigned = init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
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

  private pushSwitchJumpHints(node: SwitchNode): void {
    if (node.switchExitBlock) {
      this.jumpHints.push({ kind: "switch", exit: node.switchExitBlock });
    }
  }

  private pushLoopJumpHints(node: ForNode | WhileNode | DoWhileNode): void {
    const exit = node.loopExitBlock ?? null;
    let header: NWScriptBasicBlock | null = node.loopHeaderBlock ?? null;
    if (!header && node.condition.type === "basic_block") {
      header = node.condition.block;
    }
    let increment: NWScriptBasicBlock | null = null;
    if (node.type === "for") {
      increment =
        node.forIncrementBlock ??
        (node.increment?.type === "basic_block" ? node.increment.block : null);
    }
    this.jumpHints.push({ kind: "loop", exit, header, increment });
  }

  private popJumpHint(): void {
    this.jumpHints.pop();
  }

  /**
   * Classify JMP to `target` inside nested switch/for/while using active jump hints from innermost outward.
   */
  private classifyStructuredJumpTarget(target: NWScriptBasicBlock | null): "break" | "continue" | null {
    if (!target) return null;

    for (let i = this.jumpHints.length - 1; i >= 0; i--) {
      const h = this.jumpHints[i];
      if (h.kind === "switch" && target === h.exit) {
        return "break";
      }
    }

    for (let i = this.jumpHints.length - 1; i >= 0; i--) {
      const h = this.jumpHints[i];
      if (h.kind !== "loop") continue;
      if (h.exit != null && target === h.exit) return "break";
      if (h.increment != null && target === h.increment) return "continue";
      if (h.header != null && target === h.header) return "continue";
    }

    return null;
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
      this.emittedBasicBlocksInCurrentProcedure.clear();

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
      const entrySp = this.functionEntryStackPointers.get(functionContext);
      if (entrySp !== undefined) {
        this.stackSimulator.setProgramStackPointer(entrySp);
        this.expressionBuilder.setStackPointer(entrySp);
      }
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
    nwscriptDecompilerDebug(`[ControlNode] Converting ${controlNode.type} node`);
    switch (controlNode.type) {
      case 'basic_block':
        nwscriptDecompilerDebug(`[ControlNode] Processing basic_block node, block ID: ${controlNode.block.id}, instructions: ${controlNode.block.instructions.length}`);
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
            const preConditionInstructions = headerBlock.instructions.filter(
              (instr) => instr.address < conditionInstr.address
            );

            if (preConditionInstructions.length > 0) {
              nwscriptDecompilerDebug(`[ControlNode] Processing ${preConditionInstructions.length} pre-condition instructions in if header block ${headerBlock.id}`);
              
              // Process these instructions using convertBasicBlock logic
              // But we need to process them in the context of the current function
              // Create a temporary basic block node for just the pre-condition instructions
              // Actually, we should just process them directly using the same logic as convertBasicBlock

              // Initialize if needed
              if (!this.functionVariableCounts.has(functionContext)) {
                this.functionVariableCounts.set(functionContext, 0);
              }
              if (!this.functionVariableStackPositions.has(functionContext)) {
                this.functionVariableStackPositions.set(functionContext, new Map());
              }

              // Get the variable stack positions map for this function
              const variableStackPositions = this.functionVariableStackPositions.get(functionContext)!;

              const preConditionStatements: NWScriptASTNode[] = [];

              // Process each pre-condition instruction
              // Update stack simulator's variable position map for stack-aware resolution
              this.stackSimulator.setVariableStackPositions(variableStackPositions);
              this.stackSimulator.setLocalVariableInits(this.localInits);

              // Also update expression builder for consistency
              this.expressionBuilder.setVariableStackPositions(variableStackPositions);
              this.expressionBuilder.setLocalVariableInits(this.localInits);
              this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());

              for (const instr of preConditionInstructions) {
                // Track RSADD BEFORE processing
                let isRsadd = false;
                if (instr.code === OP_RSADD) {
                  isRsadd = true;
                  const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
                  const currentCount = this.functionVariableCounts.get(functionContext) || 0;
                  
                  nwscriptDecompilerDebug(`[RSADD] Address: 0x${instr.address.toString(16).padStart(8, '0')}, SP before: ${stackPosBeforeRsadd}, Variable index: ${currentCount}`);
                  
                  variableStackPositions.set(stackPosBeforeRsadd, currentCount);
                  this.functionVariableCounts.set(functionContext, currentCount + 1);

                  // Update the stack simulator's map after recording the new variable
                  this.stackSimulator.setVariableStackPositions(variableStackPositions);
                  this.expressionBuilder.setVariableStackPositions(variableStackPositions);
                  this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());

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
                  const offsetSigned = offset > 0x7fffffff ? offset - 0x100000000 : offset;
                  const targetStackPos = spBefore + offsetSigned;

                  // Now process the instruction
                  const processedExpr = this.stackSimulator.processInstruction(instr);
                  const valueExpr = processedExpr || this.stackSimulator.peek()?.expression;
                  if (valueExpr) {
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Address: 0x${instr.address.toString(16).padStart(8, '0')}, SP before: ${spBefore}, Offset: ${offsetSigned}, Target pos: ${targetStackPos}`);
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
                    
                    const varIndex = variableStackPositions.get(targetStackPos);
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
                    
                    const slotCap = this.getDeclaredLocalSlotCount(functionContext);
                    if (varIndex !== undefined && varIndex >= 0 && varIndex < slotCap) {
                      const varName = `localVar_${varIndex}`;
                      nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Creating assignment: ${varName} = <expression>`);
                      preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                      continue;
                    }

                    // Try nearby positions (stack-aware tolerance)
                    for (let delta = -4; delta <= 4; delta += 4) {
                      const nearbyPos = targetStackPos + delta;
                      const nearbyVarIndex = variableStackPositions.get(nearbyPos);
                      if (nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < slotCap) {
                        const varName = `localVar_${nearbyVarIndex}`;
                        nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${varName}`);
                        preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                        continue;
                      }
                    }

                    // Stack-aware fallback: Check all variable positions with tolerance
                    // The stack may have grown between RSADD and CPDOWNSP, so check all recorded positions
                    for (const [varPos, varIndex] of variableStackPositions.entries()) {
                      const distance = Math.abs(targetStackPos - varPos);
                      // Allow tolerance (±8 bytes) since the stack may have grown
                      if (distance <= 8 && varIndex >= 0 && varIndex < slotCap) {
                        const varName = `localVar_${varIndex}`;
                        nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Found variable by position proximity: ${varName} (distance: ${distance})`);
                        preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                        continue;
                      }
                    }
                    
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✗ No variable found for assignment at position ${targetStackPos}`);
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
              nwscriptDecompilerDebug(`[ControlNode] Added ${preConditionStatements.length} pre-condition statements before if`);
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
        nwscriptDecompilerDebug(`[ControlNode] Processing sequence node with ${controlNode.nodes.length} nodes`);
        for (let i = 0; i < controlNode.nodes.length; i++) {
          nwscriptDecompilerDebug(`[ControlNode] Sequence node ${i + 1}/${controlNode.nodes.length}: ${controlNode.nodes[i].type}`);
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
      if (this.emittedBasicBlocksInCurrentProcedure.has(block)) {
        return;
      }
      this.emittedBasicBlocksInCurrentProcedure.add(block);
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
      const entrySp = this.functionEntryStackPointers.get(functionContext);
      if (entrySp !== undefined) {
        this.stackSimulator.setProgramStackPointer(entrySp);
        this.expressionBuilder.setStackPointer(entrySp);
      }
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

    // Update the stack simulator's variable position map for stack-aware CPTOPSP resolution
    // This must be done at the start of each block to ensure accurate variable resolution
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);

    // Also update expression builder for consistency (if it's used)
    this.expressionBuilder.setVariableStackPositions(variableStackPositions);
    this.expressionBuilder.setLocalVariableInits(this.localInits);
    this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
    
    nwscriptDecompilerDebug(`[Block] Processing block ${block.id} (${block.instructions.length} instructions), Function: ${functionContext?.name || 'main'}`);
    nwscriptDecompilerDebug(`[Block] Initial stack state - SP: ${this.stackSimulator.getStackPointer()}, Stack size: ${this.stackSimulator.getStackSize()}`);
    nwscriptDecompilerDebug(`[Block] Variable count: ${this.functionVariableCounts.get(functionContext) || 0}`);
    nwscriptDecompilerDebug(`[Block] Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', ') || 'none');
    
    // Track if we're processing a return value assignment
    let returnValueExpr: NWScriptExpression | undefined = undefined;
    let retnBlock: NWScriptBasicBlock | null = null;
    
    nwscriptDecompilerDebug(`[Block] Block ${block.id} instructions:`, block.instructions.map(instr => `0x${instr.address.toString(16).padStart(8, '0')} ${instr.code === OP_RSADD ? 'RSADD' : instr.code === OP_CPDOWNSP ? 'CPDOWNSP' : 'other'}`).join(', '));
    
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
        
        nwscriptDecompilerDebug(`[RSADD] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${stackPosBeforeRsadd}, Variable index: ${currentCount}, Function: ${functionContext?.name || 'main'}`);
        
        // Record where this variable lives on the stack
        // Variable index = currentCount (0-based)
        variableStackPositions.set(stackPosBeforeRsadd, currentCount);
        this.functionVariableCounts.set(functionContext, currentCount + 1);

        // Update both simulators' variable position maps
        this.stackSimulator.setVariableStackPositions(variableStackPositions);
        this.expressionBuilder.setVariableStackPositions(variableStackPositions);
        
        nwscriptDecompilerDebug(`[RSADD] Recorded variable ${currentCount} at stack position ${stackPosBeforeRsadd}`);
        nwscriptDecompilerDebug(`[RSADD] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
      }

      // For CPDOWNSP, we need to calculate the target stack position BEFORE processing
      // because processing will modify the stack state
      let cpdownspSpBefore: number | undefined = undefined;
      let cpdownspTargetPos: number | undefined = undefined;
      if (instruction.code === OP_CPDOWNSP) {
        cpdownspSpBefore = this.stackSimulator.getStackPointer();
        const offset = instruction.offset || 0;
        const offsetSigned = offset > 0x7fffffff ? offset - 0x100000000 : offset;
        cpdownspTargetPos = cpdownspSpBefore + offsetSigned;
        nwscriptDecompilerDebug(`[CPDOWNSP-PRE] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${offsetSigned}, Target pos: ${cpdownspTargetPos}`);
      }

      // Process instruction through stack simulator
      // This ensures the stack state is correct when we check for return values
      const expr = this.stackSimulator.processInstruction(instruction);

      // Keep expression builder's stack pointer in sync after each instruction
      this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());

      // Skip creating statements for RSADD (it's just variable allocation)
      if (isRsadd) {
        continue;
      }

      if (instruction.code === OP_JMP && instruction.offset !== undefined) {
        const targetAddr = instruction.address + instruction.offset;
        const targetBlock = this.cfg.getBlockForAddress(targetAddr);
        const jumpKind = this.classifyStructuredJumpTarget(targetBlock);
        if (jumpKind === "break") {
          blockStatements.push(NWScriptAST.createBreak());
          continue;
        }
        if (jumpKind === "continue") {
          blockStatements.push(NWScriptAST.createContinue());
          continue;
        }
      }
      
      // Check if this CPDOWNSP is writing to the return value position
      // The return value position is where RSADD reserved space before the JSR that calls this function
      let isReturnWrite = false;
      if (instruction.code === OP_CPDOWNSP && cpdownspTargetPos !== undefined && cpdownspSpBefore !== undefined) {
        // Get the return value offset and entry stack pointer
        const returnValueOffset = this.functionReturnValueOffsets.get(functionContext);
        const entrySP = this.functionEntryStackPointers.get(functionContext);
        
        nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, CPDOWNSP SP before: ${cpdownspSpBefore}, Target pos: ${cpdownspTargetPos}`);
        nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Function: ${functionContext?.name || 'main'}, Return value offset: ${returnValueOffset}, Entry SP: ${entrySP}`);
        
        if (returnValueOffset !== undefined && entrySP !== undefined) {
          // The return value position is an absolute position (where RSADD reserved space)
          // We stored it as an offset from entry SP, so we need to reconstruct the absolute position
          // But actually, we should compare absolute positions directly
          // The return value absolute position = entrySP + returnValueOffset
          const returnValueAbsolutePos = entrySP + returnValueOffset;

          // The CPDOWNSP target position is also absolute (cpdownspSpBefore + offset)
          // So we should compare absolute positions directly
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Return value absolute position: ${entrySP} + ${returnValueOffset} = ${returnValueAbsolutePos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] CPDOWNSP absolute target position: ${cpdownspTargetPos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Comparing absolute positions: ${cpdownspTargetPos} === ${returnValueAbsolutePos}? ${cpdownspTargetPos === returnValueAbsolutePos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Current SP: ${cpdownspSpBefore}, CPDOWNSP offset: ${instruction.offset ? (instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset) : 'undefined'}`);
          
          // Check if this CPDOWNSP writes to the absolute return value position
          if (cpdownspTargetPos === returnValueAbsolutePos) {
            nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ MATCH! Address: 0x${instruction.address.toString(16).padStart(8, '0')}, Current SP: ${cpdownspSpBefore}, Target pos: ${cpdownspTargetPos}, Entry SP: ${entrySP}, Return offset: ${returnValueOffset}, Return value absolute pos: ${returnValueAbsolutePos}`);
            
            // Get the return value expression from the stack
            returnValueExpr = this.stackSimulator.peek()?.expression;
            nwscriptDecompilerDebug(`[RETURN-DETECT] Stack top expression: ${returnValueExpr ? returnValueExpr.toNSS() : 'undefined'}`);
            
            const allowReturnValueStatement =
              functionContext !== null &&
              functionContext.returnType !== NWScriptDataType.VOID;

            // Create the return statement immediately (not wait for RETN)
            if (returnValueExpr && allowReturnValueStatement) {
              isReturnWrite = true;
              blockStatements.push(NWScriptAST.createReturn(returnValueExpr));
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ Created return statement with expression: ${returnValueExpr.toNSS()}`);
            } else {
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✗ WARNING: No expression on stack for return value`);
            }
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] ✗ No match: CPDOWNSP absolute target ${cpdownspTargetPos} !== Return value absolute pos ${returnValueAbsolutePos} (difference: ${cpdownspTargetPos - returnValueAbsolutePos})`);
            nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] This suggests the return value position calculation may be incorrect, or this CPDOWNSP is writing to a different location`);
          }
        } else {
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] ✗ Missing data: returnValueOffset=${returnValueOffset}, entrySP=${entrySP}`);
        }
      }

      // Fallback: If CPDOWNSP target does not map to a local variable and the block (or its immediate successors) returns,
      // treat this as a return value write based on control-flow, not magic offsets.
      if (
        instruction.code === OP_CPDOWNSP &&
        !isReturnWrite &&
        cpdownspTargetPos !== undefined &&
        variableStackPositions.get(cpdownspTargetPos) === undefined
      ) {
        const hasReturnSuccessor =
          block.exitType === 'return' ||
          Array.from(block.successors).some(
            (succ) => succ.exitType === 'return' || (succ.endInstruction && succ.endInstruction.code === OP_RETN)
          );
        if (hasReturnSuccessor) {
          returnValueExpr = this.stackSimulator.peek()?.expression;
          const allowReturnValueStatement =
            functionContext !== null &&
            functionContext.returnType !== NWScriptDataType.VOID;
          nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, target pos: ${cpdownspTargetPos} not mapped to local, block leads to return -> treating as return write`);
          if (returnValueExpr && allowReturnValueStatement) {
            isReturnWrite = true;
            blockStatements.push(NWScriptAST.createReturn(returnValueExpr));
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✓ Created return statement with expression: ${returnValueExpr.toNSS()}`);
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✗ WARNING: No expression on stack for return value`);
          }
        }
      }

      // Check for special instructions
      if (instruction.code === OP_RETN) {
        // RETN just tells the program to return to the address after the last JSR
        // The actual return statement was already created when we saw the CPDOWNSP
        // But if we didn't see a CPDOWNSP (void function), we still need to create a return
        if (!isReturnWrite && !returnValueExpr) {
          // Void return (no value)
          blockStatements.push(NWScriptAST.createReturn(undefined));
        }
        // RETN doesn't pop anything - it just returns control
        continue;
      }

      // Skip creating statements for return value assignments (already handled above)
      if (isReturnWrite) {
        continue;
      }

      // Check if CPDOWNSP is writing to a local variable (assignment)
      if (instruction.code === OP_CPDOWNSP) {
        nwscriptDecompilerDebug(`[CPDOWNSP-HANDLE] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, isReturnWrite: ${isReturnWrite}, cpdownspTargetPos: ${cpdownspTargetPos}`);
      }
      if (instruction.code === OP_CPDOWNSP && !isReturnWrite && cpdownspTargetPos !== undefined) {
        // We already calculated targetStackPos before processing the instruction
        const targetStackPos = cpdownspTargetPos;
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${instruction.offset ? ((instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset)) : 0} (0x${instruction.offset?.toString(16)}), Target pos: ${targetStackPos}`);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Stack size after: ${this.stackSimulator.getStackSize()}, Has expr: ${!!expr}`);
        
        // Get the expression from the stack (CPDOWNSP copies from top of stack)
        // The instruction was already processed at line 501, so use that result
        const valueExpr = expr || this.stackSimulator.peek()?.expression;

        if (!valueExpr) {
          nwscriptDecompilerDebug(`[CPDOWNSP] No expression found - skipping assignment`);
          // No value to assign - skip
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Expression type: ${valueExpr.type}, Value: ${JSON.stringify(valueExpr).substring(0, 100)}`);
        nwscriptDecompilerDebug(`[CPDOWNSP] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
        
        // Look up which variable lives at this stack position
        const varIndex = variableStackPositions.get(targetStackPos);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
        
        const slotCap = this.getDeclaredLocalSlotCount(functionContext);
        if (varIndex !== undefined && varIndex >= 0 && varIndex < slotCap) {
          // This is an assignment to a local variable
          const varName = `localVar_${varIndex}`;
          nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Creating assignment: ${varName} = <expression>`);
          blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] No exact match at position ${targetStackPos}, trying nearby positions...`);
        
        // Fallback: If we didn't find it by exact stack position, try nearby positions
        // Sometimes stack positions might be off by a few bytes due to intermediate operations
        // Check positions within ±4 bytes
        for (let delta = -4; delta <= 4; delta += 4) {
          const nearbyPos = targetStackPos + delta;
          const nearbyVarIndex = variableStackPositions.get(nearbyPos);
          if (nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < slotCap) {
            const varName = `localVar_${nearbyVarIndex}`;
            nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${varName}`);
            blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
            continue;
          }
        }

        // Stack-aware fallback: Check all variable positions with tolerance
        // Sometimes the stack has grown between RSADD and CPDOWNSP, so the exact position doesn't match
        // Try to find the variable by checking all recorded positions
        nwscriptDecompilerDebug(`[CPDOWNSP] Trying stack-aware fallback: checking all variable positions...`);
        for (const [varPos, varIndex] of variableStackPositions.entries()) {
          // Check if the target position is close to any variable position
          // Allow some tolerance (±8 bytes) since the stack may have grown
          const distance = Math.abs(targetStackPos - varPos);
          if (distance <= 8 && varIndex >= 0 && varIndex < slotCap) {
            const varName = `localVar_${varIndex}`;
            nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Found variable by position proximity: ${varName} (distance: ${distance})`);
            blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
            continue;
          }
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] ✗ No variable found for assignment at position ${targetStackPos}`);
      }
      
      // CPTOPSP is already handled by stackSimulator.processInstruction above; do not process twice
      // (duplicate push would desync SP so repeated operands like FFFFFFF4 read different locals incorrectly).
      
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
        if (
          expr.type === 'constant' &&
          expr.dataType === NWScriptDataType.INTEGER &&
          (expr.value === 0 || expr.value === 1)
        ) {
          // These are often intermediate values (like comparison results, boolean values)
          continue;
        }

        // Skip binary operations, comparisons, and logical operations
        // These are typically intermediate (part of conditions or larger expressions)
        // BUT: If the next instruction is CPDOWNSP, this is the value being assigned, not intermediate
        if (expr.type === 'binary_op' || expr.type === 'comparison' || expr.type === 'logical') {
          // Check if this expression is being assigned to a variable (next instruction is CPDOWNSP)
          // If so, don't skip it - let the CPDOWNSP handler create the assignment
          let isBeingAssigned = false;
          if (i + 1 < block.instructions.length) {
            const nextInstr = block.instructions[i + 1];
            if (nextInstr.code === OP_CPDOWNSP) {
              isBeingAssigned = true;
            }
          }

          // Only skip if it's NOT being assigned
          if (!isBeingAssigned) {
            // Binary operations, comparisons, and logical operations are typically intermediate
            // They'll be part of conditions, assignments, or other expressions
            continue;
          }
          // If it IS being assigned, fall through to let CPDOWNSP handler process it
        }

        // For function calls, only create an expression statement if they're not part of a larger expression
        // We need to look ahead to see if this function call result is consumed by a later instruction
        // Patterns to detect:
        // - ACTION -> CONST -> EQUAL (comparison)
        // - ACTION -> (any op that consumes stack) -> CPDOWNSP (assignment)
        // - ACTION -> (any op) -> (comparison/binary op)
        if (expr.type === 'function_call') {
          // Void intrinsics/engine calls are always side effects; don't suppress them waiting for a nonexistent result.
          if (expr.dataType === NWScriptDataType.VOID) {
            blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          } else {
          // Look ahead to see if this function call is part of a larger expression
          // Check up to 5 instructions ahead for patterns that consume the function result
          let isPartOfExpression = false;
          const lookAheadLimit = Math.min(i + 6, block.instructions.length);

          for (let j = i + 1; j < lookAheadLimit; j++) {
            const futureInstr = block.instructions[j];

            // If we find a comparison, binary op, or assignment, the function call is part of an expression
            if (futureInstr.code === OP_EQUAL || futureInstr.code === OP_NEQUAL || 
                futureInstr.code === OP_GT || futureInstr.code === OP_GEQ || 
                futureInstr.code === OP_LT || futureInstr.code === OP_LEQ ||
                futureInstr.code === OP_ADD || futureInstr.code === OP_SUB ||
                futureInstr.code === OP_MUL || futureInstr.code === OP_DIV ||
                futureInstr.code === OP_LOGANDII || futureInstr.code === OP_LOGORII ||
                futureInstr.code === OP_CPDOWNSP) {
              if (
                futureInstr.code === OP_CPDOWNSP &&
                expr.dataType === NWScriptDataType.VOID
              ) {
                // Void ACTION (e.g. DelayCommand) leaves no result; CPDOWNSP ahead is unrelated cleanup.
              } else {
                isPartOfExpression = true;
                break;
              }
            }

            // If we hit a terminator (JMP, JZ, JNZ, RETN, JSR), stop looking ahead
            // The function call is not part of an expression in this block
            if (
              futureInstr.code === OP_JMP ||
              futureInstr.code === OP_RETN ||
              futureInstr.code === OP_JSR ||
              futureInstr.code === OP_JZ ||
              futureInstr.code === OP_JNZ
            ) {
              break;
            }
          }

          // Only create expression statement if it's not part of a larger expression
          if (!isPartOfExpression) {
            blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          }
          }
        }
        // For other expression types, be conservative and skip them
        // Most expressions are intermediate values
      }
    }

    // Cache the statements
    this.blockStatements.set(block, blockStatements);
    this.emittedBasicBlocksInCurrentProcedure.add(block);
    statements.push(...blockStatements);
  }

  /**
   * Convert IfNode to AST
   */
  private convertIfNode(node: IfNode, functionContext: NWScriptFunction | null): NWScriptIfNode {
    // NOTE: Pre-condition instructions (RSADD, CPDOWNSP, etc.) are already processed
    // in convertControlNode before this method is called. We only need to extract the condition.
    // DO NOT process the header block again here - it would duplicate work and corrupt stack state.
    
    nwscriptDecompilerDebug(`[convertIfNode] Extracting condition from if node, condition type: ${node.condition.type}`);
    
    // Extract condition from condition block
    // The stack state should already be correct from pre-condition processing
    let condition = this.extractConditionFromBlock(node.condition, functionContext, node);
    
    nwscriptDecompilerDebug(`[convertIfNode] Initial condition extracted, type: ${condition.type}`);
    if (condition.type === 'variable') {
      nwscriptDecompilerDebug(`[convertIfNode] Variable name: ${condition.variableName}`);
    } else if (condition.type === 'comparison') {
      nwscriptDecompilerDebug(`[convertIfNode] Comparison operator: ${condition.operator}`);
    } else if (condition.type === 'logical') {
      nwscriptDecompilerDebug(`[convertIfNode] Logical operator: ${condition.operator}`);
    }
    
    // Check if the body contains LOGANDII / LOGORII that combines with the outer condition (short-circuit chains)
    let actualBodyNode: ControlNode = node.body;
    if (node.body.type === 'basic_block') {
      const bodyBlock = node.body.block;
      const hasLogAndII = bodyBlock.instructions.some(instr => instr.code === OP_LOGANDII);
      nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has LOGANDII: ${hasLogAndII}`);
      if (hasLogAndII && node.condition.type === 'basic_block') {
        nwscriptDecompilerDebug(`[convertIfNode] Attempting cross-block AND condition extraction from block ${node.condition.block.id} through block ${bodyBlock.id}`);
        // Try to extract the full AND condition by processing blocks together
        const combinedCondition = this.extractCrossBlockANDCondition(
          node.condition.block,
          bodyBlock,
          functionContext
        );
        // Try to extract the full AND condition by processing blocks together
        const combinedCondition = this.extractCrossBlockANDCondition(node.condition.block, bodyBlock, functionContext);
        if (combinedCondition) {
          nwscriptDecompilerDebug(`[convertIfNode] Cross-block AND condition extracted, type: ${combinedCondition.type}`);
          if (combinedCondition.type === 'logical') {
            nwscriptDecompilerDebug(`[convertIfNode] Logical operator: ${combinedCondition.operator}`);
          }
          condition = combinedCondition;

          // If we successfully extracted a cross-block condition, the body block is actually part of the condition
          // Check if the body block's successor is a control structure that should be the actual body
          // This handles cases where: if (cond1 && cond2) { if-else structure }
          const successorsArray = Array.from(bodyBlock.successors);
          if (successorsArray.length > 0) {
            const nextBlock = successorsArray[0];
            nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has successor block ${nextBlock.id}, checking for nested structure...`);
            
            // Try to find a control structure starting from the next block
            // This would be the actual body (e.g., an inner if-else)
            // For now, we'll check if the next block is a conditional block (has a condition instruction)
            if (nextBlock.conditionInstruction) {
              nwscriptDecompilerDebug(`[convertIfNode] Successor block ${nextBlock.id} has condition instruction, likely a nested if structure`);
              // The actual body should be the nested structure starting from nextBlock
              // But we need to find the ControlNode for this structure
              // For now, we'll convert the body block as-is, but it should be empty
              // The nested structure will be converted separately in the sequence
            }
          }
        } else {
          nwscriptDecompilerDebug(`[convertIfNode] Cross-block AND condition extraction returned null`);
        }
      }

      const hasLogOrII = bodyBlock.instructions.some(instr => instr.code === OP_LOGORII);
      nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has LOGORII: ${hasLogOrII}`);
      if (hasLogOrII && node.condition.type === 'basic_block') {
        const orCombined = this.extractCrossBlockORCondition(
          node.condition.block,
          bodyBlock,
          functionContext
        );
        if (orCombined) {
          nwscriptDecompilerDebug(`[convertIfNode] Cross-block OR condition extracted, type: ${orCombined.type}`);
          condition = orCombined;
        }
      }
    }

    // Convert body
    const thenBody = this.convertControlNodeToBlock(actualBodyNode, functionContext);

    // If the body is empty and we extracted a cross-block condition, the body block was part of the condition
    // In this case, the actual body should be the nested structure (e.g., inner if-else) that follows
    // This will be handled at the sequence level, but we log it here for debugging
    if (thenBody.statements.length === 0 && node.body.type === 'basic_block') {
      const bodyBlock = node.body.block;
      const hasLogAndII = bodyBlock.instructions.some((instr) => instr.code === OP_LOGANDII);
      if (hasLogAndII) {
        nwscriptDecompilerDebug(`[convertIfNode] WARNING: Body block ${bodyBlock.id} contains LOGANDII and generated empty body. The actual body should be the nested structure starting from block ${Array.from(bodyBlock.successors)[0]?.id || 'unknown'}`);
      }
    }

    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;

    return NWScriptAST.createIf(condition, thenBody, undefined, headerBlock) as NWScriptIfNode;
  }

  /**
   * Convert IfElseNode to AST
   */
  private convertIfElseNode(node: IfElseNode, functionContext: NWScriptFunction | null): NWScriptIfElseNode {
    // Extract condition from condition block
    let condition = this.extractConditionFromBlock(node.condition, functionContext);

    // Check if we need to look at predecessor blocks for cross-block AND chains
    // This handles cases where the LOGANDII is in a previous block
    if (node.condition.type === 'basic_block') {
      const headerBlock = node.condition.block;
      // Find the path from a conditional predecessor through a LOGANDII block to this block
      // This handles the pattern: block1 (condition) -> block2 (LOGANDII) -> block3 (final condition)
      for (const predecessor of headerBlock.predecessors) {
        const hasLogAndII = predecessor.instructions.some((instr) => instr.code === OP_LOGANDII);
        if (hasLogAndII) {
          // Check if this predecessor has a conditional predecessor (the first condition)
          for (const predPred of predecessor.predecessors) {
            if (predPred.conditionInstruction) {
              // Found the path: predPred -> predecessor (LOGANDII) -> headerBlock
              const combinedCondition = this.extractCrossBlockANDCondition(predPred, headerBlock, functionContext);
              if (combinedCondition) {
                condition = combinedCondition;
                break;
              }
            }
          }
          if (condition !== this.extractConditionFromBlock(node.condition, functionContext)) {
            break; // Found and set combined condition
          }
        }
      }
    }

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

    let body: NWScriptBlockNode;

    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === "basic_block" ? node.condition.block : undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertControlNodeToBlock(node.body, functionContext);
    } finally {
      this.popJumpHint();
    }

    return NWScriptAST.createWhile(condition, body, headerBlock);
  }

  /**
   * Convert DoWhileNode to AST
   */
  private convertDoWhileNode(node: DoWhileNode, functionContext: NWScriptFunction | null): NWScriptDoWhileNode {
    // Extract condition from condition block
    const condition = this.extractConditionFromBlock(node.condition, functionContext);

    let body: NWScriptBlockNode;

    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === "basic_block" ? node.condition.block : undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertControlNodeToBlock(node.body, functionContext);
    } finally {
      this.popJumpHint();
    }

    // Note: createDoWhile signature is: (body, condition, headerBlock?)
    return NWScriptAST.createDoWhile(body, condition, headerBlock);
  }

  /**
   * Convert ForNode to AST
   */
  private convertForNode(node: ForNode, functionContext: NWScriptFunction | null): NWScriptForNode {
    const condition = this.extractConditionFromBlock(node.condition, functionContext);

    const init = node.init ? this.convertControlNodeToBlock(node.init, functionContext) : undefined;

    const headerBlock =
      node.condition.type === "basic_block" ? node.condition.block : undefined;

    let body: NWScriptBlockNode;
    let increment: NWScriptBlockNode | undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertControlNodeToBlock(node.body, functionContext);
      increment = node.increment
        ? this.convertControlNodeToBlock(node.increment, functionContext)
        : undefined;
    } finally {
      this.popJumpHint();
    }

    return NWScriptAST.createFor(body, init, condition, increment, headerBlock);
  }

  /**
   * Convert SwitchNode to AST
   */
  private convertSwitchNode(node: SwitchNode, functionContext: NWScriptFunction | null): NWScriptSwitchNode {
    // Prefer merged-ladder CPTOP addr (discriminant may be in a successor block vs header-only)
    const expression =
      node.discriminantInstruction != null
        ? this.extractExpressionUpToInstruction(node.discriminantInstruction, functionContext)
        : this.extractExpressionFromBlock(node.expression, functionContext);

    const headerBlock =
      node.expression.type === "basic_block" ? node.expression.block : undefined;

    this.pushSwitchJumpHints(node);
    try {
      const cases: NWScriptSwitchCaseNode[] = [];
      for (const switchCase of node.cases) {
        const caseBody = this.convertControlNodeToBlock(switchCase.body, functionContext);
        const caseValueExpr = NWScriptExpression.constant(
          switchCase.value,
          NWScriptDataType.INTEGER
        );
        cases.push(NWScriptAST.createSwitchCase(caseValueExpr, caseBody));
      }

      const defaultCase = node.defaultCase
        ? NWScriptAST.createSwitchDefault(
          this.convertControlNodeToBlock(node.defaultCase, functionContext)
        )
        : undefined;

      return NWScriptAST.createSwitch(expression, cases, defaultCase, headerBlock);
    } finally {
      this.popJumpHint();
    }
  }

  /**
   * Extract condition expression from a condition ControlNode
   */
  private extractConditionFromBlock(
    conditionNode: ControlNode,
    functionContext: NWScriptFunction | null,
    parentNode?: IfNode | IfElseNode
  ): NWScriptExpression {
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
        // Setup AND chain detector with function context
        if (functionContext) {
          this.andChainDetector.setFunctionParameters(functionContext.parameters);
          const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
          for (let i = 0; i < this.globalInits.length; i++) {
            const init = this.globalInits[i];
            const varName = `globalVar_${i}`;
            const offsetSigned = init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
            globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
          }
          this.andChainDetector.setGlobalVariables(globalVarMap);

          const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
          for (let i = 0; i < this.localInits.length; i++) {
            const init = this.localInits[i];
            const varName = `localVar_${i}`;
            localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
          }
          this.andChainDetector.setLocalVariables(localVarMap);

          this.orChainDetector.setFunctionParameters(functionContext.parameters);
          this.orChainDetector.setGlobalVariables(globalVarMap);
          this.orChainDetector.setLocalVariables(localVarMap);
        }

        const andChainExpr = this.andChainDetector.detectANDChain(block);
        if (andChainExpr) {
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Detected AND chain in block ${block.id}`);
          return andChainExpr;
        }

        const orChainExpr = this.orChainDetector.detectORChain(block);
        if (orChainExpr) {
          return orChainExpr;
        }
        
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
        
        const condIdxPeek = block.instructions.indexOf(conditionInstr);
        const insBeforeCondPeek =
          condIdxPeek >= 0 ? block.instructions.slice(0, condIdxPeek) : [];
        const hasCompareBeforePeek = insBeforeCondPeek.some((inss: NWScriptInstruction) =>
          inss.code === OP_EQUAL ||
          inss.code === OP_NEQUAL ||
          inss.code === OP_GT ||
          inss.code === OP_GEQ ||
          inss.code === OP_LT ||
          inss.code === OP_LEQ
        );
        const hasJsrBeforePeek = insBeforeCondPeek.some((inss: NWScriptInstruction) => inss.code === OP_JSR);

        // Check if condition is already on the stack from pre-condition processing
        const stackTop = this.stackSimulator.peek();
        /** Call args can remain on the expr stack model until MOVSP in callee; don't treat as branch condition. */
        const staleLiteralCondition =
          !!stackTop &&
          stackTop.expression.type === NWScriptExpressionType.CONSTANT &&
          (hasCompareBeforePeek || hasJsrBeforePeek);

        if (stackTop && !staleLiteralCondition) {
          // The condition is already on the stack from pre-condition processing
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition already on stack from pre-condition processing`);
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Stack top expression type: ${stackTop.expression.type}`);
          if (stackTop.expression.type === 'variable') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Variable name: ${stackTop.expression.variableName}`);
          } else if (stackTop.expression.type === 'comparison') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Comparison operator: ${stackTop.expression.operator}`);
          } else if (stackTop.expression.type === 'logical') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Logical operator: ${stackTop.expression.operator}`);
          }
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Stack size: ${this.stackSimulator.getStackSize()}, SP: ${this.stackSimulator.getStackPointer()}`);
          
          // Check if this is just a variable (which might be wrong)
          if (stackTop.expression.type === 'variable') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] WARNING: Condition is just a variable ${stackTop.expression.variableName}, might be incorrect`);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Block ${block.id} instructions:`, block.instructions.map((instr: NWScriptInstruction) => 
              `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
            ).join(', '));
            const blockRange = block.getAddressRange();
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Block ${block.id} startAddress: ${blockRange.start.toString(16)}, endAddress: ${blockRange.end.toString(16)}`);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition instruction at: ${conditionInstr.address.toString(16).padStart(8, '0')} ${conditionInstr.codeName}`);
            
            // Check if we need to look at instructions before the condition to reconstruct the full condition
            // The issue is that CPTOPSP at 130 overwrote the EQUAL result, so we need to reconstruct it
            const conditionIndex = block.instructions.indexOf(conditionInstr);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition instruction index: ${conditionIndex}`);
            if (conditionIndex > 0) {
              const instructionsBeforeCondition = block.instructions.slice(0, conditionIndex);
              nwscriptDecompilerDebug(`[extractConditionFromBlock] Instructions before condition:`, instructionsBeforeCondition.map((instr: NWScriptInstruction) => 
                `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
              ).join(', '));
              
              // Check if there's an EQUAL before CPTOPSP
              const equalIndex = instructionsBeforeCondition.findIndex(
                (instr: NWScriptInstruction) => instr.code === OP_EQUAL
              );
              const cptopspIndex = instructionsBeforeCondition.findIndex(
                (instr: NWScriptInstruction) =>
                  instr.code === OP_CPTOPSP &&
                  (equalIndex >= 0 ? instr.address > instructionsBeforeCondition[equalIndex].address : true)
              );
              if (equalIndex >= 0 && cptopspIndex >= 0 && cptopspIndex > equalIndex) {
                nwscriptDecompilerDebug(`[extractConditionFromBlock] Found EQUAL at index ${equalIndex} followed by CPTOPSP at index ${cptopspIndex} - this is a short-circuit pattern`);
                nwscriptDecompilerDebug(`[extractConditionFromBlock] Need to reconstruct condition from EQUAL result, not CPTOPSP result`);
                
                // Check if parent node's body block contains LOGANDII (only for IfNode, not IfElseNode)
                if (
                  parentNode &&
                  parentNode.type === 'if' &&
                  parentNode.body &&
                  parentNode.body.type === 'basic_block'
                ) {
                  const bodyBlock = parentNode.body.block;
                  const bodyRange = bodyBlock.getAddressRange();
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} startAddress: ${bodyRange.start.toString(16)}, endAddress: ${bodyRange.end.toString(16)}`);
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} instructions:`, bodyBlock.instructions.map((instr: NWScriptInstruction) => 
                    `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
                  ).join(', '));
                  let hasLogAndII = bodyBlock.instructions.some((instr: NWScriptInstruction) => instr.code === OP_LOGANDII);
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} has LOGANDII in instruction list: ${hasLogAndII}`);
                  
                  // Also check if LOGANDII is between body block end and next block start
                  // LOGANDII might be at address 162, which is between block 3 (ends 164) and block 4 (starts 164)
                  const logAndIIAddr = 0x162; // From assembly
                  if (bodyRange.end >= logAndIIAddr && bodyRange.start <= logAndIIAddr) {
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] LOGANDII at ${logAndIIAddr.toString(16)} is within body block ${bodyBlock.id} address range`);
                    // Check if it's in the instruction list
                    const logAndIIInstr = bodyBlock.instructions.find(
                      (instr: NWScriptInstruction) => instr.address === logAndIIAddr
                    );
                    if (!logAndIIInstr) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] WARNING: LOGANDII at ${logAndIIAddr.toString(16)} is in address range but not in instruction list!`);
                      // Try to find it in the CFG
                      const allInstrs = Array.from(this.cfg.script.instructions.values());
                      const logAndII = allInstrs.find((instr) => instr.address === logAndIIAddr);
                      if (logAndII) {
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Found LOGANDII instruction in CFG at ${logAndIIAddr.toString(16)}`);
                        // Force cross-block extraction
                        hasLogAndII = true;
                      }
                    }
                  }

                  if (hasLogAndII) {
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] Attempting cross-block AND condition extraction...`);
                    // Try cross-block extraction
                    const combinedCondition = this.extractCrossBlockANDCondition(block, bodyBlock, functionContext);
                    if (combinedCondition) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Successfully extracted cross-block AND condition: ${combinedCondition.toNSS()}`);
                      return combinedCondition;
                    }
                  }

                  // If cross-block extraction failed, try to reconstruct the first condition from EQUAL
                  // and combine with the second condition from the body block
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Attempting to reconstruct condition from EQUAL and body block...`);
                  
                  // Reconstruct first condition: process instructions up to and including EQUAL
                  const equalInstr = instructionsBeforeCondition[equalIndex];
                  const equalInstrIndex = block.instructions.indexOf(equalInstr);
                  if (equalInstrIndex >= 0) {
                    // Use a temporary stack simulator to track stack pointer correctly
                    // IMPORTANT: Use the variable stack positions map that was already built
                    // during pre-condition processing, not a new one!
                    const varStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map<number, number>();
                    
                    const tempStackSim = this.createTempStackSimulator();
                    if (functionContext) {
                      tempStackSim.setFunctionParameters(functionContext.parameters);
                    }
                    tempStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempStackSim.setVariableStackPositions(varStackPositions);
                    tempStackSim.setLocalVariableInits(this.localInits);
                    
                    const tempExprBuilder = this.createTempExpressionBuilder();
                    if (functionContext) {
                      tempExprBuilder.setFunctionParameters(functionContext.parameters);
                    }
                    tempExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempExprBuilder.setVariableStackPositions(varStackPositions);
                    tempExprBuilder.setLocalVariableInits(this.localInits);

                    // Process all instructions up to and including EQUAL through both simulators
                    // The variable stack positions map is already correct from pre-condition processing
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] Starting condition reconstruction with varStackPositions:`, Array.from(varStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
                    for (let i = 0; i <= equalInstrIndex; i++) {
                      const instr = block.instructions[i];

                      // Log expression stack state before processing key instructions
                      if (instr.code === OP_CPTOPSP || instr.code === OP_CONST || instr.code === OP_EQUAL) {
                        const exprStackBefore = tempExprBuilder.getStackSize();
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Before ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackBefore}`);
                        if (exprStackBefore > 0) {
                          const topExpr = tempExprBuilder.peek();
                          if (topExpr) {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock]   Top expression: ${topExpr.toNSS()}`);
                          }
                        }
                      }

                      // Log CPTOPSP instructions to debug variable resolution
                      if (instr.code === OP_CPTOPSP) {
                        const spBefore = tempStackSim.getStackPointer();
                        const offset = instr.offset || 0;
                        const offsetSigned = offset > 0x7fffffff ? offset - 0x100000000 : offset;
                        const sourceStackPos = spBefore + offsetSigned;
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: SP=${spBefore}, offset=${offsetSigned}, sourcePos=${sourceStackPos}`);
                        const varIdx = varStackPositions.get(sourceStackPos);
                        if (varIdx !== undefined) {
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP will resolve to localVar_${varIdx}`);
                        } else {
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP: No variable found at position ${sourceStackPos}`);
                        }
                      }

                      // CRITICAL: Get stack pointer BEFORE processing the instruction
                      // This is the stack pointer that CPTOPSP will use to calculate source position
                      const spBeforeInstr = tempStackSim.getStackPointer();

                      // Process through stack simulator to track stack pointer
                      tempStackSim.processInstruction(instr);

                      // Set expression builder's stack pointer to the value BEFORE the instruction
                      // This ensures CPTOPSP uses the correct stack pointer to calculate source position
                      tempExprBuilder.setStackPointer(spBeforeInstr);

                      // Process through expression builder to build expressions
                      // For CPTOPSP, it needs the stack pointer BEFORE the instruction executes
                      if (
                        instr.code === OP_CONST ||
                        instr.code === OP_ACTION ||
                        instr.code === OP_CPTOPSP ||
                        instr.code === OP_CPTOPBP ||
                        instr.code === OP_EQUAL ||
                        instr.code === OP_NEQUAL ||
                        instr.code === OP_GT ||
                        instr.code === OP_GEQ ||
                        instr.code === OP_LT ||
                        instr.code === OP_LEQ ||
                        instr.code === OP_ADD ||
                        instr.code === OP_SUB ||
                        instr.code === OP_MUL ||
                        instr.code === OP_DIV ||
                        instr.code === OP_LOGANDII ||
                        instr.code === OP_LOGORII
                      ) {
                        tempExprBuilder.processInstruction(instr);

                        // Log expression stack state after processing key instructions
                        if (instr.code === OP_CPTOPSP || instr.code === OP_CONST || instr.code === OP_EQUAL) {
                          const exprStackAfter = tempExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] After ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                          if (exprStackAfter > 0) {
                            const topExpr = tempExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock]   Top expression: ${topExpr.toNSS()}`);
                            }
                          }
                          if (instr.code === OP_EQUAL && exprStackAfter > 0) {
                            // Log both operands for EQUAL
                            const topExpr = tempExprBuilder.peek();
                            if (topExpr && topExpr.type === 'comparison' && topExpr.left && topExpr.right) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock]   EQUAL left: ${topExpr.left.toNSS()}, right: ${topExpr.right.toNSS()}`);
                            }
                          }
                        }
                      }
                    }

                    const firstCondition = tempExprBuilder.peek();
                    if (firstCondition) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Reconstructed first condition from EQUAL: ${firstCondition.toNSS()}`);
                      
                      // Extract second condition from body block
                      // Continue from where tempStackSim left off (after EQUAL and CPTOPSP)
                      // The stack state should be correct after processing all instructions up to EQUAL
                      const bodyStartSP = tempStackSim.getStackPointer();
                      
                      const bodyStackSim = this.createTempStackSimulator();
                      if (functionContext) {
                        bodyStackSim.setFunctionParameters(functionContext.parameters);
                      }
                      bodyStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map (same as tempStackSim)
                      bodyStackSim.setVariableStackPositions(varStackPositions);
                      bodyStackSim.setLocalVariableInits(this.localInits);

                      // Re-process all instructions from the start to get the correct stack state
                      // This ensures MOVSP and other stack manipulation instructions are tracked
                      for (let i = 0; i <= equalInstrIndex; i++) {
                        const instr = block.instructions[i];
                        bodyStackSim.processInstruction(instr);
                      }
                      
                      const bodyExprBuilder = this.createTempExpressionBuilder();
                      if (functionContext) {
                        bodyExprBuilder.setFunctionParameters(functionContext.parameters);
                      }
                      bodyExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map
                      bodyExprBuilder.setVariableStackPositions(varStackPositions);
                      bodyExprBuilder.setLocalVariableInits(this.localInits);

                      // Process body block instructions up to GT
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Processing body block instructions for second condition...`);
                      for (const instr of bodyBlock.instructions) {
                        // Log expression stack state before processing key instructions
                        if (instr.code === OP_CPTOPSP || instr.code === OP_GT) {
                          const exprStackBefore = bodyExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: Before ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackBefore}`);
                          if (exprStackBefore > 0) {
                            const topExpr = bodyExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                            }
                          }
                        }

                        // Log CPTOPSP instructions in body block
                        if (instr.code === OP_CPTOPSP) {
                          const spBefore = bodyStackSim.getStackPointer();
                          const offset = instr.offset || 0;
                          const offsetSigned = offset > 0x7fffffff ? offset - 0x100000000 : offset;
                          const sourceStackPos = spBefore + offsetSigned;
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: SP=${spBefore}, offset=${offsetSigned}, sourcePos=${sourceStackPos}`);
                          const varIdx = varStackPositions.get(sourceStackPos);
                          if (varIdx !== undefined) {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP will resolve to localVar_${varIdx}`);
                          } else {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP: No variable found at position ${sourceStackPos}`);
                          }
                        }

                        // CRITICAL: Get stack pointer BEFORE processing the instruction
                        const bodySpBeforeInstr = bodyStackSim.getStackPointer();

                        bodyStackSim.processInstruction(instr);

                        // Set expression builder's stack pointer to the value BEFORE the instruction
                        bodyExprBuilder.setStackPointer(bodySpBeforeInstr);

                        if (instr.code === OP_GT) {
                          bodyExprBuilder.processInstruction(instr);

                          // Log after GT
                          const exprStackAfter = bodyExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: After GT at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                          if (exprStackAfter > 0) {
                            const topExpr = bodyExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                              if (topExpr.type === 'comparison' && topExpr.left && topExpr.right) {
                                nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   GT left: ${topExpr.left.toNSS()}, right: ${topExpr.right.toNSS()}`);
                              }
                            }
                          }
                          break;
                        } else if (
                          instr.code === OP_CONST ||
                          instr.code === OP_ACTION ||
                          instr.code === OP_CPTOPSP ||
                          instr.code === OP_CPTOPBP ||
                          instr.code === OP_EQUAL ||
                          instr.code === OP_NEQUAL ||
                          instr.code === OP_GEQ ||
                          instr.code === OP_LT ||
                          instr.code === OP_LEQ ||
                          instr.code === OP_ADD ||
                          instr.code === OP_SUB ||
                          instr.code === OP_MUL ||
                          instr.code === OP_DIV ||
                          instr.code === OP_LOGANDII ||
                          instr.code === OP_LOGORII
                        ) {
                          bodyExprBuilder.processInstruction(instr);

                          // Log after CPTOPSP in body block
                          if (instr.code === OP_CPTOPSP) {
                            const exprStackAfter = bodyExprBuilder.getStackSize();
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: After CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                            if (exprStackAfter > 0) {
                              const topExpr = bodyExprBuilder.peek();
                              if (topExpr) {
                                nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                              }
                            }
                          }
                        }

                        // Update expression builder's stack pointer AFTER processing (for next instruction)
                        bodyExprBuilder.setStackPointer(bodyStackSim.getStackPointer());
                      }

                      const secondCondition = bodyExprBuilder.peek();
                      if (secondCondition) {
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Extracted second condition from body block: ${secondCondition.toNSS()}`);
                        
                        // Combine with LOGANDII
                        const combined = NWScriptExpression.logical('&&', firstCondition, secondCondition);
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Combined condition: ${combined.toNSS()}`);
                        return combined;
                      }
                    }
                  }
                }
              }
            }
          }

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
        // Create a temporary expression builder to extract the condition
        const tempExprBuilder = this.createTempExpressionBuilder();
        if (functionContext) {
          tempExprBuilder.setFunctionParameters(functionContext.parameters);
          const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
          for (let i = 0; i < this.globalInits.length; i++) {
            const init = this.globalInits[i];
            const varName = `globalVar_${i}`;
            const offsetSigned = init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
            globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
          }
          tempExprBuilder.setGlobalVariables(globalVarMap);

          const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
          for (let i = 0; i < this.localInits.length; i++) {
            const init = this.localInits[i];
            const varName = `localVar_${i}`;
            localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
          }
          tempExprBuilder.setLocalVariables(localVarMap);
        }

        // Get variable stack positions for this function
        const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
        tempExprBuilder.setVariableStackPositions(variableStackPositions);
        tempExprBuilder.setLocalVariableInits(this.localInits);

        // Process instructions up to the condition
        for (const instr of block.instructions) {
          if (instr === conditionInstr) {
            break;
          }
          tempExprBuilder.processInstruction(instr);
        }

        // The condition should now be on the stack
        const stackTopFinal = tempExprBuilder.peek();
        if (stackTopFinal) {
          return stackTopFinal;
        }
      }
    }

    // Fallback: return a default expression
    return NWScriptExpression.constant(1, NWScriptDataType.INTEGER);
  }

  /**
   * Extract cross-block AND condition when LOGANDII spans multiple blocks
   * This handles cases where the first condition is in one block and the LOGANDII is in another
   */
  private extractCrossBlockANDCondition(
    firstBlock: NWScriptBasicBlock,
    secondBlock: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression | null {
    nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Starting extraction from block ${firstBlock.id} to block ${secondBlock.id}`);
    
    // Check if second block contains LOGANDII or if we need to look at its predecessors
    let logAndIIBlock: NWScriptBasicBlock | null = null;
    let logAndIIIndex = -1;

    // First check second block
    logAndIIIndex = secondBlock.instructions.findIndex((instr) => instr.code === OP_LOGANDII);
    if (logAndIIIndex >= 0) {
      logAndIIBlock = secondBlock;
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Found LOGANDII in block ${secondBlock.id} at index ${logAndIIIndex}`);
    } else {
      // Check predecessors of second block
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] LOGANDII not in block ${secondBlock.id}, checking predecessors:`, Array.from(secondBlock.predecessors).map((b: NWScriptBasicBlock) => b.id).join(', '));
      for (const predecessor of secondBlock.predecessors) {
        const idx = predecessor.instructions.findIndex((instr) => instr.code === OP_LOGANDII);
        if (idx >= 0) {
          logAndIIBlock = predecessor;
          logAndIIIndex = idx;
          nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Found LOGANDII in predecessor block ${predecessor.id} at index ${idx}`);
          break;
        }
      }
    }

    if (!logAndIIBlock || logAndIIIndex < 0) {
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] No LOGANDII found, returning null`);
      return null;
    }

    // Setup expression builder
    const tempExprBuilder = this.createTempExpressionBuilder();
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.globalInits.length; i++) {
        const init = this.globalInits[i];
        const varName = `globalVar_${i}`;
        const offsetSigned = init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
        globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
      }
      tempExprBuilder.setGlobalVariables(globalVarMap);

      const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.localInits.length; i++) {
        const init = this.localInits[i];
        const varName = `localVar_${i}`;
        localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
      }
      tempExprBuilder.setLocalVariables(localVarMap);
    }

    // Get variable stack positions for this function
    const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableInits(this.localInits);

    // Process all instructions from first block up to its condition instruction
    if (firstBlock.conditionInstruction) {
      const conditionIndex = firstBlock.instructions.indexOf(firstBlock.conditionInstruction);
      for (let i = 0; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(firstBlock.instructions[i]);
      }
    } else {
      // Process all instructions in first block
      for (const instr of firstBlock.instructions) {
        tempExprBuilder.processInstruction(instr);
      }
    }

    // Process instructions from LOGANDII block up to and including LOGANDII
    if (logAndIIBlock !== secondBlock) {
      // LOGANDII is in a predecessor block, process it
      for (let i = 0; i <= logAndIIIndex; i++) {
        tempExprBuilder.processInstruction(logAndIIBlock.instructions[i]);
      }
    } else {
      // LOGANDII is in second block
      for (let i = 0; i <= logAndIIIndex; i++) {
        tempExprBuilder.processInstruction(logAndIIBlock.instructions[i]);
      }
    }

    // If second block has a condition instruction, process up to it
    if (secondBlock.conditionInstruction && logAndIIBlock === secondBlock) {
      const conditionIndex = secondBlock.instructions.indexOf(secondBlock.conditionInstruction);
      // Process instructions after LOGANDII up to condition
      for (let i = logAndIIIndex + 1; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(secondBlock.instructions[i]);
      }
    }

    // The combined AND condition should now be on the stack
    const combinedExpr = tempExprBuilder.peek();
    if (combinedExpr) {
      // Check if this is an AND expression with multiple comparisons
      const comparisons = this.extractComparisonsFromExpression(combinedExpr);
      if (comparisons.length >= 2) {
        // Build AND expression from comparisons
        let result = comparisons[0];
        for (let i = 1; i < comparisons.length; i++) {
          result = NWScriptExpression.logical('&&', result, comparisons[i]);
        }
        return result;
      }
      return combinedExpr;
    }

    return null;
  }

  /** Flatten top-level logical chains of a single operator into operands (leaves may be comparisons or nested trees). */
  private extractLogicalOperands(expr: NWScriptExpression, op: "&&" | "||"): NWScriptExpression[] {
    const parts: NWScriptExpression[] = [];
    const walk = (e: NWScriptExpression | null): void => {
      if (!e) return;
      if (e.type === "logical" && e.operator === op) {
        walk(e.left);
        walk(e.right);
      } else {
        parts.push(e);
      }
    };
    walk(expr);
    return parts;
  }

  /**
   * Cross-block OR when LOGORII is in the "then" block or a predecessor (short-circuit || ladder).
   */
  private extractCrossBlockORCondition(
    firstBlock: NWScriptBasicBlock,
    secondBlock: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression | null {
    let logOrBlock: NWScriptBasicBlock | null = null;
    let logOrIndex = -1;

    logOrIndex = secondBlock.instructions.findIndex((instr) => instr.code === OP_LOGORII);
    if (logOrIndex >= 0) {
      logOrBlock = secondBlock;
    } else {
      for (const predecessor of secondBlock.predecessors) {
        const idx = predecessor.instructions.findIndex((instr) => instr.code === OP_LOGORII);
        if (idx >= 0) {
          logOrBlock = predecessor;
          logOrIndex = idx;
          break;
        }
      }
    }

    if (!logOrBlock || logOrIndex < 0) {
      return null;
    }

    const tempExprBuilder = this.createTempExpressionBuilder();
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.globalInits.length; i++) {
        const init = this.globalInits[i];
        const offsetSigned =
          init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
        globalVarMap.set(offsetSigned, {
          name: `globalVar_${i}`,
          dataType: init.dataType,
        });
      }
      tempExprBuilder.setGlobalVariables(globalVarMap);

      const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.localInits.length; i++) {
        const init = this.localInits[i];
        localVarMap.set(init.offset, {
          name: `localVar_${i}`,
          dataType: init.dataType,
        });
      }
      tempExprBuilder.setLocalVariables(localVarMap);
    }

    const variableStackPositions =
      this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableInits(this.localInits);

    if (firstBlock.conditionInstruction) {
      const conditionIndex = firstBlock.instructions.indexOf(firstBlock.conditionInstruction);
      for (let i = 0; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(firstBlock.instructions[i]);
      }
    } else {
      for (const instr of firstBlock.instructions) {
        tempExprBuilder.processInstruction(instr);
      }
    }

    for (let i = 0; i <= logOrIndex; i++) {
      tempExprBuilder.processInstruction(logOrBlock.instructions[i]);
    }

    if (secondBlock.conditionInstruction && logOrBlock === secondBlock) {
      const conditionIndex = secondBlock.instructions.indexOf(secondBlock.conditionInstruction);
      for (let i = logOrIndex + 1; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(secondBlock.instructions[i]);
      }
    }

    const combinedExpr = tempExprBuilder.peek();
    if (!combinedExpr) {
      return null;
    }

    const parts = this.extractLogicalOperands(combinedExpr, "||");
    if (parts.length >= 2) {
      let result = parts[0];
      for (let i = 1; i < parts.length; i++) {
        result = NWScriptExpression.logical("||", result, parts[i]);
      }
      return result;
    }
    return combinedExpr;
  }

  /**
   * Extract all comparison expressions from an expression tree
   */
  private extractComparisonsFromExpression(expr: NWScriptExpression): NWScriptExpression[] {
    const comparisons: NWScriptExpression[] = [];

    const collect = (e: NWScriptExpression | null): void => {
      if (!e) return;

      if (e.type === 'logical' && e.operator === '&&') {
        // Recursively collect from left and right of AND expression
        collect(e.left);
        collect(e.right);
      } else if (e.type === 'comparison') {
        // This is a comparison - add it to the list
        comparisons.push(e);
      }
      // For other types, don't collect (they're not part of the AND chain)
    };

    collect(expr);
    return comparisons;
  }

  /** Resolve routine for locals (main blocks may not be in {@link blockToFunction}). */
  private effectiveRoutineContext(
    fc: NWScriptFunction | null,
    hintBlock?: NWScriptBasicBlock
  ): NWScriptFunction | null {
    if (fc != null) {
      return fc;
    }
    if (hintBlock) {
      const fromBlk = this.blockToFunction.get(hintBlock);
      if (fromBlk != null) {
        return fromBlk;
      }
    }
    return this.functions.find((f) => f.isMain) ?? null;
  }

  /**
   * When extraction runs before RSADD bookkeeping in convertBasicBlock, RSADD-derived stack slots may be
   * empty so CPTOPSP degrades to sp_* names. Walk linear bytecode from routine entry using the same
   * dword-delta helper as caller-arg inference (+ JSR arg pops).
   */
  private primeVariableStackPositionsLinearToAddress(
    fc: NWScriptFunction | null,
    endExclusiveAddr: number
  ): void {
    if (!fc?.entryBlock) {
      return;
    }
    const existing = this.functionVariableStackPositions.get(fc);
    if (existing !== undefined && existing.size > 0) {
      return;
    }

    let sp = this.functionEntryStackPointers.get(fc);
    if (sp === undefined) {
      sp = this.calculateFunctionEntryStackPointer(fc);
      if (sp !== undefined) {
        this.functionEntryStackPointers.set(fc, sp);
      }
    }
    if (sp === undefined) {
      sp = 0;
    }

    let varIdx = this.functionVariableCounts.get(fc) ?? 0;
    const map = new Map<number, number>();

    let cur: NWScriptInstruction | null | undefined = fc.entryBlock.startInstruction;
    let guard = 100000;
    while (cur && cur.address < endExclusiveAddr && guard-- > 0) {
      if (cur.code === OP_RSADD) {
        map.set(sp, varIdx);
        varIdx++;
      }

      if (cur.code === OP_JSR && cur.offset !== undefined) {
        const targetPc = cur.address + cur.offset;
        const slots = this.jsrCalleeArgSlotsByEntryPc.get(targetPc) ?? 0;
        sp -= slots * 4;
        cur = cur.nextInstr;
        continue;
      }

      const dSlots = instructionForwardStackSlotDelta(cur);
      if (dSlots === null) {
        break;
      }
      sp += dSlots * 4;
      cur = cur.nextInstr;
    }

    if (map.size === 0) {
      return;
    }
    this.functionVariableStackPositions.set(fc, map);
    this.functionVariableCounts.set(fc, varIdx);
  }

  /**
   * Run the current stack forward through {@code target}'s basic block through {@code target}, then peek.
   * Restores stack afterward (used for switch discriminant CPTOP that may not live in struct header block).
   */
  private extractExpressionUpToInstruction(
    target: NWScriptInstruction,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression {
    const block = this.cfg.getBlockForAddress(target.address);
    if (!block) {
      return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    }
    let ctx = functionContext;
    if (!ctx) {
      ctx = this.blockToFunction.get(block) || null;
      if (ctx) {
        this.setupFunctionContext(ctx);
      }
    }

    const efCtx = this.effectiveRoutineContext(ctx, block);
    this.primeVariableStackPositionsLinearToAddress(efCtx, target.address);

    const variableStackPositions =
      this.functionVariableStackPositions.get(ctx) ??
      this.functionVariableStackPositions.get(efCtx) ??
      new Map();
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);

    const snap = this.stackSimulator.takeStackSnapshot();
    try {
      for (const ins of block.instructions) {
        this.stackSimulator.processInstruction(ins);
        if (ins.address === target.address) {
          const stackTop = this.stackSimulator.peek();
          if (stackTop) {
            return stackTop.expression;
          }
          break;
        }
      }
      const stackTop = this.stackSimulator.peek();
      if (stackTop) {
        return stackTop.expression;
      }
    } finally {
      this.stackSimulator.restoreStackSnapshot(snap);
    }
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Extract expression from a block (for switch expressions)
   */
  private extractExpressionFromBlock(
    expressionNode: ControlNode,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression {
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

      const efFn = this.effectiveRoutineContext(functionContext, block);

      this.primeVariableStackPositionsLinearToAddress(efFn, block.startInstruction.address);

      // Must use the same variable stack map and caller stack state as convertBasicBlock;
      // clearing SP broke CPTOPSP resolution (e.g. switch (1) instead of localVar_0).
      const variableStackPositions =
        this.functionVariableStackPositions.get(functionContext) ??
        this.functionVariableStackPositions.get(efFn) ??
        new Map();
      this.stackSimulator.setVariableStackPositions(variableStackPositions);
      this.stackSimulator.setLocalVariableInits(this.localInits);

      const snap = this.stackSimulator.takeStackSnapshot();
      try {
        for (const instr of block.instructions) {
          this.stackSimulator.processInstruction(instr);
        }
        const stackTop = this.stackSimulator.peek();
        if (stackTop) {
          return stackTop.expression;
        }
      } finally {
        this.stackSimulator.restoreStackSnapshot(snap);
      }
    }

    // Fallback: return a default expression
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Setup function context for variable resolution
   *
   * NOTE: CPTOPSP (variable reads) are now resolved using stack-aware resolution
   * in NWScriptStackSimulator, which uses the actual stack state and variable
   * position map. This method only sets up CPDOWNSP offsets (for writes) as
   * a fallback, and provides variable info for the stack simulator.
   */
  private setupFunctionContext(func: NWScriptFunction): void {
    // Setup local variables for this function
    // We only need to map CPDOWNSP offsets (for writes) - CPTOPSP uses stack-aware resolution
    const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();

    for (let i = 0; i < this.localInits.length; i++) {
      const init = this.localInits[i];
      const varName = `localVar_${i}`;

      // Map by the CPDOWNSP offset (for writes) - this is static and known from the analyzer
      const cpdownspOffset = init.offset;
      localVarMap.set(cpdownspOffset, { name: varName, dataType: init.dataType });
    }

    // Set local variables in both builders (for backward compatibility and CPDOWNSP writes)
    // The stack simulator will use stack-aware resolution for CPTOPSP reads
    this.expressionBuilder.setLocalVariables(localVarMap);
    this.stackSimulator.setLocalVariables(localVarMap);

    // Setup function parameters
    this.setFunctionParametersForBuilders(func);

    // Calculate and track the return value stack position
    // The return value position is where RSADD reserved space before the JSR that calls this function
    if (!this.functionReturnValueOffsets.has(func)) {
      nwscriptDecompilerDebug(`[setupFunctionContext] Calculating return value position for function ${func.name}...`);
      
      // First, simulate stack to function entry to get entry stack pointer
      const entrySP = this.calculateFunctionEntryStackPointer(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Calculated entry SP = ${entrySP}`);
      if (entrySP !== undefined) {
        this.functionEntryStackPointers.set(func, entrySP);
      }

      // Then calculate return value position and convert to offset from entry
      const returnValuePos = this.calculateReturnValuePosition(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Calculated return value absolute position = ${returnValuePos}`);
      
      if (returnValuePos !== undefined && entrySP !== undefined) {
        const returnValueOffset = returnValuePos - entrySP;
        this.functionReturnValueOffsets.set(func, returnValueOffset);
        nwscriptDecompilerDebug(`[setupFunctionContext] ✓ Function ${func.name}: Entry SP = ${entrySP}, Return value absolute pos = ${returnValuePos}, Return value offset = ${returnValueOffset}`);
      } else {
        nwscriptDecompilerDebug(`[setupFunctionContext] ✗ Function ${func.name}: Missing entrySP (${entrySP}) or returnValuePos (${returnValuePos})`);
      }
    } else {
      const existingOffset = this.functionReturnValueOffsets.get(func);
      const existingEntrySP = this.functionEntryStackPointers.get(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Using cached return value offset = ${existingOffset}, entry SP = ${existingEntrySP}`);
    }
  }

  /**
   * Calculate the function entry stack pointer
   * This is the stack pointer value when the function starts executing
   * For functions called via JSR, this is the SP at the JSR instruction (before jumping)
   * For main function, this is the SP at the function's first instruction
   */
  private calculateFunctionEntryStackPointer(func: NWScriptFunction): number | undefined {
    const tempSim = this.createTempStackSimulator();
    const entryBlock = this.cfg.entryBlock;
    if (!entryBlock) {
      return undefined;
    }

    if (func.jsrInstruction) {
      // For functions called via JSR, the entry SP is the SP at the JSR instruction
      // (the function starts executing at the JSR target, with the same stack state as at JSR)
      const jsrInstr = func.jsrInstruction;
      let simCurrent = entryBlock.startInstruction;

      while (simCurrent && simCurrent.address < jsrInstr.address) {
        tempSim.processInstruction(simCurrent);
        simCurrent = simCurrent.nextInstr;
      }

      const entrySP = tempSim.getStackPointer();
      nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: JSR at ${jsrInstr.address.toString(16)}, Entry SP (at JSR) = ${entrySP}`);
      return entrySP;
    } else {
      // For main function, check if there's a JSR that calls it
      // If the function has a return type, it was likely called via JSR with RSADD before it
      // Find the JSR that targets this function's entry address
      const funcEntryAddress = func.entryBlock.startInstruction.address;
      let jsrInstr: NWScriptInstruction | null = null;

      // Search for JSR that targets this function
      for (const instruction of this.cfg.script.instructions.values()) {
        if (instruction.code === OP_JSR && instruction.offset !== undefined) {
          const jsrTarget = instruction.address + instruction.offset;
          if (jsrTarget === funcEntryAddress) {
            jsrInstr = instruction;
            break;
          }
        }
      }

      if (jsrInstr) {
        // Found JSR that calls this function - use SP at JSR
        let simCurrent = entryBlock.startInstruction;
        while (simCurrent && simCurrent.address < jsrInstr.address) {
          tempSim.processInstruction(simCurrent);
          simCurrent = simCurrent.nextInstr;
        }
        const entrySP = tempSim.getStackPointer();
        nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: Found JSR at ${jsrInstr.address.toString(16)} calling entry ${funcEntryAddress.toString(16)}, Entry SP (at JSR) = ${entrySP}`);
        return entrySP;
      } else {
        // No JSR found - simulate to function entry
        let simCurrent = entryBlock.startInstruction;
        while (simCurrent && simCurrent.address < funcEntryAddress) {
          tempSim.processInstruction(simCurrent);
          simCurrent = simCurrent.nextInstr;
        }
        const entrySP = tempSim.getStackPointer();
        nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: Entry address = ${funcEntryAddress.toString(16)}, Entry SP = ${entrySP}`);
        return entrySP;
      }
    }
  }

  /**
   * Calculate the return value stack position for a function
   * This is the stack position where RSADD reserved space before the JSR that calls the function
   */
  private calculateReturnValuePosition(func: NWScriptFunction): number | undefined {
    if (!func.jsrInstruction) {
      // Main function or function without JSR - check if there's an entry RSADD
      // For main function, the entry RSADD (if present) reserves space for return value
      if (func.isMain && func.entryBlock) {
        // Look for RSADD before the first instruction in entry block
        let current = func.entryBlock.startInstruction;
        let rsaddInstr: NWScriptInstruction | null = null;

        // Search backwards from entry to find RSADD
        while (current && current.prevInstr) {
          current = current.prevInstr;
          if (current.code === OP_RSADD) {
            rsaddInstr = current;
            break;
          }
        }

        if (rsaddInstr) {
          // Simulate stack up to RSADD to get the stack position
          const tempSim = this.createTempStackSimulator();
          let simCurrent = this.cfg.entryBlock?.startInstruction;
          const spBeforeRsadd = tempSim.getStackPointer();
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP before RSADD at ${rsaddInstr.address.toString(16)} = ${spBeforeRsadd}`);
          while (simCurrent && simCurrent.address < rsaddInstr.address) {
            tempSim.processInstruction(simCurrent);
            simCurrent = simCurrent.nextInstr;
          }
          const spAtRsadd = tempSim.getStackPointer();
          // RSADD reserves space at the current SP (before it pushes)
          const returnValuePos = spAtRsadd;
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP at RSADD = ${spAtRsadd}, return value position = ${returnValuePos}`);
          // Process RSADD to see what SP becomes after
          tempSim.processInstruction(rsaddInstr);
          const spAfterRsadd = tempSim.getStackPointer();
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP after RSADD = ${spAfterRsadd}`);
          return returnValuePos;
        }
      }
      return undefined;
    }

    // For functions called via JSR, find the RSADD before the JSR
    const jsrInstr = func.jsrInstruction;
    const jsrBlock = this.cfg.getBlockForAddress(jsrInstr.address);
    if (!jsrBlock) {
      return undefined;
    }

    // Look backwards from JSR to find RSADD
    let current: NWScriptInstruction | null = jsrInstr.prevInstr;
    let rsaddInstr: NWScriptInstruction | null = null;

    // Search within the same block first
    while (current && current.address >= jsrBlock.startInstruction.address) {
      if (current.code === OP_RSADD) {
        rsaddInstr = current;
        break;
      }
      current = current.prevInstr;
    }

    if (!rsaddInstr) {
      // RSADD might be in a previous block - check predecessors
      for (const pred of jsrBlock.predecessors) {
        if (
          pred.endInstruction &&
          pred.endInstruction.code !== OP_JMP &&
          pred.endInstruction.code !== OP_JZ &&
          pred.endInstruction.code !== OP_JNZ
        ) {
          // Check the last few instructions of predecessor
          let checkInstr = pred.endInstruction;
          let checkCount = 0;
          while (checkInstr && checkCount < 5) {
            if (checkInstr.code === OP_RSADD) {
              rsaddInstr = checkInstr;
              break;
            }
            checkInstr = checkInstr.prevInstr;
            checkCount++;
          }
          if (rsaddInstr) break;
        }
      }
    }

    if (!rsaddInstr) {
      nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: No RSADD found before JSR at ${jsrInstr.address.toString(16)}`);
      return undefined;
    }

    // Simulate stack up to RSADD to get the stack position
    // We need to simulate from the entry block to the RSADD instruction
    const tempSim = this.createTempStackSimulator();
    const entryBlock = this.cfg.entryBlock;
    if (!entryBlock) {
      return undefined;
    }

    // Simulate from entry to RSADD
    let simCurrent = entryBlock.startInstruction;
    while (simCurrent && simCurrent.address < rsaddInstr.address) {
      tempSim.processInstruction(simCurrent);
      simCurrent = simCurrent.nextInstr;
    }

    const spAtRsadd = tempSim.getStackPointer();
    // RSADD reserves space at the current SP (before it pushes)
    const returnValuePos = spAtRsadd;
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP at RSADD (before RSADD executes) = ${spAtRsadd}`);
    // Process RSADD to see what SP becomes after
    tempSim.processInstruction(rsaddInstr);
    const spAfterRsadd = tempSim.getStackPointer();
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP after RSADD = ${spAfterRsadd}`);
    // Continue to JSR to see SP at function entry
    while (simCurrent && simCurrent.address < jsrInstr.address) {
      tempSim.processInstruction(simCurrent);
      simCurrent = simCurrent.nextInstr;
    }
    // Process JSR (it doesn't change SP in this model; callee epilogue MOVSP clears args)
    const spAtJsr = tempSim.getStackPointer();
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP at JSR = ${spAtJsr}`);
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: Found RSADD at ${rsaddInstr.address.toString(16)} before JSR at ${jsrInstr.address.toString(16)}, return value position = ${returnValuePos}`);
    return returnValuePos;
  }

  /**
   * Build global variable declarations
   */
  private buildGlobalVariableDeclarations(): NWScriptGlobalVariableDeclarationNode[] {
    return this.globalInits.map((init, index) => {
      const name = `globalVar_${index}`;
      const initializer =
        init.hasInitializer && init.initialValue !== undefined
          ? NWScriptExpression.constant(init.initialValue, init.dataType)
          : undefined;

      return NWScriptAST.createGlobalVariableDeclaration(name, init.dataType, initializer);
    });
  }

  /**
   * Build function nodes from functions
   * @param mainControlNode The ControlNode tree for the main function (if it exists)
   */
  private buildFunctionNodes(
    structureBuilder: NWScriptControlStructureBuilder,
    mainControlNode?: ControlNode
  ): NWScriptFunctionNode[] {
    const functionNodes: NWScriptFunctionNode[] = [];

    // First, add the main function if it exists
    const mainFunction = this.functions.find((f) => f.isMain);
    if (mainFunction && mainControlNode) {
      const body = this.convertControlNodeToBlock(mainControlNode, mainFunction);
      const locals = this.buildLocalVariableDeclarations(mainFunction, body);
      functionNodes.push(
        NWScriptAST.createFunction(
          mainFunction.name,
          mainFunction.returnType,
          mainFunction.parameters.map((p) => ({ name: p.name, type: p.dataType })),
          body,
          locals,
          mainFunction.entryBlock
        )
      );
    }

    // Then add all other functions
    return this.functions
      .filter((func) => !func.isMain) // Exclude main function (already added)
      .map((func) => {
        // Build ControlNode tree for this function
        const functionControlNode = structureBuilder.buildProcedure(func.entryBlock);

        // Convert ControlNode tree to block
        const body = this.convertControlNodeToBlock(functionControlNode, func);

        // Build local variable declarations (merge with assignments)
        const locals = this.buildLocalVariableDeclarations(func, body);

        return NWScriptAST.createFunction(
          func.name,
          func.returnType,
          func.parameters.map((p) => ({ name: p.name, type: p.dataType })), // dataType -> type mapping
          body, // body comes before locals
          locals,
          func.entryBlock
        );
      })
      .concat(functionNodes); // Add main function at the end
  }

  /**
   * Build local variable declarations for a function
   * Merges declarations with their first assignment if they occur together
   */
  private buildLocalVariableDeclarations(
    func: NWScriptFunction,
    body?: NWScriptBlockNode
  ): NWScriptVariableDeclarationNode[] {
    const rsaddSites = this.collectOrderedRsaddSitesInFunction(func);

    const sortedInits = this.localInits
      .filter(init =>
        func.bodyBlocks.some(block => block.containsAddress(init.instructionAddress))
      )
      .sort((a, b) => a.instructionAddress - b.instructionAddress);

    const slotCount = Math.max(
      rsaddSites.length,
      sortedInits.length,
      this.functionVariableCounts.get(func) ?? 0
    );

    const declarations: NWScriptVariableDeclarationNode[] = [];
    for (let i = 0; i < slotCount; i++) {
      const site = rsaddSites[i];
      const init =
        site !== undefined
          ? sortedInits.find(ini => ini.instructionAddress === site.address)
          : sortedInits[i];

      const dataType = init?.dataType ?? site?.dataType ?? NWScriptDataType.INTEGER;
      const initializer =
        init !== undefined && init.hasInitializer && init.initialValue !== undefined
          ? NWScriptExpression.constant(init.initialValue, init.dataType)
          : undefined;

      declarations.push(NWScriptAST.createVariableDeclaration(`localVar_${i}`, dataType, initializer));
    }
    
    // If body is provided, merge declarations with their first assignment
    if (body && body.statements) {
      const assignmentsToRemove: number[] = [];

      for (let i = 0; i < declarations.length; i++) {
        const decl = declarations[i];
        const varName = decl.name;

        // Find the first assignment to this variable in the body
        for (let j = 0; j < body.statements.length; j++) {
          const stmt = body.statements[j];
          if (stmt.type === NWScriptASTNodeType.ASSIGNMENT) {
            const assignStmt = stmt as NWScriptAssignmentNode;
            if (assignStmt.variable === varName && !assignmentsToRemove.includes(j) && !decl.initializer) {
              // Only merge if declaration doesn't already have an initializer
              // Found first assignment - merge into declaration
              let merged: NWScriptExpression = assignStmt.value;
              if (merged.type === NWScriptExpressionType.CONSTANT) {
                if (decl.dataType === NWScriptDataType.STRING && merged.dataType === NWScriptDataType.INTEGER && merged.value === 0) {
                  merged = NWScriptExpression.constant("", NWScriptDataType.STRING);
                } else if (decl.dataType === NWScriptDataType.OBJECT && merged.dataType === NWScriptDataType.INTEGER && merged.value === 0) {
                  merged = NWScriptExpression.constant(0, NWScriptDataType.OBJECT);
                } else if (decl.dataType === NWScriptDataType.FLOAT && merged.dataType === NWScriptDataType.INTEGER) {
                  merged = NWScriptExpression.constant(merged.value, NWScriptDataType.FLOAT);
                }
              }
              decl.initializer = merged;
              assignmentsToRemove.push(j);
              break; // Only merge the first assignment
            }
          }
        }
      }

      // Remove merged assignments from body (in reverse order to maintain indices)
      assignmentsToRemove.sort((a, b) => b - a);
      for (const index of assignmentsToRemove) {
        body.statements.splice(index, 1);
      }
    }

    return declarations;
  }

  /**
   * Check if a CPDOWNSP instruction is writing a return value
   * Pattern: CPDOWNSP -> MOVSP -> (intermediate instructions) -> (JMP ->) RETN
   *
   * We need to look ahead past intermediate instructions (CPTOPSP, other CPDOWNSP, etc.)
   * to find RETN or JMP to RETN. If we see too many intermediate instructions or
   * instructions that indicate this is NOT a return value (like another CPDOWNSP to a variable),
   * we return false.
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

    // Look ahead past intermediate instructions to find RETN or JMP to RETN
    // Intermediate instructions that we can skip: CPTOPSP, other CPDOWNSP (to different locations), MOVSP
    // Limit: look ahead up to 5 instructions to avoid false positives
    const lookAheadLimit = Math.min(cpdownspIndex + 7, block.instructions.length);
    for (let i = cpdownspIndex + 2; i < lookAheadLimit; i++) {
      const instr = block.instructions[i];

      // If we find RETN directly, this is a return value write
      if (instr.code === OP_RETN) {
        return true;
      }

      // If we find JMP, check if it targets RETN
      if (instr.code === OP_JMP && instr.offset !== undefined) {
        const jmpTarget = instr.address + instr.offset;
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
        // JMP found but doesn't target RETN - not a return value write
        return false;
      }

      // If we find another CPDOWNSP before RETN/JMP, this is NOT a return value write
      // (it means there's another assignment happening)
      if (instr.code === OP_CPDOWNSP) {
        return false;
      }

      // If we find a terminator that's not RETN or JMP, this is not a return value write
      if (instr.code === OP_JSR || instr.code === OP_JZ || instr.code === OP_JNZ) {
        return false;
      }

      // Continue looking for RETN/JMP (skip intermediate instructions like CPTOPSP, MOVSP)
    }

    // If we didn't find RETN or JMP to RETN within the look-ahead limit,
    // this is NOT a return value write
    return false;
  }
}
