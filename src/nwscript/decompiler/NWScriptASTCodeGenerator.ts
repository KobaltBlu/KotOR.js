import type { NWScriptASTNode, NWScriptProgramNode, NWScriptFunctionNode, NWScriptBlockNode, NWScriptIfNode, NWScriptIfElseNode, NWScriptWhileNode, NWScriptDoWhileNode, NWScriptForNode, NWScriptExpressionStatementNode, NWScriptAssignmentNode, NWScriptReturnNode, NWScriptVariableDeclarationNode, NWScriptGlobalVariableDeclarationNode, NWScriptSwitchNode, NWScriptSwitchCaseNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptASTNodeType } from "@/nwscript/decompiler/NWScriptAST";
import type { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";

/**
 * Generates NSS source code from an Abstract Syntax Tree.
 * This is the final step in the decompilation pipeline.
 *
 * Indentation is relative: each block prefixes child lines with exactly one
 * indent unit. Nested constructs must not also apply an absolute indentLevel
 * (that double-indents when parents re-prefix).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptASTCodeGenerator.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptASTCodeGenerator {
  private indentString: string = '    '; // 4 spaces per nesting level

  /**
   * Generate NSS source code from an AST
   */
  generate(ast: NWScriptProgramNode): string {
    const lines: string[] = [];

    // Emit recovered struct types used by STRUCTURE locals
    const structDefs = this.collectStructDefinitions(ast);
    for (const def of structDefs) {
      lines.push(...def);
      lines.push('');
    }

    // Generate global variable declarations
    for (const global of ast.globals) {
      lines.push(this.generateGlobalVariableDeclaration(global));
    }

    if (ast.globals.length > 0) {
      lines.push(''); // Blank line after globals
    }

    // Generate function definitions
    for (const func of ast.functions) {
      lines.push(...this.generateFunction(func));
      lines.push(''); // Blank line after function
    }

    // Generate main body (if present)
    if (ast.mainBody) {
      lines.push(...this.generateBlock(ast.mainBody));
    }

    return lines.join('\n');
  }

  /**
   * Prefix each non-empty line with one indent unit (relative nesting).
   */
  private nest(lines: string[]): string[] {
    return lines.map((line) => (line.length > 0 ? this.indentString + line : line));
  }

  /**
   * Synthetic struct Pt-like definitions for STRUCTURE-typed locals.
   */
  private collectStructDefinitions(ast: NWScriptProgramNode): string[][] {
    let needsStruct = false;
    const scanDecl = (d: { dataType: NWScriptDataType }) => {
      if (d.dataType === NWScriptDataType.STRUCTURE) {
        needsStruct = true;
      }
    };
    for (const g of ast.globals) {
      scanDecl(g);
    }
    for (const f of ast.functions) {
      for (const l of f.locals) {
        scanDecl(l);
      }
    }
    if (!needsStruct) {
      return [];
    }
    return [
      [
        'struct Struct0',
        '{',
        '    int x;',
        '    int y;',
        '};',
      ],
    ];
  }

  /**
   * Generate global variable declaration
   */
  private generateGlobalVariableDeclaration(decl: NWScriptGlobalVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType);
    const name = decl.name;

    if (decl.initializer) {
      return `${typeName} ${name} = ${decl.initializer.toNSS()};`;
    } else {
      return `${typeName} ${name};`;
    }
  }

  /**
   * Generate function definition
   */
  private generateFunction(func: NWScriptFunctionNode): string[] {
    const lines: string[] = [];

    // Function signature
    const returnTypeName = this.getTypeName(func.returnType);
    const params = func.parameters.map(p => `${this.getTypeName(p.type)} ${p.name}`).join(', ');
    lines.push(`${returnTypeName} ${func.name}(${params})`);
    lines.push('{');

    const body: string[] = [];
    for (const local of func.locals) {
      body.push(this.generateVariableDeclaration(local));
    }

    if (func.locals.length > 0) {
      body.push(''); // Blank line after locals
    }

    body.push(...this.generateBlock(func.body));
    lines.push(...this.nest(body));

    lines.push('}');

    return lines;
  }

  /**
   * Generate variable declaration
   */
  private generateVariableDeclaration(decl: NWScriptVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType);
    const name = decl.name;

    if (decl.initializer) {
      return `${typeName} ${name} = ${decl.initializer.toNSS()};`;
    } else {
      return `${typeName} ${name};`;
    }
  }

  /**
   * Generate block
   */
  private generateBlock(block: NWScriptBlockNode): string[] {
    const lines: string[] = [];

    if (block.statements.length === 0) {
      // Empty block
      return lines;
    }

    for (const statement of block.statements) {
      const stmtLines = this.generateStatement(statement);
      lines.push(...stmtLines);
    }

    return lines;
  }

  /**
   * Generate statement
   */
  private generateStatement(node: NWScriptASTNode): string[] {
    const lines: string[] = [];

    switch (node.type) {
      case NWScriptASTNodeType.EXPRESSION_STATEMENT:
        lines.push(this.generateExpressionStatement(node as NWScriptExpressionStatementNode));
        break;

      case NWScriptASTNodeType.ASSIGNMENT:
        lines.push(this.generateAssignment(node as NWScriptAssignmentNode));
        break;

      case NWScriptASTNodeType.RETURN:
        lines.push(this.generateReturn(node as NWScriptReturnNode));
        break;

      case NWScriptASTNodeType.IF:
        lines.push(...this.generateIf(node as NWScriptIfNode));
        break;

      case NWScriptASTNodeType.IF_ELSE:
        lines.push(...this.generateIfElse(node as NWScriptIfElseNode));
        break;

      case NWScriptASTNodeType.WHILE:
        lines.push(...this.generateWhile(node as NWScriptWhileNode));
        break;

      case NWScriptASTNodeType.DO_WHILE:
        lines.push(...this.generateDoWhile(node as NWScriptDoWhileNode));
        break;

      case NWScriptASTNodeType.FOR:
        lines.push(...this.generateFor(node as NWScriptForNode));
        break;

      case NWScriptASTNodeType.BREAK:
        lines.push('break;');
        break;

      case NWScriptASTNodeType.CONTINUE:
        lines.push('continue;');
        break;

      case NWScriptASTNodeType.SWITCH:
        lines.push(...this.generateSwitch(node as NWScriptSwitchNode));
        break;

      case NWScriptASTNodeType.EMPTY:
        break;

      case NWScriptASTNodeType.BLOCK:
        lines.push(...this.generateBlock(node as NWScriptBlockNode));
        break;

      case NWScriptASTNodeType.SWITCH_CASE:
      case NWScriptASTNodeType.SWITCH_DEFAULT:
        lines.push(`// misplaced ${node.type} node`);
        break;

      default:
        lines.push('// Unknown statement type: ' + node.type);
        break;
    }

    return lines;
  }

  /**
   * Generate expression statement
   */
  private generateExpressionStatement(stmt: NWScriptExpressionStatementNode): string {
    return stmt.expression.toNSS() + ';';
  }

  /**
   * Generate assignment
   */
  private generateAssignment(assign: NWScriptAssignmentNode): string {
    // Globals are declared at program scope — do not prefix with illegal `GLOBAL.`
    return `${assign.variable} = ${assign.value.toNSS()};`;
  }

  /**
   * Generate return statement
   */
  private generateReturn(ret: NWScriptReturnNode): string {
    if (ret.value) {
      return `return ${ret.value.toNSS()};`;
    } else {
      return 'return;';
    }
  }

  /**
   * Brace-wrapped body: child lines get exactly one relative indent.
   */
  private bracedBody(bodyLines: string[]): string[] {
    const lines: string[] = ['{'];
    if (bodyLines.length > 0) {
      lines.push(...this.nest(bodyLines));
    } else {
      lines.push(this.indentString + '// Empty');
    }
    lines.push('}');
    return lines;
  }

  /**
   * Generate if statement
   */
  private generateIf(ifNode: NWScriptIfNode): string[] {
    const condition = ifNode.condition.toNSS();
    return [
      `if (${condition})`,
      ...this.bracedBody(this.generateBlock(ifNode.thenBody)),
    ];
  }

  /**
   * Generate if-else statement
   */
  private generateIfElse(ifElseNode: NWScriptIfElseNode): string[] {
    const condition = ifElseNode.condition.toNSS();
    return [
      `if (${condition})`,
      ...this.bracedBody(this.generateBlock(ifElseNode.thenBody)),
      'else',
      ...this.bracedBody(this.generateBlock(ifElseNode.elseBody)),
    ];
  }

  /**
   * Generate while loop
   */
  private generateWhile(whileNode: NWScriptWhileNode): string[] {
    const condition = whileNode.condition.toNSS();
    return [
      `while (${condition})`,
      ...this.bracedBody(this.generateBlock(whileNode.body)),
    ];
  }

  /**
   * Generate do-while loop
   */
  private generateDoWhile(doWhileNode: NWScriptDoWhileNode): string[] {
    const condition = doWhileNode.condition.toNSS();
    const body = this.bracedBody(this.generateBlock(doWhileNode.body));
    // Replace closing `}` with `} while (...);`
    body[body.length - 1] = `} while (${condition});`;
    return ['do', ...body];
  }

  /**
   * Generate for loop
   */
  private generateFor(forNode: NWScriptForNode): string[] {
    let init = '';
    if (forNode.init) {
      const initLines = this.generateStatement(forNode.init);
      // Skip empty / control-flow-only "statements" in the init slot
      if (initLines.length > 0 && !initLines[0].startsWith('//') && initLines[0] !== 'continue;' && initLines[0] !== 'break;') {
        init = initLines[0].replace(/;$/, '');
      }
    }

    const condition = forNode.condition ? forNode.condition.toNSS() : '';

    let increment = '';
    if (forNode.increment) {
      const incLines = this.generateStatement(forNode.increment);
      if (
        incLines.length > 0 &&
        !incLines[0].startsWith('//') &&
        incLines[0] !== 'continue;' &&
        incLines[0] !== 'break;'
      ) {
        increment = incLines[0].replace(/;$/, '');
      }
    }

    return [
      `for (${init}; ${condition}; ${increment})`,
      ...this.bracedBody(this.generateBlock(forNode.body)),
    ];
  }

  private generateSwitch(switchNode: NWScriptSwitchNode): string[] {
    const lines: string[] = [];
    lines.push(`switch (${switchNode.expression.toNSS()})`);
    lines.push('{');

    const inner: string[] = [];
    for (const c of switchNode.cases) {
      inner.push(`case ${c.value.toNSS()}:`);
      inner.push(...this.nest(this.generateBlock(c.body)));
    }
    if (switchNode.defaultCase) {
      inner.push('default:');
      inner.push(...this.nest(this.generateBlock(switchNode.defaultCase.body)));
    }
    lines.push(...this.nest(inner));

    lines.push('}');
    return lines;
  }

  /**
   * Get type name as string
   */
  private getTypeName(dataType: NWScriptDataType): string {
    switch (dataType) {
      case NWScriptDataType.INTEGER:
        return 'int';
      case NWScriptDataType.FLOAT:
        return 'float';
      case NWScriptDataType.STRING:
        return 'string';
      case NWScriptDataType.OBJECT:
        return 'object';
      case NWScriptDataType.VOID:
        return 'void';
      case NWScriptDataType.VECTOR:
        return 'vector';
      case NWScriptDataType.STRUCTURE:
        return 'struct Struct0';
      case NWScriptDataType.EFFECT:
        return 'effect';
      case NWScriptDataType.EVENT:
        return 'event';
      case NWScriptDataType.LOCATION:
        return 'location';
      case NWScriptDataType.TALENT:
        return 'talent';
      default:
        return 'unknown';
    }
  }
}
