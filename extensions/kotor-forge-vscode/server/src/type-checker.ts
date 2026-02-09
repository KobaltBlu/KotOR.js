/**
 * Advanced NWScript Type Checker
 * Implements comprehensive type checking based on the Python compiler's logic
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';
import {
  DataTypeEnum,
  getDataTypeSize,
  isValidDataType,
  NWScriptConstant,
  NWScriptFunction
} from './kotor-definitions';
import {
  AssignmentExpression,
  ASTVisitor,
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  FunctionDeclaration,
  Identifier,
  Literal,
  MemberExpression,
  Parameter,
  Program,
  SourceRange,
  UnaryExpression,
  VariableDeclaration,
  VectorLiteral,
  walkAST
} from './nwscript-ast';
import { SemanticError } from './semantic-analyzer';

export interface TypeInfo {
  type: DataTypeEnum;
  isConstant?: boolean;
  isLValue?: boolean;
  size: number;
  structName?: string;
}

export interface TypeContext {
  functions: Map<string, NWScriptFunction>;
  userFunctions: Map<string, FunctionDeclaration>;
  variables: Map<string, TypeInfo>;
  constants: Map<string, NWScriptConstant>;
}

export class TypeChecker implements ASTVisitor<TypeInfo> {
  private errors: SemanticError[] = [];
  private context: TypeContext;
  private structRegistry: Map<string, Map<string, string>> = new Map();

  constructor(
    functions: NWScriptFunction[] = [],
    constants: NWScriptConstant[] = []
  ) {
    this.context = {
      functions: new Map(),
      userFunctions: new Map(),
      variables: new Map(),
      constants: new Map()
    };

    // Initialize with built-in functions and constants
    functions.forEach(func => {
      this.context.functions.set(func.name, func);
    });

    constants.forEach(constant => {
      this.context.constants.set(constant.name, constant);
    });
  }

  public check(ast: Program): SemanticError[] {
    this.errors = [];
    
    try {
      // First pass: collect function and struct declarations
      ast.body.forEach(decl => {
        if (decl instanceof FunctionDeclaration) {
          this.context.userFunctions.set(decl.name, decl);
        } else if ((decl as any).type === 'StructDeclaration') {
          const structDecl = decl as any;
          const members = new Map<string, DataTypeEnum>();
          (structDecl.members || []).forEach((m: any) => {
            const t = (m.varType?.name || 'void') as DataTypeEnum;
            members.set(m.name, t);
          });
          this.structRegistry.set(structDecl.name, members);
        }
      });

      // Second pass: type check everything
      walkAST(ast, this);
      
    } catch (error) {
      if (error instanceof Error) {
        this.addError({
          message: `Type checking error: ${error.message}`,
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 }
          }
        });
      }
    }

    return this.errors;
  }

  private addError(error: SemanticError): void {
    this.errors.push(error);
  }

  private getTypeInfo(typeName: DataTypeEnum): TypeInfo {
    return {
      type: typeName,
      size: getDataTypeSize(typeName),
      isConstant: false,
      isLValue: true
    };
  }

  private getTypeInfoFromName(typeName: string): TypeInfo {
    if (isValidDataType(typeName)) {
      return this.getTypeInfo(typeName as DataTypeEnum);
    }
    // Struct type by name
    if (this.structRegistry.has(typeName)) {
      const ti = this.getTypeInfo(DataTypeEnum.STRUCT);
      ti.structName = typeName;
      return ti;
    }
    // Unknown -> VOID
    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  // AST Visitor Methods

  public visitProgram(node: Program): TypeInfo {
    node.body.forEach(decl => {
      walkAST(decl, this);
    });
    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  public visitFunctionDeclaration(node: FunctionDeclaration): TypeInfo {
    // Validate return type
    if (!isValidDataType(node.returnType.name)) {
      this.addError({
        message: `Invalid return type '${node.returnType.name}'`,
        severity: DiagnosticSeverity.Error,
        range: node.returnType.range,
        code: 'invalid-return-type'
      });
    }

    // Check parameters
    node.parameters.forEach(param => {
      this.visitParameter(param);
    });

    // Type check function body
    if (!node.isPrototype) {
      walkAST(node.body, this);
    }

    return this.getTypeInfoFromName(node.returnType.name);
  }

  public visitParameter(node: Parameter): TypeInfo {
    if (!isValidDataType(node.paramType.name)) {
      this.addError({
        message: `Invalid parameter type '${node.paramType.name}'`,
        severity: DiagnosticSeverity.Error,
        range: node.paramType.range,
        code: 'invalid-parameter-type'
      });
    }

    // Register parameter in context
    const typeInfo = this.getTypeInfoFromName(node.paramType.name);
    this.context.variables.set(node.name, typeInfo);

    if (node.defaultValue) {
      const defaultType = walkAST(node.defaultValue, this);
      if (defaultType && !this.isTypeAssignable(defaultType, typeInfo)) {
        this.addError({
          message: `Default value type '${defaultType.type}' is not assignable to parameter type '${typeInfo.type}'`,
          severity: DiagnosticSeverity.Error,
          range: node.defaultValue.range,
          code: 'incompatible-default-value'
        });
      }
    }

    return typeInfo;
  }

  public visitVariableDeclaration(node: VariableDeclaration): TypeInfo {
    if (!isValidDataType(node.varType.name)) {
      this.addError({
        message: `Invalid variable type '${node.varType.name}'`,
        severity: DiagnosticSeverity.Error,
        range: node.varType.range,
        code: 'invalid-variable-type'
      });
    }

    const typeInfo = this.getTypeInfoFromName(node.varType.name);
    typeInfo.isConstant = node.isConstant;
    
    // Register variable in context
    this.context.variables.set(node.name, typeInfo);

    if (node.initializer) {
      const initType = walkAST(node.initializer, this);
      if (initType && !this.isTypeAssignable(initType, typeInfo)) {
        this.addError({
          message: `Cannot assign value of type '${initType.type}' to variable of type '${typeInfo.type}'`,
          severity: DiagnosticSeverity.Error,
          range: node.initializer.range,
          code: 'type-assignment-error'
        });
      }
    }

    return typeInfo;
  }

  public visitCallExpression(node: CallExpression): TypeInfo {
    if (!(node.callee instanceof Identifier)) {
      this.addError({
        message: 'Invalid function call',
        severity: DiagnosticSeverity.Error,
        range: node.callee.range,
        code: 'invalid-call'
      });
      return this.getTypeInfo(DataTypeEnum.VOID);
    }

    const functionName = node.callee.name;
    
    // Check built-in functions
    const builtinFunc = this.context.functions.get(functionName);
    if (builtinFunc) {
      return this.checkBuiltinFunctionCall(node, builtinFunc);
    }

    // Check user-defined functions
    const userFunc = this.context.userFunctions.get(functionName);
    if (userFunc) {
      return this.checkUserFunctionCall(node, userFunc);
    }

    // Unknown function
    this.addError({
      message: `Unknown function '${functionName}'`,
      severity: DiagnosticSeverity.Error,
      range: node.callee.range,
      code: 'unknown-function'
    });

    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  public visitBinaryExpression(node: BinaryExpression): TypeInfo {
    const leftType = walkAST(node.left, this);
    const rightType = walkAST(node.right, this);

    if (!leftType || !rightType) {
      return this.getTypeInfo(DataTypeEnum.VOID);
    }

    return this.checkBinaryOperation(node.operator, leftType, rightType, node.range);
  }

  public visitUnaryExpression(node: UnaryExpression): TypeInfo {
    const operandType = walkAST(node.argument, this);
    if (!operandType) {
      return this.getTypeInfo(DataTypeEnum.VOID);
    }

    return this.checkUnaryOperation(node.operator, operandType, node.range);
  }

  public visitAssignmentExpression(node: AssignmentExpression): TypeInfo {
    const leftType = walkAST(node.left, this);
    const rightType = walkAST(node.right, this);

    if (!leftType || !rightType) {
      return this.getTypeInfo(DataTypeEnum.VOID);
    }

    // Check if left side is assignable
    if (!leftType.isLValue) {
      this.addError({
        message: 'Invalid left-hand side in assignment',
        severity: DiagnosticSeverity.Error,
        range: node.left.range,
        code: 'invalid-lvalue'
      });
    }

    // Check if left side is constant
    if (leftType.isConstant) {
      this.addError({
        message: 'Cannot assign to constant',
        severity: DiagnosticSeverity.Error,
        range: node.left.range,
        code: 'assign-to-constant'
      });
    }

    // Check type compatibility
    if (!this.isTypeAssignable(rightType, leftType)) {
      this.addError({
        message: `Cannot assign value of type '${rightType.type}' to variable of type '${leftType.type}'`,
        severity: DiagnosticSeverity.Error,
        range: node.right.range,
        code: 'type-assignment-error'
      });
    }

    return leftType;
  }

  public visitIdentifier(node: Identifier): TypeInfo {
    // Check variables first
    const variable = this.context.variables.get(node.name);
    if (variable) {
      return variable;
    }

    // Check constants
    const constant = this.context.constants.get(node.name);
    if (constant) {
      const typeInfo = this.getTypeInfoFromName(constant.type);
      typeInfo.isConstant = true;
      typeInfo.isLValue = false;
      return typeInfo;
    }

    // Unknown identifier
    this.addError({
      message: `Unknown identifier '${node.name}'`,
      severity: DiagnosticSeverity.Error,
      range: node.range,
      code: 'unknown-identifier'
    });

    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  public visitLiteral(node: Literal): TypeInfo {
    if (typeof node.value === 'number') {
      const type = (node.raw && node.raw.includes('.')) || 
                   (node.raw && node.raw.toLowerCase().includes('f')) ? 
                   DataTypeEnum.FLOAT : DataTypeEnum.INT;
      const typeInfo = this.getTypeInfo(type);
      typeInfo.isConstant = true;
      typeInfo.isLValue = false;
      return typeInfo;
    } else if (typeof node.value === 'string') {
      const typeInfo = this.getTypeInfo(DataTypeEnum.STRING);
      typeInfo.isConstant = true;
      typeInfo.isLValue = false;
      return typeInfo;
    }

    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  public visitVectorLiteral(node: VectorLiteral): TypeInfo {
    // Type check components
    const xType = walkAST(node.x, this);
    const yType = walkAST(node.y, this);
    const zType = walkAST(node.z, this);

    // All components should be numeric
    [xType, yType, zType].forEach((componentType, index) => {
      if (componentType && !this.isNumericType(componentType)) {
        const component = ['x', 'y', 'z'][index];
        this.addError({
          message: `Vector ${component} component must be numeric, got '${componentType.type}'`,
          severity: DiagnosticSeverity.Error,
          range: [node.x, node.y, node.z][index]!.range,
          code: 'non-numeric-vector-component'
        });
      }
    });

    const typeInfo = this.getTypeInfo(DataTypeEnum.VECTOR);
    typeInfo.isConstant = true;
    typeInfo.isLValue = false;
    return typeInfo;
  }

  public visitMemberExpression(node: MemberExpression): TypeInfo {
    const objectType = walkAST(node.object, this);
    if (!objectType) {
      return this.getTypeInfo(DataTypeEnum.VOID);
    }

    if (node.computed) {
      // Array-style access: obj[index]
      const indexType = walkAST(node.property, this);
      if (indexType && !this.isTypeAssignable(indexType, this.getTypeInfo(DataTypeEnum.INT))) {
        this.addError({
          message: `Array index must be of type 'int', got '${indexType.type}'`,
          severity: DiagnosticSeverity.Error,
          range: node.property.range,
          code: 'invalid-array-index'
        });
      }
      
      // Return element type. NWScript arrays are not first-class; treat as object element type for now.
      return objectType;
    } else {
      // Dot notation: obj.property
      if (objectType.type === DataTypeEnum.VECTOR && node.property instanceof Identifier) {
        const validComponents = ['x', 'y', 'z'];
        if (!validComponents.includes(node.property.name)) {
          this.addError({
            message: `Invalid vector component '${node.property.name}'. Valid components are: x, y, z`,
            severity: DiagnosticSeverity.Error,
            range: node.property.range,
            code: 'invalid-vector-component'
          });
        }
        return this.getTypeInfo(DataTypeEnum.FLOAT);
      } else if (objectType.type === DataTypeEnum.STRUCT && node.property instanceof Identifier) {
        const structName = objectType.structName;
        if (structName && this.structRegistry.has(structName)) {
          const members = this.structRegistry.get(structName)!;
          const memberTypeName = members.get(node.property.name);
          if (memberTypeName) {
            return this.getTypeInfoFromName(memberTypeName);
          }
          this.addError({
            message: `Struct '${structName}' has no member named '${node.property.name}'`,
            severity: DiagnosticSeverity.Error,
            range: node.property.range,
            code: 'unknown-struct-member'
          });
          return this.getTypeInfo(DataTypeEnum.VOID);
        }
        this.addError({
          message: `Unknown struct type for member access`,
          severity: DiagnosticSeverity.Error,
          range: node.object.range,
          code: 'unknown-struct-type'
        });
        return this.getTypeInfo(DataTypeEnum.VOID);
      } else {
        this.addError({
          message: `Cannot access property on type '${objectType.type}'`,
          severity: DiagnosticSeverity.Error,
          range: node.property.range,
          code: 'invalid-property-access'
        });
        return this.getTypeInfo(DataTypeEnum.VOID);
      }
    }
  }

  public visitConditionalExpression(node: ConditionalExpression): TypeInfo {
    const testType = walkAST(node.test, this);
    const consequentType = walkAST(node.consequent, this);
    const alternateType = walkAST(node.alternate, this);

    // Test must be boolean (int in NWScript)
    if (testType && !this.isTypeAssignable(testType, this.getTypeInfo(DataTypeEnum.INT))) {
      this.addError({
        message: `Conditional test must be of type 'int', got '${testType.type}'`,
        severity: DiagnosticSeverity.Error,
        range: node.test.range,
        code: 'invalid-conditional-test'
      });
    }

    // Both branches should have compatible types
    if (consequentType && alternateType) {
      if (!this.isTypeAssignable(consequentType, alternateType) && 
          !this.isTypeAssignable(alternateType, consequentType)) {
        this.addError({
          message: `Conditional branches have incompatible types: '${consequentType.type}' and '${alternateType.type}'`,
          severity: DiagnosticSeverity.Warning,
          range: node.range,
          code: 'incompatible-conditional-types'
        });
      }
      
      // Return the more general type
      return this.getCommonType(consequentType, alternateType);
    }

    return consequentType || alternateType || this.getTypeInfo(DataTypeEnum.VOID);
  }

  // Helper Methods

  private checkBuiltinFunctionCall(node: CallExpression, func: NWScriptFunction): TypeInfo {
    // Type check arguments
    node.arguments.forEach((arg, index) => {
      const argType = walkAST(arg, this);
      if (argType && index < func.parameters.length) {
        const paramType = this.getTypeInfoFromName(func.parameters[index]!.type);
        if (!this.isTypeAssignable(argType, paramType)) {
          this.addError({
            message: `Argument ${index + 1} to '${func.name}' should be of type '${paramType.type}', got '${argType.type}'`,
            severity: DiagnosticSeverity.Error,
            range: arg.range,
            code: 'argument-type-mismatch'
          });
        }
      }
    });

    // Check argument count
    const requiredParams = func.parameters.filter(p => !p.defaultValue);
    if (node.arguments.length < requiredParams.length) {
      this.addError({
        message: `Function '${func.name}' requires at least ${requiredParams.length} arguments, got ${node.arguments.length}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'insufficient-arguments'
      });
    }

    if (node.arguments.length > func.parameters.length) {
      this.addError({
        message: `Function '${func.name}' takes at most ${func.parameters.length} arguments, got ${node.arguments.length}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'too-many-arguments'
      });
    }

    return this.getTypeInfoFromName(func.returnType);
  }

  private checkUserFunctionCall(node: CallExpression, func: FunctionDeclaration): TypeInfo {
    // Type check arguments against parameters
    node.arguments.forEach((arg, index) => {
      const argType = walkAST(arg, this);
      if (argType && index < func.parameters.length) {
        const param = func.parameters[index]!;
        const paramType = this.getTypeInfoFromName(param.paramType.name);
        if (!this.isTypeAssignable(argType, paramType)) {
          this.addError({
            message: `Argument ${index + 1} should be of type '${paramType.type}', got '${argType.type}'`,
            severity: DiagnosticSeverity.Error,
            range: arg.range,
            code: 'argument-type-mismatch'
          });
        }
      }
    });

    // Check argument count
    const requiredParams = func.parameters.filter(p => !p.defaultValue);
    if (node.arguments.length < requiredParams.length) {
      this.addError({
        message: `Function '${func.name}' requires at least ${requiredParams.length} arguments, got ${node.arguments.length}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'insufficient-arguments'
      });
    }

    return this.getTypeInfoFromName(func.returnType.name);
  }

  private checkBinaryOperation(operator: string, leftType: TypeInfo, rightType: TypeInfo, range: SourceRange): TypeInfo {
    // Implement type checking rules based on the Python compiler's BinaryOperatorMapping
    switch (operator) {
      case '+':
        if (this.isStringType(leftType) || this.isStringType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.STRING);
        }
        if (this.isVectorType(leftType) && this.isVectorType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.VECTOR);
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return this.getNumericResultType(leftType, rightType);
        }
        break;

      case '-':
      case '*':
        if (this.isVectorType(leftType) && this.isVectorType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.VECTOR);
        }
        if (this.isVectorType(leftType) && this.isNumericType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.VECTOR);
        }
        if (this.isNumericType(leftType) && this.isVectorType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.VECTOR);
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return this.getNumericResultType(leftType, rightType);
        }
        break;

      case '/':
        if (this.isVectorType(leftType) && this.isNumericType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.VECTOR);
        }
        if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
          return this.getNumericResultType(leftType, rightType);
        }
        break;

      case '%':
        if (leftType.type === DataTypeEnum.INT && rightType.type === DataTypeEnum.INT) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;

      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
        if (this.isComparableTypes(leftType, rightType)) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;

      case '&&':
      case '||':
        if (this.isBooleanType(leftType) && this.isBooleanType(rightType)) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;

      case '&':
      case '|':
      case '^':
      case '<<':
      case '>>':
        if (leftType.type === DataTypeEnum.INT && rightType.type === DataTypeEnum.INT) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;
    }

    // If we get here, the operation is invalid
    this.addError({
      message: `Cannot apply operator '${operator}' to types '${leftType.type}' and '${rightType.type}'`,
      severity: DiagnosticSeverity.Error,
      range: range,
      code: 'invalid-binary-operation'
    });

    return this.getTypeInfo(DataTypeEnum.VOID);
  }

  private checkUnaryOperation(operator: string, operandType: TypeInfo, range: SourceRange): TypeInfo {
    switch (operator) {
      case '-':
      case '+':
        if (this.isNumericType(operandType)) {
          return operandType;
        }
        break;

      case '!':
        if (this.isBooleanType(operandType)) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;

      case '~':
        if (operandType.type === DataTypeEnum.INT) {
          return this.getTypeInfo(DataTypeEnum.INT);
        }
        break;

      case '++':
      case '--':
        if (this.isNumericType(operandType) && operandType.isLValue) {
          return operandType;
        }
        if (!operandType.isLValue) {
          this.addError({
            message: `Cannot apply '${operator}' to non-lvalue`,
            severity: DiagnosticSeverity.Error,
            range: range,
            code: 'invalid-increment-target'
          });
        }
        break;
    }

    // If we get here, the operation is invalid
    this.addError({
      message: `Cannot apply operator '${operator}' to type '${operandType.type}'`,
      severity: DiagnosticSeverity.Error,
      range: range,
      code: 'invalid-unary-operation'
    });

    return operandType;
  }

  // Type utility methods

  private isTypeAssignable(sourceType: TypeInfo, targetType: TypeInfo): boolean {
    if (sourceType.type === targetType.type) return true;
    
    // Numeric conversions
    if (this.isNumericType(sourceType) && this.isNumericType(targetType)) {
      return true;
    }
    
    // Object compatibility
    if (targetType.type === DataTypeEnum.OBJECT) return true;
    
    // String concatenation compatibility
    if (targetType.type === DataTypeEnum.STRING) return true;
    
    return false;
  }

  private isNumericType(type: TypeInfo): boolean {
    return type.type === DataTypeEnum.INT || type.type === DataTypeEnum.FLOAT;
  }

  private isStringType(type: TypeInfo): boolean {
    return type.type === DataTypeEnum.STRING;
  }

  private isVectorType(type: TypeInfo): boolean {
    return type.type === DataTypeEnum.VECTOR;
  }

  private isBooleanType(type: TypeInfo): boolean {
    return type.type === DataTypeEnum.INT; // NWScript uses int for boolean
  }

  private isComparableTypes(leftType: TypeInfo, rightType: TypeInfo): boolean {
    // Same type is always comparable
    if (leftType.type === rightType.type) return true;
    
    // Numeric types are comparable with each other
    if (this.isNumericType(leftType) && this.isNumericType(rightType)) return true;
    
    return false;
  }

  private getNumericResultType(leftType: TypeInfo, rightType: TypeInfo): TypeInfo {
    // If either operand is float, result is float
    if (leftType.type === DataTypeEnum.FLOAT || rightType.type === DataTypeEnum.FLOAT) {
      return this.getTypeInfo(DataTypeEnum.FLOAT);
    }
    return this.getTypeInfo(DataTypeEnum.INT);
  }

  private getCommonType(type1: TypeInfo, type2: TypeInfo): TypeInfo {
    if (type1.type === type2.type) return type1;
    
    // For numeric types, promote to float if one is float
    if (this.isNumericType(type1) && this.isNumericType(type2)) {
      return this.getNumericResultType(type1, type2);
    }
    
    // For other types, return the first one (could be improved)
    return type1;
  }

  // Struct helpers (heuristic)
  private inferStructTypeNameFromVariable(varName: string): string | undefined {
    // Expect patterns like myStruct, sMyStruct, or camelCase that reference a struct named 'MyStruct'
    if (varName.startsWith('s') && varName.length > 1 && varName[1]!.toUpperCase() === varName[1]) {
      return varName.substring(1);
    }
    // Capitalize first letter as a guess
    return varName.substring(0, 1).toUpperCase() + varName.substring(1);
  }

  private lookupStructMemberType(structName: string, member: string): DataTypeEnum | undefined {
    // Without a dedicated struct symbol table, check for common vector-like members
    if (['x', 'y', 'z'].includes(member)) {
      return DataTypeEnum.FLOAT;
    }
    // Unknown
    return undefined;
  }
}
