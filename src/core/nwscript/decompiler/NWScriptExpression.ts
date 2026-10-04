import { NWScriptDataType } from "@core/enums/nwscript/NWScriptDataType";

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
  ASSIGNMENT = 'assignment',
  VECTOR = 'vector',
  AGGREGATE = 'aggregate',
  UNKNOWN = 'unknown'
}

/**
 * Shortest decimal that round-trips through IEEE-754 binary32 (NWScript float).
 * Avoids `String(0.2)` -> `0.20000000298023224`.
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

  // For vector values
  components: NWScriptExpression[];

  /** Flattened physical field types for a synthesized user-defined struct value. */
  structureFieldTypes: NWScriptDataType[];

  /** Source name assigned to the synthesized struct layout, when known. */
  structureTypeName?: string;

  // For values that cannot be recovered safely
  diagnostic: string;
  
  constructor(type: NWScriptExpressionType, dataType: NWScriptDataType) {
    this.type = type;
    this.dataType = dataType;
    this.left = null;
    this.right = null;
    this.arguments = [];
    this.components = [];
    this.structureFieldTypes = [];
    this.diagnostic = '';
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

  /** Create an assignment expression for bytecodes that mutate a frame slot directly. */
  static assignment(variable: NWScriptExpression, value: NWScriptExpression): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.ASSIGNMENT, variable.dataType);
    expr.left = variable;
    expr.right = value;
    return expr;
  }

  /** Create a three-component NWScript vector expression. */
  static vector(components: NWScriptExpression[]): NWScriptExpression {
    if (components.length !== 3) {
      throw new Error(`A vector requires exactly three components, received ${components.length}`);
    }
    const expr = new NWScriptExpression(NWScriptExpressionType.VECTOR, NWScriptDataType.VECTOR);
    expr.components = components;
    return expr;
  }

  /** Physical fields of a flattened user-defined struct value. */
  static aggregate(components: NWScriptExpression[]): NWScriptExpression {
    const expr = new NWScriptExpression(
      NWScriptExpressionType.AGGREGATE,
      NWScriptDataType.STRUCTURE
    );
    expr.components = components;
    expr.structureFieldTypes = components.map(component => component.dataType);
    return expr;
  }

  /** Preserve an analysis failure without silently manufacturing a valid literal. */
  static unknown(diagnostic: string, dataType: NWScriptDataType = NWScriptDataType.INTEGER): NWScriptExpression {
    const expr = new NWScriptExpression(NWScriptExpressionType.UNKNOWN, dataType);
    expr.diagnostic = diagnostic;
    return expr;
  }

  /**
   * Convert expression to NSS source code
   */
  toNSS(): string {
    switch (this.type) {
      case NWScriptExpressionType.CONSTANT:
        if (this.dataType === NWScriptDataType.STRING) {
          return `"${this.escapeStringLiteral(String(this.value ?? ''))}"`;
        } else if (this.dataType === NWScriptDataType.FLOAT) {
          const n = typeof this.value === "number" ? this.value : parseFloat(String(this.value));
          if (!Number.isFinite(n)) {
            return "__NCS_DECOMPILER_NONFINITE_FLOAT__";
          }
          // NSS float literals must not look like ints (re-parse assigns them as int).
          const base = formatFloat32NssLiteral(n);
          return base.endsWith("f") ? base : `${base}f`;
        } else if (this.dataType === NWScriptDataType.INTEGER) {
          return typeof this.value === 'number' && Number.isInteger(this.value)
            ? this.value.toString()
            : '__NCS_DECOMPILER_INVALID_INTEGER__';
        } else if (this.dataType === NWScriptDataType.OBJECT) {
          if (this.value === 0) {
            return 'OBJECT_SELF';
          }
          if (this.value === 1) {
            return 'OBJECT_INVALID';
          }
          const objectId = Number(this.value);
          return Number.isFinite(objectId)
            ? `__NCS_OBJECT_ID_${Math.trunc(objectId).toString(16).toUpperCase()}__`
            : '__NCS_DECOMPILER_UNKNOWN_OBJECT__';
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
        if (this.operator === 'post++') return `${operandStr}++`;
        if (this.operator === 'post--') return `${operandStr}--`;
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

      case NWScriptExpressionType.ASSIGNMENT:
        return `${this.left?.toNSS() || '__NCS_DECOMPILER_UNKNOWN_TARGET__'} = ${this.right?.toNSS() || '__NCS_DECOMPILER_UNKNOWN_VALUE__'}`;

      case NWScriptExpressionType.VECTOR:
        return `Vector(${this.components.map(component => component.toNSS()).join(', ')})`;

      case NWScriptExpressionType.AGGREGATE:
        return `__NCS_DECOMPILER_AGGREGATE_VALUE__ /* ${this.components.length} flattened fields */`;

      case NWScriptExpressionType.UNKNOWN:
        return `__NCS_DECOMPILER_UNKNOWN_VALUE__ /* ${this.escapeComment(this.diagnostic)} */`;

      default:
        return '?';
    }
  }

  /**
   * Structural equality for stack-join compares. Matches the values {@link toNSS} would
   * distinguish without rebuilding source text.
   */
  equals(other: NWScriptExpression | null | undefined): boolean {
    if (other == null) return false;
    if (other === this) return true;
    if (this.type !== other.type || this.dataType !== other.dataType) return false;
    if (this.structureTypeName !== other.structureTypeName) return false;
    if (this.structureFieldTypes.length !== other.structureFieldTypes.length) return false;
    for (let index = 0; index < this.structureFieldTypes.length; index++) {
      if (this.structureFieldTypes[index] !== other.structureFieldTypes[index]) return false;
    }

    switch (this.type) {
      case NWScriptExpressionType.CONSTANT:
        if (typeof this.value === 'number' && typeof other.value === 'number') {
          return this.value === other.value || (Number.isNaN(this.value) && Number.isNaN(other.value));
        }
        return this.value === other.value;
      case NWScriptExpressionType.VARIABLE:
        return this.variableName === other.variableName && this.isGlobal === other.isGlobal;
      case NWScriptExpressionType.BINARY_OP:
      case NWScriptExpressionType.COMPARISON:
      case NWScriptExpressionType.LOGICAL:
      case NWScriptExpressionType.ASSIGNMENT:
        return this.operator === other.operator &&
          (this.left?.equals(other.left) ?? other.left == null) &&
          (this.right?.equals(other.right) ?? other.right == null);
      case NWScriptExpressionType.UNARY_OP:
        return this.operator === other.operator &&
          (this.left?.equals(other.left) ?? other.left == null);
      case NWScriptExpressionType.FUNCTION_CALL:
        return this.functionName === other.functionName &&
          this.sameExpressionList(this.arguments, other.arguments);
      case NWScriptExpressionType.VECTOR:
      case NWScriptExpressionType.AGGREGATE:
        return this.sameExpressionList(this.components, other.components);
      case NWScriptExpressionType.UNKNOWN:
        return this.diagnostic === other.diagnostic;
      default:
        return false;
    }
  }

  private sameExpressionList(left: NWScriptExpression[], right: NWScriptExpression[]): boolean {
    if (left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++) {
      if (!left[index].equals(right[index])) return false;
    }
    return true;
  }

  private escapeStringLiteral(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\u0000/g, '\\0')
      .replace(/\u0008/g, '\\b')
      .replace(/\u000c/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  private escapeComment(value: string): string {
    return value.replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim() || 'unknown expression';
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
      case NWScriptDataType.VECTOR: return 'vector';
      case NWScriptDataType.EFFECT: return 'effect';
      case NWScriptDataType.EVENT: return 'event';
      case NWScriptDataType.LOCATION: return 'location';
      case NWScriptDataType.TALENT: return 'talent';
      case NWScriptDataType.VOID: return 'void';
      default: return 'unknown';
    }
  }
}
