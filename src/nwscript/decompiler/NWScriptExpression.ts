import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";

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
  LOGICAL = 'logical',
  /** NSS vector literal `[x, y, z]` */
  VECTOR_LITERAL = 'vector_literal',
}

/**
 * Shortest decimal that round-trips through IEEE-754 binary32 (NWScript float).
 * Avoids `String(0.2)` → `0.20000000298023224`.
 */
function formatFloat32NssLiteral(n: number): string {
  const f = Math.fround(n);
  if (!Number.isFinite(f)) {
    return "0.0";
  }
  if (f === 0) {
    return "0.0";
  }
  for (let significant = 1; significant <= 9; significant++) {
    const raw = f.toPrecision(significant);
    // Prefer fixed decimal over scientific for NSS readability.
    let candidate: string;
    if (/e/i.test(raw)) {
      const digitsAfter = Math.min(12, Math.max(1, significant + 4));
      candidate = f.toFixed(digitsAfter).replace(/(\.\d*?)0+$/, "$1");
      if (candidate.endsWith(".")) {
        candidate += "0";
      }
    } else {
      candidate = raw;
      if (!candidate.includes(".")) {
        candidate = `${candidate}.0`;
      } else {
        candidate = candidate.replace(/(\.\d*?)0+$/, "$1");
        if (candidate.endsWith(".")) {
          candidate += "0";
        }
      }
    }
    if (Math.fround(Number(candidate)) === f) {
      return candidate;
    }
  }
  let fallback = f.toFixed(7).replace(/(\.\d*?)0+$/, "$1");
  if (!fallback.includes(".")) {
    fallback = `${fallback}.0`;
  } else if (fallback.endsWith(".")) {
    fallback += "0";
  }
  return fallback;
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
   * Create an NSS vector literal `[x, y, z]` (components in `arguments`)
   */
  static vectorLiteral(
    x: NWScriptExpression,
    y: NWScriptExpression,
    z: NWScriptExpression
  ): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.VECTOR_LITERAL, NWScriptDataType.VECTOR);
    expr.arguments = [x, y, z];
    return expr;
  }

  /**
   * Convert expression to NSS source code
   */
  toNSS(): string {
    const fallback = (dt: NWScriptDataType): string => {
      if (dt === NWScriptDataType.FLOAT) return "0.0f";
      if (dt === NWScriptDataType.STRING) return '""';
      if (dt === NWScriptDataType.OBJECT) return "OBJECT_INVALID";
      return "0";
    };

    switch (this.type) {
      case NWScriptExpressionType.CONSTANT:
        if (this.dataType === NWScriptDataType.STRING) {
          return `"${this.value}"`;
        } else if (this.dataType === NWScriptDataType.FLOAT) {
          const n = typeof this.value === "number" ? this.value : parseFloat(String(this.value));
          if (!Number.isFinite(n)) {
            return "0.0f";
          }
          // NSS float literals must not look like ints (re-parse assigns them as int).
          // Pretty-print binary32 so 0.2f does not become 0.20000000298023224f.
          const base = formatFloat32NssLiteral(n);
          return base.endsWith("f") ? base : `${base}f`;
        } else if (this.dataType === NWScriptDataType.INTEGER) {
          return this.value.toString();
        } else if (this.dataType === NWScriptDataType.OBJECT) {
          // Project compiler: OBJECT_SELF=0, OBJECT_INVALID=1 (see NWScriptASTBuilder).
          // Retail engine also uses 0x7f000000 for OBJECT_INVALID.
          if (this.value === 0) return "OBJECT_SELF";
          if (this.value === 1 || this.value === 0x7f000000) return "OBJECT_INVALID";
          return String(this.value);
        }
        return String(this.value);

      case NWScriptExpressionType.VARIABLE:
        return this.variableName;

      case NWScriptExpressionType.VECTOR_LITERAL: {
        const comps = this.arguments.map((a) => a?.toNSS() ?? "0.0f");
        return `[${comps.join(", ")}]`;
      }

      case NWScriptExpressionType.BINARY_OP:
        const leftStr = this.left?.toNSS() ?? fallback(this.dataType);
        const rightStr = this.right?.toNSS() ?? fallback(this.dataType);
        return `(${leftStr} ${this.operator} ${rightStr})`;

      case NWScriptExpressionType.UNARY_OP:
        const operandStr = this.left?.toNSS() ?? fallback(this.dataType);
        return `${this.operator}${operandStr}`;

      case NWScriptExpressionType.FUNCTION_CALL:
        const argsStr = this.arguments.map(arg => arg.toNSS()).join(', ');
        return `${this.functionName}(${argsStr})`;

      case NWScriptExpressionType.COMPARISON:
        const compLeft = this.left?.toNSS() ?? "0";
        const compRight = this.right?.toNSS() ?? "0";
        return `(${compLeft} ${this.operator} ${compRight})`;

      case NWScriptExpressionType.LOGICAL:
        const logLeft = this.left?.toNSS() ?? "0";
        const logRight = this.right?.toNSS() ?? "0";
        return `(${logLeft} ${this.operator} ${logRight})`;

      default:
        return fallback(this.dataType);
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

