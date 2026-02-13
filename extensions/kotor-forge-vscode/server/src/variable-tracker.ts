import { Position } from 'vscode-languageserver';

import { trace } from './logger';

// Scope types for tracking variables in different contexts
export enum ScopeType {
  Global,
  Function,
  Block,
  Loop,
  Conditional
}

// Types of values we can track
export type ValueType = 'int' | 'float' | 'string' | 'object' | 'unknown';

// Represents a value that we've inferred
export interface InferredValue {
  type: ValueType;
  value: number | string | null;
  isKnown: boolean;
  // For conditional values
  conditions?: {
    condition: string;
    value: InferredValue;
  }[];
}

// Represents a scope for variable tracking
export interface Scope {
  type: ScopeType;
  parent: Scope | null;
  variables: Map<string, TrackedVariable>;
  children: Scope[];
  startLine: number;
  endLine: number | null; // null for open scopes
  condition?: string; // For conditional scopes
}

// Represents a variable we're tracking
export interface TrackedVariable {
  name: string;
  type: ValueType;
  declarations: VariableDeclaration[];
  assignments: VariableAssignment[];
  scope: Scope;
}

// Represents a variable declaration
export interface VariableDeclaration {
  position: Position;
  type: ValueType;
  initialValue: InferredValue | null;
}

// Represents a variable assignment
export interface VariableAssignment {
  position: Position;
  value: InferredValue;
  // Conditions under which this assignment applies (gathered from scope chain)
  conditions?: string[];
  // Whether this assignment occurs inside a loop scope
  insideLoop?: boolean;
}

// Represents a function definition
export interface FunctionDefinition {
  name: string;
  parameters: { name: string; type: ValueType }[];
  returnType: ValueType;
  startLine: number;
  endLine: number | null;
  body: string[];
  // Collected return expressions within the function
  returnExpressions: string[];
  // If function is simple and has a single return expression composed of params and literals
  simpleReturnExpression?: string;
}

// Tracks variables and their values throughout a document
export class VariableTracker {
  private globalScope!: Scope;
  private currentScope!: Scope;
  private scopes: Scope[] = [];
  private functions: Map<string, FunctionDefinition> = new Map();
  private scopeStack: Scope[] = [];

  constructor() {
    this.reset();
  }

  // Reset the tracker
  public reset(): void {
    // Create global scope
    this.globalScope = {
      type: ScopeType.Global,
      parent: null,
      variables: new Map(),
      children: [],
      startLine: 0,
      endLine: null
    };
    this.currentScope = this.globalScope;
    this.scopes = [this.globalScope];
    this.functions.clear();
    this.scopeStack = [this.globalScope];
  }

  // Create a new scope
  public createScope(type: ScopeType, startLine: number, condition?: string): Scope {
    const scope: Scope = {
      type,
      parent: this.currentScope,
      variables: new Map(),
      children: [],
      startLine,
      endLine: null,
      condition
    };

    this.currentScope.children.push(scope);
    this.scopes.push(scope);
    this.scopeStack.push(scope);
    this.currentScope = scope;

    return scope;
  }

  // Close the current scope
  public closeScope(endLine: number): Scope | null {
    if (this.scopeStack.length <= 1) {
      // Don't close global scope
      return null;
    }

    const closedScope = this.scopeStack.pop()!;
    closedScope.endLine = endLine;
    this.currentScope = this.scopeStack[this.scopeStack.length - 1] || this.globalScope;

    return closedScope;
  }

  // Find the scope that contains a given line
  public findScopeAtLine(line: number): Scope {
    // Start with innermost scopes and work outward
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const scope = this.scopes[i];
      if (scope && scope.startLine <= line && (scope.endLine === null || scope.endLine >= line)) {
        return scope;
      }
    }

    // Default to global scope
    return this.globalScope;
  }

  // Find variable in scope hierarchy
  public findVariableInScope(name: string, scope: Scope): TrackedVariable | null {
    // Check current scope
    if (scope.variables.has(name)) {
      return scope.variables.get(name)!;
    }

    // Check parent scopes
    if (scope.parent) {
      return this.findVariableInScope(name, scope.parent);
    }

    return null;
  }

  // Register a variable declaration
  public declareVariable(
    name: string,
    type: ValueType,
    position: Position,
    initialValue: InferredValue | null = null
  ): void {
    const declaration: VariableDeclaration = {
      position,
      type,
      initialValue
    };

    // Find the appropriate scope for this line
    const scope = this.findScopeAtLine(position.line);

    if (scope.variables.has(name)) {
      // Variable already exists in this scope, add another declaration
      const variable = scope.variables.get(name)!;
      variable.declarations.push(declaration);
      if (initialValue && initialValue.isKnown) {
        this.assignVariable(name, position, initialValue);
      }
    } else {
      // New variable
      const variable: TrackedVariable = {
        name,
        type,
        declarations: [declaration],
        assignments: [],
        scope
      };
      scope.variables.set(name, variable);

      if (initialValue && initialValue.isKnown) {
        this.assignVariable(name, position, initialValue);
      }
    }
  }

  // Register a variable assignment
  public assignVariable(
    name: string,
    position: Position,
    value: InferredValue
  ): void {
    const assignment: VariableAssignment = {
      position,
      value,
      conditions: this.collectActiveConditions(position.line),
      insideLoop: this.isInsideLoop(position.line)
    };

    // Find scope for this position
    const scope = this.findScopeAtLine(position.line);

    // Look for variable in current scope and parent scopes
    const variable = this.findVariableInScope(name, scope);

    if (variable) {
      variable.assignments.push(assignment);
    } else {
      // Assignment to undeclared variable - create with unknown type
      this.declareVariable(name, 'unknown', position, value);
    }
  }

  // Get the value of a variable at a specific position
  public getValueAtPosition(name: string, position: Position): InferredValue | null {
    // Find the scope for this position
    const scope = this.findScopeAtLine(position.line);

    // Find the variable in the scope hierarchy
    const variable = this.findVariableInScope(name, scope);

    if (!variable) {
      return null;
    }

    // Gather all assignments up to this position
    const candidates = variable.assignments.filter(a =>
      a.position.line < position.line ||
      (a.position.line === position.line && a.position.character < position.character)
    );

    if (candidates.length > 0) {
      // If any assignment occurs inside a loop before this position, value may vary across iterations
      if (candidates.some(a => a.insideLoop)) {
        return { type: variable.type, value: null, isKnown: false };
      }

      // Group by condition signature
      const byCondition = new Map<string, InferredValue>();
      const order: string[] = [];
      for (const a of candidates) {
        const key = (a.conditions || []).join(' && ');
        if (!byCondition.has(key)) order.push(key);
        byCondition.set(key, a.value);
      }

      if (byCondition.size === 1) {
        // Single unconditional or single-branch value
        const onlyKey = order[0] || '';
        const v = byCondition.get(onlyKey)!;
        if (!onlyKey) return v;
        // If conditional but single branch observed, return conditional wrapper
        return {
          type: v.type,
          value: null,
          isKnown: false,
          conditions: [{ condition: onlyKey, value: v }]
        };
      }

      // Multiple conditional branches observed – build conditional value
      const conditions: { condition: string; value: InferredValue }[] = [];
      for (const key of order) {
        const v = byCondition.get(key)!;
        conditions.push({ condition: key || 'true', value: v });
      }
      return { type: variable.type, value: null, isKnown: false, conditions };
    }

    // If no assignment, check for initial value in declaration
    const declaration = variable.declarations.find(d =>
      d.initialValue && d.initialValue.isKnown &&
      (d.position.line < position.line ||
        (d.position.line === position.line &&
          d.position.character < position.character))
    );

    return declaration?.initialValue || null;
  }

  // Register a function definition
  public registerFunction(
    name: string,
    parameters: { name: string; type: ValueType }[],
    returnType: ValueType,
    startLine: number
  ): FunctionDefinition {
    const func: FunctionDefinition = {
      name,
      parameters,
      returnType,
      startLine,
      endLine: null,
      body: [],
      returnExpressions: []
    };

    this.functions.set(name, func);

    // Create a new function scope
    this.createScope(ScopeType.Function, startLine);

    // Add parameters to the function scope
    parameters.forEach(param => {
      this.declareVariable(
        param.name,
        param.type,
        { line: startLine, character: 0 },
        null
      );
    });

    return func;
  }

  // Close a function definition
  public closeFunction(name: string, endLine: number): void {
    const func = this.functions.get(name);
    if (func) {
      func.endLine = endLine;
      // If a function has exactly one return expression, mark it as simple
      if (Array.isArray((func as any).returnExpressions) && (func as any).returnExpressions.length === 1) {
        (func as any).simpleReturnExpression = (func as any).returnExpressions[0];
      }
    }

    this.closeScope(endLine);
  }

  // Parse a document and extract variable information
  public parseDocument(text: string): void {
    trace('VariableTracker.parseDocument() entered');
    this.reset();
    const lines = text.split('\n');

    // First pass: identify functions and control structures
    this.identifyStructures(lines);

    // Second pass: process declarations and assignments
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const currentLine = lines[lineIndex];
      if (!currentLine) continue;

      const line = currentLine.trim();

      // Skip comments and empty lines
      if (line === '' || line.startsWith('//')) {
        continue;
      }

      // Process variable declarations
      this.processDeclarations(line, lineIndex);

      // Process assignments
      this.processAssignments(line, lineIndex);

      // Process function calls
      this.processFunctionCalls(line, lineIndex);
    }
  }

  // Identify functions and control structures to build scope tree
  private identifyStructures(lines: string[]): void {
    const bracketStack: { type: ScopeType; line: number; condition?: string }[] = [];
    let inFunction: string | null = null;
    let functionReturnType: ValueType = 'unknown';
    let functionParams: { name: string; type: ValueType }[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const currentLine = lines[lineIndex];
      if (!currentLine) continue;

      const line = currentLine.trim();

      // Skip comments and empty lines
      if (line === '' || line.startsWith('//')) {
        continue;
      }

      // Function declaration
      const funcMatch = line.match(/^(int|float|string|object|void)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)\s*(?:{|$)/);
      if (funcMatch && funcMatch[1] && funcMatch[2]) {
        const returnType = funcMatch[1] as ValueType;
        const funcName = funcMatch[2];
        const paramsStr = funcMatch[3] || '';

        // Parse parameters
        const params: { name: string; type: ValueType }[] = [];
        if (paramsStr.trim()) {
          const paramsList = paramsStr.split(',');
          paramsList.forEach(param => {
            const paramParts = param.trim().split(/\s+/);
            if (paramParts.length >= 2 && paramParts[0] && paramParts[1]) {
              params.push({
                type: paramParts[0] as ValueType,
                name: paramParts[1]
              });
            }
          });
        }

        inFunction = funcName;
        functionReturnType = returnType;
        functionParams = params;

        // Register the function
        this.registerFunction(funcName, params, returnType, lineIndex);
        continue;
      }

      // Return statement inside a function
      if (inFunction) {
        const returnMatch = line.match(/^return\s+([^;]+);/);
        if (returnMatch && returnMatch[1]) {
          const retExpr = returnMatch[1].trim();
          const fn = this.functions.get(inFunction);
          if (fn) {
            // Lazily create returnExpressions array if missing
            (fn as any).returnExpressions = (fn as any).returnExpressions || [];
            (fn as any).returnExpressions.push(retExpr);
          }
        }
      }

      // If statement
      const ifMatch = line.match(/^if\s*\((.*)\)\s*(?:{|$)/);
      if (ifMatch && ifMatch[1]) {
        const condition = ifMatch[1];
        this.createScope(ScopeType.Conditional, lineIndex, condition);
        bracketStack.push({ type: ScopeType.Conditional, line: lineIndex, condition });
        continue;
      }

      // Else statement
      const elseMatch = line.match(/^else\s*(?:{|$)/);
      if (elseMatch) {
        // Close the previous if scope
        if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1]?.type === ScopeType.Conditional) {
          this.closeScope(lineIndex);
          bracketStack.pop();
        }

        // Create a new else scope
        this.createScope(ScopeType.Conditional, lineIndex, 'else');
        bracketStack.push({ type: ScopeType.Conditional, line: lineIndex, condition: 'else' });
        continue;
      }

      // While loop
      const whileMatch = line.match(/^while\s*\((.*)\)\s*(?:{|$)/);
      if (whileMatch && whileMatch[1]) {
        const condition = whileMatch[1];
        this.createScope(ScopeType.Loop, lineIndex, condition);
        bracketStack.push({ type: ScopeType.Loop, line: lineIndex, condition });
        continue;
      }

      // For loop
      const forMatch = line.match(/^for\s*\((.*)\)\s*(?:{|$)/);
      if (forMatch && forMatch[1]) {
        const condition = forMatch[1];
        this.createScope(ScopeType.Loop, lineIndex, condition);
        bracketStack.push({ type: ScopeType.Loop, line: lineIndex, condition });
        continue;
      }

      // Opening bracket (could be a standalone block)
      if (line === '{') {
        if (bracketStack.length === 0 || bracketStack[bracketStack.length - 1]?.line !== lineIndex - 1) {
          // This is a standalone block, not part of a control structure
          this.createScope(ScopeType.Block, lineIndex);
          bracketStack.push({ type: ScopeType.Block, line: lineIndex });
        }
        continue;
      }

      // Closing bracket
      if (line === '}') {
        if (bracketStack.length > 0) {
          const scope = bracketStack.pop()!;
          this.closeScope(lineIndex);

          // If we're closing a function
          if (inFunction && bracketStack.length === 0) {
            this.closeFunction(inFunction, lineIndex);
            inFunction = null;
          }
        }
        continue;
      }
    }

    // Close any remaining open scopes
    while (bracketStack.length > 0) {
      const scope = bracketStack.pop()!;
      this.closeScope(lines.length - 1);
    }

    // Close any remaining open functions
    if (inFunction) {
      this.closeFunction(inFunction, lines.length - 1);
    }
  }

  // Process function calls to track return values
  private processFunctionCalls(line: string, lineIndex: number): void {
    // Match function calls: functionName(arg1, arg2, ...)
    const funcCallRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g;

    let match: RegExpExecArray | null;
    while ((match = funcCallRegex.exec(line)) !== null) {
      const funcName = match[1] || '';
      const argsStr = match[2] || '';

      // Skip if this is a control structure
      if (['if', 'while', 'for', 'switch'].includes(funcName)) {
        continue;
      }

      // Find function definition
      const func = this.functions.get(funcName);
      if (!func) {
        continue;
      }

      // Parse arguments
      const args = argsStr.split(',').map(arg => arg.trim());

      // Create a position for this call
      const position = { line: lineIndex, character: match.index };

      // Evaluate function call if possible
      this.evaluateFunctionCall(funcName, args, position);
    }
  }

  // Evaluate a function call
  private evaluateFunctionCall(funcName: string, args: string[], position: Position): InferredValue | null {
    const func = this.functions.get(funcName);
    if (!func) {
      return null;
    }

    // For simple functions with known implementations, we can evaluate them
    if (funcName === 'IntToFloat') {
      if (args.length === 1 && args[0]) {
        const argValue = this.evaluateExpression(args[0]);
        if (argValue.isKnown && typeof argValue.value === 'number') {
          return {
            type: 'float',
            value: parseFloat(argValue.value.toString()),
            isKnown: true
          };
        }
      }
    }

    // For user-defined functions, we'd need to analyze the function body
    // This is a more complex analysis that would require traversing the function's AST

    return {
      type: func.returnType,
      value: null,
      isKnown: false
    };
  }

  // Process variable declarations in a line
  private processDeclarations(line: string, lineIndex: number): void {
    // Match patterns like: int a = 10; or float b;
    const declarationRegex = /(int|float|string|object)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=\s*([^;]+))?;/g;

    let match: RegExpExecArray | null;
    while ((match = declarationRegex.exec(line)) !== null) {
      const type = match[1] as ValueType;
      const name = match[2];
      const initialValueExpr = match[3];
      const position = { line: lineIndex, character: match.index };

      let initialValue: InferredValue | null = null;

      if (initialValueExpr) {
        initialValue = this.evaluateExpression(initialValueExpr.trim());
      }

      this.declareVariable(name || '', type, position, initialValue);
    }
  }

  // Process assignments in a line
  private processAssignments(line: string, lineIndex: number): void {
    // Match simple assignments: a = 10;
    const simpleAssignRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/g;

    let match: RegExpExecArray | null;
    while ((match = simpleAssignRegex.exec(line)) !== null) {
      const name = match[1];
      const valueExpr = match[2] ? match[2].trim() : '';
      const position = { line: lineIndex, character: match.index };

      const value = this.evaluateExpression(valueExpr);
      if (name) {
        this.assignVariable(name, position, value);
      }
    }

    // Match increment/decrement: a++; ++a; a--; --a;
    const incDecRegex = /(?:([a-zA-Z_][a-zA-Z0-9_]*)\+\+)|(?:\+\+([a-zA-Z_][a-zA-Z0-9_]*))|(?:([a-zA-Z_][a-zA-Z0-9_]*)--)|(?:--([a-zA-Z_][a-zA-Z0-9_]*))/g;

    while ((match = incDecRegex.exec(line)) !== null) {
      // Find which group matched (pre or post inc/dec)
      const name = match[1] || match[2] || match[3] || match[4];
      if (!name) continue; // Skip if no name matched

      const isIncrement = match[1] !== undefined || match[2] !== undefined;
      const position = { line: lineIndex, character: match.index };

      // Get current value
      const currentValue = this.getValueAtPosition(name, position);

      if (currentValue && currentValue.isKnown &&
        (currentValue.type === 'int' || currentValue.type === 'float') &&
        typeof currentValue.value === 'number') {

        const newValue = isIncrement ? currentValue.value + 1 : currentValue.value - 1;

        this.assignVariable(name, position, {
          type: currentValue.type,
          value: newValue,
          isKnown: true
        });
      }
    }

    // Match compound assignments: a += 5; b -= 10; etc.
    const compoundAssignRegex = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+=|-=|\*=|\/=)\s*([^;]+);/g;

    while ((match = compoundAssignRegex.exec(line)) !== null) {
      const name = match[1];
      if (!name) continue;

      const operator = match[2];
      const valueExpr = match[3] ? match[3].trim() : '';
      const position = { line: lineIndex, character: match.index };

      // Get current value
      const currentValue = this.getValueAtPosition(name, position);
      const rhsValue = this.evaluateExpression(valueExpr);

      if (currentValue && currentValue.isKnown && rhsValue.isKnown &&
        (currentValue.type === 'int' || currentValue.type === 'float') &&
        typeof currentValue.value === 'number' &&
        typeof rhsValue.value === 'number') {

        let newValue: number;

        switch (operator) {
          case '+=':
            newValue = currentValue.value + rhsValue.value;
            break;
          case '-=':
            newValue = currentValue.value - rhsValue.value;
            break;
          case '*=':
            newValue = currentValue.value * rhsValue.value;
            break;
          case '/=':
            newValue = currentValue.value / rhsValue.value;
            break;
          default:
            continue; // Unknown operator
        }

        this.assignVariable(name, position, {
          type: currentValue.type,
          value: newValue,
          isKnown: true
        });
      }
    }
  }

  // Evaluate an expression to a value
  private evaluateExpression(expr: string): InferredValue {
    if (!expr) {
      return { type: 'unknown', value: null, isKnown: false };
    }

    expr = expr.trim();

    // Try to parse as a simple numeric literal
    if (/^-?\d+$/.test(expr)) {
      // Integer literal
      return {
        type: 'int',
        value: parseInt(expr, 10),
        isKnown: true
      };
    } else if (/^-?\d+\.\d+$/.test(expr)) {
      // Float literal
      return {
        type: 'float',
        value: parseFloat(expr),
        isKnown: true
      };
    } else if (/^".*"$/.test(expr) || /^'.*'$/.test(expr)) {
      // String literal
      return {
        type: 'string',
        value: expr.substring(1, expr.length - 1),
        isKnown: true
      };
    }

    // Check for parenthesized expressions
    if (expr.startsWith('(') && expr.endsWith(')')) {
      // Remove the outer parentheses and evaluate the inner expression
      return this.evaluateExpression(expr.substring(1, expr.length - 1));
    }

    // Check for variable references
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr)) {
      const varName = expr;
      // Use a dummy position to get the latest value
      const dummyPos = { line: Number.MAX_SAFE_INTEGER, character: 0 };
      const value = this.getValueAtPosition(varName, dummyPos);

      if (value) {
        return value;
      }
    }

    // Check for function calls
    const funcCallMatch = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)$/);
    if (funcCallMatch && funcCallMatch[1]) {
      const funcName = funcCallMatch[1];
      const argsStr = funcCallMatch[2] || '';
      const args = argsStr.split(',').map(arg => arg.trim());

      // Create a dummy position
      const dummyPos = { line: Number.MAX_SAFE_INTEGER, character: 0 };

      // Try to evaluate the function call
      const result = this.evaluateFunctionCall(funcName, args, dummyPos);
      if (result) {
        return result;
      }
    }

    // Try to handle complex expressions with operator precedence
    return this.evaluateComplexExpression(expr);
  }

  // Handle more complex expressions with operator precedence
  private evaluateComplexExpression(expr: string): InferredValue {
    // First, check for logical operators (lowest precedence)
    const logicalOpMatch = expr.match(/^(.+?)(&&|\|\|)(.+)$/);
    if (logicalOpMatch && logicalOpMatch[1] && logicalOpMatch[2] && logicalOpMatch[3]) {
      const leftExpr = logicalOpMatch[1].trim();
      const operator = logicalOpMatch[2];
      const rightExpr = logicalOpMatch[3].trim();

      const left = this.evaluateExpression(leftExpr);

      // Short-circuit evaluation for logical operators
      if (left.isKnown && typeof left.value === 'number') {
        const leftBool = left.value !== 0;

        if ((operator === '&&' && !leftBool) || (operator === '||' && leftBool)) {
          // Short-circuit: for && if left is false, for || if left is true
          return {
            type: 'int',
            value: operator === '&&' ? 0 : 1,
            isKnown: true
          };
        }

        // Need to evaluate right side
        const right = this.evaluateExpression(rightExpr);
        if (right.isKnown && typeof right.value === 'number') {
          const rightBool = right.value !== 0;
          const result = operator === '&&' ? (leftBool && rightBool) : (leftBool || rightBool);

          return {
            type: 'int',
            value: result ? 1 : 0,
            isKnown: true
          };
        }
      }

      // If we can't evaluate, create a conditional value
      return {
        type: 'int',
        value: null,
        isKnown: false,
        conditions: [
          { condition: expr, value: { type: 'int', value: 1, isKnown: true } },
          { condition: `!(${expr})`, value: { type: 'int', value: 0, isKnown: true } }
        ]
      };
    }

    // Check for comparison operators
    const comparisonOpMatch = expr.match(/^(.+?)(==|!=|<=|>=|<|>)(.+)$/);
    if (comparisonOpMatch && comparisonOpMatch[1] && comparisonOpMatch[2] && comparisonOpMatch[3]) {
      const leftExpr = comparisonOpMatch[1].trim();
      const operator = comparisonOpMatch[2];
      const rightExpr = comparisonOpMatch[3].trim();

      const left = this.evaluateExpression(leftExpr);
      const right = this.evaluateExpression(rightExpr);

      if (left.isKnown && right.isKnown &&
        typeof left.value === 'number' && typeof right.value === 'number') {

        let result: boolean;
        switch (operator) {
          case '==': result = left.value === right.value; break;
          case '!=': result = left.value !== right.value; break;
          case '<': result = left.value < right.value; break;
          case '<=': result = left.value <= right.value; break;
          case '>': result = left.value > right.value; break;
          case '>=': result = left.value >= right.value; break;
          default: return { type: 'unknown', value: null, isKnown: false };
        }

        return {
          type: 'int',
          value: result ? 1 : 0,
          isKnown: true
        };
      }

      // If we can't evaluate, create a conditional value
      return {
        type: 'int',
        value: null,
        isKnown: false,
        conditions: [
          { condition: expr, value: { type: 'int', value: 1, isKnown: true } },
          { condition: `!(${expr})`, value: { type: 'int', value: 0, isKnown: true } }
        ]
      };
    }

    // Check for addition and subtraction (lower precedence than multiplication/division)
    const addSubMatch = expr.match(/^(.+?)(\+|-)(.+)$/);
    if (addSubMatch && addSubMatch[1] && addSubMatch[2] && addSubMatch[3]) {
      // Make sure we're not matching a negative number or part of another operator
      const beforeOp = addSubMatch[1].trim();
      const operator = addSubMatch[2];
      const afterOp = addSubMatch[3].trim();

      // Skip if this is a negative number or part of another operator
      if (beforeOp && !beforeOp.endsWith('=') && !beforeOp.endsWith('+') && !beforeOp.endsWith('-') &&
        !beforeOp.endsWith('*') && !beforeOp.endsWith('/') && !beforeOp.endsWith('%')) {

        const left = this.evaluateExpression(beforeOp);
        const right = this.evaluateExpression(afterOp);

        if (left.isKnown && right.isKnown &&
          typeof left.value === 'number' && typeof right.value === 'number') {

          let result: number;
          switch (operator) {
            case '+': result = left.value + right.value; break;
            case '-': result = left.value - right.value; break;
            default: return { type: 'unknown', value: null, isKnown: false };
          }

          // Determine result type (int or float)
          const resultType = (left.type === 'float' || right.type === 'float') ? 'float' : 'int';

          return {
            type: resultType,
            value: resultType === 'int' ? Math.floor(result) : result,
            isKnown: true
          };
        }
      }
    }

    // Check for multiplication, division, and modulo (higher precedence)
    const mulDivMatch = expr.match(/^(.+?)(\*|\/|\%)(.+)$/);
    if (mulDivMatch && mulDivMatch[1] && mulDivMatch[2] && mulDivMatch[3]) {
      const leftExpr = mulDivMatch[1].trim();
      const operator = mulDivMatch[2];
      const rightExpr = mulDivMatch[3].trim();

      const left = this.evaluateExpression(leftExpr);
      const right = this.evaluateExpression(rightExpr);

      if (left.isKnown && right.isKnown &&
        typeof left.value === 'number' && typeof right.value === 'number') {

        // Check for division by zero
        if ((operator === '/' || operator === '%') && right.value === 0) {
          return { type: 'unknown', value: null, isKnown: false };
        }

        let result: number;
        switch (operator) {
          case '*': result = left.value * right.value; break;
          case '/': result = left.value / right.value; break;
          case '%': result = left.value % right.value; break;
          default: return { type: 'unknown', value: null, isKnown: false };
        }

        // Determine result type (int or float)
        const resultType = (left.type === 'float' || right.type === 'float' || operator === '/') ? 'float' : 'int';

        return {
          type: resultType,
          value: resultType === 'int' ? Math.floor(result) : result,
          isKnown: true
        };
      }
    }

    // Try to handle ternary operator: condition ? trueExpr : falseExpr
    const ternaryMatch = expr.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
    if (ternaryMatch && ternaryMatch[1] && ternaryMatch[2] && ternaryMatch[3]) {
      const conditionExpr = ternaryMatch[1].trim();
      const trueExpr = ternaryMatch[2].trim();
      const falseExpr = ternaryMatch[3].trim();

      const condition = this.evaluateExpression(conditionExpr);

      if (condition.isKnown && typeof condition.value === 'number') {
        // Evaluate only the branch that will be taken
        return this.evaluateExpression(condition.value !== 0 ? trueExpr : falseExpr);
      }

      // If condition isn't known, create a conditional value
      const trueValue = this.evaluateExpression(trueExpr);
      const falseValue = this.evaluateExpression(falseExpr);

      if (trueValue.isKnown && falseValue.isKnown) {
        return {
          type: trueValue.type === falseValue.type ? trueValue.type : 'unknown',
          value: null,
          isKnown: false,
          conditions: [
            { condition: conditionExpr, value: trueValue },
            { condition: `!(${conditionExpr})`, value: falseValue }
          ]
        };
      }
    }

    // Fallback for expressions we can't evaluate
    return {
      type: 'unknown',
      value: null,
      isKnown: false
    };
  }

  // Collect active conditional expressions for the scope chain at a line
  private collectActiveConditions(line: number): string[] {
    const conditions: string[] = [];
    const scope = this.findScopeAtLine(line);
    let cur: Scope | null = scope;
    while (cur) {
      if (cur.condition) {
        conditions.push(cur.condition);
      }
      cur = cur.parent;
    }
    return conditions.reverse();
  }

  // Check if the given line is inside a loop scope
  private isInsideLoop(line: number): boolean {
    let scope: Scope | null = this.findScopeAtLine(line);
    while (scope) {
      if (scope.type === ScopeType.Loop) return true;
      scope = scope.parent;
    }
    return false;
  }
}
