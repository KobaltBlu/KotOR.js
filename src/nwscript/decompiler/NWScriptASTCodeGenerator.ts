import type { NWScriptASTNode, NWScriptProgramNode, NWScriptFunctionNode, NWScriptBlockNode, NWScriptIfNode, NWScriptIfElseNode, NWScriptWhileNode, NWScriptDoWhileNode, NWScriptForNode, NWScriptExpressionStatementNode, NWScriptAssignmentNode, NWScriptReturnNode, NWScriptVariableDeclarationNode, NWScriptGlobalVariableDeclarationNode, NWScriptSwitchNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptASTNodeType } from "@/nwscript/decompiler/NWScriptAST";
import type { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  createEmptyNssCodeLineMap,
  stampNssCodeLine,
  type NssCodeLineMap,
} from "@/nwscript/inspect/nssCodeLineMap";

interface MappedNssLine {
  text: string;
  address?: number;
}

/**
 * Generates NSS source code from an Abstract Syntax Tree.
 * This is the final step in the decompilation pipeline.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptASTCodeGenerator.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptASTCodeGenerator {
  private indentLevel: number = 0;
  private indentString: string = '    '; // 4 spaces

  /** 1-based NSS lines from the last {@link generate} call (body only, no decompiler header). */
  lastLineMap: NssCodeLineMap = createEmptyNssCodeLineMap();

  /**
   * Generate NSS source code from an AST
   */
  generate(ast: NWScriptProgramNode): string {
    const lines: MappedNssLine[] = [];
    this.lastLineMap = createEmptyNssCodeLineMap();

    for (const struct of ast.structs) {
      lines.push({ text: `struct ${struct.name} {` });
      for (const field of struct.fields) {
        lines.push({ text: `${this.indentString}${this.getTypeName(field.type)} ${field.name};` });
      }
      lines.push({ text: '};' }, { text: '' });
    }

    // NCS stores routines by address and permits forward calls; NSS requires a
    // declaration before use. Emit prototypes for every recovered helper so source
    // order, recursion, mutually-recursive call graphs, and helper calls in global
    // initializers all remain compilable.
    const helpers = ast.functions.filter(func =>
      func.name !== 'main' && func.name !== 'StartingConditional'
    );
    for (const func of helpers) {
      lines.push({ text: `${this.generateFunctionSignature(func)};` });
    }
    if (helpers.length > 0) {
      lines.push({ text: '' });
    }

    // Generate global variable declarations after prototypes: NWScript permits a global
    // initializer to call a user routine, but requires that routine to be declared first.
    for (const global of ast.globals) {
      lines.push({
        text: this.generateGlobalVariableDeclaration(global),
        address: global.location?.startAddress,
      });
    }

    if (ast.globals.length > 0) {
      lines.push({ text: '' }); // Blank line after globals
    }

    // Generate function definitions
    for (const func of ast.functions) {
      lines.push(...this.generateFunction(func));
      lines.push({ text: '' }); // Blank line after function
    }

    // Generate main body (if present)
    if (ast.mainBody) {
      lines.push(...this.generateBlock(ast.mainBody));
    }

    for (let i = 0; i < lines.length; i++) {
      stampNssCodeLine(this.lastLineMap, i + 1, lines[i].address);
    }

    return lines.map((line) => line.text).join('\n');
  }

  /**
   * Generate global variable declaration
   */
  private generateGlobalVariableDeclaration(decl: NWScriptGlobalVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType, decl.structName);
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
  private generateFunction(func: NWScriptFunctionNode): MappedNssLine[] {
    const lines: MappedNssLine[] = [];

    lines.push({
      text: this.generateFunctionSignature(func),
      address: func.location?.startAddress,
    });
    lines.push({ text: '{' });

    this.indentLevel++;
    for (const local of func.locals) {
      lines.push({
        text: this.indent() + this.generateVariableDeclaration(local),
        address: local.location?.startAddress,
      });
    }

    if (func.locals.length > 0) {
      lines.push({ text: '' });
    }

    const bodyLines = this.generateBlock(func.body);
    if (bodyLines.length > 0) {
      lines.push(...bodyLines.map((line) => ({
        ...line,
        text: this.indent() + line.text,
      })));
    }

    this.indentLevel--;
    lines.push({ text: '}' });

    return lines;
  }

  private generateFunctionSignature(func: NWScriptFunctionNode): string {
    const returnTypeName = this.getTypeName(func.returnType, func.returnStructName);
    const params = func.parameters
      .map(parameter =>
        `${this.getTypeName(parameter.type, parameter.structName)} ${parameter.name}`
      )
      .join(', ');
    return `${returnTypeName} ${func.name}(${params})`;
  }

  /**
   * Generate variable declaration
   */
  private generateVariableDeclaration(decl: NWScriptVariableDeclarationNode): string {
    const typeName = this.getTypeName(decl.dataType, decl.structName);
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
  private generateBlock(block: NWScriptBlockNode): MappedNssLine[] {
    const lines: MappedNssLine[] = [];

    if (block.statements.length === 0) {
      return lines;
    }

    for (const statement of block.statements) {
      lines.push(...this.generateStatement(statement));
    }

    return lines;
  }

  /**
   * Generate statement
   */
  private generateStatement(node: NWScriptASTNode): MappedNssLine[] {
    const stamp = (textLines: string[], address?: number): MappedNssLine[] =>
      textLines.map((text, index) => ({
        text,
        address: index === 0 ? address : undefined,
      }));

    const address = node.location?.startAddress;

    switch (node.type) {
      case NWScriptASTNodeType.EXPRESSION_STATEMENT:
        return stamp([this.generateExpressionStatement(node as NWScriptExpressionStatementNode)], address);

      case NWScriptASTNodeType.ASSIGNMENT:
        return stamp([this.generateAssignment(node as NWScriptAssignmentNode)], address);

      case NWScriptASTNodeType.RETURN:
        return stamp([this.generateReturn(node as NWScriptReturnNode)], address);

      case NWScriptASTNodeType.IF:
        return this.withLeadingAddress(this.generateIf(node as NWScriptIfNode), address);

      case NWScriptASTNodeType.IF_ELSE:
        return this.withLeadingAddress(this.generateIfElse(node as NWScriptIfElseNode), address);

      case NWScriptASTNodeType.WHILE:
        return this.withLeadingAddress(this.generateWhile(node as NWScriptWhileNode), address);

      case NWScriptASTNodeType.DO_WHILE:
        return this.withLeadingAddress(this.generateDoWhile(node as NWScriptDoWhileNode), address);

      case NWScriptASTNodeType.FOR:
        return this.withLeadingAddress(this.generateFor(node as NWScriptForNode), address);

      case NWScriptASTNodeType.BREAK:
        return stamp(['break;'], address);

      case NWScriptASTNodeType.CONTINUE:
        return stamp(['continue;'], address);

      case NWScriptASTNodeType.SWITCH:
        return this.withLeadingAddress(this.generateSwitch(node as NWScriptSwitchNode), address);

      case NWScriptASTNodeType.EMPTY:
        return [];

      case NWScriptASTNodeType.BLOCK:
        return this.generateBlock(node as NWScriptBlockNode);

      case NWScriptASTNodeType.SWITCH_CASE:
      case NWScriptASTNodeType.SWITCH_DEFAULT:
        return stamp([`// misplaced ${node.type} node`], address);

      default:
        return stamp(['// Unknown statement type: ' + node.type], address);
    }
  }

  private withLeadingAddress(lines: MappedNssLine[], address?: number): MappedNssLine[] {
    if (!lines.length || address == null) {
      return lines;
    }
    if (lines[0].address != null) {
      return lines;
    }
    return [{ ...lines[0], address }, ...lines.slice(1)];
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
    // NSS globals are referenced by identifier; "GLOBAL." is not valid source syntax.
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
   * Generate if statement
   */
  private generateIf(ifNode: NWScriptIfNode): MappedNssLine[] {
    const condition = ifNode.condition.toNSS();
    return [
      { text: `if (${condition})`, address: ifNode.location?.startAddress },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(ifNode.thenBody), true),
      { text: '}' },
    ];
  }

  /**
   * Generate if-else statement
   */
  private generateIfElse(ifElseNode: NWScriptIfElseNode): MappedNssLine[] {
    const condition = ifElseNode.condition.toNSS();
    return [
      { text: `if (${condition})`, address: ifElseNode.location?.startAddress },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(ifElseNode.thenBody), true),
      { text: '}' },
      { text: 'else' },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(ifElseNode.elseBody), true),
      { text: '}' },
    ];
  }

  /**
   * Generate while loop
   */
  private generateWhile(whileNode: NWScriptWhileNode): MappedNssLine[] {
    const condition = whileNode.condition.toNSS();
    return [
      { text: `while (${condition})`, address: whileNode.location?.startAddress },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(whileNode.body), true),
      { text: '}' },
    ];
  }

  /**
   * Generate do-while loop
   */
  private generateDoWhile(doWhileNode: NWScriptDoWhileNode): MappedNssLine[] {
    const condition = doWhileNode.condition.toNSS();
    return [
      { text: 'do', address: doWhileNode.location?.startAddress },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(doWhileNode.body), true),
      { text: `} while (${condition});` },
    ];
  }

  /**
   * Generate for loop
   */
  private generateFor(forNode: NWScriptForNode): MappedNssLine[] {
    let init = '';
    if (forNode.init) {
      const initLines = this.generateStatement(forNode.init);
      if (initLines.length > 0) {
        init = initLines[0].text.replace(/;$/, '');
      }
    }

    const condition = forNode.condition ? forNode.condition.toNSS() : '';

    let increment = '';
    if (forNode.increment) {
      const incLines = this.generateStatement(forNode.increment);
      if (incLines.length > 0) {
        increment = incLines[0].text.replace(/;$/, '');
      }
    }

    return [
      { text: `for (${init}; ${condition}; ${increment})`, address: forNode.location?.startAddress },
      { text: '{' },
      ...this.nestMapped(this.generateBlock(forNode.body), true),
      { text: '}' },
    ];
  }

  private generateSwitch(switchNode: NWScriptSwitchNode): MappedNssLine[] {
    const lines: MappedNssLine[] = [
      { text: `switch (${switchNode.expression.toNSS()})`, address: switchNode.location?.startAddress },
      { text: '{' },
    ];

    for (const c of switchNode.cases) {
      lines.push({
        text: `${this.indentString}case ${c.value.toNSS()}:`,
        address: c.location?.startAddress,
      });
      lines.push(...this.nestMapped(this.nestMapped(this.generateBlock(c.body))));
    }
    if (switchNode.defaultCase) {
      lines.push({
        text: `${this.indentString}default:`,
        address: switchNode.defaultCase.location?.startAddress,
      });
      lines.push(...this.nestMapped(this.nestMapped(this.generateBlock(switchNode.defaultCase.body))));
    }

    lines.push({ text: '}' });
    return lines;
  }

  /**
   * Get type name as string
   */
  private getTypeName(dataType: NWScriptDataType, structName?: string): string {
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
      case NWScriptDataType.EFFECT:
        return 'effect';
      case NWScriptDataType.EVENT:
        return 'event';
      case NWScriptDataType.LOCATION:
        return 'location';
      case NWScriptDataType.TALENT:
        return 'talent';
      case NWScriptDataType.STRUCTURE:
        return structName ? `struct ${structName}` : 'unknown';
      default:
        return 'unknown';
    }
  }

  /**
   * Prefix nested block lines by one indent. Nested control structures return
   * unindented lines, so a global indent counter would double-space them.
   */
  private nestMapped(bodyLines: MappedNssLine[], emptyComment = false): MappedNssLine[] {
    if (bodyLines.length > 0) {
      return bodyLines.map((line) => ({ ...line, text: this.indentString + line.text }));
    }
    return emptyComment ? [{ text: this.indentString + '// Empty' }] : [];
  }

  /**
   * Get current indentation string
   */
  private indent(): string {
    return this.indentString.repeat(this.indentLevel);
  }
}
