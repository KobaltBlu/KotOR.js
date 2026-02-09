/**
 * NWScript Expression Evaluator
 * Evaluates constant expressions for compile-time validation
 * Based on the Python compiler's expression evaluation logic
 */

import { DataTypeEnum } from './kotor-definitions';
import {
  BinaryExpression,
  ConditionalExpression,
  Expression,
  Identifier,
  Literal,
  MemberExpression,
  UnaryExpression,
  VectorLiteral
} from './nwscript-ast';

export interface EvaluationResult {
  value: any;
  type: DataTypeEnum;
  isConstant: boolean;
  isKnown: boolean;
}

export class ExpressionEvaluator {
  private constants: Map<string, any> = new Map();

  constructor(constants: { [key: string]: any } = {}) {
    Object.entries(constants).forEach(([name, value]) => {
      this.constants.set(name, value);
    });
  }

  public evaluate(expr: Expression): EvaluationResult | null {
    try {
      return this.evaluateExpression(expr);
    } catch (error) {
      // If evaluation fails, return null
      return null;
    }
  }

  private evaluateExpression(expr: Expression): EvaluationResult | null {
    if (expr instanceof Literal) {
      return this.evaluateLiteral(expr);
    } else if (expr instanceof Identifier) {
      return this.evaluateIdentifier(expr);
    } else if (expr instanceof BinaryExpression) {
      return this.evaluateBinaryExpression(expr);
    } else if (expr instanceof UnaryExpression) {
      return this.evaluateUnaryExpression(expr);
    } else if (expr instanceof VectorLiteral) {
      return this.evaluateVectorLiteral(expr);
    } else if (expr instanceof ConditionalExpression) {
      return this.evaluateConditionalExpression(expr);
    } else if (expr instanceof MemberExpression) {
      return this.evaluateMemberExpression(expr);
    }

    // For other expression types, return unknown
    return {
      value: null,
      type: DataTypeEnum.VOID,
      isConstant: false,
      isKnown: false
    };
  }

  private evaluateLiteral(expr: Literal): EvaluationResult {
    if (typeof expr.value === 'number') {
      const type = (expr.raw && (expr.raw.includes('.') || expr.raw.toLowerCase().includes('f'))) ? 
                   DataTypeEnum.FLOAT : DataTypeEnum.INT;
      return {
        value: expr.value,
        type,
        isConstant: true,
        isKnown: true
      };
    } else if (typeof expr.value === 'string') {
      return {
        value: expr.value,
        type: DataTypeEnum.STRING,
        isConstant: true,
        isKnown: true
      };
    }

    return {
      value: expr.value,
      type: DataTypeEnum.VOID,
      isConstant: true,
      isKnown: true
    };
  }

  private evaluateIdentifier(expr: Identifier): EvaluationResult | null {
    // Handle special constants
    switch (expr.name) {
      case 'TRUE':
        return { value: 1, type: DataTypeEnum.INT, isConstant: true, isKnown: true };
      case 'FALSE':
        return { value: 0, type: DataTypeEnum.INT, isConstant: true, isKnown: true };
      case 'OBJECT_SELF':
        return { value: 'OBJECT_SELF', type: DataTypeEnum.OBJECT, isConstant: true, isKnown: true };
      case 'OBJECT_INVALID':
        return { value: 'OBJECT_INVALID', type: DataTypeEnum.OBJECT, isConstant: true, isKnown: true };
    }

    // Check user-defined constants
    if (this.constants.has(expr.name)) {
      const value = this.constants.get(expr.name);
      const type = typeof value === 'number' ? DataTypeEnum.INT : 
                   typeof value === 'string' ? DataTypeEnum.STRING : DataTypeEnum.VOID;
      return {
        value,
        type,
        isConstant: true,
        isKnown: true
      };
    }

    // Unknown or non-constant identifier
    return null;
  }

  private evaluateBinaryExpression(expr: BinaryExpression): EvaluationResult | null {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    if (!left || !right || !left.isKnown || !right.isKnown) {
      return null; // Cannot evaluate non-constant expressions
    }

    try {
      switch (expr.operator) {
        case '+':
          if (left.type === DataTypeEnum.STRING || right.type === DataTypeEnum.STRING) {
            return {
              value: String(left.value) + String(right.value),
              type: DataTypeEnum.STRING,
              isConstant: true,
              isKnown: true
            };
          }
          if (left.type === DataTypeEnum.VECTOR && right.type === DataTypeEnum.VECTOR) {
            return {
              value: {
                x: left.value.x + right.value.x,
                y: left.value.y + right.value.y,
                z: left.value.z + right.value.z
              },
              type: DataTypeEnum.VECTOR,
              isConstant: true,
              isKnown: true
            };
          }
          const addResult = Number(left.value) + Number(right.value);
          const addType = (left.type === DataTypeEnum.FLOAT || right.type === DataTypeEnum.FLOAT) ? 
                         DataTypeEnum.FLOAT : DataTypeEnum.INT;
          return { value: addResult, type: addType, isConstant: true, isKnown: true };

        case '-':
          if (left.type === DataTypeEnum.VECTOR && right.type === DataTypeEnum.VECTOR) {
            return {
              value: {
                x: left.value.x - right.value.x,
                y: left.value.y - right.value.y,
                z: left.value.z - right.value.z
              },
              type: DataTypeEnum.VECTOR,
              isConstant: true,
              isKnown: true
            };
          }
          const subResult = Number(left.value) - Number(right.value);
          const subType = (left.type === DataTypeEnum.FLOAT || right.type === DataTypeEnum.FLOAT) ? 
                         DataTypeEnum.FLOAT : DataTypeEnum.INT;
          return { value: subResult, type: subType, isConstant: true, isKnown: true };

        case '*':
          if (left.type === DataTypeEnum.VECTOR && right.type === DataTypeEnum.VECTOR) {
            // Vector dot product
            return {
              value: left.value.x * right.value.x + left.value.y * right.value.y + left.value.z * right.value.z,
              type: DataTypeEnum.FLOAT,
              isConstant: true,
              isKnown: true
            };
          }
          if (left.type === DataTypeEnum.VECTOR && this.isNumericType(right.type)) {
            return {
              value: {
                x: left.value.x * Number(right.value),
                y: left.value.y * Number(right.value),
                z: left.value.z * Number(right.value)
              },
              type: DataTypeEnum.VECTOR,
              isConstant: true,
              isKnown: true
            };
          }
          const mulResult = Number(left.value) * Number(right.value);
          const mulType = (left.type === DataTypeEnum.FLOAT || right.type === DataTypeEnum.FLOAT) ? 
                         DataTypeEnum.FLOAT : DataTypeEnum.INT;
          return { value: mulResult, type: mulType, isConstant: true, isKnown: true };

        case '/':
          if (Number(right.value) === 0) {
            throw new Error('Division by zero');
          }
          const divResult = Number(left.value) / Number(right.value);
          const divType = (left.type === DataTypeEnum.FLOAT || right.type === DataTypeEnum.FLOAT) ? 
                         DataTypeEnum.FLOAT : DataTypeEnum.INT;
          return { value: divResult, type: divType, isConstant: true, isKnown: true };

        case '%':
          if (Number(right.value) === 0) {
            throw new Error('Modulo by zero');
          }
          return {
            value: Number(left.value) % Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '==':
          return {
            value: this.valuesEqual(left.value, right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '!=':
          return {
            value: !this.valuesEqual(left.value, right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '<':
          return {
            value: Number(left.value) < Number(right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '<=':
          return {
            value: Number(left.value) <= Number(right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '>':
          return {
            value: Number(left.value) > Number(right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '>=':
          return {
            value: Number(left.value) >= Number(right.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '&&':
          return {
            value: (this.isTruthy(left.value) && this.isTruthy(right.value)) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '||':
          return {
            value: (this.isTruthy(left.value) || this.isTruthy(right.value)) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '&':
          return {
            value: Number(left.value) & Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '|':
          return {
            value: Number(left.value) | Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '^':
          return {
            value: Number(left.value) ^ Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '<<':
          return {
            value: Number(left.value) << Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '>>':
          return {
            value: Number(left.value) >> Number(right.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private evaluateUnaryExpression(expr: UnaryExpression): EvaluationResult | null {
    const operand = this.evaluateExpression(expr.argument);
    if (!operand || !operand.isKnown) {
      return null;
    }

    try {
      switch (expr.operator) {
        case '-':
          return {
            value: -Number(operand.value),
            type: operand.type,
            isConstant: true,
            isKnown: true
          };

        case '+':
          return {
            value: Number(operand.value),
            type: operand.type,
            isConstant: true,
            isKnown: true
          };

        case '!':
          return {
            value: !this.isTruthy(operand.value) ? 1 : 0,
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        case '~':
          return {
            value: ~Number(operand.value),
            type: DataTypeEnum.INT,
            isConstant: true,
            isKnown: true
          };

        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private evaluateVectorLiteral(expr: VectorLiteral): EvaluationResult | null {
    const x = this.evaluateExpression(expr.x);
    const y = this.evaluateExpression(expr.y);
    const z = this.evaluateExpression(expr.z);

    if (!x || !y || !z || !x.isKnown || !y.isKnown || !z.isKnown) {
      return null;
    }

    return {
      value: {
        x: Number(x.value),
        y: Number(y.value),
        z: Number(z.value)
      },
      type: DataTypeEnum.VECTOR,
      isConstant: true,
      isKnown: true
    };
  }

  private evaluateConditionalExpression(expr: ConditionalExpression): EvaluationResult | null {
    const test = this.evaluateExpression(expr.test);
    if (!test || !test.isKnown) {
      return null;
    }

    if (this.isTruthy(test.value)) {
      return this.evaluateExpression(expr.consequent);
    } else {
      return this.evaluateExpression(expr.alternate);
    }
  }

  private evaluateMemberExpression(expr: MemberExpression): EvaluationResult | null {
    const object = this.evaluateExpression(expr.object);
    if (!object || !object.isKnown) {
      return null;
    }

    if (object.type === DataTypeEnum.VECTOR && !expr.computed && expr.property instanceof Identifier) {
      const component = expr.property.name;
      if (['x', 'y', 'z'].includes(component)) {
        return {
          value: object.value[component],
          type: DataTypeEnum.FLOAT,
          isConstant: object.isConstant,
          isKnown: true
        };
      }
    }

    return null;
  }

  // Helper methods

  private isNumericType(type: DataTypeEnum): boolean {
    return type === DataTypeEnum.INT || type === DataTypeEnum.FLOAT;
  }

  private isTruthy(value: any): boolean {
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      return value.length > 0;
    }
    if (typeof value === 'object' && value !== null) {
      return true;
    }
    return Boolean(value);
  }

  private valuesEqual(left: any, right: any): boolean {
    if (typeof left === 'object' && typeof right === 'object') {
      if (left && right && left.x !== undefined && right.x !== undefined) {
        // Vector comparison
        return left.x === right.x && left.y === right.y && left.z === right.z;
      }
    }
    return left === right;
  }

  /**
   * Check if an expression is a compile-time constant
   */
  public isConstantExpression(expr: Expression): boolean {
    const result = this.evaluate(expr);
    return result ? result.isConstant && result.isKnown : false;
  }

  /**
   * Get the constant value of an expression if possible
   */
  public getConstantValue(expr: Expression): any {
    const result = this.evaluate(expr);
    return (result && result.isKnown) ? result.value : undefined;
  }

  /**
   * Check if an expression evaluates to a truthy value
   */
  public isTruthyExpression(expr: Expression): boolean | null {
    const result = this.evaluate(expr);
    if (result && result.isKnown) {
      return this.isTruthy(result.value);
    }
    return null;
  }
}
