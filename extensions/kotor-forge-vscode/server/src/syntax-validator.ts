/**
 * Advanced NWScript Syntax Validator
 * Implements comprehensive validation rules based on the Python compiler
 */

import { DiagnosticSeverity } from 'vscode-languageserver/node';
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
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IncludeDirective,
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
import { SemanticError } from './semantic-analyzer';

export interface ValidationContext {
  inFunction: boolean;
  inLoop: boolean;
  inSwitch: boolean;
  currentFunction?: FunctionDeclaration;
  functionReturnType?: string;
  loopDepth: number;
  switchDepth: number;
}

export class SyntaxValidator implements ASTVisitor<void> {
  private errors: SemanticError[] = [];
  private context: ValidationContext = {
    inFunction: false,
    inLoop: false,
    inSwitch: false,
    loopDepth: 0,
    switchDepth: 0
  };

  public validate(ast: Program): SemanticError[] {
    this.errors = [];
    this.context = {
      inFunction: false,
      inLoop: false,
      inSwitch: false,
      loopDepth: 0,
      switchDepth: 0
    };

    try {
      this.visitProgram(ast);
    } catch (error) {
      if (error instanceof Error) {
        this.addError({
          message: `Syntax validation error: ${error.message}`,
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

  private withContext<T>(updates: Partial<ValidationContext>, fn: () => T): T {
    const oldContext = { ...this.context };
    Object.assign(this.context, updates);
    try {
      return fn();
    } finally {
      this.context = oldContext;
    }
  }

  // AST Visitor Methods

  public visitProgram(node: Program): void {
    // Validate includes first
    node.includes.forEach(include => {
      walkAST(include, this);
    });

    // Validate top-level declarations
    node.body.forEach(decl => {
      walkAST(decl, this);
    });

    // Check for required entry points
    this.validateEntryPoints(node);
  }

  public visitIncludeDirective(node: IncludeDirective): void {
    // Validate include syntax
    if (!node.filename || node.filename.trim() === '') {
      this.addError({
        message: 'Include directive must specify a filename',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'empty-include'
      });
    }

    // Check for common include patterns
    if (node.filename && !node.filename.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      this.addError({
        message: `Invalid include filename '${node.filename}'. Should contain only alphanumeric characters and underscores`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'invalid-include-name'
      });
    }
  }

  public visitFunctionDeclaration(node: FunctionDeclaration): void {
    // Validate function name
    if (!this.isValidIdentifier(node.name)) {
      this.addError({
        message: `Invalid function name '${node.name}'. Must start with letter or underscore`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-function-name'
      });
    }

    // Check for reserved function names
    if (this.isReservedName(node.name)) {
      this.addError({
        message: `'${node.name}' is a reserved function name`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'reserved-name'
      });
    }

    // Validate parameters
    this.validateParameters(node.parameters);

    // Validate function body in function context
    if (!node.isPrototype) {
      this.withContext({
        inFunction: true,
        currentFunction: node,
        functionReturnType: node.returnType.name
      }, () => {
        walkAST(node.body, this);
      });
    }
  }

  public visitVariableDeclaration(node: VariableDeclaration): void {
    // Validate variable name
    if (!this.isValidIdentifier(node.name)) {
      this.addError({
        message: `Invalid variable name '${node.name}'. Must start with letter or underscore`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-variable-name'
      });
    }

    // Check for reserved names
    if (this.isReservedName(node.name)) {
      this.addError({
        message: `'${node.name}' is a reserved name`,
        severity: DiagnosticSeverity.Warning,
        range: node.range,
        code: 'reserved-name'
      });
    }

    // Validate void variables
    if (node.varType.name === 'void') {
      this.addError({
        message: 'Cannot declare variable of type void',
        severity: DiagnosticSeverity.Error,
        range: node.varType.range,
        code: 'void-variable'
      });
    }

    // Validate initializer
    if (node.initializer) {
      walkAST(node.initializer, this);
    }
  }

  public visitStructDeclaration(node: StructDeclaration): void {
    // Validate struct name
    if (!this.isValidIdentifier(node.name)) {
      this.addError({
        message: `Invalid struct name '${node.name}'. Must start with letter or underscore`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-struct-name'
      });
    }

    // Check for empty struct
    if (node.members.length === 0) {
      this.addError({
        message: 'Struct cannot be empty',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'empty-struct'
      });
    }

    // Validate members
    const memberNames = new Set<string>();
    node.members.forEach(member => {
      if (memberNames.has(member.name)) {
        this.addError({
          message: `Duplicate struct member '${member.name}'`,
          severity: DiagnosticSeverity.Error,
          range: member.range,
          code: 'duplicate-member'
        });
      }
      memberNames.add(member.name);
      
      walkAST(member, this);
    });
  }

  public visitReturnStatement(node: ReturnStatement): void {
    if (!this.context.inFunction) {
      this.addError({
        message: 'Return statement outside of function',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'return-outside-function'
      });
      return;
    }

    // Validate return value matches function return type
    const expectedType = this.context.functionReturnType;
    if (expectedType === 'void') {
      if (node.argument) {
        this.addError({
          message: 'Void function cannot return a value',
          severity: DiagnosticSeverity.Error,
          range: node.argument.range,
          code: 'void-return-value'
        });
      }
    } else {
      if (!node.argument) {
        this.addError({
          message: `Function must return a value of type '${expectedType}'`,
          severity: DiagnosticSeverity.Error,
          range: node.range,
          code: 'missing-return-value'
        });
      }
    }

    if (node.argument) {
      walkAST(node.argument, this);
    }
  }

  public visitBreakStatement(node: BreakStatement): void {
    if (!this.context.inLoop && !this.context.inSwitch) {
      this.addError({
        message: 'Break statement must be inside a loop or switch',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'break-outside-loop'
      });
    }
  }

  public visitContinueStatement(node: ContinueStatement): void {
    if (!this.context.inLoop) {
      this.addError({
        message: 'Continue statement must be inside a loop',
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'continue-outside-loop'
      });
    }
  }

  public visitWhileStatement(node: WhileStatement): void {
    walkAST(node.test, this);
    
    this.withContext({
      inLoop: true,
      loopDepth: this.context.loopDepth + 1
    }, () => {
      walkAST(node.body, this);
    });
  }

  public visitForStatement(node: ForStatement): void {
    if (node.init) {
      walkAST(node.init, this);
    }
    if (node.test) {
      walkAST(node.test, this);
    }
    if (node.update) {
      walkAST(node.update, this);
    }

    this.withContext({
      inLoop: true,
      loopDepth: this.context.loopDepth + 1
    }, () => {
      walkAST(node.body, this);
    });
  }

  public visitDoWhileStatement(node: DoWhileStatement): void {
    this.withContext({
      inLoop: true,
      loopDepth: this.context.loopDepth + 1
    }, () => {
      walkAST(node.body, this);
    });
    
    walkAST(node.test, this);
  }

  public visitSwitchStatement(node: SwitchStatement): void {
    walkAST(node.discriminant, this);

    this.withContext({
      inSwitch: true,
      switchDepth: this.context.switchDepth + 1
    }, () => {
      node.cases.forEach(caseNode => {
        walkAST(caseNode, this);
      });
    });
  }

  public visitCallExpression(node: CallExpression): void {
    // Validate arguments
    node.arguments.forEach(arg => {
      walkAST(arg, this);
    });

    if (node.callee instanceof Identifier) {
      // Additional validation for specific KOTOR functions could go here
      this.validateKotorFunctionCall(node.callee.name, node.arguments, node.range);
    }
  }

  public visitAssignmentExpression(node: AssignmentExpression): void {
    walkAST(node.left, this);
    walkAST(node.right, this);

    // Validate assignment operators
    if (node.operator !== '=' && node.operator !== '+=' && 
        node.operator !== '-=' && node.operator !== '*=' && 
        node.operator !== '/=' && node.operator !== '%=') {
      this.addError({
        message: `Invalid assignment operator '${node.operator}'`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-assignment-op'
      });
    }
  }

  public visitUnaryExpression(node: UnaryExpression): void {
    walkAST(node.argument, this);

    // Validate increment/decrement on lvalues
    if ((node.operator === '++' || node.operator === '--') && 
        !(node.argument instanceof Identifier || node.argument instanceof MemberExpression)) {
      this.addError({
        message: `Cannot apply '${node.operator}' to this expression`,
        severity: DiagnosticSeverity.Error,
        range: node.range,
        code: 'invalid-increment'
      });
    }
  }

  public visitVectorLiteral(node: VectorLiteral): void {
    walkAST(node.x, this);
    walkAST(node.y, this);
    walkAST(node.z, this);

    // All components should be numeric literals or expressions
    [node.x, node.y, node.z].forEach((component, index) => {
      const componentName = ['x', 'y', 'z'][index];
      if (component instanceof Literal) {
        if (typeof component.value !== 'number') {
          this.addError({
            message: `Vector ${componentName} component must be numeric`,
            severity: DiagnosticSeverity.Error,
            range: component.range,
            code: 'non-numeric-vector'
          });
        }
      }
    });
  }

  // Helper Methods

  private validateEntryPoints(program: Program): void {
    const functions = program.body.filter(decl => decl instanceof FunctionDeclaration) as FunctionDeclaration[];
    const hasMain = functions.some(f => f.name === 'main');
    const hasStartingConditional = functions.some(f => f.name === 'StartingConditional');

    if (!hasMain && !hasStartingConditional) {
      this.addError({
        message: 'Script must have either a main() function or StartingConditional() function',
        severity: DiagnosticSeverity.Warning,
        range: program.range,
        code: 'no-entry-point'
      });
    }

    if (hasMain && hasStartingConditional) {
      this.addError({
        message: 'Script should not have both main() and StartingConditional() functions',
        severity: DiagnosticSeverity.Warning,
        range: program.range,
        code: 'multiple-entry-points'
      });
    }
  }

  private validateParameters(parameters: Parameter[]): void {
    const paramNames = new Set<string>();
    let foundDefaultParam = false;

    parameters.forEach((param, index) => {
      // Check for duplicate parameter names
      if (paramNames.has(param.name)) {
        this.addError({
          message: `Duplicate parameter name '${param.name}'`,
          severity: DiagnosticSeverity.Error,
          range: param.range,
          code: 'duplicate-parameter'
        });
      }
      paramNames.add(param.name);

      // Validate parameter name
      if (!this.isValidIdentifier(param.name)) {
        this.addError({
          message: `Invalid parameter name '${param.name}'`,
          severity: DiagnosticSeverity.Error,
          range: param.range,
          code: 'invalid-parameter-name'
        });
      }

      // Check parameter ordering (default parameters must come after required ones)
      if (param.defaultValue) {
        foundDefaultParam = true;
        walkAST(param.defaultValue, this);
      } else if (foundDefaultParam) {
        this.addError({
          message: 'Required parameter cannot follow optional parameter',
          severity: DiagnosticSeverity.Error,
          range: param.range,
          code: 'required-after-optional'
        });
      }

      // Validate parameter type
      if (param.paramType.name === 'void') {
        this.addError({
          message: 'Parameter cannot be of type void',
          severity: DiagnosticSeverity.Error,
          range: param.paramType.range,
          code: 'void-parameter'
        });
      }
    });
  }

  private validateKotorFunctionCall(functionName: string, args: Expression[], range: SourceRange): void {
    // Validate specific KOTOR function usage patterns
    switch (functionName) {
      case 'GetGlobalNumber':
      case 'SetGlobalNumber':
        if (args.length > 0) {
          const firstArg = args[0];
          if (firstArg instanceof Literal && typeof firstArg.value === 'string') {
            // Validate global variable naming convention
            if (!firstArg.value.match(/^[A-Z_][A-Z0-9_]*$/)) {
              this.addError({
                message: `Global variable names should follow UPPER_CASE convention: '${firstArg.value}'`,
                severity: DiagnosticSeverity.Information,
                range: firstArg.range,
                code: 'global-naming-convention'
              });
            }
          }
        }
        break;

      case 'GetObjectByTag':
        if (args.length > 0) {
          const tagArg = args[0];
          if (tagArg instanceof Literal && typeof tagArg.value === 'string') {
            // Validate tag naming conventions
            if (tagArg.value.length > 16) {
              this.addError({
                message: `Object tag '${tagArg.value}' exceeds maximum length of 16 characters`,
                severity: DiagnosticSeverity.Warning,
                range: tagArg.range,
                code: 'tag-too-long'
              });
            }
          }
        }
        break;

      case 'ExecuteScript':
        if (args.length > 0) {
          const scriptArg = args[0];
          if (scriptArg instanceof Literal && typeof scriptArg.value === 'string') {
            // Validate script naming conventions
            if (scriptArg.value.length > 16) {
              this.addError({
                message: `Script name '${scriptArg.value}' exceeds maximum length of 16 characters`,
                severity: DiagnosticSeverity.Warning,
                range: scriptArg.range,
                code: 'script-name-too-long'
              });
            }
          }
        }
        break;

      case 'CreateObject':
        // Validate object creation patterns
        if (args.length >= 2) {
          const templateArg = args[1];
          if (templateArg instanceof Literal && typeof templateArg.value === 'string') {
            if (templateArg.value.length > 16) {
              this.addError({
                message: `Template ResRef '${templateArg.value}' exceeds maximum length of 16 characters`,
                severity: DiagnosticSeverity.Warning,
                range: templateArg.range,
                code: 'template-name-too-long'
              });
            }
          }
        }
        break;
    }
  }

  private isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private isReservedName(name: string): boolean {
    const reserved = [
      // C keywords
      'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
      'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
      'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
      'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
      
      // NWScript types
      'object', 'string', 'vector', 'location', 'event', 'effect', 'itemproperty',
      'talent', 'action',
      
      // Common constants
      'TRUE', 'FALSE', 'OBJECT_SELF', 'OBJECT_INVALID'
    ];
    
    return reserved.includes(name);
  }

  /**
   * Validate specific NWScript syntax patterns
   */
  public visitBinaryExpression(node: BinaryExpression): void {
    walkAST(node.left, this);
    walkAST(node.right, this);

    // Additional validation for specific operators
    switch (node.operator) {
      case '/':
      case '%':
        // Check for division by zero with literal values
        if (node.right instanceof Literal && 
            typeof node.right.value === 'number' && 
            node.right.value === 0) {
          this.addError({
            message: 'Division by zero',
            severity: DiagnosticSeverity.Error,
            range: node.right.range,
            code: 'division-by-zero'
          });
        }
        break;

      case '<<':
      case '>>':
        // Validate shift amounts
        if (node.right instanceof Literal && 
            typeof node.right.value === 'number' && 
            (node.right.value < 0 || node.right.value > 31)) {
          this.addError({
            message: `Shift amount must be between 0 and 31, got ${node.right.value}`,
            severity: DiagnosticSeverity.Warning,
            range: node.right.range,
            code: 'invalid-shift-amount'
          });
        }
        break;
    }
  }

  public visitConditionalExpression(node: ConditionalExpression): void {
    walkAST(node.test, this);
    walkAST(node.consequent, this);
    walkAST(node.alternate, this);
  }

  public visitMemberExpression(node: MemberExpression): void {
    walkAST(node.object, this);
    
    if (node.computed) {
      walkAST(node.property, this);
    } else if (node.property instanceof Identifier) {
      // Validate property names for known types
      // This would be expanded based on struct definitions
    }
  }

  public visitLiteral(node: Literal): void {
    // Validate literal values
    if (typeof node.value === 'string') {
      // Check for overly long strings
      if (node.value.length > 1024) {
        this.addError({
          message: 'String literal is very long and may cause issues',
          severity: DiagnosticSeverity.Information,
          range: node.range,
          code: 'long-string'
        });
      }
    } else if (typeof node.value === 'number') {
      // Check for numeric overflow
      if (!Number.isFinite(node.value)) {
        this.addError({
          message: 'Invalid numeric literal',
          severity: DiagnosticSeverity.Error,
          range: node.range,
          code: 'invalid-number'
        });
      }
    }
  }

  /**
   * Default visitor for unhandled node types
   */
  public visitBlockStatement(node: BlockStatement): void {
    node.body.forEach(stmt => {
      walkAST(stmt, this);
    });
  }

  public visitExpressionStatement(node: ExpressionStatement): void {
    walkAST(node.expression, this);
  }

  public visitIfStatement(node: IfStatement): void {
    walkAST(node.test, this);
    walkAST(node.consequent, this);
    if (node.alternate) {
      walkAST(node.alternate, this);
    }
  }

  public visitIdentifier(node: Identifier): void {
    // Validate identifier naming conventions
    if (node.name.length > 32) {
      this.addError({
        message: `Identifier '${node.name}' is very long and may cause issues`,
        severity: DiagnosticSeverity.Information,
        range: node.range,
        code: 'long-identifier'
      });
    }
  }
}
