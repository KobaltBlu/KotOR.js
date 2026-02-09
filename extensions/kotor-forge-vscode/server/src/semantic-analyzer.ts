/**
 * NWScript Semantic Analyzer
 * Provides comprehensive semantic analysis for NWScript using the AST
 */

import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { GameVersion, GameVersionDetector } from './game-version-detector';
import {
  isValidDataType,
  KOTOR_CONSTANTS,
  KOTOR_FUNCTIONS,
  NWScriptConstant,
  NWScriptFunction,
  TSL_CONSTANTS,
  TSL_FUNCTIONS
} from './kotor-definitions';
import { KotorValidator } from './kotor-validator';
import {
  AssignmentExpression,
  ASTVisitor,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ContinueStatement,
  DoWhileStatement,
  Expression,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  Literal,
  MemberExpression,
  Parameter,
  Program,
  ReturnStatement,
  SourceRange,
  StructDeclaration,
  SwitchStatement,
  UnaryExpression,
  VariableDeclaration,
  VectorLiteral,
  walkAST,
  WhileStatement
} from './nwscript-ast';
import { SyntaxValidator } from './syntax-validator';
import { TypeChecker } from './type-checker';
import { trace, debug } from './logger';

export interface SemanticError {
  message: string;
  severity: DiagnosticSeverity;
  range: SourceRange;
  code?: string;
}

export interface SymbolInfo {
  name: string;
  type: string;
  range: SourceRange;
  scope: 'global' | 'function' | 'local';
  isConstant?: boolean;
  isFunction?: boolean;
  isParameter?: boolean;
  functionInfo?: {
    returnType: string;
    parameters: Parameter[];
  };
}

export interface ScopeInfo {
  symbols: Map<string, SymbolInfo>;
  parent?: ScopeInfo;
  type: 'global' | 'function' | 'block' | 'loop' | 'switch';
  functionName?: string;
  returnType?: string;
}

export class SemanticAnalyzer implements ASTVisitor<void> {
  private errors: SemanticError[] = [];
  private currentScope: ScopeInfo;
  private globalScope: ScopeInfo;
  private inLoop: boolean = false;
  private inSwitch: boolean = false;
  private currentFunction?: FunctionDeclaration;
  private gameVersion: GameVersion = 'both';
  private structRegistry: Map<string, Map<string, string>> = new Map();

  // Include-aware function and constant resolution
  private availableFunctions: Map<string, NWScriptFunction> = new Map();
  private availableConstants: Map<string, NWScriptConstant> = new Map();

  constructor(
    scriptlibFunctions: NWScriptFunction[] = [],
    scriptlibConstants: { [key: string]: any } = {},
    gameVersion: GameVersion = 'both'
  ) {
    this.gameVersion = gameVersion;
    // Initialize global scope
    this.globalScope = {
      symbols: new Map(),
      type: 'global'
    };
    this.currentScope = this.globalScope;

    // Add built-in functions based on game version
    const baseFunctions = gameVersion === 'kotor2' ? TSL_FUNCTIONS :
                         gameVersion === 'kotor1' ? KOTOR_FUNCTIONS :
                         [...KOTOR_FUNCTIONS, ...TSL_FUNCTIONS];

    baseFunctions.forEach(func => {
      this.availableFunctions.set(func.name, func);
    });

    // Add scriptlib functions
    scriptlibFunctions.forEach(func => {
      this.availableFunctions.set(func.name, func);
    });

    // Add built-in constants based on game version
    const baseConstants = gameVersion === 'kotor2' ? TSL_CONSTANTS :
                         gameVersion === 'kotor1' ? KOTOR_CONSTANTS :
                         [...KOTOR_CONSTANTS, ...TSL_CONSTANTS];

    baseConstants.forEach(constant => {
      this.availableConstants.set(constant.name, constant);
      // Add to global scope
      this.globalScope.symbols.set(constant.name, {
        name: constant.name,
        type: constant.type,
        range: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
        scope: 'global',
        isConstant: true
      });
    });

    // Add scriptlib constants
    Object.entries(scriptlibConstants).forEach(([name, value]) => {
      const type = typeof value === 'number' ? 'int' :
                   typeof value === 'string' ? 'string' :
                   typeof value === 'boolean' ? 'int' : 'unknown';

      const constant: NWScriptConstant = {
        name,
        type,
        value,
        description: `Scriptlib constant`,
        category: 'scriptlib'
      };

      this.availableConstants.set(name, constant);
      this.globalScope.symbols.set(name, {
        name,
        type,
        range: { start: { line: 0, column: 0, offset: 0 }, end: { line: 0, column: 0, offset: 0 } },
        scope: 'global',
        isConstant: true
      });
    });
  }

  public analyze(ast: Program, sourceText?: string): SemanticError[] {
    trace('SemanticAnalyzer.analyze() entered');
    this.errors = [];
    this.currentScope = this.globalScope;

    try {
      if (sourceText) {
        const versionWarning = GameVersionDetector.generateMissingVersionWarning(sourceText);
        if (versionWarning) {
          this.errors.push(versionWarning);
        }
      }

      // First run syntax validation
      const syntaxValidator = new SyntaxValidator();
      const syntaxErrors = syntaxValidator.validate(ast);
      this.errors.push(...syntaxErrors);

      // Run type checking
      const typeChecker = new TypeChecker(
        Array.from(this.availableFunctions.values()),
        Array.from(this.availableConstants.values())
      );
      const typeErrors = typeChecker.check(ast);
      this.errors.push(...typeErrors);

      // Then run semantic analysis
      this.visitProgram(ast);

      // Additional KOTOR-specific validation
      this.validateKotorPatterns(ast);

      // Run KOTOR-specific validator with detected game version
      const kotorValidator = new KotorValidator(this.gameVersion);
      const kotorErrors = kotorValidator.validate(ast, sourceText);
      this.errors.push(...kotorErrors);

    } catch (error) {
      if (error instanceof Error) {
        this.addError({
          message: `Internal analysis error: ${error.message}`,
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 }
          }
        });
      }
    }

    debug(`SemanticAnalyzer.analyze() completed errors=${this.errors.length}`);
    return this.errors;
  }

  private addError(error: SemanticError): void {
    this.errors.push(error);
  }

  private createScope(type: ScopeInfo['type'], parent?: ScopeInfo): ScopeInfo {
    return {
      symbols: new Map(),
      parent: parent || this.currentScope,
      type
    };
  }

  private enterScope(scope: ScopeInfo): void {
    this.currentScope = scope;
  }

  private exitScope(): void {
    if (this.currentScope.parent) {
      this.currentScope = this.currentScope.parent;
    }
  }

  private lookupSymbol(name: string): SymbolInfo | undefined {
    let scope = this.currentScope;
    while (scope) {
      const symbol = scope.symbols.get(name);
      if (symbol) return symbol;
      scope = scope.parent!;
    }
    return undefined;
  }

  private addSymbol(symbol: SymbolInfo): void {
    const existing = this.currentScope.symbols.get(symbol.name);
    if (existing && !existing.isFunction) {
      this.addError({
        message: `Symbol '${symbol.name}' is already defined in this scope`,
        severity: DiagnosticSeverity.Error,
        range: symbol.range,
        code: 'duplicate-symbol'
      });
      return;
    }
    this.currentScope.symbols.set(symbol.name, symbol);
  }

  // AST Visitor Methods

  public visitProgram(node: Program): void {
    // First pass: collect all function and struct declarations
    node.body.forEach(decl => {
      if (decl instanceof FunctionDeclaration) {
        const symbol: SymbolInfo = {
          name: decl.name,
          type: decl.returnType.name,
          range: decl.range,
          scope: 'global',
          isFunction: true,
          functionInfo: {
            returnType: decl.returnType.name,
            parameters: decl.parameters
          }
        };
        this.addSymbol(symbol);
      } else if (decl instanceof StructDeclaration) {
        const members = new Map<string, string>();
        decl.members.forEach(member => {
          members.set(member.name, member.varType.name);
        });
        this.structRegistry.set(decl.name, members);
        this.globalScope.symbols.set(decl.name, {
          name: decl.name,
          type: 'struct',
          range: decl.range,
          scope: 'global'
        });
      }
    });

    // Second pass: analyze all declarations
    node.body.forEach(decl => {
      walkAST(decl, this);
    });
  }

  public visitFunctionDeclaration(node: FunctionDeclaration): void {
    this.currentFunction = node;

    // Validate return type
    if (!this.isKnownType(node.returnType.name)) {
      this.addError({
        message: `Invalid return type '${node.returnType.name}'`,
        severity: DiagnosticSeverity.Error,
        range: node.returnType.range,
        code: 'invalid-type'
      });
    }

    // Create function scope
    const functionScope = this.createScope('function');
    functionScope.functionName = node.name;
    functionScope.returnType = node.returnType.name;
    this.enterScope(functionScope);

    // Add parameters to function scope
    node.parameters.forEach(param => {
      if (!this.isKnownType(param.paramType.name)) {  // previously if (!isValidDataType(param.paramType.name)) {
        this.addError({
          message: `Invalid parameter type '${param.paramType.name}' for parameter '${param.name}'`,
          severity: DiagnosticSeverity.Error,
          range: param.paramType.range,
          code: 'invalid-type'
        });
      }

      const symbol: SymbolInfo = {
        name: param.name,
        type: param.paramType.name,
        range: param.range,
        scope: 'function',
        isParameter: true
      };
      this.addSymbol(symbol);

      // Validate default value if present
      if (param.defaultValue) {
        walkAST(param.defaultValue, this);
        const defaultType = this.getExpressionType(param.defaultValue);
        if (defaultType && !this.isTypeCompatible(defaultType, param.paramType.name)) {
          this.addError({
            message: `Default value type '${defaultType}' is not compatible with parameter type '${param.paramType.name}'`,
            severity: DiagnosticSeverity.Error,
            range: param.defaultValue.range,
            code: 'type-mismatch'
          });
        }
      }
    });

    // Analyze function body
    if (!node.isPrototype) {
      walkAST(node.body, this);
    }

    this.exitScope();
    this.currentFunction = undefined;
  }

  public visitVariableDeclaration(node: VariableDeclaration): void {
    // Validate type
    if (!this.isKnownType(node.varType.name)) {
      this.addError({
        message: `Invalid variable type '${node.varType.name}'`,
        severity: DiagnosticSeverity.Error,
        range: node.varType.range,
        code: 'invalid-type'
      });
    }

    // Add to current scope
    const symbol: SymbolInfo = {
      name: node.name,
      type: node.varType.name,
      range: node.range,
      scope: this.currentScope.type === 'global' ? 'global' : 'local',
      isConstant: node.isConstant
    };
    this.addSymbol(symbol);

    // Validate initializer
    if (node.initializer) {
      walkAST(node.initializer, this);
      const initType = this.getExpressionType(node.initializer);
      if (initType && !this.isTypeCompatible(initType, node.varType.name)) {
        this.addError({
          message: `Cannot assign value of type '${initType}' to variable of type '${node.varType.name}'`,
          severity: DiagnosticSeverity.Error,
          range: node.initializer.range,
          code: 'type-mismatch'
        });
      }
    }
  }

  public visitStructDeclaration(node: StructDeclaration): void {
    // Add struct to global scope
    const symbol: SymbolInfo = {
      name: node.name,
      type: 'struct',
      range: node.range,
      scope: 'global'
    };
    this.addSymbol(symbol);

    // Validate struct members
    node.members.forEach(member => {
      walkAST(member, this);
    });
  }

  public visitBlockStatement(node: BlockStatement): void {
    const blockScope = this.createScope('block');
    this.enterScope(blockScope);

    node.body.forEach(stmt => {
      walkAST(stmt, this);
    });

    this.exitScope();
  }

  public visitReturnStatement(node: ReturnStatement): void {
    if (!this.currentFunction) {
      this.addError({
        message: 'Return statement outside of function',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-return'
      });
      return;
    }

    const expectedType = this.currentFunction.returnType.name;

    if (node.argument) {
      walkAST(node.argument, this);
      const returnType = this.getExpressionType(node.argument);

      if (returnType && !this.isTypeCompatible(returnType, expectedType)) {
        this.addError({
          message: `Cannot return value of type '${returnType}' from function expecting '${expectedType}'`,
          severity: DiagnosticSeverity.Error,
          range: node.argument.range,
          code: 'type-mismatch'
        });
      }
    } else {
      if (expectedType !== 'void') {
        this.addError({
          message: `Function '${this.currentFunction.name}' expects return type '${expectedType}' but no value is returned`,
          severity: DiagnosticSeverity.Error,
          range: node.range,
          code: 'missing-return-value'
        });
      }
    }
  }

  public visitIfStatement(node: IfStatement): void {
    // Analyze condition
    walkAST(node.test, this);
    const conditionType = this.getExpressionType(node.test);

    if (conditionType && !this.isTypeCompatible(conditionType, 'int')) {
      this.addError({
        message: `If condition must be of type 'int', got '${conditionType}'`,
        severity: DiagnosticSeverity.Error,
        range: node.test.range,
        code: 'invalid-condition'
      });
    }

    // Analyze branches
    walkAST(node.consequent, this);
    if (node.alternate) {
      walkAST(node.alternate, this);
    }
  }

  public visitWhileStatement(node: WhileStatement): void {
    // Analyze condition
    walkAST(node.test, this);
    const conditionType = this.getExpressionType(node.test);

    if (conditionType && !this.isTypeCompatible(conditionType, 'int')) {
      this.addError({
        message: `While condition must be of type 'int', got '${conditionType}'`,
        severity: DiagnosticSeverity.Error,
        range: node.test.range,
        code: 'invalid-condition'
      });
    }

    // Analyze body in loop context
    const wasInLoop = this.inLoop;
    this.inLoop = true;
    walkAST(node.body, this);
    this.inLoop = wasInLoop;
  }

  public visitForStatement(node: ForStatement): void {
    const forScope = this.createScope('block');
    this.enterScope(forScope);

    // Analyze init
    if (node.init) {
      walkAST(node.init, this);
    }

    // Analyze test
    if (node.test) {
      walkAST(node.test, this);
      const testType = this.getExpressionType(node.test);
      if (testType && !this.isTypeCompatible(testType, 'int')) {
        this.addError({
          message: `For condition must be of type 'int', got '${testType}'`,
          severity: DiagnosticSeverity.Error,
          range: node.test.range,
          code: 'invalid-condition'
        });
      }
    }

    // Analyze update
    if (node.update) {
      walkAST(node.update, this);
    }

    // Analyze body in loop context
    const wasInLoop = this.inLoop;
    this.inLoop = true;
    walkAST(node.body, this);
    this.inLoop = wasInLoop;

    this.exitScope();
  }

  public visitDoWhileStatement(node: DoWhileStatement): void {
    // Analyze body in loop context
    const wasInLoop = this.inLoop;
    this.inLoop = true;
    walkAST(node.body, this);
    this.inLoop = wasInLoop;

    // Analyze condition
    walkAST(node.test, this);
    const conditionType = this.getExpressionType(node.test);

    if (conditionType && !this.isTypeCompatible(conditionType, 'int')) {
      this.addError({
        message: `Do-while condition must be of type 'int', got '${conditionType}'`,
        severity: DiagnosticSeverity.Error,
        range: node.test.range,
        code: 'invalid-condition'
      });
    }
  }

  public visitSwitchStatement(node: SwitchStatement): void {
    // Analyze discriminant
    walkAST(node.discriminant, this);
    const discriminantType = this.getExpressionType(node.discriminant);

    if (discriminantType && !this.isTypeCompatible(discriminantType, 'int')) {
      this.addError({
        message: `Switch discriminant must be of type 'int', got '${discriminantType}'`,
        severity: DiagnosticSeverity.Error,
        range: node.discriminant.range,
        code: 'invalid-discriminant'
      });
    }

    // Track case values to detect duplicates
    const caseValues = new Set<string>();
    let hasDefault = false;

    // Analyze cases in switch context
    const wasInSwitch = this.inSwitch;
    this.inSwitch = true;

    node.cases.forEach(caseNode => {
      // Check for duplicate case values
      if (caseNode.test) {
        const caseValueStr = this.getConstantValue(caseNode.test);
        if (caseValueStr !== undefined) {
          if (caseValues.has(caseValueStr)) {
            this.addError({
              message: `Duplicate case value '${caseValueStr}'`,
              severity: DiagnosticSeverity.Error,
              range: caseNode.test.range,
              code: 'duplicate-case'
            });
          } else {
            caseValues.add(caseValueStr);
          }
        }
      } else {
        // Default case
        if (hasDefault) {
          this.addError({
            message: 'Multiple default cases in switch statement',
            severity: DiagnosticSeverity.Error,
            range: caseNode.range,
            code: 'multiple-default'
          });
        }
        hasDefault = true;
      }

      walkAST(caseNode, this);
    });

    this.inSwitch = wasInSwitch;
  }

  public visitBreakStatement(node: BreakStatement): void {
    if (!this.inLoop && !this.inSwitch) {
      this.addError({
        message: 'Break statement outside of loop or switch',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-break'
      });
    }
  }

  public visitContinueStatement(node: ContinueStatement): void {
    if (!this.inLoop) {
      this.addError({
        message: 'Continue statement outside of loop',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-continue'
      });
    }
  }

  public visitCallExpression(node: CallExpression): void {
    if (!(node.callee instanceof Identifier)) {
      this.addError({
        message: 'Invalid function call syntax',
        severity: DiagnosticSeverity.Error,
        range: node.callee.range,
        code: 'invalid-call'
      });
      return;
    }

    const functionName = node.callee.name;

    // Check if function exists
    const builtinFunc = this.availableFunctions.get(functionName);
    const userFunc = this.lookupSymbol(functionName);

    if (!builtinFunc && (!userFunc || !userFunc.isFunction)) {
      this.addError({
        message: `Unknown function '${functionName}'`,
        severity: DiagnosticSeverity.Error,
        range: node.callee.range,  // Only highlight the function name
        code: 'unknown-function'
      });
      return;
    }

    const func = builtinFunc || userFunc;
    if (!func) return;

    // Analyze arguments
    node.arguments.forEach(arg => {
      walkAST(arg, this);
    });

    // Validate argument count and types
    if (builtinFunc) {
      this.validateBuiltinFunctionCall(node, builtinFunc);
    } else if (userFunc && userFunc.functionInfo) {
      this.validateUserFunctionCall(node, userFunc.functionInfo);
    }
  }

  public visitAssignmentExpression(node: AssignmentExpression): void {
    if (!(node.left instanceof Identifier)) {
      this.addError({
        message: 'Invalid left-hand side in assignment',
        severity: DiagnosticSeverity.Error,
        range: node.left.range,
        code: 'invalid-lhs'
      });
      return;
    }

    const variableName = node.left.name;
    const symbol = this.lookupSymbol(variableName);

    if (!symbol) {
      this.addError({
        message: `Unknown variable '${variableName}'`,
        severity: DiagnosticSeverity.Error,
        range: node.left.range,
        code: 'unknown-variable'
      });
      return;
    }

    if (symbol.isConstant) {
      this.addError({
        message: `Cannot assign to constant '${variableName}'`,
        severity: DiagnosticSeverity.Error,
        range: node.left.range,
        code: 'assign-to-constant'
      });
      return;
    }

    // Analyze right-hand side
    walkAST(node.right, this);
    const rightType = this.getExpressionType(node.right);

    if (rightType && !this.isTypeCompatible(rightType, symbol.type)) {
      this.addError({
        message: `Cannot assign value of type '${rightType}' to variable of type '${symbol.type}'`,
        severity: DiagnosticSeverity.Error,
        range: node.right.range,
        code: 'type-mismatch'
      });
    }
  }

  public visitBinaryExpression(node: BinaryExpression): void {
    walkAST(node.left, this);
    walkAST(node.right, this);

    const leftType = this.getExpressionType(node.left);
    const rightType = this.getExpressionType(node.right);

    if (leftType && rightType) {
      this.validateBinaryOperation(node.operator, leftType, rightType, node.range);
    }
  }

  public visitUnaryExpression(node: UnaryExpression): void {
    walkAST(node.argument, this);

    const argType = this.getExpressionType(node.argument);
    if (argType) {
      this.validateUnaryOperation(node.operator, argType, node.range);
    }
  }

  public visitIdentifier(node: Identifier): void {
    const symbol = this.lookupSymbol(node.name);
    if (!symbol) {
      // Only report error if it's not a function call (which is handled elsewhere)
      // This is a simple heuristic - in a full implementation, we'd need more context
      this.addError({
        message: `Unknown identifier '${node.name}'`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'unknown-identifier'
      });
    }
  }

  public visitVectorLiteral(node: VectorLiteral): void {
    walkAST(node.x, this);
    walkAST(node.y, this);
    walkAST(node.z, this);

    // Validate that all components are numeric
    const xType = this.getExpressionType(node.x);
    const yType = this.getExpressionType(node.y);
    const zType = this.getExpressionType(node.z);

    [
      { type: xType, expr: node.x, component: 'x' },
      { type: yType, expr: node.y, component: 'y' },
      { type: zType, expr: node.z, component: 'z' }
    ].forEach(({ type, expr, component }) => {
      if (type && !this.isTypeCompatible(type, 'float') && !this.isTypeCompatible(type, 'int')) {
        this.addError({
          message: `Vector ${component} component must be numeric, got '${type}'`,
          severity: DiagnosticSeverity.Error,
          range: expr.range,
          code: 'invalid-vector-component'
        });
      }
    });
  }

  // Helper methods
  private isKnownType(typeName: string): boolean {
    if (isValidDataType(typeName)) return true;
    return this.structRegistry.has(typeName);
  }

  private getExpressionType(expr: Expression): string | undefined {
    if (expr instanceof Literal) {
      if (typeof expr.value === 'number') {
        return expr.raw && expr.raw.includes('.') ? 'float' : 'int';
      } else if (typeof expr.value === 'string') {
        return 'string';
      }
    } else if (expr instanceof Identifier) {
      const symbol = this.lookupSymbol(expr.name);
      return symbol?.type;
    } else if (expr instanceof CallExpression && expr.callee instanceof Identifier) {
      const builtinFunc = this.availableFunctions.get(expr.callee.name);
      if (builtinFunc) {
        return builtinFunc.returnType;
      }

      const userFunc = this.lookupSymbol(expr.callee.name);
      if (userFunc && userFunc.functionInfo) {
        return userFunc.functionInfo.returnType;
      }
    } else if (expr instanceof VectorLiteral) {
      return 'vector';
    } else if (expr instanceof BinaryExpression) {
      return this.getBinaryExpressionType(expr);
    } else if (expr instanceof UnaryExpression) {
      return this.getUnaryExpressionType(expr);
    } else if (expr instanceof ConditionalExpression) {
      // Return type of consequent (should be same as alternate)
      return this.getExpressionType(expr.consequent);
    }

    return undefined;
  }

  private getBinaryExpressionType(expr: BinaryExpression): string | undefined {
    const leftType = this.getExpressionType(expr.left);
    const rightType = this.getExpressionType(expr.right);

    if (!leftType || !rightType) return undefined;

    switch (expr.operator) {
      case '+':
        if (leftType === 'string' || rightType === 'string') return 'string';
        if (leftType === 'float' || rightType === 'float') return 'float';
        if (leftType === 'vector' && rightType === 'vector') return 'vector';
        return 'int';

      case '-':
      case '*':
      case '/':
        if (leftType === 'float' || rightType === 'float') return 'float';
        if (leftType === 'vector' && rightType === 'vector') return 'vector';
        if (leftType === 'vector' && (rightType === 'float' || rightType === 'int')) return 'vector';
        return 'int';

      case '%':
        return 'int';

      case '==':
      case '!=':
      case '<':
      case '<=':
      case '>':
      case '>=':
      case '&&':
      case '||':
        return 'int';

      case '&':
      case '|':
      case '^':
      case '<<':
      case '>>':
        return 'int';

      default:
        return undefined;
    }
  }

  private getUnaryExpressionType(expr: UnaryExpression): string | undefined {
    const argType = this.getExpressionType(expr.argument);
    if (!argType) return undefined;

    switch (expr.operator) {
      case '-':
      case '+':
        return argType;
      case '!':
      case '~':
        return 'int';
      case '++':
      case '--':
        return argType;
      default:
        return undefined;
    }
  }

  private isTypeCompatible(sourceType: string, targetType: string): boolean {
    if (sourceType === targetType) return true;

    // Numeric compatibility (int <-> float)
    if ((sourceType === 'int' || sourceType === 'float') &&
        (targetType === 'int' || targetType === 'float')) {
      return true;
    }

    // Object compatibility - all objects are compatible with object type
    if (targetType === 'object') return true;
    // Struct compatibility
    if (this.structRegistry.has(sourceType)) {
      if (targetType === 'struct' || sourceType === targetType) return true;
    }

    // String compatibility with anything (for concatenation)
    if (targetType === 'string' && sourceType !== 'void') return true;

    // Vector component access
    if (sourceType === 'vector' && targetType === 'float') return true;

    return false;
  }

  private validateBuiltinFunctionCall(node: CallExpression, func: NWScriptFunction): void {
    const requiredParams = func.parameters.filter(p => !p.defaultValue);
    const providedArgs = node.arguments.length;

    if (providedArgs < requiredParams.length) {
      this.addError({
        message: `Function '${func.name}' requires at least ${requiredParams.length} arguments, got ${providedArgs}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'insufficient-args'
      });
      return;
    }

    if (providedArgs > func.parameters.length) {
      this.addError({
        message: `Function '${func.name}' takes at most ${func.parameters.length} arguments, got ${providedArgs}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'too-many-args'
      });
      return;
    }

    // Validate argument types
    for (let i = 0; i < Math.min(providedArgs, func.parameters.length); i++) {
      const arg = node.arguments[i];
      const param = func.parameters[i];
      if (!arg || !param) continue;

      const argType = this.getExpressionType(arg);
      if (argType && !this.isTypeCompatible(argType, param.type)) {
        this.addError({
          message: `Argument ${i + 1} to '${func.name}' should be of type '${param.type}', got '${argType}'`,
          severity: DiagnosticSeverity.Error,
          range: arg.range,
          code: 'type-mismatch'
        });
      }
    }
  }

  private validateUserFunctionCall(node: CallExpression, funcInfo: { returnType: string; parameters: Parameter[] }): void {
    const requiredParams = funcInfo.parameters.filter(p => !p.defaultValue);
    const providedArgs = node.arguments.length;

    if (providedArgs < requiredParams.length) {
      this.addError({
        message: `Function requires at least ${requiredParams.length} arguments, got ${providedArgs}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'insufficient-args'
      });
      return;
    }

    if (providedArgs > funcInfo.parameters.length) {
      this.addError({
        message: `Function takes at most ${funcInfo.parameters.length} arguments, got ${providedArgs}`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'too-many-args'
      });
      return;
    }

    // Validate argument types
    for (let i = 0; i < Math.min(providedArgs, funcInfo.parameters.length); i++) {
      const arg = node.arguments[i];
      const param = funcInfo.parameters[i];
      if (!arg || !param) continue;

      const argType = this.getExpressionType(arg);
      if (argType && !this.isTypeCompatible(argType, param.paramType.name)) {
        this.addError({
          message: `Argument ${i + 1} should be of type '${param.paramType.name}', got '${argType}'`,
          severity: DiagnosticSeverity.Error,
          range: arg.range,
          code: 'type-mismatch'
        });
      }
    }
  }

  private validateBinaryOperation(operator: string, leftType: string, rightType: string, range: SourceRange): void {
    const numericTypes = ['int', 'float'];
    const isLeftNumeric = numericTypes.includes(leftType);
    const isRightNumeric = numericTypes.includes(rightType);

    switch (operator) {
      case '+':
        if (leftType === 'string' || rightType === 'string') {
          // String concatenation - both sides should be strings or convertible
          return;
        }
        if (leftType === 'vector' && rightType === 'vector') return;
        if (!isLeftNumeric || !isRightNumeric) {
          this.addError({
            message: `Cannot apply operator '${operator}' to types '${leftType}' and '${rightType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-binary-op'
          });
        }
        break;

      case '-':
      case '*':
      case '/':
        if (leftType === 'vector' && rightType === 'vector') return;
        if (leftType === 'vector' && isRightNumeric) return;
        if (!isLeftNumeric || !isRightNumeric) {
          this.addError({
            message: `Cannot apply operator '${operator}' to types '${leftType}' and '${rightType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-binary-op'
          });
        }
        break;

      case '%':
      case '&':
      case '|':
      case '^':
      case '<<':
      case '>>':
        if (leftType !== 'int' || rightType !== 'int') {
          this.addError({
            message: `Operator '${operator}' requires integer operands, got '${leftType}' and '${rightType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-binary-op'
          });
        }
        break;

      case '<':
      case '<=':
      case '>':
      case '>=':
        if (!isLeftNumeric || !isRightNumeric) {
          this.addError({
            message: `Cannot compare types '${leftType}' and '${rightType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-comparison'
          });
        }
        break;

      case '==':
      case '!=':
        if (!this.isTypeCompatible(leftType, rightType) && !this.isTypeCompatible(rightType, leftType)) {
          this.addError({
            message: `Cannot compare incompatible types '${leftType}' and '${rightType}'`,
            severity: DiagnosticSeverity.Warning,
            range,
            code: 'incompatible-comparison'
          });
        }
        break;

      case '&&':
      case '||':
        if (!this.isTypeCompatible(leftType, 'int') || !this.isTypeCompatible(rightType, 'int')) {
          this.addError({
            message: `Logical operator '${operator}' requires boolean (int) operands`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-logical-op'
          });
        }
        break;
    }
  }

  private validateUnaryOperation(operator: string, operandType: string, range: SourceRange): void {
    const numericTypes = ['int', 'float'];
    const isNumeric = numericTypes.includes(operandType);

    switch (operator) {
      case '-':
      case '+':
        if (!isNumeric) {
          this.addError({
            message: `Cannot apply unary '${operator}' to type '${operandType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-unary-op'
          });
        }
        break;

      case '!':
        if (!this.isTypeCompatible(operandType, 'int')) {
          this.addError({
            message: `Logical NOT requires boolean (int) operand, got '${operandType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-logical-op'
          });
        }
        break;

      case '~':
        if (operandType !== 'int') {
          this.addError({
            message: `Bitwise NOT requires integer operand, got '${operandType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-bitwise-op'
          });
        }
        break;

      case '++':
      case '--':
        if (!isNumeric) {
          this.addError({
            message: `Cannot apply '${operator}' to type '${operandType}'`,
            severity: DiagnosticSeverity.Error,
            range,
            code: 'invalid-unary-op'
          });
        }
        break;
    }
  }

  private getConstantValue(expr: Expression): string | undefined {
    if (expr instanceof Literal) {
      return String(expr.value);
    } else if (expr instanceof Identifier) {
      const symbol = this.lookupSymbol(expr.name);
      if (symbol && symbol.isConstant) {
        // For now, we don't track constant values through the symbol table
        // This could be enhanced to track actual constant values
        return symbol.name;
      }

      // Check if it's a built-in constant
      const constant = this.availableConstants.get(expr.name);
      if (constant) {
        return String(constant.value);
      }
    }
    return undefined;
  }

  /**
   * Additional validation methods for advanced NWScript features
   */

  public visitMemberExpression(node: MemberExpression): void {
    walkAST(node.object, this);

    if (node.computed) {
      // Array-style access: obj[index]
      walkAST(node.property, this);
      const indexType = this.getExpressionType(node.property);
      if (indexType && !this.isTypeCompatible(indexType, 'int')) {
        this.addError({
          message: `Array index must be of type 'int', got '${indexType}'`,
          severity: DiagnosticSeverity.Error,
          range: node.property.range,
          code: 'invalid-array-index'
        });
      }
    } else {
      // Dot notation: obj.property
      const objectType = this.getExpressionType(node.object);
      if (objectType === 'vector' && node.property instanceof Identifier) {
        const validComponents = ['x', 'y', 'z'];
        if (!validComponents.includes(node.property.name)) {
          this.addError({
            message: `Invalid vector component '${node.property.name}'. Valid components are: x, y, z`,
            severity: DiagnosticSeverity.Error,
            range: node.property.range,
            code: 'invalid-vector-component'
          });
        }
      } else if (objectType && this.structRegistry.has(objectType)) {
        if (node.property instanceof Identifier) {
          const members = this.structRegistry.get(objectType);
          if (members && !members.has(node.property.name)) {
            this.addError({
              message: `Struct '${objectType}' has no member named '${node.property.name}'`,
              severity: DiagnosticSeverity.Error,
              range: node.property.range,
              code: 'unknown-struct-member'
            });
          }
        }
      } else if (objectType && objectType !== 'object') {
        this.addError({
          message: `Cannot access property on type '${objectType}'`,
          severity: DiagnosticSeverity.Error,
          range: node.property.range,
          code: 'invalid-property-access'
        });
      }
    }
  }

  public visitConditionalExpression(node: ConditionalExpression): void {
    // Analyze condition
    walkAST(node.test, this);
    const conditionType = this.getExpressionType(node.test);

    if (conditionType && !this.isTypeCompatible(conditionType, 'int')) {
      this.addError({
        message: `Conditional test must be of type 'int', got '${conditionType}'`,
        severity: DiagnosticSeverity.Error,
        range: node.test.range,
        code: 'invalid-condition'
      });
    }

    // Analyze branches
    walkAST(node.consequent, this);
    walkAST(node.alternate, this);

    // Check that both branches have compatible types
    const consequentType = this.getExpressionType(node.consequent);
    const alternateType = this.getExpressionType(node.alternate);

    if (consequentType && alternateType &&
        !this.isTypeCompatible(consequentType, alternateType) &&
        !this.isTypeCompatible(alternateType, consequentType)) {
      this.addError({
        message: `Conditional expression branches have incompatible types: '${consequentType}' and '${alternateType}'`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'incompatible-conditional-types'
      });
    }
  }

  /**
   * Validate that a function has all required code paths returning a value
   */
  private validateFunctionReturns(node: FunctionDeclaration): void {
    if (node.returnType.name === 'void') {
      return; // Void functions don't need explicit returns
    }

    // Check if all paths return a value (structured control-flow approximation)
    const hasExplicitReturn = this.hasReturnInAllPaths(node.body);
    if (!hasExplicitReturn) {
      this.addError({
        message: `Function '${node.name}' may not return a value in all code paths`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'missing-return'
      });
    }
  }

  private hasReturnInAllPaths(stmt: any): boolean {
    // Best-effort static analysis:
    // - ReturnStatement: true
    // - BlockStatement: walk sequentially; if any statement guarantees return, the block returns
    // - IfStatement: both branches must guarantee return
    // - SwitchStatement: all cases (including default) must guarantee return
    // - Loop statements: conservatively assume may not return
    if (stmt instanceof ReturnStatement) {
      return true;
    }
    if (stmt instanceof BlockStatement) {
      for (const s of stmt.body) {
        if (this.hasReturnInAllPaths(s)) return true;
      }
      return false;
    }
    if (stmt instanceof IfStatement) {
      if (!stmt.alternate) return false;
      return this.hasReturnInAllPaths(stmt.consequent) && this.hasReturnInAllPaths(stmt.alternate);
    }
    if (stmt instanceof SwitchStatement) {
      let hasDefault = false;
      if (!stmt.cases || stmt.cases.length === 0) return false;
      for (const c of stmt.cases) {
        if (!c.test) hasDefault = true;
        // Case returns if any of its consequent statements returns
        const caseReturns = c.consequent?.some((cs: any) => this.hasReturnInAllPaths(cs)) || false;
        if (!caseReturns) return false;
      }
      // Require a default case to be confident
      return hasDefault;
    }
    // While/For/DoWhile: not guaranteed at compile time
    if (stmt instanceof WhileStatement || stmt instanceof ForStatement || stmt instanceof DoWhileStatement) {
      return false;
    }
    return false;
  }


  /**
   * Additional validation for KOTOR-specific patterns
   */
  private validateKotorPatterns(ast: Program): void {
    // Check for common KOTOR scripting patterns and validate them
    ast.body.forEach(decl => {
      if (decl instanceof FunctionDeclaration) {
        // Validate entry points
        if (decl.name === 'main' || decl.name === 'StartingConditional') {
          this.validateEntryPoint(decl);
        }

        // Validate return paths
        this.validateFunctionReturns(decl);
      }
    });
  }

  private validateEntryPoint(func: FunctionDeclaration): void {
    if (func.name === 'main') {
      if (func.returnType.name !== 'void') {
        this.addError({
          message: 'Main function must return void',
          severity: DiagnosticSeverity.Error,
          range: func.returnType.range,
          code: 'invalid-main-return'
        });
      }

      if (func.parameters.length > 0) {
        this.addError({
          message: 'Main function should not have parameters',
          severity: DiagnosticSeverity.Warning,
          range: func.range,
          code: 'main-with-params'
        });
      }
    } else if (func.name === 'StartingConditional') {
      if (func.returnType.name !== 'int') {
        this.addError({
          message: 'StartingConditional function must return int',
          severity: DiagnosticSeverity.Error,
          range: func.returnType.range,
          code: 'invalid-conditional-return'
        });
      }
    }
  }
}

/**
 * Convert semantic errors to LSP diagnostics
 */
export function semanticErrorsToDiagnostics(errors: SemanticError[]): Diagnostic[] {
  return errors.map(error => ({
    severity: error.severity,
    range: {
      start: { line: error.range.start.line, character: error.range.start.column },
      end: { line: error.range.end.line, character: error.range.end.column }
    },
    message: error.message,
    source: 'Forge-KotOR.js',
    code: error.code
  }));
}
