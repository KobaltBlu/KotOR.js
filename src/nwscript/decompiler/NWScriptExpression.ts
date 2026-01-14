import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";

/**
 * Represents an expression in NWScript decompilation.
 * Can be a constant, variable, binary operation, unary operation, or function call.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptExpression.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export enum NWScriptExpressionType {
  CONSTANT = 'constant',
  VARIABLE = 'variable',
  BINARY_OP = 'binary_op',
  UNARY_OP = 'unary_op',
  FUNCTION_CALL = 'function_call',
  COMPARISON = 'comparison',
  LOGICAL = 'logical'
}

export class NWScriptExpression {
  type: NWScriptExpressionType;
  dataType: NWScriptDataType;
  
  // For constants
  value: any; // number, string, etc.
  
  // For variables
  variableName: string;
  isGlobal: boolean;
  
  // For operations
  operator: string;
  left: NWScriptExpression | null;
  right: NWScriptExpression | null;
  
  // For function calls
  functionName: string;
  arguments: NWScriptExpression[];
  
  constructor(type: NWScriptExpressionType, dataType: NWScriptDataType) {
    this.type = type;
    this.dataType = dataType;
    this.left = null;
    this.right = null;
    this.arguments = [];
  }

  /**
   * Create a constant expression
   */
  static constant(value: any, dataType: NWScriptDataType): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.CONSTANT, dataType);
    expr.value = value;
    return expr;
  }

  /**
   * Create a variable expression
   */
  static variable(name: string, dataType: NWScriptDataType, isGlobal: boolean = false): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.VARIABLE, dataType);
    expr.variableName = name;
    expr.isGlobal = isGlobal;
    return expr;
  }

  /**
   * Create a binary operation expression
   */
  static binaryOp(operator: string, left: NWScriptExpression, right: NWScriptExpression, dataType: NWScriptDataType): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.BINARY_OP, dataType);
    expr.operator = operator;
    expr.left = left;
    expr.right = right;
    return expr;
  }

  /**
   * Create a unary operation expression
   */
  static unaryOp(operator: string, operand: NWScriptExpression, dataType: NWScriptDataType): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.UNARY_OP, dataType);
    expr.operator = operator;
    expr.left = operand;
    return expr;
  }

  /**
   * Create a function call expression
   */
  static functionCall(name: string, args: NWScriptExpression[], returnType: NWScriptDataType): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.FUNCTION_CALL, returnType);
    expr.functionName = name;
    expr.arguments = args;
    return expr;
  }

  /**
   * Create a comparison expression
   */
  static comparison(operator: string, left: NWScriptExpression, right: NWScriptExpression): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.COMPARISON, NWScriptDataType.INTEGER);
    expr.operator = operator;
    expr.left = left;
    expr.right = right;
    return expr;
  }

  /**
   * Create a logical expression
   */
  static logical(operator: string, left: NWScriptExpression, right: NWScriptExpression): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.LOGICAL, NWScriptDataType.INTEGER);
    expr.operator = operator;
    expr.left = left;
    expr.right = right;
    return expr;
  }

  /**
   * Convert expression to NSS source code
   */
  toNSS(): string {
    switch (this.type) {
      case NWScriptExpressionType.CONSTANT:
        if (this.dataType === NWScriptDataType.STRING) {
          return `"${this.value}"`;
        } else if (this.dataType === NWScriptDataType.FLOAT) {
          return this.value.toString();
        } else if (this.dataType === NWScriptDataType.INTEGER) {
          return this.value.toString();
        } else if (this.dataType === NWScriptDataType.OBJECT && this.value === 0) {
          return 'OBJECT_INVALID';
        }
        return String(this.value);

      case NWScriptExpressionType.VARIABLE:
        return this.variableName;

      case NWScriptExpressionType.BINARY_OP:
        const leftStr = this.left?.toNSS() || '?';
        const rightStr = this.right?.toNSS() || '?';
        return `(${leftStr} ${this.operator} ${rightStr})`;

      case NWScriptExpressionType.UNARY_OP:
        const operandStr = this.left?.toNSS() || '?';
        return `${this.operator}${operandStr}`;

      case NWScriptExpressionType.FUNCTION_CALL:
        const argsStr = this.arguments.map(arg => arg.toNSS()).join(', ');
        return `${this.functionName}(${argsStr})`;

      case NWScriptExpressionType.COMPARISON:
        const compLeft = this.left?.toNSS() || '?';
        const compRight = this.right?.toNSS() || '?';
        return `(${compLeft} ${this.operator} ${compRight})`;

      case NWScriptExpressionType.LOGICAL:
        const logLeft = this.left?.toNSS() || '?';
        const logRight = this.right?.toNSS() || '?';
        return `(${logLeft} ${this.operator} ${logRight})`;

      default:
        return '?';
    }
  }

  /**
   * Get the data type name as string
   */
  getDataTypeName(): string {
    switch (this.dataType) {
      case NWScriptDataType.INTEGER: return 'int';
      case NWScriptDataType.FLOAT: return 'float';
      case NWScriptDataType.STRING: return 'string';
      case NWScriptDataType.OBJECT: return 'object';
      case NWScriptDataType.VOID: return 'void';
      default: return 'unknown';
    }
  }
}

