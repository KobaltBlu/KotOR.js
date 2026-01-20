import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "./NWScriptExpression";
import { NWScriptExpressionBuilder } from "./NWScriptExpressionBuilder";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import { OP_EQUAL, OP_LOGORII, OP_JZ, OP_JNZ } from '../NWScriptOPCodes';
import type { NWScriptFunctionParameter } from "./NWScriptFunctionAnalyzer";

/**
 * Detects and simplifies OR chains in NWScript bytecode.
 * Pattern: EQUALII -> [optional JZ] -> EQUALII -> LOGORII -> [repeat] -> final JZ
 * 
 * This optimizes expressions like:
 *   (param == const1 || param == const2 || param == const3)
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptORChainDetector.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptORChainDetector {
  private functionParameters: NWScriptFunctionParameter[] = [];

  /**
   * Set function parameters for proper variable name mapping
   */
  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.functionParameters = parameters;
  }

  /**
   * Detect and simplify OR chain in a block's instructions
   * Returns a simplified OR expression if a chain is detected, null otherwise
   */
  detectORChain(block: NWScriptBasicBlock): NWScriptExpression | null {
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
    
    // Detect OR chain pattern
    const orChain = this.analyzeORChainPattern(relevantInstructions, conditionInstr);
    
    if (orChain && orChain.comparisons.length > 1) {
      // Build OR expression tree from all comparisons
      return this.buildORExpression(orChain.comparisons);
    }

    return null;
  }

  /**
   * Analyze instructions for OR chain pattern
   * Improved algorithm that tracks the expression stack state correctly
   */
  private analyzeORChainPattern(
    instructions: NWScriptInstruction[],
    conditionInstr: NWScriptInstruction
  ): { comparisons: NWScriptExpression[], redundantJZ: number[] } | null {
    const redundantJZ: number[] = [];
    
    // Track the expression builder state
    const exprBuilder = new NWScriptExpressionBuilder();
    exprBuilder.setFunctionParameters(this.functionParameters);
    
    // Track JZ instructions and their conditions
    const jzConditions = new Map<number, NWScriptExpression>();
    
    // Count LOGORII operations
    let logoriiCount = 0;
    
    // Process instructions up to (but not including) the condition instruction
    const conditionIndex = instructions.indexOf(conditionInstr);
    if (conditionIndex < 0) {
      return null;
    }
    
    for (let i = 0; i <= conditionIndex; i++) {
      const instr = instructions[i];
      
      // Process instruction to build expression stack
      exprBuilder.processInstruction(instr);
      
      // Count LOGORII operations
      if (instr.code === OP_LOGORII) {
        logoriiCount++;
      }
      
      // Track JZ instructions and their conditions (for redundant check detection)
      if (instr.code === OP_JZ || instr.code === OP_JNZ) {
        const condition = exprBuilder.peek();
        if (condition) {
          // Check if we've seen this condition before (redundant check)
          for (const [jzAddr, prevCondition] of jzConditions.entries()) {
            if (this.expressionsEqual(condition, prevCondition)) {
              redundantJZ.push(instr.address);
              break;
            }
          }
          jzConditions.set(instr.address, condition);
        }
      }
    }
    
    // Get the final expression from the stack (should be the OR chain result)
    const finalExpr = exprBuilder.peek();
    
    if (!finalExpr) {
      return null;
    }
    
    // Extract all comparisons from the final expression
    const comparisons = this.extractComparisonsFromExpression(finalExpr);
    
    // If we found multiple comparisons and LOGORII operations, it's an OR chain
    // We need at least 2 comparisons and at least 1 LOGORII
    if (comparisons.length >= 2 && logoriiCount >= 1) {
      return { comparisons, redundantJZ };
    }
    
    return null;
  }
  
  /**
   * Extract all comparison expressions from an expression tree
   * Handles OR chains: (a == b || c == d || e == f)
   */
  private extractComparisonsFromExpression(expr: NWScriptExpression): NWScriptExpression[] {
    const comparisons: NWScriptExpression[] = [];
    
    const collect = (e: NWScriptExpression | null): void => {
      if (!e) return;
      
      if (e.type === NWScriptExpressionType.LOGICAL && e.operator === '||') {
        // Recursively collect from left and right of OR expression
        collect(e.left);
        collect(e.right);
      } else if (e.type === NWScriptExpressionType.COMPARISON) {
        // This is a comparison - add it to the list
        comparisons.push(e);
      }
      // For other types, don't collect (they're not part of the OR chain)
    };
    
    collect(expr);
    return comparisons;
  }

  /**
   * Build an OR expression tree from multiple comparisons
   * Creates a left-associative OR tree: (a || b || c) = ((a || b) || c)
   */
  private buildORExpression(comparisons: NWScriptExpression[]): NWScriptExpression {
    if (comparisons.length === 0) {
      // Fallback - shouldn't happen
      return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    }
    
    if (comparisons.length === 1) {
      return comparisons[0];
    }
    
    // Build left-associative OR tree
    let result = comparisons[0];
    for (let i = 1; i < comparisons.length; i++) {
      result = NWScriptExpression.logical('||', result, comparisons[i]);
    }
    
    return result;
  }

  /**
   * Check if two expressions are equal (for detecting redundant checks)
   */
  private expressionsEqual(expr1: NWScriptExpression, expr2: NWScriptExpression): boolean {
    if (expr1.type !== expr2.type) {
      return false;
    }
    
    switch (expr1.type) {
      case NWScriptExpressionType.COMPARISON:
        // Compare comparison expressions
        if (expr1.operator !== expr2.operator) {
          return false;
        }
        // For now, do a simple check - could be improved
        return this.expressionsEqual(expr1.left!, expr2.left!) &&
               this.expressionsEqual(expr1.right!, expr2.right!);
      
      case NWScriptExpressionType.CONSTANT:
        return expr1.value === expr2.value && expr1.dataType === expr2.dataType;
      
      case NWScriptExpressionType.VARIABLE:
        return expr1.variableName === expr2.variableName && 
               expr1.isGlobal === expr2.isGlobal;
      
      case NWScriptExpressionType.LOGICAL:
        if (expr1.operator !== expr2.operator) {
          return false;
        }
        return this.expressionsEqual(expr1.left!, expr2.left!) &&
               this.expressionsEqual(expr1.right!, expr2.right!);
      
      default:
        // For other types, do a simple comparison
        return false;
    }
  }

  /**
   * Simplify an expression by detecting and replacing OR chains
   * This is a post-processing step that can be applied to any expression
   */
  simplifyExpression(expr: NWScriptExpression): NWScriptExpression {
    if (expr.type === NWScriptExpressionType.LOGICAL && expr.operator === '||') {
      // Check if this is part of an OR chain
      const orChain = this.extractORChain(expr);
      if (orChain.length > 2) {
        // Rebuild as a single OR chain
        return this.buildORExpression(orChain);
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

  /**
   * Extract all comparison expressions from an OR chain
   */
  private extractORChain(expr: NWScriptExpression): NWScriptExpression[] {
    const comparisons: NWScriptExpression[] = [];
    
    const collectComparisons = (e: NWScriptExpression): void => {
      if (e.type === NWScriptExpressionType.LOGICAL && e.operator === '||') {
        // Recursively collect from left and right
        if (e.left) collectComparisons(e.left);
        if (e.right) collectComparisons(e.right);
      } else if (e.type === NWScriptExpressionType.COMPARISON) {
        // This is a comparison - add it to the list
        comparisons.push(e);
      }
    };
    
    collectComparisons(expr);
    return comparisons;
  }
}

