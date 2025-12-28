import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "./NWScriptExpression";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import type { NWScriptFunctionParameter } from "./NWScriptFunctionAnalyzer";
import {
  OP_CONST, OP_ACTION, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII,
  OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ,
  OP_LOGANDII, OP_LOGORII, OP_BOOLANDII, OP_INCORII, OP_EXCORII,
  OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_NEG, OP_COMPI, OP_NOTI,
  OP_CPTOPBP, OP_CPTOPSP
} from '../NWScriptOPCodes';

/**
 * Builds expressions from stack-based instructions.
 * Tracks the stack state and reconstructs expression trees.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptExpressionBuilder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptExpressionBuilder {
  /**
   * Stack of expressions (simulating the NWScript stack)
   */
  private expressionStack: NWScriptExpression[] = [];

  /**
   * Variable name generator
   */
  private variableCounter: number = 0;

  /**
   * Function parameters (for mapping CPTOPBP offsets to parameter names)
   */
  private functionParameters: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Global variables (for mapping CPTOPBP positive offsets to global variable names)
   */
  private globalVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Local variables (for mapping CPTOPSP offsets to local variable names)
   * This is a static mapping - kept for backward compatibility
   * For stack-aware resolution, use variableStackPositions instead
   */
  private localVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Stack position to variable index mapping (for dynamic stack-aware variable resolution)
   * Key: stack position (absolute), Value: variable index
   * Set by the converter for accurate CPTOPSP resolution
   */
  private variableStackPositions: Map<number, number> = new Map();
  
  /**
   * Local variable initializations (for looking up variable info by index)
   * Set by the converter to provide variable names and types
   */
  private localVariableInits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }> = [];
  
  /**
   * Current stack pointer (for calculating source positions in CPTOPSP)
   */
  private stackPointer: number = 0;

  /**
   * Process an instruction and update the expression stack
   */
  processInstruction(instruction: NWScriptInstruction): NWScriptExpression | null {
    switch (instruction.code) {
      case OP_CONST:
        return this.handleConst(instruction);
      
      case OP_ADD:
      case OP_SUB:
      case OP_MUL:
      case OP_DIV:
      case OP_MODII:
        return this.handleBinaryOp(instruction);
      
      case OP_EQUAL:
      case OP_NEQUAL:
      case OP_GT:
      case OP_GEQ:
      case OP_LT:
      case OP_LEQ:
        return this.handleComparison(instruction);
      
      case OP_LOGANDII:
      case OP_LOGORII:
      case OP_BOOLANDII:
        return this.handleLogical(instruction);
      
      case OP_INCORII:
      case OP_EXCORII:
        return this.handleBitwise(instruction);
      
      case OP_SHLEFTII:
      case OP_SHRIGHTII:
      case OP_USHRIGHTII:
        return this.handleShiftOp(instruction);
      
      case OP_NEG:
      case OP_COMPI:
      case OP_NOTI:
        return this.handleUnaryOp(instruction);
      
      case OP_ACTION:
        return this.handleAction(instruction);
      
      case OP_CPTOPBP:
      case OP_CPTOPSP:
        return this.handleVariableRead(instruction);
      
      default:
        // Other instructions don't produce expressions directly
        return null;
    }
  }

  /**
   * Handle CONST instruction (push constant onto stack)
   */
  private handleConst(instruction: NWScriptInstruction): NWScriptExpression {
    let value: any;
    let dataType: NWScriptDataType;

    switch (instruction.type) {
      case 3: // INTEGER
        value = instruction.integer;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        value = instruction.float;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        value = instruction.string;
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        value = instruction.object;
        dataType = NWScriptDataType.OBJECT;
        break;
      default:
        value = 0;
        dataType = NWScriptDataType.INTEGER;
    }

    const expr = NWScriptExpression.constant(value, dataType);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle binary arithmetic operations
   */
  private handleBinaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.expressionStack.length < 2) {
      // Not enough operands - create placeholder
      const right = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getBinaryOperator(instruction.code);
      const dataType = this.getResultType(instruction.type);
      const expr = NWScriptExpression.binaryOp(operator, left, right, dataType);
      this.expressionStack.push(expr);
      return expr;
    }

    const right = this.expressionStack.pop()!;
    const left = this.expressionStack.pop()!;
    const operator = this.getBinaryOperator(instruction.code);
    const dataType = this.getResultType(instruction.type);
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, dataType);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle comparison operations
   */
  private handleComparison(instruction: NWScriptInstruction): NWScriptExpression {
    // Safeguard: if stack is empty, create placeholder expressions
    if (this.expressionStack.length === 0) {
      const left = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const right = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const operator = this.getComparisonOperator(instruction.code);
      const expr = NWScriptExpression.comparison(operator, left, right);
      this.expressionStack.push(expr);
      return expr;
    }

    // If only one element, create a comparison with a default right side
    if (this.expressionStack.length === 1) {
      const left = this.expressionStack.pop()!;
      const right = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const operator = this.getComparisonOperator(instruction.code);
      const expr = NWScriptExpression.comparison(operator, left, right);
      this.expressionStack.push(expr);
      return expr;
    }

    // Normal case: pop two elements
    const right = this.expressionStack.pop()!;
    const left = this.expressionStack.pop()!;
    const operator = this.getComparisonOperator(instruction.code);
    
    const expr = NWScriptExpression.comparison(operator, left, right);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle logical operations
   */
  private handleLogical(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.expressionStack.length < 2) {
      const right = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getLogicalOperator(instruction.code);
      const expr = NWScriptExpression.logical(operator, left, right);
      this.expressionStack.push(expr);
      return expr;
    }

    const right = this.expressionStack.pop()!;
    const left = this.expressionStack.pop()!;
    const operator = this.getLogicalOperator(instruction.code);
    
    const expr = NWScriptExpression.logical(operator, left, right);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle bitwise operations
   */
  private handleBitwise(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.expressionStack.length < 2) {
      const right = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = instruction.code === OP_INCORII ? '|' : '^';
      const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
      this.expressionStack.push(expr);
      return expr;
    }

    const right = this.expressionStack.pop()!;
    const left = this.expressionStack.pop()!;
    const operator = instruction.code === OP_INCORII ? '|' : '^';
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle shift operations
   */
  private handleShiftOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.expressionStack.length < 2) {
      const right = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.expressionStack.pop() || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      let operator: string;
      switch (instruction.code) {
        case OP_SHLEFTII: operator = '<<'; break;
        case OP_SHRIGHTII: operator = '>>'; break;
        case OP_USHRIGHTII: operator = '>>>'; break;
        default: operator = '?';
      }
      
      const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
      this.expressionStack.push(expr);
      return expr;
    }

    const right = this.expressionStack.pop()!;
    const left = this.expressionStack.pop()!;
    
    let operator: string;
    switch (instruction.code) {
      case OP_SHLEFTII: operator = '<<'; break;
      case OP_SHRIGHTII: operator = '>>'; break;
      case OP_USHRIGHTII: operator = '>>>'; break;
      default: operator = '?';
    }
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle unary operations
   */
  private handleUnaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.expressionStack.length < 1) {
      const operand = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const operator = this.getUnaryOperator(instruction.code);
      const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
      const expr = NWScriptExpression.unaryOp(operator, operand, dataType);
      this.expressionStack.push(expr);
      return expr;
    }

    const operand = this.expressionStack.pop()!;
    const operator = this.getUnaryOperator(instruction.code);
    const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
    
    const expr = NWScriptExpression.unaryOp(operator, operand, dataType);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Handle ACTION (function call)
   */
  private handleAction(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (!instruction.actionDefinition) {
      return null;
    }

    const actionDef = instruction.actionDefinition;
    const argCount = instruction.argCount || 0;
    const args: NWScriptExpression[] = [];

    // Pop arguments from stack
    // In NWScript, arguments appear to be pushed in forward order (first arg first)
    // So when we pop them, we get them in reverse order (last arg first)
    // We use push to collect them, then reverse to get correct order
    for (let i = 0; i < argCount && this.expressionStack.length > 0; i++) {
      args.unshift(this.expressionStack.pop()!);
      // args.push(this.expressionStack.pop()!); // Push to array (will be in reverse order)
    }
    
    // Reverse to get correct argument order (first arg first)
    args.reverse();

    const functionName = actionDef.name || `Action_${instruction.action}`;
    const returnType = actionDef.type || NWScriptDataType.VOID;
    
    const expr = NWScriptExpression.functionCall(functionName, args, returnType);
    
    // Push return value if not void
    if (returnType !== NWScriptDataType.VOID) {
      this.expressionStack.push(expr);
    }
    
    return expr;
  }

  /**
   * Handle variable read (CPTOPBP/CPTOPSP)
   */
  private handleVariableRead(instruction: NWScriptInstruction): NWScriptExpression {
    const isGlobal = instruction.code === OP_CPTOPBP;
    let varName: string;
    let dataType: NWScriptDataType;
    
    if (isGlobal && instruction.offset !== undefined) {
      // Check if this is a function parameter (negative offset)
      const offset = instruction.offset;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
      
      if (offsetSigned < 0 && this.functionParameters.has(offsetSigned)) {
        // This is a function parameter (negative offset relative to BP)
        const param = this.functionParameters.get(offsetSigned)!;
        varName = param.name;
        dataType = param.dataType;
      } else if (offsetSigned < 0 && this.globalVariables.has(offsetSigned)) {
        // This is a global variable (negative offset relative to BP)
        // ALL stack offsets are negative - we're always looking down from the top
        const globalVar = this.globalVariables.get(offsetSigned)!;
        varName = globalVar.name;
        dataType = globalVar.dataType;
      } else {
        // Unknown - generate a generic name
        varName = this.generateVariableName(true, offset);
        dataType = NWScriptDataType.INTEGER; // Default, could be improved
      }
    } else {
      // Local variable (CPTOPSP)
      // CRITICAL: CPTOPSP reads from stack[SP + offset] where SP is the CURRENT stack pointer
      // We should resolve this dynamically using the actual stack state, not static offsets
      const offset = instruction.offset || 0;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
      
      // Calculate the actual stack position this instruction reads from
      const sourceStackPos = this.stackPointer + offsetSigned;
      
      // First, try to resolve using the dynamic stack position map (stack-aware)
      const varIndex = this.variableStackPositions.get(sourceStackPos);
      if (varIndex !== undefined && this.localVariableInits[varIndex]) {
        // Found variable using stack-aware resolution
        const init = this.localVariableInits[varIndex];
        varName = `localVar_${varIndex}`;
        dataType = init.dataType;
      } else {
        // Fallback to static offset-based mapping (for backward compatibility)
        const offsetUnsigned = offset < 0 ? offset + 0x100000000 : offset;
        if (this.localVariables.has(offsetUnsigned)) {
          // Use mapped local variable name from static mapping
          const localVar = this.localVariables.get(offsetUnsigned)!;
          varName = localVar.name;
          dataType = localVar.dataType;
        } else {
          // Last resort: generate a generic name
          varName = this.generateVariableName(false, offset);
          dataType = NWScriptDataType.INTEGER; // Default, could be improved
        }
      }
    }
    
    const expr = NWScriptExpression.variable(varName, dataType, isGlobal);
    this.expressionStack.push(expr);
    return expr;
  }

  /**
   * Get binary operator string
   */
  private getBinaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_ADD: return '+';
      case OP_SUB: return '-';
      case OP_MUL: return '*';
      case OP_DIV: return '/';
      case OP_MODII: return '%';
      default: return '?';
    }
  }

  /**
   * Get comparison operator string
   */
  private getComparisonOperator(opCode: number): string {
    switch (opCode) {
      case OP_EQUAL: return '==';
      case OP_NEQUAL: return '!=';
      case OP_GT: return '>';
      case OP_GEQ: return '>=';
      case OP_LT: return '<';
      case OP_LEQ: return '<=';
      default: return '?';
    }
  }

  /**
   * Get logical operator string
   */
  private getLogicalOperator(opCode: number): string {
    switch (opCode) {
      case OP_LOGANDII: return '&&';
      case OP_LOGORII: return '||';
      case OP_BOOLANDII: return '&';
      default: return '?';
    }
  }

  /**
   * Get unary operator string
   */
  private getUnaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_NEG: return '-';
      case OP_COMPI: return '~';
      case OP_NOTI: return '!';
      default: return '?';
    }
  }

  /**
   * Get result data type from instruction type
   */
  private getResultType(type: number): NWScriptDataType {
    // This is a simplified version - actual type inference is more complex
    if (type >= 0x20 && type <= 0x26) {
      // Binary type operations
      if (type === 0x20 || type === 0x25 || type === 0x26) return NWScriptDataType.INTEGER;
      if (type === 0x21) return NWScriptDataType.FLOAT;
      if (type === 0x23) return NWScriptDataType.STRING;
    }
    return NWScriptDataType.INTEGER;
  }

  /**
   * Generate a variable name
   */
  private generateVariableName(isGlobal: boolean, offset: number): string {
    if (isGlobal) {
      return `g_var_${offset}`;
    } else {
      return `var_${this.variableCounter++}`;
    }
  }

  /**
   * Push an expression onto the stack
   */
  push(expr: NWScriptExpression): void {
    this.expressionStack.push(expr);
  }

  /**
   * Pop an expression from the stack
   */
  pop(): NWScriptExpression | null {
    return this.expressionStack.pop() || null;
  }

  /**
   * Peek at the top of the stack
   */
  peek(): NWScriptExpression | null {
    return this.expressionStack.length > 0 ? this.expressionStack[this.expressionStack.length - 1] : null;
  }

  /**
   * Clear the expression stack
   */
  clear(): void {
    this.expressionStack = [];
    this.variableCounter = 0;
    this.functionParameters.clear();
  }

  /**
   * Set function parameters for parameter name mapping
   */
  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.functionParameters.clear();
    for (const param of parameters) {
      this.functionParameters.set(param.offset, { name: param.name, dataType: param.dataType });
    }
  }
  
  /**
   * Set global variables for variable name mapping
   * Maps BP offsets (positive) to global variable names
   */
  setGlobalVariables(globalVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.globalVariables = globalVars;
  }
  
  /**
   * Set local variables for variable name mapping
   * Maps SP offsets to local variable names
   */
  setLocalVariables(localVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.localVariables = localVars;
  }
  
  /**
   * Set the stack position to variable index mapping for dynamic variable resolution
   * This allows CPTOPSP to resolve variables based on actual stack state, not static offsets
   */
  setVariableStackPositions(positions: Map<number, number>): void {
    this.variableStackPositions = positions;
  }
  
  /**
   * Set local variable initializations for variable info lookup
   */
  setLocalVariableInits(inits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }>): void {
    this.localVariableInits = inits;
  }
  
  /**
   * Set current stack pointer (for calculating source positions in CPTOPSP)
   */
  setStackPointer(sp: number): void {
    this.stackPointer = sp;
  }

  /**
   * Get current stack size
   */
  getStackSize(): number {
    return this.expressionStack.length;
  }
}

