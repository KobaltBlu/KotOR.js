/**
 * Comprehensive NWScript Abstract Syntax Tree definitions
 * Production-ready parser for KOTOR NWScript
 */

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

export abstract class ASTNode {
  public type: string;
  public range: SourceRange;

  constructor(type: string, range: SourceRange) {
    this.type = type;
    this.range = range;
  }
}

// Program and top-level constructs
export class Program extends ASTNode {
  public body: Declaration[];
  public includes: IncludeDirective[];

  constructor(range: SourceRange, body: Declaration[] = [], includes: IncludeDirective[] = []) {
    super('Program', range);
    this.body = body;
    this.includes = includes;
  }
}

export class IncludeDirective extends ASTNode {
  public filename: string;
  public resolved?: Program;

  constructor(range: SourceRange, filename: string) {
    super('IncludeDirective', range);
    this.filename = filename;
  }
}

// Declarations
export abstract class Declaration extends ASTNode { }

export class FunctionDeclaration extends Declaration {
  public returnType: TypeSpecifier;
  public name: string;
  public parameters: Parameter[];
  public body: BlockStatement;
  public isPrototype: boolean;

  constructor(
    range: SourceRange,
    returnType: TypeSpecifier,
    name: string,
    parameters: Parameter[],
    body: BlockStatement,
    isPrototype = false
  ) {
    super('FunctionDeclaration', range);
    this.returnType = returnType;
    this.name = name;
    this.parameters = parameters;
    this.body = body;
    this.isPrototype = isPrototype;
  }
}

export class VariableDeclaration extends Declaration {
  public varType: TypeSpecifier;
  public name: string;
  public initializer?: Expression;
  public isConstant: boolean;

  constructor(
    range: SourceRange,
    varType: TypeSpecifier,
    name: string,
    initializer?: Expression,
    isConstant = false
  ) {
    super('VariableDeclaration', range);
    this.varType = varType;
    this.name = name;
    this.initializer = initializer;
    this.isConstant = isConstant;
  }
}

export class Parameter extends ASTNode {
  public paramType: TypeSpecifier;
  public name: string;
  public defaultValue?: Expression;

  constructor(range: SourceRange, paramType: TypeSpecifier, name: string, defaultValue?: Expression) {
    super('Parameter', range);
    this.paramType = paramType;
    this.name = name;
    this.defaultValue = defaultValue;
  }
}

export class TypeSpecifier extends ASTNode {
  public name: string;

  constructor(range: SourceRange, name: string) {
    super('TypeSpecifier', range);
    this.name = name;
  }
}

// Statements
export abstract class Statement extends ASTNode { }

export class BlockStatement extends Statement {
  public body: Statement[];

  constructor(range: SourceRange, body: Statement[] = []) {
    super('BlockStatement', range);
    this.body = body;
  }
}

export class ExpressionStatement extends Statement {
  public expression: Expression;

  constructor(range: SourceRange, expression: Expression) {
    super('ExpressionStatement', range);
    this.expression = expression;
  }
}

export class ReturnStatement extends Statement {
  public argument?: Expression;

  constructor(range: SourceRange, argument?: Expression) {
    super('ReturnStatement', range);
    this.argument = argument;
  }
}

export class IfStatement extends Statement {
  public test: Expression;
  public consequent: Statement;
  public alternate?: Statement;

  constructor(range: SourceRange, test: Expression, consequent: Statement, alternate?: Statement) {
    super('IfStatement', range);
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }
}

export class WhileStatement extends Statement {
  public test: Expression;
  public body: Statement;

  constructor(range: SourceRange, test: Expression, body: Statement) {
    super('WhileStatement', range);
    this.test = test;
    this.body = body;
  }
}

export class ForStatement extends Statement {
  public init?: VariableDeclaration | Expression;
  public test?: Expression;
  public update?: Expression;
  public body: Statement;

  constructor(
    range: SourceRange,
    body: Statement,
    init?: VariableDeclaration | Expression,
    test?: Expression,
    update?: Expression
  ) {
    super('ForStatement', range);
    this.init = init;
    this.test = test;
    this.update = update;
    this.body = body;
  }
}

export class DoWhileStatement extends Statement {
  public body: Statement;
  public test: Expression;

  constructor(range: SourceRange, body: Statement, test: Expression) {
    super('DoWhileStatement', range);
    this.body = body;
    this.test = test;
  }
}

export class SwitchStatement extends Statement {
  public discriminant: Expression;
  public cases: SwitchCase[];

  constructor(range: SourceRange, discriminant: Expression, cases: SwitchCase[]) {
    super('SwitchStatement', range);
    this.discriminant = discriminant;
    this.cases = cases;
  }
}

export class SwitchCase extends Statement {
  public test?: Expression; // null for default case
  public consequent: Statement[];

  constructor(range: SourceRange, consequent: Statement[], test?: Expression) {
    super('SwitchCase', range);
    this.test = test;
    this.consequent = consequent;
  }
}

export class BreakStatement extends Statement {
  constructor(range: SourceRange) {
    super('BreakStatement', range);
  }
}

export class ContinueStatement extends Statement {
  constructor(range: SourceRange) {
    super('ContinueStatement', range);
  }
}

// Expressions
export abstract class Expression extends ASTNode { }

export class BinaryExpression extends Expression {
  public operator: string;
  public left: Expression;
  public right: Expression;

  constructor(range: SourceRange, operator: string, left: Expression, right: Expression) {
    super('BinaryExpression', range);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

export class UnaryExpression extends Expression {
  public operator: string;
  public argument: Expression;
  public prefix: boolean;

  constructor(range: SourceRange, operator: string, argument: Expression, prefix = true) {
    super('UnaryExpression', range);
    this.operator = operator;
    this.argument = argument;
    this.prefix = prefix;
  }
}

export class AssignmentExpression extends Expression {
  public operator: string;
  public left: Expression;
  public right: Expression;

  constructor(range: SourceRange, operator: string, left: Expression, right: Expression) {
    super('AssignmentExpression', range);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

export class CallExpression extends Expression {
  public callee: Expression;
  public arguments: Expression[];

  constructor(range: SourceRange, callee: Expression, args: Expression[]) {
    super('CallExpression', range);
    this.callee = callee;
    this.arguments = args;
  }
}

export class MemberExpression extends Expression {
  public object: Expression;
  public property: Expression;
  public computed: boolean;

  constructor(range: SourceRange, object: Expression, property: Expression, computed = false) {
    super('MemberExpression', range);
    this.object = object;
    this.property = property;
    this.computed = computed;
  }
}

export class ConditionalExpression extends Expression {
  public test: Expression;
  public consequent: Expression;
  public alternate: Expression;

  constructor(range: SourceRange, test: Expression, consequent: Expression, alternate: Expression) {
    super('ConditionalExpression', range);
    this.test = test;
    this.consequent = consequent;
    this.alternate = alternate;
  }
}

export class Identifier extends Expression {
  public name: string;

  constructor(range: SourceRange, name: string) {
    super('Identifier', range);
    this.name = name;
  }
}

export class Literal extends Expression {
  public value: any;
  public raw: string;

  constructor(range: SourceRange, value: any, raw: string) {
    super('Literal', range);
    this.value = value;
    this.raw = raw;
  }
}

export class VectorLiteral extends Expression {
  public x: Expression;
  public y: Expression;
  public z: Expression;

  constructor(range: SourceRange, x: Expression, y: Expression, z: Expression) {
    super('VectorLiteral', range);
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

// NWScript-specific constructs
export class StructDeclaration extends Declaration {
  public name: string;
  public members: VariableDeclaration[];

  constructor(range: SourceRange, name: string, members: VariableDeclaration[]) {
    super('StructDeclaration', range);
    this.name = name;
    this.members = members;
  }
}

export class StructExpression extends Expression {
  public members: { [key: string]: Expression };

  constructor(range: SourceRange, members: { [key: string]: Expression }) {
    super('StructExpression', range);
    this.members = members;
  }
}

// Engine constants and built-ins
export class EngineConstant extends Expression {
  public name: string;
  public value: any;
  public constantType: string;

  constructor(range: SourceRange, name: string, value: any, constantType: string) {
    super('EngineConstant', range);
    this.name = name;
    this.value = value;
    this.constantType = constantType;
  }
}

// Visitor pattern for AST traversal
export interface ASTVisitor<T = void> {
  visitProgram?(node: Program): T;
  visitIncludeDirective?(node: IncludeDirective): T;
  visitFunctionDeclaration?(node: FunctionDeclaration): T;
  visitVariableDeclaration?(node: VariableDeclaration): T;
  visitParameter?(node: Parameter): T;
  visitTypeSpecifier?(node: TypeSpecifier): T;
  visitBlockStatement?(node: BlockStatement): T;
  visitExpressionStatement?(node: ExpressionStatement): T;
  visitReturnStatement?(node: ReturnStatement): T;
  visitIfStatement?(node: IfStatement): T;
  visitWhileStatement?(node: WhileStatement): T;
  visitForStatement?(node: ForStatement): T;
  visitDoWhileStatement?(node: DoWhileStatement): T;
  visitSwitchStatement?(node: SwitchStatement): T;
  visitSwitchCase?(node: SwitchCase): T;
  visitBreakStatement?(node: BreakStatement): T;
  visitContinueStatement?(node: ContinueStatement): T;
  visitBinaryExpression?(node: BinaryExpression): T;
  visitUnaryExpression?(node: UnaryExpression): T;
  visitAssignmentExpression?(node: AssignmentExpression): T;
  visitCallExpression?(node: CallExpression): T;
  visitMemberExpression?(node: MemberExpression): T;
  visitConditionalExpression?(node: ConditionalExpression): T;
  visitIdentifier?(node: Identifier): T;
  visitLiteral?(node: Literal): T;
  visitVectorLiteral?(node: VectorLiteral): T;
  visitStructDeclaration?(node: StructDeclaration): T;
  visitStructExpression?(node: StructExpression): T;
  visitEngineConstant?(node: EngineConstant): T;
}

export function walkAST<T>(node: ASTNode, visitor: ASTVisitor<T>): T | undefined {
  const methodName = `visit${node.type}` as keyof ASTVisitor<T>;
  const method = visitor[methodName];

  if (method && typeof method === 'function') {
    return (method as Function).call(visitor, node);
  }

  return undefined;
}
