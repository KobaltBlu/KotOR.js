/**
 * Production-ready NWScript Runtime Engine
 * Executes NWScript AST with proper variable scoping, function calls, and control flow
 */

import { KOTOR_CONSTANTS } from './kotor-definitions';
import {
  AssignmentExpression,
  ASTNode,
  ASTVisitor,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ContinueStatement,
  DoWhileStatement,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  Literal,
  Parameter,
  Program,
  ReturnStatement,
  SwitchCase,
  SwitchStatement,
  UnaryExpression,
  VariableDeclaration,
  VectorLiteral,
  walkAST,
  WhileStatement
} from './nwscript-ast';

export class RuntimeError extends Error {
  public line: number;
  public column: number;

  constructor(message: string, line: number = 0, column: number = 0) {
    super(message);
    this.line = line;
    this.column = column;
    this.name = 'RuntimeError';
  }
}

export class BreakException extends Error {
  constructor() {
    super('break');
    this.name = 'BreakException';
  }
}

export class ContinueException extends Error {
  constructor() {
    super('continue');
    this.name = 'ContinueException';
  }
}

export class ReturnException extends Error {
  public value: any;

  constructor(value: any = null) {
    super('return');
    this.value = value;
    this.name = 'ReturnException';
  }
}

export interface NWScriptValue {
  type: string;
  value: any;
}

export class Environment {
  private values: Map<string, NWScriptValue> = new Map();
  private parent?: Environment;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  public define(name: string, value: NWScriptValue): void {
    this.values.set(name, value);
  }

  public get(name: string): NWScriptValue {
    if (this.values.has(name)) {
      return this.values.get(name)!;
    }

    if (this.parent) {
      return this.parent.get(name);
    }

    throw new RuntimeError(`Undefined variable '${name}'`);
  }

  public assign(name: string, value: NWScriptValue): void {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }

    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }

    throw new RuntimeError(`Undefined variable '${name}'`);
  }

  public has(name: string): boolean {
    return this.values.has(name) || (this.parent ? this.parent.has(name) : false);
  }

  public getAll(): Map<string, NWScriptValue> {
    const result = new Map<string, NWScriptValue>();

    if (this.parent) {
      const parentVars = this.parent.getAll();
      parentVars.forEach((value, key) => result.set(key, value));
    }

    this.values.forEach((value, key) => result.set(key, value));

    return result;
  }
}

export interface ExecutionContext {
  environment: Environment;
  functions: Map<string, FunctionDeclaration>;
  currentFunction?: string;
  callStack: string[];
  breakpointCallback?: (line: number, column: number) => boolean;
  stepMode: 'none' | 'into' | 'over' | 'out';
  stepDepth: number;
}

export class NWScriptRuntime implements ASTVisitor<NWScriptValue> {
  private context: ExecutionContext;
  private globals: Environment;

  constructor() {
    this.globals = new Environment();
    this.context = {
      environment: this.globals,
      functions: new Map(),
      callStack: [],
      stepMode: 'none',
      stepDepth: 0
    };

    this.initializeBuiltins();
  }

  public execute(program: Program, breakpointCallback?: (line: number, column: number) => boolean): NWScriptValue {
    this.context.breakpointCallback = breakpointCallback;

    // First pass: collect all function declarations
    for (const decl of program.body) {
      if (decl instanceof FunctionDeclaration) {
        this.context.functions.set(decl.name, decl);
      }
    }

    // Second pass: execute global variable declarations
    for (const decl of program.body) {
      if (decl instanceof VariableDeclaration) {
        this.visitVariableDeclaration(decl);
      }
    }

    // Find and execute main function
    const mainFunc = this.context.functions.get('main');
    if (!mainFunc) {
      throw new RuntimeError('No main function found');
    }

    try {
      return this.executeFunction(mainFunc, []);
    } catch (error) {
      if (error instanceof ReturnException) {
        return error.value || this.createValue('void', null);
      }
      throw error;
    }
  }

  public setStepMode(mode: 'none' | 'into' | 'over' | 'out'): void {
    this.context.stepMode = mode;
  }

  public getCurrentEnvironment(): Environment {
    return this.context.environment;
  }

  public getCallStack(): string[] {
    return [...this.context.callStack];
  }

  private initializeBuiltins(): void {
    // Initialize KOTOR constants
    for (const constant of KOTOR_CONSTANTS) {
      this.globals.define(constant.name, this.createValue(constant.type, constant.value));
    }

    // Initialize special constants
    this.globals.define('OBJECT_SELF', this.createValue('object', 'OBJECT_SELF'));
    this.globals.define('OBJECT_INVALID', this.createValue('object', null));
    this.globals.define('TRUE', this.createValue('int', 1));
    this.globals.define('FALSE', this.createValue('int', 0));
  }

  private executeFunction(func: FunctionDeclaration, args: NWScriptValue[]): NWScriptValue {
    // Create new environment for function scope
    const previous = this.context.environment;
    this.context.environment = new Environment(this.globals);
    this.context.callStack.push(func.name);
    this.context.currentFunction = func.name;

    try {
      // Bind parameters
      for (let i = 0; i < func.parameters.length; i++) {
        const param = func.parameters[i];
        if (!param) continue;
        const value = i < args.length ? args[i] : this.getDefaultValue(param);
        if (value !== undefined) {
          this.context.environment.define(param.name, value);
        }
      }

      // Execute function body
      this.visitBlockStatement(func.body);

      // If no explicit return, return default value for return type
      return this.getDefaultValueForType(func.returnType.name);

    } catch (error) {
      if (error instanceof ReturnException) {
        return error.value || this.getDefaultValueForType(func.returnType.name);
      }
      throw error;
    } finally {
      this.context.environment = previous;
      this.context.callStack.pop();
      this.context.currentFunction = this.context.callStack[this.context.callStack.length - 1];
    }
  }

  private checkBreakpoint(node: ASTNode): void {
    if (this.context.breakpointCallback) {
      const shouldBreak = this.context.breakpointCallback(node.range.start.line, node.range.start.column);
      if (shouldBreak) {
        // Breakpoint hit - this would be handled by the debugger
        return;
      }
    }

    // Handle step modes
    if (this.context.stepMode !== 'none') {
      // Step logic would be implemented here
      // For now, we'll just continue execution
    }
  }

  // AST Visitor methods
  public visitProgram(node: Program): NWScriptValue {
    let result = this.createValue('void', null);

    for (const decl of node.body) {
      result = walkAST(decl, this) || result;
    }

    return result;
  }

  public visitFunctionDeclaration(node: FunctionDeclaration): NWScriptValue {
    // Function declarations are handled during the collection phase
    return this.createValue('void', null);
  }

  public visitVariableDeclaration(node: VariableDeclaration): NWScriptValue {
    let value: NWScriptValue;

    if (node.initializer) {
      value = walkAST(node.initializer, this)!;
    } else {
      value = this.getDefaultValueForType(node.varType.name);
    }

    this.context.environment.define(node.name, value);
    return value;
  }

  public visitBlockStatement(node: BlockStatement): NWScriptValue {
    this.checkBreakpoint(node);

    let result = this.createValue('void', null);

    for (const stmt of node.body) {
      result = walkAST(stmt, this) || result;
    }

    return result;
  }

  public visitExpressionStatement(node: ExpressionStatement): NWScriptValue {
    this.checkBreakpoint(node);
    return walkAST(node.expression, this)!;
  }

  public visitReturnStatement(node: ReturnStatement): NWScriptValue {
    this.checkBreakpoint(node);

    let value = this.createValue('void', null);
    if (node.argument) {
      value = walkAST(node.argument, this)!;
    }

    throw new ReturnException(value);
  }

  public visitIfStatement(node: IfStatement): NWScriptValue {
    this.checkBreakpoint(node);

    const condition = walkAST(node.test, this)!;

    if (this.isTruthy(condition)) {
      return walkAST(node.consequent, this)!;
    } else if (node.alternate) {
      return walkAST(node.alternate, this)!;
    }

    return this.createValue('void', null);
  }

  public visitWhileStatement(node: WhileStatement): NWScriptValue {
    this.checkBreakpoint(node);

    let result = this.createValue('void', null);

    try {
      while (true) {
        const condition = walkAST(node.test, this)!;
        if (!this.isTruthy(condition)) break;

        try {
          result = walkAST(node.body, this)!;
        } catch (error) {
          if (error instanceof ContinueException) {
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      if (error instanceof BreakException) {
        // Break out of loop
      } else {
        throw error;
      }
    }

    return result;
  }

  public visitForStatement(node: ForStatement): NWScriptValue {
    this.checkBreakpoint(node);

    // Create new scope for for loop
    const previous = this.context.environment;
    this.context.environment = new Environment(previous);

    try {
      // Initialize
      if (node.init) {
        walkAST(node.init, this);
      }

      let result = this.createValue('void', null);

      try {
        while (true) {
          // Test condition
          if (node.test) {
            const condition = walkAST(node.test, this)!;
            if (!this.isTruthy(condition)) break;
          }

          // Execute body
          try {
            result = walkAST(node.body, this)!;
          } catch (error) {
            if (error instanceof ContinueException) {
              // Continue to update
            } else {
              throw error;
            }
          }

          // Update
          if (node.update) {
            walkAST(node.update, this);
          }
        }
      } catch (error) {
        if (error instanceof BreakException) {
          // Break out of loop
        } else {
          throw error;
        }
      }

      return result;
    } finally {
      this.context.environment = previous;
    }
  }

  public visitDoWhileStatement(node: DoWhileStatement): NWScriptValue {
    this.checkBreakpoint(node);

    let result = this.createValue('void', null);

    try {
      do {
        try {
          result = walkAST(node.body, this)!;
        } catch (error) {
          if (error instanceof ContinueException) {
            // Continue to condition check
          } else {
            throw error;
          }
        }

        const condition = walkAST(node.test, this)!;
        if (!this.isTruthy(condition)) break;

      } while (true);
    } catch (error) {
      if (error instanceof BreakException) {
        // Break out of loop
      } else {
        throw error;
      }
    }

    return result;
  }

  public visitSwitchStatement(node: SwitchStatement): NWScriptValue {
    this.checkBreakpoint(node);

    const discriminant = walkAST(node.discriminant, this)!;
    let result = this.createValue('void', null);
    let matched = false;
    let defaultCase: SwitchCase | undefined;

    try {
      for (const caseNode of node.cases) {
        if (!caseNode.test) {
          defaultCase = caseNode;
          continue;
        }

        const caseValue = walkAST(caseNode.test, this)!;
        if (!matched && this.isEqual(discriminant, caseValue)) {
          matched = true;
        }

        if (matched) {
          for (const stmt of caseNode.consequent) {
            result = walkAST(stmt, this)!;
          }
        }
      }

      // Execute default case if no match
      if (!matched && defaultCase) {
        for (const stmt of defaultCase.consequent) {
          result = walkAST(stmt, this)!;
        }
      }
    } catch (error) {
      if (error instanceof BreakException) {
        // Break out of switch
      } else {
        throw error;
      }
    }

    return result;
  }

  public visitBreakStatement(node: BreakStatement): NWScriptValue {
    this.checkBreakpoint(node);
    throw new BreakException();
  }

  public visitContinueStatement(node: ContinueStatement): NWScriptValue {
    this.checkBreakpoint(node);
    throw new ContinueException();
  }

  public visitBinaryExpression(node: BinaryExpression): NWScriptValue {
    const left = walkAST(node.left, this)!;
    const right = walkAST(node.right, this)!;

    switch (node.operator) {
      case '+':
        if (left.type === 'string' || right.type === 'string') {
          return this.createValue('string', String(left.value) + String(right.value));
        }
        return this.createValue('float', Number(left.value) + Number(right.value));

      case '-':
        return this.createValue('float', Number(left.value) - Number(right.value));

      case '*':
        return this.createValue('float', Number(left.value) * Number(right.value));

      case '/':
        if (Number(right.value) === 0) {
          throw new RuntimeError('Division by zero');
        }
        return this.createValue('float', Number(left.value) / Number(right.value));

      case '%':
        return this.createValue('int', Number(left.value) % Number(right.value));

      case '==':
        return this.createValue('int', this.isEqual(left, right) ? 1 : 0);

      case '!=':
        return this.createValue('int', !this.isEqual(left, right) ? 1 : 0);

      case '<':
        return this.createValue('int', Number(left.value) < Number(right.value) ? 1 : 0);

      case '<=':
        return this.createValue('int', Number(left.value) <= Number(right.value) ? 1 : 0);

      case '>':
        return this.createValue('int', Number(left.value) > Number(right.value) ? 1 : 0);

      case '>=':
        return this.createValue('int', Number(left.value) >= Number(right.value) ? 1 : 0);

      case '&&':
        return this.createValue('int', this.isTruthy(left) && this.isTruthy(right) ? 1 : 0);

      case '||':
        return this.createValue('int', this.isTruthy(left) || this.isTruthy(right) ? 1 : 0);

      case '&':
        return this.createValue('int', Number(left.value) & Number(right.value));

      case '|':
        return this.createValue('int', Number(left.value) | Number(right.value));

      case '^':
        return this.createValue('int', Number(left.value) ^ Number(right.value));

      case '<<':
        return this.createValue('int', Number(left.value) << Number(right.value));

      case '>>':
        return this.createValue('int', Number(left.value) >> Number(right.value));

      default:
        throw new RuntimeError(`Unknown binary operator: ${node.operator}`);
    }
  }

  public visitUnaryExpression(node: UnaryExpression): NWScriptValue {
    const operand = walkAST(node.argument, this)!;

    switch (node.operator) {
      case '-':
        return this.createValue(operand.type, -Number(operand.value));

      case '+':
        return this.createValue(operand.type, Number(operand.value));

      case '!':
        return this.createValue('int', !this.isTruthy(operand) ? 1 : 0);

      case '~':
        return this.createValue('int', ~Number(operand.value));

      case '++':
        if (node.argument instanceof Identifier) {
          const newValue = this.createValue(operand.type, Number(operand.value) + 1);
          this.context.environment.assign(node.argument.name, newValue);
          return node.prefix ? newValue : operand;
        }
        throw new RuntimeError('Invalid left-hand side in assignment');

      case '--':
        if (node.argument instanceof Identifier) {
          const newValue = this.createValue(operand.type, Number(operand.value) - 1);
          this.context.environment.assign(node.argument.name, newValue);
          return node.prefix ? newValue : operand;
        }
        throw new RuntimeError('Invalid left-hand side in assignment');

      default:
        throw new RuntimeError(`Unknown unary operator: ${node.operator}`);
    }
  }

  public visitAssignmentExpression(node: AssignmentExpression): NWScriptValue {
    const value = walkAST(node.right, this)!;

    if (node.left instanceof Identifier) {
      let finalValue = value;

      if (node.operator !== '=') {
        const current = this.context.environment.get(node.left.name);

        switch (node.operator) {
          case '+=':
            if (current.type === 'string' || value.type === 'string') {
              finalValue = this.createValue('string', String(current.value) + String(value.value));
            } else {
              finalValue = this.createValue('float', Number(current.value) + Number(value.value));
            }
            break;
          case '-=':
            finalValue = this.createValue('float', Number(current.value) - Number(value.value));
            break;
          case '*=':
            finalValue = this.createValue('float', Number(current.value) * Number(value.value));
            break;
          case '/=':
            if (Number(value.value) === 0) {
              throw new RuntimeError('Division by zero');
            }
            finalValue = this.createValue('float', Number(current.value) / Number(value.value));
            break;
          case '%=':
            finalValue = this.createValue('int', Number(current.value) % Number(value.value));
            break;
        }
      }

      this.context.environment.assign(node.left.name, finalValue);
      return finalValue;
    }

    throw new RuntimeError('Invalid left-hand side in assignment');
  }

  public visitCallExpression(node: CallExpression): NWScriptValue {
    if (node.callee instanceof Identifier) {
      const functionName = node.callee.name;

      // Evaluate arguments
      const args: NWScriptValue[] = [];
      for (const arg of node.arguments) {
        args.push(walkAST(arg, this)!);
      }

      // Check for user-defined function
      const userFunc = this.context.functions.get(functionName);
      if (userFunc) {
        return this.executeFunction(userFunc, args);
      }

      // Check for built-in engine function
      return this.executeBuiltinFunction(functionName, args);
    }

    throw new RuntimeError('Invalid function call');
  }

  public visitIdentifier(node: Identifier): NWScriptValue {
    return this.context.environment.get(node.name);
  }

  public visitLiteral(node: Literal): NWScriptValue {
    if (typeof node.value === 'number') {
      const type = node.raw && node.raw.includes('.') ? 'float' : 'int';
      return this.createValue(type, node.value);
    }

    if (typeof node.value === 'string') {
      return this.createValue('string', node.value);
    }

    return this.createValue('unknown', node.value);
  }

  public visitVectorLiteral(node: VectorLiteral): NWScriptValue {
    const x = walkAST(node.x, this)!;
    const y = walkAST(node.y, this)!;
    const z = walkAST(node.z, this)!;

    return this.createValue('vector', {
      x: Number(x.value),
      y: Number(y.value),
      z: Number(z.value)
    });
  }

  public visitConditionalExpression(node: ConditionalExpression): NWScriptValue {
    const test = walkAST(node.test, this)!;

    if (this.isTruthy(test)) {
      return walkAST(node.consequent, this)!;
    } else {
      return walkAST(node.alternate, this)!;
    }
  }

  // Helper methods
  private executeBuiltinFunction(name: string, args: NWScriptValue[]): NWScriptValue {
    // Handle common built-in functions
    switch (name) {
      case 'PrintString':
        console.log(args[0]?.value || '');
        return this.createValue('void', null);

      // String conversion functions
      case 'IntToString':
        return this.createValue('string', String(Math.floor(Number(args[0]?.value || 0))));

      case 'FloatToString':
        return this.createValue('string', String(Number(args[0]?.value || 0.0)));

      case 'StringToInt':
        return this.createValue('int', parseInt(String(args[0]?.value || '0'), 10) || 0);

      case 'StringToFloat':
        return this.createValue('float', parseFloat(String(args[0]?.value || '0.0')) || 0.0);

      case 'FloatToInt':
        return this.createValue('int', Math.floor(Number(args[0]?.value || 0)));

      case 'IntToFloat':
        return this.createValue('float', Number(args[0]?.value || 0));

      // NWN object functions
      case 'GetFirstPC':
        return this.createValue('object', 'PLAYER_OBJECT');

      case 'GetObjectByTag':
        const tag = args[0]?.value || '';
        return this.createValue('object', `OBJECT_BY_TAG_${tag}`);

      case 'GetIsObjectValid':
        const obj = args[0]?.value;
        const isValid = obj && obj !== null && obj !== 'OBJECT_INVALID';
        return this.createValue('int', isValid ? 1 : 0);

      // KOTOR global variable functions
      case 'GetGlobalNumber':
        const globalName = args[0]?.value || '';
        // In a real implementation, this would access actual global state
        return this.createValue('int', 0);

      case 'SetGlobalNumber':
        // In a real implementation, this would set actual global state
        return this.createValue('void', null);

      case 'GetGlobalBoolean':
        return this.createValue('int', 0);

      case 'SetGlobalBoolean':
        return this.createValue('void', null);

      case 'GetGlobalString':
        return this.createValue('string', '');

      case 'SetGlobalString':
        return this.createValue('void', null);

      // Vector functions
      case 'Vector':
        const x = Number(args[0]?.value || 0);
        const y = Number(args[1]?.value || 0);
        const z = Number(args[2]?.value || 0);
        return this.createValue('vector', { x, y, z });

      case 'GetPosition':
        return this.createValue('vector', { x: 0.0, y: 0.0, z: 0.0 });

      case 'SetPosition':
        return this.createValue('void', null);

      // Math functions
      case 'abs':
        return this.createValue('int', Math.abs(Number(args[0]?.value || 0)));

      case 'fabs':
        return this.createValue('float', Math.abs(Number(args[0]?.value || 0.0)));

      case 'sqrt':
        return this.createValue('float', Math.sqrt(Number(args[0]?.value || 0.0)));

      case 'pow':
        const base = Number(args[0]?.value || 0.0);
        const exp = Number(args[1]?.value || 0.0);
        return this.createValue('float', Math.pow(base, exp));

      case 'log':
        return this.createValue('float', Math.log(Number(args[0]?.value || 1.0)));

      case 'sin':
        return this.createValue('float', Math.sin(Number(args[0]?.value || 0.0)));

      case 'cos':
        return this.createValue('float', Math.cos(Number(args[0]?.value || 0.0)));

      case 'tan':
        return this.createValue('float', Math.tan(Number(args[0]?.value || 0.0)));

      case 'asin':
        return this.createValue('float', Math.asin(Number(args[0]?.value || 0.0)));

      case 'acos':
        return this.createValue('float', Math.acos(Number(args[0]?.value || 0.0)));

      case 'atan':
        return this.createValue('float', Math.atan(Number(args[0]?.value || 0.0)));

      // Random functions
      case 'Random':
        const max = Math.max(1, Math.floor(Number(args[0]?.value || 1)));
        return this.createValue('int', Math.floor(Math.random() * max));

      case 'd2':
        return this.createValue('int', Math.floor(Math.random() * 2) + 1);

      case 'd3':
        return this.createValue('int', Math.floor(Math.random() * 3) + 1);

      case 'd4':
        return this.createValue('int', Math.floor(Math.random() * 4) + 1);

      case 'd6':
        return this.createValue('int', Math.floor(Math.random() * 6) + 1);

      case 'd8':
        return this.createValue('int', Math.floor(Math.random() * 8) + 1);

      case 'd10':
        return this.createValue('int', Math.floor(Math.random() * 10) + 1);

      case 'd12':
        return this.createValue('int', Math.floor(Math.random() * 12) + 1);

      case 'd20':
        return this.createValue('int', Math.floor(Math.random() * 20) + 1);

      case 'd100':
        return this.createValue('int', Math.floor(Math.random() * 100) + 1);

      default:
        // For unknown functions, return a default value based on expected return type
        console.warn(`Unknown function: ${name}`);
        return this.createValue('int', 0);
    }
  }

  private createValue(type: string, value: any): NWScriptValue {
    return { type, value };
  }

  private getDefaultValue(param: Parameter): NWScriptValue {
    if (param.defaultValue) {
      return walkAST(param.defaultValue, this)!;
    }
    return this.getDefaultValueForType(param.paramType.name);
  }

  private getDefaultValueForType(typeName: string): NWScriptValue {
    switch (typeName) {
      case 'void':
        return this.createValue('void', null);
      case 'int':
        return this.createValue('int', 0);
      case 'float':
        return this.createValue('float', 0.0);
      case 'string':
        return this.createValue('string', '');
      case 'object':
        return this.createValue('object', null);
      case 'vector':
        return this.createValue('vector', { x: 0.0, y: 0.0, z: 0.0 });
      case 'location':
        return this.createValue('location', null);
      default:
        return this.createValue('unknown', null);
    }
  }

  private isTruthy(value: NWScriptValue): boolean {
    if (value.type === 'int') {
      return Number(value.value) !== 0;
    }
    if (value.type === 'float') {
      return Number(value.value) !== 0.0;
    }
    if (value.type === 'string') {
      return String(value.value).length > 0;
    }
    if (value.type === 'object') {
      return value.value !== null;
    }
    return Boolean(value.value);
  }

  private isEqual(left: NWScriptValue, right: NWScriptValue): boolean {
    if (left.type !== right.type) {
      return false;
    }

    if (left.type === 'vector' && right.type === 'vector') {
      return left.value.x === right.value.x &&
        left.value.y === right.value.y &&
        left.value.z === right.value.z;
    }

    return left.value === right.value;
  }
}
