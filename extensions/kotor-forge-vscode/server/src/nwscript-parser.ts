/**
 * Production-ready NWScript Parser
 * Recursive descent parser that builds a complete AST
 */

import { trace, debug } from './logger';
import {
  AssignmentExpression,
  BinaryExpression,
  BlockStatement,
  BreakStatement,
  CallExpression,
  ConditionalExpression,
  ContinueStatement,
  Declaration,
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
  SourceLocation,
  SourceRange,
  Statement,
  StructDeclaration,
  SwitchCase,
  SwitchStatement,
  TypeSpecifier,
  UnaryExpression,
  VariableDeclaration,
  VectorLiteral,
  WhileStatement
} from './nwscript-ast';
import { NWScriptLexer, Token, TokenType } from './nwscript-lexer';

export class ParseError extends Error {
  public location: SourceLocation;

  constructor(message: string, location: SourceLocation) {
    super(message);
    this.location = location;
    this.name = 'ParseError';
  }
}

export class NWScriptParser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(token =>
      token.type !== TokenType.COMMENT &&
      token.type !== TokenType.WHITESPACE
    );
  }

  public getErrors(): ParseError[] {
    return this.errors;
  }

  public static parse(source: string): Program {
    const lexer = new NWScriptLexer(source);
    const tokens = lexer.tokenize();
    const parser = new NWScriptParser(tokens);
    const program = parser.parseProgram();

    // If there were parse errors during recovery, throw the first one
    const errors = parser.getErrors();
    if (errors.length > 0) {
      throw errors[0];
    }

    return program;
  }

  public static parseWithErrors(source: string): { program: Program | null; errors: ParseError[] } {
    trace('NWScriptParser.parseWithErrors() entered');
    try {
      const lexer = new NWScriptLexer(source);
      const tokens = lexer.tokenize();
      const parser = new NWScriptParser(tokens);
      const program = parser.parseProgram();
      const errors = parser.getErrors();
      debug(`NWScriptParser.parseWithErrors() completed program=${!!program} errors=${errors.length}`);
      return { program, errors };
    } catch (error) {
      if (error instanceof ParseError) {
        trace('NWScriptParser.parseWithErrors() caught ParseError');
        return { program: null, errors: [error] };
      }
      throw error;
    }
  }

  public parseProgram(): Program {
    const includes: IncludeDirective[] = [];
    const declarations: Declaration[] = [];

    while (!this.isAtEnd()) {
      if (this.check(TokenType.INCLUDE)) {
        includes.push(this.parseIncludeDirective());
      } else {
        const decl = this.parseDeclaration();
        if (decl) {
          declarations.push(decl);
        }
      }
    }

    const start = this.tokens[0]?.location || { line: 1, column: 1, offset: 0 };
    const end = this.previous().location;

    return new Program(this.makeRange(start, end), declarations, includes);
  }

  private parseIncludeDirective(): IncludeDirective {
    const start = this.consume(TokenType.INCLUDE, "Expected '#include'").location;
    const filename = this.consume(TokenType.STRING, "Expected filename after '#include'");

    return new IncludeDirective(
      this.makeRange(start, filename.location),
      filename.value as string
    );
  }

  private parseDeclaration(): Declaration | null {
    try {
      if (this.check(TokenType.STRUCT)) {
        return this.parseStructDeclaration();
      }

      if (this.checkType()) {
        return this.parseFunctionOrVariableDeclaration();
      }

      return null;
    } catch (error) {
      if (error instanceof ParseError) {
        // Record and attempt to recover instead of aborting the whole parse
        this.errors.push(error);
        this.synchronize();
        return null;
      }
      throw error;
    }
  }

  private parseStructDeclaration(): StructDeclaration {
    const start = this.consume(TokenType.STRUCT, "Expected 'struct'").location;
    const name = this.consume(TokenType.IDENTIFIER, "Expected struct name").value as string;

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after struct name");

    const members: VariableDeclaration[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const member = this.parseVariableDeclaration();
      members.push(member);
    }

    const end = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after struct members").location;

    return new StructDeclaration(this.makeRange(start, end), name, members);
  }

  private parseFunctionOrVariableDeclaration(): Declaration {
    const returnType = this.parseTypeSpecifier();
    const name = this.consume(TokenType.IDENTIFIER, "Expected identifier").value as string;

    if (this.check(TokenType.LEFT_PAREN)) {
      return this.parseFunctionDeclaration(returnType, name);
    } else {
      return this.parseVariableDeclarationWithType(returnType, name);
    }
  }

  private parseFunctionDeclaration(returnType: TypeSpecifier, name: string): FunctionDeclaration {
    const start = returnType.range.start;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after function name");

    const parameters: Parameter[] = [];
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        parameters.push(this.parseParameter());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after parameters");

    let body: BlockStatement;
    let isPrototype = false;

    if (this.match(TokenType.SEMICOLON)) {
      // Function prototype
      isPrototype = true;
      body = new BlockStatement(this.makeRange(start, this.previous().location), []);
    } else {
      body = this.parseBlockStatement();
    }

    return new FunctionDeclaration(
      this.makeRange(start, body.range.end),
      returnType,
      name,
      parameters,
      body,
      isPrototype
    );
  }

  private parseParameter(): Parameter {
    const paramType = this.parseTypeSpecifier();
    const name = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value as string;

    let defaultValue: Expression | undefined;
    if (this.match(TokenType.ASSIGN)) {
      defaultValue = this.parseExpression();
    }

    return new Parameter(
      this.makeRange(paramType.range.start, this.previous().location),
      paramType,
      name,
      defaultValue
    );
  }

  private parseVariableDeclaration(): VariableDeclaration {
    const varType = this.parseTypeSpecifier();
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value as string;

    return this.parseVariableDeclarationWithType(varType, name);
  }

  private parseVariableDeclarationWithType(varType: TypeSpecifier, name: string): VariableDeclaration {
    let initializer: Expression | undefined;

    if (this.match(TokenType.ASSIGN)) {
      initializer = this.parseExpression();
    }

    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration").location;

    return new VariableDeclaration(
      this.makeRange(varType.range.start, end),
      varType,
      name,
      initializer
    );
  }

  private parseTypeSpecifier(): TypeSpecifier {
    // Support built-in types and user-defined struct type identifiers
    if (this.check(TokenType.IDENTIFIER)) {
      const idTok = this.advance();
      return new TypeSpecifier(
        this.makeRange(idTok.location, idTok.location),
        idTok.value as string
      );
    }

    const typeToken = this.advance();
    if (!this.isTypeToken(typeToken.type)) {
      throw new ParseError(`Expected type specifier, got '${typeToken.value}'`, typeToken.location);
    }

    return new TypeSpecifier(
      this.makeRange(typeToken.location, typeToken.location),
      typeToken.value as string
    );
  }

  private parseStatement(): Statement {
    if (this.match(TokenType.LEFT_BRACE)) {
      return this.parseBlockStatementBody();
    }
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.parseForStatement();
    }
    if (this.match(TokenType.DO)) {
      return this.parseDoWhileStatement();
    }
    if (this.match(TokenType.SWITCH)) {
      return this.parseSwitchStatement();
    }
    if (this.match(TokenType.BREAK)) {
      return this.parseBreakStatement();
    }
    if (this.match(TokenType.CONTINUE)) {
      return this.parseContinueStatement();
    }
    if (this.isVariableDeclarationStart()) {
      return this.parseVariableDeclaration();
    }

    return this.parseExpressionStatement();
  }

  private parseBlockStatement(): BlockStatement {
    const start = this.consume(TokenType.LEFT_BRACE, "Expected '{'").location;
    return this.parseBlockStatementBody(start);
  }

  private parseBlockStatementBody(start?: SourceLocation): BlockStatement {
    const startLoc = start || this.previous().location;
    const statements: Statement[] = [];

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      try {
        statements.push(this.parseStatement());
      } catch (error) {
        if (error instanceof ParseError) {
          // Record error and try to recover to the next likely statement boundary
          this.errors.push(error);
          this.synchronize();
          continue;
        }
        throw error;
      }
    }

    const end = this.consume(TokenType.RIGHT_BRACE, "Expected '}'").location;

    return new BlockStatement(this.makeRange(startLoc, end), statements);
  }

  private parseReturnStatement(): ReturnStatement {
    const start = this.previous().location;

    let argument: Expression | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      argument = this.parseExpression();
    }

    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after return statement").location;

    return new ReturnStatement(this.makeRange(start, end), argument);
  }

  private parseIfStatement(): IfStatement {
    const start = this.previous().location;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const test = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");

    const consequent = this.parseStatement();

    let alternate: Statement | undefined;
    if (this.match(TokenType.ELSE)) {
      alternate = this.parseStatement();
    }

    const endLoc = alternate ? alternate.range.end : consequent.range.end;

    return new IfStatement(this.makeRange(start, endLoc), test, consequent, alternate);
  }

  private parseWhileStatement(): WhileStatement {
    const start = this.previous().location;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");

    const body = this.parseStatement();

    return new WhileStatement(this.makeRange(start, body.range.end), test, body);
  }

  private parseForStatement(): ForStatement {
    const start = this.previous().location;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'for'");

    let init: VariableDeclaration | Expression | undefined;
    if (this.match(TokenType.SEMICOLON)) {
      init = undefined;
    } else if (this.checkType()) {
      init = this.parseVariableDeclaration();
    } else {
      init = this.parseExpression();
      this.consume(TokenType.SEMICOLON, "Expected ';' after for loop initializer");
    }

    let test: Expression | undefined;
    if (!this.check(TokenType.SEMICOLON)) {
      test = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let update: Expression | undefined;
    if (!this.check(TokenType.RIGHT_PAREN)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after for clauses");

    const body = this.parseStatement();

    return new ForStatement(this.makeRange(start, body.range.end), body, init, test, update);
  }

  private parseDoWhileStatement(): DoWhileStatement {
    const start = this.previous().location;

    const body = this.parseStatement();

    this.consume(TokenType.WHILE, "Expected 'while' after do body");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'while'");
    const test = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after while condition");
    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after do-while").location;

    return new DoWhileStatement(this.makeRange(start, end), body, test);
  }

  private parseSwitchStatement(): SwitchStatement {
    const start = this.previous().location;

    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'switch'");
    const discriminant = this.parseExpression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after switch expression");

    this.consume(TokenType.LEFT_BRACE, "Expected '{' after switch");

    const cases: SwitchCase[] = [];
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      cases.push(this.parseSwitchCase());
    }

    const end = this.consume(TokenType.RIGHT_BRACE, "Expected '}' after switch cases").location;

    return new SwitchStatement(this.makeRange(start, end), discriminant, cases);
  }

  private parseSwitchCase(): SwitchCase {
    const start = this.peek().location;

    let test: Expression | undefined;
    if (this.match(TokenType.CASE)) {
      test = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' after case value");
    } else if (this.match(TokenType.DEFAULT)) {
      this.consume(TokenType.COLON, "Expected ':' after 'default'");
    } else {
      throw new ParseError("Expected 'case' or 'default'", this.peek().location);
    }

    const consequent: Statement[] = [];
    while (!this.check(TokenType.CASE) && !this.check(TokenType.DEFAULT) &&
      !this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      consequent.push(this.parseStatement());
    }

    const endLoc = consequent.length > 0 ?
      consequent[consequent.length - 1]?.range.end :
      this.previous().location;

    return new SwitchCase(this.makeRange(start, endLoc!), consequent, test);
  }

  private parseBreakStatement(): BreakStatement {
    const start = this.previous().location;
    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after 'break'").location;

    return new BreakStatement(this.makeRange(start, end));
  }

  private parseContinueStatement(): ContinueStatement {
    const start = this.previous().location;
    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after 'continue'").location;

    return new ContinueStatement(this.makeRange(start, end));
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expr = this.parseExpression();
    const end = this.consume(TokenType.SEMICOLON, "Expected ';' after expression").location;

    return new ExpressionStatement(this.makeRange(expr.range.start, end), expr);
  }

  private parseExpression(): Expression {
    return this.parseConditional();
  }

  private parseConditional(): Expression {
    let expr = this.parseLogicalOr();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' after '?' in conditional expression");
      const alternate = this.parseConditional();

      expr = new ConditionalExpression(
        this.makeRange(expr.range.start, alternate.range.end),
        expr,
        consequent,
        alternate
      );
    }

    return expr;
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();

    while (this.match(TokenType.LOGICAL_OR)) {
      const operator = this.previous().value as string;
      const right = this.parseLogicalAnd();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseBitwiseOr();

    while (this.match(TokenType.LOGICAL_AND)) {
      const operator = this.previous().value as string;
      const right = this.parseBitwiseOr();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseBitwiseOr(): Expression {
    let expr = this.parseBitwiseXor();

    while (this.match(TokenType.BITWISE_OR)) {
      const operator = this.previous().value as string;
      const right = this.parseBitwiseXor();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseBitwiseXor(): Expression {
    let expr = this.parseBitwiseAnd();

    while (this.match(TokenType.BITWISE_XOR)) {
      const operator = this.previous().value as string;
      const right = this.parseBitwiseAnd();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseBitwiseAnd(): Expression {
    let expr = this.parseEquality();

    while (this.match(TokenType.BITWISE_AND)) {
      const operator = this.previous().value as string;
      const right = this.parseEquality();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseComparison();

    while (this.match(TokenType.EQUAL, TokenType.NOT_EQUAL)) {
      const operator = this.previous().value as string;
      const right = this.parseComparison();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseComparison(): Expression {
    let expr = this.parseShift();

    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL,
      TokenType.LESS_THAN, TokenType.LESS_EQUAL)) {
      const operator = this.previous().value as string;
      const right = this.parseShift();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseShift(): Expression {
    let expr = this.parseAddition();

    while (this.match(TokenType.LEFT_SHIFT, TokenType.RIGHT_SHIFT)) {
      const operator = this.previous().value as string;
      const right = this.parseAddition();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseAddition(): Expression {
    let expr = this.parseMultiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value as string;
      const right = this.parseMultiplication();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseMultiplication(): Expression {
    let expr = this.parseUnary();

    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value as string;
      const right = this.parseUnary();
      expr = new BinaryExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.LOGICAL_NOT, TokenType.MINUS, TokenType.PLUS,
      TokenType.BITWISE_NOT, TokenType.INCREMENT, TokenType.DECREMENT)) {
      const operator = this.previous().value as string;
      const expr = this.parseUnary();
      return new UnaryExpression(
        this.makeRange(this.previous().location, expr.range.end),
        operator,
        expr
      );
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    let expr = this.parseCall();

    while (true) {
      if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
        const operator = this.previous().value as string;
        expr = new UnaryExpression(
          this.makeRange(expr.range.start, this.previous().location),
          operator,
          expr,
          false // postfix
        );
      } else if (this.match(TokenType.DOT)) {
        const property = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'");
        expr = new MemberExpression(
          this.makeRange(expr.range.start, property.location),
          expr,
          new Identifier(
            this.makeRange(property.location, property.location),
            property.value as string
          )
        );
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const index = this.parseExpression();
        const end = this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array index").location;
        expr = new MemberExpression(
          this.makeRange(expr.range.start, end),
          expr,
          index,
          true // computed
        );
      } else {
        break;
      }
    }

    return expr;
  }

  private parseCall(): Expression {
    let expr = this.parseAssignment();

    while (this.match(TokenType.LEFT_PAREN)) {
      const args: Expression[] = [];

      if (!this.check(TokenType.RIGHT_PAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }

      const end = this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments").location;

      expr = new CallExpression(
        this.makeRange(expr.range.start, end),
        expr,
        args
      );
    }

    return expr;
  }

  private parseAssignment(): Expression {
    let expr = this.parsePrimary();

    if (this.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
      TokenType.MULTIPLY_ASSIGN, TokenType.DIVIDE_ASSIGN, TokenType.MODULO_ASSIGN)) {
      const operator = this.previous().value as string;
      const right = this.parseExpression();

      expr = new AssignmentExpression(
        this.makeRange(expr.range.start, right.range.end),
        operator,
        expr,
        right
      );
    }

    return expr;
  }

  private parsePrimary(): Expression {
    // Handle specific value types (matching Python lexer)
    if (this.match(TokenType.INT_VALUE, TokenType.FLOAT_VALUE, TokenType.INT_HEX_VALUE)) {
      const token = this.previous();
      return new Literal(
        this.makeRange(token.location, token.location),
        token.value,
        token.raw || String(token.value)
      );
    }

    // Handle old generic NUMBER token for backward compatibility
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      return new Literal(
        this.makeRange(token.location, token.location),
        token.value,
        token.raw || String(token.value)
      );
    }

    // Handle special constant values
    if (this.match(TokenType.TRUE_VALUE, TokenType.FALSE_VALUE,
                   TokenType.OBJECTSELF_VALUE, TokenType.OBJECTINVALID_VALUE)) {
      const token = this.previous();
      let value: any;
      let type: string;

      switch (token.type) {
        case TokenType.TRUE_VALUE:
          value = 1;
          type = 'int';
          break;
        case TokenType.FALSE_VALUE:
          value = 0;
          type = 'int';
          break;
        case TokenType.OBJECTSELF_VALUE:
          value = 'OBJECT_SELF';
          type = 'object';
          break;
        case TokenType.OBJECTINVALID_VALUE:
          value = 'OBJECT_INVALID';
          type = 'object';
          break;
        default:
          value = token.value;
          type = 'unknown';
      }

      return new Literal(
        this.makeRange(token.location, token.location),
        value,
        token.raw || String(token.value)
      );
    }

    if (this.match(TokenType.STRING_VALUE)) {
      const token = this.previous();
      return new Literal(
        this.makeRange(token.location, token.location),
        token.value,
        token.raw || `"${token.value}"`
      );
    }

    // Handle old generic STRING token for backward compatibility
    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      return new Literal(
        this.makeRange(token.location, token.location),
        token.value,
        token.raw || `"${token.value}"`
      );
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous();
      return new Identifier(
        this.makeRange(token.location, token.location),
        token.value as string
      );
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return expr;
    }

    // Vector literal [x, y, z]
    if (this.match(TokenType.LEFT_BRACKET)) {
      const x = this.parseExpression();
      this.consume(TokenType.COMMA, "Expected ',' after vector x component");
      const y = this.parseExpression();
      this.consume(TokenType.COMMA, "Expected ',' after vector y component");
      const z = this.parseExpression();
      const end = this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after vector literal").location;

      return new VectorLiteral(
        this.makeRange(this.tokens[this.current - 5]!.location, end),
        x, y, z
      );
    }

    // Unexpected token in an expression context: record and recover instead of aborting
    const unexpected = this.peek();
    this.errors.push(new ParseError(`Unexpected token '${unexpected.value}'`, unexpected.location));

    // Best-effort recovery: advance until we hit a likely expression boundary
    this.advanceUntil([
      TokenType.COMMA,
      TokenType.RIGHT_PAREN,
      TokenType.SEMICOLON,
      TokenType.RIGHT_BRACE
    ]);

    // Return a placeholder literal to keep the AST shape valid
    return new Literal(
      this.makeRange(unexpected.location, unexpected.location),
      0,
      '0'
    );
  }

  // Utility methods
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkType(): boolean {
    // Treat identifiers as possible user-defined struct types at declaration sites
    return this.isTypeToken(this.peek().type) || this.peek().type === TokenType.IDENTIFIER;
  }

  // Heuristic: a variable declaration at statement level starts with a type token
  // or an identifier (struct type name) followed by another identifier (the variable name).
  private isVariableDeclarationStart(): boolean {
    const currentType = this.peek().type;
    if (this.isTypeToken(currentType)) return true;
    if (currentType === TokenType.IDENTIFIER) {
      const next = this.tokens[this.current + 1];
      return !!next && next.type === TokenType.IDENTIFIER;
    }
    return false;
  }

  private isTypeToken(type: TokenType): boolean {
    return type === TokenType.VOID || type === TokenType.INT || type === TokenType.FLOAT ||
      type === TokenType.STRING_TYPE || type === TokenType.OBJECT ||
      type === TokenType.VECTOR || type === TokenType.LOCATION ||
      type === TokenType.EVENT || type === TokenType.EFFECT ||
      type === TokenType.ITEMPROPERTY || type === TokenType.TALENT ||
      type === TokenType.ACTION || type === TokenType.STRUCT;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();

    const error = new ParseError(`${message}. Got '${this.peek().value}'`, this.peek().location);
    this.errors.push(error);

    // For better error recovery, return a dummy token instead of throwing
    return {
      type: type,
      value: '',
      location: this.peek().location
    };
  }

  private addParseError(message: string, location?: SourceLocation): void {
    const errorLocation = location || this.peek().location;
    this.errors.push(new ParseError(message, errorLocation));
  }

  private synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;

      switch (this.peek().type) {
        case TokenType.STRUCT:
        case TokenType.VOID:
        case TokenType.INT:
        case TokenType.FLOAT:
        case TokenType.STRING_TYPE:
        case TokenType.OBJECT:
        case TokenType.VECTOR:
        case TokenType.LOCATION:
        case TokenType.EVENT:
        case TokenType.EFFECT:
        case TokenType.ITEMPROPERTY:
        case TokenType.TALENT:
        case TokenType.ACTION:
        case TokenType.IF:
        case TokenType.FOR:
        case TokenType.WHILE:
        case TokenType.DO:
        case TokenType.SWITCH:
        case TokenType.RETURN:
        case TokenType.BREAK:
        case TokenType.CONTINUE:
          return;
      }

      this.advance();
    }
  }

  private advanceUntil(stopTypes: TokenType[]): void {
    while (!this.isAtEnd() && !stopTypes.includes(this.peek().type)) {
      this.advance();
    }
  }

  private makeRange(start: SourceLocation, end: SourceLocation): SourceRange {
    return { start, end };
  }
}
