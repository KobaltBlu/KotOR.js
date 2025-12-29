import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "./NWScriptExpression";
import { NWScriptExpressionBuilder } from "./NWScriptExpressionBuilder";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import { OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ, OP_LOGANDII, OP_JZ, OP_JNZ, OP_CPTOPSP, OP_CPTOPBP } from '../NWScriptOPCodes';
import type { NWScriptFunctionParameter } from "./NWScriptFunctionAnalyzer";

/**
 * Detects and simplifies AND chains in NWScript bytecode.
 * Pattern: [comparison] -> CPTOPSP -> JZ (short-circuit) -> [comparison] -> LOGANDII -> [repeat] -> final JZ
 * 
 * This optimizes expressions like:
 *   (cond1 && cond2 && cond3)
 * 
 * Handles short-circuit AND evaluation where:
 * - First condition evaluated
 * - Second variable loaded and checked via JZ (if false, jump out)
 * - Additional conditions evaluated and combined with LOGANDII
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptANDChainDetector.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptANDChainDetector {
  private functionParameters: NWScriptFunctionParameter[] = [];
  private globalVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  private localVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();

  /**
   * Set function parameters for proper variable name mapping
   */
  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.functionParameters = parameters;
  }
  
  /**
   * Set global variables for variable name mapping
   */
  setGlobalVariables(globals: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.globalVariables = globals;
  }
  
  /**
   * Set local variables for variable name mapping
   */
  setLocalVariables(locals: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.localVariables = locals;
  }

  /**
   * Detect and simplify AND chain in a block's instructions
   * Returns a simplified AND expression if a chain is detected, null otherwise
   */
  detectANDChain(block: NWScriptBasicBlock): NWScriptExpression | null {
    if (!block.conditionInstruction) {
      return null;
    }

    const instructions = block.instructions;
    const conditionInstr = block.conditionInstruction;
    
    // Find the index of the condition instruction
    const conditionIndex = instructions.indexOf(conditionInstr);
    if (conditionIndex < 0) {
      return null;
    }

    // Analyze instructions up to the condition instruction
    const relevantInstructions = instructions.slice(0, conditionIndex + 1);
    
    // Detect AND chain pattern
    const andChain = this.analyzeANDChainPattern(relevantInstructions, conditionInstr);
    
    if (andChain && andChain.comparisons.length > 1) {
      // Build AND expression tree from all comparisons
      return this.buildANDExpression(andChain.comparisons);
    }

    return null;
  }

  /**
   * Analyze instructions for AND chain pattern
   * Pattern: [comparison] -> [CPTOPSP/CPTOPBP] -> [JZ] (short-circuit) -> [comparison] -> [LOGANDII] -> [repeat] -> [JZ] (final)
   */
  private analyzeANDChainPattern(
    instructions: NWScriptInstruction[],
    conditionInstr: NWScriptInstruction
  ): { comparisons: NWScriptExpression[], shortCircuitJZ: number[] } | null {
    const shortCircuitJZ: number[] = [];
    
    // Track the expression builder state
    const exprBuilder = new NWScriptExpressionBuilder();
    exprBuilder.setFunctionParameters(this.functionParameters);
    if (this.globalVariables.size > 0) {
      exprBuilder.setGlobalVariables(this.globalVariables);
    }
    if (this.localVariables.size > 0) {
      exprBuilder.setLocalVariables(this.localVariables);
    }
    
    // Count LOGANDII operations
    let logandiiCount = 0;
    
    // Track JZ instructions that are part of short-circuit evaluation
    const jzInstructions: NWScriptInstruction[] = [];
    
    // Process instructions up to (but not including) the condition instruction
    const conditionIndex = instructions.indexOf(conditionInstr);
    if (conditionIndex < 0) {
      return null;
    }
    
    // First pass: identify short-circuit JZ patterns
    for (let i = 0; i <= conditionIndex; i++) {
      const instr = instructions[i];
      
      // Track LOGANDII operations
      if (instr.code === OP_LOGANDII) {
        logandiiCount++;
      }
      
      // Track JZ instructions (potential short-circuit checks)
      if (instr.code === OP_JZ || instr.code === OP_JNZ) {
        // Check if this is a short-circuit JZ (not the final condition)
        if (instr !== conditionInstr) {
          // Check if previous instruction was CPTOPSP/CPTOPBP (variable load)
          if (i > 0) {
            const prevInstr = instructions[i - 1];
            if (prevInstr.code === OP_CPTOPSP || prevInstr.code === OP_CPTOPBP) {
              jzInstructions.push(instr);
              shortCircuitJZ.push(instr.address);
            }
          }
        }
      }
    }
    
    // Process all instructions to get final expression
    for (let i = 0; i <= conditionIndex; i++) {
      exprBuilder.processInstruction(instructions[i]);
    }
    
    // Get the final expression from the stack
    const finalExpr = exprBuilder.peek();
    
    if (!finalExpr) {
      return null;
    }
    
    // Extract all comparisons from the final expression
    const extractedComparisons = this.extractComparisonsFromExpression(finalExpr);
    
    // If we found multiple comparisons and LOGANDII operations, it's an AND chain
    // We need at least 2 comparisons and at least 1 LOGANDII
    // OR we found short-circuit JZ patterns (which indicate AND chain even with fewer LOGANDII)
    if (extractedComparisons.length >= 2 && (logandiiCount >= 1 || shortCircuitJZ.length > 0)) {
      return { comparisons: extractedComparisons, shortCircuitJZ };
    }
    
    return null;
  }
  
  /**
   * Check if an opcode is a comparison operation
   */
  private isComparisonOp(opcode: number): boolean {
    return opcode === OP_EQUAL || opcode === OP_NEQUAL ||
           opcode === OP_GT || opcode === OP_GEQ ||
           opcode === OP_LT || opcode === OP_LEQ;
  }
  
  /**
   * Extract all comparison expressions from an expression tree
   * Handles AND chains: (a == b && c == d && e == f)
   */
  private extractComparisonsFromExpression(expr: NWScriptExpression): NWScriptExpression[] {
    const comparisons: NWScriptExpression[] = [];
    
    const collect = (e: NWScriptExpression | null): void => {
      if (!e) return;
      
      if (e.type === NWScriptExpressionType.LOGICAL && e.operator === '&&') {
        // Recursively collect from left and right of AND expression
        collect(e.left);
        collect(e.right);
      } else if (e.type === NWScriptExpressionType.COMPARISON) {
        // This is a comparison - add it to the list
        comparisons.push(e);
      }
      // For other types, don't collect (they're not part of the AND chain)
    };
    
    collect(expr);
    return comparisons;
  }

  /**
   * Build an AND expression tree from multiple comparisons
   * Creates a left-associative AND tree: (a && b && c) = ((a && b) && c)
   */
  private buildANDExpression(comparisons: NWScriptExpression[]): NWScriptExpression {
    if (comparisons.length === 0) {
      // Fallback - shouldn't happen
      return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    }
    
    if (comparisons.length === 1) {
      return comparisons[0];
    }
    
    // Build left-associative AND tree
    let result = comparisons[0];
    for (let i = 1; i < comparisons.length; i++) {
      result = NWScriptExpression.logical('&&', result, comparisons[i]);
    }
    
    return result;
  }

  /**
   * Simplify an expression by detecting and replacing AND chains
   * This is a post-processing step that can be applied to any expression
   */
  simplifyExpression(expr: NWScriptExpression): NWScriptExpression {
    if (expr.type === NWScriptExpressionType.LOGICAL && expr.operator === '&&') {
      // Check if this is part of an AND chain
      const andChain = this.extractComparisonsFromExpression(expr);
      if (andChain.length > 2) {
        // Rebuild as a single AND chain
        return this.buildANDExpression(andChain);
      }
    }
    
    // Recursively simplify left and right
    if (expr.left) {
      expr.left = this.simplifyExpression(expr.left);
    }
    if (expr.right) {
      expr.right = this.simplifyExpression(expr.right);
    }
    
    return expr;
  }
}

