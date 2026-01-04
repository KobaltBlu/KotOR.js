import {
  ProgramNode,
  StatementNode,
  ExpressionNode,
  CommentNode,
  DefineNode,
  IncludeNode,
  StructNode,
  VariableNode,
  VariableListNode,
  FunctionNode,
  IfNode,
  ElseIfNode,
  ElseNode,
  WhileNode,
  DoWhileNode,
  ForNode,
  SwitchNode,
  CaseNode,
  DefaultNode,
  ReturnNode,
  BreakNode,
  ContinueNode,
  BlockNode,
  LiteralNode,
  VariableReferenceNode,
  ArrayLiteralNode,
  FunctionCallNode,
  CallNode,
  IndexNode,
  StructPropertyNode,
  AssignNode,
  IncDecNode,
  UnaryNode,
  CompareNode,
  BinaryOpNode,
  ArgumentNode,
  DataTypeNode,
} from "./ASTTypes";

export interface CodeGenOptions {
  tabSize?: number;
  insertSpaces?: boolean;
}

export class NWScriptASTCodeGen {
  private tabSize: number;
  private insertSpaces: boolean;
  private indentChar: string;
  private indentLevel: number = 0;

  constructor(options: CodeGenOptions = {}) {
    this.tabSize = options.tabSize ?? 2;
    this.insertSpaces = options.insertSpaces !== false;
    this.indentChar = this.insertSpaces ? ' '.repeat(this.tabSize) : '\t';
  }

  generate(program: ProgramNode): string {
    this.indentLevel = 0;
    const lines: string[] = [];
    
    for (const statement of program.statements) {
      const code = this.generateStatement(statement);
      if (code) {
        lines.push(code);
      }
    }
    
    return lines.join('\n');
  }

  private generateStatement(stmt: StatementNode): string {
    switch (stmt.type) {
      case 'comment':
        return this.generateComment(stmt);
      case 'define':
        return this.generateDefine(stmt);
      case 'include':
        return this.generateInclude(stmt);
      case 'struct':
        return this.generateStruct(stmt);
      case 'variable':
        return this.generateVariable(stmt);
      case 'variableList':
        return this.generateVariableList(stmt);
      case 'function':
        return this.generateFunction(stmt);
      case 'if':
        return this.generateIf(stmt);
      case 'while':
        return this.generateWhile(stmt);
      case 'do':
        return this.generateDoWhile(stmt);
      case 'for':
        return this.generateFor(stmt);
      case 'switch':
        return this.generateSwitch(stmt);
      case 'return':
        return this.generateReturn(stmt);
      case 'break':
        return this.generateBreak(stmt);
      case 'continue':
        return this.generateContinue(stmt);
      case 'block':
        return this.generateBlock(stmt);
      default:
        // Expression statements
        return this.generateExpression(stmt as ExpressionNode) + ';';
    }
  }

  private generateComment(comment: CommentNode): string {
    return this.indent() + comment.value;
  }

  private generateDefine(define: DefineNode): string {
    let result = this.indent() + '#define ' + define.name.value + ' ';
    if (define.value.type === 'datatype') {
      result += define.value.value;
    } else if (define.value.type === 'name') {
      result += define.value.value;
    } else {
      result += this.generateExpression(define.value as ExpressionNode);
    }
    return result;
  }

  private generateInclude(include: IncludeNode): string {
    let result = this.indent() + '#include ';
    if (include.value.type === 'literal') {
      result += '"' + include.value.value + '"';
    } else {
      result += include.value.value;
    }
    return result;
  }

  private generateStruct(struct: StructNode): string {
    let result = this.indent() + 'struct ' + struct.name;
    if (struct.properties.length > 0) {
      result += ' {\n';
      this.indentLevel++;
      for (const prop of struct.properties) {
        result += this.indent() + this.generateDataType(prop.datatype!) + ' ' + prop.name + ';\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    result += ';';
    return result;
  }

  private generateVariable(variable: VariableNode): string {
    let result = this.indent();
    if (variable.is_const) {
      result += 'const ';
    }
    result += this.generateDataType(variable.datatype) + ' ' + variable.name;
    if (variable.value) {
      result += ' = ' + this.generateExpression(variable.value);
    }
    result += ';';
    return result;
  }

  private generateVariableList(variableList: VariableListNode): string {
    let result = this.indent();
    if (variableList.is_const) {
      result += 'const ';
    }
    result += this.generateDataType(variableList.datatype) + ' ';
    result += variableList.names.map(n => n.name).join(', ');
    if (variableList.value) {
      result += ' = ' + this.generateExpression(variableList.value);
    }
    result += ';';
    return result;
  }

  private generateFunction(func: FunctionNode): string {
    let result = this.indent();
    result += this.generateDataType(func.returntype) + ' ' + func.name + '(';
    result += func.arguments.map(arg => this.generateArgument(arg)).join(', ');
    result += ')';
    
    if (func.header_only) {
      result += ';';
    } else {
      result += ' {\n';
      this.indentLevel++;
      for (const stmt of func.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    return result;
  }

  private generateArgument(arg: ArgumentNode): string {
    let result = this.generateDataType(arg.datatype) + ' ' + arg.name;
    if (arg.value) {
      result += ' = ' + this.generateExpression(arg.value);
    }
    return result;
  }

  private generateIf(ifNode: IfNode): string {
    let result = this.indent() + 'if (' + this.generateExpression(ifNode.condition) + ') ';
    
    if (ifNode.statements.length === 1 && ifNode.statements[0].type !== 'block') {
      // Single statement, no braces
      const savedIndent = this.indentLevel;
      this.indentLevel = 0;
      result += this.generateStatement(ifNode.statements[0]);
      this.indentLevel = savedIndent;
    } else {
      result += '{\n';
      this.indentLevel++;
      for (const stmt of ifNode.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    
    // Handle else ifs
    for (const elseIf of ifNode.elseIfs) {
      result += ' else if (' + this.generateExpression(elseIf.condition) + ') ';
      if (elseIf.statements.length === 1 && elseIf.statements[0].type !== 'block') {
        const savedIndent = this.indentLevel;
        this.indentLevel = 0;
        result += this.generateStatement(elseIf.statements[0]);
        this.indentLevel = savedIndent;
      } else {
        result += '{\n';
        this.indentLevel++;
        for (const stmt of elseIf.statements) {
          result += this.generateStatement(stmt) + '\n';
        }
        this.indentLevel--;
        result += this.indent() + '}';
      }
    }
    
    // Handle else
    if (ifNode.else) {
      result += ' else ';
      if (ifNode.else.statements.length === 1 && ifNode.else.statements[0].type !== 'block') {
        const savedIndent = this.indentLevel;
        this.indentLevel = 0;
        result += this.generateStatement(ifNode.else.statements[0]);
        this.indentLevel = savedIndent;
      } else {
        result += '{\n';
        this.indentLevel++;
        for (const stmt of ifNode.else.statements) {
          result += this.generateStatement(stmt) + '\n';
        }
        this.indentLevel--;
        result += this.indent() + '}';
      }
    }
    
    return result;
  }

  private generateWhile(whileNode: WhileNode): string {
    let result = this.indent() + 'while (' + this.generateExpression(whileNode.condition) + ') ';
    if (whileNode.statements.length === 1 && whileNode.statements[0].type !== 'block') {
      const savedIndent = this.indentLevel;
      this.indentLevel = 0;
      result += this.generateStatement(whileNode.statements[0]);
      this.indentLevel = savedIndent;
    } else {
      result += '{\n';
      this.indentLevel++;
      for (const stmt of whileNode.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    return result;
  }

  private generateDoWhile(doWhile: DoWhileNode): string {
    let result = this.indent() + 'do ';
    if (doWhile.statements.length === 1 && doWhile.statements[0].type !== 'block') {
      const savedIndent = this.indentLevel;
      this.indentLevel = 0;
      result += this.generateStatement(doWhile.statements[0]);
      this.indentLevel = savedIndent;
    } else {
      result += '{\n';
      this.indentLevel++;
      for (const stmt of doWhile.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    result += ' while (' + this.generateExpression(doWhile.condition) + ');';
    return result;
  }

  private generateFor(forNode: ForNode): string {
    let result = this.indent() + 'for (';
    if (forNode.initializer) {
      if (forNode.initializer.type === 'variable' || forNode.initializer.type === 'variableList') {
        result += this.generateStatement(forNode.initializer).replace(/;$/, '');
      } else {
        result += this.generateExpression(forNode.initializer);
      }
    }
    result += '; ';
    if (forNode.condition) {
      result += this.generateExpression(forNode.condition);
    }
    result += '; ';
    if (forNode.incrementor) {
      result += this.generateExpression(forNode.incrementor);
    }
    result += ') ';
    
    if (forNode.statements.length === 1 && forNode.statements[0].type !== 'block') {
      const savedIndent = this.indentLevel;
      this.indentLevel = 0;
      result += this.generateStatement(forNode.statements[0]);
      this.indentLevel = savedIndent;
    } else {
      result += '{\n';
      this.indentLevel++;
      for (const stmt of forNode.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
      result += this.indent() + '}';
    }
    return result;
  }

  private generateSwitch(switchNode: SwitchNode): string {
    let result = this.indent() + 'switch (' + this.generateExpression(switchNode.condition) + ') {\n';
    this.indentLevel++;
    
    for (const caseNode of switchNode.cases) {
      result += this.indent() + 'case ' + this.generateExpression(caseNode.value) + ':\n';
      this.indentLevel++;
      for (const stmt of caseNode.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
    }
    
    if (switchNode.default) {
      result += this.indent() + 'default:\n';
      this.indentLevel++;
      for (const stmt of switchNode.default.statements) {
        result += this.generateStatement(stmt) + '\n';
      }
      this.indentLevel--;
    }
    
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  private generateReturn(returnNode: ReturnNode): string {
    let result = this.indent() + 'return';
    if (returnNode.value) {
      result += ' ' + this.generateExpression(returnNode.value);
    }
    result += ';';
    return result;
  }

  private generateBreak(breakNode: BreakNode): string {
    return this.indent() + 'break;';
  }

  private generateContinue(continueNode: ContinueNode): string {
    return this.indent() + 'continue;';
  }

  private generateBlock(block: BlockNode): string {
    let result = this.indent() + '{\n';
    this.indentLevel++;
    for (const stmt of block.statements) {
      result += this.generateStatement(stmt) + '\n';
    }
    this.indentLevel--;
    result += this.indent() + '}';
    return result;
  }

  private generateExpression(expr: ExpressionNode, precedence: number = 0): string {
    switch (expr.type) {
      case 'literal':
        return this.generateLiteral(expr);
      case 'variable_reference':
        return expr.name;
      case 'array_literal':
        return this.generateArrayLiteral(expr);
      case 'function_call':
        return this.generateFunctionCall(expr);
      case 'call':
        return this.generateCall(expr);
      case 'index':
        return this.generateIndex(expr);
      case 'property':
        return this.generateProperty(expr);
      case 'assign':
        return this.generateAssign(expr, precedence);
      case 'inc':
      case 'dec':
        return this.generateIncDec(expr);
      case 'not':
      case 'comp':
      case 'neg':
        return this.generateUnary(expr);
      case 'compare':
        return this.generateCompare(expr, precedence);
      case 'add':
      case 'sub':
      case 'mul':
      case 'div':
      case 'mod':
      case 'incor':
      case 'xor':
      case 'booland':
      case 'shift':
      case 'binary':
        return this.generateBinary(expr, precedence);
      default:
        return '';
    }
  }

  private generateLiteral(literal: LiteralNode): string {
    if (literal.datatype.value === 'string') {
      return '"' + String(literal.value).replace(/"/g, '\\"') + '"';
    }
    return String(literal.value);
  }

  private generateArrayLiteral(array: ArrayLiteralNode): string {
    return '[' + array.elements.map(e => this.generateExpression(e)).join(', ') + ']';
  }

  private generateFunctionCall(call: FunctionCallNode): string {
    return call.name + '(' + call.arguments.map(arg => this.generateExpression(arg)).join(', ') + ')';
  }

  private generateCall(call: CallNode): string {
    return this.generateExpression(call.callee) + '(' + call.arguments.map(arg => this.generateExpression(arg)).join(', ') + ')';
  }

  private generateIndex(index: IndexNode): string {
    return this.generateExpression(index.left) + '[' + this.generateExpression(index.index) + ']';
  }

  private generateProperty(prop: StructPropertyNode): string {
    return this.generateExpression(prop.left) + '.' + prop.name;
  }

  private generateAssign(assign: AssignNode, precedence: number): string {
    const op = assign.operator.value;
    const expr = this.generateExpression(assign.left, 100) + ' ' + op + ' ' + this.generateExpression(assign.right, 100);
    // Assignment has low precedence, so we only need parentheses for very high precedence operators
    return precedence > 10 ? '(' + expr + ')' : expr;
  }

  private generateIncDec(incDec: IncDecNode): string {
    const op = incDec.type === 'inc' ? '++' : '--';
    const expr = this.generateExpression(incDec.value);
    return incDec.postfix ? expr + op : op + expr;
  }

  private generateUnary(unary: UnaryNode): string {
    let op = '';
    switch (unary.type) {
      case 'not':
        op = '!';
        break;
      case 'comp':
        op = '~';
        break;
      case 'neg':
        op = '-';
        break;
    }
    return op + this.generateExpression(unary.value, 120);
  }

  private generateCompare(compare: CompareNode, precedence: number): string {
    const op = compare.operator.value;
    const expr = this.generateExpression(compare.left, 80) + ' ' + op + ' ' + this.generateExpression(compare.right, 80);
    // Comparison has precedence 70-80, so we need parentheses for higher precedence
    return precedence > 80 ? '(' + expr + ')' : expr;
  }

  private generateBinary(binary: BinaryOpNode, precedence: number): string {
    let op = binary.operator.value;
    let opPrecedence = this.getOperatorPrecedence(op);
    
    const left = this.generateExpression(binary.left, opPrecedence);
    const right = this.generateExpression(binary.right, opPrecedence);
    
    // Add spaces around operators
    let expr = left + ' ' + op + ' ' + right;
    
    // Add parentheses if needed based on precedence
    if (precedence > opPrecedence) {
      expr = '(' + expr + ')';
    }
    
    return expr;
  }

  private getOperatorPrecedence(op: string): number {
    switch (op) {
      case '||': return 20;
      case '&&': return 30;
      case '|': return 40;
      case '^': return 50;
      case '&': return 60;
      case '==':
      case '!=': return 70;
      case '<':
      case '>':
      case '<=':
      case '>=': return 80;
      case '<<':
      case '>>':
      case '>>>': return 90;
      case '+':
      case '-': return 100;
      case '*':
      case '/':
      case '%': return 110;
      case '++':
      case '--': return 120;
      case '.': return 140;
      default: return 0;
    }
  }

  private generateDataType(datatype: DataTypeNode): string {
    return datatype.value;
  }

  private indent(): string {
    return this.indentChar.repeat(this.indentLevel);
  }
}

